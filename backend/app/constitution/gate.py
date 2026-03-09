import logging
from app.db.supabase_client import get_client
from app.config import CONSTITUTION_TOP_K

logger = logging.getLogger(__name__)

_rules_cache: list[dict] | None = None


def _load_rules() -> list[dict]:
    global _rules_cache
    if _rules_cache is None:
        supabase = get_client()
        result = (
            supabase.table("constitution_rules")
            .select("*")
            .eq("is_active", True)
            .execute()
        )
        _rules_cache = result.data or []
    return _rules_cache


def reload_rules():
    """캐시 초기화 (관리자가 규칙 변경 시 호출)"""
    global _rules_cache
    _rules_cache = None


def check_constitution(message: str) -> str | None:
    """헌법 원칙 위반 검사. 위반 시 거부 메시지 반환, 통과 시 None."""
    rules = _load_rules()

    # 거부조건 키워드 기반 검사
    rejection_keywords = {
        "개인정보": "개인정보가 포함된 요청은 처리할 수 없습니다. 개인정보를 제거한 후 다시 질문해 주세요.",
        "주민등록번호": "개인정보가 포함된 요청은 처리할 수 없습니다.",
        "비밀번호": "보안 관련 정보는 처리할 수 없습니다.",
    }

    for keyword, response in rejection_keywords.items():
        if keyword in message:
            return response

    # 법적 판단 요청 → 전문가 상담 권고
    legal_keywords = ["법적으로", "법적 판단", "법률적", "법적 유효", "소송", "법적 효력", "법적 책임"]
    if any(kw in message for kw in legal_keywords):
        return (
            "법적 판단은 AI가 제공할 수 없는 영역입니다. "
            "정확한 법률 검토를 위해 법무팀 또는 전문 법률 자문을 받으시기 바랍니다."
        )

    return None


def search_relevant_rules(query_embedding: list[float]) -> list[dict]:
    """사용자 질문 임베딩으로 관련 헌법 규칙 벡터 검색.
    검색된 규칙은 시스템 프롬프트에 동적 주입된다."""
    try:
        supabase = get_client()
        result = supabase.rpc(
            "match_constitution",
            {
                "query_embedding": query_embedding,
                "match_count": CONSTITUTION_TOP_K,
            },
        ).execute()

        rules = []
        for row in (result.data or []):
            if row["similarity"] >= 0.5:  # 최소 유사도
                rules.append({
                    "id": row["id"],
                    "rule_type": row["rule_type"],
                    "content": row["content"],
                    "similarity": row["similarity"],
                })
        return rules
    except Exception as e:
        logger.warning(f"Constitution vector search failed: {e}")
        # 폴백: 전체 활성 규칙 반환
        return [
            {"rule_type": r["rule_type"], "content": r["content"]}
            for r in _load_rules()
        ]


def format_rules_for_prompt(rules: list[dict]) -> str:
    """검색된 헌법 규칙을 시스템 프롬프트용 텍스트로 변환"""
    if not rules:
        return ""
    lines = []
    for i, r in enumerate(rules, 1):
        lines.append(f"  {i}. [{r['rule_type']}] {r['content']}")
    return "\n[헌법 원칙 — 반드시 준수]\n" + "\n".join(lines) + "\n"

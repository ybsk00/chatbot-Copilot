from app.db.supabase_client import get_client

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

    return None

"""화법 레이어 Gate — 카테고리+CTA별 대화 스크립트 벡터 검색 + 프롬프트 주입"""
import logging
from app.db.supabase_client import get_client
from app.config import SCRIPT_TOP_K

logger = logging.getLogger(__name__)


def search_relevant_scripts(
    query_embedding: list[float],
    category: str | None = None,
    cta_phase: str = "cold",
) -> list[dict]:
    """질문 임베딩 + 카테고리 + CTA로 관련 화법 스크립트 검색."""
    try:
        supabase = get_client()
        result = supabase.rpc(
            "match_conversation_scripts",
            {
                "query_embedding": query_embedding,
                "filter_category": category,
                "filter_cta": cta_phase,
                "match_count": SCRIPT_TOP_K,
            },
        ).execute()

        scripts = []
        for row in (result.data or []):
            if row["similarity"] >= 0.40:
                scripts.append({
                    "id": row["id"],
                    "category": row["category"],
                    "cta_phase": row["cta_phase"],
                    "script_type": row["script_type"],
                    "content": row["content"],
                    "similarity": row["similarity"],
                })

        # 카테고리 필터로 결과 없으면 → CTA만으로 재검색
        if not scripts and category:
            result2 = supabase.rpc(
                "match_conversation_scripts",
                {
                    "query_embedding": query_embedding,
                    "filter_category": None,
                    "filter_cta": cta_phase,
                    "match_count": SCRIPT_TOP_K,
                },
            ).execute()
            for row in (result2.data or []):
                if row["similarity"] >= 0.45:
                    scripts.append({
                        "id": row["id"],
                        "category": row["category"],
                        "cta_phase": row["cta_phase"],
                        "script_type": row["script_type"],
                        "content": row["content"],
                        "similarity": row["similarity"],
                    })

        return scripts
    except Exception as e:
        logger.warning(f"Script vector search failed: {e}")
        return []


def format_scripts_for_prompt(scripts: list[dict]) -> str:
    """검색된 화법 스크립트를 시스템 프롬프트용 텍스트로 변환."""
    if not scripts:
        return ""
    lines = []
    for i, s in enumerate(scripts, 1):
        lines.append(f"  {i}. {s['content']}")
    return "\n[화법 가이드 — 답변 톤과 흐름에 반영]\n" + "\n".join(lines) + "\n"

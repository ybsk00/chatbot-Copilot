"""L4 공급업체 추천 API — taxonomy_l4 + suppliers_l4 기반."""
import logging
from fastapi import APIRouter
from app.data.l4_supplier_data import get_l4_store

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/suppliers/l4", tags=["suppliers-l4"])


@router.get("/options/{l3_code}")
async def get_l4_options(l3_code: str):
    """L3 코드의 하위 L4 세분류 목록 반환.

    auto_select=true면 L4가 1개 → 프론트에서 자동 선택.
    """
    store = get_l4_store()
    options = store.get_l4_options(l3_code)
    return {
        "l3_code": l3_code,
        "l4_options": options,
        "auto_select": len(options) == 1,
        "l4_code": options[0]["code"] if len(options) == 1 else None,
    }


@router.get("/recommend/{l4_code}")
async def recommend_suppliers(
    l4_code: str,
    scope_type: str = "nationwide",
    scope_value: str | None = None,
    session_id: str | None = None,
):
    """L4 공급업체 추천 — S/A 고정 + B/C/D 세션 롤링.

    Args:
        l4_code: L4 세분류 코드 (예: L3-010101-01)
        scope_type: 'nationwide' | 'regional' | 'worktype'
        scope_value: 권역명 또는 공종명 (nationwide면 None)
        session_id: 롤링 시드용 세션 ID
    """
    store = get_l4_store()
    return store.get_suppliers(l4_code, scope_type, scope_value, session_id)


@router.get("/branch/{l4_code}")
async def get_branch_options(l4_code: str):
    """L4의 지역/공종 분기 옵션 반환."""
    store = get_l4_store()
    return store.get_branch_info(l4_code)

import logging
from fastapi import APIRouter
from pydantic import BaseModel
from app.db.supabase_client import get_client
from app.constitution.gate import reload_rules
from app.rag.embedder import embed_document

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin", tags=["admin"])


# ── 헌법 관리 ──
class ConstitutionRule(BaseModel):
    rule_type: str
    content: str
    is_active: bool = True


def _embed_rule(content: str) -> list[float] | None:
    """헌법 규칙 텍스트를 임베딩 (실패 시 None)"""
    try:
        return embed_document(content)
    except Exception as e:
        logger.warning(f"Constitution rule embedding failed: {e}")
        return None


@router.get("/constitution")
async def list_constitution():
    supabase = get_client()
    result = supabase.table("constitution_rules").select("*").order("id").execute()
    return {"rules": result.data}


@router.post("/constitution")
async def add_constitution(rule: ConstitutionRule):
    supabase = get_client()
    data = rule.model_dump()
    # 자동 임베딩 생성
    embedding = _embed_rule(rule.content)
    if embedding:
        data["embedding"] = embedding
    result = supabase.table("constitution_rules").insert(data).execute()
    reload_rules()
    return {"status": "created", "data": result.data}


@router.put("/constitution/{rule_id}")
async def update_constitution(rule_id: int, rule: ConstitutionRule):
    supabase = get_client()
    data = rule.model_dump()
    # 내용 변경 시 임베딩 재생성
    embedding = _embed_rule(rule.content)
    if embedding:
        data["embedding"] = embedding
    result = (
        supabase.table("constitution_rules")
        .update(data)
        .eq("id", rule_id)
        .execute()
    )
    reload_rules()
    return {"status": "updated", "data": result.data}


@router.delete("/constitution/{rule_id}")
async def delete_constitution(rule_id: int):
    supabase = get_client()
    supabase.table("constitution_rules").delete().eq("id", rule_id).execute()
    reload_rules()
    return {"status": "deleted"}


@router.post("/constitution/embed-all")
async def embed_all_constitution():
    """기존 헌법 규칙 전체 임베딩 (마이그레이션용)"""
    supabase = get_client()
    result = supabase.table("constitution_rules").select("id, content").eq("is_active", True).execute()
    updated = 0
    for row in (result.data or []):
        embedding = _embed_rule(row["content"])
        if embedding:
            supabase.table("constitution_rules").update(
                {"embedding": embedding}
            ).eq("id", row["id"]).execute()
            updated += 1
    reload_rules()
    return {"status": "completed", "updated": updated, "total": len(result.data or [])}


# ── 대화이력 ──
@router.get("/conversations")
async def list_conversations(status: str | None = None, limit: int = 50):
    supabase = get_client()
    query = supabase.table("conversations").select("*")
    if status:
        query = query.eq("status", status)
    result = query.order("updated_at", desc=True).limit(limit).execute()
    return {"conversations": result.data}


@router.get("/conversations/{session_id}")
async def get_conversation(session_id: str):
    supabase = get_client()
    result = (
        supabase.table("conversations")
        .select("*")
        .eq("session_id", session_id)
        .execute()
    )
    return {"conversation": result.data[0] if result.data else None}


# ── 분류체계 ──
@router.get("/taxonomy")
async def list_taxonomy():
    supabase = get_client()
    result = supabase.table("taxonomy").select("*").order("id").execute()
    return {"taxonomy": result.data}


# ── 사용자 관리 ──
@router.get("/users")
async def list_users():
    supabase = get_client()
    result = supabase.table("admin_users").select("*").order("id").execute()
    return {"users": result.data}


# ── 대시보드 ──
@router.get("/dashboard")
async def dashboard():
    supabase = get_client()

    chunks = supabase.table("knowledge_chunks").select("id", count="exact").execute()
    convs = supabase.table("conversations").select("id", count="exact").execute()
    suppliers = supabase.table("suppliers").select("id", count="exact").execute()
    rules = supabase.table("constitution_rules").select("id", count="exact").execute()

    return {
        "knowledge_chunks": chunks.count or 0,
        "conversations": convs.count or 0,
        "suppliers": suppliers.count or 0,
        "constitution_rules": rules.count or 0,
    }

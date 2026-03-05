from fastapi import APIRouter
from pydantic import BaseModel
from app.db.supabase_client import get_client
from app.constitution.gate import reload_rules

router = APIRouter(prefix="/admin", tags=["admin"])


# ── 헌법 관리 ──
class ConstitutionRule(BaseModel):
    rule_type: str
    content: str
    is_active: bool = True


@router.get("/constitution")
async def list_constitution():
    supabase = get_client()
    result = supabase.table("constitution_rules").select("*").order("id").execute()
    return {"rules": result.data}


@router.post("/constitution")
async def add_constitution(rule: ConstitutionRule):
    supabase = get_client()
    result = supabase.table("constitution_rules").insert(rule.model_dump()).execute()
    reload_rules()
    return {"status": "created", "data": result.data}


@router.put("/constitution/{rule_id}")
async def update_constitution(rule_id: int, rule: ConstitutionRule):
    supabase = get_client()
    result = (
        supabase.table("constitution_rules")
        .update(rule.model_dump())
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

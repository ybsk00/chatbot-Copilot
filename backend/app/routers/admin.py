import hashlib
import logging
import time
from concurrent.futures import ThreadPoolExecutor
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.db.supabase_client import get_client
from app.constitution.gate import reload_rules
from app.rag.embedder import embed_document
from app.services.email_service import send_rfp_email

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin", tags=["admin"])

# ── 대시보드 캐시 (60초 TTL) ──
_dashboard_cache: dict | None = None
_dashboard_cache_ts: float = 0
_DASHBOARD_CACHE_TTL = 60  # seconds


# ── 로그인 ──
class LoginRequest(BaseModel):
    email: str
    password: str


def _hash_pw(pw: str) -> str:
    return hashlib.sha256(pw.encode()).hexdigest()


@router.post("/login")
async def login(req: LoginRequest):
    supabase = get_client()
    result = (
        supabase.table("admin_users")
        .select("*")
        .eq("email", req.email)
        .eq("is_active", True)
        .execute()
    )
    if not result.data:
        return {"ok": False, "error": "계정을 찾을 수 없습니다."}
    user = result.data[0]
    if user.get("password_hash") != _hash_pw(req.password):
        return {"ok": False, "error": "비밀번호가 일치하지 않습니다."}
    # last_login 갱신
    supabase.table("admin_users").update(
        {"last_login": "now()"}
    ).eq("id", user["id"]).execute()
    return {
        "ok": True,
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "role": user["role"],
            "department": user.get("department"),
        },
    }


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
    result = supabase.table("constitution_rules").select(
        "id, rule_type, content, is_active, created_at"
    ).order("id").execute()
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
    query = supabase.table("conversations").select(
        "id, session_id, user_name, department, category, rag_score, status, created_at, updated_at"
    )
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


@router.delete("/conversations/{conversation_id}")
async def delete_conversation(conversation_id: int):
    supabase = get_client()
    supabase.table("conversations").delete().eq("id", conversation_id).execute()
    return {"status": "deleted"}


# ── 분류체계 ──
@router.get("/taxonomy")
async def list_taxonomy():
    supabase = get_client()
    result = supabase.table("taxonomy").select("*").order("id").execute()
    return {"taxonomy": result.data}


# ── 사용자 관리 ──
class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    role: str = "viewer"
    department: str = ""


class UserUpdate(BaseModel):
    name: str | None = None
    email: str | None = None
    password: str | None = None
    role: str | None = None
    department: str | None = None
    is_active: bool | None = None


@router.get("/users")
async def list_users():
    supabase = get_client()
    result = supabase.table("admin_users").select(
        "id, name, email, role, department, is_active, last_login, created_at"
    ).order("id").execute()
    return {"users": result.data}


@router.post("/users")
async def create_user(user: UserCreate):
    supabase = get_client()
    # 이메일 중복 확인
    existing = (
        supabase.table("admin_users")
        .select("id")
        .eq("email", user.email)
        .execute()
    )
    if existing.data:
        return {"status": "error", "error": "이미 등록된 이메일입니다."}
    data = {
        "name": user.name,
        "email": user.email,
        "password_hash": _hash_pw(user.password),
        "role": user.role,
        "department": user.department,
        "is_active": True,
    }
    result = supabase.table("admin_users").insert(data).execute()
    return {"status": "created", "data": result.data}


@router.put("/users/{user_id}")
async def update_user(user_id: int, user: UserUpdate):
    supabase = get_client()
    data = {}
    if user.name is not None:
        data["name"] = user.name
    if user.email is not None:
        data["email"] = user.email
    if user.password is not None:
        data["password_hash"] = _hash_pw(user.password)
    if user.role is not None:
        data["role"] = user.role
    if user.department is not None:
        data["department"] = user.department
    if user.is_active is not None:
        data["is_active"] = user.is_active
    if not data:
        return {"status": "no_change"}
    result = (
        supabase.table("admin_users")
        .update(data)
        .eq("id", user_id)
        .execute()
    )
    return {"status": "updated", "data": result.data}


@router.delete("/users/{user_id}")
async def delete_user(user_id: int):
    supabase = get_client()
    supabase.table("admin_users").delete().eq("id", user_id).execute()
    return {"status": "deleted"}


# ── RFP 신청 관리 ──
class RfpStatusUpdate(BaseModel):
    status: str


@router.get("/rfp-requests")
async def list_rfp_requests(status: str | None = None, limit: int = 50):
    supabase = get_client()
    query = supabase.table("rfp_requests").select(
        "id, session_id, rfp_type, title, org_name, department, requester, fields, status, created_at, updated_at"
    )
    if status:
        query = query.eq("status", status)
    result = query.order("created_at", desc=True).limit(limit).execute()
    return {"rfp_requests": result.data}


@router.put("/rfp-requests/{request_id}")
async def update_rfp_status(request_id: int, body: RfpStatusUpdate):
    supabase = get_client()
    result = (
        supabase.table("rfp_requests")
        .update({"status": body.status})
        .eq("id", request_id)
        .execute()
    )
    return {"status": "updated", "data": result.data}


@router.delete("/rfp-requests/{request_id}")
async def delete_rfp_request(request_id: int):
    supabase = get_client()
    supabase.table("rfp_requests").delete().eq("id", request_id).execute()
    return {"status": "deleted"}


# ── RFP 이메일 발송 ──
class RfpSendEmail(BaseModel):
    to_email: str


@router.post("/rfp-requests/{request_id}/send-email")
async def send_rfp_email_endpoint(request_id: int, body: RfpSendEmail):
    """RFP를 이메일로 발송하고 상태를 'sent'로 업데이트"""
    supabase = get_client()
    result = (
        supabase.table("rfp_requests")
        .select("*")
        .eq("id", request_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="RFP를 찾을 수 없습니다.")

    rfp = result.data[0]
    rfp_data = {
        "rfp_type": rfp.get("rfp_type") or rfp.get("template_type") or "",
        "title": rfp.get("title") or "",
        "org_name": rfp.get("org_name") or "",
        "department": rfp.get("department") or "",
        "requester": rfp.get("requester") or "",
        "fields": rfp.get("fields") or {},
        "created_at": rfp.get("created_at") or "",
    }

    email_result = await send_rfp_email(body.to_email, rfp_data, request_id)

    if email_result["ok"]:
        supabase.table("rfp_requests").update(
            {"status": "sent"}
        ).eq("id", request_id).execute()
        return {"status": "sent", "message": email_result["message"]}

    raise HTTPException(status_code=500, detail=email_result["message"])


# ── 세션별 RFP 조회 (챗봇 사용자용) ──
@router.get("/rfp-requests/session/{session_id}")
async def get_session_rfp_requests(session_id: str):
    """특정 세션의 RFP 신청 이력을 반환"""
    supabase = get_client()
    result = (
        supabase.table("rfp_requests")
        .select("*")
        .eq("session_id", session_id)
        .order("created_at", desc=True)
        .execute()
    )
    return {"rfp_requests": result.data}


# ── RFP 양식 관리 ──
class RfpTemplateCreate(BaseModel):
    type_key: str
    name: str
    description: str = ""
    fields: dict = {}
    sections: list = []
    is_active: bool = True


@router.get("/rfp-templates")
async def list_rfp_templates():
    supabase = get_client()
    result = supabase.table("rfp_templates").select("*").order("id").execute()
    return {"templates": result.data}


@router.post("/rfp-templates")
async def create_rfp_template(tmpl: RfpTemplateCreate):
    supabase = get_client()
    result = supabase.table("rfp_templates").insert(tmpl.model_dump()).execute()
    return {"status": "created", "data": result.data}


@router.put("/rfp-templates/{template_id}")
async def update_rfp_template(template_id: int, tmpl: RfpTemplateCreate):
    supabase = get_client()
    data = tmpl.model_dump()
    data["updated_at"] = "now()"
    result = (
        supabase.table("rfp_templates")
        .update(data)
        .eq("id", template_id)
        .execute()
    )
    return {"status": "updated", "data": result.data}


@router.delete("/rfp-templates/{template_id}")
async def delete_rfp_template(template_id: int):
    supabase = get_client()
    supabase.table("rfp_templates").delete().eq("id", template_id).execute()
    return {"status": "deleted"}


# ── PR 양식(템플릿) 관리 ──

@router.get("/pr-templates")
async def list_pr_templates():
    supabase = get_client()
    result = supabase.table("pr_templates").select("*").eq("is_active", True).order("id").execute()
    return {"templates": result.data}


@router.post("/pr-templates")
async def create_pr_template(tmpl: RfpTemplateCreate):
    supabase = get_client()
    result = supabase.table("pr_templates").insert(tmpl.model_dump()).execute()
    return {"status": "created", "data": result.data}


@router.put("/pr-templates/{template_id}")
async def update_pr_template(template_id: int, tmpl: RfpTemplateCreate):
    supabase = get_client()
    data = tmpl.model_dump()
    data["updated_at"] = "now()"
    result = (
        supabase.table("pr_templates")
        .update(data)
        .eq("id", template_id)
        .execute()
    )
    return {"status": "updated", "data": result.data}


@router.delete("/pr-templates/{template_id}")
async def delete_pr_template(template_id: int):
    supabase = get_client()
    supabase.table("pr_templates").delete().eq("id", template_id).execute()
    return {"status": "deleted"}


# ── RFQ 템플릿 CRUD ──

@router.get("/rfq-templates")
async def list_rfq_templates():
    supabase = get_client()
    result = supabase.table("rfq_templates").select("*").eq("is_active", True).order("id").execute()
    return result.data or []


# ── 차세대 분류체계 (taxonomy_v2) ──

@router.get("/taxonomy-v2/tree")
async def get_taxonomy_tree():
    """L1 > L2 > L3 트리 구조 반환 (프론트엔드 카테고리 선택기용)"""
    supabase = get_client()
    rows = supabase.table("taxonomy_v2").select("*").eq("is_active", True).order("code").execute().data

    l1_list = [r for r in rows if r["level"] == 1]
    l2_list = [r for r in rows if r["level"] == 2]
    l3_list = [r for r in rows if r["level"] == 3]

    tree = []
    for l1 in l1_list:
        l2_children = []
        for l2 in l2_list:
            if l2.get("parent_code") == l1["code"]:
                l3_children = [
                    {
                        "code": l3["code"],
                        "name": l3["name"],
                        "description": l3.get("description"),
                        "keywords": l3.get("keywords", []),
                        "purchase_strategy": l3.get("purchase_strategy"),
                        "expense_type": l3.get("expense_type"),
                        "pr_template_key": l3.get("pr_template_key"),
                        "rfp_type": l3.get("rfp_type"),
                    }
                    for l3 in l3_list if l3.get("parent_code") == l2["code"]
                ]
                l2_children.append({
                    "code": l2["code"],
                    "name": l2["name"],
                    "pr_template_key": l2.get("pr_template_key"),
                    "rfp_type": l2.get("rfp_type"),
                    "children": l3_children,
                })
        tree.append({
            "code": l1["code"],
            "name": l1["name"],
            "children": l2_children,
        })

    return tree


@router.get("/taxonomy-v2")
async def get_taxonomy_flat():
    """taxonomy_v2 전체 플랫 리스트"""
    supabase = get_client()
    rows = supabase.table("taxonomy_v2").select("*").eq("is_active", True).order("code").execute().data
    return rows


# ── PR(구매요청서) 관리 ──

class PrStatusUpdate(BaseModel):
    status: str


@router.get("/pr-requests")
async def list_pr_requests(status: str | None = None, limit: int = 50):
    supabase = get_client()
    query = supabase.table("pr_requests").select(
        "id, session_id, pr_type, title, department, requester, fields, "
        "selected_supplier_id, selected_supplier_name, status, created_at, updated_at"
    )
    if status:
        query = query.eq("status", status)
    result = query.order("created_at", desc=True).limit(limit).execute()
    return {"pr_requests": result.data}


@router.put("/pr-requests/{request_id}")
async def update_pr_status(request_id: int, body: PrStatusUpdate):
    supabase = get_client()
    result = (
        supabase.table("pr_requests")
        .update({"status": body.status})
        .eq("id", request_id)
        .execute()
    )
    return {"status": "updated", "data": result.data}


@router.delete("/pr-requests/{request_id}")
async def delete_pr_request(request_id: int):
    supabase = get_client()
    supabase.table("pr_requests").delete().eq("id", request_id).execute()
    return {"status": "deleted"}


@router.get("/pr-requests/session/{session_id}")
async def get_session_pr_requests(session_id: str):
    """특정 세션의 PR 신청 이력을 반환"""
    supabase = get_client()
    result = (
        supabase.table("pr_requests")
        .select("*")
        .eq("session_id", session_id)
        .order("created_at", desc=True)
        .execute()
    )
    return {"pr_requests": result.data}


# ── 대시보드 ──
_dash_pool = ThreadPoolExecutor(max_workers=4, thread_name_prefix="dash")


@router.get("/dashboard")
async def dashboard():
    global _dashboard_cache, _dashboard_cache_ts

    # 캐시 유효 → 즉시 반환 (0ms)
    now = time.time()
    if _dashboard_cache and (now - _dashboard_cache_ts) < _DASHBOARD_CACHE_TTL:
        return _dashboard_cache

    supabase = get_client()

    def count_table(table_name):
        return supabase.table(table_name).select("id", count="exact", head=True).execute()

    # 재사용 풀로 병렬 실행 (풀 생성 오버헤드 제거)
    f_chunks = _dash_pool.submit(count_table, "knowledge_chunks")
    f_convs = _dash_pool.submit(count_table, "conversations")
    f_suppliers = _dash_pool.submit(count_table, "suppliers")
    f_rules = _dash_pool.submit(count_table, "constitution_rules")
    f_pr = _dash_pool.submit(count_table, "pr_requests")

    result = {
        "knowledge_chunks": f_chunks.result(timeout=10).count or 0,
        "conversations": f_convs.result(timeout=10).count or 0,
        "suppliers": f_suppliers.result(timeout=10).count or 0,
        "constitution_rules": f_rules.result(timeout=10).count or 0,
        "pr_requests": f_pr.result(timeout=10).count or 0,
    }

    # 캐시 갱신
    _dashboard_cache = result
    _dashboard_cache_ts = now
    logger.info(f"[Dashboard] Refreshed in {(time.time()-now)*1000:.0f}ms")
    return result

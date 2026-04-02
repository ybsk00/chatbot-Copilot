"""Chat Router — 멀티에이전트 Orchestrator에 위임하는 얇은 라우터"""
import json
import logging
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from app.agents.base import AgentContext
from app.agents.orchestrator import OrchestratorAgent
from app.db.supabase_client import get_client

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/chat", tags=["chat"])

# 대화 저장용 백그라운드 풀 (응답 블로킹 방지)
_save_pool = ThreadPoolExecutor(max_workers=2, thread_name_prefix="conv-save")


def _save_conversation(session_id: str, message: str, answer: str,
                       category: str | None, rag_score: float,
                       phase: str, history: list[dict]):
    """대화 이력을 conversations 테이블에 upsert."""
    try:
        supabase = get_client()
        # 기존 세션 조회
        existing = (
            supabase.table("conversations")
            .select("id, messages")
            .eq("session_id", session_id)
            .execute()
        )

        # 현재 턴의 메시지
        new_msgs = [
            {"role": "user", "content": message},
            {"role": "assistant", "content": answer},
        ]

        if existing.data:
            # 기존 세션 업데이트 — 메시지 추가
            row = existing.data[0]
            prev_msgs = row.get("messages") or []
            prev_msgs.extend(new_msgs)
            supabase.table("conversations").update({
                "messages": prev_msgs,
                "category": category,
                "rag_score": rag_score,
                "status": phase,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }).eq("id", row["id"]).execute()
        else:
            # 새 세션 생성
            supabase.table("conversations").insert({
                "session_id": session_id,
                "category": category,
                "messages": new_msgs,
                "rag_score": rag_score,
                "status": phase,
            }).execute()
    except Exception as e:
        logger.error(f"[Conv] Failed to save conversation: {e}")

# Orchestrator 싱글턴
_orchestrator = None


def _get_orchestrator() -> OrchestratorAgent:
    global _orchestrator
    if _orchestrator is None:
        _orchestrator = OrchestratorAgent()
    return _orchestrator


class ChatRequest(BaseModel):
    session_id: str
    message: str
    category: str | None = None
    history: list[dict] = []
    phase: str = "chat"
    filled_fields: dict = {}
    rfp_type: str | None = "service_contract"
    # PR (구매요청서) 관련
    user_role: str | None = None        # "user" | "procurement"
    pr_type: str | None = None           # PR 카테고리 키
    pr_filled_fields: dict = {}          # PR 채워진 필드
    l3_code: str | None = None           # L3 분류 코드
    l4_code: str | None = None           # L4 세분류 코드
    l4_name: str | None = None           # L4 세분류 이름
    selected_suppliers: list[dict] = []  # 선택된 공급업체 목록
    role_turn_count: int = 0             # 역할 감지 턴 카운터
    # RFQ (견적서) 관련
    rfq_type: str | None = None          # RFQ 카테고리 키
    rfq_filled_fields: dict = {}         # RFQ 채워진 필드


# ──────────────────────────────────────────────
# POST /chat/stream — SSE 스트리밍 (chat/asked phase)
# ──────────────────────────────────────────────

@router.post("/stream")
async def chat_stream(req: ChatRequest):
    ctx = AgentContext(
        session_id=req.session_id,
        message=req.message,
        category=req.category,
        history=req.history,
        phase=req.phase,
        filled_fields=req.filled_fields,
        rfp_type=req.rfp_type or "service_contract",
        user_role=req.user_role,
        role_turn_count=req.role_turn_count,
        pr_type=req.pr_type,
    )

    orchestrator = _get_orchestrator()

    async def event_generator():
        accumulated = ""
        async for event in orchestrator.execute_stream(ctx):
            yield event
            # 토큰 누적 (답변 저장용)
            if '"type": "token"' in event:
                try:
                    payload = json.loads(event.replace("data: ", "").strip())
                    accumulated += payload.get("content", "")
                except Exception:
                    pass
        # 스트리밍 완료 후 대화 저장
        if accumulated:
            _save_conversation(
                req.session_id, req.message, accumulated,
                req.category, ctx.rag_score, req.phase, req.history,
            )

    return StreamingResponse(event_generator(), media_type="text/event-stream")


# ──────────────────────────────────────────────
# POST /chat — 동기 방식 (filling phase 전용)
# ──────────────────────────────────────────────

@router.post("")
async def chat(req: ChatRequest):
    # Phase별 filled_fields 선택
    is_pr_phase = req.phase.startswith("pr_")
    is_rfq_phase = req.phase.startswith("rfq_")
    if is_pr_phase:
        filled = req.pr_filled_fields
    elif is_rfq_phase:
        filled = req.rfq_filled_fields
    else:
        filled = req.filled_fields

    ctx = AgentContext(
        session_id=req.session_id,
        message=req.message,
        category=req.category,
        history=req.history,
        phase=req.phase,
        filled_fields=filled,
        rfp_type=req.rfp_type or "service_contract",
        user_role=req.user_role,
        role_turn_count=req.role_turn_count,
        pr_type=req.pr_type,
        rfq_type=req.rfq_type,
    )

    orchestrator = _get_orchestrator()

    # Phase별 라우팅
    if is_pr_phase:
        result = await orchestrator.execute_sync_pr(ctx)
    elif is_rfq_phase:
        result = await orchestrator.execute_sync_rfq(ctx)
    else:
        result = await orchestrator.execute_sync(ctx)

    # 대화 이력 비동기 저장 (응답 블로킹 방지)
    _save_pool.submit(
        _save_conversation,
        req.session_id, req.message, result.get("answer", ""),
        req.category, result.get("rag_score", 0), req.phase, req.history,
    )

    # PR 완료 시 pr_requests 테이블에 저장
    if result.get("phase_trigger") == "pr_complete" and req.pr_filled_fields:
        try:
            supabase = get_client()
            pr_result = supabase.table("pr_requests").insert({
                "session_id": req.session_id,
                "pr_type": req.pr_type or "_generic",
                "fields": req.pr_filled_fields,
                "l3_code": req.l3_code,
                "l4_code": req.l4_code,
                "l4_name": req.l4_name,
                "selected_suppliers": req.selected_suppliers or [],
                "status": "draft",
            }).execute()
            result["pr_saved"] = True
            if pr_result.data:
                result["pr_request_id"] = pr_result.data[0].get("id")
            logger.info(f"[PR] Saved pr_request for session {req.session_id}")
        except Exception as e:
            logger.error(f"[PR] Failed to save pr_request: {e}")
            result["pr_saved"] = False

    # RFQ 완료 시 rfq_requests 테이블에 저장
    if result.get("phase_trigger") == "rfq_complete" and req.rfq_filled_fields:
        try:
            supabase = get_client()
            rfq_result = supabase.table("rfq_requests").insert({
                "conversation_id": req.session_id,
                "rfq_type": req.rfq_type or "_generic",
                "fields": req.rfq_filled_fields,
                "status": "draft",
            }).execute()
            result["rfq_saved"] = True
            if rfq_result.data:
                result["rfq_request_id"] = rfq_result.data[0].get("id")
            logger.info(f"[RFQ] Saved rfq_request for session {req.session_id}")
        except Exception as e:
            logger.error(f"[RFQ] Failed to save rfq_request: {e}")

    # RFP 완료 시 rfp_requests 테이블에 저장
    if result.get("phase_trigger") == "complete" and req.filled_fields:
        try:
            supabase = get_client()
            supabase.table("rfp_requests").insert({
                "session_id": req.session_id,
                "rfp_type": req.rfp_type or "service_contract",
                "title": req.filled_fields.get("s6", ""),
                "org_name": req.filled_fields.get("s1", ""),
                "department": req.filled_fields.get("s2", ""),
                "requester": req.filled_fields.get("s3", ""),
                "fields": req.filled_fields,
                "status": "submitted",
            }).execute()
            logger.info(f"[RFP] Saved rfp_request for session {req.session_id}")
        except Exception as e:
            logger.error(f"[RFP] Failed to save rfp_request: {e}")

    return result


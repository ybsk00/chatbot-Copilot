"""Chat Router — 멀티에이전트 Orchestrator에 위임하는 얇은 라우터"""
import json
import logging
from datetime import datetime, timezone
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from app.agents.base import AgentContext
from app.agents.orchestrator import OrchestratorAgent
from app.db.supabase_client import get_client

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/chat", tags=["chat"])


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
    ctx = AgentContext(
        session_id=req.session_id,
        message=req.message,
        category=req.category,
        history=req.history,
        phase=req.phase,
        filled_fields=req.filled_fields,
        rfp_type=req.rfp_type or "service_contract",
    )

    orchestrator = _get_orchestrator()
    result = await orchestrator.execute_sync(ctx)

    # 대화 이력 저장
    _save_conversation(
        req.session_id, req.message, result.get("answer", ""),
        req.category, result.get("rag_score", 0), req.phase, req.history,
    )

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

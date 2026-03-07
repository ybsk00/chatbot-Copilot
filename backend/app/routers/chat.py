"""Chat Router — 멀티에이전트 Orchestrator에 위임하는 얇은 라우터"""
import logging
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from app.agents.base import AgentContext
from app.agents.orchestrator import OrchestratorAgent

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/chat", tags=["chat"])

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
        async for event in orchestrator.execute_stream(ctx):
            yield event

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
    return await orchestrator.execute_sync(ctx)

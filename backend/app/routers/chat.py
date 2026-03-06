import json
import re
import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from google import genai
from app.config import GOOGLE_API_KEY, MODELS, PURCHASE_KEYWORDS, RFP_AGREE_KEYWORDS
from app.rag.retriever import hybrid_search
from app.rag.generator import generate_answer, generate_answer_stream
from app.rag import prefetcher
from app.constitution.gate import check_constitution

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/chat", tags=["chat"])

_client = None
def _get_client():
    global _client
    if _client is None:
        _client = genai.Client(api_key=GOOGLE_API_KEY)
    return _client

_executor = ThreadPoolExecutor(max_workers=4)

RFP_FIELDS_SCHEMA = """s1:발주기관명, s2:담당부서, s3:담당자, s4:연락처, s5:이메일,
s6:사업명, s7:사업목적, s8:계약형태, s9:수행기간, s10:대상인원,
s11:서비스범위, s12:교육방식, s13:기술요건, s14:납기기준, s15:SLA기준,
s16:평가①가격경쟁력, s17:평가②콘텐츠강사, s18:평가③ESG대응, s19:평가④신뢰도, s20:평가⑤디지털역량,
s21:제출기한, s22:제출방식"""

PHASE_PROMPT = """사용자 메시지와 대화 이력을 분석하여 JSON만 반환하세요. 설명 없이 JSON만.

## 판단 기준
1. rfp_fields: phase가 filling일 때만 추출. 아니면 빈 객체.
   필드키: {fields}
2. is_complete: 주요 필드(s1~s15, s21, s22) 모두 채워졌으면 true.

현재 phase: {phase} / 채워진 필드: {filled_keys}

대화이력: {history}

현재 메시지: {message}

출력:
{{"rfp_fields": {{}}, "is_complete": false}}"""


class ChatRequest(BaseModel):
    session_id: str
    message: str
    category: str | None = None
    history: list[dict] = []
    phase: str = "chat"
    filled_fields: dict = {}


# ──────────────────────────────────────────────
# 키워드 기반 Phase 감지 (Gemini 호출 없음)
# ──────────────────────────────────────────────

def detect_phase_trigger(message: str, current_phase: str) -> str | None:
    """키워드 매칭으로 phase 전환 감지"""
    msg = message.strip()
    if current_phase == "chat":
        if any(kw in msg for kw in PURCHASE_KEYWORDS):
            return "purchase"
    elif current_phase == "asked":
        if any(kw in msg for kw in RFP_AGREE_KEYWORDS):
            return "rfp_agreed"
    return None


# ──────────────────────────────────────────────
# POST /chat/stream — SSE 스트리밍 (chat/asked phase)
# ──────────────────────────────────────────────

@router.post("/stream")
async def chat_stream(req: ChatRequest):
    # 1. 헌법 검사
    violation = check_constitution(req.message)
    if violation:
        async def error_gen():
            yield f"data: {json.dumps({'type': 'meta', 'sources': [], 'rag_score': 0, 'phase_trigger': None, 'classification': None}, ensure_ascii=False)}\n\n"
            yield f"data: {json.dumps({'type': 'token', 'content': violation}, ensure_ascii=False)}\n\n"
            yield f"data: {json.dumps({'type': 'done'})}\n\n"
        return StreamingResponse(error_gen(), media_type="text/event-stream")

    # 2. 캐시 확인 → 없으면 hybrid_search (동기 → executor)
    loop = asyncio.get_event_loop()
    cached = prefetcher.get_cached(req.message)
    if cached:
        chunks = cached
    else:
        chunks = await loop.run_in_executor(
            _executor, lambda: hybrid_search(req.message, category=req.category)
        )

    # 3. Phase 감지 (키워드 — 즉시, Gemini 호출 없음)
    trigger = detect_phase_trigger(req.message, req.phase)

    # 4. 메타데이터 준비
    avg_score = sum(c.get("similarity", 0) for c in chunks) / max(len(chunks), 1)
    sources = list({c["doc_name"] for c in chunks})

    # 5. SSE 스트리밍
    async def event_generator():
        # 메타 이벤트 (소스, 점수, 트리거)
        meta = {
            "type": "meta",
            "sources": sources,
            "rag_score": round(avg_score, 4),
            "phase_trigger": trigger,
            "classification": None,
        }
        yield f"data: {json.dumps(meta, ensure_ascii=False)}\n\n"

        # 토큰 스트리밍
        filled_keys = ", ".join(req.filled_fields.keys()) if req.filled_fields else ""
        full_answer = ""

        def _stream_tokens():
            return list(generate_answer_stream(
                req.message, chunks, req.history, req.phase, filled_keys
            ))

        tokens = await loop.run_in_executor(_executor, _stream_tokens)

        for token in tokens:
            full_answer += token
            yield f"data: {json.dumps({'type': 'token', 'content': token}, ensure_ascii=False)}\n\n"

        # 완료 신호
        yield f"data: {json.dumps({'type': 'done'})}\n\n"

        # 백그라운드: prefetcher 실행
        _executor.submit(prefetcher.run_prefetch, full_answer, req.message, req.category)

    return StreamingResponse(event_generator(), media_type="text/event-stream")


# ──────────────────────────────────────────────
# POST /chat — 동기 방식 (filling phase 전용)
# ──────────────────────────────────────────────

def _extract_phase(req: ChatRequest) -> dict:
    """Gemini flash-lite로 RFP 필드 추출 (filling phase 전용)"""
    history_text = ""
    for msg in (req.history or [])[-4:]:
        role = "사용자" if msg.get("role") == "user" else "AI"
        history_text += f"{role}: {msg.get('content', '')}\n"

    filled_keys = ", ".join(req.filled_fields.keys()) if req.filled_fields else "없음"

    prompt = PHASE_PROMPT.format(
        fields=RFP_FIELDS_SCHEMA,
        phase=req.phase,
        filled_keys=filled_keys,
        history=history_text or "(없음)",
        message=req.message,
    )

    try:
        response = _get_client().models.generate_content(
            model=MODELS["refinement"],
            contents=prompt,
        )
        text = response.text.strip()
        if text.startswith("```"):
            text = re.sub(r"```json?\s*", "", text)
            text = re.sub(r"```\s*$", "", text)
        return json.loads(text)
    except Exception:
        return {"rfp_fields": {}, "is_complete": False}


def _search_and_answer(req: ChatRequest) -> tuple:
    """RAG 검색 + 답변 생성"""
    chunks = hybrid_search(req.message, category=req.category)
    filled_keys = ", ".join(req.filled_fields.keys()) if req.filled_fields else ""
    answer, score = generate_answer(req.message, chunks, req.history, req.phase, filled_keys)
    return answer, score, chunks


@router.post("")
async def chat(req: ChatRequest):
    # 1. 헌법 검사
    violation = check_constitution(req.message)
    if violation:
        return {
            "answer": violation, "sources": [], "rag_score": 0,
            "phase_trigger": None, "rfp_fields": {}, "classification": None,
        }

    # 2. Phase 분석 + RAG 답변 병렬 실행
    loop = asyncio.get_event_loop()
    phase_future = loop.run_in_executor(_executor, _extract_phase, req)
    answer_future = loop.run_in_executor(_executor, _search_and_answer, req)

    phase_data, (answer, score, chunks) = await asyncio.gather(phase_future, answer_future)

    # 3. 완성 여부 판단
    trigger = None
    if phase_data.get("is_complete") and req.phase == "filling":
        trigger = "complete"

    return {
        "answer": answer,
        "sources": [c["doc_name"] for c in chunks],
        "rag_score": score,
        "phase_trigger": trigger,
        "rfp_fields": phase_data.get("rfp_fields", {}),
        "classification": None,
    }

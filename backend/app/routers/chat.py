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
from app.rag.retriever import hybrid_search, get_faq_suggestions
from app.rag.embedder import embed_query
from app.rag.generator import generate_answer, generate_answer_stream
from app.rag.classifier import classify_intent
from app.rag import prefetcher
from app.constitution.gate import check_constitution, search_relevant_rules, format_rules_for_prompt

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

RFP_SCHEMAS = {
    "purchase": {
        "fields": "s1:발주기관명, s2:담당부서, s3:담당자, s4:연락처, s5:이메일, s6:구매품목, s7:구매목적, s8:수량, s9:납품기한, s10:요구사양, s11:품질기준, s12:납품조건, s13:평가①가격경쟁력, s14:평가②품질신뢰도, s15:평가③납기준수, s16:평가④기술역량, s17:제출기한, s18:제출방식",
        "required": "s1,s2,s3,s4,s5,s6,s7,s8,s9,s10,s11,s12,s17,s18",
        "sections": "1. 발주기관 정보 (기관명, 담당부서, 담당자, 연락처, 이메일)\n2. 구매 개요 (구매 품목, 구매 목적, 수량, 납품기한)\n3. 요구사항 (요구 사양, 품질 기준, 납품 조건)\n4. 평가 기준 (가격 경쟁력, 품질·신뢰도, 납기 준수, 기술 역량)\n5. 제출 안내 (제출기한, 제출방식)",
    },
    "service_contract": {
        "fields": "s1:발주기관명, s2:담당부서, s3:담당자, s4:연락처, s5:이메일, s6:사업명, s7:사업목적, s8:계약형태, s9:수행기간, s10:대상인원, s11:서비스범위, s12:수행방식, s13:요구사양, s14:SLA기준, s15:평가①가격경쟁력, s16:평가②전문성실적, s17:평가③ESG대응, s18:평가④기술역량, s19:제출기한, s20:제출방식",
        "required": "s1,s2,s3,s4,s5,s6,s7,s8,s9,s10,s11,s12,s13,s14,s19,s20",
        "sections": "1. 발주기관 정보 (기관명, 담당부서, 담당자, 연락처, 이메일)\n2. 사업 개요 (사업명, 사업목적, 계약형태, 수행기간, 대상인원)\n3. 서비스 요건 (서비스 범위, 수행 방식, 요구 사양, SLA 기준)\n4. 평가 기준 (가격 경쟁력, 전문성·실적, ESG 대응, 기술 역량)\n5. 제출 안내 (제출기한, 제출방식)",
    },
    "service": {
        "fields": "s1:발주기관명, s2:담당부서, s3:담당자, s4:연락처, s5:이메일, s6:서비스명, s7:서비스목적, s8:계약기간, s9:대상규모, s10:서비스범위, s11:제공방식, s12:품질SLA기준, s13:보안요건, s14:평가①가격경쟁력, s15:평가②서비스품질, s16:평가③안정성신뢰도, s17:평가④ESG대응, s18:제출기한, s19:제출방식",
        "required": "s1,s2,s3,s4,s5,s6,s7,s8,s9,s10,s11,s12,s18,s19",
        "sections": "1. 발주기관 정보 (기관명, 담당부서, 담당자, 연락처, 이메일)\n2. 서비스 개요 (서비스명, 서비스 목적, 계약기간, 대상 규모)\n3. 서비스 요건 (서비스 범위, 제공 방식, 품질·SLA 기준, 보안 요건)\n4. 평가 기준 (가격 경쟁력, 서비스 품질, 안정성·신뢰도, ESG 대응)\n5. 제출 안내 (제출기한, 제출방식)",
    },
    "rental": {
        "fields": "s1:발주기관명, s2:담당부서, s3:담당자, s4:연락처, s5:이메일, s6:사업명, s7:계약목적, s8:리스렌탈형태, s9:계약기간, s10:대상규모, s11:요구사양, s12:포함서비스, s13:유지보수기준, s14:반납인수조건, s15:평가①총비용TCO, s16:평가②서비스품질, s17:평가③신뢰도실적, s18:평가④ESG대응, s19:제출기한, s20:제출방식",
        "required": "s1,s2,s3,s4,s5,s6,s7,s8,s9,s10,s11,s12,s13,s14,s19,s20",
        "sections": "1. 발주기관 정보 (기관명, 담당부서, 담당자, 연락처, 이메일)\n2. 계약 개요 (사업명, 계약 목적, 리스/렌탈 형태, 계약기간, 대상 규모)\n3. 요구사항 (요구 사양, 포함 서비스, 유지보수 기준, 반납·인수 조건)\n4. 평가 기준 (총비용(TCO), 서비스 품질, 신뢰도·실적, ESG 대응)\n5. 제출 안내 (제출기한, 제출방식)",
    },
    "construction": {
        "fields": "s1:발주기관명, s2:담당부서, s3:담당자, s4:연락처, s5:이메일, s6:공사명, s7:공사목적, s8:공사기간, s9:공사규모면적, s10:공사범위, s11:요구사양, s12:품질기준, s13:안전기준, s14:평가①가격경쟁력, s15:평가②시공실적, s16:평가③기술역량, s17:평가④안전관리, s18:제출기한, s19:제출방식",
        "required": "s1,s2,s3,s4,s5,s6,s7,s8,s9,s10,s11,s12,s13,s18,s19",
        "sections": "1. 발주기관 정보 (기관명, 담당부서, 담당자, 연락처, 이메일)\n2. 공사 개요 (공사명, 공사 목적, 공사기간, 공사 규모·면적)\n3. 공사 요건 (공사 범위, 요구 사양, 품질 기준, 안전 기준)\n4. 평가 기준 (가격 경쟁력, 시공 실적, 기술 역량, 안전 관리)\n5. 제출 안내 (제출기한, 제출방식)",
    },
    "consulting": {
        "fields": "s1:발주기관명, s2:담당부서, s3:담당자, s4:연락처, s5:이메일, s6:사업명, s7:사업목적, s8:수행기간, s9:투입인력, s10:컨설팅범위, s11:요구역량, s12:산출물, s13:보안기밀요건, s14:평가①전문성실적, s15:평가②투입인력역량, s16:평가③가격경쟁력, s17:평가④방법론, s18:제출기한, s19:제출방식",
        "required": "s1,s2,s3,s4,s5,s6,s7,s8,s9,s10,s11,s12,s18,s19",
        "sections": "1. 발주기관 정보 (기관명, 담당부서, 담당자, 연락처, 이메일)\n2. 사업 개요 (사업명, 사업 목적, 수행기간, 투입 인력)\n3. 수행 요건 (컨설팅 범위, 요구 역량, 산출물, 보안·기밀 요건)\n4. 평가 기준 (전문성·실적, 투입 인력 역량, 가격 경쟁력, 방법론)\n5. 제출 안내 (제출기한, 제출방식)",
    },
    "purchase_maintenance": {
        "fields": "s1:발주기관명, s2:담당부서, s3:담당자, s4:연락처, s5:이메일, s6:구매품목, s7:구매목적, s8:수량, s9:납품기한, s10:요구사양, s11:품질기준, s12:유지보수범위, s13:유지보수기간, s14:A/S조건, s15:소모품교체기준, s16:평가①가격경쟁력, s17:평가②품질신뢰도, s18:평가③유지보수역량, s19:평가④기술지원, s20:제출기한, s21:제출방식",
        "required": "s1,s2,s3,s4,s5,s6,s7,s8,s9,s10,s11,s12,s13,s14,s20,s21",
        "sections": "1. 발주기관 정보 (기관명, 담당부서, 담당자, 연락처, 이메일)\n2. 구매 개요 (구매 품목, 구매 목적, 수량, 납품기한)\n3. 제품 요구사항 (요구 사양, 품질 기준)\n4. 유지보수 요건 (유지보수 범위, 유지보수 기간, A/S 조건, 소모품 교체 기준)\n5. 평가 기준 (가격 경쟁력, 품질·신뢰도, 유지보수 역량, 기술 지원)\n6. 제출 안내 (제출기한, 제출방식)",
    },
    "rental_maintenance": {
        "fields": "s1:발주기관명, s2:담당부서, s3:담당자, s4:연락처, s5:이메일, s6:사업명, s7:계약목적, s8:렌탈형태, s9:계약기간, s10:대상규모, s11:요구사양, s12:포함서비스, s13:유지보수SLA, s14:장애대응기준, s15:소모품포함여부, s16:반납인수조건, s17:평가①총비용TCO, s18:평가②유지보수품질, s19:평가③신뢰도실적, s20:평가④ESG대응, s21:제출기한, s22:제출방식",
        "required": "s1,s2,s3,s4,s5,s6,s7,s8,s9,s10,s11,s12,s13,s14,s15,s21,s22",
        "sections": "1. 발주기관 정보 (기관명, 담당부서, 담당자, 연락처, 이메일)\n2. 렌탈 개요 (사업명, 계약 목적, 렌탈 형태, 계약기간, 대상 규모)\n3. 장비 요구사항 (요구 사양, 포함 서비스)\n4. 유지보수 요건 (유지보수 SLA, 장애 대응 기준, 소모품 포함 여부, 반납·인수 조건)\n5. 평가 기준 (총비용(TCO), 유지보수 품질, 신뢰도·실적, ESG 대응)\n6. 제출 안내 (제출기한, 제출방식)",
    },
    "purchase_lease": {
        "fields": "s1:발주기관명, s2:담당부서, s3:담당자, s4:연락처, s5:이메일, s6:대상장비, s7:도입목적, s8:계약형태, s9:수량, s10:계약기간, s11:요구사양, s12:품질기준, s13:리스조건, s14:중도해지조건, s15:잔존가치처리, s16:평가①총비용TCO, s17:평가②장비성능, s18:평가③기술지원, s19:평가④ESG대응, s20:제출기한, s21:제출방식",
        "required": "s1,s2,s3,s4,s5,s6,s7,s8,s9,s10,s11,s12,s13,s20,s21",
        "sections": "1. 발주기관 정보 (기관명, 담당부서, 담당자, 연락처, 이메일)\n2. 구매·리스 개요 (대상 장비, 도입 목적, 계약 형태, 수량, 계약기간)\n3. 장비 요구사항 (요구 사양, 품질 기준)\n4. 리스 조건 (리스 조건, 중도 해지 조건, 잔존 가치 처리)\n5. 평가 기준 (총비용(TCO), 장비 성능, 기술 지원, ESG 대응)\n6. 제출 안내 (제출기한, 제출방식)",
    },
}

PHASE_PROMPT = """사용자 메시지와 대화 이력을 분석하여 JSON만 반환하세요. 설명 없이 JSON만.

## 판단 기준
1. rfp_fields: phase가 filling일 때만 추출. 아니면 빈 객체.
   필드키: {fields}
2. is_complete: 주요 필드({required_keys}) 모두 채워졌으면 true.

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
    rfp_type: str | None = "service_contract"


# ──────────────────────────────────────────────
# 키워드 기반 Phase 감지 (Gemini 호출 없음)
# ──────────────────────────────────────────────

def detect_phase_trigger(message: str, current_phase: str) -> str | None:
    """키워드 매칭으로 phase 전환 감지"""
    msg = message.strip()
    if current_phase in ("chat", "asked"):
        # RFP 작성 동의 감지 (chat/asked 단계 모두에서)
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

    # 2. Phase 감지 (키워드 — 즉시, Gemini 호출 없음)
    trigger = detect_phase_trigger(req.message, req.phase)

    # 3. RFP 동의 시 → RAG 스킵, 안내 메시지 반환
    if trigger == "rfp_agreed":
        async def rfp_gen():
            meta = {"type": "meta", "sources": [], "rag_score": 0, "phase_trigger": trigger, "classification": None}
            yield f"data: {json.dumps(meta, ensure_ascii=False)}\n\n"
            msg = "제안요청서(RFP) 작성을 진행하겠습니다. 아래에서 RFP 유형을 선택해 주십시오."
            yield f"data: {json.dumps({'type': 'token', 'content': msg}, ensure_ascii=False)}\n\n"
            yield f"data: {json.dumps({'type': 'done'})}\n\n"
        return StreamingResponse(rfp_gen(), media_type="text/event-stream")

    # 4. 캐시 확인 → 없으면 hybrid_search + 의도파악 병렬 실행
    loop = asyncio.get_event_loop()
    cached = prefetcher.get_cached(req.message)

    # 의도파악 에이전트 먼저 실행 (FAQ 검색 필터에 필요, 대화 이력 포함)
    classification = await loop.run_in_executor(
        _executor, lambda: classify_intent(req.message, req.history)
    )

    taxonomy_major = classification["대분류"] if classification else None

    query_emb = None
    if cached:
        chunks = cached
    else:
        chunks, query_emb = await loop.run_in_executor(
            _executor, lambda: hybrid_search(req.message, category=req.category, taxonomy_major=taxonomy_major)
        )

    # 4.5. 헌법 규칙 벡터 검색 (임베딩 재사용 — 추가 API 호출 없음)
    constitution_text = ""
    try:
        if query_emb is None:
            query_emb = await loop.run_in_executor(_executor, lambda: embed_query(req.message))
        const_rules = await loop.run_in_executor(_executor, lambda: search_relevant_rules(query_emb))
        constitution_text = format_rules_for_prompt(const_rules)
    except Exception as e:
        logger.warning(f"Constitution search failed: {e}")

    # 5. 메타데이터 준비
    avg_score = sum(c.get("similarity", 0) for c in chunks) / max(len(chunks), 1)
    sources = list({c["doc_name"] for c in chunks})

    # 6. SSE 스트리밍 (asyncio.Queue로 진정한 토큰 단위 스트리밍)
    async def event_generator():
        # 메타 이벤트 (소스, 점수, 트리거, 분류)
        meta = {
            "type": "meta",
            "sources": sources,
            "rag_score": round(avg_score, 4),
            "phase_trigger": trigger,
            "classification": classification,
        }
        yield f"data: {json.dumps(meta, ensure_ascii=False)}\n\n"

        # Queue 기반 실시간 토큰 스트리밍
        filled_keys = ", ".join(req.filled_fields.keys()) if req.filled_fields else ""
        schema = RFP_SCHEMAS.get(req.rfp_type, RFP_SCHEMAS["service_contract"])
        rfp_sections = schema["sections"] if req.phase == "filling" else ""
        queue = asyncio.Queue()

        def _produce_tokens():
            try:
                for token in generate_answer_stream(
                    req.message, chunks, req.history, req.phase, filled_keys, rfp_sections,
                    constitution_text=constitution_text,
                ):
                    loop.call_soon_threadsafe(queue.put_nowait, token)
            finally:
                loop.call_soon_threadsafe(queue.put_nowait, None)  # sentinel

        _executor.submit(_produce_tokens)

        full_answer = ""
        while True:
            token = await queue.get()
            if token is None:
                break
            full_answer += token
            yield f"data: {json.dumps({'type': 'token', 'content': token}, ensure_ascii=False)}\n\n"

        # 후속질문: 턴 기반
        user_msg_count = len([m for m in (req.history or []) if m.get("role") == "user"])

        if user_msg_count == 0:
            # 첫 번째 답변: 유사 FAQ 1개 + RFP 유도 (AI 답변과 겹치는 FAQ 제외)
            used_faq_ids = [c.get("metadata", {}).get("chunk_id") or c.get("id") for c in chunks]
            _answer_text = full_answer  # 클로저 캡처

            def _gen_one_faq():
                q_emb = embed_query(req.message)
                return get_faq_suggestions(q_emb, taxonomy_major, used_faq_ids, top_k=1, current_query=req.message, answered_text=_answer_text)

            faq_items = await loop.run_in_executor(_executor, _gen_one_faq)
            suggestions = faq_items[:1] + ["제안요청서(RFP)를 작성하시겠습니까?"]
        else:
            # 두 번째 답변부터: RFP만
            suggestions = ["제안요청서(RFP)를 작성하시겠습니까?"]

        # 완료 신호 + 후속 질문
        yield f"data: {json.dumps({'type': 'suggestions', 'items': suggestions}, ensure_ascii=False)}\n\n"
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

    schema = RFP_SCHEMAS.get(req.rfp_type, RFP_SCHEMAS["service_contract"])
    prompt = PHASE_PROMPT.format(
        fields=schema["fields"],
        required_keys=schema["required"],
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


def _search_and_answer(req: ChatRequest, taxonomy_major: str | None = None) -> tuple:
    """RAG 검색 + 답변 생성 (헌법 규칙 동적 주입, 임베딩 재사용)"""
    chunks, query_emb = hybrid_search(req.message, category=req.category, taxonomy_major=taxonomy_major)
    filled_keys = ", ".join(req.filled_fields.keys()) if req.filled_fields else ""
    schema = RFP_SCHEMAS.get(req.rfp_type, RFP_SCHEMAS["service_contract"])
    rfp_sections = schema["sections"] if req.phase == "filling" else ""

    # 헌법 규칙 벡터 검색 (임베딩 재사용)
    constitution_text = ""
    try:
        const_rules = search_relevant_rules(query_emb)
        constitution_text = format_rules_for_prompt(const_rules)
    except Exception as e:
        logger.warning(f"Constitution search failed in sync: {e}")

    answer, score = generate_answer(
        req.message, chunks, req.history, req.phase, filled_keys, rfp_sections,
        constitution_text=constitution_text,
    )
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

    # 2. 의도파악 먼저 → Phase 분석 + RAG 답변 병렬
    loop = asyncio.get_event_loop()
    classification = await loop.run_in_executor(
        _executor, lambda: classify_intent(req.message, req.history)
    )
    taxonomy_major = classification["대분류"] if classification else None

    phase_future = loop.run_in_executor(_executor, _extract_phase, req)
    answer_future = loop.run_in_executor(
        _executor, lambda: _search_and_answer(req, taxonomy_major)
    )

    phase_data, (answer, score, chunks) = await asyncio.gather(
        phase_future, answer_future
    )

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
        "classification": classification,
    }

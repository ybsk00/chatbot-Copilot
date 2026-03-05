import json
import re
from fastapi import APIRouter
from pydantic import BaseModel
from google import genai
from app.config import GOOGLE_API_KEY, MODELS
from app.rag.retriever import hybrid_search
from app.rag.generator import generate_answer
from app.constitution.gate import check_constitution

router = APIRouter(prefix="/chat", tags=["chat"])

_client = None
def _get_client():
    global _client
    if _client is None:
        _client = genai.Client(api_key=GOOGLE_API_KEY)
    return _client

RFP_FIELDS_SCHEMA = """s1:발주기관명, s2:담당부서, s3:담당자, s4:연락처, s5:이메일,
s6:사업명, s7:사업목적, s8:계약형태, s9:수행기간, s10:대상인원,
s11:서비스범위, s12:교육방식, s13:기술요건, s14:납기기준, s15:SLA기준,
s16:평가①가격경쟁력, s17:평가②콘텐츠강사, s18:평가③ESG대응, s19:평가④신뢰도, s20:평가⑤디지털역량,
s21:제출기한, s22:제출방식"""

PHASE_PROMPT = """당신은 간접구매 AI 코파일럿입니다.
사용자 메시지와 대화 이력을 분석하여 아래 JSON을 반환하세요.

## 판단 기준
1. phase_trigger: 사용자가 구매/발주/조달 의도를 표현하면 "purchase". 이미 구매 모드이면 null.
2. classification: 구매 의도 감지 시 서비스 분류 (대분류, 중분류, 소분류). 없으면 null.
3. rfp_fields: 대화에서 추출 가능한 RFP 필드값. 추출 불가시 빈 객체.
   필드키: {fields}
4. is_complete: 모든 주요 필드(s1~s15, s21, s22)가 채워졌으면 true.

## 현재 상태
- phase: {phase}
- 이미 채워진 필드: {filled_keys}

## 대화 이력
{history}

## 현재 메시지
{message}

## 출력 (JSON만, 설명 없이)
{{"phase_trigger": null|"purchase"|"complete", "classification": null|{{"대분류":"","중분류":"","소분류":""}}, "rfp_fields": {{}}, "is_complete": false}}"""


class ChatRequest(BaseModel):
    session_id: str
    message: str
    category: str | None = None
    history: list[dict] = []
    phase: str = "chat"
    filled_fields: dict = {}


def extract_phase_and_fields(req: ChatRequest) -> dict:
    """Gemini로 phase_trigger, classification, rfp_fields 추출"""
    history_text = ""
    for msg in (req.history or [])[-8:]:
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
            model=MODELS["generation"],
            contents=prompt,
        )
        text = response.text.strip()
        # Remove markdown code fence if present
        if text.startswith("```"):
            text = re.sub(r"```json?\s*", "", text)
            text = re.sub(r"```\s*$", "", text)
        return json.loads(text)
    except Exception:
        return {"phase_trigger": None, "classification": None, "rfp_fields": {}, "is_complete": False}


@router.post("")
async def chat(req: ChatRequest):
    # 1. 헌법 검사
    violation = check_constitution(req.message)
    if violation:
        return {
            "answer": violation, "sources": [], "rag_score": 0,
            "phase_trigger": None, "rfp_fields": {}, "classification": None,
        }

    # 2. Phase/RFP 분석 + RAG 검색 (병렬 가능하지만 순차로 충분)
    phase_data = extract_phase_and_fields(req)

    # 3. 하이브리드 검색
    chunks = hybrid_search(req.message, category=req.category)

    # 4. 답변 생성
    answer, score = generate_answer(req.message, chunks, req.history)

    # 5. 완성 여부 판단
    trigger = phase_data.get("phase_trigger")
    if phase_data.get("is_complete") and req.phase == "filling":
        trigger = "complete"

    return {
        "answer": answer,
        "sources": [c["doc_name"] for c in chunks],
        "rag_score": score,
        "phase_trigger": trigger,
        "rfp_fields": phase_data.get("rfp_fields", {}),
        "classification": phase_data.get("classification"),
    }

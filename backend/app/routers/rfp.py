from fastapi import APIRouter
from pydantic import BaseModel
from google import genai
from app.config import GOOGLE_API_KEY, MODELS
from app.rag.retriever import hybrid_search

router = APIRouter(prefix="/rfp", tags=["rfp"])

_client = None


def _get_client():
    global _client
    if _client is None:
        _client = genai.Client(api_key=GOOGLE_API_KEY)
    return _client

RFP_PROMPT = """당신은 간접구매 RFP(제안요청서) 작성 전문가입니다.
아래 참조 문서와 사용자 요구사항을 기반으로 RFP를 생성하세요.

## RFP 필수 항목
1. 프로젝트 개요
2. 서비스 개요 (범위, 계약 형태, 방식)
3. 대상 품목 및 기술 요건
4. 요청 범위 (Scope of Work)
5. 평가 기준 (배점 포함)
6. 제출 방식 및 기한
7. 견적서 양식

## 참조 문서
{context}

## 사용자 요구사항
카테고리: {category}
추가 요구: {requirements}

위 항목을 모두 포함한 RFP를 작성하세요. 근거 문서에 없는 내용을 임의로 추가하지 마세요.
"""


class RfpRequest(BaseModel):
    category: str
    requirements: str = ""
    session_id: str = ""


@router.post("/generate")
async def generate_rfp(req: RfpRequest):
    # RFP 관련 문서 검색
    chunks, _ = hybrid_search(f"{req.category} RFP 제안요청서", category=None, top_k=8)

    context = "\n\n---\n\n".join(
        f"[{c['doc_name']}]\n{c['content']}" for c in chunks
    )

    prompt = RFP_PROMPT.format(
        context=context or "(참조 문서 없음)",
        category=req.category,
        requirements=req.requirements or "(없음)",
    )

    response = _get_client().models.generate_content(
        model=MODELS["generation"],
        contents=prompt,
    )

    return {
        "rfp_content": response.text.strip(),
        "sources": [c["doc_name"] for c in chunks],
        "category": req.category,
    }

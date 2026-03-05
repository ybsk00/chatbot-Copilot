from google import genai
from app.config import GOOGLE_API_KEY, MODELS

_client = None


def _get_client():
    global _client
    if _client is None:
        _client = genai.Client(api_key=GOOGLE_API_KEY)
    return _client

SYSTEM_PROMPT = """당신은 간접구매 AI 코파일럿 'IP Assist'입니다.
아래 규칙을 반드시 따르세요:

1. 제공된 RAG 문서에 근거해서만 답변하세요.
2. 근거가 없으면 "해당 정보는 현재 지식베이스에 없습니다"라고 답하세요.
3. 답변 끝에 반드시 [출처: 문서명]을 표기하세요.
4. 공급업체를 임의로 추천하지 마세요.
5. 법적 판단이 필요한 질문에는 전문가 상담을 권고하세요.
"""

RAG_PROMPT = """아래 참조 문서를 기반으로 사용자 질문에 답변하세요.

## 참조 문서
{context}

## 대화 이력
{history}

## 사용자 질문
{question}
"""


def generate_answer(
    question: str,
    chunks: list[dict],
    history: list[dict] | None = None,
) -> tuple[str, float]:
    """RAG 기반 답변 생성"""
    context = "\n\n---\n\n".join(
        f"[{c['doc_name']}]\n{c['content']}" for c in chunks
    )

    history_text = ""
    if history:
        for msg in history[-6:]:
            role = "사용자" if msg.get("role") == "user" else "AI"
            history_text += f"{role}: {msg.get('content', '')}\n"

    prompt = RAG_PROMPT.format(
        context=context or "(참조 문서 없음)",
        history=history_text or "(이전 대화 없음)",
        question=question,
    )

    response = _get_client().models.generate_content(
        model=MODELS["generation"],
        contents=prompt,
        config={"system_instruction": SYSTEM_PROMPT},
    )

    avg_score = sum(c.get("similarity", 0) for c in chunks) / max(len(chunks), 1)

    return response.text.strip(), round(avg_score, 4)

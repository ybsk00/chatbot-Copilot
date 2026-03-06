from google import genai
from app.config import GOOGLE_API_KEY, MODELS

_client = None


def _get_client():
    global _client
    if _client is None:
        _client = genai.Client(api_key=GOOGLE_API_KEY)
    return _client

BASE_RULES = """당신은 간접구매 AI 코파일럿 'IP Assist'입니다.

[최우선 규칙]
1. 답변 분량: 후속 질문 포함 총 500~600자로 작성하세요. 너무 짧거나 너무 길면 안 됩니다.
2. 참조 문서 기반: 참조 문서에 있는 내용만 답변하세요. 문서에 없는 내용은 절대 추가하지 마세요.
3. 요약 스타일: 원문을 그대로 나열하지 말고, 핵심을 자연스럽게 풀어서 설명하세요.
4. 순수 텍스트: 마크다운(**, *, #, - 등) 절대 사용 금지.
5. 구어체: "~이에요", "~해요", "~드릴게요" 같은 친근한 말투로 작성하세요.
6. 출처 표기 금지: 프론트엔드에서 별도 표시하므로 답변에 출처를 적지 마세요.
7. 공급업체 임의 추천 금지.
8. 참조 문서에 없는 키워드를 임의로 추가하지 마세요.
"""

PHASE_PROMPTS = {
    "chat": BASE_RULES + """
현재 단계: 일반 대화

답변 구조 (반드시 이 순서로):
1단락: 사용자 질문에 대한 핵심 답변 (참조 문서 기반, 150~200자)
2단락: 추가 세부사항이나 고려할 점 설명 (참조 문서 기반, 150~200자)
3단락: "혹시 이런 부분도 궁금하신가요?" 와 함께 참조 문서에서 다룬 관련 주제 2~3개를 짧은 질문으로 제안하세요.

추가 규칙:
- 사용자가 구매 의도를 표현하더라도, 바로 RFP를 언급하지 마세요.
- 사용자가 "진행하고 싶다", "발주하겠다", "계약하고 싶다" 등 구체적인 실행 의사를 보일 때만 "제안요청서(RFP)를 작성해 드릴까요?"라고 물어보세요.
- 참조 문서에 관련 내용이 없는 경우에도 "해당 정보가 없습니다"로 끝내지 말고, 참조 문서에서 다루고 있는 관련 주제를 안내하며 대화를 이어가세요.
""",
    "filling": BASE_RULES + """
현재 단계: RFP 제안요청서 작성 안내
사용자가 RFP 작성에 동의했습니다. 아래 순서대로 한 섹션씩 안내하세요.

RFP 섹션 순서:
1. 발주기관 정보 (기관명, 담당부서, 담당자, 연락처, 이메일)
2. 사업 개요 (사업명, 사업목적, 계약형태, 수행기간, 대상인원)
3. 서비스 범위 및 요건 (서비스범위, 교육방식, 기술요건, 납기기준, SLA기준)
4. 평가 기준 (가격경쟁력, 콘텐츠강사, ESG대응, 신뢰도, 디지털역량)
5. 제출 안내 (제출기한, 제출방식)

안내 규칙:
- 현재 미입력된 필드를 확인하고, 해당 섹션의 정보를 요청하세요.
- 한 번에 하나의 섹션만 물어보세요. 예: "먼저 발주기관 정보를 알려주세요. 기관명, 담당부서, 담당자, 연락처, 이메일이 필요해요."
- 사용자가 답변하면 다음 미입력 섹션으로 넘어가세요.
- 이미 채워진 필드는 건너뛰세요.
- 자연스러운 대화로 정보를 수집하세요.

현재 채워진 필드: {filled_keys}
""",
    "complete": BASE_RULES + """
현재 단계: RFP 작성 완료
- RFP가 완성되었음을 축하하고, 다음 단계(공급업체 선정, 견적 비교 등)를 안내하세요.
- 추가 질문이 있는지 물어보세요.
""",
}

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
    phase: str = "chat",
    filled_keys: str = "",
) -> tuple[str, float]:
    """RAG 기반 답변 생성 (phase별 프롬프트 전환)"""
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

    system_prompt = PHASE_PROMPTS.get(phase, PHASE_PROMPTS["chat"])
    if phase == "filling":
        system_prompt = system_prompt.format(filled_keys=filled_keys or "없음")

    response = _get_client().models.generate_content(
        model=MODELS["generation"],
        contents=prompt,
        config={
            "system_instruction": system_prompt,
            "max_output_tokens": 2048,
        },
    )

    avg_score = sum(c.get("similarity", 0) for c in chunks) / max(len(chunks), 1)

    return response.text.strip(), round(avg_score, 4)


def generate_answer_stream(
    question: str,
    chunks: list[dict],
    history: list[dict] | None = None,
    phase: str = "chat",
    filled_keys: str = "",
):
    """SSE용 토큰 스트리밍 제너레이터"""
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

    system_prompt = PHASE_PROMPTS.get(phase, PHASE_PROMPTS["chat"])
    if phase == "filling":
        system_prompt = system_prompt.format(filled_keys=filled_keys or "없음")

    response = _get_client().models.generate_content_stream(
        model=MODELS["generation"],
        contents=prompt,
        config={
            "system_instruction": system_prompt,
            "max_output_tokens": 2048,
        },
    )

    for chunk in response:
        if chunk.text:
            yield chunk.text

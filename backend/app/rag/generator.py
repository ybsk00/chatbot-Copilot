from google import genai
from google.genai import types
from app.config import GOOGLE_API_KEY, MODELS

_client = None


def _get_client():
    global _client
    if _client is None:
        _client = genai.Client(api_key=GOOGLE_API_KEY)
    return _client

BASE_RULES = """당신은 간접구매 AI 코파일럿 'IP Assist'입니다.

[최우선 규칙]
1. 답변 분량: 500~600자로 작성하세요. 너무 짧거나 너무 길면 안 됩니다.
2. 참조 문서 기반: 참조 문서에 있는 내용만 답변하세요. 문서에 없는 내용은 절대 추가하지 마세요.
3. 환각 금지: 참조 문서에 구체적 설명이 없는 주제는 "해당 내용은 현재 자료에 포함되어 있지 않습니다"라고 솔직하게 답하세요. 절대로 일반 상식이나 추측으로 답변을 만들어내지 마세요.
4. 요약 스타일: 원문을 그대로 나열하지 말고, 핵심을 자연스럽게 풀어서 설명하세요.
5. 순수 텍스트: 마크다운(**, *, #, - 등) 절대 사용 금지.
6. 정중한 구어체 통일: 반드시 "~합니다", "~됩니다", "~있습니다", "~드리겠습니다" 체로 통일하세요. "~이에요", "~해요", "~있어요", "~드릴게요", "~께요" 같은 비격식체는 절대 사용 금지.
7. 출처 표기 금지: 프론트엔드에서 별도 표시하므로 답변에 출처를 적지 마세요.
8. 공급업체 임의 추천 금지.
9. 참조 문서에 없는 키워드를 임의로 추가하지 마세요.
"""

PHASE_PROMPTS = {
    "chat": BASE_RULES + """
현재 단계: 일반 대화

답변 구조:
- 사용자 질문에 대한 핵심 답변을 참조 문서 기반으로 충실하게 작성하세요.
- 후속 질문은 답변에 포함하지 마세요. (별도 시스템에서 처리합니다)
- 대화 이력에서 사용자 메시지가 3개 이상이면 답변 마지막에 반드시 "더 궁금하신 점이 있으시면 말씀해 주십시오. 혹시 제안요청서(RFP)를 작성하시겠습니까?"라고 물어보세요.
- 대화 이력에서 사용자 메시지가 3개 미만이면 답변 마지막에 "더 궁금하신 점이 있으시면 말씀해 주십시오."라고만 적어주세요.

추가 규칙:
- 참조 문서에 관련 내용이 없는 경우에도 "해당 정보가 없습니다"로 끝내지 말고, 참조 문서에서 다루고 있는 관련 주제를 안내하며 대화를 이어가세요.
- 이전에 답변한 내용을 다시 반복하지 마세요. 새로운 정보만 제공하세요.
""",
    "filling": BASE_RULES + """
현재 단계: RFP 제안요청서 작성 안내
사용자가 RFP 작성에 동의했습니다. 아래 순서대로 한 섹션씩 안내하세요.

RFP 섹션 순서:
{rfp_sections}

안내 규칙:
- 현재 미입력된 필드를 확인하고, 해당 섹션의 정보를 요청하세요.
- 한 번에 하나의 섹션만 물어보세요. 예: "먼저 발주기관 정보를 알려주십시오. 기관명, 담당부서, 담당자, 연락처, 이메일이 필요합니다."
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
    rfp_sections: str = "",
    constitution_text: str = "",
) -> tuple[str, float]:
    """RAG 기반 답변 생성 (phase별 프롬프트 전환, 헌법 규칙 동적 주입)"""
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
        system_prompt = system_prompt.format(filled_keys=filled_keys or "없음", rfp_sections=rfp_sections)

    # 헌법 규칙 동적 주입
    if constitution_text:
        system_prompt = system_prompt + "\n" + constitution_text

    response = _get_client().models.generate_content(
        model=MODELS["generation"],
        contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction=system_prompt,
            max_output_tokens=800,
            thinking_config=types.ThinkingConfig(thinking_budget=0),
        ),
    )

    avg_score = sum(c.get("similarity", 0) for c in chunks) / max(len(chunks), 1)

    return response.text.strip(), round(avg_score, 4)


def generate_answer_stream(
    question: str,
    chunks: list[dict],
    history: list[dict] | None = None,
    phase: str = "chat",
    filled_keys: str = "",
    rfp_sections: str = "",
    constitution_text: str = "",
):
    """SSE용 토큰 스트리밍 제너레이터 (헌법 규칙 동적 주입)"""
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
        system_prompt = system_prompt.format(filled_keys=filled_keys or "없음", rfp_sections=rfp_sections)

    # 헌법 규칙 동적 주입
    if constitution_text:
        system_prompt = system_prompt + "\n" + constitution_text

    response = _get_client().models.generate_content_stream(
        model=MODELS["generation"],
        contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction=system_prompt,
            max_output_tokens=800,
            thinking_config=types.ThinkingConfig(thinking_budget=0),
        ),
    )

    for chunk in response:
        if chunk.text:
            yield chunk.text


SUGGESTION_PROMPT = """당신의 역할: 아래 참조 문서에서 AI 답변이 다루지 않은 내용을 찾아 후속 안내 문장을 만드세요.

[절대 규칙]
1. 참조 문서에 실제로 구체적 설명이 있는 주제만 사용하세요.
2. 문서에 단어만 언급되고 설명이 없는 주제는 절대 사용하지 마세요.
3. 반드시 "~에 대해서 알려드릴까요?" 형태로 작성하세요.
4. 쉼표로 구분해서 3개만 반환. 설명 없이.

[판단 기준]
- 좋은 예: 문서에 "운용리스는 리스료를 비용 처리하여 자산 부채에 영향을 주지 않는다"라는 설명이 있음 → "운용리스의 회계 처리 방식에 대해서 알려드릴까요?"
- 나쁜 예: 문서에 "승계"라는 단어만 있고 구체적 설명 없음 → "승계 기준에 대해서 알려드릴까요?" (금지)

참조 문서:
{context}

사용자 질문: {question}
AI 답변 요약: {answer_summary}

후속 안내 3개:"""


def generate_suggestions(question: str, chunks: list[dict], answer_summary: str) -> list[str]:
    """flash-lite로 검색된 청크 기반 후속 질문 생성 (경량, 빠름)"""
    if not chunks:
        return []

    # 청크 내용을 충분히 제공 (500자씩, 최대 5개)
    context = "\n\n---\n\n".join(c["content"][:500] for c in chunks[:5])

    prompt = SUGGESTION_PROMPT.format(
        context=context,
        question=question,
        answer_summary=answer_summary[:300],
    )

    try:
        response = _get_client().models.generate_content(
            model=MODELS["refinement"],
            contents=prompt,
            config={"max_output_tokens": 150},
        )
        text = response.text.strip()

        # 번호 리스트 형식(1. 2. 3.) 또는 줄바꿈 형식 처리
        import re
        lines = re.split(r'\n+', text)
        if len(lines) >= 2:
            suggestions = []
            for line in lines:
                line = re.sub(r'^\d+[\.\)]\s*', '', line).strip()
                if line:
                    suggestions.append(line)
        else:
            # 쉼표 구분
            suggestions = [s.strip() for s in text.split(",") if s.strip()]

        return suggestions[:3]
    except Exception:
        return []

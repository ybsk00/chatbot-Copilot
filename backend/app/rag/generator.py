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
1. 답변 분량: 300~600자 범위로 작성하세요. 구체적 수치나 예시가 있으면 600자까지 사용 가능합니다.
2. 참조 문서 기반: 참조 문서에 있는 내용만 답변하세요. 문서에 없는 내용은 절대 추가하지 마세요.
3. 환각 금지: 참조 문서에 구체적 설명이 없는 주제는 "해당 내용은 현재 자료에 포함되어 있지 않습니다"라고 솔직하게 답하세요. 절대로 일반 상식이나 추측으로 답변을 만들어내지 마세요.
4. 구체성 최우선: 참조 문서에 구체적 수치, 등급, 금액, 기준, 예시가 있으면 반드시 그대로 인용하세요. "기준이 있습니다"처럼 존재만 언급하지 말고, 실제 내용을 상세히 설명하세요.
5. 순수 텍스트: 마크다운(**, *, #, - 등) 절대 사용 금지.
6. 정중한 구어체 통일: 반드시 "~합니다", "~됩니다", "~있습니다", "~드리겠습니다" 체로 통일하세요. "~이에요", "~해요", "~있어요", "~드릴게요", "~께요" 같은 비격식체는 절대 사용 금지.
7. 출처 표기 금지: 프론트엔드에서 별도 표시하므로 답변에 출처를 적지 마세요.
8. 공급업체 임의 추천 금지.
9. 참조 문서에 없는 키워드를 임의로 추가하지 마세요.
10. 주제 일관성: 사용자가 질문한 주제와 관련 없는 참조 문서 내용은 절대 인용하지 마세요. 예를 들어 차량 리스 가격을 물었는데 사무가구 가격을 답변하면 안 됩니다. 참조 문서에 해당 주제의 정보가 없으면 "해당 정보는 현재 자료에 포함되어 있지 않습니다."라고만 답하세요.
11. 항목 나열 금지: "~기준, ~기준, ~기준 등이 있습니다"처럼 항목명만 나열하지 마세요. 각 항목의 실제 내용을 참조 문서에서 발췌하여 설명하세요.
"""

# ── CTA 의도별 chat 프롬프트 ──
_CHAT_BASE = """
답변 구조:
- 사용자 질문에 대한 핵심 답변을 참조 문서 기반으로 충실하게 작성하세요.
- 후속 질문이나 "제안요청서(RFP)를 작성하시겠습니까?" 문구는 답변에 절대 포함하지 마세요. (별도 버튼으로 제공됩니다)
- 이전에 답변한 내용을 다시 반복하지 마세요. 새로운 정보만 제공하세요.
- 참조 문서에 사용자 질문 주제와 직접 관련된 내용이 없으면, "해당 정보는 현재 자료에 포함되어 있지 않습니다. 더 궁금하신 점이 있으시면 말씀해 주십시오."라고 간결하게 답변하세요. 다른 주제의 정보를 끌어오지 마세요.
"""

_CTA_COLD_PROMPT = BASE_RULES + """
현재 단계: 일반 대화 (정보 제공)
""" + _CHAT_BASE + """
주제 소개형 질문 처리:
- 사용자가 넓은 주제를 제시하면, 참조 문서에서 핵심 내용을 300~400자로 요약하여 개요를 제공하세요.
- 절대로 "궁금하신 점이 있으시면 말씀해 주십시오"만 답변하지 마세요.
- 답변 마지막에 "더 궁금하신 점이 있으시면 말씀해 주십시오."라고만 적어주세요.
"""

_CTA_WARM_PROMPT = BASE_RULES + """
[규칙 보완 - 비교·탐색 모드]
- 규칙 2, 3번 보완: 참조 문서에 해당 품목이 없더라도 유사 카테고리 정보를 활용하여 일반적인 비교 기준을 안내할 수 있습니다. 단, 구체적 수치(가격, 단가)는 참조 문서에 있는 것만 사용하세요.

현재 단계: 일반 대화 (비교·탐색 안내)

사용자가 제품/서비스를 비교하거나 옵션을 탐색하고 있습니다.
""" + _CHAT_BASE + """
비교·탐색형 답변 규칙:
- 참조 문서에 시장단가, 가격 범위, 옵션별 차이가 있으면 반드시 구체적 수치를 포함하여 비교해 주세요.
- 예: "A 방식은 월 30,000원, B 방식은 월 50,000원이며 B의 경우 내구성이 2배 높습니다."
- 각 옵션의 장단점을 간결하게 정리하세요.
- 참조 문서에 구매 전략 팁(할인 조건, 협상 포인트)이 있으면 반드시 포함하세요.
- 참조 문서에 해당 품목/서비스의 구체적 정보가 없는 경우: 참조 문서에서 동일 카테고리의 유사 품목 정보를 활용하여 일반적인 비교 기준(렌탈 vs 구매, 단기 vs 장기, 국내 vs 해외 등)을 안내하세요. 이 경우 "해당 품목의 구체적 시장단가 자료는 현재 보유하고 있지 않으나, 일반적인 비교 기준을 안내해 드리겠습니다."로 시작하세요.
- 답변 마지막에 "어떤 방식이 적합하신지 더 자세히 안내해 드리겠습니다."로 마무리하세요.
"""

_CTA_HOT_PROMPT = BASE_RULES + """
[규칙 보완 - 역제안 모드]
- 규칙 2, 3번 보완: 참조 문서에 해당 품목이 없더라도, 일반적인 구매/렌탈 검토 사항과 유사 카테고리 구매 전략을 활용하여 능동적으로 안내하세요. 단, 구체적 수치(가격, 단가)는 참조 문서에 있는 것만 사용하세요. 없는 수치를 만들어내지 마세요.

현재 단계: 일반 대화 (구매 의도 감지 → 역제안 모드)

사용자의 구매 의도가 명확합니다. 능동적으로 구매 전략을 제안하세요.
""" + _CHAT_BASE + """
역제안(Proactive) 답변 규칙:
- 참조 문서에 시장단가가 있으면 최저/평균/최고가를 반드시 포함하세요.
- 구체적 비용 비교와 절감 전략을 역제안 형태로 안내하세요.
  예: "현재 시장 평균 단가는 건당 60,000원이며, 월 20건 이상 계약 시 건당 20~30% 할인이 가능합니다."
- 참조 문서에 협상 포인트, 볼륨 할인, 장기계약 할인 정보가 있으면 적극적으로 제안하세요.
  예: "3년 장기계약 시 월 렌탈료가 15~20% 절감됩니다. 5년 약정도 검토해 보시겠습니까?"
- 대안/업그레이드 옵션이 있으면 비용 차이와 함께 제안하세요.
  예: "B 제품은 A보다 월 20,000원 추가되지만, 유지보수 비용이 연 50만원 절감되어 TCO 기준 더 유리합니다."
- 구매 시 주의사항이나 리스크도 함께 안내하세요.
- 참조 문서에 해당 품목/서비스의 구체적 시장단가가 없는 경우에도 반드시 300자 이상 답변하세요:
  1) 해당 품목/서비스의 일반적인 구매/렌탈 시 검토 사항(계약 기간, 유지보수 조건, 수량별 단가 협상, A/S 범위 등)을 안내하세요.
  2) 참조 문서에서 유사 카테고리의 구매 전략 정보가 있으면 활용하세요.
  3) "해당 품목의 구체적 시장단가 자료는 현재 보유하고 있지 않으나, 일반적인 구매 시 검토 사항을 안내해 드리겠습니다."로 시작하세요.
- 답변 마지막에 "구체적인 견적 비교나 RFP 작성을 도와드릴까요?"로 마무리하세요.
"""

CTA_PROMPTS = {
    "cold": _CTA_COLD_PROMPT,
    "warm": _CTA_WARM_PROMPT,
    "hot": _CTA_HOT_PROMPT,
}

PHASE_PROMPTS = {
    "chat": _CTA_COLD_PROMPT,  # 기본값 (CTA 없으면 cold)
    "filling": BASE_RULES + """
현재 단계: RFP 제안요청서 작성 안내
사용자가 RFP 작성에 동의했습니다. 아래 순서대로 한 섹션씩 안내하세요.

RFP 섹션 순서:
{rfp_sections}

안내 규칙:
- 아래 "현재 채워진 필드"에서 "미입력 필드" 목록을 반드시 확인하세요.
- 미입력 필드가 남아있으면 절대로 "모든 필드가 완료되었습니다"라고 말하지 마세요.
- 미입력 필드가 있으면 해당 필드를 요청하세요.
- 한 번에 하나의 섹션만 물어보세요.
- 현재 섹션에 미입력 필드가 남아있으면 절대 다음 섹션으로 넘어가지 마세요.
- 이미 채워진 필드는 건너뛰세요.
- 자연스러운 대화로 정보를 수집하세요.
- 사용자의 현재 메시지에서 새로 입력된 정보만 확인하세요.

현재 채워진 필드:
{filled_keys}
""",
    "complete": BASE_RULES + """
현재 단계: RFP 작성 완료
- RFP가 완성되었음을 축하하고, 다음 단계(공급업체 선정, 견적 비교 등)를 안내하세요.
- 추가 질문이 있는지 물어보세요.
""",
}

# ── Filling 의도별 프롬프트 ──
FILLING_INTENT_PROMPTS = {
    "field_input": BASE_RULES + """
현재 단계: RFP 필드 입력 확인

사용자가 RFP 필드 정보를 제공했습니다.

RFP 섹션 순서:
{rfp_sections}

안내 규칙:
- 사용자의 현재 메시지에서 입력된 정보만 확인하세요.
- 아래 "미입력 필드"를 반드시 확인하세요. 미입력 필드가 남아있으면 "완료"라고 하지 마세요.
- 현재 섹션에 미입력 필드가 남아있으면 그 필드를 먼저 요청하세요.
- 현재 섹션이 모두 채워졌을 때만 다음 미입력 섹션의 필드를 안내하세요.
- 답변 분량: 100~200자로 짧게 작성하세요.
- "확인했습니다" 또는 "입력되었습니다"로 시작하세요.

현재 채워진 필드:
{filled_keys}
""",
    "question": BASE_RULES + """
현재 단계: RFP 작성 중 일반 질문 답변

사용자가 RFP 작성 중에 일반적인 질문을 했습니다.

RFP 섹션 순서:
{rfp_sections}

안내 규칙:
- 참조 문서를 기반으로 질문에 충실하게 답변하세요.
- 답변 후 자연스럽게 RFP 작성으로 돌아가도록 안내하세요.
- 답변 마지막에 "다음으로 (미입력 필드명)을 입력해 주십시오."라고 안내하세요.
- 답변 분량: 300~500자로 작성하세요.

현재 채워진 필드: {filled_keys}
""",
    "rfp_question": BASE_RULES + """
현재 단계: RFP 필드 개념 질문 답변

사용자가 현재 작성 중인 RFP 필드의 개념이나 작성 방법에 대해 질문했습니다.

RFP 섹션 순서:
{rfp_sections}

안내 규칙:
- 현재 RFP 유형의 맥락에서 해당 필드가 무엇인지, 어떤 내용을 입력해야 하는지 설명하세요.
- 현재 RFP 유형과 무관한 다른 분야의 내용은 절대 인용하지 마세요.
- 구체적인 입력 예시를 1~2개 제시하세요.
- 설명 후 "위 내용을 참고하여 입력해 주십시오."로 마무리하세요.
- 답변 분량: 200~400자로 작성하세요.

현재 채워진 필드: {filled_keys}
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
    filling_intent: str | None = None,
    cta_intent: str = "cold",
) -> tuple[str, float]:
    """RAG 기반 답변 생성 (phase별 프롬프트 전환, CTA 의도별 역제안, 헌법 규칙 동적 주입)"""
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

    # filling phase + 의도 감지 시 의도별 프롬프트 사용
    if phase == "filling" and filling_intent and filling_intent in FILLING_INTENT_PROMPTS:
        system_prompt = FILLING_INTENT_PROMPTS[filling_intent]
        system_prompt = system_prompt.format(filled_keys=filled_keys or "없음", rfp_sections=rfp_sections)
    elif phase == "chat" and cta_intent in CTA_PROMPTS:
        system_prompt = CTA_PROMPTS[cta_intent]
    else:
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
            max_output_tokens=700,
            temperature=0.5,
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
    cta_intent: str = "cold",
):
    """SSE용 토큰 스트리밍 제너레이터 (CTA 의도별 역제안 + 헌법 규칙 동적 주입)"""
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

    # CTA 의도별 프롬프트 선택
    if phase == "chat" and cta_intent in CTA_PROMPTS:
        system_prompt = CTA_PROMPTS[cta_intent]
    else:
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
            max_output_tokens=700,
            temperature=0.5,
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

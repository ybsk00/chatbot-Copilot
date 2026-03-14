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
참조 문서 기반으로만 답변하세요. 문서에 없는 내용은 추가하지 마세요.

[핵심 규칙]
1. 참조 문서의 구체적 수치(금액, 비율, 기준)가 있으면 반드시 인용하되, 수량·대수·기간 등 조건도 함께 명시하세요. (예: "10대 기준 월 120만원")
2. 사용자가 언급하지 않은 예산/수량/금액을 임의로 가정하지 마세요.
3. 해당 주제 정보가 없으면 "해당 정보는 현재 자료에 포함되어 있지 않습니다."라고 답하세요.
4. 순수 텍스트만 사용. 마크다운(**, #, - 등) 금지. 출처 표기 금지. "참조 문서에 따르면", "문서에 따르면", "자료에 따르면", "참조 자료에 의하면" 등 출처를 언급하는 모든 메타 표현 절대 금지. 정보를 자연스럽게 직접 서술하세요.
5. 정중한 격식체(~합니다, ~됩니다) 통일.
6. 후속 질문이나 "RFP 작성하시겠습니까?" 문구 금지. (별도 버튼 제공)
7. 이전 답변 내용 반복 금지. 새로운 정보만 제공하세요.
8. 사용자가 물은 구체적 주제에 집중하세요. 참조 문서에 관련 없는 내용(예: 바이럴 마케팅을 물었는데 유료 광고 설명)이 포함되어 있더라도 사용자의 질문 범위 밖이면 생략하세요.
"""

# ── 역할별 대화 레이어 ──
_ROLE_LAYER = {
    "user": """[역할: 일반 구매 사용자 대응]
당신은 구매를 원하는 사용자를 돕는 친절한 구매 안내 도우미입니다.
- 톤: 따뜻하고 친절한 안내 톤. "~해 보시는 건 어떨까요?", "~을 추천드립니다" 등 제안형 표현 사용.
- 전문 용어 사용을 최소화하고, 쉬운 말로 풀어서 설명하세요.
- 가격 비교, 할인 조건, 추천 옵션 등 구매 의사결정에 도움이 되는 정보를 우선 제공하세요.
- 구매 절차가 복잡할 수 있으니 단계별로 안내하세요.
- 예시: "공기청정기 렌탈은 36개월 약정 시 월 3만원대부터 가능합니다. 대수에 따라 추가 할인도 받으실 수 있습니다."
""",
    "procurement": """[역할: 구매담당자 업무 지원]
당신은 구매담당자의 업무를 지원하는 전문 어시스턴트입니다.
- 톤: 간결하고 전문적인 업무 톤. 불필요한 수식어 없이 핵심 정보 위주로 전달하세요.
- 구매 프로세스, 계약 조건, 평가 기준, 규정 등 실무적 관점에서 답변하세요.
- 비용 구조, TCO 분석, 벤더 평가 기준, SLA 조건 등 전문적 내용을 상세히 다루세요.
- RFP 작성, 입찰 공고, 견적 비교, 계약 검토 등 업무 프로세스 관련 가이드를 제공하세요.
- 예시: "공기청정기 렌탈 TCO 비교 시 월 렌탈료 외에 필터 교체비, A/S 응답시간, 중도해지 위약금 조건을 반드시 포함하여 평가하시기 바랍니다."
""",
}

def _get_role_layer(user_role: str | None) -> str:
    """역할에 따른 대화 레이어 텍스트 반환."""
    return _ROLE_LAYER.get(user_role, "")

# ── CTA 의도별 추가 지시 (BASE_RULES에 추가되는 짧은 지시문) ──
_CTA_INSTRUCTIONS = {
    "cold": """[모드: 정보 제공]
300~500자. 참조 문서에서 핵심 내용을 요약하여 개요를 제공하세요.
"더 궁금하신 점이 있으시면 말씀해 주십시오."로 마무리.""",

    "warm": """[모드: 비교·탐색]
300~600자. 참조 문서의 수치를 활용하여 옵션별 비교(가격, 장단점)를 제시하세요.
할인 조건, 협상 포인트가 있으면 포함하세요.""",

    "hot": """[모드: 역제안 — 구매 컨설턴트 톤]
400~700자. 사용자의 선택을 긍정하고, 데이터를 근거로 전략적 가치를 강조하세요.
- 톤: "좋은 선택이십니다" "효과적인 전략입니다" 등 긍정 피드백으로 시작.
- 데이터를 자연스럽게 녹여서 제시. "참조 문서에 따르면" 같은 표현 금지.
- 사용자가 이미 제시한 조건(예산/수량 등)을 다시 물어보지 마세요. 해당 조건 기반으로 바로 전략을 제시하세요.
- "~하시면 X% 절감됩니다" 같은 적극적 표현 사용. 소극적 나열 금지.""",
}

def _build_chat_prompt(cta_intent: str = "cold", user_role: str | None = None) -> str:
    """CTA 의도에 따른 chat 시스템 프롬프트 생성 (역할별 대화 레이어 포함)."""
    instruction = _CTA_INSTRUCTIONS.get(cta_intent, _CTA_INSTRUCTIONS["cold"])
    role_layer = _get_role_layer(user_role)
    return BASE_RULES + role_layer + "\n" + instruction

def _build_phase_prompt(phase: str, user_role: str | None = None) -> str:
    """Phase별 시스템 프롬프트 생성 (역할별 대화 레이어 포함)."""
    role_layer = _get_role_layer(user_role)
    _PHASE_TEMPLATES = {
        "filling": """[단계: RFP 작성] 섹션: {rfp_sections}
미입력 필드가 있으면 요청하세요. 한 섹션씩 진행. 채워진 필드는 건너뛰세요.
현재 채워진 필드: {filled_keys}""",
        "complete": """[단계: RFP 완료] 완성을 축하하고 다음 단계(공급업체 선정, 견적 비교)를 안내하세요.""",
        "pr_filling": """[단계: 구매요청서 작성] 섹션: {rfp_sections}
미입력 필드가 있으면 요청하세요. 한 섹션씩 진행. 채워진 필드는 건너뛰세요.
현재 채워진 필드: {filled_keys}""",
        "pr_complete": """[단계: 구매요청서 완료] 구매요청서 작성을 축하하고, 공급업체 추천 목록을 확인하도록 안내하세요.""",
    }
    template = _PHASE_TEMPLATES.get(phase, "")
    return BASE_RULES + role_layer + template

def _get_filling_prompt(intent: str, user_role: str | None = None) -> str:
    """RFP filling 의도별 프롬프트 (역할 레이어 포함)."""
    role_layer = _get_role_layer(user_role)
    _TEMPLATES = {
        "field_input": """[단계: RFP 필드 확인] 섹션: {rfp_sections}
100~200자. "확인했습니다"로 시작. 미입력 필드 요청. 현재 채워진 필드: {filled_keys}""",
        "question": """[단계: RFP 중 질문] 섹션: {rfp_sections}
300~500자. 질문 답변 후 "다음으로 (미입력 필드)를 입력해 주십시오."로 마무리. 현재 채워진 필드: {filled_keys}""",
        "rfp_question": """[단계: RFP 필드 개념] 섹션: {rfp_sections}
200~400자. 해당 필드 설명 + 입력 예시 1~2개. "위 내용을 참고하여 입력해 주십시오."로 마무리. 현재 채워진 필드: {filled_keys}""",
    }
    return BASE_RULES + role_layer + _TEMPLATES.get(intent, _TEMPLATES["field_input"])

def _get_pr_filling_prompt(intent: str, user_role: str | None = None) -> str:
    """PR(구매요청서) filling 의도별 프롬프트 (역할 레이어 포함)."""
    role_layer = _get_role_layer(user_role)
    _TEMPLATES = {
        "field_input": """[단계: 구매요청서 필드 확인] 섹션: {rfp_sections}
100~200자. "확인했습니다"로 시작. 기본값이 미리 채워져 있을 수 있으므로, 사용자가 수정한 내용만 반영하세요.
미입력 필드 요청. 현재 채워진 필드: {filled_keys}""",
        "question": """[단계: 구매요청서 중 질문] 섹션: {rfp_sections}
300~500자. 질문 답변 후 "다음으로 (미입력 필드)를 입력해 주십시오."로 마무리. 현재 채워진 필드: {filled_keys}""",
        "rfp_question": """[단계: 구매요청서 필드 개념] 섹션: {rfp_sections}
200~400자. 해당 필드 설명 + 입력 예시 1~2개. "위 내용을 참고하여 입력해 주십시오."로 마무리. 현재 채워진 필드: {filled_keys}""",
    }
    return BASE_RULES + role_layer + _TEMPLATES.get(intent, _TEMPLATES["field_input"])

RAG_PROMPT = """아래 참조 문서를 기반으로 사용자 질문에 답변하세요.
주의: "참조 문서에 따르면" 등 출처 언급 표현을 절대 사용하지 마세요. 정보를 직접 서술하세요.
주의: 답변 끝에 질문을 하지 마세요.

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
    script_text: str = "",
    filling_intent: str | None = None,
    cta_intent: str = "cold",
    user_role: str | None = None,
) -> tuple[str, float]:
    """RAG 기반 답변 생성 (phase별 프롬프트 전환, CTA 의도별 역제안, 역할별 대화 레이어, 헌법+화법 동적 주입)"""
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

    # PR filling phase + 의도 감지 시 의도별 프롬프트 사용
    if phase == "pr_filling" and filling_intent and filling_intent in ("field_input", "question", "rfp_question"):
        system_prompt = _get_pr_filling_prompt(filling_intent, user_role)
        system_prompt = system_prompt.format(filled_keys=filled_keys or "없음", rfp_sections=rfp_sections)
    # filling phase + 의도 감지 시 의도별 프롬프트 사용
    elif phase == "filling" and filling_intent and filling_intent in ("field_input", "question", "rfp_question"):
        system_prompt = _get_filling_prompt(filling_intent, user_role)
        system_prompt = system_prompt.format(filled_keys=filled_keys or "없음", rfp_sections=rfp_sections)
    elif phase == "chat":
        system_prompt = _build_chat_prompt(cta_intent, user_role)
    else:
        system_prompt = _build_phase_prompt(phase, user_role)
        if phase in ("filling", "pr_filling"):
            system_prompt = system_prompt.format(filled_keys=filled_keys or "없음", rfp_sections=rfp_sections)

    # 헌법 규칙 + 화법 스크립트 동적 주입
    if constitution_text:
        system_prompt = system_prompt + "\n" + constitution_text
    if script_text:
        system_prompt = system_prompt + "\n" + script_text

    # PR/RFP filling field_input: 확인 응답 → 토큰 절약
    max_tokens = 500 if phase in ("pr_filling", "filling") and filling_intent == "field_input" else 700

    response = _get_client().models.generate_content(
        model=MODELS["generation"],
        contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction=system_prompt,
            max_output_tokens=max_tokens,
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
    script_text: str = "",
    cta_intent: str = "cold",
    user_role: str | None = None,
):
    """SSE용 토큰 스트리밍 제너레이터 (CTA 의도별 역제안 + 역할별 대화 레이어 + 헌법+화법 동적 주입)"""
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

    # CTA 의도별 + 역할별 프롬프트 선택
    if phase == "chat":
        system_prompt = _build_chat_prompt(cta_intent, user_role)
    else:
        system_prompt = _build_phase_prompt(phase, user_role)
        if phase in ("filling", "pr_filling"):
            system_prompt = system_prompt.format(filled_keys=filled_keys or "없음", rfp_sections=rfp_sections)

    # 헌법 규칙 + 화법 스크립트 동적 주입
    if constitution_text:
        system_prompt = system_prompt + "\n" + constitution_text
    if script_text:
        system_prompt = system_prompt + "\n" + script_text

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


SUGGESTION_PROMPT = """당신의 역할: 아래 참조 문서를 기반으로 후속 안내 2개를 만드세요.

[절대 규칙]
1. 참조 문서에 실제로 구체적 설명이 있는 주제만 사용하세요.
2. 문서에 단어만 언급되고 설명이 없는 주제는 절대 사용하지 마세요.
3. 반드시 2개를 줄바꿈으로 구분해서 반환. 설명 없이.

[형식 - 반드시 아래 2가지 유형을 각 1개씩]
A. 정보 안내형: "~에 대해서 알려드릴까요?" 형태 (AI 답변이 다루지 않은 관련 주제)
B. 역제안형: 구매 전략/절감 방안/대안을 능동적으로 제안하는 형태
   - "~하시는 건 어떨까요?"
   - "~도 검토해 보시겠습니까?"
   - "~로 비용을 절감할 수 있는데 안내해 드릴까요?"
   예시: "장기계약으로 렌탈료를 절감하는 방안도 안내해 드릴까요?"
   예시: "볼륨 할인 조건을 활용한 비용 절감 전략을 검토해 보시겠습니까?"
   예시: "공급사 선정 평가 기준에 대해서 알려드릴까요?"

[판단 기준]
- 좋은 예(정보형): 문서에 "운용리스는 리스료를 비용 처리하여 자산 부채에 영향을 주지 않는다" → "운용리스의 회계 처리 방식에 대해서 알려드릴까요?"
- 좋은 예(역제안형): 문서에 "3년 이상 장기계약 시 15~20% 할인" → "장기계약으로 렌탈료를 절감하는 방안도 검토해 보시겠습니까?"
- 나쁜 예: 문서에 "승계"라는 단어만 있고 설명 없음 → 사용 금지

참조 문서:
{context}

사용자 질문: {question}
AI 답변 요약: {answer_summary}

A(정보 안내):
B(역제안):"""


def generate_suggestions(question: str, chunks: list[dict], answer_summary: str) -> list[str]:
    """flash-lite로 검색된 청크 기반 후속 질문 생성 (1개 정보형 + 1개 역제안형)"""
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
        suggestions = []
        for line in lines:
            # "A(정보 안내):", "B(역제안):" 접두사 제거
            line = re.sub(r'^[AB]\s*[\(（][^)）]*[\)）]\s*[:：]\s*', '', line)
            line = re.sub(r'^\d+[\.\)]\s*', '', line).strip()
            # "- " 접두사 제거
            line = re.sub(r'^[-]\s*', '', line).strip()
            if line:
                suggestions.append(line)

        # 쉼표 구분 폴백
        if len(suggestions) < 2 and ',' in text:
            suggestions = [s.strip() for s in text.split(",") if s.strip()]

        return suggestions[:2]
    except Exception:
        return []

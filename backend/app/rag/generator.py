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
당신은 구매를 원하는 사용자를 돕는 친절하고 세심한 구매 안내 도우미입니다.
마치 백화점의 친절한 상담사처럼, 사용자의 니즈를 파악하고 최적의 선택을 할 수 있도록 안내하세요.

[대화 톤 & 스타일]
- 따뜻하고 공감하는 톤을 유지하세요. 사용자의 상황에 먼저 공감하고 답변을 시작하세요.
- "~해 보시는 건 어떨까요?", "~을 추천드립니다", "~하시면 좋을 것 같습니다" 등 제안형 표현 사용.
- 전문 용어는 최소화하세요. SLA는 "서비스 보장 기준", TCO는 "총 비용", MOQ는 "최소 주문 수량"으로 풀어서 설명하세요.
- 정보를 나열하지 말고 이야기하듯 자연스럽게 전달하세요.
- 사용자가 잘 모르는 분야를 물어볼 때는 "좋은 질문이십니다"로 시작하여 쉽게 풀어주세요.
- 복잡한 내용은 "쉽게 말씀드리면~", "간단히 정리하면~" 등으로 시작하여 단계별로 설명하세요.
- 답변 마무리에는 "도움이 되셨으면 좋겠습니다", "추가로 궁금한 부분이 있으시면 편하게 말씀해 주세요" 등 따뜻한 마무리를 넣으세요.

[답변 방향 — 구매 안내]
- 가격 비교, 할인 조건, 추천 옵션 등 구매 의사결정에 도움이 되는 정보를 우선 제공하세요.
- 장기계약 할인, 대량 구매 혜택, 묶음 할인 등 비용 절감 팁을 적극적으로 안내하세요.
- "이 정도 규모라면 ~하시는 게 유리합니다"처럼 상황에 맞는 맞춤 조언을 제공하세요.
- 서비스 품질(고장 시 수리 시간, 교체 조건 등)도 함께 알려주세요.

[답변 방향 — 비교 설명]
- 비슷한 서비스 간 차이점을 쉽게 비교해 주세요 (예: 렌탈 vs 구매, 정액제 vs 건별).
- "~의 장점은 A이고, ~의 장점은 B입니다. 고객님 상황에서는 ~가 더 맞을 수 있습니다"처럼 비교 후 상황에 맞는 가이드를 제공하세요.
- 가격만이 아니라 편의성, 관리 부담, 사후 서비스까지 종합적으로 비교해 주세요.

[답변 방향 — 주의사항 안내]
- 계약 시 주의할 점(중도해지 위약금, 가격 인상 조건 등)을 "참고로 알아두시면 좋은 점"이라는 뉘앙스로 미리 알려주세요.
- 무조건 싼 것보다 가성비 좋은 선택이 중요하다는 관점에서 안내하세요.
- "혹시 ~한 경우도 있으실 수 있는데, 그때는 ~하시면 됩니다"처럼 예상 상황을 미리 짚어주세요.

[대화 패턴 — 사무적·간결체]
- 인사말 없이 바로 본론. "네, ~에 대해 안내드리겠습니다" 금지.
- 예시: "해당 품목은 BSM 카탈로그에서 직접 발주합니다. PR 작성 불필요."
- 예시: "총무팀 주관 계약 품목입니다. BSM → 총무팀 메뉴에서 신청하세요."
- 예시: "렌탈 vs 구매 비교: 렌탈은 월 3만원, 구매는 초기 60만원. 5년 기준 렌탈이 20% 저렴."
- 마무리는 한 문장. "추가 문의는 말씀해 주세요."

[금지 사항]
- SLA, TCO, RFP, MOQ 등 전문 약어를 설명 없이 사용하지 마세요.
- 공급업체를 임의로 추천하거나 특정 업체를 선호하지 마세요.
- 사용자가 언급하지 않은 예산/수량/금액을 임의로 가정하지 마세요.
- 딱딱한 보고서 스타일로 답변하지 마세요. 대화하듯 자연스럽게 전달하세요.
""",
    "procurement": """[역할: 구매담당자 업무 지원]
당신은 구매담당자의 업무를 지원하는 숙련된 전문 어시스턴트입니다.
마치 10년 경력의 선임 구매담당자가 후배에게 실무 노하우를 전수하듯, 실전적이고 구체적인 조언을 제공하세요.

[대화 톤 & 스타일]
- 간결하고 전문적인 업무 톤. 불필요한 수식어 없이 핵심 정보 위주로 전달하세요.
- 실무에서 바로 써먹을 수 있는 실행 가능한 정보를 제공하세요.
- "이 부분은 계약 시 반드시 확인하시기 바랍니다", "실무적으로는 ~하는 것이 효과적입니다" 등 경험에 기반한 조언 톤을 사용하세요.
- 단순 정보 나열이 아니라, "왜 중요한지"를 함께 설명하세요. 예: "A/S 응답시간을 명시해야 합니다. 이를 누락하면 장애 발생 시 대응 기준이 모호해집니다."
- 위험 요소나 흔한 실수를 미리 짚어주세요. "실무에서 자주 놓치는 부분인데~", "이 조건을 빠뜨리면~" 등.
- 답변 마무리는 "추가로 검토가 필요한 사항이 있으시면 말씀해 주십시오" 등 업무적 마무리를 사용하세요.

[답변 방향 — 구매 프로세스 가이드]
- RFP/RFQ 작성, 입찰 공고, 견적 비교, 계약 검토 등 업무 프로세스별 가이드를 제공하세요.
- 공급사 선정 시 최소 3개 이상 비교 평가를 권고하세요. 동일 양식으로 제안서를 수령하여 객관적 비교가 가능하도록 안내하세요.
- 계약서 필수 조항을 구체적으로 안내하세요: 서비스 범위, SLA, 책임 범위, 보증기간, 데이터 보안, 개인정보 보호, 중도해지 조건, 변경관리 절차.
- 공급사 성과평가는 연 1회 이상 실시를 권고하세요. 평가 기준: 품질, 납기 준수율, SLA 준수율, 고객 만족도, ESG 등.
- "구매 요청 양식을 표준화하여 필수 정보를 빠짐없이 기재하도록 하시기 바랍니다"처럼 프로세스 개선 방향도 제시하세요.

[답변 방향 — 비용 분석 & 전략]
- TCO(총소유비용) 관점에서 비용을 분석하세요. 단순 단가 비교가 아닌 부대비용, 유지보수비, 인건비, 교육비, 폐기 비용 등을 포함하세요.
- 견적 비교 시 기본요금, 할증, 보험, 옵션, 설치비를 분리하여 동일 기준으로 비교하도록 안내하세요.
- 장기계약 시 단가 인상률 상한(연 3% 이하 권고), 환율 변동 조건, 물가 연동 방식을 명시하도록 안내하세요.
- "볼륨 디스카운트 협상 시 ~대 이상 구간을 기준으로 단가표를 요청하시기 바랍니다"처럼 협상 전략도 제시하세요.
- 예산 수립 시 예비비(보통 5~10%)를 포함하도록 안내하세요.

[답변 방향 — 리스크 & 컴플라이언스]
- 보안 요건(NDA, 데이터 암호화, 접근 제어, ISMS 인증)을 계약에 포함하도록 안내하세요.
- 납기 지연, 품질 미달, 중도해지 시 패널티 조건을 명확히 하도록 안내하세요.
- 법적 기준(근로기준법, 파견법, 저작권, 라이선스, 하도급법 등)과 컴플라이언스 준수를 안내하세요.
- "이 유형의 계약에서 실무적으로 문제가 되는 경우는 ~입니다"처럼 실전 리스크를 미리 알려주세요.
- 변경관리 절차(Change Request)를 사전에 수립하도록 권고하세요.

[대화 패턴 예시]
- 프로세스 안내: "해당 건의 구매 프로세스를 안내드리겠습니다. 우선 ~부터 시작하시는 것이 효율적입니다."
- 비용 분석: "비용 구조를 말씀드리면, 월 렌탈료 외에 필터 교체비, 설치비, 철거비까지 포함한 TCO 기준으로 비교하시기 바랍니다. 실무에서 이 부분을 놓치면 예상 외 비용이 발생합니다."
- 계약 주의: "계약서에 반드시 포함해야 할 조항이 있습니다. 특히 ~은 실무에서 분쟁이 자주 발생하는 영역이므로 명확히 기재하시기 바랍니다."
- 리스크 알림: "참고로 이 유형의 서비스에서 주의할 점은 ~입니다. 사전에 ~조건을 협의해 두시면 리스크를 줄일 수 있습니다."
- 마무리: "추가로 검토가 필요한 사항이 있으시면 말씀해 주십시오."

[금지 사항]
- 공급업체를 임의로 추천하거나 특정 업체를 선호하지 마세요.
- 사용자가 언급하지 않은 예산/수량/금액을 임의로 가정하지 마세요.
- 법적 판단이 필요한 사안은 "법무 부서 또는 전문가 상담을 권고합니다"로 안내하세요.
- 친절하지만 지나치게 캐주얼하지 않게, 전문적이지만 딱딱하지 않게 균형을 유지하세요.
""",
}

def _get_role_layer(user_role: str | None) -> str:
    """역할에 따른 대화 레이어 텍스트 반환."""
    return _ROLE_LAYER.get(user_role, "")

# ── CTA 의도별 추가 지시 (BASE_RULES에 추가되는 짧은 지시문) ──
_CTA_INSTRUCTIONS = {
    "cold": """[모드: 정보 제공]
150~250자. 핵심만 간결하게 안내. 인사말·감탄사 없이 바로 본론.
불필요한 부연 설명 없이 사실 위주로 전달.""",

    "warm": """[모드: 비교·탐색]
200~300자. 옵션별 비교를 간결하게 제시.
핵심 수치와 차이점만 전달. 장황한 설명 금지.""",

    "hot": """[모드: 구매 안내]
200~300자. 구매 절차와 핵심 조건만 안내.
데이터 기반으로 간결하게 전달. "네, ~에 대해 안내드리겠습니다" 같은 반응형 표현 금지.
바로 본론으로 들어가세요.""",
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
    """PR(구매요청서) filling — 단답형 질문만. RAG 설명 금지."""
    _CORE = """[구매요청서 작성 모드 — 엄격 규칙]
당신은 구매요청서 필드를 수집하는 면접관입니다.
절대로 설명하거나 조언하지 마세요. 오직 질문만 하세요.

금지: 시장 데이터, 비용 분석, 전략 제안, 장문 설명, 참조 문서 인용
필수: 한 줄 확인 + 한 줄 질문 (합계 2줄 이내)

형식 예시:
"확인. 다음으로 계약 기간을 입력해 주세요. (예: 6개월, 1년)"
"확인. 서비스 범위를 입력해 주세요. (예: 사무보조, 데이터 입력)"

현재 채워진 필드: {filled_keys}
"""
    _TEMPLATES = {
        "field_input": _CORE,
        "question": _CORE + "\n사용자 질문에 한 줄로 답변 후 다음 필드를 질문하세요.",
        "rfp_question": _CORE + "\n해당 필드를 한 줄로 설명 후 입력을 요청하세요.",
    }
    return _TEMPLATES.get(intent, _TEMPLATES["field_input"])

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

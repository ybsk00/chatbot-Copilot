"""의도 파악 에이전트 — 사용자 질문을 캐스팅엔 분류체계에 매칭"""
import json
import re
from google import genai
from app.config import GOOGLE_API_KEY, MODELS

_client = None


def _get_client():
    global _client
    if _client is None:
        _client = genai.Client(api_key=GOOGLE_API_KEY)
    return _client


# 캐스팅엔 분류체계 (16개 대분류 + 중분류)
TAXONOMY = {
    "건물 관리": ["건물 관리 용역 서비스", "비품 구매/렌탈"],
    "마케팅": ["판촉물", "디지털 광고", "매장 관리", "시장 조사 용역", "일반 광고", "전자시장정보", "판매 도급", "행사 관리", "홍보", "스폰서"],
    "보험 서비스": ["배상책임 보험", "법정·의무 보험", "운송·물류 보험", "임직원 단체보험", "자산·시설 보험", "차량·모빌리티 보험", "출장·파견 보험", "기타 보험", "보증보험"],
    "복지 서비스": ["간식 서비스", "건강 검진 서비스", "국내 이사 서비스", "기념일 관리 서비스", "꽃/화환", "상조 서비스", "구내식당 및 음식제공 서비스", "대리기사 서비스", "의약품", "통근/셔틀 버스 서비스", "해외 이사 서비스"],
    "비품/소모품": ["공장용 소모품", "근무복", "사무용가구", "사무용품", "생수", "도서", "전자기기"],
    "사무 보조 서비스": ["급여대행/연말정산", "문서/상품 배송", "통/번역 서비스", "보고서/PPT 제작", "사무보조/아르바이트", "세탁 서비스", "전자 데이터 구매"],
    "시설 공사": ["매장 공사", "원상복구/철거", "인테리어 공사", "칸막이/레이아웃", "설계/감리", "수선 공사", "시설 평가/진단", "신축 공사"],
    "인쇄 서비스": ["명함", "인쇄물", "포스터/전단", "현수막/배너"],
    "정보통신": ["소프트웨어", "하드웨어", "네트워크 서비스", "네트워크 공사", "시스템 개발", "IT 인증"],
    "출장 서비스": ["교통(철도/항공)", "비자/여권", "숙박", "해외로밍", "차량 렌트"],
    "교육 서비스": ["법정 의무 교육", "어학 교육", "전문 교육"],
    "물류 관리": ["3PL 서비스", "4PL 서비스", "국내 운송", "창고 서비스", "해외 운송"],
    "차량관리": ["법인차량 구매/렌탈", "차량 수리", "세차", "운전 용역", "차량 운송"],
    "생산 관리": ["생산 장비", "자산매각/폐기", "제조 용역"],
    "연구개발": ["개발 용역", "개발용 부품", "개발용 장비", "규격인증", "로열티", "특허"],
    "전문 용역 서비스": ["공증", "노무", "법무", "부동산", "자문 컨설팅", "전략/운영 컨설팅", "제품 수리 용역", "채용", "컨택센터"],
}

TAXONOMY_TEXT = "\n".join(
    f"- {major}: {', '.join(middles)}"
    for major, middles in TAXONOMY.items()
)

CLASSIFY_PROMPT = """사용자의 간접구매 질문을 아래 분류체계에 매칭하세요. JSON만 반환.

[분류체계]
{taxonomy}

[규칙]
1. 가장 관련 있는 대분류와 중분류 1개를 선택하세요.
2. 매칭 불가 시 null을 반환하세요.
3. JSON만 반환, 설명 없이.
4. 대화 이력이 있으면 맥락을 반드시 참고하세요. 짧거나 모호한 질문은 이전 대화 주제와 같은 분류로 판단하세요.

{history_section}[사용자 질문]
{question}

출력: {{"대분류": "...", "중분류": "..."}}"""


def classify_intent(question: str, history: list[dict] | None = None) -> dict | None:
    """사용자 질문을 분류체계(대분류/중분류)에 매칭. 매칭 불가 시 None."""
    history_section = ""
    if history:
        lines = []
        for msg in history[-6:]:
            role = "사용자" if msg.get("role") == "user" else "AI"
            content = msg.get("content", "")[:200]
            lines.append(f"{role}: {content}")
        history_section = "[대화 이력]\n" + "\n".join(lines) + "\n\n"

    prompt = CLASSIFY_PROMPT.format(
        taxonomy=TAXONOMY_TEXT,
        question=question,
        history_section=history_section,
    )

    try:
        response = _get_client().models.generate_content(
            model=MODELS["refinement"],
            contents=prompt,
            config={"max_output_tokens": 100},
        )
        text = response.text.strip()
        if text.startswith("```"):
            text = re.sub(r"```json?\s*", "", text)
            text = re.sub(r"```\s*$", "", text)

        result = json.loads(text)

        major = result.get("대분류")
        if not major or major == "null" or major not in TAXONOMY:
            return None

        return {"대분류": major, "중분류": result.get("중분류", "")}

    except Exception:
        return None

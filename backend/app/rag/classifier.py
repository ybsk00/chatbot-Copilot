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

CLASSIFY_PROMPT = """사용자의 간접구매 질문을 아래 분류체계에 매칭하고, 구매 의도(CTA)를 판단하세요. JSON만 반환.

[분류체계]
{taxonomy}

[CTA 의도 판단 기준]
- "hot": 구매/발주/도입 의사가 명확함 (예: "설치하고 싶어요", "견적 받고 싶어요", "50대 필요해요", "계약하려고", "도입 검토 중")
- "warm": 비교/탐색/검토 중 (예: "종류가 뭐가 있어요?", "A랑 B 차이", "추천해주세요", "비용이 얼마나", "어떤 게 좋을까")
- "cold": 일반 정보 수집/개념 질문 (예: "뭔가요?", "알려주세요", "설명해주세요", "절차가 어떻게")

[규칙]
1. 가장 관련 있는 대분류와 중분류 1개를 선택하세요.
2. 매칭 불가 시 대분류/중분류는 null, cta는 "cold"를 반환하세요.
3. JSON만 반환, 설명 없이.
4. 대화 이력이 있으면 맥락을 반드시 참고하세요. 짧거나 모호한 질문은 이전 대화 주제와 같은 분류로 판단하세요.

{history_section}[사용자 질문]
{question}

출력: {{"대분류": "...", "중분류": "...", "cta": "hot|warm|cold"}}"""


# ── 분류체계 → RFP 유형 매핑 (9종) ──
TAXONOMY_TO_RFP = {
    "건물 관리":         {"_default": "service_contract", "비품 구매/렌탈": "rental_maintenance"},
    "마케팅":           "service_contract",
    "보험 서비스":       "service",
    "복지 서비스":       {"_default": "service", "의약품": "purchase"},
    "비품/소모품":       {"_default": "purchase", "사무용가구": "purchase", "전자기기": "purchase_lease"},
    "사무 보조 서비스":   "service",
    "시설 공사":         "construction",
    "인쇄 서비스":       "purchase",
    "정보통신":          {"_default": "purchase_lease", "소프트웨어": "purchase", "시스템 개발": "service_contract", "네트워크 공사": "construction"},
    "출장 서비스":       "service",
    "교육 서비스":       "service_contract",
    "물류 관리":         "service_contract",
    "차량관리":          {"_default": "rental", "차량 수리": "purchase_maintenance", "운전 용역": "service_contract"},
    "생산 관리":         {"_default": "purchase_maintenance", "자산매각/폐기": "service", "제조 용역": "service_contract"},
    "연구개발":          {"_default": "purchase_lease", "개발 용역": "service_contract", "규격인증": "consulting", "특허": "consulting"},
    "전문 용역 서비스":   "consulting",
}

# ── 렌탈/리스 키워드 오버라이드 ──
RENTAL_KEYWORDS = ["렌탈", "렌트", "리스", "임대", "대여"]
MAINTENANCE_KEYWORDS = ["유지보수", "A/S", "정기점검", "필터교체", "소모품"]


def _get_rfp_type(major: str, middle: str | None = None, question: str = "") -> str:
    """분류체계에서 RFP 유형 결정. 렌탈/리스 키워드 감지 시 오버라이드."""
    mapping = TAXONOMY_TO_RFP.get(major, "service_contract")
    if isinstance(mapping, str):
        base_type = mapping
    elif middle and middle in mapping:
        base_type = mapping[middle]
    else:
        base_type = mapping.get("_default", "service_contract")

    # 렌탈/리스 키워드가 질문에 포함되면 rental 계열로 오버라이드
    q = question.lower()
    has_rental = any(kw in q for kw in RENTAL_KEYWORDS)
    if has_rental and base_type not in ("rental", "rental_maintenance"):
        has_maint = any(kw in q for kw in MAINTENANCE_KEYWORDS)
        if has_maint or base_type in ("purchase_maintenance",):
            return "rental_maintenance"
        return "rental"

    return base_type


# ── CTA 키워드 사전감지 (LLM 결과 보정용) ──
_CTA_HOT_KEYWORDS = [
    "설치하고", "도입하고", "계약하고", "발주하고", "구매하고",
    "설치할", "도입할", "계약할", "발주할", "구매할",
    "견적", "설치 예정", "도입 예정", "계약 예정",
    "필요해", "필요합니다", "신청하고", "주문하고",
    "검토 중", "검토중", "도입 검토", "구매 검토",
]
_CTA_WARM_KEYWORDS = [
    "비교", "차이", "추천", "어떤 게", "뭐가 좋", "얼마나", "얼마",
    "종류", "옵션", "대안", "선택", "장단점", "비용",
    "가격", "단가", "견적서", "시세", "시장가",
]


def _detect_cta_keyword(question: str) -> str | None:
    """키워드 기반 CTA 사전감지. 확실한 경우만 반환."""
    q = question.lower()
    if any(kw in q for kw in _CTA_HOT_KEYWORDS):
        return "hot"
    if any(kw in q for kw in _CTA_WARM_KEYWORDS):
        return "warm"
    return None


def classify_intent(question: str, history: list[dict] | None = None) -> dict | None:
    """사용자 질문을 분류체계(대분류/중분류)에 매칭 + RFP 유형 추천. 매칭 불가 시 None."""
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

        middle = result.get("중분류", "")
        cta = result.get("cta", "cold")
        if cta not in ("hot", "warm", "cold"):
            cta = "cold"
        # 키워드 보정: LLM이 cold인데 키워드가 hot/warm이면 상향
        kw_cta = _detect_cta_keyword(question)
        if kw_cta == "hot" and cta != "hot":
            cta = "hot"
        elif kw_cta == "warm" and cta == "cold":
            cta = "warm"
        rfp_type = _get_rfp_type(major, middle, question)
        return {"대분류": major, "중분류": middle, "rfp_type": rfp_type, "cta": cta}

    except Exception:
        return None

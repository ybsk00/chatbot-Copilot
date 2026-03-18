"""PR(구매요청서) 템플릿 v2 시드 — 차세대 품목체계 22개 그룹 (필수/옵션 구분 포함)"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from dotenv import load_dotenv
load_dotenv()

from app.db.supabase_client import get_client


# ═══════════════════════════════════════════
# 공통 필드 헬퍼 (기존과 동일 구조 + required 플래그)
# ═══════════════════════════════════════════

COMMON_LABELS = {
    "c1": "발주기관명", "c2": "요청부서", "c3": "요청자", "c4": "연락처", "c5": "이메일",
    "c6": "서비스/품목명", "c7": "구매/계약 목적", "c8": "계약 유형", "c9": "계약 기간", "c10": "대상 규모/수량",
    "c11": "서비스 범위/요구 사양", "c12": "제공/수행 방식", "c13": "품질/SLA 기준", "c14": "보안/법적 요건",
    "c15": "단가 산정 방식", "c16": "구간 할인 적용", "c17": "결제 주기 및 방식",
    "c18": "단가 인상/에스컬레이션 조건", "c19": "계약 해지/위약금 조건", "c20": "BSM/전산 연동 조건",
}

# c1~c5: 필수 (요청자 정보), c6~c10: 필수 (계약 기본), c11~c14: 필수, c15~c20: 옵션
COMMON_REQUIRED = {
    "c1": True, "c2": True, "c3": True, "c4": True, "c5": True,
    "c6": True, "c7": True, "c8": True, "c9": True, "c10": True,
    "c11": True, "c12": True, "c13": False, "c14": False,
    "c15": False, "c16": False, "c17": False,
    "c18": False, "c19": False, "c20": False,
}


def build_common_fields(defaults: dict) -> dict:
    fields = {}
    for key, label in COMMON_LABELS.items():
        d = defaults.get(key, "")
        req = COMMON_REQUIRED[key]
        f = {"label": label, "value": "", "required": req}
        if d:
            f["default"] = d
        fields[key] = f
    return fields


COMMON_SECTIONS_PREFIX = [
    {"title": "1. 요청자 정보", "fields": ["c1", "c2", "c3", "c4", "c5"], "icon": "org"},
    {"title": "2. 계약 기본 정보", "fields": ["c6", "c7", "c8", "c9", "c10"], "icon": "doc"},
    {"title": "3. 서비스 요건", "fields": ["c11", "c12", "c13", "c14"], "icon": "gear"},
]

PAYMENT_SECTION_FIELDS = ["c15", "c16", "c17", "c18", "c19", "c20"]


def build_sections(specific_sections: list) -> list:
    numbered = []
    for i, s in enumerate(specific_sections):
        numbered.append({
            "title": f"{i + 4}. {s['title']}",
            "fields": s["fields"],
            "icon": s.get("icon", "gear"),
        })
    payment_idx = len(specific_sections) + 4
    payment_section = {
        "title": f"{payment_idx}. 결제·계약 조건",
        "fields": PAYMENT_SECTION_FIELDS,
        "icon": "mail",
    }
    return COMMON_SECTIONS_PREFIX + numbered + [payment_section]


def p(label, default="", required=True):
    """고유필드 헬퍼"""
    f = {"label": label, "value": "", "required": required}
    if default:
        f["default"] = default
    return f


# ═══════════════════════════════════════════
# 22개 PR 템플릿 그룹 정의
# ═══════════════════════════════════════════

TEMPLATES = [
    # ────────────────────────────────────
    # 1. 물품구매 (goods_purchase)
    # L2: 사무용품·소모품, 공장용 소모품
    # ────────────────────────────────────
    {
        "type_key": "goods_purchase",
        "name": "물품 구매",
        "description": "사무용품, 소모품, 공장 자재 등 물품 구매",
        "category_group": "일반 구매",
        "fields": {
            **build_common_fields({
                "c6": "사무용품/소모품 구매",
                "c7": "업무 수행에 필요한 물품 확보",
                "c8": "단가 계약 (연간)",
                "c9": "1년 (자동 갱신)",
                "c10": "월 평균 500만원 규모",
                "c11": "물품 납품 + 배송",
                "c12": "온라인 카탈로그 주문 + 일괄 배송",
            }),
            "p1": p("품목 카테고리", "사무용품 / 소모품 / 전산소모품"),
            "p2": p("납품 희망일"),
            "p3": p("상세 품목 리스트 및 수량", "별첨 품목 리스트 참조"),
            "p4": p("품질/규격 기준", "KS 규격 또는 동등 이상", False),
            "p5": p("납품 장소", "본사 1개소 (서울)", False),
            "p6": p("납품 방식", "분할 납품 가능 (월 단위)", False),
            "p7": p("샘플 제출 요구", "주요 품목 샘플 사전 제출", False),
            "p8": p("친환경 인증 요구", "녹색제품 우선 구매 (그린오피스)", False),
        },
        "sections": build_sections([
            {"title": "품목 및 납품", "fields": ["p1", "p2", "p3", "p4"], "icon": "gear"},
            {"title": "납품 조건", "fields": ["p5", "p6", "p7", "p8"], "icon": "gear"},
        ]),
    },

    # ────────────────────────────────────
    # 2. 렌탈·리스 (rental_lease)
    # L2: 사무환경, 비품 렌탈, 법인차량
    # ────────────────────────────────────
    {
        "type_key": "rental_lease",
        "name": "렌탈·리스",
        "description": "기기, 장비, 차량 등의 렌탈 또는 리스 계약",
        "category_group": "일반 구매",
        "fields": {
            **build_common_fields({
                "c6": "기기/장비 렌탈 서비스",
                "c7": "업무 환경 개선 및 장비 확보",
                "c8": "순수 렌탈 (계약 종료 후 반납)",
                "c9": "3년 약정 (36개월)",
                "c10": "총 20대",
                "c11": "기기 렌탈 + 유지보수 + 소모품 포함",
                "c12": "설치 후 정기 방문 관리",
            }),
            "p1": p("렌탈 품목 및 모델", "공기청정기 / 복합기 / 정수기 / 비데 등"),
            "p2": p("설치 장소 및 수량"),
            "p3": p("서비스 시작(설치 희망)일"),
            "p4": p("렌탈 vs 리스 방식", "순수 렌탈 (반납) / 리스 (인수 옵션)", False),
            "p5": p("기기 사양/등급 요건", "", False),
            "p6": p("소모품 포함 여부", "소모품(필터/토너 등) 렌탈료 포함", False),
            "p7": p("정기 점검 주기", "분기별 1회", False),
            "p8": p("고장 시 대응 SLA", "신고 후 24시간 내 수리 또는 대체기 제공", False),
            "p9": p("기기 이전 서비스", "계약 기간 내 연 2회 무료 이전", False),
            "p10": p("만료 후 처리", "반납 / 재계약 / 인수 중 선택", False),
        },
        "sections": build_sections([
            {"title": "렌탈 품목 및 설치", "fields": ["p1", "p2", "p3", "p4", "p5"], "icon": "gear"},
            {"title": "유지보수·소모품", "fields": ["p6", "p7", "p8"], "icon": "gear"},
            {"title": "이전·만료", "fields": ["p9", "p10"], "icon": "gear"},
        ]),
    },

    # ────────────────────────────────────
    # 3. 인쇄·제작 (print_production)
    # L2: 인쇄, 콘텐츠 제작, 판촉물
    # ────────────────────────────────────
    {
        "type_key": "print_production",
        "name": "인쇄·제작",
        "description": "인쇄물, 디자인, 영상, 판촉물 제작",
        "category_group": "마케팅",
        "fields": {
            **build_common_fields({
                "c6": "인쇄물/콘텐츠 제작 서비스",
                "c7": "브랜드 홍보 및 마케팅 자료 제작",
                "c8": "건별 제작 계약",
                "c9": "1년 (단가 계약)",
                "c10": "월 평균 10건 제작",
                "c11": "디자인 + 제작 + 납품",
                "c12": "시안 → 수정 → 최종 확인 → 제작 → 납품",
            }),
            "p1": p("제작물 유형", "명함/리플렛/포스터/배너/영상/판촉물 등"),
            "p2": p("납품 희망일"),
            "p3": p("수량 및 규격"),
            "p4": p("디자인 시안 요건", "초안 2안 → 수정 2회 → 최종 확정", False),
            "p5": p("CI/BI 가이드 적용", "사내 CI 가이드 준수 필수", False),
            "p6": p("인쇄 사양", "아트지 250g, 4도 인쇄, 무광 코팅", False),
            "p7": p("납품 방식", "본사 일괄 납품 / 각 사업장 분산 납품", False),
            "p8": p("저작권 귀속", "제작 완료 후 발주사 귀속", False),
        },
        "sections": build_sections([
            {"title": "제작 상세", "fields": ["p1", "p2", "p3", "p4"], "icon": "gear"},
            {"title": "디자인·인쇄 사양", "fields": ["p5", "p6"], "icon": "gear"},
            {"title": "납품·저작권", "fields": ["p7", "p8"], "icon": "gear"},
        ]),
    },

    # ────────────────────────────────────
    # 4. 용역·아웃소싱 (service_outsourcing)
    # L2: FM용역, 채용인력, 컨택센터, 생산운영
    # ────────────────────────────────────
    {
        "type_key": "service_outsourcing",
        "name": "용역·아웃소싱",
        "description": "인력 투입형 용역, 시설관리, 인력파견, 운영대행",
        "category_group": "용역",
        "fields": {
            **build_common_fields({
                "c6": "용역 서비스",
                "c7": "전문 인력 투입을 통한 업무 수행",
                "c8": "연간 용역 계약",
                "c9": "1년 (자동 갱신)",
                "c10": "투입 인력 10명",
                "c11": "인력 파견 + 업무 수행 + 관리감독",
                "c12": "상주 인력 배치 (주5일 8시간)",
            }),
            "p1": p("용역 유형", "시설관리/청소/경비/인력파견/운영대행 등"),
            "p2": p("서비스 시작 희망일"),
            "p3": p("투입 인원 및 구성"),
            "p4": p("근무 시간 및 교대 방식", "주5일 8시간 / 3교대 24시간 등", False),
            "p5": p("투입 인력 자격 요건", "", False),
            "p6": p("관리 감독자 지정", "현장 책임자 1명 지정", False),
            "p7": p("업무 범위 상세", "", False),
            "p8": p("성과 지표 (KPI/SLA)", "", False),
            "p9": p("인력 교체 조건", "부적격 인력 7일 이내 교체", False),
            "p10": p("4대보험·최저임금 준수", "필수 (입찰 시 증빙 제출)", False),
        },
        "sections": build_sections([
            {"title": "용역 개요", "fields": ["p1", "p2", "p3", "p4"], "icon": "gear"},
            {"title": "인력 요건", "fields": ["p5", "p6"], "icon": "gear"},
            {"title": "업무·성과·관리", "fields": ["p7", "p8", "p9", "p10"], "icon": "gear"},
        ]),
    },

    # ────────────────────────────────────
    # 5. 전문 컨설팅 (consulting)
    # L2: 법무, 경영컨설팅, 회계·세무
    # ────────────────────────────────────
    {
        "type_key": "consulting",
        "name": "전문 컨설팅",
        "description": "법무, 경영, 회계, 세무, IT 컨설팅",
        "category_group": "전문용역",
        "fields": {
            **build_common_fields({
                "c6": "컨설팅 서비스",
                "c7": "전문가 자문을 통한 의사결정 지원",
                "c8": "프로젝트 단위 계약",
                "c9": "6개월",
                "c10": "컨설턴트 3명 투입",
                "c11": "현황 분석 + 전략 수립 + 실행 방안 도출",
                "c12": "주 1회 정기 미팅 + 수시 자문",
            }),
            "p1": p("컨설팅 분야", "법무/세무/전략/IT/노무 등"),
            "p2": p("프로젝트 시작 희망일"),
            "p3": p("컨설팅 범위 및 목표"),
            "p4": p("투입 전문가 등급", "파트너/매니저/시니어 구성", False),
            "p5": p("최종 산출물", "보고서 + 실행계획 + 경영진 보고", False),
            "p6": p("기밀유지·NDA", "계약 전 NDA 체결 필수", False),
            "p7": p("중간 보고 주기", "격주 1회 중간 보고", False),
        },
        "sections": build_sections([
            {"title": "컨설팅 개요", "fields": ["p1", "p2", "p3"], "icon": "gear"},
            {"title": "투입·산출물·관리", "fields": ["p4", "p5", "p6", "p7"], "icon": "gear"},
        ]),
    },

    # ────────────────────────────────────
    # 6. 교육·훈련 (education_training)
    # L2: 교육·훈련
    # ────────────────────────────────────
    {
        "type_key": "education_training",
        "name": "교육·훈련",
        "description": "법정교육, 어학, 직무, 리더십, 온라인 교육",
        "category_group": "인사",
        "fields": {
            **build_common_fields({
                "c6": "교육 서비스",
                "c7": "임직원 역량 강화 및 법정교육 이수",
                "c8": "연간 위탁 계약",
                "c9": "1년 (자동 갱신)",
                "c10": "전 임직원 300명",
                "c11": "교육 기획 + 강사 배정 + LMS 제공 + 성과측정",
                "c12": "온라인 LMS + 오프라인 집합교육 병행",
            }),
            "p1": p("교육 유형", "법정교육/어학/직무/리더십/DX·AI 등"),
            "p2": p("교육 시작 희망일"),
            "p3": p("교육 대상 인원 및 구성"),
            "p4": p("교육 과정 상세", "", False),
            "p5": p("교육 방식 (온라인/오프라인)", "온라인 60% + 오프라인 40%", False),
            "p6": p("강사 자격 요건", "", False),
            "p7": p("LMS 플랫폼 요건", "PC+모바일, 이수현황 조회, 미이수 알림", False),
            "p8": p("성과 측정 방법", "만족도 4.0/5.0 이상, 역량 향상률 측정", False),
            "p9": p("이수 증빙 관리", "수료증 발급, 5년 보관", False),
            "p10": p("고용보험 환급 대행", "환급 가능 과정 편성 + 신청 대행", False),
        },
        "sections": build_sections([
            {"title": "교육 개요", "fields": ["p1", "p2", "p3", "p4"], "icon": "gear"},
            {"title": "교육 방식·강사", "fields": ["p5", "p6", "p7"], "icon": "gear"},
            {"title": "성과·증빙", "fields": ["p8", "p9", "p10"], "icon": "chart"},
        ]),
    },

    # ────────────────────────────────────
    # 7. 복지 서비스 (welfare_service)
    # L2: 임직원 복지, 글로벌 HR
    # ────────────────────────────────────
    {
        "type_key": "welfare_service",
        "name": "복지 서비스",
        "description": "식당, 건강검진, 셔틀, 상조, 간식, 기념일 등 임직원 복지",
        "category_group": "인사",
        "fields": {
            **build_common_fields({
                "c6": "임직원 복지 서비스",
                "c7": "임직원 복리후생 향상",
                "c8": "연간 위탁 계약",
                "c9": "1년 (자동 갱신)",
                "c10": "전 임직원 300명 대상",
                "c11": "복지 서비스 운영 + 품질 관리 + 만족도 조사",
                "c12": "상주 운영 또는 정기 방문",
            }),
            "p1": p("복지 서비스 유형", "식당/검진/셔틀/상조/간식/기념일선물 등"),
            "p2": p("서비스 시작 희망일"),
            "p3": p("대상 인원 및 범위"),
            "p4": p("서비스 품질 기준", "만족도 4.0/5.0 이상", False),
            "p5": p("운영 시간 및 빈도", "", False),
            "p6": p("특이 요구사항", "", False),
        },
        "sections": build_sections([
            {"title": "서비스 개요", "fields": ["p1", "p2", "p3"], "icon": "gear"},
            {"title": "품질·운영", "fields": ["p4", "p5", "p6"], "icon": "gear"},
        ]),
    },

    # ────────────────────────────────────
    # 8. 시설 공사 (construction)
    # L2: 시설공사, 설비공사·유지보수
    # ────────────────────────────────────
    {
        "type_key": "construction",
        "name": "시설 공사",
        "description": "신축, 인테리어, 설비, 수선 등 시설 공사",
        "category_group": "시설",
        "fields": {
            **build_common_fields({
                "c6": "시설 공사",
                "c7": "사업장 시설 구축 및 환경 개선",
                "c8": "도급 공사 계약",
                "c9": "공사 기간 (착공~준공)",
                "c10": "공사 면적 및 규모",
                "c11": "설계 + 시공 + 감리 + 준공",
                "c12": "공정표에 따른 단계별 시공",
            }),
            "p1": p("공사 유형", "신축/인테리어/설비/수선/철거 등"),
            "p2": p("공사 장소 및 면적"),
            "p3": p("착공 희망일"),
            "p4": p("공사 기간 (예상 공기)"),
            "p5": p("설계도면 유무", "도면 있음 / 설계 포함 입찰", False),
            "p6": p("안전관리 계획", "안전관리자 배치, 산안법 준수", False),
            "p7": p("하자보수 기간", "준공 후 2년", False),
            "p8": p("기성 지급 조건", "월 기성 검사 후 익월 지급", False),
        },
        "sections": build_sections([
            {"title": "공사 개요", "fields": ["p1", "p2", "p3", "p4"], "icon": "gear"},
            {"title": "설계·안전·하자", "fields": ["p5", "p6", "p7", "p8"], "icon": "gear"},
        ]),
    },

    # ────────────────────────────────────
    # 9. 보험 (insurance)
    # L2: 보험 전체 (0501~0508)
    # ────────────────────────────────────
    {
        "type_key": "insurance",
        "name": "보험",
        "description": "임직원, 자산, 배상, 운송, 차량 등 모든 보험",
        "category_group": "보험",
        "fields": {
            **build_common_fields({
                "c6": "보험 가입/갱신",
                "c7": "리스크 관리 및 법정 보험 의무 이행",
                "c8": "보험 계약",
                "c9": "1년 (갱신)",
                "c10": "보험 대상 범위",
                "c11": "보험 설계 + 견적 + 가입 + 클레임 관리",
                "c12": "보험사 직접 또는 보험대리점 경유",
            }),
            "p1": p("보험 유형", "단체보험/화재/배상/운송/차량/보증 등"),
            "p2": p("보험 시작일"),
            "p3": p("피보험자/대상 범위"),
            "p4": p("담보 범위 및 보장 내용"),
            "p5": p("보험 가입 금액", "", False),
            "p6": p("자기부담금", "", False),
            "p7": p("특약 사항", "", False),
            "p8": p("기존 보험사/증권 정보", "", False),
        },
        "sections": build_sections([
            {"title": "보험 개요", "fields": ["p1", "p2", "p3", "p4"], "icon": "gear"},
            {"title": "금액·특약", "fields": ["p5", "p6", "p7", "p8"], "icon": "gear"},
        ]),
    },

    # ────────────────────────────────────
    # 10. 광고·매체 (advertising_media)
    # L2: 일반광고, 디지털마케팅, 홍보PR, 리서치
    # ────────────────────────────────────
    {
        "type_key": "advertising_media",
        "name": "광고·매체",
        "description": "TV, 디지털, SNS 광고, 홍보, 시장조사",
        "category_group": "마케팅",
        "fields": {
            **build_common_fields({
                "c6": "광고/마케팅 대행 서비스",
                "c7": "브랜드 인지도 제고 및 마케팅 성과 극대화",
                "c8": "연간 대행 계약",
                "c9": "1년 (분기 리뷰)",
                "c10": "월 매체비 + 대행 수수료",
                "c11": "전략 수립 + 소재 제작 + 매체 집행 + 성과 분석",
                "c12": "전담 AE 배정, 주간 최적화, 월간 미팅",
            }),
            "p1": p("광고/마케팅 유형", "검색광고/SNS/영상/바이럴/PR/조사 등"),
            "p2": p("캠페인 시작 희망일"),
            "p3": p("타겟 오디언스"),
            "p4": p("매체 믹스 전략", "", False),
            "p5": p("월 매체비 예산", "", False),
            "p6": p("소재 제작 범위", "", False),
            "p7": p("KPI 목표", "CTR, CPC, ROAS 등", False),
            "p8": p("리포팅 주기", "주간 대시보드 + 월간 리포트", False),
            "p9": p("광고 심의/법적 요건", "표시광고법 준수", False),
        },
        "sections": build_sections([
            {"title": "캠페인 개요", "fields": ["p1", "p2", "p3", "p4", "p5"], "icon": "gear"},
            {"title": "소재·KPI", "fields": ["p6", "p7"], "icon": "chart"},
            {"title": "리포팅·법적", "fields": ["p8", "p9"], "icon": "gear"},
        ]),
    },

    # ────────────────────────────────────
    # 11. 이벤트·행사 (event_exhibition)
    # L2: 이벤트·전시·행사
    # ────────────────────────────────────
    {
        "type_key": "event_exhibition",
        "name": "이벤트·행사",
        "description": "소비자 이벤트, 전시, 컨퍼런스, 스폰서십",
        "category_group": "마케팅",
        "fields": {
            **build_common_fields({
                "c6": "이벤트/행사 운영",
                "c7": "브랜드 경험 및 고객 접점 확대",
                "c8": "건별 또는 연간 대행 계약",
                "c9": "행사 기간",
                "c10": "참가자/참석자 규모",
                "c11": "기획 + 장소 + 인력 + 장비 + 운영 + 정산",
                "c12": "행사 대행사를 통한 일괄 운영",
            }),
            "p1": p("행사 유형", "이벤트/전시/컨퍼런스/스폰서십 등"),
            "p2": p("행사 일시"),
            "p3": p("장소 및 규모"),
            "p4": p("예상 참석자 수"),
            "p5": p("부스/무대 설치 요건", "", False),
            "p6": p("음향·조명·영상 장비", "", False),
            "p7": p("케이터링/다과", "", False),
            "p8": p("사후 리포트", "참석자 분석 + ROI 보고서", False),
        },
        "sections": build_sections([
            {"title": "행사 개요", "fields": ["p1", "p2", "p3", "p4"], "icon": "gear"},
            {"title": "설치·장비·식음", "fields": ["p5", "p6", "p7"], "icon": "gear"},
            {"title": "성과 보고", "fields": ["p8"], "icon": "chart"},
        ]),
    },

    # ────────────────────────────────────
    # 12. 출장 서비스 (business_travel)
    # L2: 출장 서비스
    # ────────────────────────────────────
    {
        "type_key": "business_travel",
        "name": "출장 서비스",
        "description": "항공, 숙박, 렌터카, 비자 등 출장 관련",
        "category_group": "총무",
        "fields": {
            **build_common_fields({
                "c6": "출장 서비스 (TMC)",
                "c7": "임직원 출장 지원 및 비용 관리",
                "c8": "연간 위탁 계약",
                "c9": "1년 (자동 갱신)",
                "c10": "연간 출장 건수 약 500건",
                "c11": "항공 + 숙박 + 렌터카 + 비자 + 정산",
                "c12": "온라인 예약 시스템 + 전담 에이전트",
            }),
            "p1": p("출장 서비스 범위", "항공/숙박/렌터카/비자/로밍 등"),
            "p2": p("계약 시작 희망일"),
            "p3": p("연간 출장 규모"),
            "p4": p("항공 클래스 기준", "국내 이코노미, 해외 비즈니스 (임원)", False),
            "p5": p("숙박 등급 기준", "4성급 이상", False),
            "p6": p("예약 시스템 연동", "사내 ERP + 경비정산 연동", False),
        },
        "sections": build_sections([
            {"title": "출장 개요", "fields": ["p1", "p2", "p3"], "icon": "gear"},
            {"title": "기준·연동", "fields": ["p4", "p5", "p6"], "icon": "gear"},
        ]),
    },

    # ────────────────────────────────────
    # 13. IT 하드웨어 (it_hardware)
    # L2: 서버, 엔드포인트, 네트워크, 데이터센터
    # ────────────────────────────────────
    {
        "type_key": "it_hardware",
        "name": "IT 하드웨어",
        "description": "서버, PC, 네트워크 장비, 데이터센터 인프라",
        "category_group": "IT",
        "fields": {
            **build_common_fields({
                "c6": "IT 하드웨어 구매/구축",
                "c7": "IT 인프라 확보 및 업그레이드",
                "c8": "구매 + 유지보수 통합 계약",
                "c9": "보증 3년 + 유지보수 2년",
                "c10": "장비 수량",
                "c11": "장비 납품 + 설치 + 설정 + 유지보수",
                "c12": "납품 후 현장 설치 + 원격 모니터링",
            }),
            "p1": p("장비 유형", "서버/스토리지/PC/노트북/네트워크 등"),
            "p2": p("납품 희망일"),
            "p3": p("수량 및 상세 사양"),
            "p4": p("설치 장소", "", False),
            "p5": p("기존 환경 호환성", "", False),
            "p6": p("보증 기간 및 SLA", "무상 보증 3년, 장애 4시간 내 대응", False),
            "p7": p("확장성 요건", "향후 20% 확장 가능 설계", False),
            "p8": p("네트워크/보안 요건", "", False),
        },
        "sections": build_sections([
            {"title": "장비 개요", "fields": ["p1", "p2", "p3", "p4"], "icon": "gear"},
            {"title": "호환·보증·확장", "fields": ["p5", "p6", "p7", "p8"], "icon": "gear"},
        ]),
    },

    # ────────────────────────────────────
    # 14. IT SW·클라우드 (it_software_cloud)
    # L2: 소프트웨어, 클라우드·보안
    # ────────────────────────────────────
    {
        "type_key": "it_software_cloud",
        "name": "IT 소프트웨어·클라우드",
        "description": "소프트웨어 라이선스, 클라우드, 보안 솔루션",
        "category_group": "IT",
        "fields": {
            **build_common_fields({
                "c6": "소프트웨어/클라우드 서비스",
                "c7": "업무 시스템 구축 및 클라우드 전환",
                "c8": "구독형 라이선스 계약",
                "c9": "1년 (갱신)",
                "c10": "사용자 수 / 인스턴스 수",
                "c11": "라이선스 + 기술지원 + 업데이트",
                "c12": "SaaS / On-premise / 하이브리드",
            }),
            "p1": p("소프트웨어/서비스명"),
            "p2": p("도입 희망일"),
            "p3": p("사용자 수 / 라이선스 수"),
            "p4": p("라이선스 유형", "구독/영구/동시사용 등", False),
            "p5": p("클라우드 환경", "AWS/Azure/GCP/국내클라우드", False),
            "p6": p("데이터 보안 요건", "암호화, 접근통제, 감사로그", False),
            "p7": p("SLA (가동률)", "99.9% 이상", False),
            "p8": p("마이그레이션 지원", "기존 시스템 데이터 이관", False),
        },
        "sections": build_sections([
            {"title": "소프트웨어 개요", "fields": ["p1", "p2", "p3", "p4"], "icon": "gear"},
            {"title": "환경·보안·SLA", "fields": ["p5", "p6", "p7", "p8"], "icon": "gear"},
        ]),
    },

    # ────────────────────────────────────
    # 15. IT 개발·운영 (it_development)
    # L2: IT 서비스 (SI, ITO)
    # ────────────────────────────────────
    {
        "type_key": "it_development",
        "name": "IT 개발·운영",
        "description": "시스템 개발(SI), IT 운영(ITO), 유지보수",
        "category_group": "IT",
        "fields": {
            **build_common_fields({
                "c6": "IT 개발/운영 서비스",
                "c7": "시스템 구축 및 안정적 운영",
                "c8": "프로젝트 + 연간 운영 계약",
                "c9": "개발 6개월 + 운영 2년",
                "c10": "투입 인력 및 규모",
                "c11": "분석 + 설계 + 개발 + 테스트 + 운영",
                "c12": "애자일/워터폴 개발 + 상주 운영",
            }),
            "p1": p("프로젝트/서비스 유형", "SI 개발 / ITO 운영 / 유지보수"),
            "p2": p("프로젝트 시작 희망일"),
            "p3": p("개발 범위 및 기능"),
            "p4": p("투입 인력 구성", "PM/PL/개발자/QA 등", False),
            "p5": p("개발 방법론", "애자일/워터폴/하이브리드", False),
            "p6": p("산출물 목록", "요구사항정의서, 설계서, 테스트계획서 등", False),
            "p7": p("하자보수 기간", "개발 완료 후 1년", False),
            "p8": p("소스코드 귀속", "발주사 귀속", False),
        },
        "sections": build_sections([
            {"title": "프로젝트 개요", "fields": ["p1", "p2", "p3", "p4"], "icon": "gear"},
            {"title": "개발·산출물·하자", "fields": ["p5", "p6", "p7", "p8"], "icon": "gear"},
        ]),
    },

    # ────────────────────────────────────
    # 16. 물류 운송 (logistics_transport)
    # L2: 국내육운, 해운, 항공, 부가서비스
    # ────────────────────────────────────
    {
        "type_key": "logistics_transport",
        "name": "물류 운송",
        "description": "국내 육운, 해운, 항공 운송, 통관",
        "category_group": "물류",
        "fields": {
            **build_common_fields({
                "c6": "물류 운송 서비스",
                "c7": "화물 운송 및 물류 효율화",
                "c8": "연간 단가 계약",
                "c9": "1년 (갱신)",
                "c10": "월 운송 물량",
                "c11": "운송 + 통관 + 보험 + 트래킹",
                "c12": "정기 운송 + 스팟 운송",
            }),
            "p1": p("운송 유형", "육운/해운/항공/특송/통관 등"),
            "p2": p("운송 시작 희망일"),
            "p3": p("출발지 → 도착지"),
            "p4": p("월 운송 물량 (CBM/톤/건수)"),
            "p5": p("화물 특성", "일반/냉장/위험물/중량물 등", False),
            "p6": p("운임 조건 (Incoterms)", "FOB/CIF/DDP 등", False),
            "p7": p("트래킹 요구사항", "실시간 GPS 트래킹", False),
        },
        "sections": build_sections([
            {"title": "운송 개요", "fields": ["p1", "p2", "p3", "p4"], "icon": "gear"},
            {"title": "화물·운임·트래킹", "fields": ["p5", "p6", "p7"], "icon": "gear"},
        ]),
    },

    # ────────────────────────────────────
    # 17. 물류 창고·풀필먼트 (logistics_warehouse)
    # L2: 창고, 풀필먼트, 물류IT
    # ────────────────────────────────────
    {
        "type_key": "logistics_warehouse",
        "name": "물류 창고·풀필먼트",
        "description": "창고 보관, 풀필먼트, 물류 자동화",
        "category_group": "물류",
        "fields": {
            **build_common_fields({
                "c6": "창고/풀필먼트 서비스",
                "c7": "재고 보관 및 주문 처리 효율화",
                "c8": "연간 용역 계약",
                "c9": "1년 (갱신)",
                "c10": "보관 면적 / 월 처리 건수",
                "c11": "입고 + 보관 + 피킹·패킹 + 출고 + 반품",
                "c12": "WMS 기반 운영 + 정기 재고 실사",
            }),
            "p1": p("서비스 유형", "보관/풀필먼트/반품역물류/라스트마일 등"),
            "p2": p("서비스 시작 희망일"),
            "p3": p("보관 면적 및 팔레트 수"),
            "p4": p("월 출고 건수"),
            "p5": p("온도/환경 조건", "상온/냉장/냉동/위험물", False),
            "p6": p("WMS/TMS 연동", "자사 OMS 연동 필수", False),
            "p7": p("부가 서비스", "라벨링/리패킹/검품/조립", False),
        },
        "sections": build_sections([
            {"title": "창고 개요", "fields": ["p1", "p2", "p3", "p4"], "icon": "gear"},
            {"title": "환경·시스템·부가", "fields": ["p5", "p6", "p7"], "icon": "gear"},
        ]),
    },

    # ────────────────────────────────────
    # 18. R&D 용역·장비 (rd_service)
    # L2: 개발용역, 부품, 장비, R&D SW
    # ────────────────────────────────────
    {
        "type_key": "rd_service",
        "name": "연구개발 용역·장비",
        "description": "개발 용역, 연구 장비, 시제품, R&D 소프트웨어",
        "category_group": "R&D",
        "fields": {
            **build_common_fields({
                "c6": "연구개발 용역/장비",
                "c7": "제품 개발 및 기술 역량 확보",
                "c8": "프로젝트 또는 구매 계약",
                "c9": "프로젝트 기간",
                "c10": "개발 범위 / 장비 수량",
                "c11": "개발 + 시제품 + 시험 + 납품",
                "c12": "마일스톤 기반 단계별 진행",
            }),
            "p1": p("R&D 유형", "HW개발/SW개발/디자인/시험/장비구매 등"),
            "p2": p("프로젝트 시작 희망일"),
            "p3": p("개발/구매 범위 상세"),
            "p4": p("산출물 및 납품물", "", False),
            "p5": p("지식재산(IP) 귀속", "발주사 귀속", False),
            "p6": p("NDA/기밀유지", "계약 전 NDA 체결 필수", False),
            "p7": p("장비 사양/규격", "", False),
            "p8": p("A/S 및 보증 조건", "", False),
        },
        "sections": build_sections([
            {"title": "R&D 개요", "fields": ["p1", "p2", "p3", "p4"], "icon": "gear"},
            {"title": "IP·보안·보증", "fields": ["p5", "p6", "p7", "p8"], "icon": "gear"},
        ]),
    },

    # ────────────────────────────────────
    # 19. 인증·시험·IP (certification_test)
    # L2: 시험인증, 지식재산
    # ────────────────────────────────────
    {
        "type_key": "certification_test",
        "name": "인증·시험·IP",
        "description": "안전인증, 시험분석, 특허, 로열티",
        "category_group": "R&D",
        "fields": {
            **build_common_fields({
                "c6": "인증/시험/특허 서비스",
                "c7": "제품 인증 취득 및 지식재산 관리",
                "c8": "건별 또는 연간 계약",
                "c9": "인증 소요 기간",
                "c10": "인증/시험 대상 제품 수",
                "c11": "시험 + 서류 작성 + 인증 취득 + 사후관리",
                "c12": "시험기관 직접 또는 대행",
            }),
            "p1": p("서비스 유형", "안전인증/EMC/환경/특허출원/로열티 등"),
            "p2": p("서비스 시작 희망일"),
            "p3": p("대상 제품/기술"),
            "p4": p("인증 대상국", "한국/미국/유럽/중국/일본 등", False),
            "p5": p("시험 규격/표준", "KC/UL/CE/FCC 등", False),
            "p6": p("예상 소요 기간", "", False),
            "p7": p("사후관리 (갱신/유지)", "인증 유효기간 관리", False),
        },
        "sections": build_sections([
            {"title": "인증/시험 개요", "fields": ["p1", "p2", "p3", "p4"], "icon": "gear"},
            {"title": "규격·기간·관리", "fields": ["p5", "p6", "p7"], "icon": "gear"},
        ]),
    },

    # ────────────────────────────────────
    # 20. 생산·안전·폐기 (production_safety)
    # L2: 생산설비, 안전보건, 폐기물
    # ────────────────────────────────────
    {
        "type_key": "production_safety",
        "name": "생산·안전·폐기",
        "description": "생산설비, 산업안전, 폐기물 처리",
        "category_group": "생산",
        "fields": {
            **build_common_fields({
                "c6": "생산설비/안전/폐기물 서비스",
                "c7": "생산 설비 확보 및 안전 관리",
                "c8": "구매 또는 용역 계약",
                "c9": "설비 수명 또는 연간",
                "c10": "설비 수량 / 관리 면적",
                "c11": "설비 구매 + 설치 + 안전관리 + 폐기물 처리",
                "c12": "현장 설치 + 정기 점검",
            }),
            "p1": p("서비스 유형", "설비구매/금형/안전관리/폐기물처리 등"),
            "p2": p("서비스 시작 희망일"),
            "p3": p("대상 설비/시설 상세"),
            "p4": p("안전 인증 요건", "산안법/소방법 준수", False),
            "p5": p("유지보수 조건", "", False),
            "p6": p("폐기물 종류 및 물량", "", False),
            "p7": p("환경 규제 준수", "폐기물관리법, 환경영향평가", False),
        },
        "sections": build_sections([
            {"title": "설비/안전 개요", "fields": ["p1", "p2", "p3", "p4"], "icon": "gear"},
            {"title": "유지보수·폐기", "fields": ["p5", "p6", "p7"], "icon": "gear"},
        ]),
    },

    # ────────────────────────────────────
    # 21. 유틸리티·에너지 (utility_energy)
    # L2: 유틸리티·에너지관리
    # ────────────────────────────────────
    {
        "type_key": "utility_energy",
        "name": "유틸리티·에너지",
        "description": "전기, 가스, 수도, 재생에너지, EMS",
        "category_group": "시설",
        "fields": {
            **build_common_fields({
                "c6": "에너지/유틸리티 관리 서비스",
                "c7": "에너지 효율화 및 비용 절감",
                "c8": "연간 계약",
                "c9": "1년 (갱신)",
                "c10": "관리 대상 사업장 수",
                "c11": "에너지 모니터링 + 사용량 분석 + 절감 방안",
                "c12": "EMS 시스템 + 정기 컨설팅",
            }),
            "p1": p("에너지 유형", "전기/가스/수도/태양광/RE100 등"),
            "p2": p("서비스 시작 희망일"),
            "p3": p("관리 대상 사업장"),
            "p4": p("월 에너지 사용량", "", False),
            "p5": p("RE100/ESG 목표", "", False),
            "p6": p("EMS 시스템 요구", "", False),
        },
        "sections": build_sections([
            {"title": "에너지 개요", "fields": ["p1", "p2", "p3"], "icon": "gear"},
            {"title": "사용량·목표·시스템", "fields": ["p4", "p5", "p6"], "icon": "gear"},
        ]),
    },

    # ────────────────────────────────────
    # 22. 사무보조 서비스 (office_support)
    # L2: 사무보조 (택배, 번역, 데이터)
    # ────────────────────────────────────
    {
        "type_key": "office_support",
        "name": "사무보조 서비스",
        "description": "택배, 번역, 데이터구독, 보고서제작 등",
        "category_group": "총무",
        "fields": {
            **build_common_fields({
                "c6": "사무보조 서비스",
                "c7": "업무 효율화를 위한 보조 서비스",
                "c8": "연간 단가 계약",
                "c9": "1년 (자동 갱신)",
                "c10": "월 이용 건수/규모",
                "c11": "서비스 제공 + 정산",
                "c12": "온라인 주문 + 정기 배송/방문",
            }),
            "p1": p("서비스 유형", "택배/번역/데이터구독/문서배송 등"),
            "p2": p("서비스 시작 희망일"),
            "p3": p("월 이용 규모"),
            "p4": p("서비스 요구사항 상세", "", False),
            "p5": p("NDA/기밀유지", "기밀 문서 취급 시 NDA 필수", False),
        },
        "sections": build_sections([
            {"title": "서비스 개요", "fields": ["p1", "p2", "p3"], "icon": "gear"},
            {"title": "상세·보안", "fields": ["p4", "p5"], "icon": "gear"},
        ]),
    },

    # ────────────────────────────────────
    # 23. 범용 (_generic) — 위에 해당 없는 경우
    # ────────────────────────────────────
    {
        "type_key": "_generic",
        "name": "일반 구매요청",
        "description": "분류에 해당하지 않는 일반 구매요청",
        "category_group": "기타",
        "fields": {
            **build_common_fields({}),
            "p1": p("품목/서비스명"),
            "p2": p("구매 목적"),
            "p3": p("수량/규모"),
            "p4": p("희망 납기일"),
            "p5": p("요구 사양", "", False),
            "p6": p("기타 요구사항", "", False),
        },
        "sections": build_sections([
            {"title": "구매 상세", "fields": ["p1", "p2", "p3", "p4", "p5", "p6"], "icon": "gear"},
        ]),
    },
]


def run():
    supabase = get_client()

    # 기존 PR 템플릿 삭제
    supabase.table("pr_templates").delete().neq("id", 0).execute()
    print("기존 PR 템플릿 데이터 삭제 완료")

    for t in TEMPLATES:
        supabase.table("pr_templates").insert({
            "type_key": t["type_key"],
            "name": t["name"],
            "description": t["description"],
            "fields": t["fields"],
            "sections": t["sections"],
            "is_active": True,
        }).execute()
        print(f"  [OK] {t['type_key']}: {t['name']}")

    print(f"\nPR 템플릿 v2 시드 완료: {len(TEMPLATES)}개 삽입")

    # 필수/옵션 통계
    for t in TEMPLATES:
        total = len(t["fields"])
        required = sum(1 for f in t["fields"].values() if f.get("required", False))
        optional = total - required
        print(f"  {t['type_key']}: 총 {total}개 (필수 {required}, 옵션 {optional})")


if __name__ == "__main__":
    run()

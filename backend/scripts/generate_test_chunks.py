"""
분류체계 기반 테스트 청크 생성기

신규DB에 없는 카테고리에 대해 구매요청서/시장단가/소싱전략 형태의
임의 테스트 데이터를 생성하여 knowledge_chunks에 저장

사용법:
  python -m scripts.generate_test_chunks
  python -m scripts.generate_test_chunks --dry-run
  python -m scripts.generate_test_chunks --category "복지 서비스"
"""
import sys
import os
import time
import argparse

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.rag.embedder import embed_document
from app.db.supabase_client import get_client

# 신규DB에 이미 있는 카테고리 (ingest_excel.py로 처리됨)
EXISTING_NEW_CATS = {
    ("건물 관리", "공기청정기 렌탈 서비스"),
    ("마케팅", "디지털 광고 제작 및 운영"),
    ("건물 관리", "문서파기 서비스"),
    ("건물 관리", "물리보안 서비스"),
    ("마케팅", "바이럴 마케팅 대행"),
    ("건물 관리", "방역소독 서비스"),
    ("교육 서비스", "법정의무교육"),
    ("건물 관리", "보안경비 용역 서비스"),
    ("건물 관리", "복합기 렌탈 서비스"),
    ("건물 관리", "비데 렌탈 서비스"),
    ("건물 관리", "안전관리 서비스"),
    ("교육 서비스", "어학교육"),
    ("교육 서비스", "전문교육"),
    ("마케팅", "전자시장정보 구독"),
    ("건물 관리", "조경관리 용역 서비스"),
}

# 테스트용 카테고리 데이터 (분류체계 기반 + 시장 현실 반영)
TEST_CATEGORIES = [
    {
        "category": "건물 관리",
        "sub_cat": "청소 관리 용역 서비스",
        "items": [
            {
                "name": "건물 연면적 및 층수",
                "desc": "청소 대상 건물의 총 연면적(㎡)과 층수. 면적 기준으로 인력 배치 및 월정 단가 산정.\n1,000㎡ 이하: 1~2명 / 1,000~5,000㎡: 3~5명 / 5,000㎡ 이상: 5~10명+",
                "required": "필수", "impact": "상",
                "example": "예) 연면적 3,500㎡, 지상 8층 + 지하 2층 오피스빌딩",
            },
            {
                "name": "청소 유형 (일상/정기/특수)",
                "desc": "일상 청소(매일 바닥·화장실), 정기 청소(주1~월1 왁싱·카페트), 특수 청소(입주·퇴거·준공)\n유형별 단가 차이: 일상 < 정기(+30~50%) < 특수(+100~200%)",
                "required": "필수", "impact": "상",
                "example": "예) 일상 청소(매일) + 정기 왁싱(월 1회) + 카페트 세척(분기 1회)",
            },
            {
                "name": "계약 기간",
                "desc": "표준 계약: 1년 / 장기: 2~3년. 장기계약 시 월 단가 10~15% 인하 가능.\n1년 미만 단기 계약은 할증 10~20% 적용",
                "required": "필수", "impact": "상",
                "example": "예) 2년 약정 (24개월, 6개월 단위 성과 평가)",
            },
            {
                "name": "투입 인력 수 및 근무 시간",
                "desc": "상주 인력 수, 근무 시간(주간/야간/24시간), 교대 여부.\n야간 청소: 주간 대비 +20~30% 할증. 24시간 상주: +50% 이상",
                "required": "필수", "impact": "상",
                "example": "예) 주간 3명 (08:00~17:00) + 야간 1명 (18:00~22:00)",
            },
            {
                "name": "화장실 개소 수",
                "desc": "화장실 수는 투입 인력 배치의 핵심 변수. 10개소 이상 시 전담 인력 추가 필요.\n화장실 1개소당 일 2~3회 청소 기준",
                "required": "필수", "impact": "중",
                "example": "예) 남녀 화장실 각 8개층 = 16개소",
            },
            {
                "name": "청소 장비 제공 여부",
                "desc": "업체 장비 사용 vs 발주처 장비 제공. 업체 장비 시 감가상각분 월정액에 포함.\n대형 장비(폴리셔, 카페트 세척기) 포함 시 월 +5~10만원",
                "required": "옵션", "impact": "중",
                "example": "예) 대형 장비(폴리셔, 카페트 세척기) 업체 제공 요청",
            },
        ],
        "market_prices": [
            {"service": "일반 사무실 청소", "detail": "일상 청소 (바닥·화장실·쓰레기)", "unit": "㎡/월", "min": "1500", "avg": "2500", "max": "4000", "tips": "3,000㎡ 이상 계약 시 ㎡당 500원 이하 협상 가능"},
            {"service": "정기 왁싱", "detail": "바닥 왁싱 및 코팅", "unit": "㎡/회", "min": "800", "avg": "1500", "max": "3000", "tips": "월정 계약에 포함 시 회당 단가 20~30% 절감"},
            {"service": "카페트 세척", "detail": "습식/건식 카페트 세척", "unit": "㎡/회", "min": "1000", "avg": "2000", "max": "4000", "tips": "분기 계약 시 회당 단가 15% 인하"},
            {"service": "유리창 청소", "detail": "외부 유리창 (고소작업 포함)", "unit": "㎡/회", "min": "3000", "avg": "6000", "max": "15000", "tips": "10층 이상 고소작업 시 안전관리비 별도. 반기 계약 권장"},
            {"service": "특수 청소 (입주/퇴거)", "detail": "준공 청소, 입주 전 종합 청소", "unit": "㎡/건", "min": "5000", "avg": "8000", "max": "15000", "tips": "면적 1,000㎡ 이상 시 패키지 할인 20~30%"},
        ],
        "strategy": "면적 기준 단가 비교 필수. 장기계약(2년+) 시 월 단가 10~15% 절감. 성과 평가 연동 인센티브 구조 설계.",
    },
    {
        "category": "건물 관리",
        "sub_cat": "정수기 렌탈 서비스",
        "items": [
            {
                "name": "설치 대수 및 설치 위치",
                "desc": "냉온정수기, 직수형, 얼음정수기 등 대수 및 설치 장소(사무실/공장/식당)\n대수 증가 시 구간 할인: 10대 이상 -10%, 30대 이상 -20%, 50대 이상 -25%",
                "required": "필수", "impact": "상",
                "example": "예) 총 30대 (사무실 20대 + 식당 5대 + 공장 5대)",
            },
            {
                "name": "정수기 유형",
                "desc": "직수형 / 탱크형 / 얼음정수기 / 대용량(200명+)\n직수형: 월 2~3만원 / 얼음정수기: 월 4~6만원 / 대용량: 월 8~15만원",
                "required": "필수", "impact": "상",
                "example": "예) 직수형 냉온정수기 20대 + 얼음정수기 10대",
            },
            {
                "name": "계약 기간",
                "desc": "표준 3년 / 5년 약정. 1년 단기는 월 렌탈료 20~30% 할증.\n3년 vs 5년: 월 -15~20% 차이",
                "required": "필수", "impact": "상",
                "example": "예) 3년 약정 (36개월)",
            },
            {
                "name": "필터 교체 주기 및 포함 여부",
                "desc": "직수형 필터: 6개월~1년 교체 / 세디먼트·카본·멤브레인·후카본 4단계\n교체 비용 포함 vs 별도: 연간 대당 5~10만원 차이",
                "required": "필수", "impact": "상",
                "example": "예) 전 필터 교체 비용 렌탈료 포함 요청",
            },
            {
                "name": "위생 점검 주기",
                "desc": "정기 위생 점검(내부 살균, 코크 세척) 2~4개월 주기\n점검 횟수 증가 시 월 +5~10% 비용 상승",
                "required": "필수", "impact": "중",
                "example": "예) 2개월 1회 정기 위생 점검 포함",
            },
        ],
        "market_prices": [
            {"service": "직수형 냉온정수기", "detail": "냉수+온수 직수형", "unit": "대/월", "min": "20000", "avg": "30000", "max": "45000", "tips": "30대 이상 계약 시 대당 월 5,000원 할인 협상"},
            {"service": "얼음정수기", "detail": "냉수+온수+얼음", "unit": "대/월", "min": "35000", "avg": "50000", "max": "70000", "tips": "얼음 사용량 적을 시 직수형으로 대체 추천"},
            {"service": "대용량 정수기", "detail": "200명+ 대형 사업장용", "unit": "대/월", "min": "80000", "avg": "120000", "max": "200000", "tips": "식당/공장은 대용량 1대가 소형 3~4대보다 TCO 유리"},
        ],
        "strategy": "대수 구간 할인 최대 활용. 직수형 기본 + 필요 시 얼음정수기 추가. 5년 약정 시 TCO 최적화.",
    },
    {
        "category": "복지 서비스",
        "sub_cat": "건강검진 서비스",
        "items": [
            {
                "name": "검진 대상 인원 수",
                "desc": "전 직원 / 임직원+배우자 / 특수건강검진 대상자 구분\n인원 증가 시 인당 검진비 할인: 100명 -10%, 300명 -15%, 500명+ -20%",
                "required": "필수", "impact": "상",
                "example": "예) 전 직원 350명 + 배우자 150명 = 총 500명",
            },
            {
                "name": "검진 유형 및 항목",
                "desc": "일반검진 / 종합검진 / 정밀검진 / 암검진 특화\n일반: 10~15만원 / 종합: 30~60만원 / 정밀: 80~150만원\n등급별 항목 차이: MRI, CT, PET 포함 여부가 핵심",
                "required": "필수", "impact": "상",
                "example": "예) A등급(종합+MRI) 100명, B등급(일반+초음파) 250명",
            },
            {
                "name": "검진 기관 지정 여부",
                "desc": "병원 지정 vs 복수 기관 선택제\n단일 기관 대량 계약 시 인당 단가 15~25% 절감\n복수 기관 제공 시 직원 만족도 높지만 협상력 분산",
                "required": "필수", "impact": "상",
                "example": "예) 수도권 3개 병원 + 지방 2개 병원 선택제",
            },
            {
                "name": "검진 시기 및 일정",
                "desc": "성수기(3~5월, 9~11월) 피하면 인당 5~10% 추가 할인 가능\n비수기(6~8월, 12~2월) 예약 시 우대 단가 적용",
                "required": "옵션", "impact": "중",
                "example": "예) 6~8월 비수기 집중 편성 (인당 추가 할인 협상)",
            },
            {
                "name": "결과 통보 및 사후관리",
                "desc": "검진 결과 리포트 형태(개인별/통계), 유소견 사후관리 프로그램\n사후관리 포함 시 인당 +2~5만원 추가",
                "required": "옵션", "impact": "하",
                "example": "예) 개인별 결과 리포트 + 유소견 재검 안내 + 연간 건강 통계",
            },
        ],
        "market_prices": [
            {"service": "일반건강검진", "detail": "기본 혈액+소변+흉부X선", "unit": "인/회", "min": "100000", "avg": "150000", "max": "200000", "tips": "300명 이상 단체 계약 시 인당 10~15% 할인"},
            {"service": "종합건강검진", "detail": "일반+초음파+위내시경+대장내시경", "unit": "인/회", "min": "300000", "avg": "500000", "max": "800000", "tips": "등급 분리(임원/일반) 운영 시 예산 30% 절감"},
            {"service": "정밀건강검진", "detail": "종합+MRI+CT+PET", "unit": "인/회", "min": "800000", "avg": "1200000", "max": "2000000", "tips": "임원 전용 10~20명 소규모 계약 시 별도 패키지 협상"},
            {"service": "특수건강검진", "detail": "법정 특수건강검진 (유해인자 노출)", "unit": "인/회", "min": "50000", "avg": "80000", "max": "150000", "tips": "법정 의무이므로 가격 협상보다 일정·접근성 우선"},
        ],
        "strategy": "등급 분리(임원 종합/직원 일반) + 비수기 편성 + 단일 기관 대량 계약 조합. 인당 20~30% 절감 가능.",
    },
    {
        "category": "복지 서비스",
        "sub_cat": "간식 서비스",
        "items": [
            {
                "name": "이용 인원 및 사업장 수",
                "desc": "월 이용 인원 및 사업장(거점) 수. 거점별 최소 주문 수량 있음.\n인원 200명+ 시 인당 단가 15~20% 절감. 다거점은 물류비 추가",
                "required": "필수", "impact": "상",
                "example": "예) 본사 200명 + 지사 3곳 각 50명 = 총 350명",
            },
            {
                "name": "배송 주기 및 방식",
                "desc": "주 1~2회 / 격주 / 월 1회. 냉장 배송 여부.\n주 2회 배송: 주 1회 대비 +15~25% 비용 상승. 냉장: +10~20%",
                "required": "필수", "impact": "상",
                "example": "예) 주 2회 배송 (월·목), 냉장 간식 포함",
            },
            {
                "name": "인당 월 예산",
                "desc": "인당 월 1~5만원 범위. 3만원이 시장 평균.\n예산 증가 시 프리미엄 간식(수제, 유기농) 포함 가능",
                "required": "필수", "impact": "상",
                "example": "예) 인당 월 3만원 (연간 인당 36만원)",
            },
            {
                "name": "간식 구성 (음료/스낵/과일)",
                "desc": "음료(커피·주스) / 스낵(과자·견과) / 과일 / 프리미엄(수제디저트)\n과일 포함 시 +20~30%. 프리미엄 구성 시 +50% 이상",
                "required": "옵션", "impact": "중",
                "example": "예) 기본 스낵 70% + 음료 20% + 계절 과일 10%",
            },
        ],
        "market_prices": [
            {"service": "기본 간식 구독", "detail": "과자·견과·음료 패키지", "unit": "인/월", "min": "15000", "avg": "30000", "max": "50000", "tips": "200명 이상 계약 시 인당 월 5,000원 할인"},
            {"service": "프리미엄 간식 구독", "detail": "수제디저트·유기농·과일 포함", "unit": "인/월", "min": "30000", "avg": "50000", "max": "80000", "tips": "임원·VIP 라운지 전용. 별도 예산 편성 권장"},
            {"service": "커피/음료 구독", "detail": "원두커피·주스·차", "unit": "인/월", "min": "10000", "avg": "20000", "max": "40000", "tips": "커피머신 렌탈 병행 시 총비용 절감 가능"},
        ],
        "strategy": "인원 200명 이상 시 연간 계약 체결. 기본+프리미엄 분리 운영. 배송 주기 최적화(주1회)로 물류비 절감.",
    },
    {
        "category": "차량관리",
        "sub_cat": "법인차량 렌탈 서비스",
        "items": [
            {
                "name": "차종 및 대수",
                "desc": "경차/준중형/중형/대형/SUV/전기차 등 차종별 대수.\n전기차 렌탈료: 내연기관 대비 +10~20%이나 유류비 절감으로 TCO 유사",
                "required": "필수", "impact": "상",
                "example": "예) 중형 세단 10대 + SUV 3대 + 전기차 5대",
            },
            {
                "name": "계약 기간",
                "desc": "단기(1~11개월) / 장기(12~60개월). 36개월이 시장 표준.\n24개월 vs 36개월: 월 렌탈료 -10~15%. 48개월: -20~25%",
                "required": "필수", "impact": "상",
                "example": "예) 36개월 약정 (만기 반납 또는 재계약)",
            },
            {
                "name": "보험 조건",
                "desc": "자차 포함/미포함, 보험 면책금 범위, 대인·대물 한도.\n완전자차(면책 0원) 포함 시 월 +3~5만원 / 자기부담금 20만원 조건 시 월 -2~3만원",
                "required": "필수", "impact": "상",
                "example": "예) 완전자차(면책 0원) + 대인 무제한 + 대물 1억",
            },
            {
                "name": "정비 포함 범위",
                "desc": "소모품(타이어·브레이크) 포함 여부. 올인원 패키지 vs 정비 별도.\n정비 포함 시 월 +2~4만원이나 예상치 못한 정비비 방지",
                "required": "필수", "impact": "중",
                "example": "예) 소모품 교체 + 정기 점검 포함 올인원 패키지",
            },
            {
                "name": "탁송 및 반납 조건",
                "desc": "계약 종료 시 반납 장소, 탁송비, 차량 상태 평가 기준.\n초과 운행거리 km당 100~200원 과금. 차량 손상 복원비 정산",
                "required": "옵션", "impact": "중",
                "example": "예) 연간 주행 2만km 기준, 초과 시 km당 120원",
            },
        ],
        "market_prices": [
            {"service": "준중형 세단", "detail": "아반떼급 장기렌탈", "unit": "대/월", "min": "350000", "avg": "450000", "max": "550000", "tips": "10대 이상 법인 계약 시 대당 월 3~5만원 할인"},
            {"service": "중형 세단", "detail": "쏘나타/K5급 장기렌탈", "unit": "대/월", "min": "450000", "avg": "600000", "max": "750000", "tips": "36개월 약정 기준. 보험 조건으로 5~8만원 절감 가능"},
            {"service": "대형 세단", "detail": "그랜저/K8급 장기렌탈", "unit": "대/월", "min": "600000", "avg": "800000", "max": "1100000", "tips": "임원용. 법인세 비용처리 한도(800만원/연) 고려"},
            {"service": "SUV", "detail": "투싼/스포티지급 장기렌탈", "unit": "대/월", "min": "500000", "avg": "700000", "max": "950000", "tips": "현장직·영업용은 SUV가 세단 대비 TCO 유리"},
            {"service": "전기차", "detail": "아이오닉5/EV6급 장기렌탈", "unit": "대/월", "min": "500000", "avg": "650000", "max": "850000", "tips": "보조금 반영 여부 확인. 충전 인프라 구축비 별도 고려"},
        ],
        "strategy": "차종 믹스 최적화(임원 대형 + 영업 중형 + 현장 SUV). 36개월 장기계약 + 완전자차 패키지가 TCO 최적.",
    },
    {
        "category": "사무 보조 서비스",
        "sub_cat": "택배/퀵 서비스",
        "items": [
            {
                "name": "월 평균 물량",
                "desc": "월 발송 건수(택배+퀵). 월 1,000건 이상 시 특판 단가 적용.\n일반 택배: 건당 2,500~4,000원 / 퀵: 건당 8,000~25,000원",
                "required": "필수", "impact": "상",
                "example": "예) 택배 월 800건 + 퀵 월 50건",
            },
            {
                "name": "배송 지역 및 유형",
                "desc": "수도권/지방/제주·도서산간 비율. 도서산간 할증 +3,000~5,000원.\n당일배송 vs 익일배송: 당일 +50~100% 할증",
                "required": "필수", "impact": "상",
                "example": "예) 수도권 70% + 지방 25% + 도서산간 5%",
            },
            {
                "name": "계약 기간 및 정산 방식",
                "desc": "월 후불 정산 / 건별 선불 / 연간 단가계약.\n연간 단가계약 시 건당 500~1,000원 추가 할인",
                "required": "필수", "impact": "중",
                "example": "예) 연간 단가계약, 월말 후불 정산",
            },
        ],
        "market_prices": [
            {"service": "일반 택배", "detail": "5kg 이하 소형 택배", "unit": "건당", "min": "2500", "avg": "3200", "max": "4500", "tips": "월 1,000건 이상 계약 시 건당 2,200~2,500원 특판 가능"},
            {"service": "퀵 서비스 (오토바이)", "detail": "서류·소화물 당일 배송", "unit": "건당", "min": "8000", "avg": "12000", "max": "25000", "tips": "정기 노선 계약 시 건당 30~40% 절감"},
            {"service": "화물 택배", "detail": "20kg 이상 대형 화물", "unit": "건당", "min": "8000", "avg": "15000", "max": "50000", "tips": "물량 예측 가능 시 정기 배차 계약이 건별보다 유리"},
        ],
        "strategy": "월 물량 집계 후 상위 3개 업체 경쟁 견적. 택배+퀵 통합 계약 시 번들 할인 15~20%.",
    },
    {
        "category": "시설 공사",
        "sub_cat": "인테리어 공사",
        "items": [
            {
                "name": "공사 면적 및 용도",
                "desc": "시공 면적(㎡)과 공간 용도(사무실/매장/공장/의료).\n사무실: ㎡당 50~150만원 / 매장: ㎡당 80~250만원 / 의료: ㎡당 120~300만원",
                "required": "필수", "impact": "상",
                "example": "예) 사무실 500㎡ (오픈형 업무공간 300㎡ + 회의실 100㎡ + 임원실 100㎡)",
            },
            {
                "name": "마감재 등급",
                "desc": "바닥(타일/원목/카페트), 벽체(도장/벽지/우드패널), 천장(텍스/노출)\n프리미엄 마감: 일반 대비 +40~80% 비용 상승",
                "required": "필수", "impact": "상",
                "example": "예) 바닥 LVT타일 + 벽체 도장(친환경) + 천장 텍스",
            },
            {
                "name": "공사 기간",
                "desc": "표준 공기: 100㎡당 2~3주. 야간/주말 공사 시 인건비 +30~50% 할증.\n기존 영업 중 공사 시 소음·분진 관리비 추가",
                "required": "필수", "impact": "중",
                "example": "예) 4주 (주간 공사, 주말 마감 작업 포함)",
            },
            {
                "name": "설계 포함 여부",
                "desc": "설계+시공 일괄 vs 설계 별도 발주. 일괄 시 총비용 10~15% 절감.\n설계비: 총 공사비의 5~10%",
                "required": "필수", "impact": "중",
                "example": "예) 설계+시공 일괄 발주 (턴키)",
            },
        ],
        "market_prices": [
            {"service": "일반 사무실", "detail": "오픈형 업무공간 + 회의실", "unit": "㎡당", "min": "500000", "avg": "900000", "max": "1500000", "tips": "500㎡ 이상 시 ㎡당 10~15% 볼륨 디스카운트"},
            {"service": "프리미엄 사무실", "detail": "임원실·VIP 라운지 포함", "unit": "㎡당", "min": "1000000", "avg": "1500000", "max": "2500000", "tips": "마감재 등급 분리(일반존/프리미엄존)로 예산 최적화"},
            {"service": "매장 인테리어", "detail": "소매 매장·쇼룸", "unit": "㎡당", "min": "800000", "avg": "1500000", "max": "2500000", "tips": "브랜드 가이드라인 준수 시 본사 지원금 확인"},
        ],
        "strategy": "설계+시공 일괄 발주 추천. 3개 업체 이상 경쟁 견적. 마감재 등급 분리로 예산 30% 절감 가능.",
    },
    {
        "category": "마케팅",
        "sub_cat": "판촉물/선물",
        "items": [
            {
                "name": "판촉물 종류 및 수량",
                "desc": "문구류/생활용품/전자기기/식품/기프트세트 등.\n1,000개 이하: 단가 높음 / 5,000개+: 20~30% 절감 / 10,000개+: 40% 절감",
                "required": "필수", "impact": "상",
                "example": "예) 텀블러 3,000개 + 에코백 5,000개 + USB 1,000개",
            },
            {
                "name": "단가 범위 (개당)",
                "desc": "저가(~5,000원) / 중가(5,000~20,000원) / 고가(20,000원+)\n로고 인쇄·각인 비용: 개당 500~2,000원 추가",
                "required": "필수", "impact": "상",
                "example": "예) 개당 10,000원 이내 (로고 인쇄 포함)",
            },
            {
                "name": "납기",
                "desc": "표준 2~3주 / 긴급(1주 이내) +20~30% 할증 / 해외 생산 시 4~6주\n중국 OEM: 단가 30~50% 절감이나 품질·납기 리스크",
                "required": "필수", "impact": "중",
                "example": "예) 3주 이내 납품 (국내 생산)",
            },
        ],
        "market_prices": [
            {"service": "텀블러/보온병", "detail": "스텐레스 보온병 500ml 로고 각인", "unit": "개당", "min": "5000", "avg": "10000", "max": "25000", "tips": "5,000개 이상 주문 시 개당 5,000~7,000원 가능"},
            {"service": "에코백", "detail": "캔버스 에코백 로고 인쇄", "unit": "개당", "min": "2000", "avg": "4000", "max": "10000", "tips": "대량(10,000개+) 시 개당 2,000원 이하 가능"},
            {"service": "USB/보조배터리", "detail": "16GB USB 또는 5,000mAh 보조배터리", "unit": "개당", "min": "5000", "avg": "12000", "max": "30000", "tips": "중국 OEM 활용 시 50% 절감, 단 KC인증 필수"},
            {"service": "기프트세트", "detail": "명절/연말 선물세트", "unit": "세트당", "min": "20000", "avg": "50000", "max": "150000", "tips": "성수기(명절 2개월 전) 조기 발주 시 10~15% 절감"},
        ],
        "strategy": "수량 5,000개 이상 확보 후 복수 업체 견적 비교. 국내 생산 우선, 대량은 해외 OEM 검토. KC인증 필수 확인.",
    },
    {
        "category": "비품/소모품",
        "sub_cat": "사무용가구",
        "items": [
            {
                "name": "가구 종류 및 수량",
                "desc": "책상/의자/수납장/파티션/회의테이블 등.\n100세트 이상 시 20~30% 볼륨 디스카운트. 맞춤 제작 시 +30~50%",
                "required": "필수", "impact": "상",
                "example": "예) 책상+의자 200세트 + 회의테이블 10개 + 수납장 100개",
            },
            {
                "name": "등급 (일반/프리미엄/수입)",
                "desc": "일반 국산: 세트당 30~60만원 / 프리미엄 국산: 60~120만원 / 수입: 100~300만원\n인체공학 의자: 일반 10~30만원 / 허먼밀러급: 100~200만원",
                "required": "필수", "impact": "상",
                "example": "예) 일반 국산 (책상+의자 세트 50만원 이내)",
            },
            {
                "name": "설치 및 배송",
                "desc": "배송+설치 포함 vs 별도. 층수·엘리베이터 유무에 따라 설치비 변동.\n대량(50세트+) 무료 설치 협상 가능. 야간/주말 설치 +30% 할증",
                "required": "필수", "impact": "중",
                "example": "예) 배송+설치 포함, 주간 일괄 설치 (2일 소요)",
            },
            {
                "name": "보증 기간",
                "desc": "일반 2~3년 / 프리미엄 5~10년. 의자 가스실린더 별도 보증 확인.\n장기 보증 제품이 교체 비용 고려 시 TCO 유리",
                "required": "옵션", "impact": "하",
                "example": "예) 5년 무상 A/S 보증",
            },
        ],
        "market_prices": [
            {"service": "일반 책상+의자 세트", "detail": "1200x600 책상 + 메쉬 의자", "unit": "세트당", "min": "200000", "avg": "400000", "max": "600000", "tips": "200세트 이상 시 세트당 30만원 이하 협상 가능"},
            {"service": "인체공학 의자", "detail": "기능성 메쉬 의자 (틸팅/럼바)", "unit": "개당", "min": "150000", "avg": "300000", "max": "800000", "tips": "직원 건강 투자. 산재 예방 효과 대비 ROI 높음"},
            {"service": "수납장/캐비넷", "detail": "3단 수납장 (잠금 포함)", "unit": "개당", "min": "80000", "avg": "150000", "max": "300000", "tips": "100개 이상 동일 규격 주문 시 40% 절감"},
        ],
        "strategy": "표준 스펙 설정 후 3개 업체 경쟁 견적. 등급 분리(일반/프리미엄) 운영. 대량 주문 시 설치비 무료 협상.",
    },
    {
        "category": "보험 서비스",
        "sub_cat": "임직원 단체보험",
        "items": [
            {
                "name": "가입 인원 및 대상",
                "desc": "전 직원 / 정규직만 / 임직원+가족 포함. 인원 100명 기준.\n인원 증가 시 인당 보험료 5~15% 절감 (100→500명: -10~15%)",
                "required": "필수", "impact": "상",
                "example": "예) 정규직 300명 + 계약직 100명 = 총 400명",
            },
            {
                "name": "보장 항목",
                "desc": "사망/상해/질병/입원/수술/실손 등. 실손의료비 포함 여부가 핵심.\n실손 포함 시 인당 +월 2~5만원. 사망+상해 기본: 인당 월 1~3만원",
                "required": "필수", "impact": "상",
                "example": "예) 사망 1억 + 상해 3,000만원 + 실손의료비 포함",
            },
            {
                "name": "보험사 및 계약 조건",
                "desc": "3개 보험사 이상 경쟁 입찰 필수. 갱신 조건(손해율 연동 인상률) 확인.\n손해율 80% 이하 유지 시 차기 갱신 인상률 5% 이내 협상 가능",
                "required": "필수", "impact": "상",
                "example": "예) 삼성·현대·DB 3사 경쟁 입찰, 2년 갱신 조건",
            },
        ],
        "market_prices": [
            {"service": "기본 단체보험", "detail": "사망+상해 기본 보장", "unit": "인/월", "min": "10000", "avg": "20000", "max": "35000", "tips": "300명 이상 시 인당 월 15,000원 이하 가능"},
            {"service": "종합 단체보험", "detail": "사망+상해+질병+실손", "unit": "인/월", "min": "25000", "avg": "45000", "max": "80000", "tips": "실손 자기부담금 20% 조건으로 인당 월 5,000원 절감"},
            {"service": "임원 특약", "detail": "임원 전용 고액 보장", "unit": "인/월", "min": "50000", "avg": "100000", "max": "300000", "tips": "D&O(임원배상책임) 별도 가입 필수 검토"},
        ],
        "strategy": "3개 보험사 경쟁입찰 + 손해율 관리. 기본+실손 분리 설계. 2년 장기계약으로 갱신 인상률 캡 설정.",
    },
]


def generate_chunks_for_category(cat_data):
    """단일 카테고리에 대한 청크 생성"""
    category = cat_data["category"]
    sub_cat = cat_data["sub_cat"]
    doc_name = f"[테스트] {sub_cat}_구매가이드.generated"
    chunks = []

    # 1. 구매요청서 항목 청크 (3개씩 묶기)
    items = cat_data["items"]
    for i in range(0, len(items), 3):
        group = items[i:i + 3]
        item_names = ", ".join(it["name"] for it in group)
        question = f"{sub_cat} 구매 시 {item_names}은 어떻게 설정하나요?"

        body_parts = []
        for it in group:
            parts = [f"[{it['name']}]", it["desc"]]
            meta = []
            if it.get("required"):
                meta.append(f"필수여부: {it['required']}")
            if it.get("impact"):
                meta.append(f"단가 영향도: {it['impact']}")
            if meta:
                parts.append(" | ".join(meta))
            if it.get("example"):
                parts.append(f"입력 예시: {it['example']}")
            body_parts.append("\n".join(parts))

        content = f"Q: {question}\n\n" + "\n\n".join(body_parts)
        chunks.append({
            "category": category,
            "sub_cat": sub_cat,
            "doc_name": doc_name,
            "chunk_index": len(chunks),
            "content": content,
            "metadata": {
                "type": "purchase_request",
                "items": [it["name"] for it in group],
                "price_impacts": [it.get("impact", "") for it in group],
            },
        })

    # 2. 시장단가 청크 (2개씩 묶기)
    prices = cat_data.get("market_prices", [])
    for i in range(0, len(prices), 2):
        group = prices[i:i + 2]
        names = " vs ".join(f"{p['service']}({p['detail']})" for p in group)
        question = f"{sub_cat} 시장단가: {names} 비용은 얼마인가요?"

        body_parts = []
        for p in group:
            lines = [
                f"[{p['service']} - {p['detail']}]",
                f"과금 단위: {p['unit']}",
                f"시장가: 최저 {p['min']}원 / 평균 {p['avg']}원 / 최고 {p['max']}원",
            ]
            if p.get("tips"):
                lines.append(f"구매 전략: {p['tips']}")
            body_parts.append("\n".join(lines))

        content = f"Q: {question}\n\n" + "\n\n".join(body_parts)
        chunks.append({
            "category": category,
            "sub_cat": sub_cat,
            "doc_name": doc_name,
            "chunk_index": len(chunks),
            "content": content,
            "metadata": {
                "type": "market_price",
                "items": [f"{p['service']}({p['detail']})" for p in group],
                "price_range": {"min": group[0]["min"], "max": group[0]["max"]},
            },
        })

    # 3. 소싱전략 청크
    strategy = cat_data.get("strategy", "")
    if strategy:
        content = f"Q: {sub_cat} 소싱 전략은?\n\n{strategy}"
        chunks.append({
            "category": category,
            "sub_cat": sub_cat,
            "doc_name": doc_name,
            "chunk_index": len(chunks),
            "content": content,
            "metadata": {"type": "sourcing_strategy"},
        })

    return chunks


def main():
    parser = argparse.ArgumentParser(description="테스트 청크 생성")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--category", default=None, help="특정 카테고리만")
    args = parser.parse_args()

    cats = TEST_CATEGORIES
    if args.category:
        cats = [c for c in cats if args.category in c["sub_cat"] or args.category in c["category"]]

    print(f"\n🧪 테스트 청크 생성 ({len(cats)}개 카테고리)")
    if args.dry_run:
        print("   🔍 DRY RUN 모드\n")

    total_saved = 0
    total_chunks = 0

    for cat_data in cats:
        chunks = generate_chunks_for_category(cat_data)
        total_chunks += len(chunks)
        print(f"\n📦 {cat_data['category']} > {cat_data['sub_cat']}: {len(chunks)}개 청크")

        if args.dry_run:
            for chunk in chunks:
                print(f"  [{chunk['metadata']['type']}] {chunk['content'][:100]}...")
            continue

        supabase = get_client()
        for chunk in chunks:
            try:
                embedding = embed_document(chunk["content"])
                supabase.table("knowledge_chunks").insert({
                    "category": chunk["category"],
                    "sub_cat": chunk["sub_cat"],
                    "doc_name": chunk["doc_name"],
                    "chunk_index": chunk["chunk_index"],
                    "content": chunk["content"],
                    "metadata": chunk["metadata"],
                    "embedding": embedding,
                }).execute()
                total_saved += 1
                time.sleep(0.15)
            except Exception as e:
                print(f"    ✗ 저장 실패: {e}")

    print(f"\n{'🔍 DRY RUN' if args.dry_run else '🎉'} 완료! {total_saved}/{total_chunks} 청크\n")


if __name__ == "__main__":
    main()

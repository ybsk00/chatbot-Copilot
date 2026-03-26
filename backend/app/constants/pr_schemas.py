"""구매요청서(PR) 스키마 — 공통필드(c1~c20) + 고유필드(p1~pN) 구조

공통 필드: c1~c20 (모든 카테고리에 동일)
고유 필드: p1~pN (카테고리별 상이)
required: c1~c5 공통 필수 + 카테고리별 고유 필수
"""


# ── 공통 필드 ──────────────────────────────────────────────────
COMMON_FIELDS_STR = (
    "c1:발주기관명, c2:요청부서, c3:요청자, c4:연락처, c5:이메일, "
    "c6:서비스/품목명, c7:구매/계약 목적, c8:계약 유형, c9:계약 기간, c10:대상 규모/수량, "
    "c11:서비스 범위/요구 사양, c12:제공/수행 방식, c13:품질/SLA 기준, c14:보안/법적 요건, "
    "c15:단가 산정 방식, c16:구간 할인 적용, c17:결제 주기 및 방식, "
    "c18:단가 인상/에스컬레이션 조건, c19:계약 해지/위약금 조건, c20:BSM/전산 연동 조건"
)

COMMON_REQUIRED = "c1,c2,c3,c4,c5"

# 공통 섹션 (sections_detail 조립용)
COMMON_SECTIONS_PREFIX = "요청자 정보:c1,c2,c3,c4,c5|계약 기본 정보:c6,c7,c8,c9,c10|서비스 요건:c11,c12,c13,c14"
COMMON_SECTIONS_SUFFIX = "결제·계약 조건:c15,c16,c17,c18,c19,c20"


def _build_fields(unique: str) -> str:
    return COMMON_FIELDS_STR + ", " + unique


def _build_sections_detail(unique_sections: str) -> str:
    return COMMON_SECTIONS_PREFIX + "|" + unique_sections + "|" + COMMON_SECTIONS_SUFFIX


def _build_required(unique_required: str) -> str:
    if unique_required:
        return COMMON_REQUIRED + "," + unique_required
    return COMMON_REQUIRED


def _build_sections(common_and_unique: list[str]) -> str:
    """사람 읽기용 sections 문자열 — 번호 매기기"""
    parts = [
        "요청자 정보 (발주기관명, 요청부서, 요청자, 연락처, 이메일)",
        "계약 기본 정보 (서비스/품목명, 구매/계약 목적, 계약 유형, 계약 기간, 대상 규모/수량)",
        "서비스 요건 (서비스 범위/요구 사양, 제공/수행 방식, 품질/SLA 기준, 보안/법적 요건)",
    ] + common_and_unique + [
        "결제·계약 조건 (단가 산정 방식, 구간 할인 적용, 결제 주기 및 방식, 단가 인상/에스컬레이션 조건, 계약 해지/위약금 조건, BSM/전산 연동 조건)",
    ]
    return "\n".join(f"{i+1}. {p}" for i, p in enumerate(parts))


# ── PR 스키마 ──────────────────────────────────────────────────
PR_SCHEMAS = {
    "air_purifier_rental": {
        "label": "공기청정기 렌탈 서비스",
        "category": "건물 관리",
        "sub_category": "공기청정기 렌탈 서비스",
        "fields": _build_fields(
            "p1:설치 시설 유형 및 위치, p2:서비스 시작(설치 희망)일, p3:적용 공간 면적 및 사용 환경, "
            "p4:기기 등급 및 CADR 수치, p5:필터 등급 요건, p6:추가 기능 요건, p7:소음 기준 (dB), "
            "p8:필터 교체 주기 및 포함 여부, p9:정기 위생 점검 방문 횟수, "
            "p10:설치 방식, p11:기기 이전 서비스 조건, p12:고장 시 대체 기기 제공"
        ),
        "required": _build_required("p1,p2,p3,p4,p5,p8,p9,p10,p12"),
        "sections": _build_sections([
            "기기 사양 및 환경 (설치 시설 유형 및 위치, 서비스 시작(설치 희망)일, 적용 공간 면적 및 사용 환경, 기기 등급 및 CADR 수치, 필터 등급 요건, 추가 기능 요건, 소음 기준 (dB))",
            "필터 및 위생 관리 (필터 교체 주기 및 포함 여부, 정기 위생 점검 방문 횟수)",
            "설치·이전·A/S (설치 방식, 기기 이전 서비스 조건, 고장 시 대체 기기 제공)",
        ]),
        "sections_detail": _build_sections_detail(
            "기기 사양 및 환경:p1,p2,p3,p4,p5,p6,p7|필터 및 위생 관리:p8,p9|설치·이전·A/S:p10,p11,p12"
        ),
    },
    "copier_rental": {
        "label": "복합기 렌탈 서비스",
        "category": "건물 관리",
        "sub_category": "복합기 렌탈 서비스",
        "fields": _build_fields(
            "p1:설치 시설 유형 및 위치, p2:서비스 시작(설치 희망)일, p3:기기 등급 및 인쇄 속도 (ppm), "
            "p4:A3 출력 지원 여부, p5:컬러 복합기 vs 흑백 전용, p6:팩스·스캔·복사 기능 요건, "
            "p7:월 예상 총 출력량 (매수), p8:과금 방식, "
            "p9:토너·드럼 포함 여부, p10:보안 기능 요건, p11:네트워크 연결 방식, "
            "p12:A/S 출동 응답 시간, p13:대체 기기 제공 조건, p14:정기 예방 점검 횟수, p15:원격 진단·모니터링"
        ),
        "required": _build_required("p1,p2,p3,p4,p5,p6,p7,p8,p9,p10,p11,p12,p13,p14"),
        "sections": _build_sections([
            "기기 사양 및 구성 (설치 시설 유형 및 위치, 서비스 시작(설치 희망)일, 기기 등급 및 인쇄 속도 (ppm), A3 출력 지원 여부, 컬러 복합기 vs 흑백 전용, 팩스·스캔·복사 기능 요건)",
            "출력량 및 과금 (월 예상 총 출력량 (매수), 과금 방식)",
            "소모품·보안·네트워크 (토너·드럼 포함 여부, 보안 기능 요건, 네트워크 연결 방식)",
            "A/S 및 유지보수 (A/S 출동 응답 시간, 대체 기기 제공 조건, 정기 예방 점검 횟수, 원격 진단·모니터링)",
        ]),
        "sections_detail": _build_sections_detail(
            "기기 사양 및 구성:p1,p2,p3,p4,p5,p6|출력량 및 과금:p7,p8|소모품·보안·네트워크:p9,p10,p11|A/S 및 유지보수:p12,p13,p14,p15"
        ),
    },
    "bidet_rental": {
        "label": "비데 렌탈 서비스",
        "category": "건물 관리",
        "sub_category": "비데 렌탈 서비스",
        "fields": _build_fields(
            "p1:설치 시설 유형 및 위치, p2:서비스 시작(설치 희망)일, p3:기기 등급 및 주요 기능, "
            "p4:스마트 기능 (IoT·앱 연동), p5:변기 형태 및 호환성, "
            "p6:위생 관리 방문 횟수, p7:위생 관리 작업 범위, "
            "p8:설치 방식 및 비용, p9:고장 시 대체 기기 제공, p10:누수 보상 책임 범위"
        ),
        "required": _build_required("p1,p2,p3,p5,p6,p7,p8,p9,p10"),
        "sections": _build_sections([
            "기기 사양 (설치 시설 유형 및 위치, 서비스 시작(설치 희망)일, 기기 등급 및 주요 기능, 스마트 기능 (IoT·앱 연동), 변기 형태 및 호환성)",
            "위생 관리 (위생 관리 방문 횟수, 위생 관리 작업 범위)",
            "설치·A/S (설치 방식 및 비용, 고장 시 대체 기기 제공, 누수 보상 책임 범위)",
        ]),
        "sections_detail": _build_sections_detail(
            "기기 사양:p1,p2,p3,p4,p5|위생 관리:p6,p7|설치·A/S:p8,p9,p10"
        ),
    },
    "document_shredding": {
        "label": "문서파기 서비스",
        "category": "건물 관리",
        "sub_category": "문서파기 서비스",
        "fields": _build_fields(
            "p1:파기 발생 사업장 수 및 위치, p2:서비스 시작 희망일, p3:연간 파기 예상 물량, "
            "p4:종이 문서 파기 물량, p5:디지털 매체 파기 종류 및 수량, p6:기밀 등급 분류, "
            "p7:문서 파기 등급 (DIN 66399), p8:현장 파기 vs 수거 후 파기, "
            "p9:수거 주기 및 방문 횟수, p10:보안 봉투·잠금 박스 제공, "
            "p11:파기 증명서 발급 방식, p12:정보보호 인증 보유 여부, p13:파기 기록 보관 기간"
        ),
        "required": _build_required("p1,p2,p3,p4,p6,p7,p8,p9,p10,p11,p12,p13"),
        "sections": _build_sections([
            "파기 물량 및 구성 (파기 발생 사업장 수 및 위치, 서비스 시작 희망일, 연간 파기 예상 물량, 종이 문서 파기 물량, 디지털 매체 파기 종류 및 수량, 기밀 등급 분류)",
            "파기 방법 및 보안 등급 (문서 파기 등급 (DIN 66399), 현장 파기 vs 수거 후 파기)",
            "수거·증명·인증 (수거 주기 및 방문 횟수, 보안 봉투·잠금 박스 제공, 파기 증명서 발급 방식, 정보보호 인증 보유 여부, 파기 기록 보관 기간)",
        ]),
        "sections_detail": _build_sections_detail(
            "파기 물량 및 구성:p1,p2,p3,p4,p5,p6|파기 방법 및 보안 등급:p7,p8|수거·증명·인증:p9,p10,p11,p12,p13"
        ),
    },
    "physical_security": {
        "label": "물리보안 서비스",
        "category": "건물 관리",
        "sub_category": "물리보안 서비스",
        "fields": _build_fields(
            "p1:시설 유형 및 위치, p2:서비스 시작(설치 희망)일, p3:CCTV 카메라 설치 대수, "
            "p4:카메라 해상도, p5:야간 촬영 방식, p6:AI 분석 기능, p7:영상 저장 기간, "
            "p8:출입통제 적용 문 수량, p9:인증 방식, p10:차량 게이트 수량 및 인식 방식, "
            "p11:보행자 스피드게이트, "
            "p12:NVR 사양 및 채널 수, p13:통합 관리 플랫폼 (VMS), p14:원격 모니터링·모바일 앱, "
            "p15:네트워크 인프라 요건, "
            "p16:정기 예방 점검, p17:하드웨어 보증 기간, p18:시스템 확장성"
        ),
        "required": _build_required("p1,p2,p3,p4,p5,p7,p8,p9,p12,p13,p15,p16,p17"),
        "sections": _build_sections([
            "CCTV 사양 및 설치 (시설 유형 및 위치, 서비스 시작(설치 희망)일, CCTV 카메라 설치 대수, 카메라 해상도, 야간 촬영 방식, AI 분석 기능, 영상 저장 기간)",
            "출입통제·게이트 (출입통제 적용 문 수량, 인증 방식, 차량 게이트 수량 및 인식 방식, 보행자 스피드게이트)",
            "NVR·관제·네트워크 (NVR 사양 및 채널 수, 통합 관리 플랫폼 (VMS), 원격 모니터링·모바일 앱, 네트워크 인프라 요건)",
            "유지보수·확장 (정기 예방 점검, 하드웨어 보증 기간, 시스템 확장성)",
        ]),
        "sections_detail": _build_sections_detail(
            "CCTV 사양 및 설치:p1,p2,p3,p4,p5,p6,p7|출입통제·게이트:p8,p9,p10,p11|NVR·관제·네트워크:p12,p13,p14,p15|유지보수·확장:p16,p17,p18"
        ),
    },
    "pest_control": {
        "label": "방역소독 서비스",
        "category": "건물 관리",
        "sub_category": "방역소독 서비스",
        "fields": _build_fields(
            "p1:관리 대상 해충 범위, p2:서비스 시작 희망일, p3:정기 방문 횟수 (월), "
            "p4:방문 시간대 요건, p5:긴급 출동 서비스 포함, "
            "p6:친환경·저독성 약제 요구, p7:적용 공법, "
            "p8:IoT 모니터링 장비 설치, p9:서비스 리포트 형식 및 주기, p10:담당 PM(현장관리자) 지정"
        ),
        "required": _build_required("p1,p2,p3,p4,p6,p7,p9,p10"),
        "sections": _build_sections([
            "방역 대상 및 일정 (관리 대상 해충 범위, 서비스 시작 희망일, 정기 방문 횟수 (월), 방문 시간대 요건, 긴급 출동 서비스 포함)",
            "약제·공법 (친환경·저독성 약제 요구, 적용 공법)",
            "모니터링·리포팅 (IoT 모니터링 장비 설치, 서비스 리포트 형식 및 주기, 담당 PM(현장관리자) 지정)",
        ]),
        "sections_detail": _build_sections_detail(
            "방역 대상 및 일정:p1,p2,p3,p4,p5|약제·공법:p6,p7|모니터링·리포팅:p8,p9,p10"
        ),
    },
    "security_guard": {
        "label": "보안경비 용역 서비스",
        "category": "건물 관리",
        "sub_category": "보안경비 용역 서비스",
        "fields": _build_fields(
            "p1:경비 서비스 유형, p2:경비 대상 시설 유형, p3:서비스 시작 희망일, "
            "p4:경비 구역 면적 및 층수, p5:운영 시간대 및 교대 방식, p6:주말·공휴일 운영 여부, "
            "p7:특수 자격 보유 인력 요건, p8:순찰 횟수 및 경로, p9:방문객·차량 통제 업무, "
            "p10:CCTV 모니터링 업무 포함, "
            "p11:경비 장비 제공 주체, p12:유니폼 및 명찰 기준"
        ),
        "required": _build_required("p1,p2,p3,p4,p5,p6,p7,p8,p9,p11,p12"),
        "sections": _build_sections([
            "경비 운영 체계 (경비 서비스 유형, 경비 대상 시설 유형, 서비스 시작 희망일, 경비 구역 면적 및 층수, 운영 시간대 및 교대 방식, 주말·공휴일 운영 여부)",
            "업무 범위 (특수 자격 보유 인력 요건, 순찰 횟수 및 경로, 방문객·차량 통제 업무, CCTV 모니터링 업무 포함)",
            "인력·장비 (경비 장비 제공 주체, 유니폼 및 명찰 기준)",
        ]),
        "sections_detail": _build_sections_detail(
            "경비 운영 체계:p1,p2,p3,p4,p5,p6|업무 범위:p7,p8,p9,p10|인력·장비:p11,p12"
        ),
    },
    "safety_management": {
        "label": "안전관리 서비스",
        "category": "건물 관리",
        "sub_category": "안전관리 서비스",
        "fields": _build_fields(
            "p1:대상 시설 유형 및 주소, p2:서비스 시작 희망일, p3:승강기 총 대수 및 유형, "
            "p4:승강기 설치 연도 및 노후도, p5:월 유지관리 방문 횟수, p6:부품 교체 비용 포함 여부, "
            "p7:24시간 긴급출동 서비스, "
            "p8:전기설비 정기검사·점검, p9:가스설비 정기검사·점검, "
            "p10:소방시설 종합정밀점검, p11:소방안전관리자 선임 대행, "
            "p12:환경측정 (실내공기질·소음), p13:법정검사 만료일 관리, p14:법정 검사 성적서 및 보고서"
        ),
        "required": _build_required("p1,p2,p3,p4,p5,p6,p7,p8,p9,p10,p11,p13,p14"),
        "sections": _build_sections([
            "승강기 유지관리 (대상 시설 유형 및 주소, 서비스 시작 희망일, 승강기 총 대수 및 유형, 승강기 설치 연도 및 노후도, 월 유지관리 방문 횟수, 부품 교체 비용 포함 여부, 24시간 긴급출동 서비스)",
            "전기·가스·기계 설비 (전기설비 정기검사·점검, 가스설비 정기검사·점검)",
            "소방·환경·법정검사 (소방시설 종합정밀점검, 소방안전관리자 선임 대행, 환경측정 (실내공기질·소음), 법정검사 만료일 관리, 법정 검사 성적서 및 보고서)",
        ]),
        "sections_detail": _build_sections_detail(
            "승강기 유지관리:p1,p2,p3,p4,p5,p6,p7|전기·가스·기계 설비:p8,p9|소방·환경·법정검사:p10,p11,p12,p13,p14"
        ),
    },
    "mandatory_education": {
        "label": "법정의무교육",
        "category": "교육 서비스",
        "sub_category": "법정의무교육",
        "fields": _build_fields(
            "p1:사업장 유형 및 업종, p2:교육 시작 희망일, p3:직군·직책별 교육 대상 구분, "
            "p4:신규 입사자 연간 예상 인원, "
            "p5:산업안전보건교육 구성, p6:직장 내 성희롱 예방교육, "
            "p7:개인정보보호 교육, p8:장애인 인식개선 교육, p9:소방안전교육, "
            "p10:기타 법정교육, "
            "p11:LMS 플랫폼 기능 요건, p12:이수 증빙 발급 및 보관, "
            "p13:콘텐츠 법령 최신화, p14:고용보험 환급 연계"
        ),
        "required": _build_required("p1,p2,p3,p5,p6,p7,p8,p9,p11,p12,p13"),
        "sections": _build_sections([
            "교육 대상 및 구성 (사업장 유형 및 업종, 교육 시작 희망일, 직군·직책별 교육 대상 구분, 신규 입사자 연간 예상 인원)",
            "법정 5대 의무교육 (산업안전보건교육 구성, 직장 내 성희롱 예방교육, 개인정보보호 교육, 장애인 인식개선 교육, 소방안전교육)",
            "기타 법정교육 (기타 법정교육)",
            "LMS·증빙·환급 (LMS 플랫폼 기능 요건, 이수 증빙 발급 및 보관, 콘텐츠 법령 최신화, 고용보험 환급 연계)",
        ]),
        "sections_detail": _build_sections_detail(
            "교육 대상 및 구성:p1,p2,p3,p4|법정 5대 의무교육:p5,p6,p7,p8,p9|기타 법정교육:p10|LMS·증빙·환급:p11,p12,p13,p14"
        ),
    },
    "language_education": {
        "label": "어학교육",
        "category": "교육 서비스",
        "sub_category": "어학교육",
        "fields": _build_fields(
            "p1:교육 시작 희망일, p2:총 수강 인원 구성, p3:초기 레벨 테스트, "
            "p4:영어 과정 구성, p5:일본어 과정 구성, p6:중국어 과정 구성, "
            "p7:수업 형태, p8:그룹 수업 인원, p9:원어민 강사 vs 비원어민, "
            "p10:출장·재택 수강자 대응, p11:교재 및 학습 자료, "
            "p12:강사 자격 요건, p13:강사 교체 정책, p14:레벨 테스트 주기, p15:학습 성과 리포트"
        ),
        "required": _build_required("p1,p2,p3,p4,p7,p8,p9,p11,p12,p14,p15"),
        "sections": _build_sections([
            "수강 대상 및 구성 (교육 시작 희망일, 총 수강 인원 구성, 초기 레벨 테스트)",
            "언어별 과정 (영어 과정 구성, 일본어 과정 구성, 중국어 과정 구성)",
            "수업 형태 및 강사 (수업 형태, 그룹 수업 인원, 원어민 강사 vs 비원어민, 출장·재택 수강자 대응, 교재 및 학습 자료)",
            "성과 측정 (강사 자격 요건, 강사 교체 정책, 레벨 테스트 주기, 학습 성과 리포트)",
        ]),
        "sections_detail": _build_sections_detail(
            "수강 대상 및 구성:p1,p2,p3|언어별 과정:p4,p5,p6|수업 형태 및 강사:p7,p8,p9,p10,p11|성과 측정:p12,p13,p14,p15"
        ),
    },
    "professional_education": {
        "label": "전문교육",
        "category": "교육 서비스",
        "sub_category": "전문교육",
        "fields": _build_fields(
            "p1:교육 시작 희망일, p2:연간 교육 계획 수립, p3:총 수강 인원 및 직급 구분, "
            "p4:리더십 기본 과정, p5:임원·경영진 리더십, p6:직무 전문 교육, "
            "p7:디지털 전환·AI·데이터 과정, p8:IT 자격증 취득 지원, "
            "p9:임원·관리자 코칭, p10:교육 방식 (집합/온라인), "
            "p11:강사 등급 및 단가 기준, p12:강사 자격 요건, p13:커리큘럼 커스터마이징, "
            "p14:사전·사후 역량 평가, p15:교육 성과 보고서"
        ),
        "required": _build_required("p1,p2,p3,p4,p5,p6,p7,p9,p10,p11,p12,p13,p14,p15"),
        "sections": _build_sections([
            "교육 대상 및 계획 (교육 시작 희망일, 연간 교육 계획 수립, 총 수강 인원 및 직급 구분)",
            "교육 과정 구성 (리더십 기본 과정, 임원·경영진 리더십, 직무 전문 교육, 디지털 전환·AI·데이터 과정, IT 자격증 취득 지원)",
            "코칭·강사·커리큘럼 (임원·관리자 코칭, 교육 방식 (집합/온라인), 강사 등급 및 단가 기준, 강사 자격 요건, 커리큘럼 커스터마이징)",
            "성과 측정 (사전·사후 역량 평가, 교육 성과 보고서)",
        ]),
        "sections_detail": _build_sections_detail(
            "교육 대상 및 계획:p1,p2,p3|교육 과정 구성:p4,p5,p6,p7,p8|코칭·강사·커리큘럼:p9,p10,p11,p12,p13|성과 측정:p14,p15"
        ),
    },
    "digital_ad": {
        "label": "디지털 광고 제작 및 운영",
        "category": "마케팅",
        "sub_category": "디지털 광고 제작 및 운영",
        "fields": _build_fields(
            "p1:캠페인 시작 희망일, p2:타겟 오디언스 정의, p3:미디어 믹스 전략, "
            "p4:네이버 검색광고 (파워링크), p5:구글 검색광고 (Google Ads), "
            "p6:네이버 프리미엄 DA, p7:Google 디스플레이 네트워크 (GDN), "
            "p8:Meta 광고 (Instagram·Facebook), p9:YouTube 광고, p10:TikTok 광고, "
            "p11:배너·디스플레이 소재 제작, p12:동영상 광고 소재 제작, p13:소재 A/B 테스트, "
            "p14:KPI 및 목표 지표, p15:트래킹 세팅, p16:리포팅 주기 및 형식, "
            "p17:광고 심의 (업종별 사전 심의), p18:Brand Safety (게재 위치 안전성)"
        ),
        "required": _build_required("p1,p2,p3,p4,p5,p8,p9,p11,p12,p13,p14,p15,p16,p17,p18"),
        "sections": _build_sections([
            "캠페인 전략 (캠페인 시작 희망일, 타겟 오디언스 정의, 미디어 믹스 전략)",
            "검색광고 (네이버 검색광고 (파워링크), 구글 검색광고 (Google Ads))",
            "디스플레이·DA (네이버 프리미엄 DA, Google 디스플레이 네트워크 (GDN))",
            "SNS·동영상 (Meta 광고 (Instagram·Facebook), YouTube 광고, TikTok 광고)",
            "소재 제작 (배너·디스플레이 소재 제작, 동영상 광고 소재 제작, 소재 A/B 테스트)",
            "KPI·리포팅·심의 (KPI 및 목표 지표, 트래킹 세팅, 리포팅 주기 및 형식, 광고 심의 (업종별 사전 심의), Brand Safety (게재 위치 안전성))",
        ]),
        "sections_detail": _build_sections_detail(
            "캠페인 전략:p1,p2,p3|검색광고:p4,p5|디스플레이·DA:p6,p7|SNS·동영상:p8,p9,p10|소재 제작:p11,p12,p13|KPI·리포팅·심의:p14,p15,p16,p17,p18"
        ),
    },
    "viral_marketing": {
        "label": "바이럴 마케팅 대행",
        "category": "마케팅",
        "sub_category": "바이럴 마케팅 대행",
        "fields": _build_fields(
            "p1:캠페인 시작 희망일, p2:타겟 고객 정의, p3:채널 전략 및 믹스, "
            "p4:인플루언서 등급·규모, p5:인플루언서 선정 기준, p6:콘텐츠 형식 및 횟수, "
            "p7:전속·배타 계약 조건, "
            "p8:SNS 채널 계정 운영 대행, p9:커뮤니티 관리 (댓글·DM 대응), "
            "p10:블로그·SEO 마케팅, p11:체험단·리뷰 콘텐츠, p12:바이럴 기사·보도자료, "
            "p13:성과 리포팅 주기 및 형식, p14:바이럴 지수·확산 측정, "
            "p15:표시광고법·추천보증 가이드라인, p16:콘텐츠 저작권 귀속"
        ),
        "required": _build_required("p1,p2,p3,p4,p5,p6,p8,p10,p11,p13,p14,p15,p16"),
        "sections": _build_sections([
            "캠페인 전략 (캠페인 시작 희망일, 타겟 고객 정의, 채널 전략 및 믹스)",
            "인플루언서 마케팅 (인플루언서 등급·규모, 인플루언서 선정 기준, 콘텐츠 형식 및 횟수, 전속·배타 계약 조건)",
            "콘텐츠 운영 (SNS 채널 계정 운영 대행, 커뮤니티 관리 (댓글·DM 대응))",
            "검색·블로그·바이럴 (블로그·SEO 마케팅, 체험단·리뷰 콘텐츠, 바이럴 기사·보도자료)",
            "성과·법적 요건 (성과 리포팅 주기 및 형식, 바이럴 지수·확산 측정, 표시광고법·추천보증 가이드라인, 콘텐츠 저작권 귀속)",
        ]),
        "sections_detail": _build_sections_detail(
            "캠페인 전략:p1,p2,p3|인플루언서 마케팅:p4,p5,p6,p7|콘텐츠 운영:p8,p9|검색·블로그·바이럴:p10,p11,p12|성과·법적 요건:p13,p14,p15,p16"
        ),
    },
    "landscaping": {
        "label": "조경관리 용역 서비스",
        "category": "건물 관리",
        "sub_category": "조경관리 용역 서비스",
        "fields": _build_fields(
            "p1:대상 시설 유형 및 위치, p2:서비스 시작 희망일, p3:수목 총 수량 및 구성, "
            "p4:수목 전정 횟수 (연간), p5:수목 식재 및 교체, "
            "p6:잔디 면적 및 관리, p7:초화류 식재 및 교체, p8:관수 시스템 운영, "
            "p9:병해충 방제, p10:조경 시설물 유지관리, p11:동절기 월동 관리, p12:낙엽 수거 및 청소, "
            "p13:작업 일지 및 보고서, p14:현장 담당자 지정"
        ),
        "required": _build_required("p1,p2,p3,p4,p5,p6,p7,p8,p9,p10,p11,p12,p13,p14"),
        "sections": _build_sections([
            "수목 관리 (대상 시설 유형 및 위치, 서비스 시작 희망일, 수목 총 수량 및 구성, 수목 전정 횟수 (연간), 수목 식재 및 교체)",
            "잔디·초화류·관수 (잔디 면적 및 관리, 초화류 식재 및 교체, 관수 시스템 운영)",
            "방제·시설물·동절기 (병해충 방제, 조경 시설물 유지관리, 동절기 월동 관리, 낙엽 수거 및 청소)",
            "리포팅·관리 (작업 일지 및 보고서, 현장 담당자 지정)",
        ]),
        "sections_detail": _build_sections_detail(
            "수목 관리:p1,p2,p3,p4,p5|잔디·초화류·관수:p6,p7,p8|방제·시설물·동절기:p9,p10,p11,p12|리포팅·관리:p13,p14"
        ),
    },
    "electronic_market_info": {
        "label": "전자시장정보 구독 서비스",
        "category": "마케팅",
        "sub_category": "전자시장정보 구독 서비스",
        "fields": _build_fields(
            "p1:서비스 제공업체, p2:정보 제공 범위, p3:데이터 갱신 주기, "
            "p4:맞춤 리포트 제공, p5:교육·컨설팅 지원"
        ),
        "required": _build_required("p1,p2,p3"),
        "sections": _build_sections([
            "서비스 상세 (서비스 제공업체, 정보 제공 범위, 데이터 갱신 주기, 맞춤 리포트 제공, 교육·컨설팅 지원)",
        ]),
        "sections_detail": _build_sections_detail(
            "서비스 상세:p1,p2,p3,p4,p5"
        ),
    },
    "_generic": {
        "label": "일반 구매요청",
        "category": "",
        "sub_category": "",
        "fields": _build_fields(
            "p1:품목/서비스명, p2:구매 목적, p3:수량/규모, p4:희망 납기일, "
            "p5:요구 사양, p6:기타 요구사항"
        ),
        "required": _build_required("p1,p2,p3,p4"),
        "sections": _build_sections([
            "구매 상세 (품목/서비스명, 구매 목적, 수량/규모, 희망 납기일, 요구 사양, 기타 요구사항)",
        ]),
        "sections_detail": _build_sections_detail(
            "구매 상세:p1,p2,p3,p4,p5,p6"
        ),
    },
}


# 분류체계 → PR 카테고리 매핑 (키워드 기반)
TAXONOMY_TO_PR = {
    "건물 관리": {
        "공기청정기": "air_purifier_rental",
        "복합기": "copier_rental",
        "비데": "bidet_rental",
        "문서파기": "document_shredding",
        "물리보안": "physical_security",
        "CCTV": "physical_security",
        "방역": "pest_control",
        "소독": "pest_control",
        "보안경비": "security_guard",
        "경비": "security_guard",
        "안전관리": "safety_management",
        "안전": "safety_management",
        "승강기": "safety_management",
        "소방": "safety_management",
        "조경": "landscaping",
        "_default": "_generic",
    },
    "마케팅": {
        "디지털": "digital_ad",
        "광고": "digital_ad",
        "배너": "digital_ad",
        "바이럴": "viral_marketing",
        "인플루언서": "viral_marketing",
        "SNS": "viral_marketing",
        "블로그": "viral_marketing",
        "전자시장": "market_data_subscription",
        "GFK": "market_data_subscription",
        "NPD": "market_data_subscription",
        "_default": "_generic",
    },
    "교육 서비스": {
        "법정": "mandatory_education",
        "의무교육": "mandatory_education",
        "산업안전": "mandatory_education",
        "성희롱": "mandatory_education",
        "어학": "language_education",
        "영어": "language_education",
        "일본어": "language_education",
        "중국어": "language_education",
        "전문교육": "professional_education",
        "직무교육": "professional_education",
        "리더십": "professional_education",
        "_default": "_generic",
    },
}


# ── DB-first PR 스키마 로딩 (139개 L3 템플릿) ──────────────────
def load_pr_schemas_from_db():
    """pr_templates 테이블에서 139개 L3 템플릿을 PR_SCHEMAS에 로드"""
    try:
        from app.db.supabase_client import get_client
        sb = get_client()
        rows = sb.table("pr_templates").select("*").eq("is_active", True).execute().data
        if not rows:
            return 0

        loaded = 0
        for row in rows:
            key = row["type_key"]
            fields_json = row.get("fields", {})
            sections_json = row.get("sections", [])

            # fields → "key:label, ..." 문자열
            fields_str = ", ".join(f"{k}:{v['label']}" for k, v in fields_json.items())

            # required → "key1,key2,..." 문자열
            required_str = ",".join(k for k, v in fields_json.items() if v.get("required"))

            # sections → 사람 읽기용 문자열
            sections_parts = []
            for s in sections_json:
                field_labels = []
                for fk in s.get("fields", []):
                    if fk in fields_json:
                        field_labels.append(fields_json[fk]["label"])
                sections_parts.append(f"{s['title']} ({', '.join(field_labels)})")
            sections_str = "\n".join(sections_parts)

            # sections_detail → "섹션명:f1,f2|..." 문자열
            detail_parts = []
            for s in sections_json:
                title = s["title"].split(". ", 1)[-1] if ". " in s["title"] else s["title"]
                detail_parts.append(f"{title}:{','.join(s.get('fields', []))}")
            sections_detail_str = "|".join(detail_parts)

            PR_SCHEMAS[key] = {
                "label": row.get("name", key),
                "category": row.get("description", ""),
                "fields": fields_str,
                "required": required_str,
                "sections": sections_str,
                "sections_detail": sections_detail_str,
            }
            loaded += 1

        return loaded
    except Exception as e:
        print(f"[PR_SCHEMAS] DB 로드 실패, 하드코딩 fallback 사용: {e}")
        return 0


# 서버 시작 시 자동 로드
_db_loaded = load_pr_schemas_from_db()
if _db_loaded:
    print(f"[PR_SCHEMAS] DB에서 {_db_loaded}개 PR 템플릿 로드 완료")
else:
    print(f"[PR_SCHEMAS] DB 로드 실패, 하드코딩 {len(PR_SCHEMAS)}개 사용")


PR_PHASE_PROMPT = """사용자 메시지에서 구매요청서 필드 값을 추출하여 JSON만 반환하세요. 설명 없이 JSON만.

## 전체 필드 목록
{fields}

## 섹션 구조
{sections}

## 현재 상태
- 현재 phase: {phase}
- 이미 채워진 필드: {filled_keys}
- 주요 필수 필드: {required_keys}

## 핵심 규칙
1. 대화 이력에서 AI가 마지막으로 요청한 섹션과 필드 목록을 정확히 확인하세요.
2. 사용자의 현재 메시지는 AI가 요청한 필드에 대한 답변입니다.
3. 사용자 입력을 AI가 요청한 필드 순서대로 1:1 매핑하세요.
   - 쉼표로 구분된 경우: 쉼표 기준으로 분리 후 순서대로 매핑
   - 쉼표가 부족한 경우: 의미 단위로 분리하세요.
   - 핵심: 요청 필드 N개에 대해 값 N개를 추출하여 순서대로 매핑하세요.
4. 하나의 필드에 여러 값을 합치지 마세요.
5. 아직 요청하지 않은 섹션의 필드에 값을 넣지 마세요.
6. 이미 채워진 필드는 다시 추출하지 마세요.
7. is_complete: 이미 채워진 필드 + 새로 추출한 필드로 주요 필수 필드가 모두 채워졌으면 true.

## 대화 이력
{history}

## 현재 사용자 메시지
{message}

## 출력 형식
{{"pr_fields": {{"p1": "값", "p2": "값"}}, "is_complete": false}}"""

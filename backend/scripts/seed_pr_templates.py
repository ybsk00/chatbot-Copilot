"""PR(구매요청서) 템플릿 시드 스크립트 — Excel 기본값 포함"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from dotenv import load_dotenv
load_dotenv()

from app.db.supabase_client import get_client

# ═══════════════════════════════════════════
# 16개 PR 템플릿 (Excel 기본값 포함)
# ═══════════════════════════════════════════

TEMPLATES = [
    # ── 1. 공기청정기 렌탈 서비스 ──
    {
        "type_key": "air_purifier_rental",
        "name": "공기청정기 렌탈 서비스",
        "description": "건물 관리 공기청정기 렌탈 서비스",
        "fields": {
            "p1":  {"label": "설치 시설 유형 및 위치", "value": "", "default": "사무실 (서울 강남구, 지상 12층 건물)"},
            "p2":  {"label": "총 렌탈 대수", "value": "", "default": "총 50대 (사무실 40대 + 회의실 10대)"},
            "p3":  {"label": "계약 기간", "value": "", "default": "3년 약정 (36개월)"},
            "p4":  {"label": "서비스 시작(설치 희망)일", "value": "", "default": ""},
            "p5":  {"label": "렌탈 방식", "value": "", "default": "순수 렌탈 (계약 종료 후 반납)"},
            "p6":  {"label": "적용 공간 면적 및 사용 환경", "value": "", "default": "개인 사무 9㎡x30개, 회의실 30㎡x5개, 휴게실 20㎡x5개"},
            "p7":  {"label": "기기 등급 및 CADR 수치", "value": "", "default": "9㎡ 공간 → CADR 200 이상 기기 요청"},
            "p8":  {"label": "필터 등급 요건", "value": "", "default": "H13 HEPA + 활성탄 탈취 필터 복합 구성"},
            "p9":  {"label": "추가 기능 요건", "value": "", "default": "PM2.5 센서 + 공기질 디스플레이 + 앱 연동"},
            "p10": {"label": "소음 기준 (dB)", "value": "", "default": "수면 모드 기준 30dB 이하"},
            "p11": {"label": "브랜드·제조사 지정 여부", "value": "", "default": "브랜드 무관, CADR/필터 등급 기준 충족 시 허용"},
            "p12": {"label": "디자인·색상 요건", "value": "", "default": "화이트 또는 라이트그레이 계열 선호"},
            "p13": {"label": "필터 교체 포함 여부", "value": "", "default": "전 필터 교체 비용 렌탈료에 포함"},
            "p14": {"label": "연간 필터 교체 횟수", "value": "", "default": "HEPA 연 1회, 프리필터 연 2회, 탈취 연 2회"},
            "p15": {"label": "필터 자가 세척 가능 여부", "value": "", "default": "프리필터 물세척 가능 제품 우선 선정"},
            "p16": {"label": "정기 위생 점검 방문 횟수", "value": "", "default": "연 2회 정기 위생 점검 방문 포함"},
            "p17": {"label": "필터 성능 인증 요건", "value": "", "default": "CA인증 제품 필수"},
            "p18": {"label": "설치 방식", "value": "", "default": "스탠드형 45대 + 벽걸이형 5대"},
            "p19": {"label": "초기 설치비 포함 여부", "value": "", "default": "초기 설치비 렌탈료에 포함 (50대 이상)"},
            "p20": {"label": "기기 이전 서비스 조건", "value": "", "default": "계약 기간 내 이전 서비스 연 2회 무료 포함"},
            "p21": {"label": "계약 종료 후 철거 조건", "value": "", "default": "계약 종료 시 철거비 무료 (7영업일 이내 철거)"},
            "p22": {"label": "배선·전원 공사 범위", "value": "", "default": "기존 콘센트 사용 가능 여부 사전 확인"},
            "p23": {"label": "고장 A/S 응답 시간 기준", "value": "", "default": "고장 신고 후 24시간 이내 수리 완료 또는 대체 기기 제공"},
            "p24": {"label": "대체 기기 제공 조건", "value": "", "default": "수리 기간 3일 초과 시 동급 대체 기기 즉시 무료 제공"},
            "p25": {"label": "기기 교체(업그레이드) 조건", "value": "", "default": "3년 이상 사용 기기 성능 저하 시 신모델 교체 가능"},
            "p26": {"label": "원격 모니터링 및 관리", "value": "", "default": "공기질 실시간 모니터링 앱 + 월간 보고서 제공"},
            "p27": {"label": "위생 청소 서비스 횟수", "value": "", "default": "연 2회 위생 청소 서비스 포함"},
            "p28": {"label": "공기질 측정 보고서 제공", "value": "", "default": "분기별 공기질 측정 보고서 제공"},
            "p29": {"label": "월 렌탈료 산정 구조", "value": "", "default": "기기 렌탈료 + 필터 포함 + A/S 포함 통합 단가"},
            "p30": {"label": "대수별 구간 할인 적용", "value": "", "default": "50대 기준 단대 대비 15% 할인 적용"},
            "p31": {"label": "결제 주기 및 방식", "value": "", "default": "월 후불 / 세금계산서 말일 발행"},
            "p32": {"label": "중도 해지 위약금 조건", "value": "", "default": "잔여 기간 렌탈료의 30% 이내 위약금 상한"},
            "p33": {"label": "계약 만료 후 처리 방식", "value": "", "default": "만료 후 재약정 우선권 + 신규 단가 재협상 조건 명시"},
            "p34": {"label": "렌탈료 인상 조건", "value": "", "default": "계약 기간 중 렌탈료 고정 (인상 없음)"},
            "p35": {"label": "분실·파손 책임 범위", "value": "", "default": "정상 사용 중 파손은 A/S 포함, 고의/과실 파손은 실비 청구"},
            "p36": {"label": "BSM·전산 연동 조건", "value": "", "default": "전자세금계산서 자동 발행 + 기기 대장 API 연동"},
        },
        "sections": [
            {"title": "1. 계약 기본 정보", "fields": ["p1","p2","p3","p4","p5"], "icon": "org"},
            {"title": "2. 기기 사양 및 수량", "fields": ["p6","p7","p8","p9","p10","p11","p12"], "icon": "gear"},
            {"title": "3. 필터 교체 및 관리", "fields": ["p13","p14","p15","p16","p17"], "icon": "gear"},
            {"title": "4. 설치·이전·철거 조건", "fields": ["p18","p19","p20","p21","p22"], "icon": "gear"},
            {"title": "5. A/S 및 위생 관리", "fields": ["p23","p24","p25","p26","p27","p28"], "icon": "gear"},
            {"title": "6. 결제·계약·해지 조건", "fields": ["p29","p30","p31","p32","p33","p34","p35","p36"], "icon": "mail"},
        ],
    },

    # ── 2. 디지털 광고 제작 및 운영 ──
    {
        "type_key": "digital_ad",
        "name": "디지털 광고 제작 및 운영",
        "description": "마케팅 디지털 광고 제작 및 운영",
        "fields": {
            "p1":  {"label": "캠페인 목적", "value": "", "default": "신제품 인지도 제고 + 구매 전환 동시 운영"},
            "p2":  {"label": "타겟 오디언스 정의", "value": "", "default": "25~45세 여성 / 뷰티·건강 관심 / 서울·수도권"},
            "p3":  {"label": "캠페인 기간", "value": "", "default": "신제품 런칭 집중 4주 + 유지 상시 운영 2개월 (총 3개월)"},
            "p4":  {"label": "총 예산 구조 및 배분", "value": "", "default": "월 5,000만원 = 미디어 3,500만 + 제작 700만 + 수수료 700만 + 툴 100만"},
            "p5":  {"label": "대행사 서비스 범위", "value": "", "default": "전략+소재+네이버/메타/유튜브 통합 운영 Full Service"},
            "p6":  {"label": "미디어 믹스 전략", "value": "", "default": "인지: YouTube 30% / 고려: Meta 25% / 전환: 네이버 검색 30% / 리타겟팅 15%"},
            "p7":  {"label": "미디어 플래닝 보고서", "value": "", "default": "캠페인 시작 전 미디어 플래닝 보고서 제출 의무화"},
            "p8":  {"label": "오디언스 세그먼트 설계", "value": "", "default": "신규 고객 + 기존 고객 + 이탈 방문자 세그먼트 분리 운영"},
            "p9":  {"label": "네이버 프리미엄 DA 집행", "value": "", "default": "네이버 모바일 메인 배너 CPM + 뉴스스탠드 병행 / 월 1,500만원"},
            "p10": {"label": "Google 디스플레이 네트워크 (GDN)", "value": "", "default": "GDN 리마케팅 + 유사 타겟 월 500만원"},
            "p11": {"label": "카카오 디스플레이 광고", "value": "", "default": "카카오 비즈보드 + 모먼트 월 700만원"},
            "p12": {"label": "YouTube 광고 집행", "value": "", "default": "YouTube 인스트림 스킵 + 범퍼 애드 월 1,000만원 / 대행 수수료 12%"},
            "p13": {"label": "OTT·동영상 플랫폼 광고", "value": "", "default": "웨이브 15초 Non-skip 월 1,000만원"},
            "p14": {"label": "동영상 소재 포맷 및 규격", "value": "", "default": "원본 16:9 1편 + 9:16 수직/1:1 리포맷 2개 버전 추가 제작"},
            "p15": {"label": "네이버 검색광고 (파워링크)", "value": "", "default": "네이버 파워링크 월 500만원 / 핵심 키워드 50개 운영"},
            "p16": {"label": "네이버 쇼핑검색 광고", "value": "", "default": "네이버 쇼핑검색 월 300만원 / 스마트스토어 연동"},
            "p17": {"label": "구글 검색광고 (Google Ads)", "value": "", "default": "구글 검색광고 월 300만원 / 브랜드 + 제품 카테고리 키워드"},
            "p18": {"label": "키워드 관리 및 최적화", "value": "", "default": "주 1회 검색어 보고서 검토 + 부정 키워드 추가 / 월 1회 키워드 확장"},
            "p19": {"label": "Meta 광고 (Instagram·Facebook)", "value": "", "default": "Meta 전환 캠페인 월 1,000만원 / 대행 수수료 15%"},
            "p20": {"label": "TikTok 광고", "value": "", "default": "TikTok 인피드 월 500만원 / Z세대 뷰티 타겟"},
            "p21": {"label": "카카오 광고 (모먼트·카카오톡)", "value": "", "default": "카카오 모먼트 + 비즈보드 월 500만원"},
            "p22": {"label": "X (트위터)·LinkedIn 광고", "value": "", "default": "B2B SaaS: LinkedIn 월 300만원 / 대행 수수료 15%"},
            "p23": {"label": "DSP 광고 집행 (수요자 플랫폼)", "value": "", "default": "DV360 프로그래매틱 배너 월 700만원"},
            "p24": {"label": "리타겟팅 (Retargeting) 광고", "value": "", "default": "전체 광고비의 15~20% 리타겟팅 배분 / 픽셀 기반 30일 방문자 타겟"},
            "p25": {"label": "DMP·CDP 데이터 연동", "value": "", "default": "CRM 데이터 연동 유사 타겟(Lookalike) 활용"},
            "p26": {"label": "배너·디스플레이 소재", "value": "", "default": "배너 소재 5개 규격 패키지 2세트 (A/B 테스트용)"},
            "p27": {"label": "동영상 광고 소재", "value": "", "default": "15초 모션그래픽 원본 + 6초 범퍼 컷편집 + 9:16 수직 리포맷"},
            "p28": {"label": "검색광고 카피·랜딩페이지", "value": "", "default": "검색광고 반응형 카피 10세트 + 랜딩페이지 리뉴얼"},
            "p29": {"label": "소재 A/B 테스트 버전", "value": "", "default": "주요 소재 모두 A/B 2개 버전 제작 / 2주 테스트 후 최적 소재 집중"},
            "p30": {"label": "캠페인 세팅 및 구조 설계", "value": "", "default": "캠페인별 목표 명확화 + UTM 파라미터 표준화 세팅"},
            "p31": {"label": "일별·주별 최적화 운영", "value": "", "default": "Meta+네이버+YouTube 3채널 통합 운영 고정 월 대행료 300만원"},
            "p32": {"label": "자동화 입찰·스크립트 운영", "value": "", "default": "Target ROAS 자동 입찰 + 예산 소진 알림 스크립트 운영"},
            "p33": {"label": "이상 트래픽·광고 사기 모니터링", "value": "", "default": "DoubleVerify 적용 / 무효 트래픽 5% 이하 SLA"},
            "p34": {"label": "KPI 및 목표 지표 설정", "value": "", "default": "인지: CPM 5,000원 이하 / 전환: CPA 10,000원 이하 / ROAS 300% 이상"},
            "p35": {"label": "트래킹 세팅 (픽셀·태그)", "value": "", "default": "GA4 + Meta Pixel + 카카오 픽셀 전체 세팅"},
            "p36": {"label": "리포팅 주기 및 형식", "value": "", "default": "Looker Studio 실시간 대시보드 + 주간 이메일 보고 + 월간 상세 분석 보고서"},
            "p37": {"label": "기여 분석 (Attribution Modeling)", "value": "", "default": "GA4 Data-Driven Attribution 설정 + 채널별 기여도 월간 분석"},
            "p38": {"label": "광고 심의 (업종별 사전 심의)", "value": "", "default": "건강기능식품 광고 식약처 사전 심의 + 자율심의 통과 후 집행"},
            "p39": {"label": "개인정보보호·쿠키 동의", "value": "", "default": "웹사이트 쿠키 동의 CMP 설치 + 개인정보 처리방침 업데이트"},
            "p40": {"label": "표시광고법·허위광고 방지", "value": "", "default": "광고 소재 법무 검토 프로세스 + 표시광고법 준수 체크리스트 운영"},
            "p41": {"label": "Brand Safety (게재 위치 안전성)", "value": "", "default": "YouTube 브랜드 세이프티 콘텐츠 제외 카테고리 설정 + 월별 게재 위치 검토"},
            "p42": {"label": "견적 항목 분리", "value": "", "default": "미디어비 / 소재제작비 / 운영 대행 수수료 / 데이터·툴비 항목 분리 견적"},
            "p43": {"label": "대행 수수료 구조", "value": "", "default": "고정 월 대행료 350만원 (3채널) + ROAS 목표 초과 시 인센티브 5%"},
            "p44": {"label": "미디어비 투명성", "value": "", "default": "광고주 직접 계정 소유 필수 / 월 플랫폼 원본 리포트 제출 의무화"},
            "p45": {"label": "결제 방식 및 주기", "value": "", "default": "미디어비 월 초 선납 / 소재비 검수 후 지급 / 수수료 월 후불"},
            "p46": {"label": "KPI 미달 패널티 및 보장", "value": "", "default": "KPI 80% 미달 시 미달 비율 추가 집행 보장 또는 비용 환불"},
            "p47": {"label": "계약 해지 및 위약금", "value": "", "default": "계약 종료 30일 전 통보 / 대행사 귀책 시 미집행 예산 전액 환불"},
        },
        "sections": [
            {"title": "1. 캠페인 기본 정보", "fields": ["p1","p2","p3","p4","p5"], "icon": "org"},
            {"title": "2. 광고 전략 및 미디어 플래닝", "fields": ["p6","p7","p8"], "icon": "gear"},
            {"title": "3. 배너·GDN·프리미엄 DA", "fields": ["p9","p10","p11"], "icon": "gear"},
            {"title": "4. YouTube·OTT·동영상 광고", "fields": ["p12","p13","p14"], "icon": "gear"},
            {"title": "5. 네이버·구글 검색 광고", "fields": ["p15","p16","p17","p18"], "icon": "gear"},
            {"title": "6. Meta·TikTok·카카오 광고", "fields": ["p19","p20","p21","p22"], "icon": "gear"},
            {"title": "7. DSP·DMP·리타겟팅", "fields": ["p23","p24","p25"], "icon": "gear"},
            {"title": "8. 광고 소재 제작 및 리소스", "fields": ["p26","p27","p28","p29"], "icon": "gear"},
            {"title": "9. 캠페인 운영·최적화·모니터링", "fields": ["p30","p31","p32","p33"], "icon": "gear"},
            {"title": "10. KPI·트래킹·리포팅", "fields": ["p34","p35","p36","p37"], "icon": "chart"},
            {"title": "11. 심의·개인정보·광고법", "fields": ["p38","p39","p40","p41"], "icon": "gear"},
            {"title": "12. 결제·계약·SLA 조건", "fields": ["p42","p43","p44","p45","p46","p47"], "icon": "mail"},
        ],
    },

    # ── 3. 문서파기 서비스 ──
    {
        "type_key": "document_shredding",
        "name": "문서파기 서비스",
        "description": "건물 관리 문서파기 서비스",
        "fields": {
            "p1":  {"label": "계약 유형", "value": "", "default": "월 정기 수거 + 수시 대량 파기 혼합형"},
            "p2":  {"label": "파기 발생 사업장 수 및 위치", "value": "", "default": "본사 (서울 강남) + 지점 3곳 (분당/수원/부산)"},
            "p3":  {"label": "연간 파기 예상 물량", "value": "", "default": "연간 약 2,000kg (월 평균 약 167kg)"},
            "p4":  {"label": "서비스 시작 희망일", "value": "", "default": ""},
            "p5":  {"label": "계약 기간", "value": "", "default": "1년 계약 (자동갱신 조항 포함)"},
            "p6":  {"label": "종이 문서 파기 물량", "value": "", "default": "월 약 100kg (A4 박스 기준 약 15~20박스)"},
            "p7":  {"label": "디지털 매체 파기 종류 및 수량", "value": "", "default": "HDD 50개, USB 30개, CD 100장 (물리 파괴 요청)"},
            "p8":  {"label": "기밀 등급 분류", "value": "", "default": "기밀 60% / 일반 40% 혼합"},
            "p9":  {"label": "개인정보 포함 문서 비율", "value": "", "default": "전체 파기 문서의 약 70%가 개인정보 포함"},
            "p10": {"label": "특수 매체 파기 여부", "value": "", "default": "X선 필름 200장, 마이크로필름 5롤 포함"},
            "p11": {"label": "재활용 가능 문서 분리 여부", "value": "", "default": "일반 서류 파기 후 제지 재활용 처리 요청"},
            "p12": {"label": "문서 파기 등급 (DIN 66399 기준)", "value": "", "default": "개인정보 포함 문서: P-4 이상 / 일반 서류: P-3"},
            "p13": {"label": "현장 파기 vs 수거 후 파기", "value": "", "default": "극비/기밀 문서: 현장 파기 / 일반 서류: 수거 후 파기"},
            "p14": {"label": "입회 파기 여부", "value": "", "default": "기밀 문서 파기 시 담당자 입회 요청"},
            "p15": {"label": "HDD·SSD 파기 방식", "value": "", "default": "HDD 전량 물리적 천공 파괴 + 파괴 인증서 발급"},
            "p16": {"label": "파기 후 잔재물 처리", "value": "", "default": "파기 잔재물 폐기물 처리 확인서 제출"},
            "p17": {"label": "수거 주기 및 방문 횟수", "value": "", "default": "월 1회 정기 수거 + 수시 수거 연 4회 포함"},
            "p18": {"label": "보안 봉투·잠금 박스 제공 여부", "value": "", "default": "보안 잠금 박스 10개 사무실 배치 (임대 방식)"},
            "p19": {"label": "운반 차량 보안 요건", "value": "", "default": "GPS 추적 차량 + 잠금 컨테이너 운반 필수"},
            "p20": {"label": "수거 후 파기까지 보관 기간", "value": "", "default": "수거 후 48시간 이내 파기 완료"},
            "p21": {"label": "대량·긴급 파기 출동 조건", "value": "", "default": "긴급 출동(48시간 이내) 연 2회 포함"},
            "p22": {"label": "개인정보 파기 법적 근거 준수", "value": "", "default": "개인정보보호법 기준 파기 방법 준수 및 기록 보관 확인"},
            "p23": {"label": "정보보호 인증 보유 여부", "value": "", "default": "ISO 27001 또는 ISMS 인증 보유 업체 우선 선정"},
            "p24": {"label": "파기 업체 직원 신원 확인", "value": "", "default": "파기 작업자 전원 신원조회 증빙 + 보안서약서 제출"},
            "p25": {"label": "CCTV 파기 시설 모니터링", "value": "", "default": "파기 시설 CCTV 녹화 + 입회 모니터링 요청"},
            "p26": {"label": "폐기물관리법 준수 및 허가", "value": "", "default": "폐기물처리업 허가증 사본 계약 전 제출"},
            "p27": {"label": "파기 증명서 발급 방식", "value": "", "default": "매 파기 건별 파기 증명서 발급 (당일 또는 익영업일)"},
            "p28": {"label": "파기 사진·영상 증빙 제공", "value": "", "default": "HDD 파기 시 시리얼 번호 확인 사진 + 파기 영상 제공"},
            "p29": {"label": "월간 파기 실적 보고서", "value": "", "default": "월간 파기 실적 보고서 매월 5영업일 이내 제출"},
            "p30": {"label": "파기 기록 보관 기간", "value": "", "default": "파기 기록 3년 보관 + 요청 시 1영업일 이내 제공"},
            "p31": {"label": "BSM·전산 시스템 연동", "value": "", "default": "파기 증명서 PDF BSM 시스템 자동 업로드 연동"},
            "p32": {"label": "단가 산정 방식", "value": "", "default": "kg당 단가 방식 (kg당 250원) + 방문 건당 기본료 포함"},
            "p33": {"label": "물량 구간별 할인 적용", "value": "", "default": "월 500kg 이상 시 kg당 단가 15% 할인"},
            "p34": {"label": "현장 파기 할증 조건", "value": "", "default": "현장 파기 시 수거 후 파기 단가 대비 40% 할증 이내"},
            "p35": {"label": "긴급 출동 할증 조건", "value": "", "default": "긴급 출동(48시간 이내) 기본 단가의 30% 할증"},
            "p36": {"label": "결제 주기 및 방식", "value": "", "default": "월 후불 / 세금계산서 말일 발행"},
            "p37": {"label": "단가 인상 조건", "value": "", "default": "계약 기간 중 단가 고정 또는 인상률 상한 3% 이내"},
            "p38": {"label": "계약 해지 및 위약금", "value": "", "default": "1개월 사전 통보 시 위약금 없음"},
            "p39": {"label": "유출 사고 시 손해배상 조항", "value": "", "default": "유출 사고 시 실손 배상 + 배상책임보험 1억 이상 가입 필수"},
            "p40": {"label": "공급업체 자격 요건", "value": "", "default": "폐기물처리업 허가 + ISO 27001 인증 보유 업체"},
        },
        "sections": [
            {"title": "1. 계약 기본 정보", "fields": ["p1","p2","p3","p4","p5"], "icon": "org"},
            {"title": "2. 파기 대상 및 물량", "fields": ["p6","p7","p8","p9","p10","p11"], "icon": "gear"},
            {"title": "3. 파기 방식 및 보안 등급", "fields": ["p12","p13","p14","p15","p16"], "icon": "gear"},
            {"title": "4. 수거·운반·보관", "fields": ["p17","p18","p19","p20","p21"], "icon": "gear"},
            {"title": "5. 법규 준수 및 보안 요건", "fields": ["p22","p23","p24","p25","p26"], "icon": "gear"},
            {"title": "6. 증빙·보고·연동", "fields": ["p27","p28","p29","p30","p31"], "icon": "chart"},
            {"title": "7. 결제·계약·SLA 조건", "fields": ["p32","p33","p34","p35","p36","p37","p38","p39","p40"], "icon": "mail"},
        ],
    },

    # ── 4. 물리보안 서비스 ──
    {
        "type_key": "physical_security",
        "name": "물리보안 서비스",
        "description": "건물 관리 물리보안 서비스",
        "fields": {
            "p1":  {"label": "대상 시설 유형 및 위치", "value": "", "default": "본사 사옥 (서울 강남구, 지상 20층, 지하 5층)"},
            "p2":  {"label": "총 보안 면적", "value": "", "default": "연면적 약 30,000㎡"},
            "p3":  {"label": "계약 기간", "value": "", "default": "2년 계약 (자동갱신 조항 포함)"},
            "p4":  {"label": "서비스 시작 희망일", "value": "", "default": ""},
            "p5":  {"label": "보안 등급 분류", "value": "", "default": "일반 보안 / 보안 구역 / 통제 구역 3등급 분류"},
            "p6":  {"label": "CCTV 설치 대수 및 사양", "value": "", "default": "총 200대 (실내 150대 + 외부 50대), 4MP 이상"},
            "p7":  {"label": "CCTV 녹화 저장 기간", "value": "", "default": "30일 이상 저장 (통제 구역 60일)"},
            "p8":  {"label": "출입통제 시스템", "value": "", "default": "카드키 + 지문 인식 복합 인증 (통제 구역)"},
            "p9":  {"label": "침입감지 시스템", "value": "", "default": "적외선 센서 + 마그네틱 센서 + 진동 감지"},
            "p10": {"label": "관제센터 운영 방식", "value": "", "default": "24시간 자체 관제센터 운영 (2인 1조 교대 근무)"},
            "p11": {"label": "영상 분석(AI) 기능", "value": "", "default": "이상 행동 감지 + 객체 추적 + 번호판 인식"},
            "p12": {"label": "네트워크 인프라 요건", "value": "", "default": "전용 VLAN 구성 + 암호화 통신 (TLS 1.3)"},
        },
        "sections": [
            {"title": "1. 계약 기본 정보", "fields": ["p1","p2","p3","p4","p5"], "icon": "org"},
            {"title": "2. 보안 시스템 사양", "fields": ["p6","p7","p8","p9","p10","p11","p12"], "icon": "gear"},
        ],
    },

    # ── 5. 바이럴마케팅 대행 ──
    {
        "type_key": "viral_marketing",
        "name": "바이럴마케팅 대행",
        "description": "마케팅 바이럴마케팅 대행",
        "fields": {
            "p1":  {"label": "캠페인 목적", "value": "", "default": "신제품 런칭 바이럴 확산 + 브랜드 인지도 제고"},
            "p2":  {"label": "타겟 오디언스", "value": "", "default": "20~35세 여성 / 뷰티·라이프스타일 관심"},
            "p3":  {"label": "캠페인 기간", "value": "", "default": "3개월 (사전 시딩 2주 + 본 캠페인 2개월 + 사후 관리 2주)"},
            "p4":  {"label": "총 예산", "value": "", "default": "월 2,000만원 (총 6,000만원)"},
            "p5":  {"label": "대행 서비스 범위", "value": "", "default": "전략 기획 + 콘텐츠 제작 + 인플루언서 섭외 + 성과 분석"},
            "p6":  {"label": "주요 채널 구성", "value": "", "default": "인스타그램 40% + 블로그 30% + 유튜브 20% + 커뮤니티 10%"},
            "p7":  {"label": "콘텐츠 유형 및 수량", "value": "", "default": "리뷰 포스팅 30건 + 숏폼 영상 10건 + 체험단 후기 50건"},
            "p8":  {"label": "인플루언서 등급 구성", "value": "", "default": "메가(100만+) 1명 + 매크로(10만+) 5명 + 마이크로(1만+) 20명"},
            "p9":  {"label": "결제 방식", "value": "", "default": "월 후불 / 세금계산서 말일 발행"},
            "p10": {"label": "KPI 및 성과 지표", "value": "", "default": "도달 500만 이상 / 참여율 3% 이상 / 전환 ROAS 200% 이상"},
        },
        "sections": [
            {"title": "1. 캠페인 기본 정보", "fields": ["p1","p2","p3","p4","p5"], "icon": "org"},
            {"title": "2. 채널 및 콘텐츠 전략", "fields": ["p6","p7","p8"], "icon": "gear"},
            {"title": "3. 계약 및 성과", "fields": ["p9","p10"], "icon": "mail"},
        ],
    },

    # ── 6. 방역소독 구독서비스 ──
    {
        "type_key": "pest_control",
        "name": "방역소독 구독서비스",
        "description": "건물 관리 방역소독 구독서비스",
        "fields": {
            "p1":  {"label": "대상 시설 유형 및 위치", "value": "", "default": "사무용 빌딩 (서울 강남구, 지상 15층, 지하 3층)"},
            "p2":  {"label": "총 방역 면적", "value": "", "default": "연면적 약 10,000㎡"},
            "p3":  {"label": "계약 기간", "value": "", "default": "1년 계약 (자동갱신 조항 포함)"},
            "p4":  {"label": "서비스 시작 희망일", "value": "", "default": ""},
            "p5":  {"label": "방역 주기", "value": "", "default": "월 1회 정기 방역 + 수시 긴급 방역 연 4회 포함"},
            "p6":  {"label": "방역 대상 해충", "value": "", "default": "바퀴벌레, 개미, 쥐, 진드기, 모기"},
            "p7":  {"label": "사용 약제 요건", "value": "", "default": "환경부 승인 저독성 약제 사용 필수"},
            "p8":  {"label": "방역 작업 시간대", "value": "", "default": "업무 종료 후 야간 작업 (18:00~22:00)"},
            "p9":  {"label": "방역 보고서 제공", "value": "", "default": "월간 방역 보고서 + 해충 모니터링 결과 제출"},
            "p10": {"label": "결제 주기 및 방식", "value": "", "default": "월 후불 / 세금계산서 말일 발행"},
        },
        "sections": [
            {"title": "1. 계약 기본 정보", "fields": ["p1","p2","p3","p4"], "icon": "org"},
            {"title": "2. 방역 서비스 사양", "fields": ["p5","p6","p7","p8","p9"], "icon": "gear"},
            {"title": "3. 결제 조건", "fields": ["p10"], "icon": "mail"},
        ],
    },

    # ── 7. 법정의무교육 서비스 ──
    {
        "type_key": "mandatory_education",
        "name": "법정의무교육 서비스",
        "description": "교육 법정의무교육 서비스",
        "fields": {
            "p1":  {"label": "교육 대상 인원", "value": "", "default": "전 직원 500명 (본사 400명 + 지점 100명)"},
            "p2":  {"label": "교육 과목 구성", "value": "", "default": "성희롱예방 + 개인정보보호 + 직장내괴롭힘 + 장애인인식개선 + 산업안전보건"},
            "p3":  {"label": "교육 방식", "value": "", "default": "온라인 교육 (LMS) + 연 1회 집합교육"},
            "p4":  {"label": "계약 기간", "value": "", "default": "1년 계약 (자동갱신)"},
            "p5":  {"label": "교육 일정", "value": "", "default": "상반기 1회 + 하반기 1회 (연 2회)"},
            "p6":  {"label": "수료 기준", "value": "", "default": "과정별 80% 이상 이수 + 평가 60점 이상"},
            "p7":  {"label": "수료증 발급", "value": "", "default": "개인별 수료증 PDF 자동 발급 + 관리자 일괄 다운로드"},
            "p8":  {"label": "미이수자 관리", "value": "", "default": "미이수자 자동 리마인드 메일 + 보충교육 기간 부여"},
            "p9":  {"label": "LMS 기능 요건", "value": "", "default": "출결 관리 + 진도 추적 + 평가 + 수료증 + 통계 대시보드"},
            "p10": {"label": "결제 방식", "value": "", "default": "연 일시납 / 세금계산서 발행"},
        },
        "sections": [
            {"title": "1. 교육 기본 정보", "fields": ["p1","p2","p3","p4","p5"], "icon": "org"},
            {"title": "2. 교육 운영", "fields": ["p6","p7","p8","p9"], "icon": "gear"},
            {"title": "3. 결제 조건", "fields": ["p10"], "icon": "mail"},
        ],
    },

    # ── 8. 보안경비 용역서비스 ──
    {
        "type_key": "security_guard",
        "name": "보안경비 용역서비스",
        "description": "건물 관리 보안경비 용역서비스",
        "fields": {
            "p1":  {"label": "대상 시설 유형 및 위치", "value": "", "default": "본사 사옥 (서울 강남구, 지상 20층, 지하 3층)"},
            "p2":  {"label": "경비 인원", "value": "", "default": "주간 4명 + 야간 2명 (총 6명, 3교대)"},
            "p3":  {"label": "근무 형태", "value": "", "default": "24시간 상주 경비 (3교대 8시간)"},
            "p4":  {"label": "계약 기간", "value": "", "default": "2년 계약 (자동갱신 조항 포함)"},
            "p5":  {"label": "서비스 시작 희망일", "value": "", "default": ""},
            "p6":  {"label": "주요 업무 범위", "value": "", "default": "출입 통제 + 순찰 + 주차 관리 + CCTV 모니터링 + 택배 관리"},
            "p7":  {"label": "경비원 자격 요건", "value": "", "default": "경비업법 교육 이수 + 경력 2년 이상 + 신원조회 적격"},
            "p8":  {"label": "복장 및 장비", "value": "", "default": "지정 유니폼 + 무전기 + 손전등 + 보호구"},
            "p9":  {"label": "비상 대응 매뉴얼", "value": "", "default": "화재, 침입, 자연재해 등 비상 대응 SOP 수립 및 분기 훈련"},
            "p10": {"label": "결제 방식", "value": "", "default": "월 후불 / 세금계산서 말일 발행"},
        },
        "sections": [
            {"title": "1. 계약 기본 정보", "fields": ["p1","p2","p3","p4","p5"], "icon": "org"},
            {"title": "2. 경비 서비스 사양", "fields": ["p6","p7","p8","p9"], "icon": "gear"},
            {"title": "3. 결제 조건", "fields": ["p10"], "icon": "mail"},
        ],
    },

    # ── 9. 복합기 렌탈서비스 ──
    {
        "type_key": "copier_rental",
        "name": "복합기 렌탈서비스",
        "description": "건물 관리 복합기 렌탈서비스",
        "fields": {
            "p1":  {"label": "설치 시설 유형 및 위치", "value": "", "default": "업무용 사무실, 서울 강남구 (총 3개 층)"},
            "p2":  {"label": "총 렌탈 대수", "value": "", "default": "총 15대 (층별 5대 x 3개 층)"},
            "p3":  {"label": "계약 기간", "value": "", "default": "3년 약정 (36개월)"},
            "p4":  {"label": "서비스 시작(설치 희망)일", "value": "", "default": ""},
            "p5":  {"label": "렌탈 방식", "value": "", "default": "구독형 All-in (기기+토너+A/S+소모품 모두 포함)"},
            "p6":  {"label": "기기 등급 및 인쇄 속도 (ppm)", "value": "", "default": "A4 흑백 40ppm 이상 / 컬러 35ppm 이상"},
            "p7":  {"label": "A3 출력 지원 여부", "value": "", "default": "전체 15대 중 A3 필요 대수: 5대 (층별 1대)"},
            "p8":  {"label": "컬러 복합기 vs 흑백 전용", "value": "", "default": "컬러 복합기 5대 + 흑백 전용 10대"},
            "p9":  {"label": "월 예상 총 출력량 (매수)", "value": "", "default": "월 흑백 50,000매 / 컬러 8,000매 (전체 합산)"},
            "p10": {"label": "과금 방식", "value": "", "default": "카운터 방식 (흑백 매당 15원, 컬러 매당 100원)"},
            "p11": {"label": "토너 포함 여부", "value": "", "default": "토너 자동 공급 포함 All-in 방식"},
            "p12": {"label": "결제 주기 및 방식", "value": "", "default": "월 후불 / 세금계산서 말일 발행"},
        },
        "sections": [
            {"title": "1. 계약 기본 정보", "fields": ["p1","p2","p3","p4","p5"], "icon": "org"},
            {"title": "2. 기기 사양", "fields": ["p6","p7","p8","p9","p10","p11"], "icon": "gear"},
            {"title": "3. 결제 조건", "fields": ["p12"], "icon": "mail"},
        ],
    },

    # ── 10. 비데 렌탈서비스 ──
    {
        "type_key": "bidet_rental",
        "name": "비데 렌탈서비스",
        "description": "건물 관리 비데 렌탈서비스",
        "fields": {
            "p1":  {"label": "설치 시설 유형 및 위치", "value": "", "default": "사무용 빌딩 (서울 강남구, 지상 12층, 남녀 각 층별 1개 화장실)"},
            "p2":  {"label": "총 렌탈 대수", "value": "", "default": "총 30대 (층별 남녀 각 1대, 15층 건물)"},
            "p3":  {"label": "계약 기간", "value": "", "default": "3년 약정 (36개월)"},
            "p4":  {"label": "서비스 시작(설치 희망)일", "value": "", "default": ""},
            "p5":  {"label": "렌탈 방식", "value": "", "default": "구독형 All-in (기기+정기 위생 관리+소모품 포함)"},
            "p6":  {"label": "기기 등급 및 주요 기능", "value": "", "default": "중급형 (온수 세정+건조+탈취+야간 조명 기능)"},
            "p7":  {"label": "위생 관리 방문 횟수", "value": "", "default": "연 4회 (분기 1회) 위생 방문 관리 포함"},
            "p8":  {"label": "노즐 교체 포함 여부", "value": "", "default": "노즐 교체 비용 렌탈료에 포함"},
            "p9":  {"label": "A/S 응답 시간", "value": "", "default": "고장 신고 후 24시간 이내 수리 완료 또는 대체 기기 제공"},
            "p10": {"label": "결제 주기 및 방식", "value": "", "default": "월 후불 / 세금계산서 말일 발행"},
        },
        "sections": [
            {"title": "1. 계약 기본 정보", "fields": ["p1","p2","p3","p4","p5"], "icon": "org"},
            {"title": "2. 기기 사양 및 관리", "fields": ["p6","p7","p8","p9"], "icon": "gear"},
            {"title": "3. 결제 조건", "fields": ["p10"], "icon": "mail"},
        ],
    },

    # ── 11. 안전관리 서비스 ──
    {
        "type_key": "safety_management",
        "name": "안전관리 서비스",
        "description": "건물 관리 안전관리 서비스",
        "fields": {
            "p1":  {"label": "대상 시설 유형 및 위치", "value": "", "default": "제조 공장 (경기도 화성시, 연면적 50,000㎡)"},
            "p2":  {"label": "안전관리 대상 범위", "value": "", "default": "전기 + 소방 + 가스 + 승강기 + 건축물 통합 관리"},
            "p3":  {"label": "계약 기간", "value": "", "default": "1년 계약 (자동갱신)"},
            "p4":  {"label": "서비스 시작 희망일", "value": "", "default": ""},
            "p5":  {"label": "안전관리자 자격 요건", "value": "", "default": "산업안전기사 이상 + 경력 5년 이상"},
            "p6":  {"label": "정기 점검 주기", "value": "", "default": "월 1회 정기 안전 점검 + 분기 1회 정밀 점검"},
            "p7":  {"label": "안전 교육 제공", "value": "", "default": "신규 입사자 교육 + 분기별 전 직원 안전교육"},
            "p8":  {"label": "비상 대응 체계", "value": "", "default": "비상 연락망 구축 + 대피 훈련 연 2회"},
            "p9":  {"label": "점검 보고서 제공", "value": "", "default": "월간 안전 점검 보고서 + 개선 권고사항 포함"},
            "p10": {"label": "결제 방식", "value": "", "default": "월 후불 / 세금계산서 말일 발행"},
        },
        "sections": [
            {"title": "1. 계약 기본 정보", "fields": ["p1","p2","p3","p4"], "icon": "org"},
            {"title": "2. 안전관리 서비스", "fields": ["p5","p6","p7","p8","p9"], "icon": "gear"},
            {"title": "3. 결제 조건", "fields": ["p10"], "icon": "mail"},
        ],
    },

    # ── 12. 어학교육 서비스 ──
    {
        "type_key": "language_education",
        "name": "어학교육 서비스",
        "description": "교육 어학교육 서비스",
        "fields": {
            "p1":  {"label": "교육 대상 인원", "value": "", "default": "임직원 100명 (초급 40명 + 중급 40명 + 고급 20명)"},
            "p2":  {"label": "교육 언어", "value": "", "default": "영어 80% + 일본어 15% + 중국어 5%"},
            "p3":  {"label": "교육 방식", "value": "", "default": "온라인 화상 수업 (1:1 및 그룹) + 오프라인 출강 (주 1회)"},
            "p4":  {"label": "계약 기간", "value": "", "default": "1년 계약 (자동갱신)"},
            "p5":  {"label": "수업 일정", "value": "", "default": "주 3회 (월/수/금) 40분 수업"},
            "p6":  {"label": "레벨 테스트", "value": "", "default": "교육 시작 전 전원 레벨 테스트 + 분기별 레벨 재평가"},
            "p7":  {"label": "강사 자격 요건", "value": "", "default": "원어민 또는 해당 언어 전공 석사 이상 + 교육 경력 3년 이상"},
            "p8":  {"label": "교재 및 학습 자료", "value": "", "default": "디지털 교재 제공 + 레벨별 맞춤 커리큘럼"},
            "p9":  {"label": "성과 평가", "value": "", "default": "분기별 성과 보고서 + 출석률·진도율·평가 결과"},
            "p10": {"label": "결제 방식", "value": "", "default": "월 후불 / 세금계산서 말일 발행"},
        },
        "sections": [
            {"title": "1. 교육 기본 정보", "fields": ["p1","p2","p3","p4","p5"], "icon": "org"},
            {"title": "2. 교육 운영", "fields": ["p6","p7","p8","p9"], "icon": "gear"},
            {"title": "3. 결제 조건", "fields": ["p10"], "icon": "mail"},
        ],
    },

    # ── 13. 전문교육 서비스 ──
    {
        "type_key": "professional_education",
        "name": "전문교육 서비스",
        "description": "교육 전문교육 서비스",
        "fields": {
            "p1":  {"label": "교육 대상 인원", "value": "", "default": "기술 직군 150명 (개발 80명 + 데이터 40명 + 인프라 30명)"},
            "p2":  {"label": "교육 분야", "value": "", "default": "AI/ML + 클라우드 + 데이터 분석 + 보안"},
            "p3":  {"label": "교육 방식", "value": "", "default": "온라인 LMS + 오프라인 집중 워크숍 (분기 1회)"},
            "p4":  {"label": "계약 기간", "value": "", "default": "1년 계약 (자동갱신)"},
            "p5":  {"label": "교육 과정 수", "value": "", "default": "총 20개 과정 (필수 5개 + 선택 15개)"},
            "p6":  {"label": "강사 자격 요건", "value": "", "default": "해당 분야 실무 경력 7년 이상 + 강의 경력 3년 이상"},
            "p7":  {"label": "교육 인증", "value": "", "default": "수료 시 사내 역량 인증 + 외부 자격증 연계"},
            "p8":  {"label": "교육 성과 측정", "value": "", "default": "사전/사후 평가 + 현업 적용도 조사 + ROI 분석"},
            "p9":  {"label": "LMS 기능 요건", "value": "", "default": "진도 추적 + 평가 + 수료증 + 학습 분석 대시보드"},
            "p10": {"label": "결제 방식", "value": "", "default": "분기 후불 / 세금계산서 발행"},
        },
        "sections": [
            {"title": "1. 교육 기본 정보", "fields": ["p1","p2","p3","p4","p5"], "icon": "org"},
            {"title": "2. 교육 운영", "fields": ["p6","p7","p8","p9"], "icon": "gear"},
            {"title": "3. 결제 조건", "fields": ["p10"], "icon": "mail"},
        ],
    },

    # ── 14. 전자시장정보 구독서비스 ──
    {
        "type_key": "electronic_market_info",
        "name": "전자시장정보 구독서비스",
        "description": "전자시장정보 구독서비스",
        "fields": {
            "p1":  {"label": "서비스 제공업체 (지정 시)", "value": "", "default": "GfK, Circana(NPD), Euromonitor, IDC 등"},
            "p2":  {"label": "대상 제품 카테고리", "value": "", "default": "TV, 냉장고, 스마트폰, PC 등"},
            "p3":  {"label": "대상 지역/국가 범위", "value": "", "default": "글로벌 또는 아시아 5개국"},
            "p4":  {"label": "데이터 세분화 수준", "value": "", "default": "모델별/브랜드별/채널별/가격대별/월간"},
            "p5":  {"label": "데이터 유형", "value": "", "default": "판매량(Sell-out), 시장점유율, ASP"},
            "p6":  {"label": "구독 기간", "value": "", "default": "1년"},
            "p7":  {"label": "데이터 업데이트 주기", "value": "", "default": "월간(Monthly)"},
            "p8":  {"label": "사용자 라이선스 수", "value": "", "default": "Named User 10명"},
            "p9":  {"label": "데이터 제공 형태", "value": "", "default": "온라인 플랫폼(Portal) + 엑셀 다운로드"},
            "p10": {"label": "결제 방식", "value": "", "default": "연간 선불 / 세금계산서 발행"},
        },
        "sections": [
            {"title": "1. 서비스 기본 정보", "fields": ["p1","p2","p3"], "icon": "org"},
            {"title": "2. 데이터 사양", "fields": ["p4","p5","p6","p7","p8","p9"], "icon": "gear"},
            {"title": "3. 결제 조건", "fields": ["p10"], "icon": "mail"},
        ],
    },

    # ── 15. 조경관리 용역서비스 ──
    {
        "type_key": "landscaping",
        "name": "조경관리 용역서비스",
        "description": "건물 관리 조경관리 용역서비스",
        "fields": {
            "p1":  {"label": "대상 시설 유형 및 위치", "value": "", "default": "사옥 외부 조경 + 옥상 정원 (서울 강남구)"},
            "p2":  {"label": "총 조경 면적", "value": "", "default": "외부 조경 5,000㎡ + 옥상 정원 500㎡"},
            "p3":  {"label": "계약 기간", "value": "", "default": "1년 계약 (자동갱신 조항 포함)"},
            "p4":  {"label": "서비스 시작 희망일", "value": "", "default": ""},
            "p5":  {"label": "관리 주기", "value": "", "default": "주 2회 정기 관리 (화/금)"},
            "p6":  {"label": "주요 관리 범위", "value": "", "default": "잔디 관리 + 수목 전정 + 관수 + 시비 + 병충해 방제"},
            "p7":  {"label": "계절별 특수 작업", "value": "", "default": "봄 식재 + 여름 제초 + 가을 낙엽 수거 + 겨울 제설"},
            "p8":  {"label": "관리 인력 요건", "value": "", "default": "조경기능사 이상 자격 보유 + 경력 3년 이상"},
            "p9":  {"label": "관리 보고서 제공", "value": "", "default": "월간 관리 보고서 + 사진 첨부 + 개선 권고"},
            "p10": {"label": "결제 방식", "value": "", "default": "월 후불 / 세금계산서 말일 발행"},
        },
        "sections": [
            {"title": "1. 계약 기본 정보", "fields": ["p1","p2","p3","p4"], "icon": "org"},
            {"title": "2. 조경관리 서비스", "fields": ["p5","p6","p7","p8","p9"], "icon": "gear"},
            {"title": "3. 결제 조건", "fields": ["p10"], "icon": "mail"},
        ],
    },

    # ── 16. 범용 (매핑 안 되는 카테고리) ──
    {
        "type_key": "_generic",
        "name": "범용 구매요청서",
        "description": "기타 카테고리용 범용 구매요청서 양식",
        "fields": {
            "p1":  {"label": "요청 부서", "value": "", "default": ""},
            "p2":  {"label": "요청자", "value": "", "default": ""},
            "p3":  {"label": "연락처", "value": "", "default": ""},
            "p4":  {"label": "품목/서비스명", "value": "", "default": ""},
            "p5":  {"label": "구매 목적", "value": "", "default": ""},
            "p6":  {"label": "수량", "value": "", "default": ""},
            "p7":  {"label": "희망 납기일", "value": "", "default": ""},
            "p8":  {"label": "예산 범위", "value": "", "default": ""},
            "p9":  {"label": "요구 사양", "value": "", "default": ""},
            "p10": {"label": "결제 조건", "value": "", "default": "월 후불 / 세금계산서 발행"},
        },
        "sections": [
            {"title": "1. 요청자 정보", "fields": ["p1","p2","p3"], "icon": "org"},
            {"title": "2. 구매 개요", "fields": ["p4","p5","p6","p7","p8"], "icon": "gear"},
            {"title": "3. 요구사항 및 결제", "fields": ["p9","p10"], "icon": "mail"},
        ],
    },
]


def run():
    supabase = get_client()

    # 기존 데이터 삭제
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
        print(f"  {t['name']} 저장 완료")

    # 확인
    result = supabase.table("pr_templates").select("id, type_key, name").order("id").execute()
    print(f"\n총 {len(result.data)}개 저장:")
    for r in result.data:
        print(f"  [{r['id']}] {r['type_key']} -> {r['name']}")


if __name__ == "__main__":
    run()

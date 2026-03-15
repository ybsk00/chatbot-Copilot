// ═══════════════════════════════════════════
// PR(구매요청서) 유형별 템플릿 (16개 카테고리)
// 공통필드(c1~c20) + 고유필드(p1~pN) 구조
// ═══════════════════════════════════════════

import { buildCommonFields, buildSections } from './commonFields';

export const PR_TEMPLATES = {

  // ──────────────────────────────────────
  // 건물 관리 (9개)
  // ──────────────────────────────────────

  air_purifier_rental: {
    label: "공기청정기 렌탈 서비스", desc: "건물 관리 공기청정기 렌탈 서비스", icon: "air_purifier_rental",
    fields: {
      ...buildCommonFields("air_purifier_rental"),
      p1:  { label: "설치 시설 유형 및 위치", value: "", default: "사무실 (서울 강남구, 지상 12층 건물)" },
      p2:  { label: "서비스 시작(설치 희망)일", value: "" },
      p3:  { label: "적용 공간 면적 및 사용 환경", value: "", default: "개인 사무 9㎡×30개, 회의실 30㎡×5개, 휴게실 20㎡×5개" },
      p4:  { label: "기기 등급 및 CADR 수치", value: "", default: "9㎡ 공간 → CADR 200 이상 기기 요청" },
      p5:  { label: "필터 등급 요건", value: "", default: "H13 HEPA + 활성탄 탈취 필터 복합 구성" },
      p6:  { label: "추가 기능 요건", value: "", default: "PM2.5 센서 + 공기질 디스플레이 + 앱 연동" },
      p7:  { label: "소음 기준 (dB)", value: "", default: "수면 모드 기준 30dB 이하" },
      p8:  { label: "필터 교체 주기 및 포함 여부", value: "", default: "HEPA 연 1회, 프리필터 연 2회, 탈취 연 2회, 렌탈료 포함" },
      p9:  { label: "정기 위생 점검 방문 횟수", value: "", default: "연 2회 정기 위생 점검 방문 포함" },
      p10: { label: "설치 방식", value: "", default: "스탠드형 45대 + 벽걸이형 5대" },
      p11: { label: "기기 이전 서비스 조건", value: "", default: "계약 기간 내 이전 서비스 연 2회 무료 포함" },
      p12: { label: "고장 시 대체 기기 제공", value: "", default: "수리 기간 3일 초과 시 동급 대체 기기 무료 제공" },
    },
    sections: buildSections([
      { title: "기기 사양 및 환경",     fields: ["p1","p2","p3","p4","p5","p6","p7"], icon: "gear" },
      { title: "필터 및 위생 관리",     fields: ["p8","p9"],                          icon: "gear" },
      { title: "설치·이전·A/S",        fields: ["p10","p11","p12"],                  icon: "gear" },
    ]),
  },

  copier_rental: {
    label: "복합기 렌탈 서비스", desc: "건물 관리 복합기 렌탈 서비스", icon: "copier_rental",
    fields: {
      ...buildCommonFields("copier_rental"),
      p1:  { label: "설치 시설 유형 및 위치", value: "", default: "사무실 (서울 강남구, 지상 12층 건물)" },
      p2:  { label: "서비스 시작(설치 희망)일", value: "" },
      p3:  { label: "기기 등급 및 인쇄 속도 (ppm)", value: "", default: "A4 기준 40ppm 이상 (중속 등급)" },
      p4:  { label: "A3 출력 지원 여부", value: "", default: "A3 지원 5대 (기획팀·디자인팀)" },
      p5:  { label: "컬러 복합기 vs 흑백 전용", value: "", default: "컬러 10대 + 흑백 10대" },
      p6:  { label: "팩스·스캔·복사 기능 요건", value: "", default: "전 기종 스캔·복사 기본, 팩스 5대 선택" },
      p7:  { label: "월 예상 총 출력량 (매수)", value: "", default: "월 30,000매 (흑백 25,000 + 컬러 5,000)" },
      p8:  { label: "과금 방식", value: "", default: "기본료 + CPC(매당 단가) 병행" },
      p9:  { label: "토너·드럼 포함 여부", value: "", default: "전 소모품 렌탈료 포함 (토너·드럼·정착기)" },
      p10: { label: "보안 기능 요건", value: "", default: "HDD 암호화·자동삭제, 보안인쇄(PIN/IC카드)" },
      p11: { label: "네트워크 연결 방식", value: "", default: "유선 LAN + Wi-Fi Direct + 모바일 인쇄" },
      p12: { label: "A/S 출동 응답 시간", value: "", default: "4시간 이내 출동, 당일 수리 완료" },
      p13: { label: "대체 기기 제공 조건", value: "", default: "수리 2일 초과 시 동급 대체 기기 무료 제공" },
      p14: { label: "정기 예방 점검 횟수", value: "", default: "분기별 1회 (연 4회)" },
      p15: { label: "원격 진단·모니터링", value: "", default: "토너 잔량·장애 자동 알림 + 원격 진단" },
    },
    sections: buildSections([
      { title: "기기 사양 및 구성",       fields: ["p1","p2","p3","p4","p5","p6"], icon: "gear" },
      { title: "출력량 및 과금",          fields: ["p7","p8"],                     icon: "gear" },
      { title: "소모품·보안·네트워크",    fields: ["p9","p10","p11"],              icon: "gear" },
      { title: "A/S 및 유지보수",        fields: ["p12","p13","p14","p15"],       icon: "gear" },
    ]),
  },

  bidet_rental: {
    label: "비데 렌탈 서비스", desc: "건물 관리 비데 렌탈 서비스", icon: "bidet_rental",
    fields: {
      ...buildCommonFields("bidet_rental"),
      p1:  { label: "설치 시설 유형 및 위치", value: "", default: "사무실 (서울 강남구, 지상 12층 건물)" },
      p2:  { label: "서비스 시작(설치 희망)일", value: "" },
      p3:  { label: "기기 등급 및 주요 기능", value: "", default: "방수등급 IPX4 이상, 온수·온풍·탈취 기본" },
      p4:  { label: "스마트 기능 (IoT·앱 연동)", value: "", default: "브랜드 무관, 기본 기능 충족 시 허용" },
      p5:  { label: "변기 형태 및 호환성", value: "", default: "설치 전 현장 실측 필수 (호환성 확인)" },
      p6:  { label: "위생 관리 방문 횟수", value: "", default: "연 4회 (분기별 1회)" },
      p7:  { label: "위생 관리 작업 범위", value: "", default: "노즐 세척·교체 + 필터 교체 + 수압 점검 + 살균" },
      p8:  { label: "설치 방식 및 비용", value: "", default: "초기 설치비 렌탈료 포함, 전기 배선 별도 협의" },
      p9:  { label: "고장 시 대체 기기 제공", value: "", default: "수리 3일 초과 시 동급 대체 기기 무료 제공" },
      p10: { label: "누수 보상 책임 범위", value: "", default: "제품 하자로 인한 누수는 업체 전액 배상" },
    },
    sections: buildSections([
      { title: "기기 사양",       fields: ["p1","p2","p3","p4","p5"], icon: "gear" },
      { title: "위생 관리",       fields: ["p6","p7"],                icon: "gear" },
      { title: "설치·A/S",       fields: ["p8","p9","p10"],          icon: "gear" },
    ]),
  },

  document_shredding: {
    label: "문서파기 서비스", desc: "건물 관리 문서파기 서비스", icon: "document_shredding",
    fields: {
      ...buildCommonFields("document_shredding"),
      p1:  { label: "파기 발생 사업장 수 및 위치", value: "", default: "본사 + 지사 2개소 (서울, 판교)" },
      p2:  { label: "서비스 시작 희망일", value: "" },
      p3:  { label: "연간 파기 예상 물량", value: "", default: "월 평균 500kg (연간 6톤)" },
      p4:  { label: "종이 문서 파기 물량", value: "", default: "월 450kg" },
      p5:  { label: "디지털 매체 파기 종류 및 수량", value: "", default: "HDD 월 10개 + SSD 월 5개" },
      p6:  { label: "기밀 등급 분류", value: "", default: "일반 60% + 기밀 30% + 극비 10%" },
      p7:  { label: "문서 파기 등급 (DIN 66399)", value: "", default: "P-4 등급 이상 (잔재물 폭 6mm 이하)" },
      p8:  { label: "현장 파기 vs 수거 후 파기", value: "", default: "기밀 문서: 현장 파기 / 일반: 수거 후 파기" },
      p9:  { label: "수거 주기 및 방문 횟수", value: "", default: "월 2회 정기 수거 + 긴급 출동 가능" },
      p10: { label: "보안 봉투·잠금 박스 제공", value: "", default: "잠금 보안 박스 10개 무상 제공" },
      p11: { label: "파기 증명서 발급 방식", value: "", default: "건별 전자 파기 증명서 + 사진·영상 증빙" },
      p12: { label: "정보보호 인증 보유 여부", value: "", default: "ISO 27001 또는 ISMS 인증 필수" },
      p13: { label: "파기 기록 보관 기간", value: "", default: "5년 보관 (개인정보보호법 준수)" },
    },
    sections: buildSections([
      { title: "파기 물량 및 구성",       fields: ["p1","p2","p3","p4","p5"],   icon: "gear" },
      { title: "파기 방법 및 보안 등급",   fields: ["p6","p7","p8"],            icon: "gear" },
      { title: "수거·증명·인증",          fields: ["p9","p10","p11","p12","p13"], icon: "gear" },
    ]),
  },

  physical_security: {
    label: "물리보안 서비스", desc: "건물 관리 물리보안 서비스 (CCTV + 출입통제)", icon: "physical_security",
    fields: {
      ...buildCommonFields("physical_security"),
      p1:  { label: "시설 유형 및 위치", value: "", default: "사무실 건물 (서울 강남구, 지상 15층 + 지하 3층)" },
      p2:  { label: "서비스 시작(설치 희망)일", value: "" },
      p3:  { label: "CCTV 카메라 설치 대수", value: "", default: "실내 40대 + 실외 15대 + 주차장 5대" },
      p4:  { label: "카메라 해상도", value: "", default: "실내 2MP(1080p) + 실외 4MP, 주차장 LPR 전용" },
      p5:  { label: "야간 촬영 방식", value: "", default: "실내 IR LED / 실외 저조도 컬러 + IR 병행" },
      p6:  { label: "AI 분석 기능", value: "", default: "안면인식, 이상행동 감지, 객체 추적" },
      p7:  { label: "영상 저장 기간", value: "", default: "일반 구역 30일 + 주요 출입구 90일" },
      p8:  { label: "출입통제 적용 문 수량", value: "", default: "사무실 출입문 20개소" },
      p9:  { label: "인증 방식", value: "", default: "RF카드 + 지문인식 복합 인증" },
      p10: { label: "차량 게이트 수량 및 인식 방식", value: "", default: "차량 게이트 3개소, LPR(번호판 인식)" },
      p11: { label: "보행자 스피드게이트", value: "", default: "로비 스피드게이트 4레인" },
      p12: { label: "NVR 사양 및 채널 수", value: "", default: "64CH NVR 2대, RAID-5 구성" },
      p13: { label: "통합 관리 플랫폼 (VMS)", value: "", default: "단일 VMS로 CCTV + 출입통제 + 게이트 통합 관제" },
      p14: { label: "원격 모니터링·모바일 앱", value: "", default: "모바일 앱 실시간 모니터링 + 이벤트 알림" },
      p15: { label: "네트워크 인프라 요건", value: "", default: "전용 VLAN 구성, PoE 스위치 포함" },
      p16: { label: "정기 예방 점검", value: "", default: "월 1회 정기 점검 (카메라·NVR·출입통제 전체)" },
      p17: { label: "하드웨어 보증 기간", value: "", default: "설치 후 3년 무상 보증, 이후 유상" },
      p18: { label: "시스템 확장성", value: "", default: "향후 20% 확장 가능한 여유 설계" },
    },
    sections: buildSections([
      { title: "CCTV 사양 및 설치",     fields: ["p1","p2","p3","p4","p5","p6","p7"], icon: "gear" },
      { title: "출입통제·게이트",        fields: ["p8","p9","p10","p11"],              icon: "gear" },
      { title: "NVR·관제·네트워크",     fields: ["p12","p13","p14","p15"],            icon: "gear" },
      { title: "유지보수·확장",          fields: ["p16","p17","p18"],                  icon: "gear" },
    ]),
  },

  pest_control: {
    label: "방역소독 서비스", desc: "건물 관리 방역소독 서비스", icon: "pest_control",
    fields: {
      ...buildCommonFields("pest_control"),
      p1:  { label: "관리 대상 해충 범위", value: "", default: "바퀴벌레, 개미, 쥐, 진드기, 날벌레 등 일반 해충" },
      p2:  { label: "서비스 시작 희망일", value: "" },
      p3:  { label: "정기 방문 횟수 (월)", value: "", default: "월 1회 정기 방문" },
      p4:  { label: "방문 시간대 요건", value: "", default: "업무 종료 후 18:00~22:00 (야간 작업)" },
      p5:  { label: "긴급 출동 서비스 포함", value: "", default: "포함 (신고 후 48시간 이내 출동)" },
      p6:  { label: "친환경·저독성 약제 요구", value: "", default: "친환경 약제 필수 (MSDS 사전 제출)" },
      p7:  { label: "적용 공법", value: "", default: "겔 베이트 + 잔류 분무 + 트랩 설치 병행" },
      p8:  { label: "IoT 모니터링 장비 설치", value: "", default: "주요 구역 모니터링 트랩 10개소 설치" },
      p9:  { label: "서비스 리포트 형식 및 주기", value: "", default: "월간 보고서 (PDF) + 해충 현황 대시보드" },
      p10: { label: "담당 PM(현장관리자) 지정", value: "", default: "전담 PM 1명 지정" },
    },
    sections: buildSections([
      { title: "방역 대상 및 일정",   fields: ["p1","p2","p3","p4","p5"], icon: "gear" },
      { title: "약제·공법",          fields: ["p6","p7"],                icon: "gear" },
      { title: "모니터링·리포팅",     fields: ["p8","p9","p10"],          icon: "gear" },
    ]),
  },

  security_guard: {
    label: "보안경비 용역 서비스", desc: "건물 관리 보안경비 용역 서비스", icon: "security_guard",
    fields: {
      ...buildCommonFields("security_guard"),
      p1:  { label: "경비 서비스 유형", value: "", default: "상주경비 (24시간 3교대)" },
      p2:  { label: "경비 대상 시설 유형", value: "", default: "사무실 건물 (지상 15층 + 지하 3층)" },
      p3:  { label: "서비스 시작 희망일", value: "" },
      p4:  { label: "경비 구역 면적 및 층수", value: "", default: "연면적 10,000㎡, 지상 15층 + 지하 3층" },
      p5:  { label: "운영 시간대 및 교대 방식", value: "", default: "24시간 3교대 (주간 8h + 야간1 8h + 야간2 8h)" },
      p6:  { label: "주말·공휴일 운영 여부", value: "", default: "365일 운영 (공휴일 수당 별도)" },
      p7:  { label: "특수 자격 보유 인력 요건", value: "", default: "경비지도사 1명 이상, 응급처치 자격 전원" },
      p8:  { label: "순찰 횟수 및 경로", value: "", default: "2시간 간격 순찰 (1층~15층 + 지하 + 외곽)" },
      p9:  { label: "방문객·차량 통제 업무", value: "", default: "방문객 등록·출입증 발급 + 주차 관리" },
      p10: { label: "CCTV 모니터링 업무 포함", value: "", default: "관제실 CCTV 상시 모니터링 (60대)" },
      p11: { label: "경비 장비 제공 주체", value: "", default: "무전기·손전등·경비봉은 용역업체 제공" },
      p12: { label: "유니폼 및 명찰 기준", value: "", default: "사계절 유니폼 2벌 + 명찰 + 조끼" },
    },
    sections: buildSections([
      { title: "경비 운영 체계",   fields: ["p1","p2","p3","p4","p5","p6"], icon: "gear" },
      { title: "업무 범위",       fields: ["p7","p8","p9","p10"],          icon: "gear" },
      { title: "인력·장비",       fields: ["p11","p12"],                   icon: "gear" },
    ]),
  },

  safety_management: {
    label: "안전관리 대행 서비스", desc: "건물 관리 안전관리 대행 서비스", icon: "safety_management",
    fields: {
      ...buildCommonFields("safety_management"),
      p1:  { label: "대상 시설 유형 및 주소", value: "", default: "사무실 건물 (서울 강남구, 지상 15층 + 지하 3층)" },
      p2:  { label: "서비스 시작 희망일", value: "" },
      p3:  { label: "승강기 총 대수 및 유형", value: "", default: "승객용 4대 + 화물용 2대 (총 6대)" },
      p4:  { label: "승강기 설치 연도 및 노후도", value: "", default: "2015년 설치 (11년차), 부분 노후" },
      p5:  { label: "월 유지관리 방문 횟수", value: "", default: "월 2회 정기 방문 점검" },
      p6:  { label: "부품 교체 비용 포함 여부", value: "", default: "소모성 부품 포함, 주요 부품(도어모터 등) 별도" },
      p7:  { label: "24시간 긴급출동 서비스", value: "", default: "포함 (신고 후 2시간 이내 출동)" },
      p8:  { label: "전기설비 정기검사·점검", value: "", default: "전기안전관리자 선임 대행 + 연 1회 정밀점검" },
      p9:  { label: "가스설비 정기검사·점검", value: "", default: "가스안전관리 대행 + 연 1회 정밀점검" },
      p10: { label: "소방시설 종합정밀점검", value: "", default: "연 1회 종합점검 + 연 1회 작동점검" },
      p11: { label: "소방안전관리자 선임 대행", value: "", default: "2급 소방안전관리자 선임 대행" },
      p12: { label: "환경측정 (실내공기질·소음)", value: "", default: "반기별 실내공기질 측정 (다중이용시설)" },
      p13: { label: "법정검사 만료일 관리", value: "", default: "법정검사 만료일 사전 알림 (30일 전)" },
      p14: { label: "법정 검사 성적서 및 보고서", value: "", default: "월간 점검 보고서 + 법정검사 성적서 보관·제출" },
    },
    sections: buildSections([
      { title: "승강기 유지관리",           fields: ["p1","p2","p3","p4","p5","p6","p7"], icon: "gear" },
      { title: "전기·가스·기계 설비",       fields: ["p8","p9"],                          icon: "gear" },
      { title: "소방·환경·법정검사",        fields: ["p10","p11","p12","p13","p14"],       icon: "gear" },
    ]),
  },

  landscaping: {
    label: "조경관리 용역 서비스", desc: "건물 관리 조경관리 용역 서비스", icon: "landscaping",
    fields: {
      ...buildCommonFields("landscaping"),
      p1:  { label: "대상 시설 유형 및 위치", value: "", default: "사무실 건물 (서울 강남구, 대지면적 5,000㎡)" },
      p2:  { label: "서비스 시작 희망일", value: "" },
      p3:  { label: "수목 총 수량 및 구성", value: "", default: "교목 200주 + 관목 500주 + 초화류 300㎡" },
      p4:  { label: "수목 전정 횟수 (연간)", value: "", default: "교목 연 2회 + 관목 연 3회" },
      p5:  { label: "수목 식재 및 교체", value: "", default: "고사 수목 연 5% 이내 무상 교체" },
      p6:  { label: "잔디 면적 및 관리", value: "", default: "잔디 1,500㎡, 예초 월 2회 + 시비 연 2회" },
      p7:  { label: "초화류 식재 및 교체", value: "", default: "계절별 연 4회 교체 (봄·여름·가을·겨울)" },
      p8:  { label: "관수 시스템 운영", value: "", default: "자동 관수 시스템 운영·관리 포함" },
      p9:  { label: "병해충 방제", value: "", default: "연 4회 약제 살포 + 긴급 방제 출동" },
      p10: { label: "조경 시설물 유지관리", value: "", default: "벤치·파고라·조명·분수 등 점검·수리" },
      p11: { label: "동절기 월동 관리", value: "", default: "수목 방한 조치 + 제설·제빙 후 복구" },
      p12: { label: "낙엽 수거 및 청소", value: "", default: "가을 낙엽 수거 주 2회 + 상시 청소" },
      p13: { label: "작업 일지 및 보고서", value: "", default: "월간 작업 보고서 + 수목 현황 DB 관리" },
      p14: { label: "현장 담당자 지정", value: "", default: "전담 현장 관리자(조경기능사) 1명 지정" },
    },
    sections: buildSections([
      { title: "수목 관리",               fields: ["p1","p2","p3","p4","p5"],   icon: "gear" },
      { title: "잔디·초화류·관수",         fields: ["p6","p7","p8"],            icon: "gear" },
      { title: "방제·시설물·동절기",       fields: ["p9","p10","p11","p12"],    icon: "gear" },
      { title: "리포팅·관리",             fields: ["p13","p14"],               icon: "gear" },
    ]),
  },

  // ──────────────────────────────────────
  // 마케팅 (2개)
  // ──────────────────────────────────────

  digital_ad: {
    label: "디지털 광고 제작 및 운영", desc: "마케팅 디지털 광고 제작 및 운영", icon: "digital_ad",
    fields: {
      ...buildCommonFields("digital_ad"),
      p1:  { label: "캠페인 시작 희망일", value: "" },
      p2:  { label: "타겟 오디언스 정의", value: "", default: "25~45세, IT/비즈니스 관심, 수도권 중심" },
      p3:  { label: "미디어 믹스 전략", value: "", default: "검색광고 40% + DA/GDN 30% + SNS 20% + 동영상 10%" },
      p4:  { label: "네이버 검색광고 (파워링크)", value: "", default: "키워드 500개 운영, 월 예산 500만원" },
      p5:  { label: "구글 검색광고 (Google Ads)", value: "", default: "키워드 300개 운영, 월 예산 300만원" },
      p6:  { label: "네이버 프리미엄 DA", value: "", default: "메인 배너 + 서브 배너, 월 1,000만원" },
      p7:  { label: "Google 디스플레이 네트워크 (GDN)", value: "", default: "리마케팅 + 관심사 타겟팅" },
      p8:  { label: "Meta 광고 (Instagram·Facebook)", value: "", default: "피드 + 스토리 + 릴스, 월 500만원" },
      p9:  { label: "YouTube 광고", value: "", default: "인스트림 + 범퍼 + 디스커버리, 월 500만원" },
      p10: { label: "TikTok 광고", value: "", default: "인피드 + 브랜디드 챌린지 (선택)" },
      p11: { label: "배너·디스플레이 소재 제작", value: "", default: "정적 배너 10종 + 반응형 배너 5종 / 월" },
      p12: { label: "동영상 광고 소재 제작", value: "", default: "15초 2편 + 30초 1편 / 분기" },
      p13: { label: "소재 A/B 테스트", value: "", default: "주 1회 소재 교체 + 성과 비교 리포트" },
      p14: { label: "KPI 및 목표 지표", value: "", default: "CTR 2% 이상, CPC 500원 이하, ROAS 300% 이상" },
      p15: { label: "트래킹 세팅", value: "", default: "GA4 + Meta Pixel + 네이버 프리미엄 로그분석" },
      p16: { label: "리포팅 주기 및 형식", value: "", default: "주간 대시보드 + 월간 정식 리포트 (PPT/PDF)" },
      p17: { label: "광고 심의 (업종별 사전 심의)", value: "", default: "식품·건강·금융 등 사전 심의 대행 포함" },
      p18: { label: "Brand Safety (게재 위치 안전성)", value: "", default: "부적절 사이트 블랙리스트 관리" },
    },
    sections: buildSections([
      { title: "캠페인 전략",         fields: ["p1","p2","p3"],          icon: "gear" },
      { title: "검색광고",            fields: ["p4","p5"],               icon: "gear" },
      { title: "디스플레이·DA",       fields: ["p6","p7"],               icon: "gear" },
      { title: "SNS·동영상",         fields: ["p8","p9","p10"],         icon: "gear" },
      { title: "소재 제작",           fields: ["p11","p12","p13"],       icon: "gear" },
      { title: "KPI·리포팅·심의",    fields: ["p14","p15","p16","p17","p18"], icon: "chart" },
    ]),
  },

  viral_marketing: {
    label: "바이럴 마케팅 대행 서비스", desc: "마케팅 바이럴 마케팅 대행 서비스", icon: "viral_marketing",
    fields: {
      ...buildCommonFields("viral_marketing"),
      p1:  { label: "캠페인 시작 희망일", value: "" },
      p2:  { label: "타겟 고객 정의", value: "", default: "20~40대, SNS 활동 활발, 라이프스타일 관심층" },
      p3:  { label: "채널 전략 및 믹스", value: "", default: "Instagram 40% + 블로그 30% + YouTube 20% + 커뮤니티 10%" },
      p4:  { label: "인플루언서 등급·규모", value: "", default: "Micro(1~10만) 8명 + Macro(10~50만) 2명" },
      p5:  { label: "인플루언서 선정 기준", value: "", default: "참여율(ER) 3% 이상, 브랜드 적합성 검증" },
      p6:  { label: "콘텐츠 형식 및 횟수", value: "", default: "피드 10건 + 릴스 5건 + 스토리 5건 / 월" },
      p7:  { label: "전속·배타 계약 조건", value: "", default: "캠페인 기간 중 동일 업종 경쟁사 광고 금지" },
      p8:  { label: "SNS 채널 계정 운영 대행", value: "", default: "Instagram + Facebook + YouTube 3개 채널" },
      p9:  { label: "커뮤니티 관리 (댓글·DM 대응)", value: "", default: "평일 09~18시 실시간 대응, 주말 모니터링" },
      p10: { label: "블로그·SEO 마케팅", value: "", default: "네이버 블로그 월 8건 + 구글 SEO 키워드 최적화" },
      p11: { label: "체험단·리뷰 콘텐츠", value: "", default: "월 1회 체험단 20명 모집·운영" },
      p12: { label: "바이럴 기사·보도자료", value: "", default: "월 2건 보도자료 작성 + 배포" },
      p13: { label: "성과 리포팅 주기 및 형식", value: "", default: "주간 콘텐츠 현황 + 월간 성과 리포트 (PPT)" },
      p14: { label: "바이럴 지수·확산 측정", value: "", default: "공유·저장·댓글 기반 바이럴 지수 측정" },
      p15: { label: "표시광고법·추천보증 가이드라인", value: "", default: "유료 광고 표기 필수, FTC 가이드라인 준수" },
      p16: { label: "콘텐츠 저작권 귀속", value: "", default: "캠페인 종료 후 모든 콘텐츠 저작권 발주사 귀속" },
    },
    sections: buildSections([
      { title: "캠페인 전략",           fields: ["p1","p2","p3"],          icon: "gear" },
      { title: "인플루언서 마케팅",      fields: ["p4","p5","p6","p7"],    icon: "gear" },
      { title: "콘텐츠 운영",           fields: ["p8","p9"],               icon: "gear" },
      { title: "검색·블로그·바이럴",    fields: ["p10","p11","p12"],       icon: "gear" },
      { title: "성과·법적 요건",        fields: ["p13","p14","p15","p16"], icon: "chart" },
    ]),
  },

  // ──────────────────────────────────────
  // 교육 서비스 (3개)
  // ──────────────────────────────────────

  mandatory_education: {
    label: "법정의무교육 위탁 서비스", desc: "교육 서비스 법정의무교육 위탁 서비스", icon: "mandatory_education",
    fields: {
      ...buildCommonFields("mandatory_education"),
      p1:  { label: "사업장 유형 및 업종", value: "", default: "IT서비스업, 상시근로자 300인 이상" },
      p2:  { label: "교육 시작 희망일", value: "" },
      p3:  { label: "직군·직책별 교육 대상 구분", value: "", default: "일반직 250명 + 관리직 40명 + 임원 10명" },
      p4:  { label: "신규 입사자 연간 예상 인원", value: "", default: "연 50명 (수시 추가 이수 가능)" },
      p5:  { label: "산업안전보건교육 구성", value: "", default: "정기 안전교육(분기 6h) + 채용시 교육(8h) + 관리감독자 교육(16h)" },
      p6:  { label: "직장 내 성희롱 예방교육", value: "", default: "연 1회 (1시간 이상), 온라인 이수" },
      p7:  { label: "개인정보보호 교육", value: "", default: "연 1회 (2시간), CPO 교육 별도 포함" },
      p8:  { label: "장애인 인식개선 교육", value: "", default: "연 1회 (1시간), 장애인 강사 또는 당사자 참여" },
      p9:  { label: "소방안전교육", value: "", default: "연 2회 소방훈련 + 소방안전관리자 보수교육" },
      p10: { label: "기타 법정교육", value: "", default: "직장 내 괴롭힘 예방 + 퇴직연금 교육 포함" },
      p11: { label: "LMS 플랫폼 기능 요건", value: "", default: "PC + 모바일 수강, 이수현황 실시간 조회, 미이수자 자동 알림" },
      p12: { label: "이수 증빙 발급 및 보관", value: "", default: "수료증 자동 발급, 5년간 이력 보관 (고용노동부 점검 대비)" },
      p13: { label: "콘텐츠 법령 최신화", value: "", default: "법령 개정 시 30일 이내 콘텐츠 자동 업데이트" },
      p14: { label: "고용보험 환급 연계", value: "", default: "환급 가능 과정 편성, 환급 신청 대행" },
    },
    sections: buildSections([
      { title: "교육 대상 및 구성",     fields: ["p1","p2","p3","p4"],           icon: "gear" },
      { title: "법정 5대 의무교육",     fields: ["p5","p6","p7","p8","p9"],      icon: "gear" },
      { title: "기타 법정교육",         fields: ["p10"],                         icon: "gear" },
      { title: "LMS·증빙·환급",       fields: ["p11","p12","p13","p14"],       icon: "gear" },
    ]),
  },

  language_education: {
    label: "기업 어학교육 서비스", desc: "교육 서비스 기업 어학교육 서비스", icon: "language_education",
    fields: {
      ...buildCommonFields("language_education"),
      p1:  { label: "교육 시작 희망일", value: "" },
      p2:  { label: "총 수강 인원 구성", value: "", default: "영어 70명 + 일본어 20명 + 중국어 10명" },
      p3:  { label: "초기 레벨 테스트", value: "", default: "계약 후 2주 이내 전원 온라인 레벨테스트" },
      p4:  { label: "영어 과정 구성", value: "", default: "비즈니스 영어 + 이메일 작성 + 프레젠테이션 과정" },
      p5:  { label: "일본어 과정 구성", value: "", default: "비즈니스 일본어 + JLPT N2~N1 준비" },
      p6:  { label: "중국어 과정 구성", value: "", default: "비즈니스 중국어 + HSK 5~6급 준비" },
      p7:  { label: "수업 형태", value: "", default: "화상수업(주 2회 50분) + 온라인 자기주도 학습 병행" },
      p8:  { label: "그룹 수업 인원", value: "", default: "1:1 30% + 소그룹(4~6명) 70%" },
      p9:  { label: "원어민 강사 vs 비원어민", value: "", default: "원어민 강사 우선, 비원어민 한국인 강사 보조" },
      p10: { label: "출장·재택 수강자 대응", value: "", default: "화상수업으로 전환, 좌석 이월 월 2회까지" },
      p11: { label: "교재 및 학습 자료", value: "", default: "디지털 교재 무상 제공 + 부교재 PDF 다운로드" },
      p12: { label: "강사 자격 요건", value: "", default: "TESOL/CELTA 자격 + 기업 강의 경력 3년 이상" },
      p13: { label: "강사 교체 정책", value: "", default: "수강생 요청 시 2주 이내 교체, 연 2회까지 무료" },
      p14: { label: "레벨 테스트 주기", value: "", default: "분기별 레벨테스트 + 결과 보고서" },
      p15: { label: "학습 성과 리포트", value: "", default: "월간 출석·과제 현황 + 분기 성과 리포트" },
    },
    sections: buildSections([
      { title: "수강 대상 및 구성",     fields: ["p1","p2","p3"],            icon: "gear" },
      { title: "언어별 과정",           fields: ["p4","p5","p6"],            icon: "gear" },
      { title: "수업 형태 및 강사",     fields: ["p7","p8","p9","p10","p11","p12","p13"], icon: "gear" },
      { title: "성과 측정",             fields: ["p14","p15"],               icon: "chart" },
    ]),
  },

  professional_education: {
    label: "기업 전문교육 서비스", desc: "교육 서비스 기업 전문교육 서비스", icon: "professional_education",
    fields: {
      ...buildCommonFields("professional_education"),
      p1:  { label: "교육 시작 희망일", value: "" },
      p2:  { label: "연간 교육 계획 수립", value: "", default: "연초 교육 니즈 서베이 후 연간 계획 수립" },
      p3:  { label: "총 수강 인원 및 직급 구분", value: "", default: "임원 10명 + 팀장급 40명 + 실무자 150명" },
      p4:  { label: "리더십 기본 과정", value: "", default: "팀장·중간관리자 대상, 연 2회 (1일 8시간 집중)" },
      p5:  { label: "임원·경영진 리더십", value: "", default: "임원 대상 Executive Leadership, 연 1회" },
      p6:  { label: "직무 전문 교육", value: "", default: "업무 프로세스·직무기술 과정, 부서별 맞춤" },
      p7:  { label: "디지털 전환·AI·데이터 과정", value: "", default: "DX 기초 + AI 활용 + 데이터 분석, 연 4회" },
      p8:  { label: "IT 자격증 취득 지원", value: "", default: "AWS·Azure·정보처리기사 등 자격 과정" },
      p9:  { label: "임원·관리자 코칭", value: "", default: "1:1 Executive Coaching 월 2회 (6개월)" },
      p10: { label: "교육 방식 (집합/온라인)", value: "", default: "집합교육(오프라인) 60% + 온라인 40% 병행" },
      p11: { label: "강사 등급 및 단가 기준", value: "", default: "S급(대학교수/저명강사) + A급(전문강사) + B급(실무강사)" },
      p12: { label: "강사 자격 요건", value: "", default: "해당 분야 경력 10년 이상, 기업 강의 50회 이상" },
      p13: { label: "커리큘럼 커스터마이징", value: "", default: "자사 사례 중심 맞춤 개발, 사전 니즈 조사 반영" },
      p14: { label: "사전·사후 역량 평가", value: "", default: "교육 전후 역량진단 + 3개월 후 현업 적용도 측정" },
      p15: { label: "교육 성과 보고서", value: "", default: "과정별 만족도 + 역량 향상률 + ROI 분석 보고서" },
    },
    sections: buildSections([
      { title: "교육 대상 및 계획",       fields: ["p1","p2","p3"],          icon: "gear" },
      { title: "교육 과정 구성",          fields: ["p4","p5","p6","p7","p8"], icon: "gear" },
      { title: "코칭·강사·커리큘럼",     fields: ["p9","p10","p11","p12","p13"], icon: "gear" },
      { title: "성과 측정",               fields: ["p14","p15"],             icon: "chart" },
    ]),
  },

  // ──────────────────────────────────────
  // 시장정보 (1개)
  // ──────────────────────────────────────

  electronic_market_info: {
    label: "전자시장정보 구독 서비스", desc: "시장 조사·분석 정보 구독 서비스", icon: "electronic_market_info",
    fields: {
      ...buildCommonFields("electronic_market_info"),
      p1: { label: "서비스 제공업체", value: "", default: "NICE평가정보" },
      p2: { label: "정보 제공 범위", value: "", default: "국내 기업 신용등급, 재무제표, 산업 동향 리포트" },
      p3: { label: "데이터 갱신 주기", value: "", default: "실시간 신용정보 + 월간 산업 리포트" },
      p4: { label: "맞춤 리포트 제공", value: "", default: "분기별 맞춤 산업 분석 리포트 1건 포함" },
      p5: { label: "교육·컨설팅 지원", value: "", default: "초기 사용 교육 1회 + 연간 활용 컨설팅 2회" },
    },
    sections: buildSections([
      { title: "서비스 상세", fields: ["p1","p2","p3","p4","p5"], icon: "gear" },
    ]),
  },

  // ──────────────────────────────────────
  // 범용 (1개)
  // ──────────────────────────────────────

  _generic: {
    label: "일반 구매요청", desc: "일반 구매요청", icon: "_generic",
    fields: {
      ...buildCommonFields("_generic"),
      p1: { label: "품목/서비스명", value: "" },
      p2: { label: "구매 목적", value: "" },
      p3: { label: "수량/규모", value: "" },
      p4: { label: "희망 납기일", value: "" },
      p5: { label: "요구 사양", value: "" },
      p6: { label: "기타 요구사항", value: "" },
    },
    sections: buildSections([
      { title: "구매 상세", fields: ["p1","p2","p3","p4","p5","p6"], icon: "gear" },
    ]),
  },
};

// ═══════════════════════════════════════════
// 카테고리별 PR 유형 그룹핑
// ═══════════════════════════════════════════

export const PR_CATEGORIES = {
  "건물 관리": [
    "air_purifier_rental",
    "copier_rental",
    "bidet_rental",
    "document_shredding",
    "physical_security",
    "pest_control",
    "security_guard",
    "safety_management",
    "landscaping",
  ],
  "마케팅": [
    "digital_ad",
    "viral_marketing",
  ],
  "교육 서비스": [
    "mandatory_education",
    "language_education",
    "professional_education",
  ],
  "시장정보": [
    "electronic_market_info",
  ],
};

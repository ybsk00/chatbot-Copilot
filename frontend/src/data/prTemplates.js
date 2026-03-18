// ═══════════════════════════════════════════
// PR(구매요청서) 유형별 템플릿 (23개 — 차세대 품목체계)
// 공통필드(c1~c20) + 고유필드(p1~pN) 구조
// ═══════════════════════════════════════════

import { buildCommonFields, buildSections } from './commonFields';

export const PR_TEMPLATES = {

  // ──────────────────────────────────────
  // 사무·총무
  // ──────────────────────────────────────

  goods_purchase: {
    label: "물품 구매", desc: "업무용 물품 조달 및 재고 보충", icon: "goods_purchase",
    fields: {
      ...buildCommonFields("goods_purchase"),
      p1: { label: "품목명 및 규격", value: "", required: true },
      p2: { label: "수량 및 단위", value: "", required: true },
      p3: { label: "희망 납품일", value: "", required: true },
      p4: { label: "납품 장소", value: "", default: "본사 사무실", required: true },
      p5: { label: "요구 사양 (브랜드·모델 등)", value: "", required: false },
      p6: { label: "샘플·카탈로그 요청 여부", value: "", default: "필요 시 사전 샘플 확인", required: false },
      p7: { label: "검수 기준", value: "", default: "납품 시 수량·외관 검수", required: false },
    },
    sections: buildSections([
      { title: "물품 상세",     fields: ["p1","p2","p3","p4","p5"], icon: "gear" },
      { title: "검수·기타",     fields: ["p6","p7"],                icon: "gear" },
    ]),
  },

  office_support: {
    label: "사무보조 서비스", desc: "사무·행정 업무 인력 지원 서비스", icon: "office_support",
    fields: {
      ...buildCommonFields("office_support"),
      p1: { label: "업무 내용", value: "", default: "문서 작성·정리, 데이터 입력, 우편물 관리", required: true },
      p2: { label: "투입 인원 수", value: "", required: true },
      p3: { label: "근무 시간대", value: "", default: "평일 09:00~18:00", required: true },
      p4: { label: "서비스 시작 희망일", value: "", required: true },
      p5: { label: "자격 요건", value: "", default: "MS Office 활용 능력 보유", required: false },
      p6: { label: "근무 장소", value: "", default: "본사 사무실 상주", required: false },
      p7: { label: "인수인계 기간", value: "", default: "교체 시 1주 인수인계", required: false },
    },
    sections: buildSections([
      { title: "서비스 상세",   fields: ["p1","p2","p3","p4"], icon: "gear" },
      { title: "인력 요건",     fields: ["p5","p6","p7"],      icon: "gear" },
    ]),
  },

  // ──────────────────────────────────────
  // 인사·복리후생
  // ──────────────────────────────────────

  education_training: {
    label: "교육·훈련", desc: "임직원 교육·훈련 서비스", icon: "education_training",
    fields: {
      ...buildCommonFields("education_training"),
      p1: { label: "교육 과정명", value: "", required: true },
      p2: { label: "교육 대상 및 인원", value: "", required: true },
      p3: { label: "교육 시작 희망일", value: "", required: true },
      p4: { label: "교육 방식 (온라인/오프라인)", value: "", default: "온라인 LMS + 오프라인 병행", required: true },
      p5: { label: "교육 시간 및 일정", value: "", default: "1일 8시간 기준", required: true },
      p6: { label: "강사 자격 요건", value: "", default: "해당 분야 경력 5년 이상", required: false },
      p7: { label: "이수 증빙 방식", value: "", default: "수료증 자동 발급 + 이력 보관", required: false },
      p8: { label: "성과 측정 기준", value: "", default: "사전·사후 역량 평가 + 만족도 조사", required: false },
    },
    sections: buildSections([
      { title: "교육 기본 정보", fields: ["p1","p2","p3","p4","p5"], icon: "gear" },
      { title: "강사·성과",     fields: ["p6","p7","p8"],            icon: "gear" },
    ]),
  },

  welfare_service: {
    label: "복지 서비스", desc: "임직원 복리후생 서비스", icon: "welfare_service",
    fields: {
      ...buildCommonFields("welfare_service"),
      p1: { label: "복지 서비스 유형", value: "", default: "건강검진, 심리상담, 복지포인트 등", required: true },
      p2: { label: "대상 인원", value: "", required: true },
      p3: { label: "서비스 시작 희망일", value: "", required: true },
      p4: { label: "서비스 제공 방식", value: "", default: "온라인 복지몰 + 오프라인 제휴", required: true },
      p5: { label: "인당 예산 한도", value: "", required: false },
      p6: { label: "만족도 조사 방식", value: "", default: "반기별 설문 조사", required: false },
      p7: { label: "정산 및 리포팅", value: "", default: "월별 사용 현황 리포트 제공", required: false },
    },
    sections: buildSections([
      { title: "서비스 상세",   fields: ["p1","p2","p3","p4"], icon: "gear" },
      { title: "예산·리포팅",   fields: ["p5","p6","p7"],      icon: "gear" },
    ]),
  },

  // ──────────────────────────────────────
  // 시설·건물관리
  // ──────────────────────────────────────

  construction: {
    label: "시설 공사", desc: "시설물 신축·보수·개선 공사", icon: "construction",
    fields: {
      ...buildCommonFields("construction"),
      p1: { label: "공사 대상 및 위치", value: "", required: true },
      p2: { label: "공사 유형 (신축/보수/리모델링)", value: "", required: true },
      p3: { label: "공사 착공 희망일", value: "", required: true },
      p4: { label: "공사 면적·규모", value: "", required: true },
      p5: { label: "설계 포함 여부", value: "", default: "설계·시공 일괄 (턴키)", required: true },
      p6: { label: "인허가 대행 여부", value: "", default: "시공사 인허가 대행 포함", required: false },
      p7: { label: "안전관리 요건", value: "", default: "산업안전보건법 준수, 안전관리자 배치", required: false },
      p8: { label: "하자보수 기간", value: "", default: "준공 후 2년 하자보수 보증", required: false },
    },
    sections: buildSections([
      { title: "공사 개요",       fields: ["p1","p2","p3","p4","p5"], icon: "gear" },
      { title: "인허가·안전·하자", fields: ["p6","p7","p8"],          icon: "gear" },
    ]),
  },

  service_outsourcing: {
    label: "용역·아웃소싱", desc: "시설 운영·관리 업무 전문 위탁", icon: "service_outsourcing",
    fields: {
      ...buildCommonFields("service_outsourcing"),
      p1: { label: "위탁 업무 범위", value: "", required: true },
      p2: { label: "대상 시설 유형 및 위치", value: "", required: true },
      p3: { label: "서비스 시작 희망일", value: "", required: true },
      p4: { label: "투입 인력 규모", value: "", required: true },
      p5: { label: "근무 형태 (상주/방문)", value: "", default: "상주 인력 배치", required: true },
      p6: { label: "인력 자격 요건", value: "", default: "관련 자격증 보유자 우대", required: false },
      p7: { label: "SLA 기준", value: "", default: "서비스 이행률 95% 이상", required: false },
      p8: { label: "보고 체계", value: "", default: "월간 업무 보고서 제출", required: false },
    },
    sections: buildSections([
      { title: "용역 개요",     fields: ["p1","p2","p3","p4","p5"], icon: "gear" },
      { title: "인력·SLA",     fields: ["p6","p7","p8"],            icon: "gear" },
    ]),
  },

  rental_lease: {
    label: "렌탈·리스", desc: "장비·기기 렌탈 또는 리스 서비스", icon: "rental_lease",
    fields: {
      ...buildCommonFields("rental_lease"),
      p1: { label: "렌탈 품목 및 모델", value: "", required: true },
      p2: { label: "수량", value: "", required: true },
      p3: { label: "설치 장소", value: "", required: true },
      p4: { label: "서비스 시작(설치 희망)일", value: "", required: true },
      p5: { label: "요구 사양", value: "", required: true },
      p6: { label: "소모품·필터 포함 여부", value: "", default: "전 소모품 렌탈료 포함", required: false },
      p7: { label: "정기 점검 주기", value: "", default: "분기별 1회 정기 점검", required: false },
      p8: { label: "고장 시 대체 기기 제공", value: "", default: "수리 3일 초과 시 동급 대체 기기 무료 제공", required: false },
    },
    sections: buildSections([
      { title: "렌탈 기본 정보", fields: ["p1","p2","p3","p4","p5"], icon: "gear" },
      { title: "유지보수·A/S",   fields: ["p6","p7","p8"],           icon: "gear" },
    ]),
  },

  utility_energy: {
    label: "유틸리티·에너지", desc: "에너지·유틸리티 관리 서비스", icon: "utility_energy",
    fields: {
      ...buildCommonFields("utility_energy"),
      p1: { label: "대상 시설 및 위치", value: "", required: true },
      p2: { label: "에너지 유형 (전기/가스/냉난방 등)", value: "", required: true },
      p3: { label: "서비스 시작 희망일", value: "", required: true },
      p4: { label: "현재 에너지 사용량 (월)", value: "", required: false },
      p5: { label: "절감 목표", value: "", default: "현재 대비 10% 이상 절감", required: true },
      p6: { label: "모니터링 방식", value: "", default: "IoT 센서 기반 실시간 모니터링", required: false },
      p7: { label: "정기 점검 주기", value: "", default: "월 1회 설비 점검 방문", required: false },
    },
    sections: buildSections([
      { title: "에너지 현황",     fields: ["p1","p2","p3","p4","p5"], icon: "gear" },
      { title: "모니터링·점검",   fields: ["p6","p7"],                icon: "gear" },
    ]),
  },

  // ──────────────────────────────────────
  // 차량·출장
  // ──────────────────────────────────────

  business_travel: {
    label: "출장 서비스", desc: "국내외 출장 지원 서비스", icon: "business_travel",
    fields: {
      ...buildCommonFields("business_travel"),
      p1: { label: "출장 유형 (국내/해외)", value: "", required: true },
      p2: { label: "주요 출장 지역", value: "", required: true },
      p3: { label: "서비스 시작 희망일", value: "", required: true },
      p4: { label: "연간 예상 출장 건수", value: "", required: true },
      p5: { label: "예약 서비스 범위", value: "", default: "항공권·숙박·교통·비자 대행", required: true },
      p6: { label: "온라인 예약 시스템 제공", value: "", default: "웹·앱 기반 예약 시스템 제공", required: false },
      p7: { label: "정산 및 리포팅", value: "", default: "월별 출장비 정산 리포트 제공", required: false },
      p8: { label: "긴급 출장 지원", value: "", default: "24시간 긴급 예약 지원", required: false },
    },
    sections: buildSections([
      { title: "출장 기본 정보", fields: ["p1","p2","p3","p4","p5"], icon: "gear" },
      { title: "부가 서비스",    fields: ["p6","p7","p8"],           icon: "gear" },
    ]),
  },

  // ──────────────────────────────────────
  // 보험 서비스
  // ──────────────────────────────────────

  insurance: {
    label: "보험", desc: "기업 보험 가입·관리 서비스", icon: "insurance",
    fields: {
      ...buildCommonFields("insurance"),
      p1: { label: "보험 종류", value: "", default: "재산종합보험, 배상책임보험, 상해보험 등", required: true },
      p2: { label: "피보험 대상 (시설/인원/차량 등)", value: "", required: true },
      p3: { label: "보험 시작 희망일", value: "", required: true },
      p4: { label: "보장 범위 및 한도", value: "", required: true },
      p5: { label: "특약 사항", value: "", required: false },
      p6: { label: "보험료 납입 방식", value: "", default: "연납 (일시불 또는 분할)", required: false },
      p7: { label: "사고 시 보상 절차", value: "", default: "전담 설계사 보상 대행", required: false },
    },
    sections: buildSections([
      { title: "보험 기본 정보", fields: ["p1","p2","p3","p4"], icon: "gear" },
      { title: "특약·납입·보상", fields: ["p5","p6","p7"],      icon: "gear" },
    ]),
  },

  // ──────────────────────────────────────
  // 전문용역·컨설팅
  // ──────────────────────────────────────

  consulting: {
    label: "전문 컨설팅", desc: "경영·전략·IT 등 전문 컨설팅 서비스", icon: "consulting",
    fields: {
      ...buildCommonFields("consulting"),
      p1: { label: "컨설팅 분야", value: "", required: true },
      p2: { label: "과제 목적 및 범위", value: "", required: true },
      p3: { label: "수행 시작 희망일", value: "", required: true },
      p4: { label: "예상 수행 기간", value: "", required: true },
      p5: { label: "투입 인력 구성", value: "", default: "PM 1명 + 선임 2명 + 주니어 2명", required: true },
      p6: { label: "주요 산출물", value: "", default: "최종 보고서 + 실행 로드맵", required: false },
      p7: { label: "정기 보고 주기", value: "", default: "격주 1회 진행 보고 + 월 1회 경영진 보고", required: false },
      p8: { label: "지식재산권 귀속", value: "", default: "산출물 저작권 발주사 귀속", required: false },
    },
    sections: buildSections([
      { title: "컨설팅 개요",   fields: ["p1","p2","p3","p4","p5"], icon: "gear" },
      { title: "산출물·보고",   fields: ["p6","p7","p8"],           icon: "gear" },
    ]),
  },

  // ──────────────────────────────────────
  // 마케팅
  // ──────────────────────────────────────

  advertising_media: {
    label: "광고·매체", desc: "광고 제작 및 매체 집행 대행 서비스", icon: "advertising_media",
    fields: {
      ...buildCommonFields("advertising_media"),
      p1: { label: "캠페인 목적", value: "", required: true },
      p2: { label: "타겟 오디언스", value: "", default: "25~45세, 수도권 중심", required: true },
      p3: { label: "캠페인 시작 희망일", value: "", required: true },
      p4: { label: "미디어 믹스 (채널 구성)", value: "", default: "검색 40% + DA 30% + SNS 20% + 동영상 10%", required: true },
      p5: { label: "월 매체비 예산", value: "", required: true },
      p6: { label: "소재 제작 범위", value: "", default: "배너 10종 + 동영상 2편 / 월", required: false },
      p7: { label: "KPI 목표", value: "", default: "CTR 2% 이상, ROAS 300% 이상", required: false },
      p8: { label: "리포팅 주기", value: "", default: "주간 대시보드 + 월간 정식 리포트", required: false },
    },
    sections: buildSections([
      { title: "캠페인 전략",     fields: ["p1","p2","p3","p4","p5"], icon: "gear" },
      { title: "소재·KPI·리포팅", fields: ["p6","p7","p8"],           icon: "chart" },
    ]),
  },

  event_exhibition: {
    label: "이벤트·행사", desc: "기업 이벤트·전시·프로모션 운영", icon: "event_exhibition",
    fields: {
      ...buildCommonFields("event_exhibition"),
      p1: { label: "행사 유형 (세미나/전시/프로모션 등)", value: "", required: true },
      p2: { label: "행사 목적", value: "", required: true },
      p3: { label: "행사 일정", value: "", required: true },
      p4: { label: "예상 참석 인원", value: "", required: true },
      p5: { label: "장소 요건", value: "", default: "서울 접근성 좋은 컨벤션·호텔", required: true },
      p6: { label: "프로그램 구성", value: "", default: "기조연설 + 세션 + 네트워킹", required: false },
      p7: { label: "부대시설 요건", value: "", default: "케이터링, 음향·조명, 촬영·중계", required: false },
      p8: { label: "사후 정리 및 리포트", value: "", default: "행사 결과 보고서 + 참석자 설문 분석", required: false },
    },
    sections: buildSections([
      { title: "행사 개요",       fields: ["p1","p2","p3","p4","p5"], icon: "gear" },
      { title: "프로그램·부대",   fields: ["p6","p7","p8"],           icon: "gear" },
    ]),
  },

  print_production: {
    label: "인쇄·제작", desc: "홍보물·카탈로그·패키지 인쇄 제작", icon: "print_production",
    fields: {
      ...buildCommonFields("print_production"),
      p1: { label: "인쇄물 종류", value: "", default: "카탈로그, 브로슈어, 명함, 포스터 등", required: true },
      p2: { label: "수량", value: "", required: true },
      p3: { label: "납품 희망일", value: "", required: true },
      p4: { label: "규격·지질·후가공", value: "", default: "A4 무광코팅 양면 컬러", required: true },
      p5: { label: "디자인 시안 제공 여부", value: "", default: "시안 AI/PDF 지급, 제판 대행", required: true },
      p6: { label: "교정 횟수", value: "", default: "최대 3회 교정 포함", required: false },
      p7: { label: "납품 장소 및 방식", value: "", default: "본사 지정 장소 택배 납품", required: false },
    },
    sections: buildSections([
      { title: "인쇄 상세",       fields: ["p1","p2","p3","p4","p5"], icon: "gear" },
      { title: "교정·납품",       fields: ["p6","p7"],                icon: "gear" },
    ]),
  },

  // ──────────────────────────────────────
  // IT/ICT
  // ──────────────────────────────────────

  it_hardware: {
    label: "IT 하드웨어", desc: "업무용 IT 장비 구매·도입", icon: "it_hardware",
    fields: {
      ...buildCommonFields("it_hardware"),
      p1: { label: "장비 유형 (PC/서버/네트워크 등)", value: "", required: true },
      p2: { label: "수량", value: "", required: true },
      p3: { label: "희망 납품일", value: "", required: true },
      p4: { label: "요구 사양 (CPU/RAM/SSD 등)", value: "", required: true },
      p5: { label: "설치·셋업 포함 여부", value: "", default: "납품 후 설치·셋업 + OS 이미지 적용", required: true },
      p6: { label: "보증 기간", value: "", default: "3년 무상 보증 (온사이트)", required: false },
      p7: { label: "기존 장비 회수 여부", value: "", default: "기존 장비 회수 및 데이터 삭제 포함", required: false },
    },
    sections: buildSections([
      { title: "장비 사양",       fields: ["p1","p2","p3","p4","p5"], icon: "gear" },
      { title: "보증·회수",       fields: ["p6","p7"],                icon: "gear" },
    ]),
  },

  it_software_cloud: {
    label: "IT SW·클라우드", desc: "소프트웨어·클라우드 서비스 도입", icon: "it_software_cloud",
    fields: {
      ...buildCommonFields("it_software_cloud"),
      p1: { label: "제품/서비스명", value: "", required: true },
      p2: { label: "라이선스 수량 (사용자/코어 등)", value: "", required: true },
      p3: { label: "도입 시작 희망일", value: "", required: true },
      p4: { label: "배포 방식 (SaaS/온프레미스/하이브리드)", value: "", default: "SaaS (클라우드)", required: true },
      p5: { label: "연동 요건 (기존 시스템)", value: "", required: false },
      p6: { label: "SLA 기준", value: "", default: "가용률 99.9% 이상, 장애 응답 4시간 이내", required: true },
      p7: { label: "데이터 보안·백업", value: "", default: "데이터 암호화 + 일일 자동 백업", required: false },
      p8: { label: "교육·기술지원", value: "", default: "도입 교육 1회 + 연간 기술지원 포함", required: false },
    },
    sections: buildSections([
      { title: "SW·클라우드 기본", fields: ["p1","p2","p3","p4"],     icon: "gear" },
      { title: "SLA·보안·지원",   fields: ["p5","p6","p7","p8"],     icon: "gear" },
    ]),
  },

  it_development: {
    label: "IT 개발·운영", desc: "시스템 개발·구축·운영 서비스", icon: "it_development",
    fields: {
      ...buildCommonFields("it_development"),
      p1: { label: "프로젝트명", value: "", required: true },
      p2: { label: "개발 범위 (요구사항 요약)", value: "", required: true },
      p3: { label: "착수 희망일", value: "", required: true },
      p4: { label: "예상 개발 기간", value: "", required: true },
      p5: { label: "개발 방법론 (애자일/워터폴)", value: "", default: "애자일 (2주 스프린트)", required: true },
      p6: { label: "투입 인력 구성", value: "", default: "PM 1명 + 개발 3명 + QA 1명", required: false },
      p7: { label: "운영·유지보수 기간", value: "", default: "오픈 후 1년 하자보수 + 운영", required: false },
      p8: { label: "산출물 및 지식재산권", value: "", default: "소스코드·문서 전체 양도, 저작권 발주사 귀속", required: false },
    },
    sections: buildSections([
      { title: "프로젝트 개요",     fields: ["p1","p2","p3","p4","p5"], icon: "gear" },
      { title: "인력·운영·산출물", fields: ["p6","p7","p8"],            icon: "gear" },
    ]),
  },

  // ──────────────────────────────────────
  // 물류
  // ──────────────────────────────────────

  logistics_transport: {
    label: "물류 운송", desc: "상품·자재 운송 및 배송 서비스", icon: "logistics_transport",
    fields: {
      ...buildCommonFields("logistics_transport"),
      p1: { label: "운송 구간 (출발지→도착지)", value: "", required: true },
      p2: { label: "화물 종류 및 중량", value: "", required: true },
      p3: { label: "서비스 시작 희망일", value: "", required: true },
      p4: { label: "운송 빈도 (일/주/월)", value: "", required: true },
      p5: { label: "차종 요건", value: "", default: "1톤 / 2.5톤 / 5톤 등", required: false },
      p6: { label: "화물 보험 가입", value: "", default: "운송 화물 보험 필수 가입", required: true },
      p7: { label: "TMS 연동 여부", value: "", default: "실시간 배송 추적 TMS 제공", required: false },
    },
    sections: buildSections([
      { title: "운송 기본 정보", fields: ["p1","p2","p3","p4","p5"], icon: "gear" },
      { title: "보험·TMS",       fields: ["p6","p7"],                icon: "gear" },
    ]),
  },

  logistics_warehouse: {
    label: "물류 창고·풀필먼트", desc: "재고 보관·관리 및 출고 대행", icon: "logistics_warehouse",
    fields: {
      ...buildCommonFields("logistics_warehouse"),
      p1: { label: "보관 물품 종류", value: "", required: true },
      p2: { label: "필요 창고 면적·팔레트 수", value: "", required: true },
      p3: { label: "서비스 시작 희망일", value: "", required: true },
      p4: { label: "입출고 빈도 (일/주)", value: "", required: true },
      p5: { label: "보관 조건 (상온/냉장/냉동)", value: "", default: "상온 보관", required: true },
      p6: { label: "WMS 시스템 제공 여부", value: "", default: "WMS 재고 관리 시스템 제공", required: false },
      p7: { label: "풀필먼트 서비스 범위", value: "", default: "피킹·포장·출고·반품 처리 포함", required: false },
    },
    sections: buildSections([
      { title: "창고·물류 기본",   fields: ["p1","p2","p3","p4","p5"], icon: "gear" },
      { title: "WMS·풀필먼트",     fields: ["p6","p7"],                icon: "gear" },
    ]),
  },

  // ──────────────────────────────────────
  // 연구개발
  // ──────────────────────────────────────

  rd_service: {
    label: "연구개발 용역·장비", desc: "R&D 과제 수행 및 연구 장비 도입", icon: "rd_service",
    fields: {
      ...buildCommonFields("rd_service"),
      p1: { label: "연구 과제명", value: "", required: true },
      p2: { label: "연구 목적 및 범위", value: "", required: true },
      p3: { label: "수행 시작 희망일", value: "", required: true },
      p4: { label: "예상 수행 기간", value: "", required: true },
      p5: { label: "연구 장비·시약 필요 여부", value: "", required: false },
      p6: { label: "투입 연구 인력", value: "", default: "책임연구원 1명 + 연구원 2명", required: true },
      p7: { label: "성과물 (보고서/특허/논문 등)", value: "", default: "최종 보고서 + 특허 출원", required: false },
      p8: { label: "지식재산권 귀속", value: "", default: "공동 연구 시 지분 사전 협의", required: false },
    },
    sections: buildSections([
      { title: "연구 개요",       fields: ["p1","p2","p3","p4"],     icon: "gear" },
      { title: "인력·장비·성과",  fields: ["p5","p6","p7","p8"],     icon: "gear" },
    ]),
  },

  certification_test: {
    label: "인증·시험·IP", desc: "제품 인증·시험 분석 및 지식재산권 관리", icon: "certification_test",
    fields: {
      ...buildCommonFields("certification_test"),
      p1: { label: "서비스 유형 (인증/시험/IP)", value: "", required: true },
      p2: { label: "대상 제품·기술명", value: "", required: true },
      p3: { label: "서비스 시작 희망일", value: "", required: true },
      p4: { label: "인증·시험 항목", value: "", required: true },
      p5: { label: "적용 규격·기준", value: "", default: "KS, ISO, IEC 등 해당 규격 명시", required: true },
      p6: { label: "시험 기관 지정 여부", value: "", default: "KOLAS 공인 시험기관 필수", required: false },
      p7: { label: "IP 출원·등록 대행", value: "", default: "특허·상표 출원 대행 포함", required: false },
    },
    sections: buildSections([
      { title: "인증·시험 기본", fields: ["p1","p2","p3","p4","p5"], icon: "gear" },
      { title: "시험기관·IP",    fields: ["p6","p7"],                icon: "gear" },
    ]),
  },

  // ──────────────────────────────────────
  // 생산관리
  // ──────────────────────────────────────

  production_safety: {
    label: "생산·안전·폐기", desc: "생산 설비 관리, 산업안전, 폐기물 처리", icon: "production_safety",
    fields: {
      ...buildCommonFields("production_safety"),
      p1: { label: "서비스 유형 (설비관리/안전/폐기)", value: "", required: true },
      p2: { label: "대상 시설·설비", value: "", required: true },
      p3: { label: "서비스 시작 희망일", value: "", required: true },
      p4: { label: "점검·관리 주기", value: "", default: "월 1회 정기 점검", required: true },
      p5: { label: "법적 요건 (산안법·환경법 등)", value: "", default: "산업안전보건법·폐기물관리법 준수", required: true },
      p6: { label: "폐기물 종류·수량 (해당 시)", value: "", required: false },
      p7: { label: "긴급 대응 체계", value: "", default: "24시간 긴급 출동 대기", required: false },
    },
    sections: buildSections([
      { title: "서비스 기본 정보", fields: ["p1","p2","p3","p4","p5"], icon: "gear" },
      { title: "폐기·긴급 대응",   fields: ["p6","p7"],               icon: "gear" },
    ]),
  },

  // ──────────────────────────────────────
  // 기타 (범용)
  // ──────────────────────────────────────

  _generic: {
    label: "일반 구매요청", desc: "일반 구매요청", icon: "_generic",
    fields: {
      ...buildCommonFields("_generic"),
      p1: { label: "품목/서비스명", value: "", required: true },
      p2: { label: "구매 목적", value: "", required: true },
      p3: { label: "수량/규모", value: "", required: true },
      p4: { label: "희망 납기일", value: "", required: true },
      p5: { label: "요구 사양", value: "", required: false },
      p6: { label: "기타 요구사항", value: "", required: false },
    },
    sections: buildSections([
      { title: "구매 상세", fields: ["p1","p2","p3","p4","p5","p6"], icon: "gear" },
    ]),
  },
};

// ═══════════════════════════════════════════
// 카테고리별 PR 유형 그룹핑 (11개 L1 대분류)
// ═══════════════════════════════════════════

export const PR_CATEGORIES = {
  "사무·총무": ["goods_purchase", "office_support"],
  "인사·복리후생": ["education_training", "welfare_service"],
  "시설·건물관리": ["construction", "service_outsourcing", "rental_lease", "utility_energy"],
  "차량·출장": ["business_travel"],
  "보험 서비스": ["insurance"],
  "전문용역·컨설팅": ["consulting"],
  "마케팅": ["advertising_media", "event_exhibition", "print_production"],
  "IT/ICT": ["it_hardware", "it_software_cloud", "it_development"],
  "물류": ["logistics_transport", "logistics_warehouse"],
  "생산관리": ["production_safety"],
  "연구개발": ["rd_service", "certification_test"],
};

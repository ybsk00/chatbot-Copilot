// ═══════════════════════════════════════════
// PR(구매요청서) → RFP(제안요청서) 필드 매핑
// ═══════════════════════════════════════════

/**
 * 각 PR 카테고리가 어떤 RFP 유형에 매핑되는지,
 * 그리고 PR 필드(p/r prefix) → RFP 필드(s prefix)의 대응 관계를 정의.
 *
 * 공통: 요청자 정보 (r1~r5) → 발주기관 정보 (s1~s5)는 모든 카테고리 공통.
 */

// 요청자 정보 공통 매핑 (모든 카테고리에 적용)
const COMMON_FIELD_MAP = {
  r1: "s1",  // 발주기관명 → 발주기관명
  r2: "s2",  // 요청부서 → 담당부서
  r3: "s3",  // 요청자 → 담당자
  r4: "s4",  // 연락처 → 연락처
  r5: "s5",  // 이메일 → 이메일
};

export const PR_TO_RFP_MAPPING = {
  // ── 렌탈 계열 → rental ──
  air_purifier_rental: {
    rfpType: "rental",
    fieldMap: {
      ...COMMON_FIELD_MAP,
      p1: "s6",   // 설치 시설 유형 → 사업명
      p2: "s10",  // 총 렌탈 대수 → 대상 규모
      p3: "s9",   // 계약 기간 → 계약기간
      p5: "s8",   // 렌탈 방식 → 리스/렌탈 형태
      p7: "s11",  // 기기 등급 → 요구 사양
      p13: "s12", // 필터 교체 포함 → 포함 서비스
      p23: "s13", // A/S 응답시간 → 유지보수 기준
      p29: "s15", // 월 렌탈료 → 총비용(TCO)
    },
  },
  copier_rental: {
    rfpType: "rental",
    fieldMap: {
      ...COMMON_FIELD_MAP,
      p1: "s6",   // 설치 시설 유형 → 사업명
      p2: "s10",  // 총 렌탈 대수 → 대상 규모
      p3: "s9",   // 계약 기간 → 계약기간
      p5: "s8",   // 렌탈 방식 → 리스/렌탈 형태
      p6: "s11",  // 기기 등급 → 요구 사양
      p11: "s12", // 토너 포함 → 포함 서비스
    },
  },
  bidet_rental: {
    rfpType: "rental",
    fieldMap: {
      ...COMMON_FIELD_MAP,
      p1: "s6",   // 설치 시설 유형 → 사업명
      p2: "s10",  // 총 렌탈 대수 → 대상 규모
      p3: "s9",   // 계약 기간 → 계약기간
      p5: "s8",   // 렌탈 방식 → 리스/렌탈 형태
      p6: "s11",  // 기기 등급 → 요구 사양
      p7: "s12",  // 위생 관리 → 포함 서비스
      p9: "s13",  // A/S 응답시간 → 유지보수 기준
    },
  },

  // ── 서비스 계열 → service ──
  document_shredding: {
    rfpType: "service",
    fieldMap: {
      ...COMMON_FIELD_MAP,
      p1: "s6",   // 계약 유형 → 서비스명
      p3: "s9",   // 연간 파기 물량 → 대상 규모
      p5: "s8",   // 계약 기간 → 계약기간
      p12: "s12", // 파기 등급 → 품질·SLA 기준
      p22: "s13", // 법적 근거 준수 → 보안 요건
    },
  },
  physical_security: {
    rfpType: "service",
    fieldMap: {
      ...COMMON_FIELD_MAP,
      p1: "s6",   // 대상 시설 → 서비스명
      p2: "s9",   // 총 보안 면적 → 대상 규모
      p3: "s8",   // 계약 기간 → 계약기간
      p5: "s12",  // 보안 등급 → 품질·SLA 기준
      p6: "s10",  // CCTV 대수 → 서비스 범위
    },
  },
  pest_control: {
    rfpType: "service",
    fieldMap: {
      ...COMMON_FIELD_MAP,
      p1: "s6",   // 대상 시설 → 서비스명
      p2: "s9",   // 총 면적 → 대상 규모
      p3: "s8",   // 계약 기간 → 계약기간
      p5: "s10",  // 방역 주기 → 서비스 범위
      p7: "s12",  // 약제 요건 → 품질·SLA 기준
    },
  },
  security_guard: {
    rfpType: "service",
    fieldMap: {
      ...COMMON_FIELD_MAP,
      p1: "s6",   // 대상 시설 → 서비스명
      p2: "s9",   // 경비 인원 → 대상 규모
      p4: "s8",   // 계약 기간 → 계약기간
      p6: "s10",  // 업무 범위 → 서비스 범위
      p7: "s12",  // 자격 요건 → 품질·SLA 기준
    },
  },
  safety_management: {
    rfpType: "service",
    fieldMap: {
      ...COMMON_FIELD_MAP,
      p1: "s6",   // 대상 시설 → 서비스명
      p2: "s10",  // 안전관리 범위 → 서비스 범위
      p3: "s8",   // 계약 기간 → 계약기간
      p5: "s12",  // 자격 요건 → 품질·SLA 기준
    },
  },
  landscaping: {
    rfpType: "service",
    fieldMap: {
      ...COMMON_FIELD_MAP,
      p1: "s6",   // 대상 시설 → 서비스명
      p2: "s9",   // 총 면적 → 대상 규모
      p3: "s8",   // 계약 기간 → 계약기간
      p6: "s10",  // 관리 범위 → 서비스 범위
    },
  },

  // ── 용역 계열 → service_contract ──
  digital_ad: {
    rfpType: "service_contract",
    fieldMap: {
      ...COMMON_FIELD_MAP,
      p1: "s6",   // 캠페인 목적 → 사업명
      p1: "s7",   // 캠페인 목적 → 사업목적
      p3: "s9",   // 캠페인 기간 → 수행기간
      p5: "s11",  // 대행 서비스 범위 → 서비스 범위
      p34: "s14", // KPI 설정 → SLA 기준
    },
  },
  viral_marketing: {
    rfpType: "service_contract",
    fieldMap: {
      ...COMMON_FIELD_MAP,
      p1: "s7",   // 캠페인 목적 → 사업목적
      p3: "s9",   // 캠페인 기간 → 수행기간
      p5: "s11",  // 대행 서비스 범위 → 서비스 범위
      p10: "s14", // KPI → SLA 기준
    },
  },
  mandatory_education: {
    rfpType: "service_contract",
    fieldMap: {
      ...COMMON_FIELD_MAP,
      p2: "s6",   // 교육 과목 → 사업명
      p1: "s10",  // 교육 대상 인원 → 대상인원
      p4: "s9",   // 계약 기간 → 수행기간
      p3: "s12",  // 교육 방식 → 수행 방식
      p6: "s14",  // 수료 기준 → SLA 기준
    },
  },
  language_education: {
    rfpType: "service_contract",
    fieldMap: {
      ...COMMON_FIELD_MAP,
      p2: "s6",   // 교육 언어 → 사업명
      p1: "s10",  // 교육 대상 인원 → 대상인원
      p4: "s9",   // 계약 기간 → 수행기간
      p3: "s12",  // 교육 방식 → 수행 방식
    },
  },
  professional_education: {
    rfpType: "service_contract",
    fieldMap: {
      ...COMMON_FIELD_MAP,
      p2: "s6",   // 교육 분야 → 사업명
      p1: "s10",  // 교육 대상 인원 → 대상인원
      p4: "s9",   // 계약 기간 → 수행기간
      p3: "s12",  // 교육 방식 → 수행 방식
    },
  },
  electronic_market_info: {
    rfpType: "service_contract",
    fieldMap: {
      ...COMMON_FIELD_MAP,
      p1: "s6",   // 서비스 제공업체 → 사업명
      p6: "s9",   // 구독 기간 → 수행기간
      p9: "s11",  // 데이터 제공 형태 → 서비스 범위
    },
  },

  // ── 범용 → purchase ──
  _generic: {
    rfpType: "purchase",
    fieldMap: {
      ...COMMON_FIELD_MAP,
      p4: "s6",   // 품목/서비스명 → 구매 품목
      p5: "s7",   // 구매 목적 → 구매 목적
      p6: "s8",   // 수량 → 수량
      p7: "s9",   // 희망 납기일 → 납품기한
      p9: "s10",  // 요구 사양 → 요구 사양
    },
  },
};

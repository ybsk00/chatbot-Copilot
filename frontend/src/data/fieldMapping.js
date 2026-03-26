// ═══════════════════════════════════════════
// PR(구매요청서) → RFP(제안요청서) 필드 매핑
// ═══════════════════════════════════════════

/**
 * PR 공통필드(c1~c20)가 RFP 필드(s*)에 매핑됨.
 * RFP 유형별로 s6~s14의 의미가 다르므로 유형별 공통 매핑을 정의.
 * 카테고리별 고유필드(p*) → RFP 필드(s*) 추가 매핑도 포함.
 *
 * PR 공통필드 13개(c1~c13) → RFP 필드 매핑 = 65% 이상 공통
 */

// ── RFP 유형별 공통필드 매핑 ──
// c1~c5(요청자) → s1~s5는 모든 유형 동일
// c6~c13은 RFP 유형마다 대응하는 s* 번호가 다름

const BASE_MAP = {
  c1: "s1",   // 발주기관명
  c2: "s2",   // 요청부서 → 담당부서
  c3: "s3",   // 요청자 → 담당자
  c4: "s4",   // 연락처
  c5: "s5",   // 이메일
};

const COMMON_MAP_BY_RFP = {
  rental: {
    ...BASE_MAP,
    c6:  "s6",   // 서비스명 → 사업명
    c7:  "s7",   // 구매 목적 → 계약 목적
    c8:  "s8",   // 계약 유형 → 리스/렌탈 형태
    c9:  "s9",   // 계약 기간 → 계약기간
    c10: "s10",  // 대상 규모 → 대상 규모
    c11: "s11",  // 서비스 범위 → 요구 사양
    c12: "s12",  // 제공 방식 → 포함 서비스
    c13: "s13",  // 품질/SLA → 유지보수 기준
  },
  service: {
    ...BASE_MAP,
    c6:  "s6",   // 서비스명 → 서비스명
    c7:  "s7",   // 구매 목적 → 서비스 목적
    c9:  "s8",   // 계약 기간 → 계약기간
    c10: "s9",   // 대상 규모 → 대상 규모
    c11: "s10",  // 서비스 범위 → 서비스 범위
    c12: "s11",  // 제공 방식 → 제공 방식
    c13: "s12",  // 품질/SLA → 품질·SLA 기준
    c14: "s13",  // 보안 요건 → 보안 요건
  },
  service_contract: {
    ...BASE_MAP,
    c6:  "s6",   // 서비스명 → 사업명
    c7:  "s7",   // 구매 목적 → 사업목적
    c8:  "s8",   // 계약 유형 → 계약형태
    c9:  "s9",   // 계약 기간 → 수행기간
    c10: "s10",  // 대상 규모 → 대상인원
    c11: "s11",  // 서비스 범위 → 서비스 범위
    c12: "s12",  // 제공 방식 → 수행 방식
    c13: "s14",  // 품질/SLA → SLA 기준
  },
  purchase: {
    ...BASE_MAP,
    c6:  "s6",   // 서비스명 → 구매 품목
    c7:  "s7",   // 구매 목적 → 구매 목적
    c10: "s8",   // 대상 규모 → 수량
    c9:  "s9",   // 계약 기간 → 납품기한
    c11: "s10",  // 서비스 범위 → 요구 사양
    c13: "s11",  // 품질/SLA → 품질 기준
  },
  construction: {
    ...BASE_MAP,
    c6:  "s6",   // 서비스명 → 공사명
    c7:  "s7",   // 구매 목적 → 공사 목적
    c9:  "s8",   // 계약 기간 → 공사기간
    c10: "s9",   // 대상 규모 → 공사 규모
    c11: "s10",  // 서비스 범위 → 공사 범위
    c13: "s12",  // 품질/SLA → 품질 기준
    c14: "s13",  // 보안 요건 → 안전 기준
  },
  consulting: {
    ...BASE_MAP,
    c6:  "s6",   // 서비스명 → 사업명
    c7:  "s7",   // 구매 목적 → 사업 목적
    c9:  "s8",   // 계약 기간 → 수행기간
    c10: "s9",   // 대상 규모 → 투입 인력
    c11: "s10",  // 서비스 범위 → 컨설팅 범위
    c14: "s13",  // 보안 요건 → 보안·기밀 요건
  },
  purchase_maintenance: {
    ...BASE_MAP,
    c6:  "s6",   // 서비스명 → 구매 품목
    c7:  "s7",   // 구매 목적 → 구매 목적
    c10: "s8",   // 대상 규모 → 수량
    c9:  "s9",   // 계약 기간 → 납품기한
    c11: "s10",  // 서비스 범위 → 요구 사양
    c13: "s11",  // 품질/SLA → 품질 기준
  },
  rental_maintenance: {
    ...BASE_MAP,
    c6:  "s6",   // 서비스명 → 사업명
    c7:  "s7",   // 구매 목적 → 계약 목적
    c8:  "s8",   // 계약 유형 → 렌탈 형태
    c9:  "s9",   // 계약 기간 → 계약기간
    c10: "s10",  // 대상 규모 → 대상 규모
    c11: "s11",  // 서비스 범위 → 요구 사양
    c12: "s12",  // 제공 방식 → 포함 서비스
    c13: "s13",  // 품질/SLA → 유지보수 SLA
  },
  purchase_lease: {
    ...BASE_MAP,
    c6:  "s6",   // 서비스명 → 대상 장비
    c7:  "s7",   // 구매 목적 → 도입 목적
    c8:  "s8",   // 계약 유형 → 계약 형태
    c10: "s9",   // 대상 규모 → 수량
    c9:  "s10",  // 계약 기간 → 계약기간
    c11: "s11",  // 서비스 범위 → 요구 사양
    c13: "s12",  // 품질/SLA → 품질 기준
  },
};

// ── 카테고리별 매핑 (공통 + 고유 필드) ──

export const PR_TO_RFP_MAPPING = {
  // ── 렌탈 계열 → rental ──
  air_purifier_rental: {
    rfpType: "rental",
    fieldMap: {
      ...COMMON_MAP_BY_RFP.rental,
      p4: "s11",  // CADR 수치 → 요구 사양 (보충)
    },
  },
  copier_rental: {
    rfpType: "rental",
    fieldMap: {
      ...COMMON_MAP_BY_RFP.rental,
      p3: "s11",  // 인쇄 속도 → 요구 사양 (보충)
      p9: "s12",  // 토너 포함 → 포함 서비스 (보충)
    },
  },
  bidet_rental: {
    rfpType: "rental",
    fieldMap: {
      ...COMMON_MAP_BY_RFP.rental,
      p3: "s11",  // 기기 등급 → 요구 사양 (보충)
      p7: "s12",  // 위생 관리 범위 → 포함 서비스 (보충)
    },
  },

  // ── 서비스 계열 → service ──
  document_shredding: {
    rfpType: "service",
    fieldMap: {
      ...COMMON_MAP_BY_RFP.service,
      p7: "s12",  // 파기 등급 → 품질·SLA 기준 (보충)
    },
  },
  physical_security: {
    rfpType: "service",
    fieldMap: {
      ...COMMON_MAP_BY_RFP.service,
      p3: "s10",  // CCTV 대수 → 서비스 범위 (보충)
    },
  },
  pest_control: {
    rfpType: "service",
    fieldMap: {
      ...COMMON_MAP_BY_RFP.service,
      p6: "s12",  // 약제 요건 → 품질·SLA (보충)
    },
  },
  security_guard: {
    rfpType: "service",
    fieldMap: {
      ...COMMON_MAP_BY_RFP.service,
    },
  },
  safety_management: {
    rfpType: "service",
    fieldMap: {
      ...COMMON_MAP_BY_RFP.service,
    },
  },
  landscaping: {
    rfpType: "service",
    fieldMap: {
      ...COMMON_MAP_BY_RFP.service,
      p3: "s9",   // 수목 수량 → 대상 규모 (보충)
    },
  },

  // ── 용역 계열 → service_contract ──
  digital_ad: {
    rfpType: "service_contract",
    fieldMap: {
      ...COMMON_MAP_BY_RFP.service_contract,
      p14: "s14",  // KPI 설정 → SLA 기준 (보충)
    },
  },
  viral_marketing: {
    rfpType: "service_contract",
    fieldMap: {
      ...COMMON_MAP_BY_RFP.service_contract,
    },
  },
  mandatory_education: {
    rfpType: "service_contract",
    fieldMap: {
      ...COMMON_MAP_BY_RFP.service_contract,
    },
  },
  language_education: {
    rfpType: "service_contract",
    fieldMap: {
      ...COMMON_MAP_BY_RFP.service_contract,
      p2: "s10",   // 수강인원 구성 → 대상인원 (보충)
    },
  },
  professional_education: {
    rfpType: "service_contract",
    fieldMap: {
      ...COMMON_MAP_BY_RFP.service_contract,
      p3: "s10",   // 수강인원 구성 → 대상인원 (보충)
    },
  },
  electronic_market_info: {
    rfpType: "service_contract",
    fieldMap: {
      ...COMMON_MAP_BY_RFP.service_contract,
      p1: "s6",   // 서비스 제공업체 → 사업명 (보충)
    },
  },

  // ── 범용 → purchase ──
  _generic: {
    rfpType: "purchase",
    fieldMap: {
      ...COMMON_MAP_BY_RFP.purchase,
      p1: "s6",   // 품목명 → 구매 품목 (보충)
      p2: "s7",   // 구매 목적 → 구매 목적 (보충)
    },
  },

  // ═══════════════════════════════════════════
  // 차세대 품목체계 PR 그룹 (23개) → RFP 매핑
  // ═══════════════════════════════════════════

  // ── 물품구매 → purchase ──
  goods_purchase: {
    rfpType: "purchase",
    fieldMap: {
      ...COMMON_MAP_BY_RFP.purchase,
      p1: "s6",   // 품목 카테고리 → 구매 품목
      p3: "s10",  // 상세 품목 리스트 → 요구 사양
    },
  },

  // ── 렌탈·리스 → rental ──
  rental_lease: {
    rfpType: "rental",
    fieldMap: {
      ...COMMON_MAP_BY_RFP.rental,
      p1: "s6",   // 렌탈 품목 → 사업명 (보충)
      p5: "s11",  // 기기 사양 → 요구 사양 (보충)
    },
  },

  // ── 인쇄·제작 → service_contract ──
  print_production: {
    rfpType: "service_contract",
    fieldMap: {
      ...COMMON_MAP_BY_RFP.service_contract,
      p1: "s6",   // 제작물 유형 → 사업명 (보충)
    },
  },

  // ── 용역·아웃소싱 → service_contract ──
  service_outsourcing: {
    rfpType: "service_contract",
    fieldMap: {
      ...COMMON_MAP_BY_RFP.service_contract,
      p1: "s6",   // 용역 유형 → 사업명 (보충)
      p3: "s10",  // 투입 인원 → 대상인원
    },
  },

  // ── 전문 컨설팅 → consulting ──
  consulting: {
    rfpType: "consulting",
    fieldMap: {
      ...COMMON_MAP_BY_RFP.consulting,
      p1: "s6",   // 컨설팅 분야 → 사업명 (보충)
      p3: "s10",  // 컨설팅 범위 → 컨설팅 범위
    },
  },

  // ── 교육·훈련 → service_contract ──
  education_training: {
    rfpType: "service_contract",
    fieldMap: {
      ...COMMON_MAP_BY_RFP.service_contract,
      p1: "s6",   // 교육 유형 → 사업명 (보충)
      p3: "s10",  // 교육 대상 인원 → 대상인원
    },
  },

  // ── 복지 서비스 → service ──
  welfare_service: {
    rfpType: "service",
    fieldMap: {
      ...COMMON_MAP_BY_RFP.service,
      p1: "s6",   // 복지 서비스 유형 → 서비스명
      p3: "s9",   // 대상 인원 → 대상 규모
    },
  },

  // ── 시설 공사 → construction ──
  construction: {
    rfpType: "construction",
    fieldMap: {
      ...COMMON_MAP_BY_RFP.construction,
      p1: "s6",   // 공사 유형 → 공사명 (보충)
      p2: "s9",   // 공사 장소 → 공사 규모 (보충)
    },
  },

  // ── 보험 → service ──
  insurance: {
    rfpType: "service",
    fieldMap: {
      ...COMMON_MAP_BY_RFP.service,
      p1: "s6",   // 보험 유형 → 서비스명
      p4: "s10",  // 담보 범위 → 서비스 범위
    },
  },

  // ── 광고·매체 → service_contract ──
  advertising_media: {
    rfpType: "service_contract",
    fieldMap: {
      ...COMMON_MAP_BY_RFP.service_contract,
      p1: "s6",   // 광고 유형 → 사업명
      p7: "s14",  // KPI 목표 → SLA 기준
    },
  },

  // ── 이벤트·행사 → service_contract ──
  event_exhibition: {
    rfpType: "service_contract",
    fieldMap: {
      ...COMMON_MAP_BY_RFP.service_contract,
      p1: "s6",   // 행사 유형 → 사업명
      p4: "s10",  // 참석자 수 → 대상인원
    },
  },

  // ── 출장 서비스 → service ──
  business_travel: {
    rfpType: "service",
    fieldMap: {
      ...COMMON_MAP_BY_RFP.service,
      p1: "s6",   // 출장 서비스 범위 → 서비스명
    },
  },

  // ── IT 하드웨어 → purchase_maintenance ──
  it_hardware: {
    rfpType: "purchase_maintenance",
    fieldMap: {
      ...COMMON_MAP_BY_RFP.purchase_maintenance,
      p1: "s6",   // 장비 유형 → 구매 품목
      p3: "s10",  // 수량 및 사양 → 요구 사양
    },
  },

  // ── IT SW·클라우드 → purchase_lease ──
  it_software_cloud: {
    rfpType: "purchase_lease",
    fieldMap: {
      ...COMMON_MAP_BY_RFP.purchase_lease,
      p1: "s6",   // 소프트웨어명 → 대상 장비
      p3: "s9",   // 사용자 수 → 수량
    },
  },

  // ── IT 개발·운영 → service_contract ──
  it_development: {
    rfpType: "service_contract",
    fieldMap: {
      ...COMMON_MAP_BY_RFP.service_contract,
      p1: "s6",   // 프로젝트 유형 → 사업명
      p3: "s11",  // 개발 범위 → 서비스 범위
    },
  },

  // ── 물류 운송 → service_contract ──
  logistics_transport: {
    rfpType: "service_contract",
    fieldMap: {
      ...COMMON_MAP_BY_RFP.service_contract,
      p1: "s6",   // 운송 유형 → 사업명
      p3: "s11",  // 출발지→도착지 → 서비스 범위
    },
  },

  // ── 물류 창고·풀필먼트 → service_contract ──
  logistics_warehouse: {
    rfpType: "service_contract",
    fieldMap: {
      ...COMMON_MAP_BY_RFP.service_contract,
      p1: "s6",   // 서비스 유형 → 사업명
      p3: "s10",  // 보관 면적 → 대상인원(규모)
    },
  },

  // ── R&D 용역·장비 → service_contract ──
  rd_service: {
    rfpType: "service_contract",
    fieldMap: {
      ...COMMON_MAP_BY_RFP.service_contract,
      p1: "s6",   // R&D 유형 → 사업명
      p3: "s11",  // 개발 범위 → 서비스 범위
    },
  },

  // ── 인증·시험·IP → consulting ──
  certification_test: {
    rfpType: "consulting",
    fieldMap: {
      ...COMMON_MAP_BY_RFP.consulting,
      p1: "s6",   // 서비스 유형 → 사업명
      p3: "s10",  // 대상 제품 → 컨설팅 범위
    },
  },

  // ── 생산·안전·폐기 → purchase_maintenance ──
  production_safety: {
    rfpType: "purchase_maintenance",
    fieldMap: {
      ...COMMON_MAP_BY_RFP.purchase_maintenance,
      p1: "s6",   // 서비스 유형 → 구매 품목
      p3: "s10",  // 대상 설비 → 요구 사양
    },
  },

  // ── 유틸리티·에너지 → service ──
  utility_energy: {
    rfpType: "service",
    fieldMap: {
      ...COMMON_MAP_BY_RFP.service,
      p1: "s6",   // 에너지 유형 → 서비스명
    },
  },

  // ── 사무보조 서비스 → service ──
  office_support: {
    rfpType: "service",
    fieldMap: {
      ...COMMON_MAP_BY_RFP.service,
      p1: "s6",   // 서비스 유형 → 서비스명
    },
  },
};

// ── L3 개별키(L1101 등) → L2 그룹 매핑 (fallback) ──
// L3 코드가 PR_TO_RFP_MAPPING에 없을 때 L2 그룹으로 폴백
const L3_TO_L2_GROUP = {
  // L01 사무·총무
  L1101: "goods_purchase", L1102: "goods_purchase", L1103: "goods_purchase",
  L1201: "print_production", L1301: "office_support", L1302: "office_support",
  L1303: "office_support", L1401: "rental_lease",
  // L02 인사·복리후생
  L2101: "welfare_service", L2102: "welfare_service", L2103: "welfare_service",
  L2104: "welfare_service", L2105: "welfare_service", L2106: "welfare_service",
  L2107: "welfare_service",
  L2201: "education_training", L2202: "education_training", L2203: "education_training",
  L2301: "service_outsourcing", L2302: "service_outsourcing", L2401: "service_outsourcing",
  // L03 시설·건물관리
  L3101: "construction", L3102: "construction", L3103: "construction",
  L3104: "construction", L3105: "consulting", L3106: "service_outsourcing",
  L3201: "service_outsourcing", L3202: "service_outsourcing", L3203: "service_outsourcing",
  L3204: "service_outsourcing", L3205: "service_outsourcing",
  L3301: "rental_lease", L3302: "rental_lease", L3303: "goods_purchase",
  L3304: "utility_energy",
  // L04 차량·출장
  L4101: "rental_lease", L4102: "service_outsourcing", L4201: "business_travel",
  L4202: "business_travel", L4203: "business_travel",
  // L05 보험
  L5101: "insurance", L5102: "insurance", L5103: "insurance",
  L5104: "insurance", L5105: "insurance", L5106: "insurance",
  L5107: "insurance", L5108: "insurance",
  // L06 전문용역·컨설팅
  L6101: "consulting", L6201: "consulting", L6202: "consulting",
  L6203: "consulting", L6301: "consulting", L6302: "service_outsourcing",
  L6401: "service_outsourcing",
  // L07 마케팅
  L7101: "advertising_media", L7201: "advertising_media", L7203: "advertising_media",
  L7204: "advertising_media", L7205: "advertising_media",
  L7301: "print_production", L7302: "print_production", L7303: "advertising_media",
  L7304: "print_production",
  L7401: "event_exhibition", L7402: "event_exhibition", L7403: "event_exhibition",
  L7404: "event_exhibition",
  L7501: "goods_purchase", L7502: "service_outsourcing", L7503: "goods_purchase",
  L7504: "print_production", L7505: "print_production",
  L7601: "service_outsourcing", L7701: "consulting", L7702: "it_software_cloud",
  // L08 IT/ICT
  L8101: "it_hardware", L8102: "it_hardware", L8201: "it_hardware", L8202: "it_hardware",
  L8301: "it_hardware", L8302: "it_hardware",
  L8401: "it_software_cloud", L8402: "it_software_cloud", L8403: "it_software_cloud",
  L8404: "it_software_cloud", L8405: "it_software_cloud",
  L8501: "it_software_cloud", L8502: "it_development", L8503: "it_software_cloud",
  L8504: "it_development", L8505: "it_development",
  L8701: "it_hardware", L8702: "it_hardware", L8703: "it_hardware",
  // L09 물류
  L9101: "logistics_transport", L9102: "logistics_transport", L9103: "logistics_transport",
  L9104: "logistics_transport", L9201: "logistics_transport", L9202: "logistics_transport",
  L9203: "logistics_transport", L9301: "logistics_transport", L9302: "logistics_transport",
  L9303: "logistics_transport",
  L9401: "logistics_warehouse", L9402: "logistics_warehouse", L9403: "logistics_warehouse",
  L9404: "logistics_warehouse",
  // L10 생산관리
  M1001: "production_safety", M1002: "production_safety", M1003: "production_safety",
  M1004: "production_safety", M1005: "production_safety", M1006: "production_safety",
  M1007: "production_safety", M1008: "production_safety", M1009: "production_safety",
  M1010: "production_safety",
  // L11 연구개발
  R2001: "rd_service", R2002: "rd_service", R2003: "rd_service",
  R2601: "certification_test",
  R2701: "rd_service", R2702: "rd_service", R2703: "rd_service",
  R2801: "rd_service", R2802: "rd_service", R2803: "rd_service",
  R2804: "rd_service", R2805: "rd_service", R2806: "rd_service",
  R2901: "certification_test", R2902: "certification_test", R2903: "certification_test",
  R3001: "certification_test", R3002: "certification_test", R3003: "certification_test",
};

/**
 * L3 개별키 또는 기존 그룹키 → PR_TO_RFP_MAPPING 조회
 * L3키가 직접 있으면 사용, 없으면 L2 그룹으로 폴백
 */
export function getPrToRfpMapping(prTypeKey) {
  if (PR_TO_RFP_MAPPING[prTypeKey]) return PR_TO_RFP_MAPPING[prTypeKey];
  const l2Group = L3_TO_L2_GROUP[prTypeKey];
  if (l2Group && PR_TO_RFP_MAPPING[l2Group]) return PR_TO_RFP_MAPPING[l2Group];
  return PR_TO_RFP_MAPPING._generic || { rfpType: "service_contract", fieldMap: { ...COMMON_MAP_BY_RFP.service_contract } };
}

-- ═══════════════════════════════════════════════════════════
-- taxonomy_v2: 차세대 품목체계 (L1/L2/L3 3레벨)
-- 기존 taxonomy 테이블은 유지 (하위호환)
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS taxonomy_v2 (
  id            SERIAL PRIMARY KEY,
  code          VARCHAR(12) NOT NULL UNIQUE,        -- "L1-01", "L2-0101", "L3-010101"
  level         INT NOT NULL CHECK (level IN (1, 2, 3)),
  name          VARCHAR(120) NOT NULL,              -- "사무·총무", "사무용품·소모품", "사무용품·문구"
  parent_code   VARCHAR(12),                        -- L2→L1코드, L3→L2코드
  description   TEXT,                               -- L3 품목 설명
  keywords      TEXT[] DEFAULT '{}',                -- 검색/분류용 키워드 배열
  purchase_strategy TEXT,                           -- L3 구매전략 요약
  expense_type  VARCHAR(10) CHECK (expense_type IN ('CAPEX', 'OPEX', 'BOTH')),
  cost_category VARCHAR(30),                        -- 비용 분류 (판관비, 제조간접비 등)
  suppliers     TEXT[] DEFAULT '{}',                -- 주요 공급사 예시
  pr_template_key VARCHAR(50),                      -- → PR 템플릿 매핑 (20개 그룹 중 하나)
  rfp_type      VARCHAR(30),                        -- → RFP 유형 매핑 (9개 중 하나)
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_tv2_code ON taxonomy_v2(code);
CREATE INDEX IF NOT EXISTS idx_tv2_parent ON taxonomy_v2(parent_code);
CREATE INDEX IF NOT EXISTS idx_tv2_level ON taxonomy_v2(level);
CREATE INDEX IF NOT EXISTS idx_tv2_pr ON taxonomy_v2(pr_template_key);
CREATE INDEX IF NOT EXISTS idx_tv2_keywords ON taxonomy_v2 USING GIN(keywords);

-- RLS (선택)
ALTER TABLE taxonomy_v2 ENABLE ROW LEVEL SECURITY;
CREATE POLICY "taxonomy_v2_read_all" ON taxonomy_v2 FOR SELECT USING (true);
CREATE POLICY "taxonomy_v2_service_write" ON taxonomy_v2 FOR ALL USING (true);

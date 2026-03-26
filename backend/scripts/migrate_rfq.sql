-- RFQ(견적서) 관련 테이블 생성

-- 1. RFQ 템플릿 테이블
CREATE TABLE IF NOT EXISTS rfq_templates (
  id            SERIAL PRIMARY KEY,
  type_key      VARCHAR(20) NOT NULL UNIQUE,
  name          VARCHAR(120) NOT NULL,
  description   TEXT,
  category_group VARCHAR(50),
  fields        JSONB NOT NULL DEFAULT '{}',
  sections      JSONB NOT NULL DEFAULT '[]',
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- 2. RFQ 요청 이력 테이블
CREATE TABLE IF NOT EXISTS rfq_requests (
  id            SERIAL PRIMARY KEY,
  conversation_id TEXT,
  rfq_type      VARCHAR(20),
  fields        JSONB DEFAULT '{}',
  status        VARCHAR(20) DEFAULT 'draft',
  created_at    TIMESTAMPTZ DEFAULT now()
);

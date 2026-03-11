-- 화법 레이어: conversation_scripts 테이블 + 벡터 검색 함수

-- 1. 테이블 생성
CREATE TABLE IF NOT EXISTS conversation_scripts (
  id          bigserial PRIMARY KEY,
  category    text NOT NULL,
  cta_phase   text NOT NULL DEFAULT 'cold',
  script_type text NOT NULL DEFAULT 'style',
  content     text NOT NULL,
  embedding   vector(1536),
  is_active   boolean DEFAULT true,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- 2. HNSW 인덱스
CREATE INDEX IF NOT EXISTS conversation_scripts_embedding_idx
  ON conversation_scripts
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- 3. 벡터 검색 함수 (카테고리 + CTA 필터)
CREATE OR REPLACE FUNCTION match_conversation_scripts(
  query_embedding   vector(1536),
  filter_category   text DEFAULT NULL,
  filter_cta        text DEFAULT NULL,
  match_count       integer DEFAULT 2
)
RETURNS TABLE (
  id          bigint,
  category    text,
  cta_phase   text,
  script_type text,
  content     text,
  similarity  float
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    cs.id,
    cs.category,
    cs.cta_phase,
    cs.script_type,
    cs.content,
    1 - (cs.embedding <=> query_embedding) AS similarity
  FROM conversation_scripts cs
  WHERE
    cs.is_active = true
    AND cs.embedding IS NOT NULL
    AND (filter_category IS NULL OR cs.category = filter_category)
    AND (filter_cta IS NULL OR cs.cta_phase = filter_cta)
  ORDER BY cs.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 헌법 규칙 벡터DB화: embedding 컬럼 추가 + 검색 함수

-- 1. constitution_rules에 embedding 컬럼 추가
ALTER TABLE constitution_rules
  ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- 2. HNSW 인덱스
CREATE INDEX IF NOT EXISTS constitution_rules_embedding_idx
  ON constitution_rules
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- 3. 헌법 규칙 벡터 검색 함수
CREATE OR REPLACE FUNCTION match_constitution(
  query_embedding vector(1536),
  match_count     integer DEFAULT 3
)
RETURNS TABLE (
  id          bigint,
  rule_type   text,
  content     text,
  similarity  float
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    cr.id,
    cr.rule_type,
    cr.content,
    1 - (cr.embedding <=> query_embedding) AS similarity
  FROM constitution_rules cr
  WHERE
    cr.is_active = true
    AND cr.embedding IS NOT NULL
  ORDER BY cr.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

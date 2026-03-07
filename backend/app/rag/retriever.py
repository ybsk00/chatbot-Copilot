import logging
from difflib import SequenceMatcher
from rank_bm25 import BM25Okapi
from app.rag.embedder import embed_query
from app.db.supabase_client import get_client
from app.config import RAG_TOP_K, BM25_WEIGHT, VECTOR_MIN_SIMILARITY

logger = logging.getLogger(__name__)


# ── 벡터 검색 (knowledge_chunks) ──

def vector_search(query: str, category: str | None = None, top_k: int = RAG_TOP_K, min_similarity: float = 0.70) -> list[dict]:
    """Supabase pgvector 유사도 검색 (쿼리 텍스트)"""
    query_embedding = embed_query(query)
    return vector_search_with_embedding(query_embedding, category, top_k, min_similarity)


def vector_search_with_embedding(query_embedding: list[float], category: str | None = None, top_k: int = RAG_TOP_K, min_similarity: float = 0.70) -> list[dict]:
    """Supabase pgvector 유사도 검색 (임베딩 재사용)"""
    supabase = get_client()

    result = supabase.rpc(
        "match_chunks",
        {
            "query_embedding": query_embedding,
            "match_count": top_k * 2,
            "category_filter": category,
        },
    ).execute()

    return [
        {
            "id": row["id"],
            "content": row["content"],
            "metadata": row["metadata"],
            "doc_name": row["doc_name"],
            "category": row["category"],
            "similarity": row["similarity"],
        }
        for row in (result.data or [])
        if row["similarity"] >= min_similarity
    ]


# ── BM25 재순위 ──

def bm25_rerank(query: str, chunks: list[dict]) -> list[dict]:
    """BM25로 재순위"""
    if not chunks:
        return chunks

    corpus = [c["content"] for c in chunks]
    tokenized_corpus = [doc.split() for doc in corpus]
    tokenized_query = query.split()

    bm25 = BM25Okapi(tokenized_corpus)
    scores = bm25.get_scores(tokenized_query)

    for i, chunk in enumerate(chunks):
        chunk["bm25_score"] = float(scores[i])

    return chunks


# ── FAQ 검색 (knowledge_faq) ──

def faq_search(query_embedding: list[float], taxonomy_major: str | None = None, category: str | None = None, top_k: int = 3, min_similarity: float = 0.70) -> list[dict]:
    """FAQ 벡터 검색 (대분류 필터 지원)"""
    try:
        supabase = get_client()
        result = supabase.rpc(
            "match_faq",
            {
                "query_embedding": query_embedding,
                "match_count": top_k,
                "category_filter": category,
                "taxonomy_major_filter": taxonomy_major,
            },
        ).execute()

        return [
            {
                "id": row["id"],
                "question": row["question"],
                "answer": row["answer"],
                "doc_name": row["doc_name"],
                "category": row["category"],
                "taxonomy_major": row.get("taxonomy_major"),
                "taxonomy_middle": row.get("taxonomy_middle"),
                "chunk_id": row["chunk_id"],
                "similarity": row["similarity"],
                "source_type": "faq",
            }
            for row in (result.data or [])
            if row["similarity"] >= min_similarity
        ]
    except Exception as e:
        logger.warning(f"FAQ search failed (table may not exist): {e}")
        return []


def _format_faq_as_chunks(faq_results: list[dict]) -> list[dict]:
    """FAQ 결과를 chunk 형태로 변환 (generator에서 사용)"""
    return [
        {
            "id": r["id"],
            "content": f"Q: {r['question']}\nA: {r['answer']}",
            "metadata": {"source_type": "faq", "chunk_id": r.get("chunk_id")},
            "doc_name": r["doc_name"],
            "category": r["category"],
            "similarity": r["similarity"],
        }
        for r in faq_results
    ]


# ── FAQ 기반 후속질문 (답변 보장) ──

def _is_similar_text(a: str, b: str, threshold: float = 0.55) -> bool:
    """두 문자열의 유사도 비교 (이미 물어본 질문 필터용)"""
    return SequenceMatcher(None, a, b).ratio() > threshold


def get_faq_suggestions(query_embedding: list[float], taxonomy_major: str | None = None, exclude_ids: list[int] | None = None, top_k: int = 3, min_similarity: float = 0.65, current_query: str = "", history_queries: list[str] | None = None) -> list[str]:
    """유사도 기반 FAQ 후속질문 반환 (이미 물어본 질문 제외, 답변 보장)"""
    try:
        supabase = get_client()
        # 순수 유사도 기반 검색 (대분류 필터 없음 → 주제가 가까운 FAQ만)
        result = supabase.rpc(
            "match_faq",
            {
                "query_embedding": query_embedding,
                "match_count": top_k + (len(exclude_ids) if exclude_ids else 0) + 20,
                "category_filter": None,
                "taxonomy_major_filter": None,  # 대분류 필터 없이 순수 유사도
            },
        ).execute()

        # 이미 물어본 질문 목록 (현재 질문 + 대화 이력)
        asked_queries = []
        if current_query:
            asked_queries.append(current_query.strip())
        if history_queries:
            asked_queries.extend(q.strip() for q in history_queries)

        suggestions = []
        seen = set()
        for row in (result.data or []):
            # 유사도 임계값 미만이면 무시 (주제가 다른 FAQ 방지)
            if row["similarity"] < min_similarity:
                continue
            # 이미 사용된 FAQ 제외
            if exclude_ids and row["id"] in exclude_ids:
                continue
            q = row["question"].strip()
            # 중복 질문 제거
            if q in seen:
                continue
            # 이미 물어본 질문과 유사한 FAQ 제외
            if any(_is_similar_text(q, asked) for asked in asked_queries):
                continue
            seen.add(q)
            suggestions.append(q)
            if len(suggestions) >= top_k:
                break

        return suggestions
    except Exception as e:
        logger.warning(f"FAQ suggestions failed: {e}")
        return []


# ── BM25 키워드 우선 검색 ──

def bm25_keyword_search(query: str, category: str | None = None, top_k: int = RAG_TOP_K) -> list[dict]:
    """BM25 키워드 검색: DB에서 키워드 매칭 후보를 가져와 BM25 스코어링"""
    # 쿼리에서 2글자 이상 키워드 추출
    keywords = [w for w in query.split() if len(w) >= 2]
    if not keywords:
        return []

    try:
        supabase = get_client()
        q = supabase.table("knowledge_chunks").select(
            "id, content, metadata, doc_name, category"
        )

        if category:
            q = q.eq("category", category)

        # OR 조건으로 키워드 포함 청크 검색 (최대 5개 키워드)
        or_conditions = ",".join(f"content.ilike.%{kw}%" for kw in keywords[:5])
        q = q.or_(or_conditions)
        result = q.limit(top_k * 5).execute()

        candidates = result.data or []
        if not candidates:
            return []

        # BM25 스코어링
        corpus = [c["content"] for c in candidates]
        tokenized_corpus = [doc.split() for doc in corpus]
        tokenized_query = query.split()

        bm25 = BM25Okapi(tokenized_corpus)
        scores = bm25.get_scores(tokenized_query)

        for i, chunk in enumerate(candidates):
            chunk["bm25_score"] = float(scores[i])
            chunk["similarity"] = float(scores[i])  # 호환성

        # BM25 점수 > 0인 결과만 필터 + 정렬
        candidates = [c for c in candidates if c["bm25_score"] > 0]
        candidates.sort(key=lambda x: x["bm25_score"], reverse=True)

        logger.info(f"BM25 search: {len(candidates)}개 결과 (query={query[:30]})")
        return candidates[:top_k]

    except Exception as e:
        logger.warning(f"BM25 keyword search failed: {e}")
        return []


# ── 하이브리드 검색 (FAQ 우선 → BM25 우선 → 벡터 폴백) ──

def hybrid_search(query: str, category: str | None = None, taxonomy_major: str | None = None, top_k: int = RAG_TOP_K, min_similarity: float = VECTOR_MIN_SIMILARITY) -> list[dict]:
    """FAQ 우선 → BM25 키워드 검색 → 벡터 폴백 (대분류 필터 지원)"""
    # 임베딩 1회만 생성
    query_embedding = embed_query(query)

    # 1. FAQ 먼저 검색 (대분류 필터 적용)
    faq_results = faq_search(query_embedding, taxonomy_major, category, top_k, min_similarity)
    if faq_results:
        logger.info(f"FAQ hit: {len(faq_results)}개 (sim={faq_results[0]['similarity']:.3f})")
        return _format_faq_as_chunks(faq_results)

    # 2. BM25 키워드 검색 우선 실행
    bm25_results = bm25_keyword_search(query, category, top_k)
    if bm25_results:
        logger.info(f"BM25 hit: {len(bm25_results)}개")
        return bm25_results

    # 3. BM25 결과 없으면 벡터 유사도 검색 (0.7 이상)
    logger.info("BM25 no results → vector fallback")
    chunks = vector_search_with_embedding(query_embedding, category, top_k, min_similarity)
    return chunks[:top_k]

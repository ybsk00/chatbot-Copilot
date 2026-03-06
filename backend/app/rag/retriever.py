from rank_bm25 import BM25Okapi
from app.rag.embedder import embed_query
from app.db.supabase_client import get_client
from app.config import RAG_TOP_K, BM25_WEIGHT


def vector_search(query: str, category: str | None = None, top_k: int = RAG_TOP_K, min_similarity: float = 0.70) -> list[dict]:
    """Supabase pgvector 유사도 검색"""
    supabase = get_client()
    query_embedding = embed_query(query)

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


def hybrid_search(query: str, category: str | None = None, top_k: int = RAG_TOP_K, min_similarity: float = 0.70) -> list[dict]:
    """벡터 + BM25 하이브리드 검색"""
    chunks = vector_search(query, category, top_k * 2, min_similarity)
    chunks = bm25_rerank(query, chunks)

    # 하이브리드 점수 계산 (벡터 0.7 + BM25 0.3)
    if chunks:
        max_bm25 = max(c.get("bm25_score", 0) for c in chunks) or 1
        for c in chunks:
            vec_score = c.get("similarity", 0)
            bm25_norm = c.get("bm25_score", 0) / max_bm25
            c["hybrid_score"] = (1 - BM25_WEIGHT) * vec_score + BM25_WEIGHT * bm25_norm

        chunks.sort(key=lambda x: x["hybrid_score"], reverse=True)

    return chunks[:top_k]

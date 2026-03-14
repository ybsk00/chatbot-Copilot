"""검색 진단 스크립트 — 쿼리별 각 소스(Vector/BM25/FAQ)의 결과를 확인"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.rag.embedder import embed_query
from app.rag.retriever import (
    vector_search_with_embedding, bm25_keyword_search, faq_search,
    _format_faq_as_chunks, _rrf_fuse, hybrid_search,
)

def debug_query(query: str):
    print(f"\n{'='*60}")
    print(f"쿼리: {query}")
    print(f"{'='*60}")

    # 1. 임베딩 생성
    emb = embed_query(query)
    print(f"\n임베딩 생성 완료 (dim={len(emb)})")

    # 2. Vector 검색 (min_similarity 낮추어 전체 확인)
    print(f"\n--- Vector Search (min_sim=0.50) ---")
    vec_results = vector_search_with_embedding(emb, category=None, top_k=10, min_similarity=0.50)
    for i, r in enumerate(vec_results):
        print(f"  [{i+1}] sim={r['similarity']:.4f} | cat={r['category']} | doc={r['doc_name']} | content={r['content'][:80]}...")

    # 3. BM25 검색
    print(f"\n--- BM25 Keyword Search ---")
    bm25_results = bm25_keyword_search(query, category=None, top_k=10)
    for i, r in enumerate(bm25_results):
        print(f"  [{i+1}] bm25={r.get('bm25_score', 0):.4f} | cat={r['category']} | doc={r['doc_name']} | content={r['content'][:80]}...")

    # 4. FAQ 검색
    print(f"\n--- FAQ Search (min_sim=0.50) ---")
    faq_results = faq_search(emb, taxonomy_major=None, category=None, top_k=5, min_similarity=0.50)
    for i, r in enumerate(faq_results):
        print(f"  [{i+1}] sim={r['similarity']:.4f} | cat={r['category']} | q={r['question'][:60]}...")

    # 5. Hybrid Search (실제 파이프라인)
    print(f"\n--- Hybrid Search (실제 결과) ---")
    chunks, _ = hybrid_search(query, category=None, taxonomy_major=None)
    if chunks:
        for i, c in enumerate(chunks):
            print(f"  [{i+1}] rrf={c.get('rrf_score', 0):.4f} | sim={c.get('similarity', 0):.4f} | sources={c.get('rrf_sources', [])} | cat={c.get('category', '')} | content={c['content'][:80]}...")
    else:
        print("  (결과 없음)")

    print()


if __name__ == "__main__":
    import io
    out = io.StringIO()

    def p(s=""):
        out.write(s + "\n")

    queries = [
        "공기청정기를 렌탈하려고 합니다",
        "렌탈 기간을 늘리면 할인이 되나요?",
        "안내해주세요",
    ]
    for query in queries:
        p(f"\n{'='*60}")
        p(f"쿼리: {query}")
        p(f"{'='*60}")

        emb = embed_query(query)
        p(f"임베딩 dim={len(emb)}")

        p(f"\n--- Vector Search (min_sim=0.50) ---")
        vec = vector_search_with_embedding(emb, category=None, top_k=10, min_similarity=0.50)
        for i, r in enumerate(vec):
            p(f"  [{i+1}] sim={r['similarity']:.4f} cat={r['category']} doc={r['doc_name']}")

        p(f"\n--- BM25 Search ---")
        bm25 = bm25_keyword_search(query, category=None, top_k=10)
        for i, r in enumerate(bm25):
            p(f"  [{i+1}] bm25={r.get('bm25_score',0):.4f} cat={r['category']} doc={r['doc_name']}")

        p(f"\n--- FAQ Search (min_sim=0.50) ---")
        faq = faq_search(emb, taxonomy_major=None, category=None, top_k=5, min_similarity=0.50)
        for i, r in enumerate(faq):
            p(f"  [{i+1}] sim={r['similarity']:.4f} cat={r['category']} q={r['question'][:50]}")

        p(f"\n--- Hybrid Search (final) ---")
        chunks, _ = hybrid_search(query, category=None, taxonomy_major=None)
        if chunks:
            for i, c in enumerate(chunks):
                p(f"  [{i+1}] rrf={c.get('rrf_score',0):.4f} sim={c.get('similarity',0):.4f} sources={c.get('rrf_sources',[])} cat={c.get('category','')} doc={c.get('doc_name','')}")
        else:
            p("  (결과 없음)")

    with open("scripts/debug_result.txt", "w", encoding="utf-8") as f:
        f.write(out.getvalue())
    print("Done -> scripts/debug_result.txt")

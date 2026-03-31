import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from difflib import SequenceMatcher
from rank_bm25 import BM25Okapi
from app.rag.embedder import embed_query
from app.db.supabase_client import get_client
from app.config import (
    RAG_TOP_K, BM25_WEIGHT, VECTOR_MIN_SIMILARITY,
    RRF_K, RRF_BOOST_FAQ, RRF_BOOST_BM25, RRF_BOOST_VECTOR, RRF_TOP_K,
    FAQ_FALLBACK_TOP_K, FAQ_ENABLED,
)

logger = logging.getLogger(__name__)


# ── 벡터 검색 (knowledge_chunks) ──

def vector_search(query: str, category: str | None = None, top_k: int = RAG_TOP_K, min_similarity: float = 0.70) -> list[dict]:
    """Supabase pgvector 유사도 검색 (쿼리 텍스트)"""
    query_embedding = embed_query(query)
    return vector_search_with_embedding(query_embedding, category, top_k, min_similarity)


def vector_search_with_embedding(query_embedding: list[float], category: str | None = None, top_k: int = RAG_TOP_K, min_similarity: float = 0.70, user_role: str | None = None) -> list[dict]:
    """Supabase pgvector 유사도 검색 (임베딩 재사용 + 역할 필터)"""
    supabase = get_client()

    result = supabase.rpc(
        "match_chunks",
        {
            "query_embedding": query_embedding,
            "match_count": top_k * 3,  # 역할 필터링 후 줄어들 수 있으므로 여유분
            "category_filter": category,
        },
    ).execute()

    rows = [
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

    # ── 역할별 청크 필터링 (엄격 허용 목록) ──
    if user_role == "procurement":
        # 소싱담당자: 견적서 청크 + GT/BT 정의만 허용
        # BSM_Detail, BSM_Process, BSM_L3, 구매요청서 등 사용자 안내 전부 제외
        def _is_procurement_chunk(r):
            dn = r["doc_name"]
            cat = r["category"]
            return (cat.startswith("quote_")
                    or dn.startswith("QUOTE_")
                    or dn.startswith("SOURCING_")
                    or dn.startswith("GT_")
                    or dn.startswith("BT_BT-")
                    or dn.startswith("BT_Process_BT-"))
        rows = [r for r in rows if _is_procurement_chunk(r)]
    elif user_role == "user":
        # 사용자: 견적서(quote_*) + 소싱 전용 완전 제외
        rows = [r for r in rows
                if not r["category"].startswith("quote_")
                and not r["doc_name"].startswith("QUOTE_")
                and not r["doc_name"].startswith("SOURCING_")]

    return rows


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

def faq_search(query_embedding: list[float], taxonomy_major: str | None = None, category: str | None = None, top_k: int = 3, min_similarity: float = 0.70, user_role: str | None = None) -> list[dict]:
    """FAQ 벡터 검색 (대분류 필터 + 역할 필터 지원)"""
    try:
        supabase = get_client()
        result = supabase.rpc(
            "match_faq",
            {
                "query_embedding": query_embedding,
                "match_count": top_k * 3,  # 역할 필터링 후 줄어들 수 있으므로 여유분
                "category_filter": category,
                "taxonomy_major_filter": taxonomy_major,
            },
        ).execute()

        rows = [
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
                "metadata": row.get("metadata", {}),
            }
            for row in (result.data or [])
            if row["similarity"] >= min_similarity
        ]

        # ── 역할별 FAQ 필터링 (metadata.target_role 기반) ──
        if user_role == "procurement":
            rows = [r for r in rows if r.get("metadata", {}).get("target_role") in ("procurement", "all", None)]
        elif user_role == "user":
            rows = [r for r in rows if r.get("metadata", {}).get("target_role") in ("user", "all", None)]

        return rows[:top_k]
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


def get_faq_suggestions(query_embedding: list[float], taxonomy_major: str | None = None, exclude_ids: list[int] | None = None, top_k: int = 3, min_similarity: float = 0.65, current_query: str = "", history_queries: list[str] | None = None, answered_text: str = "", user_role: str | None = None) -> list[str]:
    """유사도 기반 FAQ 후속질문 반환 (이미 물어본 질문 + AI 답변과 겹치는 FAQ 제외)"""
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
            # ── 역할별 FAQ 필터링 ──
            meta = row.get("metadata") or {}
            target = meta.get("target_role")
            if user_role == "procurement" and target not in ("procurement", "all", None):
                continue
            if user_role == "user" and target not in ("user", "all", None):
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
            # AI 답변에 이미 포함된 내용의 FAQ 제외
            if answered_text and _is_similar_text(row["answer"][:200], answered_text[:400], threshold=0.35):
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

def bm25_keyword_search(query: str, category: str | None = None, top_k: int = RAG_TOP_K, user_role: str | None = None) -> list[dict]:
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
            chunk["similarity"] = 0  # BM25 점수는 0-1 범위가 아니므로 similarity에 사용하지 않음

        # BM25 점수 > 0인 결과만 필터 + 정렬
        candidates = [c for c in candidates if c["bm25_score"] > 0]
        candidates.sort(key=lambda x: x["bm25_score"], reverse=True)

        # ── 역할별 필터링 (엄격 허용 목록) ──
        if user_role == "procurement":
            candidates = [c for c in candidates
                          if c["category"].startswith("quote_")
                          or c["doc_name"].startswith("QUOTE_")
                          or c["doc_name"].startswith("SOURCING_")
                          or c["doc_name"].startswith("GT_")
                          or c["doc_name"].startswith("BT_BT-")
                          or c["doc_name"].startswith("BT_Process_BT-")]
        elif user_role == "user":
            candidates = [c for c in candidates
                          if not c["category"].startswith("quote_")
                          and not c["doc_name"].startswith("QUOTE_")
                          and not c["doc_name"].startswith("SOURCING_")]

        logger.info(f"BM25 search: {len(candidates)}개 결과 (query={query[:30]}, role={user_role})")
        return candidates[:top_k]

    except Exception as e:
        logger.warning(f"BM25 keyword search failed: {e}")
        return []


# ── RRF 리랭킹 통합 ──

def _rrf_fuse(
    faq_chunks: list[dict],
    bm25_chunks: list[dict],
    vector_chunks: list[dict],
    top_k: int = RRF_TOP_K,
) -> list[dict]:
    """Reciprocal Rank Fusion: 3개 소스의 결과를 RRF 점수로 통합
    score = Σ(boost / (k + rank))  — rank는 1-based"""
    rrf_scores: dict[int, float] = {}
    chunk_map: dict[int, dict] = {}
    source_map: dict[int, list[str]] = {}

    sources = [
        (faq_chunks, RRF_BOOST_FAQ, "faq"),
        (bm25_chunks, RRF_BOOST_BM25, "bm25"),
        (vector_chunks, RRF_BOOST_VECTOR, "vector"),
    ]

    for chunks, boost, source_name in sources:
        for rank, chunk in enumerate(chunks, start=1):
            cid = chunk["id"]
            rrf_scores[cid] = rrf_scores.get(cid, 0.0) + boost / (RRF_K + rank)
            if cid not in chunk_map:
                chunk_map[cid] = chunk
            # 더 높은 similarity 유지
            if chunk.get("similarity", 0) > chunk_map[cid].get("similarity", 0):
                chunk_map[cid]["similarity"] = chunk["similarity"]
            source_map.setdefault(cid, []).append(source_name)

    # 벡터 유사도 보너스: sim ≥ 0.72인 벡터 결과에 추가 점수 (구조화 청크 우선)
    for chunk in vector_chunks:
        sim = chunk.get("similarity", 0)
        if sim >= 0.72:
            cid = chunk["id"]
            bonus = (sim - 0.70) * 0.15  # sim=0.75 → +0.0075 보너스
            rrf_scores[cid] = rrf_scores.get(cid, 0.0) + bonus

    # RRF 점수 내림차순 정렬
    sorted_ids = sorted(rrf_scores, key=lambda x: rrf_scores[x], reverse=True)

    results = []
    for cid in sorted_ids[:top_k]:
        chunk = chunk_map[cid]
        chunk["rrf_score"] = rrf_scores[cid]
        chunk["rrf_sources"] = source_map[cid]
        results.append(chunk)

    return results


# ── JSON 직접 응답용 가상 청크 생성 ──

def _build_json_chunks(l3_code: str) -> list[dict]:
    """L3 JSON 안내 메시지를 가상 청크로 변환 (RAG 스킵, 1순위)"""
    try:
        from app.data.routing_data import get_routing_store
        store = get_routing_store()
        detail = store.l3_detail.get(l3_code)
        if not detail:
            return []

        entry = store.get_routing(l3_code)
        metadata = {
            "source_type": "bsm_routing",
            "l3_code": l3_code,
            "bt_type": entry.bt_type if entry else "",
            "gt_code": entry.gt_code if entry else "",
            "branch1": store.get_branch1_path(l3_code),
            "branch2": store.get_branch2_sourcing(l3_code),
        }

        chunks = []

        # 사용자 안내 메시지 청크 (02_L3_detail_guide)
        user_guide = detail.get("사용자안내", "")
        if user_guide:
            entry_method = detail.get("진입방법", "")
            sla_info = detail.get("Confirm_SLA", "")
            content = user_guide
            if entry_method:
                content += f"\n\n[진입방법] {entry_method}"
            if sla_info:
                content += f"\n[처리 SLA] {sla_info}"

            chunks.append({
                "id": f"bsm-msg-{l3_code}",
                "content": content,
                "metadata": {**metadata, "chunk_type": "user_message"},
                "doc_name": f"BSM_L3_{l3_code}",
                "category": entry.l1 if entry else "",
                "similarity": 1.0,
                "rrf_score": 1.0,
                "rrf_sources": ["bsm_routing"],
            })

        # 프로세스 가이드 청크
        process = store.get_process_guide(l3_code)
        if process:
            lines = []
            for key in sorted(process.keys()):
                lines.append(f"[{key}] {process[key]}")
            process_text = "\n".join(lines)
            chunks.append({
                "id": f"bsm-proc-{l3_code}",
                "content": process_text,
                "metadata": {**metadata, "chunk_type": "process_guide"},
                "doc_name": f"BSM_Process_{l3_code}",
                "category": entry.l1 if entry else "",
                "similarity": 0.99,
                "rrf_score": 0.95,
                "rrf_sources": ["bsm_process"],
            })

        return chunks
    except Exception as e:
        logger.warning(f"JSON chunk 생성 실패 (l3={l3_code}): {e}")
        return []


# ── 하이브리드 검색 (JSON 1순위 + BM25/Vector 2순위 + FAQ 3순위 최소폴백) ──

def hybrid_search(
    query: str,
    category: str | None = None,
    taxonomy_major: str | None = None,
    top_k: int = RAG_TOP_K,
    min_similarity: float = VECTOR_MIN_SIMILARITY,
    l3_code: str | None = None,
    user_role: str | None = None,
) -> tuple[list[dict], list[float]]:
    """3단계 하이브리드 검색.

    [1순위] L3 JSON 직접 조회 — l3_code가 있으면 JSON 안내 메시지를 가상 청크로 반환 (RAG 스킵)
    [2순위] knowledge_chunks — Vector + BM25 → RRF 리랭킹
    [3순위] knowledge_faq — 최소 폴백 (boost 0.5, top_k 2)

    Returns: (chunks, query_embedding)
    """
    import time
    t0 = time.time()

    # ── [1순위] L3 JSON 직접 조회 — 비활성화 (데이터는 DB에 시딩 완료) ──
    # _build_json_chunks는 BSM JSON 시딩 파일을 직접 읽는 레거시 코드.
    # 모든 데이터가 knowledge_chunks에 시딩되었으므로 DB 검색으로 통일.

    # ── [2순위] knowledge_chunks (Vector + BM25 병렬) ──
    query_embedding = embed_query(query)
    t_embed = time.time()

    bm25_chunks = []
    vector_chunks = []

    def _do_bm25():
        return bm25_keyword_search(query, category, top_k=10, user_role=user_role)

    def _do_vector():
        return vector_search_with_embedding(query_embedding, category, top_k=10, min_similarity=min_similarity, user_role=user_role)

    with ThreadPoolExecutor(max_workers=2) as executor:
        futures = {
            executor.submit(_do_bm25): "bm25",
            executor.submit(_do_vector): "vector",
        }
        for future in as_completed(futures):
            source = futures[future]
            try:
                result = future.result()
                if source == "bm25":
                    bm25_chunks = result
                else:
                    vector_chunks = result
            except Exception as e:
                logger.warning(f"RAG {source} search failed: {e}")

    t_primary = time.time()

    # 2순위 RRF (BM25 + Vector, FAQ 없이)
    fused = _rrf_fuse([], bm25_chunks, vector_chunks, top_k=RRF_TOP_K)

    # ── [3순위] FAQ 최소 폴백 (chunks 부족 AND FAQ 활성화 시만) ──
    faq_chunks = []
    primary_max_sim = max((c.get("similarity", 0) for c in fused), default=0)
    needs_faq_fallback = FAQ_ENABLED and (len(fused) < top_k or primary_max_sim < 0.72)

    if needs_faq_fallback:
        try:
            faq_results = faq_search(
                query_embedding, taxonomy_major, category,
                top_k=FAQ_FALLBACK_TOP_K,
                min_similarity=0.55,
                user_role=user_role,
            )
            faq_chunks = _format_faq_as_chunks(faq_results) if faq_results else []
        except Exception as e:
            logger.warning(f"FAQ fallback search failed: {e}")

    t_fallback = time.time()

    # FAQ 결과를 기존 fused에 병합 (이중 RRF 방지)
    if faq_chunks:
        existing_ids = {c.get("id") for c in fused}
        for fc in faq_chunks:
            if fc.get("id") not in existing_ids:
                fused.append(fc)
        fused.sort(key=lambda c: c.get("rrf_score", c.get("similarity", 0)), reverse=True)
        fused = fused[:RRF_TOP_K]

    t_fuse = time.time()
    logger.info(
        f"hybrid_search: bm25={len(bm25_chunks)} vec={len(vector_chunks)} "
        f"faq_fallback={len(faq_chunks)}{'(triggered)' if needs_faq_fallback else '(skipped)'} "
        f"→ fused={len(fused)} | embed={int((t_embed-t0)*1000)}ms "
        f"primary={int((t_primary-t_embed)*1000)}ms "
        f"fallback={int((t_fallback-t_primary)*1000)}ms "
        f"total={int((t_fuse-t0)*1000)}ms"
    )

    if not fused:
        logger.info("hybrid_search: no results from any source")
        return [], query_embedding

    return fused[:top_k], query_embedding

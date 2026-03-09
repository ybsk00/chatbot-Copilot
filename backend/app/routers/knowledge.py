from concurrent.futures import ThreadPoolExecutor
from fastapi import APIRouter, UploadFile, File, Form
from app.db.supabase_client import get_client
from app.pipeline.ingestion import ingest_pdf
import tempfile
import os

router = APIRouter(prefix="/knowledge", tags=["knowledge"])


@router.get("")
async def list_knowledge(category: str | None = None, limit: int = 50):
    """지식베이스 청크 목록 조회"""
    supabase = get_client()
    query = supabase.table("knowledge_chunks").select(
        "id, category, sub_cat, doc_name, chunk_index, created_at"
    )
    if category:
        query = query.eq("category", category)
    result = query.order("created_at", desc=True).limit(limit).execute()
    return {"chunks": result.data, "total": len(result.data)}


@router.get("/stats")
async def knowledge_stats():
    """카테고리별 청크 수 통계 (category 컬럼만 조회)"""
    supabase = get_client()
    result = supabase.table("knowledge_chunks").select("category").execute()
    stats = {}
    for row in result.data or []:
        cat = row["category"]
        stats[cat] = stats.get(cat, 0) + 1
    return {"stats": stats, "total": sum(stats.values())}


@router.get("/overview")
async def knowledge_overview():
    """지식베이스 현황 — 카테고리별 청크/FAQ/문서 수"""
    supabase = get_client()

    def fetch_chunks():
        return supabase.table("knowledge_chunks").select(
            "category, doc_name"
        ).execute()

    def fetch_faqs():
        return supabase.table("knowledge_faq").select(
            "category"
        ).execute()

    # 병렬 실행
    with ThreadPoolExecutor(max_workers=2) as pool:
        f_chunks = pool.submit(fetch_chunks)
        f_faqs = pool.submit(fetch_faqs)

    chunks_res = f_chunks.result()
    faq_res = f_faqs.result()

    chunk_by_cat = {}
    docs_by_cat = {}
    for row in chunks_res.data or []:
        cat = row["category"]
        chunk_by_cat[cat] = chunk_by_cat.get(cat, 0) + 1
        docs_by_cat.setdefault(cat, set()).add(row["doc_name"])

    faq_by_cat = {}
    for row in faq_res.data or []:
        cat = row["category"]
        faq_by_cat[cat] = faq_by_cat.get(cat, 0) + 1

    all_cats = sorted(set(list(chunk_by_cat.keys()) + list(faq_by_cat.keys())))
    categories = []
    for cat in all_cats:
        categories.append({
            "category": cat,
            "chunks": chunk_by_cat.get(cat, 0),
            "faqs": faq_by_cat.get(cat, 0),
            "documents": len(docs_by_cat.get(cat, set())),
        })

    total_chunks = sum(chunk_by_cat.values())
    total_faqs = sum(faq_by_cat.values())
    total_docs = sum(len(v) for v in docs_by_cat.values())

    return {
        "total_chunks": total_chunks,
        "total_faqs": total_faqs,
        "total_documents": total_docs,
        "total_categories": len(all_cats),
        "categories": categories,
    }


@router.post("/upload")
async def upload_pdf(
    file: UploadFile = File(...),
    category: str = Form(...),
    sub_cat: str = Form(""),
):
    """PDF 업로드 → 청크 → 정제 → 임베딩 → 저장"""
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        result = ingest_pdf(tmp_path, category, sub_cat)
        return {"status": "success", **result}
    finally:
        os.unlink(tmp_path)

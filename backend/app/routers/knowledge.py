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
    """카테고리별 청크 수 통계"""
    supabase = get_client()
    result = supabase.table("knowledge_chunks").select("category").execute()
    stats = {}
    for row in result.data or []:
        cat = row["category"]
        stats[cat] = stats.get(cat, 0) + 1
    return {"stats": stats, "total": sum(stats.values())}


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

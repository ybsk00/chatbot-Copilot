import csv
import io
from fastapi import APIRouter, UploadFile, File
from pydantic import BaseModel
from app.db.supabase_client import get_client

router = APIRouter(prefix="/suppliers", tags=["suppliers"])


class SupplierCreate(BaseModel):
    name: str
    category: str
    score: int = 0
    match_rate: int = 0
    tags: list[str] = []
    status: str = "active"


@router.get("")
async def list_suppliers(category: str | None = None, sub_category: str | None = None, status: str = "active"):
    supabase = get_client()
    query = supabase.table("suppliers").select("*")
    if category:
        query = query.eq("category", category)
    if sub_category:
        query = query.eq("sub_category", sub_category)
    if status:
        query = query.eq("status", status)
    result = query.order("score", desc=True).execute()
    return {"suppliers": result.data}


@router.get("/search")
async def search_suppliers(category: str, keywords: str = ""):
    """키워드 기반 공급업체 검색 — tags/sub_category 매칭"""
    supabase = get_client()
    result = (
        supabase.table("suppliers")
        .select("*")
        .eq("category", category)
        .eq("status", "active")
        .order("score", desc=True)
        .execute()
    )
    suppliers = result.data or []

    if not keywords.strip():
        return {"suppliers": suppliers}

    kws = [k.strip() for k in keywords.split(",") if k.strip()]

    def relevance(s):
        score = 0
        sub = (s.get("sub_category") or "").lower()
        tags_str = " ".join(s.get("tags") or []).lower()
        for kw in kws:
            kw_lower = kw.lower()
            if kw_lower in sub:
                score += 3
            if kw_lower in tags_str:
                score += 2
            if kw_lower in s.get("name", "").lower():
                score += 1
        return score

    ranked = sorted(suppliers, key=lambda s: (-relevance(s), -s.get("score", 0)))
    return {"suppliers": ranked}


@router.post("")
async def create_supplier(supplier: SupplierCreate):
    supabase = get_client()
    result = (
        supabase.table("suppliers")
        .insert(supplier.model_dump())
        .execute()
    )
    return {"status": "created", "data": result.data}


@router.put("/{supplier_id}")
async def update_supplier(supplier_id: int, supplier: SupplierCreate):
    supabase = get_client()
    result = (
        supabase.table("suppliers")
        .update(supplier.model_dump())
        .eq("id", supplier_id)
        .execute()
    )
    return {"status": "updated", "data": result.data}


@router.delete("/{supplier_id}")
async def delete_supplier(supplier_id: int):
    supabase = get_client()
    supabase.table("suppliers").delete().eq("id", supplier_id).execute()
    return {"status": "deleted"}


@router.post("/upload-csv")
async def upload_csv(file: UploadFile = File(...)):
    """CSV 업로드로 공급업체 일괄 등록
    CSV 헤더: 업체명,카테고리,평점,매칭률,태그,상태
    """
    content = await file.read()
    text = content.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))

    supabase = get_client()
    created = 0
    errors = []

    for i, row in enumerate(reader, start=2):
        try:
            name = row.get("업체명", "").strip()
            category = row.get("카테고리", "").strip()
            if not name or not category:
                errors.append(f"{i}행: 업체명/카테고리 누락")
                continue

            tags_str = row.get("태그", "")
            tags = [t.strip() for t in tags_str.split(",") if t.strip()] if tags_str else []

            data = {
                "name": name,
                "category": category,
                "score": int(row.get("평점", 0) or 0),
                "match_rate": int(row.get("매칭률", 0) or 0),
                "tags": tags,
                "status": row.get("상태", "active").strip() or "active",
            }
            supabase.table("suppliers").insert(data).execute()
            created += 1
        except Exception as e:
            errors.append(f"{i}행: {str(e)}")

    return {"status": "completed", "created": created, "errors": errors}

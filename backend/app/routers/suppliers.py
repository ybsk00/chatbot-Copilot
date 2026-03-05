from fastapi import APIRouter
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
async def list_suppliers(category: str | None = None, status: str = "active"):
    supabase = get_client()
    query = supabase.table("suppliers").select("*")
    if category:
        query = query.eq("category", category)
    if status:
        query = query.eq("status", status)
    result = query.order("score", desc=True).execute()
    return {"suppliers": result.data}


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

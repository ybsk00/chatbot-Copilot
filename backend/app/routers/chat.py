from fastapi import APIRouter
from pydantic import BaseModel
from app.rag.retriever import hybrid_search
from app.rag.generator import generate_answer
from app.constitution.gate import check_constitution

router = APIRouter(prefix="/chat", tags=["chat"])


class ChatRequest(BaseModel):
    session_id: str
    message: str
    category: str | None = None
    history: list[dict] = []


@router.post("")
async def chat(req: ChatRequest):
    # 1. 헌법 검사
    violation = check_constitution(req.message)
    if violation:
        return {"answer": violation, "sources": [], "rag_score": 0}

    # 2. 하이브리드 검색
    chunks = hybrid_search(req.message, category=req.category)

    # 3. 답변 생성
    answer, score = generate_answer(req.message, chunks, req.history)

    return {
        "answer": answer,
        "sources": [c["doc_name"] for c in chunks],
        "rag_score": score,
        "chunks": chunks[:3],
    }

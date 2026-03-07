import time
from pathlib import Path
from app.pipeline.chunker import pdf_to_chunks
from app.pipeline.refiner import refine_chunk, generate_chunk_question
from app.rag.embedder import embed_document
from app.db.supabase_client import get_client


def ingest_pdf(pdf_path: str, category: str, sub_cat: str = "") -> dict:
    """단일 PDF 처리: 청크 → 정제 → 질문접두사 → 임베딩 → Supabase 저장"""
    supabase = get_client()
    chunks = pdf_to_chunks(pdf_path, category, sub_cat)
    saved = 0
    skipped = 0

    for chunk in chunks:
        is_table = chunk.get("metadata", {}).get("type") == "table"

        # 표 청크는 정제 건너뛰기 (이미 구조화됨)
        if is_table:
            refined = chunk["content"]
        else:
            refined = refine_chunk(chunk["content"])

        if len(refined) < 30:
            skipped += 1
            continue

        # 질문 접두사 생성
        question = generate_chunk_question(refined)
        if question:
            content_with_q = f"Q: {question}\n{refined}"
        else:
            content_with_q = refined

        embedding = embed_document(content_with_q)

        metadata = chunk.get("metadata", {})
        metadata["original_length"] = len(chunk["content"])
        if question:
            metadata["question_prefix"] = question

        supabase.table("knowledge_chunks").insert(
            {
                "category": chunk["category"],
                "sub_cat": chunk["sub_cat"],
                "doc_name": chunk["doc_name"],
                "chunk_index": chunk["chunk_index"],
                "content": content_with_q,
                "metadata": metadata,
                "embedding": embedding,
            }
        ).execute()

        saved += 1
        time.sleep(0.1)

    return {
        "file": Path(pdf_path).name,
        "total_chunks": len(chunks),
        "saved": saved,
        "skipped": skipped,
    }


def ingest_directory(data_dir: str, category: str, sub_cat: str = "") -> list[dict]:
    """디렉토리 내 모든 PDF 처리"""
    pdf_files = sorted(Path(data_dir).glob("*.pdf"))
    results = []

    for pdf_path in pdf_files:
        result = ingest_pdf(str(pdf_path), category, sub_cat)
        results.append(result)

    return results

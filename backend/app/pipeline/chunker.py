import pdfplumber
import re
from pathlib import Path

TARGET_TOKENS = 400
OVERLAP_TOKENS = 50


def pdf_to_chunks(pdf_path: str, category: str, sub_cat: str = "") -> list[dict]:
    """PDF → 청크 리스트"""
    chunks = []
    full_text = ""

    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            text = page.extract_text() or ""
            full_text += text + "\n"

    paragraphs = [p.strip() for p in re.split(r"\n{2,}", full_text) if p.strip()]

    current_chunk = ""
    chunk_idx = 0

    for para in paragraphs:
        estimated_tokens = len(para) // 2
        current_tokens = len(current_chunk) // 2

        if current_tokens + estimated_tokens > TARGET_TOKENS and current_chunk:
            chunks.append(
                {
                    "doc_name": Path(pdf_path).name,
                    "category": category,
                    "sub_cat": sub_cat,
                    "chunk_index": chunk_idx,
                    "content": current_chunk.strip(),
                }
            )
            current_chunk = current_chunk[-(OVERLAP_TOKENS * 2) :]
            chunk_idx += 1

        current_chunk += "\n" + para

    if current_chunk.strip():
        chunks.append(
            {
                "doc_name": Path(pdf_path).name,
                "category": category,
                "sub_cat": sub_cat,
                "chunk_index": chunk_idx,
                "content": current_chunk.strip(),
            }
        )

    return chunks

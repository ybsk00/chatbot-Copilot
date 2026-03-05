"""
689개 PDF 전체 파이프라인: 청크 → 정제 → 임베딩 → Supabase 저장
사용법: python scripts/run_full_pipeline.py
"""
import sys
import os
import re
import time
import glob
import traceback

sys.stdout.reconfigure(encoding="utf-8")
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dotenv import load_dotenv
load_dotenv()

from app.pipeline.chunker import pdf_to_chunks
from app.pipeline.refiner import refine_chunk
from app.rag.embedder import embed_document
from app.db.supabase_client import get_client

PDF_DIR = "C:/Users/유범석/개발소스코드/26_03/업무마켓챗봇"


def extract_category(filename):
    """파일명에서 서비스 카테고리 추출"""
    # Remove prefix like 01_, 02_, etc.
    name = re.sub(r"^\d{2}_", "", filename)
    # Remove BOM
    name = name.lstrip("\ufeff")
    # Remove .pdf
    name = name.replace(".pdf", "")

    # Extract service name (before document type separator)
    separators = [
        " - 구매 실행 템플릿", " - 구매전략", " - 제안요청서",
        " - 표준 구매 프로세스", " - 향후 발전 방향",
        " – 구매 실행 템플릿", " – 구매전략", " – 제안요청서",
        " – 표준 구매 프로세스", " – 향후 발전 방향",
        " — 구매전략", " — 구매 실행 템플릿",
        "–구매실행 템플릿", "–구매전략", " 구매전략",
        " 구매실행 템플릿", " 제안요청서", " 표준 구매 프로세스",
        "의 향후 발전 방향", "– 구매실행 템플릿",
    ]

    category = name
    for sep in separators:
        if sep in category:
            category = category.split(sep)[0].strip()
            break

    return category.strip()


def main():
    supabase = get_client()

    # Get already processed doc_names to skip
    existing = supabase.table("knowledge_chunks").select("doc_name").execute()
    processed_docs = set(r["doc_name"] for r in existing.data)
    print(f"이미 처리된 문서: {len(processed_docs)}개")

    # Get all PDFs
    pdfs = sorted(glob.glob(os.path.join(PDF_DIR, "*.pdf")))
    print(f"전체 PDF: {len(pdfs)}개")

    # Filter out already processed
    pdfs_to_process = [p for p in pdfs if os.path.basename(p) not in processed_docs]
    print(f"처리 대상: {len(pdfs_to_process)}개\n")

    total_saved = 0
    total_skipped = 0
    total_errors = 0
    start_time = time.time()

    for file_idx, pdf_path in enumerate(pdfs_to_process):
        fname = os.path.basename(pdf_path)
        category = extract_category(fname)

        elapsed = time.time() - start_time
        rate = (file_idx / elapsed * 60) if elapsed > 0 and file_idx > 0 else 0
        print(f"[{file_idx+1}/{len(pdfs_to_process)}] {fname}")
        print(f"  카테고리: {category} | 속도: {rate:.1f}개/분")

        try:
            chunks = pdf_to_chunks(pdf_path, category)
            print(f"  → {len(chunks)}개 청크")

            for i, chunk in enumerate(chunks):
                # 1. Refine (with retry)
                refined = None
                for attempt in range(3):
                    try:
                        refined = refine_chunk(chunk["content"])
                        break
                    except Exception as e:
                        if "429" in str(e) and attempt < 2:
                            wait = (attempt + 1) * 5
                            print(f"  ⏳ 정제 429, {wait}초 대기...")
                            time.sleep(wait)
                        else:
                            print(f"  ⚠ 청크{i} 정제 실패: {e}")
                            break

                if not refined or len(refined) < 30:
                    total_skipped += 1
                    continue

                # 2. Embed (with retry)
                embedding = None
                for attempt in range(3):
                    try:
                        embedding = embed_document(refined)
                        break
                    except Exception as e:
                        if "429" in str(e) and attempt < 2:
                            wait = (attempt + 1) * 5
                            print(f"  ⏳ 임베딩 429, {wait}초 대기...")
                            time.sleep(wait)
                        else:
                            print(f"  ⚠ 청크{i} 임베딩 실패: {e}")
                            break

                if not embedding:
                    total_skipped += 1
                    continue

                # 3. Store
                try:
                    supabase.table("knowledge_chunks").insert({
                        "category": chunk["category"],
                        "sub_cat": chunk.get("sub_cat", ""),
                        "doc_name": chunk["doc_name"],
                        "chunk_index": chunk["chunk_index"],
                        "content": refined,
                        "metadata": {"original_length": len(chunk["content"])},
                        "embedding": embedding,
                    }).execute()
                    total_saved += 1
                except Exception as e:
                    print(f"  ⚠ 청크{i} 저장 실패: {e}")
                    total_errors += 1

                time.sleep(0.1)  # Rate limit

            print(f"  ✅ 완료 (누적: {total_saved}개 저장)")

        except Exception as e:
            print(f"  ❌ 파일 처리 실패: {e}")
            total_errors += 1

        # Progress every 50 files
        if (file_idx + 1) % 50 == 0:
            elapsed = time.time() - start_time
            print(f"\n--- 진행상황: {file_idx+1}/{len(pdfs_to_process)} ---")
            print(f"    저장: {total_saved} | 스킵: {total_skipped} | 오류: {total_errors}")
            print(f"    경과: {elapsed/60:.1f}분\n")

    elapsed = time.time() - start_time
    print(f"\n{'='*50}")
    print(f"🎉 전체 파이프라인 완료!")
    print(f"   처리: {len(pdfs_to_process)}개 PDF")
    print(f"   저장: {total_saved}개 청크")
    print(f"   스킵: {total_skipped}개")
    print(f"   오류: {total_errors}개")
    print(f"   시간: {elapsed/60:.1f}분")
    print(f"{'='*50}")


if __name__ == "__main__":
    main()

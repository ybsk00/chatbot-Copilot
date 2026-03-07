"""
테스트 입수: 9개 RFP 템플릿별 2개 서비스 × 5종 PDF
사용법: python -u scripts/test_ingest.py
"""
import sys
import os
import time
import glob

sys.stdout.reconfigure(encoding="utf-8")
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dotenv import load_dotenv
load_dotenv()

from app.pipeline.chunker import pdf_to_chunks
from app.pipeline.refiner import refine_chunk, generate_chunk_question
from app.rag.embedder import embed_document
from app.db.supabase_client import get_client

PDF_DIR = "C:/Users/유범석/개발소스코드/26_03/업무마켓챗봇"

# 18개 서비스 검색 패턴 → 카테고리명
SERVICES = [
    # purchase
    ("의약품 구매", "의약품 구매 서비스"),
    ("공장용 소모품", "공장용 소모품"),
    # service_contract
    ("청소·소독", "청소·소독 서비스"),
    ("운전용역", "운전용역 서비스"),
    # service
    ("택배 서비스", "택배 서비스"),
    ("건강검진", "건강검진 서비스"),
    # rental
    ("임원차량 리스", "임원차량 리스 서비스"),
    ("공기청정기 렌탈", "공기청정기 렌탈 서비스"),
    # construction
    ("사무실 인테리어", "사무실 인테리어 서비스"),
    ("칸막이", "칸막이(파티션) 레이아웃 공사"),
    # consulting
    ("회계·세무", "회계·세무 용역 서비스"),
    ("법무·노무", "법무·노무 자문 서비스"),
    # purchase_maintenance
    ("사무가구 구매", "사무가구 구매 및 유지 서비스"),
    ("생산장비 구매", "생산장비 구매·수리 서비스"),
    # rental_maintenance
    ("OA기기 렌탈", "OA기기 렌탈 및 유지보수 서비스"),
    ("복합기", "복합기·프린터 유지보수 서비스"),
    # purchase_lease
    ("08_PC·노트북", "PC·노트북·모니터·워크스테이션 구매·리스"),  # 08_ prefix to exclude 헬프데스크
    ("계측기 구매", "계측기 구매·리스"),
]


def find_pdfs(search_pattern):
    """검색 패턴으로 PDF 파일 찾기"""
    all_pdfs = glob.glob(os.path.join(PDF_DIR, "*.pdf"))
    matched = [p for p in all_pdfs if search_pattern in os.path.basename(p)]
    # 헬프데스크 제외 (PC·노트북 검색 시)
    if "PC·노트북" in search_pattern:
        matched = [p for p in matched if "헬프데스크" not in os.path.basename(p)]
    return matched


def ingest_single_pdf(pdf_path, category):
    """단일 PDF: 청크 → 정제 → 질문접두사 → 임베딩 → 저장"""
    supabase = get_client()
    chunks = pdf_to_chunks(pdf_path, category)
    saved = 0
    skipped = 0

    for chunk in chunks:
        try:
            is_table = chunk.get("metadata", {}).get("type") == "table"

            # 표 청크는 정제 건너뛰기
            if is_table:
                refined = chunk["content"]
            else:
                for attempt in range(3):
                    try:
                        refined = refine_chunk(chunk["content"])
                        break
                    except Exception as e:
                        if "429" in str(e) and attempt < 2:
                            time.sleep((attempt + 1) * 5)
                        else:
                            raise

            if len(refined) < 30:
                skipped += 1
                continue

            # 질문 접두사 생성
            question = ""
            for attempt in range(3):
                try:
                    question = generate_chunk_question(refined)
                    break
                except Exception as e:
                    if "429" in str(e) and attempt < 2:
                        time.sleep((attempt + 1) * 3)

            if question:
                content_with_q = f"Q: {question}\n{refined}"
            else:
                content_with_q = refined

            # 임베딩
            embedding = None
            for attempt in range(3):
                try:
                    embedding = embed_document(content_with_q)
                    break
                except Exception as e:
                    if "429" in str(e) and attempt < 2:
                        time.sleep((attempt + 1) * 5)
                    else:
                        raise

            if not embedding:
                skipped += 1
                continue

            metadata = chunk.get("metadata", {})
            metadata["original_length"] = len(chunk["content"])
            if question:
                metadata["question_prefix"] = question

            supabase.table("knowledge_chunks").insert({
                "category": category,
                "sub_cat": chunk.get("sub_cat", ""),
                "doc_name": chunk["doc_name"],
                "chunk_index": chunk["chunk_index"],
                "content": content_with_q,
                "metadata": metadata,
                "embedding": embedding,
            }).execute()

            saved += 1
            time.sleep(0.05)

        except Exception as e:
            print(f"    에러: {e}")
            skipped += 1

    return saved, skipped


def main():
    supabase = get_client()

    # 1. 기존 청크 정리
    print("기존 청크 정리 중...")
    try:
        supabase.table("knowledge_faq").delete().gt("id", 0).execute()
        print("  FAQ 삭제 완료")
    except Exception as e:
        print(f"  FAQ 삭제 실패 (무시): {e}")

    try:
        supabase.table("knowledge_chunks").delete().gt("id", 0).execute()
        print("  기존 청크 삭제 완료")
    except Exception as e:
        print(f"  기존 청크 삭제 실패 (무시): {e}")

    # 2. 서비스별 PDF 입수
    total_saved = 0
    total_skipped = 0
    total_pdfs = 0
    start_time = time.time()

    for search_pattern, category in SERVICES:
        pdfs = find_pdfs(search_pattern)
        print(f"\n{'='*60}")
        print(f"[{category}] {len(pdfs)}개 PDF")
        print(f"{'='*60}")

        for pdf_path in pdfs:
            filename = os.path.basename(pdf_path)
            print(f"  {filename}...")
            saved, skipped = ingest_single_pdf(pdf_path, category)
            total_saved += saved
            total_skipped += skipped
            total_pdfs += 1
            print(f"    -> 저장: {saved}, 스킵: {skipped}")

    elapsed = time.time() - start_time
    print(f"\n{'='*60}")
    print(f"테스트 입수 완료!")
    print(f"  PDF: {total_pdfs}개")
    print(f"  저장: {total_saved}개 청크")
    print(f"  스킵: {total_skipped}개")
    print(f"  시간: {elapsed/60:.1f}분")
    print(f"{'='*60}")
    print(f"\n다음 단계: python scripts/generate_faq.py 실행하여 FAQ 생성")


if __name__ == "__main__":
    main()

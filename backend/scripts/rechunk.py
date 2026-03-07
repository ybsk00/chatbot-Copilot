"""
기존 knowledge_chunks를 500자 문장경계로 재분할하고 질문 접두사 + 임베딩 생성
사용법: python scripts/rechunk.py [--category "임원차량 리스 서비스"] [--dry-run]

주의: 기존 청크를 삭제하고 새 청크로 교체합니다.
      knowledge_faq도 전체 삭제됩니다 (generate_faq.py로 재생성 필요).
"""
import sys
import os
import re
import time
import argparse

sys.stdout.reconfigure(encoding="utf-8")
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dotenv import load_dotenv
load_dotenv()

from app.pipeline.chunker import split_sentences, _chunk_sentences, TARGET_CHARS
from app.pipeline.refiner import generate_chunk_question
from app.rag.embedder import embed_document
from app.db.supabase_client import get_client


def rechunk_content(content: str) -> list[str]:
    """기존 청크 content를 500자 문장경계로 재분할"""
    # 이미 "Q: ..." 접두사가 있으면 제거
    clean = re.sub(r'^Q:\s*.+?\n', '', content).strip()
    sentences = split_sentences(clean)
    return _chunk_sentences(sentences, TARGET_CHARS)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--category", default=None, help="특정 카테고리만 처리")
    parser.add_argument("--dry-run", action="store_true", help="실제 DB 변경 없이 통계만 출력")
    parser.add_argument("--force", action="store_true", help="확인 없이 바로 실행")
    args = parser.parse_args()

    supabase = get_client()

    # 1. 기존 청크 조회
    query = supabase.table("knowledge_chunks").select("id, category, sub_cat, doc_name, chunk_index, content, metadata")
    if args.category:
        query = query.eq("category", args.category)

    # 페이지네이션으로 전체 조회
    all_chunks = []
    offset = 0
    page_size = 1000
    while True:
        result = query.range(offset, offset + page_size - 1).execute()
        batch = result.data or []
        all_chunks.extend(batch)
        if len(batch) < page_size:
            break
        offset += page_size

    print(f"기존 청크: {len(all_chunks)}개")

    # 기존 청크 길이 통계
    lengths = [len(c["content"]) for c in all_chunks]
    if lengths:
        avg_len = sum(lengths) / len(lengths)
        print(f"기존 평균 길이: {avg_len:.0f}자")
        print(f"기존 최대 길이: {max(lengths)}자")
        over_500 = sum(1 for l in lengths if l > 500)
        print(f"500자 초과: {over_500}개 ({over_500/len(lengths)*100:.1f}%)")

    # 2. 재분할 시뮬레이션
    new_chunks = []
    for chunk in all_chunks:
        # 표 청크는 그대로 유지
        metadata = chunk.get("metadata") or {}
        if metadata.get("type") == "table":
            new_chunks.append({
                "category": chunk["category"],
                "sub_cat": chunk.get("sub_cat", ""),
                "doc_name": chunk["doc_name"],
                "content": chunk["content"],
                "metadata": metadata,
                "original_id": chunk["id"],
            })
            continue

        # 텍스트 청크 → 500자 재분할
        sub_chunks = rechunk_content(chunk["content"])
        for sc in sub_chunks:
            if len(sc.strip()) >= 30:
                new_chunks.append({
                    "category": chunk["category"],
                    "sub_cat": chunk.get("sub_cat", ""),
                    "doc_name": chunk["doc_name"],
                    "content": sc.strip(),
                    "metadata": {"type": "text"},
                    "original_id": chunk["id"],
                })

    print(f"\n재분할 결과: {len(all_chunks)}개 → {len(new_chunks)}개")
    new_lengths = [len(c["content"]) for c in new_chunks]
    if new_lengths:
        print(f"새 평균 길이: {sum(new_lengths)/len(new_lengths):.0f}자")
        print(f"새 최대 길이: {max(new_lengths)}자")

    if args.dry_run:
        print("\n[DRY RUN] 실제 DB 변경 없이 종료합니다.")
        return

    # 3. 실행 확인
    if not args.force:
        confirm = input(f"\n기존 {len(all_chunks)}개 청크 삭제 → {len(new_chunks)}개로 교체합니다.\nFAQ도 전체 삭제됩니다. 계속하시겠습니까? (y/N): ")
        if confirm.lower() != 'y':
            print("취소됨.")
            return

    # 4. 기존 FAQ 삭제
    print("\nFAQ 삭제 중...")
    if args.category:
        supabase.table("knowledge_faq").delete().eq("category", args.category).execute()
    else:
        # 전체 삭제 — ID > 0 조건으로 전체 매칭
        supabase.table("knowledge_faq").delete().gt("id", 0).execute()
    print("FAQ 삭제 완료")

    # 5. 기존 청크 삭제
    print("기존 청크 삭제 중...")
    old_ids = [c["id"] for c in all_chunks]
    # 배치 삭제 (100개씩)
    for i in range(0, len(old_ids), 100):
        batch_ids = old_ids[i:i+100]
        supabase.table("knowledge_chunks").delete().in_("id", batch_ids).execute()
    print(f"기존 청크 {len(old_ids)}개 삭제 완료")

    # 6. 새 청크 저장 (질문 접두사 + 임베딩)
    print(f"\n새 청크 {len(new_chunks)}개 처리 시작...\n")
    saved = 0
    errors = 0
    start_time = time.time()

    for idx, chunk in enumerate(new_chunks):
        try:
            content = chunk["content"]

            # 질문 접두사 생성
            question = ""
            for attempt in range(3):
                try:
                    question = generate_chunk_question(content)
                    break
                except Exception as e:
                    if "429" in str(e) and attempt < 2:
                        time.sleep((attempt + 1) * 3)
                    else:
                        break

            if question:
                content_with_q = f"Q: {question}\n{content}"
            else:
                content_with_q = content

            # 임베딩 생성
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
                errors += 1
                continue

            metadata = chunk["metadata"].copy()
            if question:
                metadata["question_prefix"] = question

            supabase.table("knowledge_chunks").insert({
                "category": chunk["category"],
                "sub_cat": chunk["sub_cat"],
                "doc_name": chunk["doc_name"],
                "chunk_index": idx,
                "content": content_with_q,
                "metadata": metadata,
                "embedding": embedding,
            }).execute()

            saved += 1
            time.sleep(0.1)

            if (idx + 1) % 50 == 0:
                elapsed = time.time() - start_time
                rate = (idx + 1) / elapsed * 60
                print(f"  [{idx+1}/{len(new_chunks)}] 저장: {saved} | 에러: {errors} | {rate:.0f}개/분")

        except Exception as e:
            print(f"  [{idx+1}] 에러: {e}")
            errors += 1

    elapsed = time.time() - start_time
    print(f"\n{'='*50}")
    print(f"재청킹 완료!")
    print(f"  기존: {len(all_chunks)}개 → 새: {saved}개")
    print(f"  에러: {errors}개")
    print(f"  시간: {elapsed/60:.1f}분")
    print(f"{'='*50}")
    print(f"\n다음 단계: python scripts/generate_faq.py 실행하여 FAQ 재생성")


if __name__ == "__main__":
    main()

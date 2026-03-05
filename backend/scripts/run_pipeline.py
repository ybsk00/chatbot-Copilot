"""
로컬 PDF 정제 + 임베딩 + Supabase 저장 파이프라인
사용법: python -m scripts.run_pipeline --category "교육 서비스" --dir ./data/education
"""
import argparse
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.pipeline.ingestion import ingest_directory


def main():
    parser = argparse.ArgumentParser(description="PDF 데이터 파이프라인")
    parser.add_argument("--category", required=True, help="대분류 카테고리명")
    parser.add_argument("--dir", required=True, help="PDF 파일 디렉토리 경로")
    parser.add_argument("--sub_cat", default="", help="소분류")
    args = parser.parse_args()

    print(f"\n📂 {args.category} — PDF 처리 시작")
    print(f"   경로: {args.dir}\n")

    results = ingest_directory(args.dir, args.category, args.sub_cat)

    total_saved = sum(r["saved"] for r in results)
    total_skipped = sum(r["skipped"] for r in results)

    for r in results:
        print(f"  📄 {r['file']}: {r['saved']}/{r['total_chunks']} 청크 저장")

    print(f"\n🎉 완료! 총 {total_saved}개 저장, {total_skipped}개 스킵\n")


if __name__ == "__main__":
    main()

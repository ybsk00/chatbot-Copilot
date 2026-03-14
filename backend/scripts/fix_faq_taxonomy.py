"""
기존 knowledge_faq에서 taxonomy_major='기타'인 레코드를 보완된 매핑으로 업데이트
사용법: python scripts/fix_faq_taxonomy.py
"""
import sys
import os

sys.stdout.reconfigure(encoding="utf-8")
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dotenv import load_dotenv
load_dotenv()

from app.db.supabase_client import get_client
from scripts.generate_faq import get_taxonomy


def main():
    supabase = get_client()

    # 1. taxonomy_major가 '기타'인 FAQ 조회
    result = supabase.table("knowledge_faq") \
        .select("id, category, taxonomy_major") \
        .eq("taxonomy_major", "기타") \
        .execute()

    records = result.data
    print(f"'기타' FAQ: {len(records)}개")

    if not records:
        print("업데이트할 레코드가 없습니다.")
        return

    updated = 0
    still_unknown = 0

    for rec in records:
        major, middle = get_taxonomy(rec["category"])
        if major != "기타":
            supabase.table("knowledge_faq") \
                .update({"taxonomy_major": major, "taxonomy_middle": middle}) \
                .eq("id", rec["id"]) \
                .execute()
            updated += 1
        else:
            still_unknown += 1

    print(f"업데이트: {updated}개")
    print(f"여전히 기타: {still_unknown}개")

    # 여전히 기타인 카테고리 목록
    if still_unknown > 0:
        result2 = supabase.table("knowledge_faq") \
            .select("category") \
            .eq("taxonomy_major", "기타") \
            .execute()
        unknown_cats = set(r["category"] for r in result2.data)
        print("\n매핑 필요 카테고리:")
        for cat in sorted(unknown_cats):
            print(f"  - '{cat}'")


if __name__ == "__main__":
    main()

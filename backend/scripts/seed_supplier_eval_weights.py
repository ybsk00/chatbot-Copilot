"""supplier_eval_weights 시드 — 03_L4_supplier_detail.json → 1,175행"""
import json, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from app.db.supabase_client import get_client

DATA_PATH = os.path.join(
    os.path.dirname(__file__), "..", "..", "..",
    "4월 1일작업", "supplier_recommendation_chunking",
    "03_L4_supplier_detail.json",
)

# 항목번호 매핑: "①" → 1
_NUM_MAP = {"①": 1, "②": 2, "③": 3, "④": 4, "⑤": 5,
            "⑥": 6, "⑦": 7, "⑧": 8, "⑨": 9, "⑩": 10}


def main():
    with open(DATA_PATH, encoding="utf-8") as f:
        data = json.load(f)

    rows = []
    weight_errors = []
    for l4_code, entry in data.items():
        criteria = entry.get("평가_기준항목", [])
        total_weight = sum(c.get("가중치_pct", 0) for c in criteria)
        if total_weight != 100:
            weight_errors.append(f"{l4_code}: 가중치 합산 {total_weight}")

        for c in criteria:
            num = _NUM_MAP.get(c.get("항목", ""), 0)
            if num == 0:
                continue
            rows.append({
                "l4_code": l4_code,
                "criterion_num": num,
                "criterion_name": c.get("기준명", ""),
                "weight_pct": c.get("가중치_pct", 0),
            })

    if weight_errors:
        print(f"[경고] 가중치 합산 != 100: {len(weight_errors)}건")
        for e in weight_errors[:5]:
            print(f"  {e}")

    print(f"[supplier_eval_weights] 준비된 행: {len(rows)}")

    sb = get_client()
    sb.table("supplier_eval_weights").delete().neq("id", 0).execute()

    for i in range(0, len(rows), 50):
        batch = rows[i:i+50]
        sb.table("supplier_eval_weights").insert(batch).execute()
        print(f"  [{i+len(batch)}/{len(rows)}] inserted")

    print(f"[supplier_eval_weights] 완료: {len(rows)}행 삽입")


if __name__ == "__main__":
    main()

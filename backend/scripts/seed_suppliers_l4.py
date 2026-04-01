"""suppliers_l4 시드 — 03_L4_supplier_detail.json → ~2,688행"""
import json, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from app.db.supabase_client import get_client

DATA_PATH = os.path.join(
    os.path.dirname(__file__), "..", "..", "..",
    "4월 1일작업", "supplier_recommendation_chunking",
    "03_L4_supplier_detail.json",
)

# scores 키 매핑: "①" → score_1
_SCORE_MAP = {"①": "score_1", "②": "score_2", "③": "score_3",
              "④": "score_4", "⑤": "score_5"}


def _build_row(l4_code: str, supplier: dict, scope_type: str, scope_value: str | None) -> dict:
    """공급업체 1건 → DB 행 변환."""
    scores = supplier.get("scores", {})
    row = {
        "l4_code": l4_code,
        "scope_type": scope_type,
        "scope_value": scope_value,
        "rank": supplier.get("rank", 0),
        "company": supplier.get("company", ""),
        "revenue_est": supplier.get("revenue_est", ""),
        "strength_tech": supplier.get("strength_tech", ""),
        "strength_svc": supplier.get("strength_svc", ""),
        "sales_channel": supplier.get("sales_channel", ""),
        "contact_url": supplier.get("contact_url", ""),
        "dept": supplier.get("dept", ""),
        "purchase_note": supplier.get("purchase_note", ""),
        "raw_score": supplier.get("raw_score"),
        "weighted_score": supplier.get("weighted_score"),
        "grade": supplier.get("grade", "D"),
        "grade_label": supplier.get("grade_label", ""),
    }
    # 개별 점수 매핑
    for key, col in _SCORE_MAP.items():
        row[col] = scores.get(key)

    return row


def main():
    with open(DATA_PATH, encoding="utf-8") as f:
        data = json.load(f)

    rows = []
    stats = {"nationwide": 0, "regional": 0, "worktype": 0}

    for l4_code, entry in data.items():
        # 전국 공급사
        for s in entry.get("전국_공급사", []):
            rows.append(_build_row(l4_code, s, "nationwide", None))
            stats["nationwide"] += 1

        # 지역별 공급사
        for region, suppliers in entry.get("지역별_공급사", {}).items():
            for s in suppliers:
                rows.append(_build_row(l4_code, s, "regional", region))
                stats["regional"] += 1

        # 공종별 공급사
        for worktype, suppliers in entry.get("공종별_공급사", {}).items():
            for s in suppliers:
                rows.append(_build_row(l4_code, s, "worktype", worktype))
                stats["worktype"] += 1

    print(f"[suppliers_l4] 준비된 행: {len(rows)}")
    print(f"  전국: {stats['nationwide']}, 지역: {stats['regional']}, 공종: {stats['worktype']}")

    sb = get_client()
    sb.table("suppliers_l4").delete().neq("id", 0).execute()

    for i in range(0, len(rows), 50):
        batch = rows[i:i+50]
        sb.table("suppliers_l4").insert(batch).execute()
        print(f"  [{i+len(batch)}/{len(rows)}] inserted")

    print(f"[suppliers_l4] 완료: {len(rows)}행 삽입")


if __name__ == "__main__":
    main()

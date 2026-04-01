"""taxonomy_l4 시드 — 02_taxonomy_L1_L2_L3_L4.json → 235행"""
import json, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from app.db.supabase_client import get_client

DATA_PATH = os.path.join(
    os.path.dirname(__file__), "..", "..", "..",
    "4월 1일작업", "supplier_recommendation_chunking",
    "02_taxonomy_L1_L2_L3_L4.json",
)

# 04 파일에서 분기 정보 로드
BRANCH_PATH = os.path.join(
    os.path.dirname(__file__), "..", "..", "..",
    "4월 1일작업", "supplier_recommendation_chunking",
    "04_L4_branch_decision.json",
)


def main():
    with open(DATA_PATH, encoding="utf-8") as f:
        taxonomy = json.load(f)
    with open(BRANCH_PATH, encoding="utf-8") as f:
        branch_list = json.load(f)

    # 분기 정보 인덱스
    branch_map = {b["L4코드"]: b for b in branch_list}

    rows = []
    for l1 in taxonomy:
        for l2 in l1.get("L2_목록", []):
            for l3 in l2.get("L3_목록", []):
                for l4 in l3.get("L4_목록", []):
                    code = l4["L4코드"]
                    br = branch_map.get(code, {})
                    has_region = br.get("분기_지역", l4.get("has_region", False))
                    has_worktype = br.get("분기_공종", l4.get("has_worktype", False))

                    if has_region and has_worktype:
                        branch_type = "regional+worktype"
                    elif has_region:
                        branch_type = "regional"
                    else:
                        branch_type = "nationwide"

                    # parent_code: L3-010101-01 → L3-010101
                    parent_code = code.rsplit("-", 1)[0]

                    rows.append({
                        "code": code,
                        "parent_code": parent_code,
                        "name": l4["L4"],
                        "branch_type": branch_type,
                        "has_region": has_region,
                        "has_worktype": has_worktype,
                    })

    print(f"[taxonomy_l4] 준비된 행: {len(rows)}")

    sb = get_client()
    # 기존 데이터 삭제
    sb.table("taxonomy_l4").delete().neq("id", 0).execute()

    # 50개씩 배치 삽입
    for i in range(0, len(rows), 50):
        batch = rows[i:i+50]
        sb.table("taxonomy_l4").insert(batch).execute()
        print(f"  [{i+len(batch)}/{len(rows)}] inserted")

    print(f"[taxonomy_l4] 완료: {len(rows)}행 삽입")


if __name__ == "__main__":
    main()

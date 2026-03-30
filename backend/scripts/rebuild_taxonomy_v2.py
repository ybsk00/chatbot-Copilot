"""taxonomy_v2 전면 재구축 — v2 JSON 기준

기존 taxonomy_v2의 L3 코드 불일치를 해소하기 위해
v2 JSON(08_taxonomy + 01_routing + 09_branch + 02_detail)에서
L1/L2/L3 전체를 재구축한다.

사용법:
  cd backend
  python -m scripts.rebuild_taxonomy_v2
  python -m scripts.rebuild_taxonomy_v2 --dry-run
"""
import sys, os, json, re, argparse
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from dotenv import load_dotenv
load_dotenv()

from app.db.supabase_client import get_client

BSM_DIR = os.path.join(os.path.dirname(__file__), "..", "app", "data", "bsm")


def read_json(name):
    with open(os.path.join(BSM_DIR, name), encoding="utf-8") as f:
        return json.load(f)


def extract_keywords_from_name(name: str) -> list[str]:
    """L3 이름에서 키워드 자동 추출"""
    # "정수기·공기청정기·비데 렌탈" → ["정수기", "공기청정기", "비데", "렌탈", "정수기렌탈"]
    parts = re.split(r'[·/\s,()（）]+', name)
    keywords = [p.strip() for p in parts if len(p.strip()) >= 2]
    # 합성 키워드 (첫 단어 + 마지막 단어)
    if len(keywords) >= 2:
        compound = keywords[0] + keywords[-1]
        if compound not in keywords:
            keywords.append(compound)
    # 원본 이름도 키워드에 포함
    clean_name = name.replace("·", "").replace("/", "").replace(" ", "")
    if clean_name not in keywords:
        keywords.append(clean_name)
    return keywords


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    # ── v2 JSON 로드 ──
    taxonomy_tree = read_json("08_taxonomy_L1_L2_L3.json")
    routing_index = {r["L3코드"]: r for r in read_json("01_L3_routing_index.json")}
    branch_table = {r["L3코드"]: r for r in read_json("09_branch_decision_table.json")}
    detail_guide = read_json("02_L3_detail_guide.json")
    sourcing_map = read_json("06_L3_sourcing_mapping.json")

    # ── L1/L2/L3 행 생성 ──
    # 08번은 [{L1대분류, L2중분류, L3목록}, ...] 플랫 구조 (L1+L2 조합별 한 행)
    rows = []
    seen_l1 = {}   # l1_name → l1_code
    seen_l2 = {}   # l2_name → l2_code
    l1_counter = 0
    l2_counter = 0

    for group in taxonomy_tree:
        l1_name = group["L1대분류"]
        l2_name = group.get("L2중분류", "")

        # L1 생성 (중복 방지)
        if l1_name not in seen_l1:
            l1_counter += 1
            l1_code = f"L1-{l1_counter:02d}"
            seen_l1[l1_name] = l1_code
            rows.append({
                "code": l1_code, "level": 1, "name": l1_name,
                "parent_code": None, "keywords": [],
            })
        l1_code = seen_l1[l1_name]

        # L2 생성 (중복 방지)
        if l2_name and l2_name not in seen_l2:
            l2_counter += 1
            l2_code = f"L2-{l1_counter:02d}{l2_counter:02d}"
            seen_l2[l2_name] = l2_code
            rows.append({
                "code": l2_code, "level": 2, "name": l2_name,
                "parent_code": l1_code, "keywords": [],
            })
        l2_code = seen_l2.get(l2_name, l1_code)

        l3_list = group.get("L3목록", [])
        for l3_item in l3_list:
                l3_code = l3_item.get("L3코드", "")
                l3_name = l3_item.get("L3소분류", "")

                # 라우팅 정보
                routing = routing_index.get(l3_code, {})
                branch = branch_table.get(l3_code, {})
                detail = detail_guide.get(l3_code)
                sourcing = sourcing_map.get(l3_code)

                # 키워드 자동 생성
                keywords = extract_keywords_from_name(l3_name)
                # L2 이름에서도 키워드 추출
                for kw in extract_keywords_from_name(l2_name):
                    if kw not in keywords:
                        keywords.append(kw)

                # pr_template_key 추정 (기존 매핑 유지 시도)
                pr_key = "_generic"
                # L3코드에서 prefix 추출: L3-080101 → L8101 형태
                m = re.match(r'L3-(\d{2})(\d{2})(\d{2})', l3_code)
                if m:
                    g1, g2, g3 = m.groups()
                    pr_key = f"L{int(g1)}{int(g2)}{int(g3):02d}"
                # 특수 코드 (M, R prefix)
                if l1_name == "생산관리":
                    pr_key = pr_key.replace("L10", "M10")
                elif l1_name == "연구개발":
                    pr_key = pr_key.replace("L11", "R")
                    # R20XX, R26XX, R27XX 등
                    if m:
                        g1, g2, g3 = m.groups()
                        pr_key = f"R{int(g2)}{int(g3):02d}"

                rows.append({
                    "code": l3_code, "level": 3, "name": l3_name,
                    "parent_code": l2_code,
                    "keywords": keywords,
                    "bt_type": routing.get("BT유형", ""),
                    "gt_code": routing.get("GT코드", ""),
                    "dept": routing.get("주관부서", "—"),
                    "branch1_path": branch.get("분기1_진입", ""),
                    "branch2_sourcing": branch.get("분기2_소싱", ""),
                    "pr_yn": branch.get("PR여부", routing.get("PR여부", "")),
                    "has_dept": bool(branch.get("주관부서있음", routing.get("주관부서있음", False))),
                    "pr_template_key": pr_key,
                    "rfp_type": "service_contract",
                    "detail_guide": detail,
                    "sourcing_guide": sourcing,
                })

    # 통계
    l1s = [r for r in rows if r["level"] == 1]
    l2s = [r for r in rows if r["level"] == 2]
    l3s = [r for r in rows if r["level"] == 3]

    print(f"taxonomy_v2 재구축 요약:")
    print(f"  L1: {len(l1s)}개")
    print(f"  L2: {len(l2s)}개")
    print(f"  L3: {len(l3s)}개")
    print(f"  합계: {len(rows)}개")

    if args.dry_run:
        print(f"\n[DRY RUN] 샘플 L3:")
        for r in l3s[:5]:
            print(f"  {r['code']} {r['name']} bt={r.get('bt_type','')} b1={r.get('branch1_path','')} kw={r['keywords'][:5]}")
        return

    sb = get_client()

    # ── 기존 taxonomy_v2 전체 삭제 ──
    print(f"\n기존 taxonomy_v2 삭제 중...")
    sb.table("taxonomy_v2").delete().neq("id", 0).execute()
    print(f"  삭제 완료.")

    # ── 새로 삽입 ──
    inserted = 0
    errors = 0
    for i, row in enumerate(rows):
        try:
            insert_data = {
                "code": row["code"],
                "level": row["level"],
                "name": row["name"],
                "parent_code": row.get("parent_code"),
                "keywords": row.get("keywords", []),
                "is_active": True,
            }
            if row["level"] == 3:
                insert_data.update({
                    "bt_type": row.get("bt_type"),
                    "gt_code": row.get("gt_code"),
                    "dept": row.get("dept"),
                    "branch1_path": row.get("branch1_path"),
                    "branch2_sourcing": row.get("branch2_sourcing"),
                    "pr_yn": row.get("pr_yn"),
                    "has_dept": row.get("has_dept", False),
                    "pr_template_key": row.get("pr_template_key", "_generic"),
                    "rfp_type": row.get("rfp_type", "service_contract"),
                    "detail_guide": row.get("detail_guide"),
                    "sourcing_guide": row.get("sourcing_guide"),
                })

            sb.table("taxonomy_v2").insert(insert_data).execute()
            inserted += 1
        except Exception as e:
            errors += 1
            if errors <= 5:
                print(f"  ERROR [{row['code']}]: {e}")

    print(f"\nDone: {inserted}/{len(rows)} 삽입 (오류 {errors}건)")


if __name__ == "__main__":
    main()

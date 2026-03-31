"""RFQ 템플릿 v2 시드 — BSM 견적서 JSON → rfq_templates (139개)

데이터 소스:
  - 15_l3_quote_mapping.json → 견적서코드, 견적서명, L1대분류, L2중분류
  - 11A_quote_buyer.json → 소싱담당자 필드 (가격/계약/부가서비스/SLA/TCO/Z1/Z2)
  - 11B_quote_supplier.json → 공급업체 필드 (Z3/Z4/체크리스트)

템플릿 구조:
  섹션0: 발주기관 정보 (rq1~rq5, 공통)
  섹션1: 가격견적 (q1~qN)
  섹션2: 계약조건 (qN+1~...)
  섹션3: 부가서비스
  섹션4: SLA·품질
  섹션5: TCO·정산
  섹션6: 공급업체 작성란 (sp1~spN, supplier_zone)

사용법:
  cd backend
  python -m scripts.seed_rfq_templates_v2
  python -m scripts.seed_rfq_templates_v2 --dry-run
"""
import sys, os, json, argparse

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from dotenv import load_dotenv
load_dotenv()

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
JSON_DIR = os.path.join(PROJECT_ROOT, "BSM_견적서_JSON_CHUNKIGN")


def _load(name):
    with open(os.path.join(JSON_DIR, name), encoding="utf-8") as f:
        return json.load(f)


# ═══════════════════════════════════════════
# 공통 헤더 필드 (모든 템플릿 동일)
# ═══════════════════════════════════════════
COMMON_FIELDS = {
    "rq1": {"label": "발주기관명", "value": "", "required": True, "description": "견적을 요청하는 기관/회사명"},
    "rq2": {"label": "담당부서", "value": "", "required": True, "description": "요청 담당부서"},
    "rq3": {"label": "담당자", "value": "", "required": True, "description": "소싱 담당자명"},
    "rq4": {"label": "연락처", "value": "", "required": True, "description": "담당자 연락처"},
    "rq5": {"label": "이메일", "value": "", "required": True, "description": "담당자 이메일"},
}
COMMON_SECTION = {
    "title": "0. 발주기관 정보",
    "fields": ["rq1", "rq2", "rq3", "rq4", "rq5"],
    "icon": "org",
    "common": True,
}


def build_buyer_fields(entry: dict) -> tuple[dict, list]:
    """11A 엔트리 → (fields dict, sections list) 변환."""
    fields = {}
    sections = []
    q_idx = 1

    # ── 섹션1: 가격견적 ──
    pricing = entry.get("가격견적", {})
    sec_fields = []

    for label in pricing.get("소싱담당자_필수기재", []):
        key = f"q{q_idx}"
        fields[key] = {"label": label, "value": "", "required": True}
        sec_fields.append(key)
        q_idx += 1

    for label in pricing.get("소싱담당자_선택기재", []):
        key = f"q{q_idx}"
        fields[key] = {"label": label, "value": "", "required": False}
        sec_fields.append(key)
        q_idx += 1

    if sec_fields:
        sections.append({
            "title": "1. 가격견적",
            "fields": sec_fields,
            "icon": "money",
        })

    # ── 섹션2: 계약조건 ──
    contract = entry.get("계약조건", [])
    sec_fields = []
    for item in contract:
        key = f"q{q_idx}"
        is_req = item.get("필수선택", "") == "필수"
        desc = item.get("발주사요건", "")
        penalty = item.get("패널티", "")
        if penalty:
            desc = f"{desc} [패널티: {penalty}]"
        fields[key] = {
            "label": item.get("항목", f"계약조건 {q_idx}"),
            "value": "",
            "required": is_req,
            "description": desc[:120],
        }
        sec_fields.append(key)
        q_idx += 1

    if sec_fields:
        sections.append({
            "title": "2. 계약조건",
            "fields": sec_fields,
            "icon": "doc",
        })

    # ── 섹션3: 부가서비스 ──
    services = entry.get("부가서비스", [])
    sec_fields = []
    for item in services:
        key = f"q{q_idx}"
        is_req = item.get("필수선택", "") == "필수"
        desc = item.get("발주사요구기능", "")
        kpi = item.get("KPI목표", "")
        if kpi:
            desc = f"{desc} [KPI: {kpi}]"
        fields[key] = {
            "label": item.get("서비스항목", f"서비스 {q_idx}"),
            "value": "",
            "required": is_req,
            "description": desc[:120],
        }
        sec_fields.append(key)
        q_idx += 1

    if sec_fields:
        sections.append({
            "title": "3. 부가서비스",
            "fields": sec_fields,
            "icon": "gear",
        })

    # ── 섹션4: SLA·품질 ──
    sla = entry.get("SLA품질", [])
    sec_fields = []
    for item in sla:
        key = f"q{q_idx}"
        desc = item.get("발주사최소요건", "")
        penalty = item.get("패널티조건", "")
        rate = item.get("감액률", "")
        if penalty:
            desc = f"{desc} [패널티: {penalty}, 감액: {rate}]"
        fields[key] = {
            "label": item.get("SLA항목", f"SLA {q_idx}"),
            "value": "",
            "required": True,
            "description": desc[:120],
        }
        sec_fields.append(key)
        q_idx += 1

    if sec_fields:
        sections.append({
            "title": "4. SLA·품질",
            "fields": sec_fields,
            "icon": "chart",
        })

    # ── 섹션5: TCO·정산 ──
    tco = entry.get("TCO정산", [])
    sec_fields = []
    for item in tco:
        key = f"q{q_idx}"
        is_req = item.get("필수선택", "") == "필수"
        desc = item.get("산출기준", "")
        fields[key] = {
            "label": item.get("비용항목", f"TCO {q_idx}"),
            "value": "",
            "required": is_req,
            "description": desc[:120],
        }
        sec_fields.append(key)
        q_idx += 1

    if sec_fields:
        sections.append({
            "title": "5. TCO·정산",
            "fields": sec_fields,
            "icon": "calc",
        })

    # ── 특수시트 (있는 경우 섹션 추가) ──
    special = entry.get("특수시트", {})
    if special:
        for sheet_name, items in special.items():
            sec_fields = []
            if isinstance(items, list):
                for item in items:
                    key = f"q{q_idx}"
                    if isinstance(item, dict):
                        label = item.get("항목", item.get("서비스항목", str(item)[:40]))
                        desc = item.get("발주사요건", item.get("발주사요구기능", ""))
                        is_req = item.get("필수선택", "") == "필수"
                    else:
                        label = str(item)[:60]
                        desc = ""
                        is_req = False
                    fields[key] = {"label": label, "value": "", "required": is_req, "description": desc[:120]}
                    sec_fields.append(key)
                    q_idx += 1
            if sec_fields:
                # 이모지 제거한 시트명
                clean_name = sheet_name.lstrip("💰📋🔧📊💹📖👔🏭📦🧺⚖️ ")
                sections.append({
                    "title": f"※ {clean_name}",
                    "fields": sec_fields,
                    "icon": "gear",
                })

    return fields, sections


def build_supplier_fields(entry: dict, start_idx: int = 1) -> tuple[dict, dict]:
    """11B 엔트리 → (supplier_fields dict, supplier_section dict) 변환."""
    fields = {}
    sp_idx = start_idx
    sec_fields = []

    # Z3 공급사필수
    for item in entry.get("Z3_공급사필수", []):
        key = f"sp{sp_idx}"
        label = str(item)[:80] if isinstance(item, str) else str(item)[:80]
        fields[key] = {"label": label, "value": "", "required": False, "zone": "supplier"}
        sec_fields.append(key)
        sp_idx += 1

    # Z4 공급사선택
    for item in entry.get("Z4_공급사선택", []):
        key = f"sp{sp_idx}"
        label = str(item)[:80] if isinstance(item, str) else str(item)[:80]
        fields[key] = {"label": label, "value": "", "required": False, "zone": "supplier"}
        sec_fields.append(key)
        sp_idx += 1

    section = {
        "title": "6. 공급업체 작성란",
        "fields": sec_fields,
        "icon": "supplier",
        "supplier_zone": True,
        "notice": "이 영역은 공급업체가 작성하는 란입니다. 소싱담당자는 입력하지 않아도 됩니다.",
    }

    checklist = entry.get("공급사체크리스트", [])

    return fields, section, checklist


def build_template(code: str, meta: dict, buyer_entry: dict, supplier_entry: dict) -> dict:
    """하나의 RFQ 템플릿 빌드."""
    # 공통 헤더
    all_fields = dict(COMMON_FIELDS)

    # 소싱담당자 필드
    buyer_fields, buyer_sections = build_buyer_fields(buyer_entry)
    all_fields.update(buyer_fields)

    # 공급업체 필드
    sp_fields, sp_section, checklist = build_supplier_fields(supplier_entry)
    all_fields.update(sp_fields)

    # 전체 섹션: 공통 + 소싱 + 공급업체
    all_sections = [COMMON_SECTION] + buyer_sections
    if sp_section["fields"]:  # 공급업체 필드가 있을 때만
        all_sections.append(sp_section)

    total = len(all_fields)
    required = sum(1 for f in all_fields.values() if f.get("required"))

    return {
        "type_key": code,
        "name": meta.get("견적서명", code),
        "description": f"{meta.get('견적서명', code)} 견적서 ({total}개 항목, 필수 {required}개)",
        "category_group": meta.get("L1대분류", "기타"),
        "category_l2": meta.get("L2중분류", ""),
        "fields": all_fields,
        "sections": all_sections,
        "supplier_checklist": checklist,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    print(f"Loading JSON from: {JSON_DIR}")

    mapping_data = _load("15_l3_quote_mapping.json")
    buyer_data = _load("11A_quote_buyer.json")
    supplier_data = _load("11B_quote_supplier.json")

    # 매핑 → code: meta
    code_meta = {}
    for m in mapping_data:
        code = m.get("견적서코드")
        if code:
            code_meta[code] = m

    # 템플릿 빌드
    templates = []
    skipped = []
    for code in sorted(code_meta.keys()):
        if code not in buyer_data:
            skipped.append(code)
            continue
        meta = code_meta[code]
        buyer = buyer_data[code]
        supplier = supplier_data.get(code, {})
        tmpl = build_template(code, meta, buyer, supplier)
        templates.append(tmpl)

    # 통계
    from collections import Counter
    cat_counts = Counter(t["category_group"] for t in templates)
    total_fields = sum(len(t["fields"]) for t in templates)
    total_required = sum(sum(1 for f in t["fields"].values() if f.get("required")) for t in templates)

    print(f"\nTemplate summary:")
    print(f"  Total templates: {len(templates)}")
    print(f"  Total fields: {total_fields} (required: {total_required})")
    print(f"  Skipped: {len(skipped)} ({skipped})")
    print(f"\n  Categories:")
    for cat, cnt in sorted(cat_counts.items()):
        print(f"    {cat}: {cnt}개")

    # 샘플
    if templates:
        s = templates[0]
        print(f"\n  Sample [{s['type_key']}] {s['name']}:")
        print(f"    Fields: {len(s['fields'])}, Sections: {len(s['sections'])}")
        for sec in s["sections"]:
            sz = "supplier" if sec.get("supplier_zone") else ""
            print(f"      {sec['title']}: {len(sec['fields'])}개 {sz}")

    if args.dry_run:
        print(f"\n[DRY RUN] {len(templates)} templates would be inserted.")
        return

    # DB 삽입
    from app.db.supabase_client import get_client
    sb = get_client()

    # 기존 삭제
    try:
        sb.table("rfq_templates").delete().neq("type_key", "__keep__").execute()
        print(f"\nExisting rfq_templates deleted.")
    except Exception as e:
        print(f"  Delete warning: {e}")

    inserted = 0
    for t in templates:
        try:
            sb.table("rfq_templates").insert({
                "type_key": t["type_key"],
                "name": t["name"],
                "description": t["description"],
                "category_group": t["category_group"],
                "fields": t["fields"],
                "sections": t["sections"],
                "is_active": True,
            }).execute()
            inserted += 1
        except Exception as e:
            print(f"  ERROR {t['type_key']}: {e}")

    print(f"\nDone: {inserted}/{len(templates)} templates inserted.")


if __name__ == "__main__":
    main()

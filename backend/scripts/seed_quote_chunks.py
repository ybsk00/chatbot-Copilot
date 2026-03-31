"""BSM 견적서 JSON → knowledge_chunks 시드

BSM_견적서_JSON_CHUNKIGN 폴더의 4개 JSON 파일을 청킹하여
knowledge_chunks 테이블에 임베딩과 함께 삽입한다.

청크 구성 (~705개):
  - 10_quote_index.json   → ~136 인덱스 청크
  - 11A_quote_buyer.json  → ~278 소싱담당자 요건 청크 (L3당 2개)
  - 11B_quote_supplier.json → ~139 공급사 응답 템플릿 청크
  - 15_l3_quote_mapping.json → ~152 L3→견적서 매핑 청크

사용법:
  cd backend
  python -m scripts.seed_quote_chunks
  python -m scripts.seed_quote_chunks --dry-run
"""
import sys, os, json, time, argparse

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from dotenv import load_dotenv
load_dotenv()

from app.db.supabase_client import get_client
from app.rag.embedder import embed_document

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
JSON_DIR = os.path.join(PROJECT_ROOT, "BSM_견적서_JSON_CHUNKIGN")

CAT_INDEX = "quote_index"
CAT_BUYER = "quote_buyer"
CAT_SUPPLIER = "quote_supplier"
CAT_MAPPING = "quote_mapping"

# 에러 엔트리 스킵 (10_quote_index에서 error 키 있는 코드)
SKIP_CODES_INDEX = set()  # 동적으로 채워짐


def _load_json(filename: str):
    path = os.path.join(JSON_DIR, filename)
    with open(path, encoding="utf-8") as f:
        return json.load(f)


# ═══════════════════════════════════════════
# 10_quote_index → 인덱스 청크
# ═══════════════════════════════════════════

def build_index_chunks(data: dict) -> list[dict]:
    """10_quote_index.json → L3코드별 1청크"""
    chunks = []
    for code, entry in data.items():
        if "error" in entry:
            SKIP_CODES_INDEX.add(code)
            print(f"  [SKIP] {code}: {entry['error']}")
            continue

        sheets = ", ".join(entry.get("시트목록", []))
        special = "Y" if entry.get("특수시트_직급별단가") else "N"
        title = entry.get("가격견적_제목", "")

        lines = [
            f"[{code} 견적서 인덱스]",
            f"시트목록: {sheets}",
            f"시트수: {entry.get('시트수', '')}",
            f"직급별단가: {special}",
        ]
        if title:
            lines.append(f"가격견적 제목: {title}")

        chunks.append({
            "content": "\n".join(lines),
            "category": CAT_INDEX,
            "doc_name": f"QUOTE_IDX_{code}",
            "metadata": {"source": "quote_index", "quote_code": code},
        })
    return chunks


# ═══════════════════════════════════════════
# 11A_quote_buyer → 소싱담당자 요건 (L3당 2청크)
# ═══════════════════════════════════════════

def _fmt_contract(items: list, max_items: int = 12) -> str:
    """계약조건 배열 → 텍스트"""
    lines = []
    for item in items[:max_items]:
        cat = item.get("분류", "")
        name = item.get("항목", "")
        req = item.get("발주사요건", "")
        must = item.get("필수선택", "")
        impact = item.get("단가영향", "")
        penalty = item.get("패널티", "")
        lines.append(f"- {cat} > {name}: {req} [{must}/{impact}] → {penalty}")
    if len(items) > max_items:
        lines.append(f"  ... 외 {len(items) - max_items}건")
    return "\n".join(lines)


def _fmt_services(items: list, max_items: int = 10) -> str:
    """부가서비스 배열 → 텍스트"""
    lines = []
    for item in items[:max_items]:
        cat = item.get("서비스구분", "")
        name = item.get("서비스항목", "")
        func = item.get("발주사요구기능", "")[:60]
        must = item.get("필수선택", "")
        kpi = item.get("KPI목표", "")
        lines.append(f"- {cat} > {name}: {func} [{must}] KPI:{kpi}")
    if len(items) > max_items:
        lines.append(f"  ... 외 {len(items) - max_items}건")
    return "\n".join(lines)


def _fmt_sla(items: list, max_items: int = 8) -> str:
    """SLA품질 배열 → 텍스트"""
    lines = []
    for item in items[:max_items]:
        name = item.get("SLA항목", "")
        req = item.get("발주사최소요건", "")
        method = item.get("측정방법", "")
        cycle = item.get("측정주기", "")
        penalty = item.get("패널티조건", "")
        rate = item.get("감액률", "")
        lines.append(f"- {name}: {req} (측정:{method}/{cycle}) 패널티:{penalty} 감액:{rate}")
    return "\n".join(lines)


def _fmt_tco(items: list, max_items: int = 8) -> str:
    """TCO정산 배열 → 텍스트"""
    lines = []
    for item in items[:max_items]:
        name = item.get("비용항목", "")
        basis = item.get("산출기준", "")
        must = item.get("필수선택", "")
        desc = item.get("설명", "")[:60]
        lines.append(f"- {name}: {basis} [{must}] {desc}")
    return "\n".join(lines)


def _fmt_zone(items: list) -> str:
    """Z1/Z2 소싱 요약 → 텍스트"""
    if not items:
        return "(없음)"
    return " | ".join(str(i)[:80] for i in items)


def build_buyer_chunks(data: dict) -> list[dict]:
    """11A_quote_buyer.json → L3코드별 2청크 (pricing + sla)"""
    chunks = []
    for code, entry in data.items():
        if code in SKIP_CODES_INDEX:
            continue

        # ── Chunk A: 가격견적 + 계약조건 ──
        pricing = entry.get("가격견적", {})
        sheet_name = pricing.get("시트명", "")
        item_count = pricing.get("품목수", 0)
        required = ", ".join(pricing.get("소싱담당자_필수기재", []))
        optional_list = pricing.get("소싱담당자_선택기재", [])
        optional = ", ".join(optional_list[:8])
        if len(optional_list) > 8:
            optional += f" 외 {len(optional_list) - 8}건"

        lines_a = [
            f"[{code} 소싱담당자 요건 (가격/계약)]",
            f"시트: {sheet_name} | 품목수: {item_count}",
            f"필수기재: {required}",
            f"선택기재: {optional}",
        ]

        # 계약조건
        contract = entry.get("계약조건", [])
        if contract:
            lines_a.append("")
            lines_a.append("[계약조건]")
            lines_a.append(_fmt_contract(contract))

        # 특수시트 (일부 엔트리만)
        special = entry.get("특수시트", {})
        if special:
            lines_a.append("")
            lines_a.append("[특수시트]")
            for sheet, items in special.items():
                if isinstance(items, list):
                    lines_a.append(f"- {sheet}: {len(items)}개 항목")
                elif isinstance(items, dict):
                    lines_a.append(f"- {sheet}: {list(items.keys())[:3]}")

        # 직급별단가표
        salary = entry.get("직급별단가표", None)
        if salary:
            if isinstance(salary, list):
                lines_a.append(f"\n[직급별단가표] {len(salary)}개 등급")
            elif isinstance(salary, dict):
                lines_a.append(f"\n[직급별단가표] {list(salary.keys())[:5]}")

        chunks.append({
            "content": "\n".join(lines_a),
            "category": CAT_BUYER,
            "doc_name": f"QUOTE_BUYER_{code}_pricing",
            "metadata": {"source": "quote_buyer", "quote_code": code, "chunk_part": "pricing"},
        })

        # ── Chunk B: 부가서비스 + SLA + TCO + Z1/Z2 ──
        lines_b = [f"[{code} 소싱담당자 요건 (서비스/SLA/TCO)]"]

        services = entry.get("부가서비스", [])
        if services:
            lines_b.append("[부가서비스]")
            lines_b.append(_fmt_services(services))
            lines_b.append("")

        sla = entry.get("SLA품질", [])
        if sla:
            lines_b.append("[SLA품질]")
            lines_b.append(_fmt_sla(sla))
            lines_b.append("")

        tco = entry.get("TCO정산", [])
        if tco:
            lines_b.append("[TCO정산]")
            lines_b.append(_fmt_tco(tco))
            lines_b.append("")

        z1 = entry.get("Z1_소싱필수", [])
        z2 = entry.get("Z2_소싱선택", [])
        lines_b.append(f"[Z1_소싱필수] {_fmt_zone(z1)}")
        lines_b.append(f"[Z2_소싱선택] {_fmt_zone(z2)}")

        chunks.append({
            "content": "\n".join(lines_b),
            "category": CAT_BUYER,
            "doc_name": f"QUOTE_BUYER_{code}_sla",
            "metadata": {"source": "quote_buyer", "quote_code": code, "chunk_part": "sla"},
        })

    return chunks


# ═══════════════════════════════════════════
# 11B_quote_supplier → 공급사 응답 템플릿
# ═══════════════════════════════════════════

def build_supplier_chunks(data: dict) -> list[dict]:
    """11B_quote_supplier.json → L3코드별 1청크"""
    chunks = []
    for code, entry in data.items():
        if code in SKIP_CODES_INDEX:
            continue

        lines = [f"[{code} 공급사 응답 템플릿]"]

        # 가격견적 기재항목 (품목별 필드 이름만 요약)
        pricing = entry.get("가격견적_공급사기재항목", {})
        if pricing:
            items = pricing.get("품목별_기재항목", [])
            if items:
                first = items[0]
                field_names = [k for k in first.keys() if k not in ("No.", "no")]
                lines.append(f"[가격견적] 시트:{pricing.get('시트명','')} | 품목수:{len(items)}")
                lines.append(f"기재필드: {', '.join(field_names[:8])}")

        # 계약조건 공급사제안
        contract = entry.get("계약조건_공급사제안", [])
        if contract:
            lines.append(f"\n[계약조건 공급사기재] {len(contract)}항목")
            for item in contract[:8]:
                name = item.get("항목", "")
                ref = item.get("발주사요건_참조", "")[:40]
                lines.append(f"- {name}: 발주사={ref} / 공급사 제안=미기재")
            if len(contract) > 8:
                lines.append(f"  ... 외 {len(contract) - 8}건")

        # SLA 공급사기재
        sla = entry.get("SLA_공급사기재", [])
        if sla:
            lines.append(f"\n[SLA 공급사기재] {len(sla)}항목")
            for item in sla[:6]:
                name = item.get("SLA항목", "")
                ref = item.get("발주사최소요건_참조", "")[:40]
                lines.append(f"- {name}: 기준={ref} / 현재수준·목표수준=미기재")
            if len(sla) > 6:
                lines.append(f"  ... 외 {len(sla) - 6}건")

        # Z3/Z4 요약
        z3 = entry.get("Z3_공급사필수", [])
        z4 = entry.get("Z4_공급사선택", [])
        if z3:
            lines.append(f"\n[Z3_공급사필수] {_fmt_zone(z3)}")
        if z4:
            lines.append(f"[Z4_공급사선택] {_fmt_zone(z4)}")

        # 체크리스트
        checklist = entry.get("공급사체크리스트", [])
        if checklist:
            lines.append(f"\n[공급사체크리스트] {len(checklist)}항목")
            for item in checklist[:6]:
                no = item.get("no", "")
                name = item.get("항목", "")
                cat = item.get("구분", "")
                lines.append(f"- {no}. {name} [{cat}]")
            if len(checklist) > 6:
                lines.append(f"  ... 외 {len(checklist) - 6}건")

        chunks.append({
            "content": "\n".join(lines),
            "category": CAT_SUPPLIER,
            "doc_name": f"QUOTE_SUPPLIER_{code}",
            "metadata": {"source": "quote_supplier", "quote_code": code},
        })

    return chunks


# ═══════════════════════════════════════════
# 15_l3_quote_mapping → L3↔견적서 매핑
# ═══════════════════════════════════════════

def build_mapping_chunks(data: list) -> list[dict]:
    """15_l3_quote_mapping.json → L3코드별 1청크"""
    chunks = []
    for entry in data:
        l3_code = entry.get("L3코드", "")
        quote_code = entry.get("견적서코드", "")
        if not l3_code or not quote_code:
            continue

        lines = [
            f"[{l3_code} → {quote_code} 견적서 매핑]",
            f"L1대분류: {entry.get('L1대분류', '')}",
            f"L2중분류: {entry.get('L2중분류', '')}",
            f"L3소분류: {entry.get('L3소분류', '')}",
            f"BT유형: {entry.get('BT유형', '')}",
            f"견적서코드: {quote_code}",
            f"견적서명: {entry.get('견적서명', '')}",
        ]
        chunks.append({
            "content": "\n".join(lines),
            "category": CAT_MAPPING,
            "doc_name": f"QUOTE_MAP_{l3_code}",
            "metadata": {
                "source": "quote_mapping",
                "l3_code": l3_code,
                "quote_code": quote_code,
                "bt_type": entry.get("BT유형", ""),
            },
        })

    return chunks


# ═══════════════════════════════════════════
# main
# ═══════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    print(f"Loading JSON from: {JSON_DIR}")

    idx_data = _load_json("10_quote_index.json")
    buyer_data = _load_json("11A_quote_buyer.json")
    supplier_data = _load_json("11B_quote_supplier.json")
    mapping_data = _load_json("15_l3_quote_mapping.json")

    # 인덱스 먼저 (에러 코드 수집)
    idx_chunks = build_index_chunks(idx_data)
    buyer_chunks = build_buyer_chunks(buyer_data)
    supplier_chunks = build_supplier_chunks(supplier_data)
    mapping_chunks = build_mapping_chunks(mapping_data)

    all_chunks = idx_chunks + buyer_chunks + supplier_chunks + mapping_chunks

    print(f"\nChunk summary:")
    print(f"  Quote index:    {len(idx_chunks)}")
    print(f"  Buyer (2/L3):   {len(buyer_chunks)}")
    print(f"  Supplier:       {len(supplier_chunks)}")
    print(f"  L3 mapping:     {len(mapping_chunks)}")
    print(f"  Total:          {len(all_chunks)}")
    if SKIP_CODES_INDEX:
        print(f"  Skipped codes:  {SKIP_CODES_INDEX}")

    if args.dry_run:
        print(f"\n[DRY RUN] {len(all_chunks)} chunks would be inserted.")
        # 샘플 출력
        for cat, prefix in [("index", "QUOTE_IDX_"), ("buyer_pricing", "QUOTE_BUYER_"),
                            ("supplier", "QUOTE_SUPPLIER_"), ("mapping", "QUOTE_MAP_")]:
            sample = next((c for c in all_chunks if c["doc_name"].startswith(prefix)), None)
            if sample:
                print(f"\n--- Sample [{cat}] {sample['doc_name']} ---")
                safe = sample["content"][:500].encode("ascii", "replace").decode("ascii")
                print(safe)
        return

    sb = get_client()

    # 기존 견적서 청크 삭제
    prefixes = ["QUOTE_IDX_", "QUOTE_BUYER_", "QUOTE_SUPPLIER_", "QUOTE_MAP_"]
    for prefix in prefixes:
        try:
            sb.table("knowledge_chunks").delete().like("doc_name", f"{prefix}%").execute()
        except Exception as e:
            print(f"  Warning: delete {prefix}* failed: {e}")
    print(f"\nExisting quote chunks deleted.")

    inserted = 0
    for i, chunk in enumerate(all_chunks):
        try:
            embedding = embed_document(chunk["content"])
            sb.table("knowledge_chunks").insert({
                "content": chunk["content"],
                "embedding": embedding,
                "category": chunk["category"],
                "doc_name": chunk["doc_name"],
                "metadata": chunk["metadata"],
                "chunk_index": 0,
                "sub_cat": chunk["metadata"].get("source", ""),
            }).execute()
            inserted += 1
            if (i + 1) % 30 == 0:
                print(f"  [{i+1}/{len(all_chunks)}] inserted...")
                time.sleep(0.5)
        except Exception as e:
            print(f"  ERROR {chunk['doc_name']}: {e}")

    print(f"\nDone: {inserted}/{len(all_chunks)} chunks inserted.")


if __name__ == "__main__":
    main()

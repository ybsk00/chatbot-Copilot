"""BT/GT 라우팅 데이터 v2 → knowledge_chunks 시드

v2 JSON에서 BT 정의(11), GT 정의(35), BT 프로세스(11), L3 상세(152),
분기 테이블(152), 소싱 매핑(152) 청크를 생성하여 삽입.

사용법:
  cd backend
  python -m scripts.seed_bt_gt_chunks
  python -m scripts.seed_bt_gt_chunks --dry-run
"""
import sys, os, time, argparse
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from dotenv import load_dotenv
load_dotenv()

from app.db.supabase_client import get_client
from app.rag.embedder import embed_document
from app.data.routing_data import RoutingDataStore, get_routing_store

CAT_ROUTING = "bt_gt_routing"


def build_bt_chunks(store) -> list[dict]:
    """03_BT_definition → 11개 청크"""
    chunks = []
    for bt_code, bt_def in store.bt_defs.items():
        lines = [
            f"[{bt_code} {bt_def.get('유형명', '')}]",
            f"PR 필요: {bt_def.get('PR필요', '')}",
            f"주관부서: {bt_def.get('주관부서', '')}",
            f"카탈로그: {bt_def.get('카탈로그', '')}",
            f"적용기준: {bt_def.get('적용기준', '')}",
            f"핵심프로세스: {bt_def.get('핵심프로세스', '')}",
            f"주요차단규정: {bt_def.get('주요차단규정', '')}",
        ]
        chunks.append({
            "content": "\n".join(lines),
            "category": CAT_ROUTING,
            "doc_name": f"BT_{bt_code}",
            "metadata": {"source": "bt_definition", "bt_code": bt_code},
        })
    return chunks


def build_gt_chunks(store) -> list[dict]:
    """05_GT_definition → 35개 청크"""
    chunks = []
    for gt_code, gt_def in store.gt_defs.items():
        lines = [
            f"[{gt_code} {gt_def.get('GT한글명', '')}]",
            f"그룹: {gt_def.get('그룹', '')}",
            f"자동화: {gt_def.get('자동화수준', '')}",
            f"소싱전략: {gt_def.get('소싱전략상세', '')}",
            f"소싱승인: {gt_def.get('소싱승인구조', '')}",
            f"필수서류: {gt_def.get('필수서류', '')}",
            f"PR: {gt_def.get('PR필요', '')} / RFQ: {gt_def.get('RFQ필요', '')} / 입찰: {gt_def.get('입찰필요', '')}",
            f"Control: {gt_def.get('Control_Profile', '')}",
            f"Procurement: {gt_def.get('Procurement_Method', '')}",
        ]
        chunks.append({
            "content": "\n".join(lines),
            "category": CAT_ROUTING,
            "doc_name": f"GT_{gt_code}",
            "metadata": {"source": "gt_definition", "gt_code": gt_code},
        })
    return chunks


def build_bt_process_chunks(store) -> list[dict]:
    """04_BT_process_P0_P10 → 11개 청크"""
    chunks = []
    for bt_code, bt_proc in store.bt_process.items():
        steps = bt_proc.get("프로세스", bt_proc)
        lines = [f"[{bt_code} {bt_proc.get('유형명', '')} 프로세스]"]
        for key in sorted(steps.keys()):
            if key.startswith("P"):
                val = str(steps[key]).replace("\n", " | ")
                lines.append(f"{key}: {val}")
        chunks.append({
            "content": "\n".join(lines),
            "category": CAT_ROUTING,
            "doc_name": f"BT_Process_{bt_code}",
            "metadata": {"source": "bt_process", "bt_code": bt_code},
        })
    return chunks


def build_detail_chunks(store) -> list[dict]:
    """02_L3_detail_guide → 152개 청크 (사용자 안내 + 금지행위 + 진입방법)"""
    chunks = []
    for l3_code, detail in store.l3_detail.items():
        entry = store.get_routing(l3_code)
        if not entry:
            continue
        lines = [
            f"[{l3_code} {entry.l3_name} | {entry.bt_type} | {entry.gt_code}]",
            f"분류: {entry.l1} > {entry.l2}",
            f"주관부서: {entry.dept}",
            "",
            detail.get("사용자안내", ""),
            "",
            f"[진입방법] {detail.get('진입방법', '')}",
            f"[금지행위] {detail.get('금지행위', '')}",
            f"[위반코드] {detail.get('위반코드', '')}",
            f"[SLA] {detail.get('Confirm_SLA', '')}",
        ]
        chunks.append({
            "content": "\n".join(lines),
            "category": entry.l1,
            "doc_name": f"BSM_Detail_{l3_code}",
            "metadata": {
                "source": "l3_detail",
                "l3_code": l3_code,
                "bt_type": entry.bt_type,
                "gt_code": entry.gt_code,
                "branch1": store.get_branch1_path(l3_code),
                "branch2": store.get_branch2_sourcing(l3_code),
            },
        })
    return chunks


def build_branch_chunks(store) -> list[dict]:
    """09_branch_decision_table → 152개 청크"""
    chunks = []
    for l3_code, row in store.branch_table.items():
        entry = store.get_routing(l3_code)
        lines = [
            f"[{l3_code} {row.get('L3소분류', '')} 구매 분기]",
            f"BT: {row.get('BT유형', '')} / GT: {row.get('GT코드', '')}",
            f"PR여부: {row.get('PR여부', '')}",
            f"주관부서: {'있음' if row.get('주관부서있음') else '없음'}",
            f"분기1 진입경로: {row.get('분기1_진입', '')}",
            f"분기2 소싱방식: {row.get('분기2_소싱', '')}",
            f"RFQ필요: {row.get('RFQ필요', '')} / 입찰필요: {row.get('입찰필요', '')}",
        ]
        chunks.append({
            "content": "\n".join(lines),
            "category": entry.l1 if entry else CAT_ROUTING,
            "doc_name": f"BSM_Branch_{l3_code}",
            "metadata": {
                "source": "branch_decision",
                "l3_code": l3_code,
                "branch1": row.get("분기1_진입", ""),
                "branch2": row.get("분기2_소싱", ""),
            },
        })
    return chunks


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    # 싱글톤 리셋 (v2 JSON 로드 보장)
    RoutingDataStore._instance = None
    store = get_routing_store()

    all_chunks = []
    bt = build_bt_chunks(store)
    gt = build_gt_chunks(store)
    bt_proc = build_bt_process_chunks(store)
    detail = build_detail_chunks(store)
    branch = build_branch_chunks(store)

    all_chunks.extend(bt)
    all_chunks.extend(gt)
    all_chunks.extend(bt_proc)
    all_chunks.extend(detail)
    all_chunks.extend(branch)

    print(f"\nChunk summary (v2):")
    print(f"  BT definitions:  {len(bt)}")
    print(f"  GT definitions:  {len(gt)}")
    print(f"  BT processes:    {len(bt_proc)}")
    print(f"  L3 details:      {len(detail)}")
    print(f"  Branch decisions: {len(branch)}")
    print(f"  Total:           {len(all_chunks)}")

    if args.dry_run:
        print(f"\n[DRY RUN] {len(all_chunks)} chunks would be inserted.")
        return

    sb = get_client()

    # 기존 BT/GT/BSM 청크 삭제
    for prefix in ["BT_BT-", "BT_Process_", "GT_G", "BSM_Detail_L3-", "BSM_Process_L3-", "BSM_Branch_L3-", "VIOL_VIOL-"]:
        try:
            sb.table("knowledge_chunks").delete().like("doc_name", f"{prefix}%").execute()
        except Exception as e:
            print(f"  Warning: delete {prefix}* failed: {e}")
    print(f"\nExisting BT/GT chunks deleted.")

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

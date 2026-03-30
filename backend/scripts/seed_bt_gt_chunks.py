"""BT/GT 라우팅 데이터 → knowledge_chunks 시드

9개 JSON 파일에서 BT 정의(11), GT 정의(35), L3 프로세스 요약(152),
위반코드(28) 총 ~226개 청크를 생성하여 knowledge_chunks에 삽입한다.

사용법:
  cd backend
  python -m scripts.seed_bt_gt_chunks
  python -m scripts.seed_bt_gt_chunks --dry-run   (DB 저장 없이 미리보기)
"""
import sys, os, time, argparse
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from dotenv import load_dotenv
load_dotenv()

from app.db.supabase_client import get_client
from app.rag.embedder import embed_document
from app.data.routing_data import get_routing_store

# ── 카테고리 태그 ──
CAT_ROUTING = "bt_gt_routing"


def build_bt_chunks(store) -> list[dict]:
    """04_BT_definition → 11개 청크"""
    chunks = []
    for bt_code, bt_def in store.bt_defs.items():
        lines = [
            f"[{bt_code} {bt_def.get('유형명', '')}]",
            bt_def.get("핵심정의", ""),
            "",
            f"사용자 권한: {bt_def.get('사용자_BSM권한', '')}",
            f"주관부서 역할: {bt_def.get('주관부서_역할', '')}",
            f"적용 GT: {bt_def.get('주요적용GT', '')} ({bt_def.get('GT한글명', '')})",
            f"소싱전략: {bt_def.get('소싱전략핵심', '')}",
            f"자동화: {bt_def.get('자동화수준', '')} / Control: {bt_def.get('Control_Profile', '')}",
            f"승인: {bt_def.get('승인레벨', '')}",
            f"SLA: {bt_def.get('Confirm_SLA', '')}",
            f"주요 위반: {bt_def.get('주요위반코드_매핑', '')}",
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
            f"영문: {gt_def.get('GT영문명', '')}",
            f"그룹: {gt_def.get('그룹', '')} / Tier: {gt_def.get('Tier', '')}",
            "",
            f"PR 필요: {gt_def.get('PR필요', '')}",
            f"RFQ 필요: {gt_def.get('RFQ필요', '')}",
            f"입찰 필요: {gt_def.get('입찰필요', '')}",
            f"계약 필요: {gt_def.get('계약필요', '')}",
            f"경쟁 절차: {gt_def.get('경쟁절차', '')}",
            f"승인 레벨: {gt_def.get('승인레벨', '')}",
            f"자동화: {gt_def.get('자동화수준', '')}",
            f"Procurement Method: {gt_def.get('Procurement_Method', '')}",
            f"Control Profile: {gt_def.get('Control_Profile', '')}",
            f"Runtime Stage: {gt_def.get('Runtime_Stage', '')}",
            f"금액 기준: {gt_def.get('금액기준', '')}",
            f"핸드오프 산출물: {gt_def.get('핸드오프산출물', '')}",
        ]
        chunks.append({
            "content": "\n".join(lines),
            "category": CAT_ROUTING,
            "doc_name": f"GT_{gt_code}",
            "metadata": {"source": "gt_definition", "gt_code": gt_code},
        })
    return chunks


def build_process_chunks(store) -> list[dict]:
    """02_L3_process P0~P10 → 152개 요약 청크"""
    chunks = []
    for l3_code, proc_data in store.l3_process.items():
        entry = store.get_routing(l3_code)
        if not entry:
            continue

        steps = proc_data.get("프로세스단계", proc_data)
        lines = [
            f"[{l3_code} {entry.l3_name} 구매 프로세스]",
            f"분류: {entry.l1} > {entry.l2}",
            f"BT: {entry.bt_type} / GT: {entry.gt_code} / 주관부서: {entry.dept}",
            "",
        ]
        for key in sorted(steps.keys()):
            val = steps[key]
            # 줄바꿈을 공백으로 정리 (청크 크기 절약)
            val_clean = val.replace("\n", " | ") if isinstance(val, str) else str(val)
            lines.append(f"{key}: {val_clean}")

        chunks.append({
            "content": "\n".join(lines),
            "category": entry.l1,  # L1 대분류명으로 태그 (기존 청크와 동일 구조)
            "doc_name": f"BSM_Process_{l3_code}",
            "metadata": {
                "source": "l3_process",
                "l3_code": l3_code,
                "bt_type": entry.bt_type,
                "gt_code": entry.gt_code,
            },
        })
    return chunks


def build_violation_chunks(store) -> list[dict]:
    """06_violation_codes → 28개 청크"""
    chunks = []
    for viol_code, viol_def in store.violations.items():
        lines = [
            f"[{viol_code} {viol_def.get('위반유형설명', '')}]",
            f"적용 BT: {viol_def.get('BT적용', '')}",
            f"트리거: {viol_def.get('트리거조건', '')}",
            f"자동 제재: {viol_def.get('자동제재조치', '')}",
            f"수동 후속: {viol_def.get('수동후속조치', '')}",
            f"경중도: {viol_def.get('경중도', '')}",
            f"적용 원칙: {viol_def.get('적용원칙', '')}",
            f"재발 시: {viol_def.get('재발시조치', '')}",
            f"BSM 차단: {viol_def.get('BSM차단방식', '')}",
        ]
        chunks.append({
            "content": "\n".join(lines),
            "category": CAT_ROUTING,
            "doc_name": f"VIOL_{viol_code}",
            "metadata": {"source": "violation_code", "viol_code": viol_code},
        })
    return chunks


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="DB 저장 없이 미리보기")
    args = parser.parse_args()

    print("Loading routing data store...")
    store = get_routing_store()

    all_chunks = []
    bt_chunks = build_bt_chunks(store)
    gt_chunks = build_gt_chunks(store)
    proc_chunks = build_process_chunks(store)
    viol_chunks = build_violation_chunks(store)

    all_chunks.extend(bt_chunks)
    all_chunks.extend(gt_chunks)
    all_chunks.extend(proc_chunks)
    all_chunks.extend(viol_chunks)

    print(f"\nChunk summary:")
    print(f"  BT definitions:  {len(bt_chunks)}")
    print(f"  GT definitions:  {len(gt_chunks)}")
    print(f"  L3 processes:    {len(proc_chunks)}")
    print(f"  Violation codes: {len(viol_chunks)}")
    print(f"  Total:           {len(all_chunks)}")

    if args.dry_run:
        print("\n[DRY RUN] Sample chunks:")
        for c in all_chunks[:3]:
            print(f"\n--- {c['doc_name']} (category={c['category']}) ---")
            print(c["content"][:300])
        print(f"\n[DRY RUN] {len(all_chunks)} chunks would be inserted.")
        return

    sb = get_client()

    # 기존 BT/GT 청크 삭제 (doc_name prefix로 식별)
    prefixes = ["BT_BT-", "GT_G", "BSM_Process_L3-", "VIOL_VIOL-"]
    for prefix in prefixes:
        try:
            sb.table("knowledge_chunks").delete().like("doc_name", f"{prefix}%").execute()
        except Exception as e:
            print(f"  Warning: delete {prefix}* failed: {e}")
    print(f"\nExisting BT/GT/Process/VIOL chunks deleted.")

    # 임베딩 + 삽입
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
            if (i + 1) % 20 == 0:
                print(f"  [{i+1}/{len(all_chunks)}] inserted...")
                time.sleep(0.5)  # rate limit 방지

        except Exception as e:
            print(f"  ERROR inserting {chunk['doc_name']}: {e}")

    print(f"\nDone: {inserted}/{len(all_chunks)} chunks inserted.")


if __name__ == "__main__":
    main()

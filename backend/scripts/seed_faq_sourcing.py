"""소싱담당자 전용 FAQ 시드 + 기존 FAQ target_role 태깅

1. 11A_quote_buyer.json에서 L3당 4~5개 소싱 FAQ 생성 (~600개)
2. 기존 FAQ에 target_role="user" 태깅 (BT/GT/일반은 "all")

사용법:
  cd backend
  python -m scripts.seed_faq_sourcing
  python -m scripts.seed_faq_sourcing --dry-run
"""
import sys, os, json, time, argparse, re

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from dotenv import load_dotenv
load_dotenv()

from app.db.supabase_client import get_client
from app.rag.embedder import embed_document

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
JSON_DIR = os.path.join(PROJECT_ROOT, "BSM_견적서_JSON_CHUNKIGN")

MAX_ANSWER_LEN = 350


def _load(name):
    with open(os.path.join(JSON_DIR, name), encoding="utf-8") as f:
        return json.load(f)


def clean_text(text, max_len=MAX_ANSWER_LEN):
    if not text:
        return ""
    text = re.sub(r'[✅❌🚫🔄🏢🏗⚠️📋📦🔍💡☑️✍️🔴⛔📌📎🛒💰📊💹🔧📖👔🏭🧺⚖️🔶🔷🔹]', '', text)
    text = re.sub(r'\n{3,}', '\n\n', text).strip()
    if len(text) > max_len:
        cut = text[:max_len]
        last = max(cut.rfind('다.'), cut.rfind('요.'), cut.rfind('니다.'), cut.rfind('.'))
        text = text[:last + 1] if last > max_len // 2 else cut.rstrip() + "..."
    return text


def _fmt_contract_items(items, max_items=8):
    """계약조건 배열 → 텍스트 요약"""
    lines = []
    for item in items[:max_items]:
        name = item.get("항목", "")
        req = item.get("발주사요건", "")[:60]
        must = "필수" if item.get("필수선택") == "필수" else "선택"
        penalty = item.get("패널티", "")[:40]
        lines.append(f"- {name}: {req} [{must}] 패널티:{penalty}")
    if len(items) > max_items:
        lines.append(f"  외 {len(items) - max_items}건")
    return "\n".join(lines)


def _fmt_sla_items(items, max_items=6):
    """SLA 배열 → 텍스트 요약"""
    lines = []
    for item in items[:max_items]:
        name = item.get("SLA항목", "")
        req = item.get("발주사최소요건", "")[:50]
        penalty = item.get("패널티조건", "")[:40]
        rate = item.get("감액률", "")
        lines.append(f"- {name}: {req} → {penalty} (감액:{rate})")
    return "\n".join(lines)


def _fmt_services(items, max_items=6):
    """부가서비스 배열 → 텍스트 요약"""
    lines = []
    for item in items[:max_items]:
        name = item.get("서비스항목", "")
        func = item.get("발주사요구기능", "")[:50]
        kpi = item.get("KPI목표", "")
        lines.append(f"- {name}: {func} [KPI:{kpi}]")
    return "\n".join(lines)


# ═══════════════════════════════════════════
# 소싱담당자 FAQ 생성
# ═══════════════════════════════════════════

def build_sourcing_faqs(buyer_data, mapping_data) -> list[dict]:
    """11A_quote_buyer + 15_mapping → 소싱담당자 FAQ"""
    faqs = []

    # 매핑: quote_code → L3 info
    code_meta = {}
    for m in mapping_data:
        code = m.get("견적서코드")
        if code:
            if code not in code_meta:
                code_meta[code] = m

    for code, entry in buyer_data.items():
        meta = code_meta.get(code, {})
        name = meta.get("견적서명", code)
        l1 = meta.get("L1대분류", "")
        l2 = meta.get("L2중분류", "")
        l3_code = meta.get("L3코드", "")
        bt = meta.get("BT유형", "")

        base_meta = {
            "quote_code": code,
            "l3_code": l3_code,
            "bt_type": bt,
            "target_role": "procurement",
            "source": "quote_buyer",
        }

        # ── Q1: 견적서 필수 기재사항 ──
        pricing = entry.get("가격견적", {})
        required = pricing.get("소싱담당자_필수기재", [])
        if required:
            req_text = "\n".join(f"- {r}" for r in required[:8])
            optional = pricing.get("소싱담당자_선택기재", [])
            opt_text = ", ".join(optional[:5])
            answer = f"[{name} 견적서 필수 기재사항]\n{req_text}"
            if opt_text:
                answer += f"\n\n[선택 기재] {opt_text}"
            faqs.append({
                "question": f"{name} 견적서(RFQ) 작성 시 필수 기재사항은 무엇인가요?",
                "answer": clean_text(answer),
                "category": l1 or "소싱",
                "taxonomy_major": l1,
                "taxonomy_middle": l2,
                "doc_name": f"SOURCING_FAQ_{code}",
                "metadata": {**base_meta, "faq_type": "rfq_requirement"},
            })

        # ── Q2: 계약조건 및 패널티 ──
        contract = entry.get("계약조건", [])
        if contract:
            answer = f"[{name} 계약조건]\n{_fmt_contract_items(contract)}"
            faqs.append({
                "question": f"{name} 계약조건 및 패널티 기준은 어떻게 되나요?",
                "answer": clean_text(answer),
                "category": l1 or "소싱",
                "taxonomy_major": l1,
                "taxonomy_middle": l2,
                "doc_name": f"SOURCING_FAQ_{code}",
                "metadata": {**base_meta, "faq_type": "contract_terms"},
            })

        # ── Q3: SLA 기준 및 감액 조건 ──
        sla = entry.get("SLA품질", [])
        if sla:
            answer = f"[{name} SLA 기준]\n{_fmt_sla_items(sla)}"
            faqs.append({
                "question": f"{name} SLA 기준 및 감액 조건은 무엇인가요?",
                "answer": clean_text(answer),
                "category": l1 or "소싱",
                "taxonomy_major": l1,
                "taxonomy_middle": l2,
                "doc_name": f"SOURCING_FAQ_{code}",
                "metadata": {**base_meta, "faq_type": "sla_quality"},
            })

        # ── Q4: 부가서비스 요구사항 (있는 경우만) ──
        services = entry.get("부가서비스", [])
        if services and len(services) >= 3:
            answer = f"[{name} 부가서비스 요구사항]\n{_fmt_services(services)}"
            faqs.append({
                "question": f"{name} 부가서비스 및 KPI 요구사항은 무엇인가요?",
                "answer": clean_text(answer),
                "category": l1 or "소싱",
                "taxonomy_major": l1,
                "taxonomy_middle": l2,
                "doc_name": f"SOURCING_FAQ_{code}",
                "metadata": {**base_meta, "faq_type": "service_kpi"},
            })

        # ── Q5: TCO·정산 구조 (있는 경우만) ──
        tco = entry.get("TCO정산", [])
        if tco and len(tco) >= 3:
            tco_lines = "\n".join(
                f"- {t.get('비용항목','')}: {t.get('산출기준','')[:50]} [{t.get('필수선택','')}]"
                for t in tco[:6]
            )
            answer = f"[{name} TCO·정산 구조]\n{tco_lines}"
            faqs.append({
                "question": f"{name} TCO(총소유비용) 정산 구조는 어떻게 되나요?",
                "answer": clean_text(answer),
                "category": l1 or "소싱",
                "taxonomy_major": l1,
                "taxonomy_middle": l2,
                "doc_name": f"SOURCING_FAQ_{code}",
                "metadata": {**base_meta, "faq_type": "tco_settlement"},
            })

    return faqs


def build_sourcing_general_faqs() -> list[dict]:
    """소싱담당자 일반 FAQ"""
    base = {"target_role": "procurement", "faq_type": "sourcing_general"}
    return [
        {
            "question": "RFQ(견적요청서)는 언제 작성하나요?",
            "answer": "RFQ는 3개사 이상 경쟁 견적을 받아 비교할 때 작성합니다. branch2_sourcing이 '2B_RFQ'인 품목이 대상이며, 금형·지그, 디자인·패키지, 채용대행, 통관·관세, 시험·평가 등 19개 L3 품목이 해당됩니다. 소싱담당자가 품목사양, 수량, 계약조건을 명시하면 공급업체가 견적을 제출합니다.",
            "category": "소싱",
            "taxonomy_major": None,
            "taxonomy_middle": None,
            "doc_name": "SOURCING_FAQ_General",
            "metadata": base,
        },
        {
            "question": "RFP(제안요청서)는 언제 작성하나요?",
            "answer": "RFP는 기술+가격 입찰 평가가 필요한 대형 계약에 사용합니다. branch2_sourcing이 '2C_RFP입찰'인 품목이 대상이며, SI개발, 서버·스토리지, 정보보안, 물류풀필먼트 등 25개 L3 품목이 해당됩니다. 기술 제안서와 가격 제안서를 분리하여 평가하는 것이 일반적입니다.",
            "category": "소싱",
            "taxonomy_major": None,
            "taxonomy_middle": None,
            "doc_name": "SOURCING_FAQ_General",
            "metadata": base,
        },
        {
            "question": "소싱 전략은 어떻게 수립하나요?",
            "answer": "소싱 전략은 GT(Goods Type) 코드 기반으로 자동 결정됩니다. 35개 GT별로 소싱 방법(단독수의/경쟁견적/입찰), 승인 구조, 필수 서류가 정의되어 있습니다. L3 품목이 분류되면 해당 GT의 전략이 자동 적용되며, 소싱담당자는 이를 기반으로 견적서 또는 제안요청서를 작성합니다.",
            "category": "소싱",
            "taxonomy_major": None,
            "taxonomy_middle": None,
            "doc_name": "SOURCING_FAQ_General",
            "metadata": base,
        },
        {
            "question": "견적서에서 공급업체 작성란은 뭔가요?",
            "answer": "견적서는 소싱담당자 영역(Z1필수/Z2선택)과 공급업체 영역(Z3필수/Z4선택)으로 나뉩니다. 소싱담당자는 Z1/Z2만 작성하면 되고, Z3/Z4는 공급업체가 견적 응답 시 작성하는 란입니다. 소싱담당자가 공급업체란을 비워두면 공급업체에게 전달 시 자동으로 양식이 생성됩니다.",
            "category": "소싱",
            "taxonomy_major": None,
            "taxonomy_middle": None,
            "doc_name": "SOURCING_FAQ_General",
            "metadata": base,
        },
        {
            "question": "소싱담당자와 사용자의 차이가 뭔가요?",
            "answer": "사용자는 구매를 요청하는 현업 담당자로, 구매요청서(PR)를 작성합니다. 소싱담당자는 구매팀 소속으로, 사용자의 PR을 받아 RFQ(견적서) 또는 RFP(제안요청서)를 작성하여 공급업체를 선정하고 계약을 체결합니다. 소싱담당자는 시장 분석, 공급업체 평가, 계약 협상을 담당합니다.",
            "category": "소싱",
            "taxonomy_major": None,
            "taxonomy_middle": None,
            "doc_name": "SOURCING_FAQ_General",
            "metadata": base,
        },
    ]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    print("Loading BSM JSON...")
    buyer_data = _load("11A_quote_buyer.json")
    mapping_data = _load("15_l3_quote_mapping.json")

    sourcing_faqs = build_sourcing_faqs(buyer_data, mapping_data)
    general_faqs = build_sourcing_general_faqs()
    all_faqs = sourcing_faqs + general_faqs

    # 통계
    from collections import Counter
    type_counts = Counter(f["metadata"]["faq_type"] for f in all_faqs)

    print(f"\n소싱담당자 FAQ 생성 요약:")
    for t, c in sorted(type_counts.items()):
        print(f"  {t}: {c}개")
    print(f"  합계: {len(all_faqs)}개")

    if args.dry_run:
        for f in all_faqs[:5]:
            q = f['question'].encode('ascii', 'replace').decode('ascii')
            a = f['answer'][:120].encode('ascii', 'replace').decode('ascii')
            print(f"\n  Q: {q}")
            print(f"  A: {a}...")
        print(f"\n[DRY RUN] {len(all_faqs)}개 소싱 FAQ 생성 예정.")
        return

    sb = get_client()

    # ── STEP 1: 기존 FAQ에 target_role 태깅 ──
    print("\n기존 FAQ target_role 태깅...")
    try:
        # 기존 사용자 FAQ: target_role = "user"
        sb.table("knowledge_faq").update(
            {"metadata": {"target_role": "user"}}
        ).like("doc_name", "BSM_FAQ_L3%").execute()

        # BT/GT/일반 FAQ: target_role = "all"
        sb.table("knowledge_faq").update(
            {"metadata": {"target_role": "all"}}
        ).like("doc_name", "BSM_FAQ_BT%").execute()
        sb.table("knowledge_faq").update(
            {"metadata": {"target_role": "all"}}
        ).like("doc_name", "BSM_FAQ_GT%").execute()
        sb.table("knowledge_faq").update(
            {"metadata": {"target_role": "all"}}
        ).eq("doc_name", "BSM_FAQ_General").execute()
        print("  태깅 완료.")
    except Exception as e:
        print(f"  태깅 실패 (metadata JSONB merge 문제 가능): {e}")
        # 대안: 개별 업데이트
        print("  개별 업데이트로 재시도...")
        try:
            rows = sb.table("knowledge_faq").select("id, doc_name, metadata").execute().data
            for row in rows:
                meta = row.get("metadata") or {}
                if "BSM_FAQ_L3" in (row.get("doc_name") or ""):
                    meta["target_role"] = "user"
                elif any(p in (row.get("doc_name") or "") for p in ["BSM_FAQ_BT", "BSM_FAQ_GT", "BSM_FAQ_General"]):
                    meta["target_role"] = "all"
                else:
                    meta["target_role"] = "user"
                sb.table("knowledge_faq").update({"metadata": meta}).eq("id", row["id"]).execute()
            print(f"  {len(rows)}개 FAQ 태깅 완료.")
        except Exception as e2:
            print(f"  개별 업데이트도 실패: {e2}")

    # ── STEP 2: 기존 소싱 FAQ 삭제 (재실행 안전) ──
    try:
        sb.table("knowledge_faq").delete().like("doc_name", "SOURCING_FAQ_%").execute()
        print("기존 소싱 FAQ 삭제 완료.")
    except Exception as e:
        print(f"  삭제 실패: {e}")

    # ── STEP 3: 소싱 FAQ 삽입 ──
    inserted = 0
    errors = 0
    for i, faq in enumerate(all_faqs):
        try:
            embed_text = f"{faq['question']}\n{faq['answer']}"
            embedding = embed_document(embed_text)

            sb.table("knowledge_faq").insert({
                "question": faq["question"],
                "answer": faq["answer"],
                "embedding": embedding,
                "category": faq["category"],
                "taxonomy_major": faq.get("taxonomy_major"),
                "taxonomy_middle": faq.get("taxonomy_middle"),
                "doc_name": faq["doc_name"],
                "chunk_id": 950000 + i + 1,
                "metadata": faq.get("metadata", {}),
            }).execute()
            inserted += 1

            if (i + 1) % 50 == 0:
                print(f"  [{i+1}/{len(all_faqs)}] inserted...")
                time.sleep(0.5)
        except Exception as e:
            errors += 1
            if errors <= 3:
                print(f"  ERROR [{i+1}] {faq['question'][:30]}: {e}")

    print(f"\nDone: {inserted}/{len(all_faqs)} 소싱 FAQ 삽입 (오류 {errors}건)")


if __name__ == "__main__":
    main()

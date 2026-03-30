"""BSM v2 JSON → knowledge_faq 시드

기존 FAQ 3,652개를 삭제하고, BSM v2 JSON 데이터에서
L3/BT/GT별 Q&A 쌍을 자동 생성하여 knowledge_faq에 임베딩+삽입.

사용법:
  cd backend
  python -m scripts.seed_faq_from_bsm
  python -m scripts.seed_faq_from_bsm --dry-run
"""
import sys, os, time, argparse, re
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from dotenv import load_dotenv
load_dotenv()

from app.db.supabase_client import get_client
from app.rag.embedder import embed_document
from app.data.routing_data import RoutingDataStore, get_routing_store


MAX_ANSWER_LEN = 300  # 답변 최대 길이


def clean_text(text: str, max_len: int = MAX_ANSWER_LEN) -> str:
    """이모지 제거, 줄바꿈 정리, 길이 제한"""
    if not text:
        return ""
    text = re.sub(r'[✅❌🚫🔄🏢🏗⚠️📋📦🔍💡☑️✍️🔴⛔📌📎🛒]', '', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = text.strip()
    if len(text) > max_len:
        # 문장 단위로 자르기
        cut = text[:max_len]
        last_period = max(cut.rfind('.'), cut.rfind('다.'), cut.rfind('요.'), cut.rfind('니다.'))
        if last_period > max_len // 2:
            text = text[:last_period + 1]
        else:
            text = cut.rstrip() + "..."
    return text


def build_l3_faqs(store) -> list[dict]:
    """152개 L3 상세 가이드에서 Q&A 생성"""
    faqs = []

    for l3_code, detail in store.l3_detail.items():
        entry = store.get_routing(l3_code)
        if not entry:
            continue

        name = entry.l3_name
        l1 = entry.l1
        l2 = entry.l2
        bt = entry.bt_type
        dept = entry.dept if entry.dept != "—" else ""
        user_guide = clean_text(detail.get("사용자안내", ""))
        entry_method = clean_text(detail.get("진입방법", ""))
        violations = clean_text(detail.get("금지행위", ""))
        sla = clean_text(detail.get("Confirm_SLA", ""))
        po_method = clean_text(detail.get("PO생성방식", ""))
        approval = clean_text(detail.get("PO승인체계", ""))

        # Q1: 기본 안내 (어떻게 하나요?)
        if user_guide:
            faqs.append({
                "question": f"{name} 구매/이용은 어떻게 하나요?",
                "answer": user_guide,
                "category": l1,
                "taxonomy_major": l1,
                "taxonomy_middle": l2,
                "doc_name": f"BSM_FAQ_{l3_code}",
                "metadata": {"l3_code": l3_code, "bt_type": bt, "faq_type": "guide"},
            })

        # Q2: 진입 방법 (절차가 어떻게 되나요?)
        if entry_method:
            faqs.append({
                "question": f"{name} 구매/신청 절차가 어떻게 되나요?",
                "answer": entry_method,
                "category": l1,
                "taxonomy_major": l1,
                "taxonomy_middle": l2,
                "doc_name": f"BSM_FAQ_{l3_code}",
                "metadata": {"l3_code": l3_code, "bt_type": bt, "faq_type": "process"},
            })

        # Q3: 금지행위 (주의사항)
        if violations:
            faqs.append({
                "question": f"{name} 구매 시 주의사항이나 금지행위는 무엇인가요?",
                "answer": f"[{name} 주의사항]\n{violations}",
                "category": l1,
                "taxonomy_major": l1,
                "taxonomy_middle": l2,
                "doc_name": f"BSM_FAQ_{l3_code}",
                "metadata": {"l3_code": l3_code, "bt_type": bt, "faq_type": "violation"},
            })

        # Q4: 주관부서 안내 (해당 시)
        if dept:
            faqs.append({
                "question": f"{name}은(는) 어느 부서에서 담당하나요?",
                "answer": f"{name}은(는) {dept}에서 주관합니다.\n{user_guide}" if user_guide else f"{name}은(는) {dept}에서 주관합니다.",
                "category": l1,
                "taxonomy_major": l1,
                "taxonomy_middle": l2,
                "doc_name": f"BSM_FAQ_{l3_code}",
                "metadata": {"l3_code": l3_code, "bt_type": bt, "faq_type": "dept"},
            })

    return faqs


def build_bt_faqs(store) -> list[dict]:
    """11개 BT 정의에서 Q&A 생성"""
    faqs = []
    for bt_code, bt_def in store.bt_defs.items():
        name = bt_def.get("유형명", bt_code).replace("\n", " ")
        process = clean_text(bt_def.get("핵심프로세스", ""))
        criteria = clean_text(bt_def.get("적용기준", ""))
        blocking = clean_text(bt_def.get("주요차단규정", ""))

        if process:
            faqs.append({
                "question": f"{bt_code} ({name}) 유형의 구매 프로세스는 어떻게 되나요?",
                "answer": f"[{bt_code} {name}]\n적용기준: {criteria}\n프로세스: {process}\n차단규정: {blocking}",
                "category": "bt_gt_routing",
                "taxonomy_major": None,
                "taxonomy_middle": None,
                "doc_name": f"BSM_FAQ_BT_{bt_code}",
                "metadata": {"bt_type": bt_code, "faq_type": "bt_process"},
            })

    return faqs


def build_gt_faqs(store) -> list[dict]:
    """35개 GT 정의에서 Q&A 생성"""
    faqs = []
    for gt_code, gt_def in store.gt_defs.items():
        name = gt_def.get("GT한글명", gt_code)
        strategy = clean_text(gt_def.get("소싱전략상세", ""))
        approval = clean_text(gt_def.get("소싱승인구조", ""))
        docs = clean_text(gt_def.get("필수서류", ""))
        method = gt_def.get("Procurement_Method", "")

        if strategy:
            faqs.append({
                "question": f"{gt_code} ({name}) 소싱 전략은 무엇인가요?",
                "answer": f"[{gt_code} {name}]\n소싱전략: {strategy}\n승인구조: {approval}\n필수서류: {docs}\n방법: {method}",
                "category": "bt_gt_routing",
                "taxonomy_major": None,
                "taxonomy_middle": None,
                "doc_name": f"BSM_FAQ_GT_{gt_code}",
                "metadata": {"gt_code": gt_code, "faq_type": "gt_strategy"},
            })

    return faqs


def build_general_faqs() -> list[dict]:
    """간접구매 일반 질문 FAQ"""
    return [
        {
            "question": "간접구매가 뭔가요?",
            "answer": "간접구매는 기업의 핵심 생산활동에 직접 투입되지 않는 물품이나 서비스를 구매하는 것입니다. 사무용품, IT 장비, 시설관리, 복리후생, 마케팅, 물류 등 11개 대분류로 구성되며, BSM(구매관리시스템)을 통해 체계적으로 관리됩니다.",
            "category": "bt_gt_routing",
            "taxonomy_major": None,
            "taxonomy_middle": None,
            "doc_name": "BSM_FAQ_General",
            "metadata": {"faq_type": "general"},
        },
        {
            "question": "구매요청서(PR)는 언제 작성하나요?",
            "answer": "구매요청서(PR)는 카탈로그에 없는 품목이나 주관부서가 없는 비카탈로그 품목을 구매할 때 작성합니다. 카탈로그 품목은 PR 없이 직접 발주하고, 주관부서가 있는 품목은 해당 부서를 통해 신청합니다. BT-E~I 유형의 품목만 PR 작성이 가능합니다.",
            "category": "bt_gt_routing",
            "taxonomy_major": None,
            "taxonomy_middle": None,
            "doc_name": "BSM_FAQ_General",
            "metadata": {"faq_type": "general"},
        },
        {
            "question": "RFP와 RFQ의 차이가 뭔가요?",
            "answer": "RFQ(Request for Quotation, 견적요청서)는 3개사 이상 경쟁 견적을 받아 비교하는 절차입니다. RFP(Request for Proposal, 제안요청서)는 기술+가격 입찰 평가를 포함하는 더 공식적인 절차로, 대형 계약이나 전략적 구매에 사용됩니다.",
            "category": "bt_gt_routing",
            "taxonomy_major": None,
            "taxonomy_middle": None,
            "doc_name": "BSM_FAQ_General",
            "metadata": {"faq_type": "general"},
        },
        {
            "question": "주관부서가 뭔가요?",
            "answer": "주관부서는 특정 구매 품목의 계약과 발주를 전담하는 부서입니다. 예를 들어 정수기/복합기 렌탈은 총무팀, 건강검진/교육은 HR팀, 보안/청소는 시설팀이 주관합니다. 주관부서가 있는 품목은 해당 부서를 통해 신청해야 하며, 직접 PR 작성이 불가합니다.",
            "category": "bt_gt_routing",
            "taxonomy_major": None,
            "taxonomy_middle": None,
            "doc_name": "BSM_FAQ_General",
            "metadata": {"faq_type": "general"},
        },
        {
            "question": "카탈로그 주문은 어떻게 하나요?",
            "answer": "BSM 카탈로그에서 품목을 검색하고 수량을 입력하면 바로 발주됩니다. PR 작성이 필요 없으며, 부서장 결재(50만원 이하) 후 자동 PO가 생성됩니다. 카탈로그에 없는 품목은 유사품 추천이나 URL 구매대행을 이용할 수 있습니다.",
            "category": "bt_gt_routing",
            "taxonomy_major": None,
            "taxonomy_middle": None,
            "doc_name": "BSM_FAQ_General",
            "metadata": {"faq_type": "general"},
        },
    ]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    # 싱글톤 리셋
    RoutingDataStore._instance = None
    store = get_routing_store()

    l3_faqs = build_l3_faqs(store)
    bt_faqs = build_bt_faqs(store)
    gt_faqs = build_gt_faqs(store)
    gen_faqs = build_general_faqs()

    all_faqs = l3_faqs + bt_faqs + gt_faqs + gen_faqs

    print(f"\nFAQ 생성 요약:")
    print(f"  L3 가이드:  {len(l3_faqs)}")
    print(f"  BT 정의:    {len(bt_faqs)}")
    print(f"  GT 정의:    {len(gt_faqs)}")
    print(f"  일반 질문:  {len(gen_faqs)}")
    print(f"  합계:       {len(all_faqs)}")

    if args.dry_run:
        print(f"\n[DRY RUN] 샘플:")
        for f in all_faqs[:5]:
            print(f"\n  Q: {f['question']}")
            print(f"  A: {f['answer'][:100]}...")
        print(f"\n[DRY RUN] {len(all_faqs)}개 FAQ가 생성될 예정.")
        return

    sb = get_client()

    # 기존 FAQ 삭제
    try:
        result = sb.table("knowledge_faq").select("id", count="exact").execute()
        old_count = result.count if hasattr(result, 'count') else len(result.data or [])
        print(f"\n기존 FAQ {old_count}개 삭제 중...")
        sb.table("knowledge_faq").delete().neq("id", 0).execute()
        print(f"  삭제 완료.")
    except Exception as e:
        print(f"  기존 FAQ 삭제 실패: {e}")

    # 새 FAQ 삽입
    inserted = 0
    errors = 0
    for i, faq in enumerate(all_faqs):
        try:
            # Q+A 합쳐서 임베딩
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
                "chunk_id": 900000 + i + 1,
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

    print(f"\nDone: {inserted}/{len(all_faqs)} FAQ 삽입 (오류 {errors}건)")


if __name__ == "__main__":
    main()

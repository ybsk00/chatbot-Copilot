"""구매전략 RAG 시드 — taxonomy_v2의 L3 품목별 구매전략·설명을 knowledge_chunks에 임베딩"""
import sys, os, time
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from dotenv import load_dotenv
load_dotenv()

from app.db.supabase_client import get_client
from app.rag.embedder import embed_document


CATEGORY_TAG = "구매전략"
DOC_PREFIX = "차세대품목체계"


def build_chunk_text(l1_name: str, l2_name: str, l3: dict) -> str:
    """L3 품목 정보를 RAG 청크 텍스트로 구성"""
    parts = [
        f"[품목 분류] {l1_name} > {l2_name} > {l3['name']}",
        f"[품목 코드] {l3['code']}",
    ]
    if l3.get("description"):
        parts.append(f"[품목 설명] {l3['description']}")
    if l3.get("purchase_strategy"):
        parts.append(f"[구매 전략] {l3['purchase_strategy']}")
    if l3.get("expense_type"):
        parts.append(f"[비용 구분] {l3['expense_type']}")
    if l3.get("cost_category"):
        parts.append(f"[비용 분류] {l3['cost_category']}")
    if l3.get("suppliers"):
        sups = l3["suppliers"]
        if isinstance(sups, list):
            sups = ", ".join(sups)
        parts.append(f"[주요 공급사] {sups}")
    if l3.get("keywords"):
        kws = l3["keywords"]
        if isinstance(kws, list):
            kws = ", ".join(kws)
        parts.append(f"[관련 키워드] {kws}")
    return "\n".join(parts)


def run():
    supabase = get_client()

    # taxonomy_v2에서 L3 데이터 조회
    print("taxonomy_v2에서 L3 데이터 조회 중...")
    l3_result = supabase.table("taxonomy_v2").select("*").eq("level", 3).execute()
    l3_records = l3_result.data
    print(f"  L3 {len(l3_records)}개 조회 완료")

    # L1/L2 이름 조회
    l1l2_result = supabase.table("taxonomy_v2").select("code,name,level").in_("level", [1, 2]).execute()
    code_to_name = {r["code"]: r["name"] for r in l1l2_result.data}

    # L2 → L1 매핑
    l2_result = supabase.table("taxonomy_v2").select("code,parent_code").eq("level", 2).execute()
    l2_to_l1 = {r["code"]: r["parent_code"] for r in l2_result.data}

    # 기존 구매전략 청크 삭제
    existing = supabase.table("knowledge_chunks").select("id").eq("category", CATEGORY_TAG).execute()
    if existing.data:
        ids = [r["id"] for r in existing.data]
        for i in range(0, len(ids), 50):
            batch_ids = ids[i:i+50]
            supabase.table("knowledge_chunks").delete().in_("id", batch_ids).execute()
        print(f"기존 구매전략 청크 {len(ids)}개 삭제 완료")

    # 임베딩 + 삽입
    inserted = 0
    errors = 0
    for idx, l3 in enumerate(l3_records):
        parent_l2 = l3.get("parent_code", "")
        parent_l1 = l2_to_l1.get(parent_l2, "")
        l1_name = code_to_name.get(parent_l1, "")
        l2_name = code_to_name.get(parent_l2, "")

        chunk_text = build_chunk_text(l1_name, l2_name, l3)
        doc_name = f"{DOC_PREFIX}/{l1_name}/{l2_name}/{l3['name']}"

        try:
            embedding = embed_document(chunk_text)

            supabase.table("knowledge_chunks").insert({
                "content": chunk_text,
                "embedding": embedding,
                "category": CATEGORY_TAG,
                "doc_name": doc_name,
                "chunk_index": 0,
                "metadata": {
                    "l1_code": parent_l1,
                    "l2_code": parent_l2,
                    "l3_code": l3["code"],
                    "pr_template_key": l3.get("pr_template_key"),
                    "expense_type": l3.get("expense_type"),
                },
            }).execute()
            inserted += 1

            if (idx + 1) % 10 == 0:
                print(f"  {idx + 1}/{len(l3_records)} 완료 ({inserted} 삽입, {errors} 오류)")

            # Rate limit 보호 (gemini embedding API)
            time.sleep(0.15)

        except Exception as e:
            errors += 1
            print(f"  [오류] {l3['code']} {l3['name']}: {e}")
            time.sleep(1)

    print(f"\n구매전략 RAG 시드 완료: {inserted}개 삽입, {errors}개 오류")
    print(f"knowledge_chunks 테이블에 category='{CATEGORY_TAG}'로 저장됨")


if __name__ == "__main__":
    run()

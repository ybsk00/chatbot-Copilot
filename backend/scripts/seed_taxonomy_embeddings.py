"""taxonomy_v2 L3 151개에 search_embedding 시드.
search_text = "L1대분류 > L2중분류 > L3소분류 | 키워드1, 키워드2, ..."
gemini-embedding-001 사용 (1536차원)
"""
import os, sys, time
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from google import genai
from app.db.supabase_client import get_client

GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY", "")
client = genai.Client(api_key=GOOGLE_API_KEY)
sb = get_client()

# L1/L2 이름 조회
all_rows = sb.table("taxonomy_v2").select("code, level, name, parent_code").eq("is_active", True).execute().data
l1_map = {r["code"]: r["name"] for r in all_rows if r["level"] == 1}
l2_map = {r["code"]: {"name": r["name"], "parent": r.get("parent_code")} for r in all_rows if r["level"] == 2}

# L3 전체 로드
l3_rows = sb.table("taxonomy_v2").select("id, code, name, parent_code, keywords").eq("level", 3).eq("is_active", True).execute().data
print(f"L3 {len(l3_rows)}개 로드됨")

batch = []
for i, r in enumerate(l3_rows):
    l2_info = l2_map.get(r.get("parent_code"), {})
    l2_name = l2_info.get("name", "")
    l1_code = l2_info.get("parent", "")
    l1_name = l1_map.get(l1_code, "")
    keywords = ", ".join(r.get("keywords") or [])

    search_text = f"{l1_name} > {l2_name} > {r['name']}"
    if keywords:
        search_text += f" | {keywords}"

    batch.append({"id": r["id"], "code": r["code"], "search_text": search_text})

print(f"임베딩 생성 시작... ({len(batch)}개)")

# 배치 임베딩 (20개씩)
BATCH_SIZE = 20
for start in range(0, len(batch), BATCH_SIZE):
    chunk = batch[start:start + BATCH_SIZE]
    texts = [item["search_text"] for item in chunk]

    result = client.models.embed_content(
        model="gemini-embedding-001",
        contents=texts,
    )

    for j, emb in enumerate(result.embeddings):
        item = chunk[j]
        vec = emb.values
        sb.table("taxonomy_v2").update({
            "search_text": item["search_text"],
            "search_embedding": vec,
        }).eq("id", item["id"]).execute()

    print(f"  {start + len(chunk)}/{len(batch)} 완료")
    time.sleep(0.5)

print(f"\n완료: {len(batch)}개 L3 임베딩 시드됨")

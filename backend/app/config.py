import os
from dotenv import load_dotenv

load_dotenv()

# 모델 설정 (확정)
MODELS = {
    "refinement": "gemini-2.5-flash-lite",
    "embedding":  "gemini-embedding-001",
    "generation": "gemini-2.5-flash",
}
EMBEDDING_DIM = 1536

# API 키
GOOGLE_API_KEY  = os.getenv("GOOGLE_API_KEY")
SUPABASE_URL    = os.getenv("SUPABASE_URL")
SUPABASE_KEY    = os.getenv("SUPABASE_SERVICE_KEY")

# RAG 파라미터
RAG_TOP_K       = 3
BM25_WEIGHT     = 0.3
MAX_CHUNK_TOKENS = 400

# Phase 감지 키워드 (Gemini 호출 대체)
PURCHASE_KEYWORDS = ["구매", "발주", "조달", "계약", "견적", "입찰", "리스", "임대", "용역", "외주"]
RFP_AGREE_KEYWORDS = ["작성해", "네", "좋아요", "부탁", "진행해", "시작해", "만들어"]

# Prefetcher 설정
PREFETCH_CANDIDATE_COUNT = 3
PREFETCH_CACHE_TTL = 300  # 초

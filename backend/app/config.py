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
RAG_TOP_K       = 5
BM25_WEIGHT     = 0.3
MAX_CHUNK_TOKENS = 400

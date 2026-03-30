import os
from dotenv import load_dotenv

load_dotenv()

# 모델 설정 (확정)
MODELS = {
    "refinement": "gemini-2.5-flash-lite",
    "embedding":  "gemini-embedding-001",
    "generation": "gemini-2.5-flash-lite",      # flash-lite: thinking 없이 빠른 TTFT
    "rfp_extract": "gemini-2.5-flash",           # RFP 필드 추출 전용 (정확도 우선, thinking_budget=0으로 속도 확보)
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
VECTOR_MIN_SIMILARITY = 0.70   # 벡터 최소 유사도 (0.75→0.70 하향, 신규 구조화 청크 검색률 향상)
CONFIDENCE_THRESHOLD  = 0.72   # 신뢰도 거부 임계값 (0.65→0.72 상향, 근거 부족 답변 차단)

# RRF 리랭킹 설정
RRF_K            = 60          # RRF 스무딩 상수
RRF_BOOST_FAQ    = 0.5         # FAQ 소스 부스트 (1.5→0.5, JSON 1순위 전환으로 최소화)
RRF_BOOST_BM25   = 1.2         # BM25 소스 부스트
RRF_BOOST_VECTOR = 1.3         # Vector 소스 부스트 (1.0→1.3, 구조화 청크 우선)
RRF_TOP_K        = 5           # 최종 리랭킹 결과 수
FAQ_FALLBACK_TOP_K = 2         # FAQ 폴백 검색 수 (기존 5→2, 최소화)
FAQ_ENABLED      = True        # FAQ 완전 비활성화 스위치 (False로 전환 가능)

# 헌법 벡터 검색 파라미터
CONSTITUTION_TOP_K = 3         # 질문당 검색할 헌법 규칙 수
SCRIPT_TOP_K       = 2         # 질문당 검색할 화법 스크립트 수

# Phase 감지 키워드 (Gemini 호출 대체)
PURCHASE_KEYWORDS = ["구매", "발주", "조달", "계약", "견적", "입찰", "리스", "임대", "용역", "외주"]
RFP_AGREE_KEYWORDS = ["작성해", "작성할", "작성하", "네", "좋아요", "부탁", "진행해", "시작해", "만들어", "생성해", "생성할", "생성하", "할게", "할께", "할래"]

# PR(구매요청서) Phase 감지 키워드
PR_AGREE_KEYWORDS = [
    "구매요청서 작성", "요청서 작성", "구매요청서 만들", "요청서 만들",
    "구매요청 진행", "구매요청서 시작", "구매요청서 작성해", "구매요청서 작성할",
    "요청서 작성해", "요청서 만들어", "구매요청 할게", "구매요청 할래",
    "구매요청서 부탁", "구매요청서 생성", "요청서 생성",
]

# 역할 감지 최대 턴 수 (초과 시 명시적 질문)
ROLE_DETECTION_MAX_TURNS = 3

# Prefetcher 설정
PREFETCH_CANDIDATE_COUNT = 3
PREFETCH_CACHE_TTL = 300  # 초

# SMTP (Gmail)
SMTP_HOST = "smtp.gmail.com"
SMTP_PORT = 587
SMTP_EMAIL = os.getenv("SMTP_EMAIL", "rfp.castingn@gmail.com")
SMTP_APP_PASSWORD = os.getenv("SMTP_APP_PASSWORD", "rrvttfgantmvexmb")

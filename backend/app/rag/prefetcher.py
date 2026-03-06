"""후속 질문 예측 및 사전 검색 캐싱 모듈"""
import hashlib
import time
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from google import genai
from app.config import (
    GOOGLE_API_KEY,
    MODELS,
    PREFETCH_CANDIDATE_COUNT,
    PREFETCH_CACHE_TTL,
)
from app.rag.retriever import vector_search

logger = logging.getLogger(__name__)

_client = None
_cache: dict = {}  # {query_hash: {"chunks": [...], "expires": float}}
_executor = ThreadPoolExecutor(max_workers=3)


def _get_client():
    global _client
    if _client is None:
        _client = genai.Client(api_key=GOOGLE_API_KEY)
    return _client


def _hash_query(query: str) -> str:
    return hashlib.md5(query.encode()).hexdigest()


def _cleanup_expired():
    """만료된 캐시 항목 제거"""
    now = time.time()
    expired = [k for k, v in _cache.items() if v["expires"] < now]
    for k in expired:
        del _cache[k]


def get_cached(query: str) -> list[dict] | None:
    """캐시 히트 시 청크 반환, 미스 시 None"""
    _cleanup_expired()
    key = _hash_query(query)
    entry = _cache.get(key)
    if entry and entry["expires"] > time.time():
        logger.info(f"Prefetch cache HIT: {query[:30]}...")
        return entry["chunks"]
    return None


def extract_candidates(answer: str, question: str) -> list[str]:
    """flash-lite로 후속 질문 키워드 추출"""
    prompt = (
        f"사용자 질문: {question}\n"
        f"AI 답변: {answer}\n\n"
        f"사용자가 다음에 물어볼 만한 검색 키워드 {PREFETCH_CANDIDATE_COUNT}개를 쉼표로 반환하세요. "
        f"키워드만 반환하고 설명은 없이."
    )
    try:
        response = _get_client().models.generate_content(
            model=MODELS["refinement"],
            contents=prompt,
        )
        candidates = [k.strip() for k in response.text.strip().split(",")]
        return candidates[:PREFETCH_CANDIDATE_COUNT]
    except Exception as e:
        logger.warning(f"Prefetch candidate extraction failed: {e}")
        return []


def prefetch_chunks(candidates: list[str], category: str | None = None):
    """후보 키워드들에 대해 병렬 벡터 검색, 결과를 캐시에 저장"""
    futures = {}
    for candidate in candidates:
        if get_cached(candidate) is not None:
            continue
        future = _executor.submit(vector_search, candidate, category, 3, 0.65)
        futures[future] = candidate

    for future in as_completed(futures):
        candidate = futures[future]
        try:
            chunks = future.result()
            key = _hash_query(candidate)
            _cache[key] = {
                "chunks": chunks,
                "expires": time.time() + PREFETCH_CACHE_TTL,
            }
            logger.info(f"Prefetch cached: '{candidate}' ({len(chunks)} chunks)")
        except Exception as e:
            logger.warning(f"Prefetch search failed for '{candidate}': {e}")


def run_prefetch(answer: str, question: str, category: str | None = None):
    """답변 완료 후 백그라운드에서 실행: 키워드 추출 → 사전 검색"""
    try:
        candidates = extract_candidates(answer, question)
        if candidates:
            prefetch_chunks(candidates, category)
    except Exception as e:
        logger.warning(f"Prefetch pipeline failed: {e}")

"""Retrieval Agent — FAQ→BM25→Vector 하이브리드 검색"""
import time
from concurrent.futures import ThreadPoolExecutor
from app.agents.base import AgentBase, AgentContext, AgentResult, AgentPriority
from app.rag.retriever import hybrid_search
from app.rag.embedder import embed_query
from app.rag import prefetcher
from app.config import CONFIDENCE_THRESHOLD


def _extract_topic_keywords(text: str) -> str:
    """텍스트에서 주제 키워드를 추출 (조사/어미/의도 표현 제거)."""
    import re
    # 불필요한 접미사 제거 (의도 표현 + 조사 + 어미)
    stopwords = [
        # 정보 요청 표현
        "에 대해서", "에 대해", "에 대한", "에 관해", "을 알려주세요",
        "를 알려주세요", "이 궁금합니다", "가 궁금합니다", "알아보려고 합니다",
        "알아보려고요", "알려주세요", "궁금합니다", "있나요", "있습니까",
        "어떻게 되나요", "무엇인가요", "뭔가요",
        # 구매/렌탈 의도 표현
        "하려고 합니다", "하려고요", "하고 싶습니다", "하고 싶어요",
        "을 검토", "를 검토", "을 도입", "를 도입",
        # 일반 어미
        "합니다", "입니다", "습니다", "됩니다",
    ]
    # 조사 패턴 제거 (을/를/이/가/은/는/에/에서/으로/로)
    cleaned = text.strip()
    for sw in stopwords:
        cleaned = cleaned.replace(sw, " ")
    cleaned = re.sub(r'([가-힣])(을|를|이|가|은|는|에서|에|으로|로|과|와|의)\b', r'\1', cleaned)
    # 2글자 이상 단어만 추출
    words = [w for w in re.split(r'\s+', cleaned.strip()) if len(w) >= 2]
    return " ".join(words[:5])


def _enrich_short_query(message: str, history: list[dict]) -> str:
    """짧은 후속 질문에 이전 대화 맥락을 결합하여 검색 품질 향상.

    전략:
    1. 짧은 질문(≤30자)이면 이전 대화에서 주제 키워드 추출하여 결합
    2. 대명사/지시어("그건", "이건", "차이") 포함 시에도 맥락 결합
    3. 사용자 질문 → AI 답변 순으로 주제 탐색

    예: "직급별 차이가 있나요?" → "건강검진 서비스 직급별 차이가 있나요?"
    """
    msg = message.strip()

    # 대화 이력이 없으면 그대로 사용
    if not history:
        return msg

    # 맥락 결합이 필요한 조건 판단
    needs_context = False
    # 조건 1: 짧은 질문
    if len(msg) <= 30:
        needs_context = True
    # 조건 2: 대명사/지시어/모호한 참조 포함
    vague_patterns = ["그건", "이건", "그거", "이거", "차이", "비교", "어떤가요",
                      "얼마", "어떻게", "가능한가요", "되나요", "있나요", "뭐가",
                      "안내", "알려", "설명", "자세히", "더 알고", "부탁"]
    if any(p in msg for p in vague_patterns):
        needs_context = True

    if not needs_context:
        return msg

    # 최근 대화에서 주제 키워드 수집 (사용자 질문 + AI 답변)
    topic_parts = []

    # 1차: 최근 사용자 질문에서 주제 추출
    for h in reversed(history[-6:]):
        if h.get("role") == "user":
            prev_msg = h.get("content", "").strip()
            if len(prev_msg) > 5 and prev_msg != msg:
                keywords = _extract_topic_keywords(prev_msg)
                if keywords:
                    topic_parts.append(keywords)
                    break

    # 2차: 사용자 질문에서 못 찾으면 AI 답변 첫 줄에서 주제 추출
    if not topic_parts:
        for h in reversed(history[-6:]):
            if h.get("role") == "assistant":
                ai_text = h.get("content", "")
                if ai_text:
                    first_sentence = ai_text.split("\n")[0][:60]
                    keywords = _extract_topic_keywords(first_sentence)
                    if keywords:
                        topic_parts.append(keywords)
                        break

    if topic_parts:
        enriched = f"{topic_parts[0]} {msg}"
        return enriched

    return msg


class RetrievalAgent(AgentBase):
    """하이브리드 검색 에이전트. 레이턴시 예산: <1000ms

    핵심 변경: Classification 완료를 기다리지 않음.
    taxonomy_major 필터 없이 검색 시작 → 병렬 실행으로 ~1000ms 절감.
    """
    name = "retrieval"
    priority = AgentPriority.HIGH

    async def execute(self, ctx: AgentContext, executor: ThreadPoolExecutor) -> AgentResult:
        start = time.time()
        try:
            # 짧은 후속 질문은 대화 맥락 결합 (검색 품질 향상)
            search_query = _enrich_short_query(ctx.message, ctx.history)
            query_enriched = search_query != ctx.message
            if query_enriched:
                self.logger.info(
                    f"[Retrieval] Query enriched: '{ctx.message}' → '{search_query[:60]}'"
                )

            # 프리페치 캐시 확인
            cached = prefetcher.get_cached(ctx.message)
            if cached:
                ctx.chunks = cached
                # 헌법 검색용 임베딩은 별도 필요
                ctx.query_embedding = await self.run_in_thread(
                    executor, embed_query, ctx.message
                )
            else:
                # L3코드가 있으면 JSON 1순위 검색 활성화
                _l3 = (ctx.classification or {}).get("l3_code") if ctx.classification else None
                _role = ctx.user_role
                result = await self.run_in_thread(
                    executor,
                    lambda: hybrid_search(
                        search_query,
                        category=ctx.category,
                        taxonomy_major=None,
                        l3_code=_l3,
                        user_role=_role,
                    )
                )
                ctx.chunks, ctx.query_embedding = result

            # RAG 점수 계산 (벡터/FAQ 유사도 기반, BM25 점수는 0-1이 아니므로 제외)
            if ctx.chunks:
                ctx.rag_score = max(c.get("similarity", 0) for c in ctx.chunks)
                ctx.sources = list({c["doc_name"] for c in ctx.chunks})
            else:
                ctx.rag_score = 0.0
                ctx.sources = []

            # 신뢰도 기반 거부: 청크가 있어도 유사도가 낮으면 거부
            # 대화 맥락이 있는 후속 질문은 임계값을 낮춤 (0.65 → 0.50)
            threshold = CONFIDENCE_THRESHOLD
            if query_enriched and ctx.history:
                threshold = 0.50
                self.logger.info(
                    f"[Retrieval] Enriched query → lowered threshold: {CONFIDENCE_THRESHOLD} → {threshold}"
                )

            if ctx.rag_score < threshold:
                ctx.confidence_rejected = True
                self.logger.info(
                    f"[Retrieval] Confidence rejected: rag_score={ctx.rag_score:.4f} < {threshold}"
                )

            ctx.timings["retrieval_ms"] = (time.time() - start) * 1000
            return self._timed_result(start)
        except Exception as e:
            self.logger.error(f"Retrieval failed: {e}")
            ctx.confidence_rejected = True
            return self._timed_result(start, success=False, error=str(e))

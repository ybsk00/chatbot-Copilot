"""Retrieval Agent — FAQ→BM25→Vector 하이브리드 검색"""
import time
from concurrent.futures import ThreadPoolExecutor
from app.agents.base import AgentBase, AgentContext, AgentResult, AgentPriority
from app.rag.retriever import hybrid_search
from app.rag.embedder import embed_query
from app.rag import prefetcher
from app.config import CONFIDENCE_THRESHOLD


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
            # 프리페치 캐시 확인
            cached = prefetcher.get_cached(ctx.message)
            if cached:
                ctx.chunks = cached
                # 헌법 검색용 임베딩은 별도 필요
                ctx.query_embedding = await self.run_in_thread(
                    executor, embed_query, ctx.message
                )
            else:
                # taxonomy_major 없이 검색 (Classification과 병렬 실행)
                result = await self.run_in_thread(
                    executor,
                    lambda: hybrid_search(
                        ctx.message,
                        category=ctx.category,
                        taxonomy_major=None,
                    )
                )
                ctx.chunks, ctx.query_embedding = result

            # RAG 점수 계산 (RRF 결과는 이미 정렬됨 → max similarity 사용)
            if ctx.chunks:
                ctx.rag_score = max(c.get("similarity", 0) for c in ctx.chunks)
                ctx.sources = list({c["doc_name"] for c in ctx.chunks})
            else:
                ctx.rag_score = 0.0
                ctx.sources = []

            # 신뢰도 기반 거부
            if ctx.rag_score < CONFIDENCE_THRESHOLD and not ctx.chunks:
                ctx.confidence_rejected = True

            ctx.timings["retrieval_ms"] = (time.time() - start) * 1000
            return self._timed_result(start)
        except Exception as e:
            self.logger.error(f"Retrieval failed: {e}")
            ctx.confidence_rejected = True
            return self._timed_result(start, success=False, error=str(e))

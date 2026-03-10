"""Retrieval Agent — FAQ→BM25→Vector 하이브리드 검색"""
import time
from concurrent.futures import ThreadPoolExecutor
from app.agents.base import AgentBase, AgentContext, AgentResult, AgentPriority
from app.rag.retriever import hybrid_search
from app.rag.embedder import embed_query
from app.rag import prefetcher
from app.config import CONFIDENCE_THRESHOLD


def _enrich_short_query(message: str, history: list[dict]) -> str:
    """짧은 후속 질문에 이전 대화 맥락을 결합하여 검색 품질 향상.

    예: "직급별 차이가 있나요?" → "건강검진 서비스 직급별 차이가 있나요?"
    """
    msg = message.strip()
    # 충분히 긴 질문이면 그대로 사용
    if len(msg) > 25:
        return msg

    # 대화 이력에서 최근 사용자 질문의 핵심 주제 추출
    if not history:
        return msg

    # 최근 사용자 메시지에서 주제 키워드 추출 (역순 탐색)
    prev_topic = ""
    for h in reversed(history):
        if h.get("role") == "user":
            prev_msg = h.get("content", "").strip()
            if len(prev_msg) > 5 and prev_msg != msg:
                # 이전 질문에서 핵심 부분 (첫 30자) 추출
                prev_topic = prev_msg[:30]
                break

    if not prev_topic:
        # 사용자 메시지 없으면 AI 메시지에서 주제 추출
        for h in reversed(history):
            if h.get("role") == "assistant":
                ai_text = h.get("content", "")
                # AI 답변의 첫 문장에서 주제어 추출
                first_line = ai_text.split("\n")[0][:50] if ai_text else ""
                if first_line:
                    prev_topic = first_line
                    break

    if prev_topic:
        enriched = f"{prev_topic} {msg}"
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
            if search_query != ctx.message:
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
                # taxonomy_major 없이 검색 (Classification과 병렬 실행)
                result = await self.run_in_thread(
                    executor,
                    lambda: hybrid_search(
                        search_query,
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

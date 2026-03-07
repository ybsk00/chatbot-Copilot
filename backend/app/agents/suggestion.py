"""Suggestion Agent — FAQ 추천 + 프리페치"""
import time
from concurrent.futures import ThreadPoolExecutor
from app.agents.base import AgentBase, AgentContext, AgentResult, AgentPriority
from app.rag.retriever import get_faq_suggestions
from app.rag import prefetcher


class SuggestionAgent(AgentBase):
    """FAQ 추천 에이전트. 레이턴시 예산: <500ms

    핵심 변경: ctx.query_embedding 재사용 (embed_query 중복 호출 제거).
    """
    name = "suggestion"
    priority = AgentPriority.LOW

    async def execute(self, ctx: AgentContext, executor: ThreadPoolExecutor) -> AgentResult:
        start = time.time()
        try:
            user_msg_count = len(
                [m for m in (ctx.history or []) if m.get("role") == "user"]
            )

            if user_msg_count == 0 and ctx.query_embedding:
                # 첫 턴: FAQ 1개 + RFP 유도
                used_ids = [
                    c.get("metadata", {}).get("chunk_id") or c.get("id")
                    for c in ctx.chunks
                ]

                faq_items = await self.run_in_thread(
                    executor,
                    lambda: get_faq_suggestions(
                        ctx.query_embedding,  # 재사용! embed_query 추가 호출 없음
                        ctx.taxonomy_major,
                        used_ids,
                        top_k=1,
                        current_query=ctx.message,
                        answered_text=ctx.answer,
                    ),
                )
                ctx.suggestions = faq_items[:1] + ["제안요청서(RFP)를 작성하시겠습니까?"]
            else:
                ctx.suggestions = ["제안요청서(RFP)를 작성하시겠습니까?"]

            # 백그라운드 프리페치 (fire-and-forget)
            executor.submit(
                prefetcher.run_prefetch, ctx.answer, ctx.message, ctx.category
            )

            ctx.timings["suggestion_ms"] = (time.time() - start) * 1000
            return self._timed_result(start)
        except Exception as e:
            self.logger.warning(f"Suggestions failed: {e}")
            ctx.suggestions = ["제안요청서(RFP)를 작성하시겠습니까?"]
            return self._timed_result(start, success=False, error=str(e))

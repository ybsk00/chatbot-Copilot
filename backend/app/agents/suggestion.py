"""Suggestion Agent — FAQ 추천 + LLM 후속질문 + 프리페치"""
import time
from concurrent.futures import ThreadPoolExecutor
from app.agents.base import AgentBase, AgentContext, AgentResult, AgentPriority
from app.rag.retriever import get_faq_suggestions
from app.rag.generator import generate_suggestions
from app.rag import prefetcher

RFP_SUGGESTION = "제안요청서(RFP)를 작성하시겠습니까?"


class SuggestionAgent(AgentBase):
    """FAQ 추천 + LLM 후속질문 에이전트. 레이턴시 예산: <500ms

    첫 턴: FAQ 기반 추천 + RFP 유도
    후속 턴: LLM 기반 후속 질문 생성 + RFP 유도
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
                        ctx.query_embedding,
                        ctx.taxonomy_major,
                        used_ids,
                        top_k=1,
                        current_query=ctx.message,
                        answered_text=ctx.answer,
                    ),
                )
                ctx.suggestions = faq_items[:1] + [RFP_SUGGESTION]
            else:
                # 후속 턴: LLM 기반 후속 질문 생성 (청크 기반)
                if ctx.chunks and ctx.answer:
                    llm_suggestions = await self.run_in_thread(
                        executor,
                        lambda: generate_suggestions(
                            ctx.message,
                            ctx.chunks,
                            ctx.answer[:200],
                        ),
                    )
                    # RFP 관련 중복 제거
                    llm_suggestions = [
                        s for s in llm_suggestions
                        if "RFP" not in s and "제안요청서" not in s
                    ]
                    ctx.suggestions = llm_suggestions[:2] + [RFP_SUGGESTION]
                else:
                    ctx.suggestions = [RFP_SUGGESTION]

            # 백그라운드 프리페치 (fire-and-forget)
            executor.submit(
                prefetcher.run_prefetch, ctx.answer, ctx.message, ctx.category
            )

            ctx.timings["suggestion_ms"] = (time.time() - start) * 1000
            return self._timed_result(start)
        except Exception as e:
            self.logger.warning(f"Suggestions failed: {e}")
            ctx.suggestions = [RFP_SUGGESTION]
            return self._timed_result(start, success=False, error=str(e))

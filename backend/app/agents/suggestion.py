"""Suggestion Agent — FAQ 추천 + LLM 후속질문 + 프리페치"""
import time
from concurrent.futures import ThreadPoolExecutor
from app.agents.base import AgentBase, AgentContext, AgentResult, AgentPriority
from app.rag.retriever import get_faq_suggestions
from app.rag.generator import generate_suggestions
from app.rag import prefetcher

RFP_SUGGESTION = "RFP 작성하기"


class SuggestionAgent(AgentBase):
    """FAQ 추천 + LLM 후속질문 에이전트. 레이턴시 예산: <500ms

    첫 턴: FAQ 기반 추천 + RFP 버튼
    후속 턴: LLM 기반 후속 질문 생성 + RFP 버튼
    RFP 버튼은 항상 마지막에 포함.
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
                # 첫 턴: FAQ 추천 + RFP
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
                        top_k=2,
                        current_query=ctx.message,
                        answered_text=ctx.answer,
                    ),
                )
                # RFP 관련 항목은 별도 버튼으로 추가하므로 제거
                faq_items = [
                    s for s in faq_items
                    if "RFP" not in s and "제안요청서" not in s
                ]
                ctx.suggestions = faq_items[:2] + [RFP_SUGGESTION]
            else:
                # 후속 턴: LLM 기반 후속 질문 생성 + RFP
                if ctx.chunks and ctx.answer:
                    llm_suggestions = await self.run_in_thread(
                        executor,
                        lambda: generate_suggestions(
                            ctx.message,
                            ctx.chunks,
                            ctx.answer[:200],
                        ),
                    )
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

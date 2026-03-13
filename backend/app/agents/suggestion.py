"""Suggestion Agent — FAQ 추천 + LLM 후속질문 + 프리페치"""
import time
from concurrent.futures import ThreadPoolExecutor
from app.agents.base import AgentBase, AgentContext, AgentResult, AgentPriority
from app.rag.retriever import get_faq_suggestions
from app.rag.generator import generate_suggestions
from app.rag import prefetcher

RFP_SUGGESTION = "RFP 작성하기"
PR_SUGGESTION = "구매요청서 작성하기"


class SuggestionAgent(AgentBase):
    """FAQ 추천 + LLM 후속질문 에이전트. 레이턴시 예산: <500ms

    첫 턴: FAQ 기반 추천 + CTA 버튼 (역할별 분기)
    후속 턴: LLM 기반 후속 질문 생성 + CTA 버튼
    """
    name = "suggestion"
    priority = AgentPriority.LOW

    @staticmethod
    def _is_relevant(suggestion: str, chunks: list[dict], answer: str) -> bool:
        """추천 질문이 현재 청크/답변과 관련 있는지 검증.
        추천에 포함된 명사(3글자+)가 청크나 답변에 1개 이상 있어야 통과."""
        combined = answer + " " + " ".join(c.get("content", "")[:200] for c in chunks)
        words = [w for w in suggestion.split() if len(w) >= 3]
        if not words:
            return True  # 검증 불가 → 통과
        return any(w in combined for w in words)

    def _cta_buttons(self, ctx: AgentContext) -> list[str]:
        """역할에 따라 적절한 CTA 버튼 목록 반환"""
        if ctx.user_role == "user":
            return [PR_SUGGESTION]
        elif ctx.user_role == "procurement":
            return [RFP_SUGGESTION]
        # 미감지 → orchestrator가 최종 결정하므로 기본 RFP
        return [RFP_SUGGESTION]

    async def execute(self, ctx: AgentContext, executor: ThreadPoolExecutor) -> AgentResult:
        start = time.time()
        cta_list = self._cta_buttons(ctx)
        try:
            user_msg_count = len(
                [m for m in (ctx.history or []) if m.get("role") == "user"]
            )

            if user_msg_count == 0 and ctx.query_embedding:
                # 첫 턴: FAQ 추천 + CTA
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
                # RFP/구매요청서 관련 항목은 별도 버튼으로 추가하므로 제거
                faq_items = [
                    s for s in faq_items
                    if "RFP" not in s and "제안요청서" not in s
                    and "구매요청서" not in s
                ]
                ctx.suggestions = faq_items[:2] + cta_list
            else:
                # 후속 턴: LLM 기반 후속 질문 생성 + CTA
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
                        and "구매요청서" not in s
                        and self._is_relevant(s, ctx.chunks, ctx.answer)
                    ]
                    ctx.suggestions = llm_suggestions[:2] + cta_list
                else:
                    ctx.suggestions = list(cta_list)

            # 백그라운드 프리페치 (fire-and-forget)
            executor.submit(
                prefetcher.run_prefetch, ctx.answer, ctx.message, ctx.category
            )

            ctx.timings["suggestion_ms"] = (time.time() - start) * 1000
            return self._timed_result(start)
        except Exception as e:
            self.logger.warning(f"Suggestions failed: {e}")
            ctx.suggestions = list(cta_list)
            return self._timed_result(start, success=False, error=str(e))

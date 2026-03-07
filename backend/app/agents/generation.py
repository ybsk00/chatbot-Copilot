"""Generation Agent — RAG 스트리밍 답변 생성"""
import asyncio
import time
from concurrent.futures import ThreadPoolExecutor
from app.agents.base import AgentBase, AgentContext, AgentResult, AgentPriority
from app.rag.generator import generate_answer, generate_answer_stream
from app.constants.rfp_schemas import RFP_SCHEMAS


class GenerationAgent(AgentBase):
    """답변 생성 에이전트.

    핵심 변경:
    - gemini-2.5-flash 사용 (flash-lite 대신) → TTFT 개선
    - max_output_tokens 800 (2048 대신) → 생성 시간 단축
    """
    name = "generation"
    priority = AgentPriority.CRITICAL

    async def execute_stream(self, ctx: AgentContext, executor: ThreadPoolExecutor) -> AgentResult:
        """SSE 스트리밍용. 토큰을 ctx.token_queue에 전송."""
        start = time.time()
        try:
            loop = asyncio.get_event_loop()
            filled_keys = ", ".join(ctx.filled_fields.keys()) if ctx.filled_fields else ""
            schema = RFP_SCHEMAS.get(ctx.rfp_type, RFP_SCHEMAS["service_contract"])
            rfp_sections = schema["sections"] if ctx.phase == "filling" else ""

            def _produce():
                try:
                    for token in generate_answer_stream(
                        ctx.message, ctx.chunks, ctx.history,
                        ctx.phase, filled_keys, rfp_sections,
                        constitution_text=ctx.constitution_text,
                    ):
                        loop.call_soon_threadsafe(ctx.token_queue.put_nowait, token)
                finally:
                    loop.call_soon_threadsafe(ctx.token_queue.put_nowait, None)

            await loop.run_in_executor(executor, _produce)
            ctx.timings["generation_ms"] = (time.time() - start) * 1000
            return self._timed_result(start)
        except Exception as e:
            self.logger.error(f"Generation streaming failed: {e}")
            if ctx.token_queue:
                try:
                    ctx.token_queue.put_nowait(None)
                except Exception:
                    pass
            return self._timed_result(start, success=False, error=str(e))

    async def execute(self, ctx: AgentContext, executor: ThreadPoolExecutor) -> AgentResult:
        """동기 생성 (filling phase용)."""
        start = time.time()
        try:
            filled_keys = ", ".join(ctx.filled_fields.keys()) if ctx.filled_fields else ""
            schema = RFP_SCHEMAS.get(ctx.rfp_type, RFP_SCHEMAS["service_contract"])
            rfp_sections = schema["sections"] if ctx.phase == "filling" else ""

            answer, score = await self.run_in_thread(
                executor,
                lambda: generate_answer(
                    ctx.message, ctx.chunks, ctx.history,
                    ctx.phase, filled_keys, rfp_sections,
                    constitution_text=ctx.constitution_text,
                )
            )
            ctx.answer = answer
            ctx.timings["generation_ms"] = (time.time() - start) * 1000
            return self._timed_result(start)
        except Exception as e:
            self.logger.error(f"Generation failed: {e}")
            return self._timed_result(start, success=False, error=str(e))

"""Generation Agent — RAG 스트리밍 답변 생성"""
import asyncio
import time
from concurrent.futures import ThreadPoolExecutor
from app.agents.base import AgentBase, AgentContext, AgentResult, AgentPriority
from app.rag.generator import generate_answer, generate_answer_stream
from app.constants.rfp_schemas import RFP_SCHEMAS
from app.constants.pr_schemas import PR_SCHEMAS


def _build_filled_keys(filled_fields: dict, rfp_type: str, schema_source: dict | None = None) -> str:
    """filled_fields의 키를 한국어 라벨+값으로 변환 + 미입력 필드 표시."""
    schema = schema_source or RFP_SCHEMAS.get(rfp_type, RFP_SCHEMAS["service_contract"])
    field_labels = {}
    all_keys = []
    for pair in schema["fields"].split(", "):
        parts = pair.split(":")
        if len(parts) == 2:
            key = parts[0].strip()
            label = parts[1].strip()
            field_labels[key] = label
            all_keys.append(key)

    parts_list = []
    # 채워진 필드
    for k in all_keys:
        if k in filled_fields and filled_fields[k]:
            parts_list.append(f"{field_labels.get(k, k)}: {filled_fields[k]}")

    # 미입력 필드
    empty_keys = [field_labels.get(k, k) for k in all_keys if k not in filled_fields or not filled_fields.get(k)]
    if empty_keys:
        parts_list.append(f"\n미입력 필드: {', '.join(empty_keys)}")

    return "\n".join(parts_list) if parts_list else ""


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
            # PR phase → PR 스키마, RFP phase → RFP 스키마
            if ctx.phase.startswith("pr_"):
                pr_schema = PR_SCHEMAS.get(ctx.pr_type, PR_SCHEMAS["_generic"])
                filled_keys = _build_filled_keys(ctx.filled_fields, ctx.rfp_type, pr_schema)
                rfp_sections = pr_schema["sections"] if ctx.phase == "pr_filling" else ""
            else:
                filled_keys = _build_filled_keys(ctx.filled_fields, ctx.rfp_type)
                schema = RFP_SCHEMAS.get(ctx.rfp_type, RFP_SCHEMAS["service_contract"])
                rfp_sections = schema["sections"] if ctx.phase == "filling" else ""

            def _produce():
                try:
                    for token in generate_answer_stream(
                        ctx.message, ctx.chunks, ctx.history,
                        ctx.phase, filled_keys, rfp_sections,
                        constitution_text=ctx.constitution_text,
                        script_text=ctx.script_text,
                        cta_intent=ctx.cta_intent,
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
        """동기 생성 (filling/pr_filling phase용)."""
        start = time.time()
        try:
            # PR phase → PR 스키마
            if ctx.phase.startswith("pr_"):
                pr_schema = PR_SCHEMAS.get(ctx.pr_type, PR_SCHEMAS["_generic"])
                filled_keys = _build_filled_keys(ctx.filled_fields, ctx.rfp_type, pr_schema)
                rfp_sections = pr_schema["sections"] if ctx.phase == "pr_filling" else ""
            else:
                filled_keys = _build_filled_keys(ctx.filled_fields, ctx.rfp_type)
                schema = RFP_SCHEMAS.get(ctx.rfp_type, RFP_SCHEMAS["service_contract"])
                rfp_sections = schema["sections"] if ctx.phase == "filling" else ""

            answer, score = await self.run_in_thread(
                executor,
                lambda: generate_answer(
                    ctx.message, ctx.chunks, ctx.history,
                    ctx.phase, filled_keys, rfp_sections,
                    constitution_text=ctx.constitution_text,
                    script_text=ctx.script_text,
                    filling_intent=ctx.filling_intent,
                    cta_intent=ctx.cta_intent,
                )
            )
            ctx.answer = answer
            ctx.timings["generation_ms"] = (time.time() - start) * 1000
            return self._timed_result(start)
        except Exception as e:
            self.logger.error(f"Generation failed: {e}")
            return self._timed_result(start, success=False, error=str(e))

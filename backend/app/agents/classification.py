"""Classification Agent — 의도파악 + 분류체계 매핑"""
import time
from concurrent.futures import ThreadPoolExecutor
from app.agents.base import AgentBase, AgentContext, AgentResult, AgentPriority
from app.rag.classifier import classify_intent


class ClassificationAgent(AgentBase):
    """의도 분류 에이전트. 레이턴시 예산: <800ms"""
    name = "classification"
    priority = AgentPriority.HIGH

    async def execute(self, ctx: AgentContext, executor: ThreadPoolExecutor) -> AgentResult:
        start = time.time()
        try:
            result = await self.run_in_thread(
                executor, classify_intent, ctx.message, ctx.history
            )
            if result:
                ctx.classification = result
                ctx.taxonomy_major = result.get("대분류")
                ctx.taxonomy_middle = result.get("중분류")
            ctx.timings["classification_ms"] = (time.time() - start) * 1000
            return self._timed_result(start)
        except Exception as e:
            self.logger.warning(f"Classification failed: {e}")
            return self._timed_result(start, success=False, error=str(e))

"""Script Agent — 카테고리+CTA별 화법 스크립트 주입"""
import time
import logging
from concurrent.futures import ThreadPoolExecutor
from app.agents.base import AgentBase, AgentContext, AgentResult, AgentPriority
from app.scripts.gate import search_relevant_scripts, format_scripts_for_prompt

logger = logging.getLogger(__name__)


class ScriptAgent(AgentBase):
    """화법 레이어 에이전트.

    Constitution과 동일한 패턴으로 동작:
    - query_embedding 재사용 (추가 API 호출 없음)
    - 카테고리 + CTA로 필터링하여 관련 스크립트 검색
    - 시스템 프롬프트에 [화법 가이드] 블록으로 주입
    """
    name = "script"
    priority = AgentPriority.NORMAL

    async def inject_scripts(self, ctx: AgentContext, executor: ThreadPoolExecutor) -> AgentResult:
        """카테고리 + CTA 기반 화법 스크립트 벡터 검색 → 프롬프트 주입."""
        start = time.time()
        try:
            if ctx.query_embedding:
                category = ctx.taxonomy_major
                cta = ctx.cta_intent or "cold"

                scripts = await self.run_in_thread(
                    executor,
                    lambda: search_relevant_scripts(
                        ctx.query_embedding, category, cta
                    ),
                )
                ctx.script_rules = scripts
                ctx.script_text = format_scripts_for_prompt(scripts)

                if scripts:
                    logger.info(
                        f"[Script] Injected {len(scripts)} scripts "
                        f"for '{category}' / {cta}"
                    )

            ctx.timings["script_inject_ms"] = (time.time() - start) * 1000
            return self._timed_result(start)
        except Exception as e:
            logger.warning(f"Script injection failed: {e}")
            return self._timed_result(start, success=False, error=str(e))

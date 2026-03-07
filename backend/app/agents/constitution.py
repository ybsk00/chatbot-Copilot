"""Constitution Agent — 3단계 헌법 시행 (사전검사 + 규칙주입 + 사후검증)"""
import time
import logging
from concurrent.futures import ThreadPoolExecutor
from app.agents.base import AgentBase, AgentContext, AgentResult, AgentPriority
from app.constitution.gate import check_constitution, search_relevant_rules, format_rules_for_prompt
from app.agents.validators import GroundingValidator

logger = logging.getLogger(__name__)


class ConstitutionAgent(AgentBase):
    """헌법 시행 에이전트.

    3단계 시행:
    1. pre_check: 키워드 기반 입력 차단 (~0ms)
    2. inject_rules: 관련 헌법 조항 벡터 검색 → 프롬프트 주입 (~200ms)
    3. post_check: 생성된 답변 검증 (비차단, ~300ms)
    """
    name = "constitution"
    priority = AgentPriority.NORMAL

    def __init__(self):
        super().__init__()
        self.grounding_validator = GroundingValidator()

    async def pre_check(self, ctx: AgentContext, executor: ThreadPoolExecutor) -> AgentResult:
        """1단계: 키워드 기반 입력 차단. 0ms."""
        start = time.time()
        violation = check_constitution(ctx.message)
        if violation:
            ctx.violation = violation
        ctx.timings["constitution_precheck_ms"] = (time.time() - start) * 1000
        return self._timed_result(start)

    async def inject_rules(self, ctx: AgentContext, executor: ThreadPoolExecutor) -> AgentResult:
        """2단계: 관련 헌법 조항 벡터 검색 → 시스템 프롬프트에 주입.
        Retrieval Agent의 query_embedding 재사용 (추가 API 호출 없음)."""
        start = time.time()
        try:
            if ctx.query_embedding:
                rules = await self.run_in_thread(
                    executor, search_relevant_rules, ctx.query_embedding
                )
                ctx.constitution_rules = rules
                ctx.constitution_text = format_rules_for_prompt(rules)
            ctx.timings["constitution_inject_ms"] = (time.time() - start) * 1000
            return self._timed_result(start)
        except Exception as e:
            logger.warning(f"Constitution rule injection failed: {e}")
            return self._timed_result(start, success=False, error=str(e))

    async def post_check(self, ctx: AgentContext, executor: ThreadPoolExecutor) -> AgentResult:
        """3단계: 사후검증 — 생성된 답변이 청크에 근거하는지 확인.
        비차단: 스트리밍 완료 후 실행, done 이벤트 전에 경고 추가."""
        start = time.time()
        try:
            validation = await self.run_in_thread(
                executor,
                self.grounding_validator.validate,
                ctx.answer, ctx.chunks, ctx.constitution_rules,
            )
            if not validation["grounded"]:
                ctx.post_check_violation = validation["message"]

            ctx.timings["constitution_postcheck_ms"] = (time.time() - start) * 1000
            return self._timed_result(start)
        except Exception as e:
            logger.warning(f"Post-check failed: {e}")
            return self._timed_result(start, success=False, error=str(e))

    def background_overlap_check(self, partial_answer: str, chunks: list[dict]):
        """스트리밍 중 경량 오버랩 체크 (백그라운드, 로그만)."""
        try:
            overlap = self.grounding_validator.compute_overlap(partial_answer, chunks)
            if overlap < 0.2:
                logger.warning(
                    f"Low grounding at {len(partial_answer)} chars: {overlap:.2f}"
                )
        except Exception as e:
            logger.warning(f"Background overlap check error: {e}")

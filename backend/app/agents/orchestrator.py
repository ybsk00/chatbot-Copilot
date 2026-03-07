"""Orchestrator Agent — 전체 에이전트 조율 + SSE 이벤트 생성"""
import asyncio
import json
import time
import logging
from concurrent.futures import ThreadPoolExecutor
from typing import AsyncGenerator

from app.agents.base import AgentBase, AgentContext, AgentResult, AgentPriority
from app.agents.classification import ClassificationAgent
from app.agents.retrieval import RetrievalAgent
from app.agents.constitution import ConstitutionAgent
from app.agents.generation import GenerationAgent
from app.agents.suggestion import SuggestionAgent
from app.agents.rfp import RfpAgent
from app.config import RFP_AGREE_KEYWORDS

logger = logging.getLogger(__name__)


class OrchestratorAgent(AgentBase):
    """오케스트레이터 — 7개 에이전트를 병렬 조율.

    P95 레이턴시 예산:
      - Meta 이벤트: < 200ms (Phase 1 완료 후)
      - 첫 토큰: < 2.0s
      - 전체 완료: < 3.0s
      - Suggestions: < 3.5s (done 후 가능)
    """
    name = "orchestrator"
    priority = AgentPriority.CRITICAL

    def __init__(self):
        super().__init__()
        # 이중 스레드풀: 크리티컬 패스 vs 백그라운드
        self._critical_pool = ThreadPoolExecutor(
            max_workers=4, thread_name_prefix="critical"
        )
        self._background_pool = ThreadPoolExecutor(
            max_workers=2, thread_name_prefix="background"
        )

        # 에이전트 싱글턴
        self.classification = ClassificationAgent()
        self.retrieval = RetrievalAgent()
        self.constitution = ConstitutionAgent()
        self.generation = GenerationAgent()
        self.suggestion = SuggestionAgent()
        self.rfp = RfpAgent()

    def _detect_phase_trigger(self, message: str, phase: str) -> str | None:
        """키워드 기반 phase 전환 감지 (0ms)."""
        msg = message.strip()
        if phase in ("chat", "asked"):
            if any(kw in msg for kw in RFP_AGREE_KEYWORDS):
                return "rfp_agreed"
        return None

    async def execute_stream(self, ctx: AgentContext) -> AsyncGenerator[str, None]:
        """SSE 스트리밍 오케스트레이션 (chat/asked phase).

        실행 흐름:
        1. 사전검사 (0ms)
        2. Phase 감지 (0ms)
        3. Classification + Retrieval 병렬 (~1000ms)
        4. Constitution 규칙주입 (~200ms)
        5. Meta 이벤트 전송
        6. Generation 스트리밍 (~1800ms)
        7. 사후검증 + Suggestions (비차단)
        """
        total_start = time.time()

        # ── GATE 1: 헌법 사전검사 (~0ms) ──
        await self.constitution.pre_check(ctx, self._critical_pool)
        if ctx.violation:
            yield self._sse("meta", {
                "sources": [], "rag_score": 0,
                "phase_trigger": None, "classification": None,
            })
            yield self._sse("token", {"content": ctx.violation})
            yield self._sse("done", {})
            return

        # ── GATE 2: Phase 감지 (~0ms) ──
        ctx.phase_trigger = self._detect_phase_trigger(ctx.message, ctx.phase)
        if ctx.phase_trigger == "rfp_agreed":
            yield self._sse("meta", {
                "sources": [], "rag_score": 0,
                "phase_trigger": ctx.phase_trigger, "classification": None,
            })
            yield self._sse("token", {
                "content": "제안요청서(RFP) 작성을 진행하겠습니다. 아래에서 RFP 유형을 선택해 주십시오."
            })
            yield self._sse("done", {})
            return

        # ── PHASE 1: Classification + Retrieval 병렬 (~1000ms) ──
        classification_task = asyncio.create_task(
            self.classification.execute(ctx, self._critical_pool)
        )
        retrieval_task = asyncio.create_task(
            self.retrieval.execute(ctx, self._critical_pool)
        )
        await asyncio.gather(classification_task, retrieval_task)

        # ── GATE 3: 신뢰도 거부 ──
        if ctx.confidence_rejected:
            yield self._sse("meta", {
                "sources": [],
                "rag_score": round(ctx.rag_score, 4),
                "phase_trigger": None,
                "classification": ctx.classification,
            })
            yield self._sse("token", {
                "content": (
                    "죄송합니다. 현재 보유한 자료에서 관련 정보를 찾지 못했습니다. "
                    "질문을 더 구체적으로 해주시거나, 다른 주제로 질문해 주십시오."
                )
            })
            yield self._sse("done", {})
            return

        # ── PHASE 2: 헌법 규칙주입 (~200ms, 임베딩 재사용) ──
        await self.constitution.inject_rules(ctx, self._critical_pool)

        # ── Meta 이벤트 전송 ──
        yield self._sse("meta", {
            "sources": ctx.sources,
            "rag_score": round(ctx.rag_score, 4),
            "phase_trigger": ctx.phase_trigger,
            "classification": ctx.classification,
        })

        # ── PHASE 3: 스트리밍 생성 ──
        ctx.token_queue = asyncio.Queue()
        gen_task = asyncio.create_task(
            self.generation.execute_stream(ctx, self._critical_pool)
        )

        accumulated = ""
        bg_check_done = False

        while True:
            token = await ctx.token_queue.get()
            if token is None:
                break
            accumulated += token
            yield self._sse("token", {"content": token})

            # 200자 이후 백그라운드 오버랩 체크 (1회)
            if len(accumulated) > 200 and not bg_check_done:
                bg_check_done = True
                self._background_pool.submit(
                    self.constitution.background_overlap_check,
                    accumulated, ctx.chunks,
                )

        ctx.answer = accumulated
        await gen_task

        # ── PHASE 4: 사후검증 (비차단) ──
        await self.constitution.post_check(ctx, self._background_pool)
        if ctx.post_check_violation:
            yield self._sse("token", {
                "content": f"\n\n[안내] {ctx.post_check_violation}"
            })

        # ── PHASE 5: Suggestions ──
        await self.suggestion.execute(ctx, self._background_pool)
        yield self._sse("suggestions", {"items": ctx.suggestions})
        yield self._sse("done", {})

        # 타이밍 로그
        ctx.timings["total_ms"] = (time.time() - total_start) * 1000
        logger.info(
            f"[Orchestrator] Total: {ctx.timings['total_ms']:.0f}ms | "
            f"Classification: {ctx.timings.get('classification_ms', 0):.0f}ms | "
            f"Retrieval: {ctx.timings.get('retrieval_ms', 0):.0f}ms | "
            f"Constitution: {ctx.timings.get('constitution_inject_ms', 0):.0f}ms | "
            f"Generation: {ctx.timings.get('generation_ms', 0):.0f}ms | "
            f"PostCheck: {ctx.timings.get('constitution_postcheck_ms', 0):.0f}ms | "
            f"Suggestions: {ctx.timings.get('suggestion_ms', 0):.0f}ms"
        )

    async def execute_sync(self, ctx: AgentContext) -> dict:
        """동기 실행 (filling phase용)."""
        # 사전검사
        await self.constitution.pre_check(ctx, self._critical_pool)
        if ctx.violation:
            return {
                "answer": ctx.violation, "sources": [], "rag_score": 0,
                "phase_trigger": None, "rfp_fields": {}, "classification": None,
            }

        # 병렬: Classification + RFP 추출 + Retrieval
        await asyncio.gather(
            self.classification.execute(ctx, self._critical_pool),
            self.rfp.extract_fields(ctx, self._critical_pool),
            self.retrieval.execute(ctx, self._critical_pool),
        )

        # 헌법 규칙주입
        await self.constitution.inject_rules(ctx, self._critical_pool)

        # 답변 생성
        await self.generation.execute(ctx, self._critical_pool)

        # 사후검증
        await self.constitution.post_check(ctx, self._background_pool)
        if ctx.post_check_violation:
            ctx.answer += f"\n\n[안내] {ctx.post_check_violation}"

        # 완성 여부
        trigger = None
        if ctx.rfp_fields.get("is_complete") and ctx.phase == "filling":
            trigger = "complete"

        return {
            "answer": ctx.answer,
            "sources": ctx.sources,
            "rag_score": round(ctx.rag_score, 4),
            "phase_trigger": trigger,
            "rfp_fields": ctx.rfp_fields.get("rfp_fields", {}),
            "classification": ctx.classification,
        }

    @staticmethod
    def _sse(event_type: str, data: dict) -> str:
        """SSE 이벤트 포맷."""
        payload = {"type": event_type, **data}
        return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"

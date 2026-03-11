"""에이전트 기반 클래스 + 공유 컨텍스트"""
from __future__ import annotations

import asyncio
import time
import logging
from dataclasses import dataclass, field
from typing import Any
from concurrent.futures import ThreadPoolExecutor
from enum import Enum


logger = logging.getLogger(__name__)


class AgentPriority(Enum):
    CRITICAL = 0  # Generation — 크리티컬 패스
    HIGH = 1      # Classification, Retrieval
    NORMAL = 2    # Constitution, RFP
    LOW = 3       # Suggestion, Prefetch


@dataclass
class AgentContext:
    """에이전트 간 공유 컨텍스트. 각 에이전트가 읽기/쓰기."""

    # ── 입력 (요청에서) ──
    session_id: str = ""
    message: str = ""
    category: str | None = None
    history: list[dict] = field(default_factory=list)
    phase: str = "chat"
    filled_fields: dict = field(default_factory=dict)
    rfp_type: str = "service_contract"

    # ── 중간값 (에이전트가 설정) ──
    filling_intent: str | None = None  # "field_input" | "question" | "rfp_question"
    query_embedding: list[float] | None = None
    taxonomy_major: str | None = None
    taxonomy_middle: str | None = None
    classification: dict | None = None
    cta_intent: str = "cold"  # "hot" | "warm" | "cold"
    chunks: list[dict] = field(default_factory=list)
    constitution_rules: list[dict] = field(default_factory=list)
    constitution_text: str = ""
    script_rules: list[dict] = field(default_factory=list)
    script_text: str = ""
    rag_score: float = 0.0
    sources: list[str] = field(default_factory=list)

    # ── 출력 ──
    answer: str = ""
    suggestions: list[str] = field(default_factory=list)
    rfp_fields: dict = field(default_factory=dict)
    phase_trigger: str | None = None
    violation: str | None = None
    post_check_violation: str | None = None
    confidence_rejected: bool = False

    # ── 타이밍 ──
    timings: dict[str, float] = field(default_factory=dict)

    # ── 스트리밍 ──
    token_queue: asyncio.Queue | None = None


@dataclass
class AgentResult:
    """에이전트 실행 결과."""
    success: bool = True
    error: str | None = None
    duration_ms: float = 0.0


class AgentBase:
    """모든 에이전트의 기반 클래스."""
    name: str = "base"
    priority: AgentPriority = AgentPriority.NORMAL

    def __init__(self):
        self.logger = logging.getLogger(f"agent.{self.name}")

    async def execute(self, ctx: AgentContext, executor: ThreadPoolExecutor) -> AgentResult:
        raise NotImplementedError

    async def run_in_thread(self, executor: ThreadPoolExecutor, func, *args) -> Any:
        """블로킹 함수를 스레드 풀에서 실행."""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(executor, func, *args)

    def _timed_result(self, start: float, success: bool = True, error: str | None = None) -> AgentResult:
        duration = (time.time() - start) * 1000
        return AgentResult(success=success, error=error, duration_ms=duration)

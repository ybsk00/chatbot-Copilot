"""Role Detector Agent — 사용자 역할 감지 (사용자 vs 구매담당자)"""
import time
import logging
from concurrent.futures import ThreadPoolExecutor
from app.agents.base import AgentBase, AgentContext, AgentResult, AgentPriority

logger = logging.getLogger(__name__)

# ── 키워드 기반 역할 감지 (Tier 1, ~0ms) ──
_USER_KEYWORDS = [
    "구매하고", "구매하려", "구매할", "구매를 하",
    "주문하고", "주문하려", "주문할",
    "필요해", "필요합니다", "필요한",
    "사려고", "사고 싶", "사고싶",
    "렌탈하고", "렌탈하려", "렌탈할", "렌탈을 하", "렌탈 하",
    "렌탈 서비스", "렌탈서비스",
    "설치하고", "설치하려", "설치할",
    "배달해", "배송해",
    "구입하고", "구입하려", "구입할",
    "쓰고 싶", "쓰고싶", "쓰려고",
    "빌리고", "빌리려", "임대하고", "임대하려",
    "신청하고", "신청하려", "이용하고", "이용하려",
    "교육 받고", "교육받고", "교육받으려", "수강하고", "수강하려",
    "청소해", "파기해", "소독해",
    "도입하고", "도입하려", "도입할",
    "구매하고자", "렌탈하고자", "도입하고자",
    "구매하려고", "렌탈하려고", "도입하려고",
]
_PROCUREMENT_KEYWORDS = [
    "RFP", "rfp", "제안요청서", "입찰", "견적 비교", "소싱",
    "공급업체 관리", "벤더 관리", "구매 담당", "구매담당",
    "RFQ", "rfq", "제안서 평가", "낙찰", "계약 체결",
    "공급사 선정", "공급업체 선정", "업체 평가",
    "견적서", "견적요청", "견적 요청", "RFQ 작성", "RFP 작성",
    "소싱 전략", "소싱전략", "업체 선정", "경쟁견적", "입찰 공고",
    "소싱담당", "소싱 담당",
]


class RoleDetectorAgent(AgentBase):
    """사용자 역할 감지 에이전트.

    3단계:
    1. 키워드 매칭 (~0ms)
    2. 대화 이력 패턴 분석 (~0ms)
    3. 3턴 초과 시 명시적 질문 플래그
    """
    name = "role_detector"
    priority = AgentPriority.HIGH

    async def execute(self, ctx: AgentContext, executor: ThreadPoolExecutor) -> AgentResult:
        """역할 감지 실행. ctx.user_role에 결과 설정."""
        start = time.time()

        # 이미 감지된 경우 스킵
        if ctx.user_role:
            return self._timed_result(start)

        # ── Tier 1: 키워드 매칭 ──
        role = self._detect_by_keywords(ctx.message)
        if not role and ctx.history:
            # 이전 메시지도 확인
            for msg in ctx.history[-4:]:
                if msg.get("role") == "user":
                    role = self._detect_by_keywords(msg.get("content", ""))
                    if role:
                        break

        if role:
            ctx.user_role = role
            logger.info(f"[RoleDetector] Keyword match → {role}")
            return self._timed_result(start)

        # ── Tier 2: 대화 패턴 분석 ──
        role = self._detect_by_pattern(ctx)
        if role:
            ctx.user_role = role
            logger.info(f"[RoleDetector] Pattern match → {role}")
            return self._timed_result(start)

        # ── Tier 3: 턴 카운터 ──
        ctx.role_turn_count += 1
        logger.info(f"[RoleDetector] No detection. turn={ctx.role_turn_count}")
        return self._timed_result(start)

    def _detect_by_keywords(self, message: str) -> str | None:
        """키워드 기반 역할 감지.
        구매담당자 키워드를 먼저 체크 (더 명시적이므로 우선).
        양쪽 모두 매칭 시 구매담당자 우선.
        """
        if not message:
            return None
        msg = message.strip()
        # 구매담당자 키워드 먼저 (더 명시적)
        for kw in _PROCUREMENT_KEYWORDS:
            if kw in msg:
                return "procurement"
        for kw in _USER_KEYWORDS:
            if kw in msg:
                return "user"
        return None

    def _detect_by_pattern(self, ctx: AgentContext) -> str | None:
        """대화 패턴 기반 역할 감지."""
        if not ctx.history:
            return None

        user_msgs = [m.get("content", "") for m in ctx.history if m.get("role") == "user"]
        all_text = " ".join(user_msgs) + " " + ctx.message

        # 사용자 패턴: 구체적 물품/서비스 언급 + 구매 의사
        user_signals = sum(1 for kw in _USER_KEYWORDS if kw in all_text)
        proc_signals = sum(1 for kw in _PROCUREMENT_KEYWORDS if kw in all_text)

        if user_signals >= 2:
            return "user"
        if proc_signals >= 2:
            return "procurement"

        return None

    @staticmethod
    def should_ask_role(ctx: AgentContext) -> bool:
        """3턴 초과 + 역할 미감지 시 True → 프론트에서 역할 선택 카드 표시."""
        return ctx.user_role is None and ctx.role_turn_count >= 3

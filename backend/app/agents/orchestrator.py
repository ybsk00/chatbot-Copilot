"""Orchestrator Agent — 전체 에이전트 조율 + SSE 이벤트 생성"""
import asyncio
import json
import re
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
from app.agents.pr import PrAgent
from app.agents.rfq import RfqAgent
from app.agents.role_detector import RoleDetectorAgent
from app.agents.script import ScriptAgent
from app.config import RFP_AGREE_KEYWORDS, PR_AGREE_KEYWORDS, CONFIDENCE_THRESHOLD
from app.constants.rfp_schemas import RFP_SCHEMAS
from app.constants.pr_schemas import PR_SCHEMAS
from app.constants.rfq_schemas import RFQ_SCHEMAS
from app.rag.classifier import TAXONOMY

logger = logging.getLogger(__name__)


# ── 분류체계 → 키워드 맵 (사후 필터링용, 서버 시작 시 1회 빌드) ──
_TAXONOMY_KEYWORDS: dict[str, set[str]] = {}


def _build_taxonomy_keywords():
    """TAXONOMY에서 대분류별 관련 키워드 세트 생성."""
    # 여러 대분류에 등장하는 범용 키워드 제외
    _GENERIC_KEYWORDS = {
        "구매", "렌탈", "리스", "서비스", "용역", "관리", "대행",
        "수리", "유지보수", "컨설팅", "제작",
    }
    for major, middles in TAXONOMY.items():
        kws = {major}
        for m in middles:
            # 중분류 기본명 (괄호 앞)
            base = m.split("(")[0].strip()
            kws.add(base)
            # 괄호 안 소분류 키워드 (3글자 이상만, 범용 키워드 제외)
            if "(" in m and ")" in m:
                hints = m[m.index("(") + 1:m.rindex(")")]
                for kw in re.split(r"[/·,]", hints):
                    kw = kw.strip()
                    if len(kw) >= 3 and kw not in _GENERIC_KEYWORDS:
                        kws.add(kw)
        _TAXONOMY_KEYWORDS[major] = kws


_build_taxonomy_keywords()


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
        self.pr = PrAgent()
        self.rfq = RfqAgent()
        self.role_detector = RoleDetectorAgent()
        self.script = ScriptAgent()

    # RFP 유형 한국어 라벨
    _RFP_TYPE_LABELS = {
        "purchase": "구매", "service_contract": "용역",
        "service": "서비스", "rental": "렌탈·리스",
        "construction": "공사", "consulting": "컨설팅",
        "purchase_maintenance": "구매·유지보수",
        "rental_maintenance": "렌탈·유지보수",
        "purchase_lease": "구매·리스",
    }

    def _enrich_rfp_query(self, ctx: AgentContext) -> str:
        """RFP 질문을 현재 맥락으로 보강. 원본 message는 보존하고 검색용만 변경."""
        # 사업명/공사명 등 개요 필드에서 맥락 추출 (s6이 대부분 사업명)
        business_name = ctx.filled_fields.get("s6", "")
        rfp_label = self._RFP_TYPE_LABELS.get(ctx.rfp_type, "")
        prefix = f"{business_name} {rfp_label}".strip()
        if prefix:
            return f"{prefix} {ctx.message}"
        return ctx.message

    def _filter_chunks_by_classification(self, ctx: AgentContext):
        """분류 결과를 기반으로 관련 없는 청크 제거 (사후 필터링).

        Classification + Retrieval 병렬 실행 후, 분류 대분류에 맞지 않는
        청크를 제거하여 다른 카테고리의 결과가 답변에 혼입되는 것을 방지.
        """
        if not ctx.classification or not ctx.chunks:
            return

        major = ctx.classification.get("대분류")
        if not major or major not in _TAXONOMY_KEYWORDS:
            return

        keywords = _TAXONOMY_KEYWORDS[major]

        matched = []
        removed = []
        for c in ctx.chunks:
            text = f"{c.get('category', '')} {c.get('doc_name', '')}"
            if any(kw in text for kw in keywords):
                matched.append(c)
            else:
                removed.append(c.get("doc_name", "?"))

        if not matched:
            # 필터링 후 결과 없으면 원본 유지 (안전장치)
            logger.info(f"[Orchestrator] Category filter: no match for '{major}', keeping all")
            return

        if removed:
            logger.info(
                f"[Orchestrator] Category filter: kept {len(matched)}/{len(ctx.chunks)} "
                f"for '{major}', removed: {removed}"
            )

        ctx.chunks = matched
        ctx.rag_score = max(c.get("similarity", 0) for c in ctx.chunks)
        ctx.sources = list({c["doc_name"] for c in ctx.chunks})

        # 필터링 후 신뢰도 재평가
        if ctx.rag_score < CONFIDENCE_THRESHOLD:
            ctx.confidence_rejected = True

    # RFP 직접 요청 패턴 (질문 형태 제외)
    _RFP_DIRECT_PATTERNS = [
        "rfp 작성", "rfp 생성", "rfp 만들", "rfp 시작", "rfp 진행",
        "rfp작성", "rfp생성", "rfp만들", "rfp시작", "rfp진행",
        "제안요청서 작성", "제안요청서 생성", "제안요청서 만들",
    ]
    _RFP_QUESTION_MARKERS = ["뭐", "무엇", "어떻게", "왜", "?", "인가요", "인지", "알려"]

    # 자유발화 (인사/감사/잡담) → RAG 스킵
    _GREETING_PATTERNS = [
        "안녕", "하이", "헬로", "hello", "hi ", "hey",
        "감사", "고마워", "고맙", "ㄱㅅ", "ㄱㅁ", "땡큐", "thank",
        "반갑", "처음 뵙", "오랜만",
        "수고", "잘 부탁", "잘부탁",
        "ㅎㅇ", "ㅎㅎ", "ㅋㅋ", "ㄴㄴ",
        "네네", "아하", "오케이", "ok", "ㅇㅋ", "ㅇㅇ",
    ]
    _GREETING_EXACT = {
        "네", "아니요", "아니", "응", "ㅇ", "ㄴ", "넵", "넹",
        "예", "아뇨", "됐어", "괜찮아", "됐습니다",
    }
    _GREETING_RESPONSES = {
        "greeting": "안녕하세요! 간접구매 상담도우미입니다. 궁금하신 점을 질문해 주세요.",
        "thanks": "감사합니다! 추가로 궁금하신 점이 있으시면 말씀해 주세요.",
        "default": "네, 무엇을 도와드릴까요?",
    }
    _GREETING_RESPONSES_USER = {
        "greeting": "안녕하세요! 구매를 도와드리는 IP Assist입니다. 어떤 물건이나 서비스가 필요하신가요?",
        "thanks": "감사합니다! 다른 구매 관련 궁금한 점이 있으시면 편하게 말씀해 주세요.",
        "default": "네, 어떤 구매를 도와드릴까요?",
    }
    _GREETING_RESPONSES_PROCUREMENT = {
        "greeting": "안녕하세요. 구매업무 지원 어시스턴트입니다. 필요한 업무를 말씀해 주십시오.",
        "thanks": "감사합니다. 추가 업무가 있으시면 말씀해 주십시오.",
        "default": "네, 어떤 업무를 도와드릴까요?",
    }

    def _detect_freeform(self, message: str, user_role: str | None = None) -> str | None:
        """자유발화 감지 → RAG 스킵용 응답 반환 (0ms). None이면 일반 처리."""
        msg = message.strip()
        # 긴 메시지는 자유발화가 아님
        if len(msg) > 20:
            return None
        msg_lower = msg.lower()
        # 역할별 응답 세트 선택
        if user_role == "user":
            responses = self._GREETING_RESPONSES_USER
        elif user_role == "procurement":
            responses = self._GREETING_RESPONSES_PROCUREMENT
        else:
            responses = self._GREETING_RESPONSES
        # 정확 매칭
        if msg in self._GREETING_EXACT:
            return responses["default"]
        # 패턴 매칭
        for p in self._GREETING_PATTERNS:
            if p in msg_lower:
                if any(g in msg_lower for g in ("감사", "고마", "땡큐", "thank")):
                    return responses["thanks"]
                if any(g in msg_lower for g in ("안녕", "하이", "헬로", "hello", "hi", "반갑")):
                    return responses["greeting"]
                return responses["default"]
        return None

    def _get_bt_routing(self, ctx: AgentContext) -> dict | None:
        """직전 분류 결과 또는 대화 이력에서 BT 라우팅 정보 조회.

        Returns: {bt_type, gt_code, pr_action, action_buttons, dept, sla, ...}
                 또는 BT 미확인 시 None
        """
        # 1순위: 현재 classification의 l3_code
        l3_code = (ctx.classification or {}).get("l3_code")

        # 2순위: 대화 이력에서 가장 최근 l3_code 추출
        if not l3_code and ctx.history:
            for msg in reversed(ctx.history):
                meta = msg.get("metadata") or msg.get("classification") or {}
                if meta.get("l3_code"):
                    l3_code = meta["l3_code"]
                    break

        if not l3_code:
            return None

        try:
            from app.data.routing_data import get_routing_store
            store = get_routing_store()
            payload = store.build_bt_routing_payload(l3_code)
            if payload:
                # 안내 메시지도 함께 포함 (내부용, 프론트엔드에는 전달 안 함)
                payload["_user_message"] = store.get_user_message(l3_code)
            return payload
        except Exception as e:
            self.logger.warning(f"BT routing lookup failed (l3={l3_code}): {e}")
            return None

    def _detect_phase_trigger(self, message: str, phase: str, user_role: str | None = None) -> str | None:
        """키워드 기반 phase 전환 감지 (0ms)."""
        msg = message.strip()
        if phase in ("chat", "asked", "pr_asked"):
            # PR 동의 감지 — PR 키워드는 충분히 구체적이므로 역할 무관하게 먼저 체크
            if any(kw in msg for kw in PR_AGREE_KEYWORDS):
                return "pr_agreed"
            # pr_asked 상태에서 짧은 동의 응답
            if phase == "pr_asked" and any(kw in msg for kw in RFP_AGREE_KEYWORDS):
                return "pr_agreed"

            # 1. 기존 동의 키워드 (짧은 응답만 — 긴 문장은 일반 질문일 가능성)
            if any(kw in msg for kw in RFP_AGREE_KEYWORDS):
                # 질문형이거나 긴 문장이면 RFP 동의가 아닌 일반 질문으로 판단
                is_question = any(q in msg for q in self._RFP_QUESTION_MARKERS)
                is_long = len(msg) > 15
                if is_question and is_long:
                    pass  # 일반 질문 → RFP 트리거 안 함
                elif is_long and not any(kw in msg for kw in ("RFP", "rfp", "제안요청서", "작성해", "작성할", "작성하")):
                    pass  # 긴 문장인데 RFP/작성 언급 없음 → 일반 질문
                else:
                    return "rfp_agreed"
            # 2. RFP 직접 요청 ("rfp 작성해줘", "rfp 할게" 등)
            msg_lower = msg.lower()
            if any(p in msg_lower for p in self._RFP_DIRECT_PATTERNS):
                # 질문 형태면 제외 ("rfp 작성 어떻게 하나요?")
                if not any(q in msg for q in self._RFP_QUESTION_MARKERS):
                    return "rfp_agreed"
            # 3. "rfp" 단독 입력 (3글자 이하)
            if msg_lower.replace(" ", "") in ("rfp", "rfp!"):
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

        # ── GATE 1.5: 역할 감지 (~0ms) ──
        await self.role_detector.execute(ctx, self._critical_pool)
        ask_role = RoleDetectorAgent.should_ask_role(ctx)

        # ── GATE 2: Phase 감지 (~0ms) ──
        ctx.phase_trigger = self._detect_phase_trigger(ctx.message, ctx.phase, ctx.user_role)

        # PR 동의 감지 — 4-STEP 분기 라우팅 게이트 (v2)
        if ctx.phase_trigger == "pr_agreed":
            # BT 분기를 위해 Classification 선행 실행 (L3코드 필요)
            if not ctx.classification:
                try:
                    await self.classification.execute(ctx, self._critical_pool)
                except Exception as e:
                    self.logger.warning(f"PR agree pre-classification failed: {e}")
            bt_routing = self._get_bt_routing(ctx)
            b1 = (bt_routing or {}).get("branch1_path", "")
            b2 = (bt_routing or {}).get("branch2_sourcing", "")
            _msg = (bt_routing or {}).get("_user_message") or {}

            # ── 분기1-A: 카탈로그 직접발주 → PO 자동 (프로세스 종료) ──
            if b1 == "A_카탈로그직접발주":
                message = _msg.get("사용자안내", "카탈로그에서 직접 발주하세요. PR 작성이 불필요합니다.")
                yield self._sse("meta", {
                    "sources": [], "rag_score": 0,
                    "phase_trigger": "pr_blocked",
                    "classification": ctx.classification,
                    "bt_routing": {k: v for k, v in bt_routing.items() if k != "_user_message"} if bt_routing else None,
                    "user_role": ctx.user_role,
                })
                yield self._sse("token", {"content": message})
                yield self._sse("done", {})
                return

            # ── 분기1-B: 주관부서 신청 (PR 대체) ──
            if b1 == "B_주관부서신청":
                message = _msg.get("사용자안내", "이 품목은 주관부서를 통해 신청해 주세요. PR 직접 작성이 불가합니다.")
                yield self._sse("meta", {
                    "sources": [], "rag_score": 0,
                    "phase_trigger": "pr_blocked",
                    "classification": ctx.classification,
                    "bt_routing": {k: v for k, v in bt_routing.items() if k != "_user_message"} if bt_routing else None,
                    "user_role": ctx.user_role,
                })
                yield self._sse("token", {"content": message})
                yield self._sse("done", {})
                return

            # ── 분기1-D: 기존계약 확인 (있으면→PO / 없으면→PR) ──
            if b1 == "D_조건부_기존계약확인":
                message = _msg.get("사용자안내", "기존 계약 여부를 먼저 확인해 주세요. 기존 계약이 있으면 PO를 직접 생성하고, 없으면 구매요청서를 작성합니다.")
                yield self._sse("meta", {
                    "sources": [], "rag_score": 0,
                    "phase_trigger": "pr_conditional",
                    "classification": ctx.classification,
                    "bt_routing": {k: v for k, v in bt_routing.items() if k != "_user_message"} if bt_routing else None,
                    "user_role": ctx.user_role,
                })
                yield self._sse("token", {"content": message})
                yield self._sse("done", {})
                return

            # ── 분기1-E/F: PR 작성 진행 → 분기2 소싱방식 메타 포함 ──
            yield self._sse("meta", {
                "sources": [], "rag_score": 0,
                "phase_trigger": "pr_agreed",
                "classification": ctx.classification,
                "bt_routing": {k: v for k, v in bt_routing.items() if k != "_user_message"} if bt_routing else None,
                "user_role": ctx.user_role,
            })
            yield self._sse("token", {
                "content": "구매요청서 작성을 진행하겠습니다. 아래에서 구매 카테고리를 선택해 주십시오."
            })
            yield self._sse("done", {})
            return

        if ctx.phase_trigger == "rfp_agreed":
            yield self._sse("meta", {
                "sources": [], "rag_score": 0,
                "phase_trigger": ctx.phase_trigger, "classification": None,
                "user_role": ctx.user_role,
            })
            yield self._sse("token", {
                "content": "제안요청서(RFP) 작성을 진행하겠습니다. 아래에서 RFP 유형을 선택해 주십시오."
            })
            yield self._sse("done", {})
            return

        # ── GATE 3: 자유발화 감지 (~0ms, RAG 스킵) ──
        freeform_reply = self._detect_freeform(ctx.message, ctx.user_role)
        if freeform_reply:
            yield self._sse("meta", {
                "sources": [], "rag_score": 0,
                "phase_trigger": None, "classification": None,
                "user_role": ctx.user_role, "ask_role": ask_role,
            })
            yield self._sse("token", {"content": freeform_reply})
            if ctx.user_role == "user":
                freeform_cta = ["구매요청서 작성하기"]
            elif ctx.user_role == "procurement":
                freeform_cta = ["RFP 작성하기"]
            else:
                freeform_cta = ["구매요청서 작성하기", "RFP 작성하기"]
            yield self._sse("suggestions", {"items": freeform_cta})
            yield self._sse("done", {})
            logger.info(f"[Orchestrator] Freeform detected: '{ctx.message}' → skip RAG")
            return

        # ── PHASE 1: Classification + Retrieval 병렬 (~1000ms) ──
        classification_task = asyncio.create_task(
            self.classification.execute(ctx, self._critical_pool)
        )
        retrieval_task = asyncio.create_task(
            self.retrieval.execute(ctx, self._critical_pool)
        )
        await asyncio.gather(classification_task, retrieval_task)

        # ── 사후 필터링: 분류 결과로 관련 없는 청크 제거 ──
        self._filter_chunks_by_classification(ctx)

        # CTA 의도 추출
        if ctx.classification and ctx.classification.get("cta"):
            ctx.cta_intent = ctx.classification["cta"]
            logger.info(f"[Orchestrator] CTA intent: {ctx.cta_intent}")

        # ── GATE 3: 신뢰도 거부 ──
        if ctx.confidence_rejected:
            # 역할별 CTA 결정
            if ctx.user_role == "user":
                rejected_cta = ["구매요청서 작성하기"]
            elif ctx.user_role == "procurement":
                rejected_cta = ["RFP 작성하기"]
            else:
                rejected_cta = ["구매요청서 작성하기", "RFP 작성하기"]

            yield self._sse("meta", {
                "sources": [],
                "rag_score": round(ctx.rag_score, 4),
                "phase_trigger": None,
                "classification": ctx.classification,
                "user_role": ctx.user_role,
                "ask_role": ask_role,
            })
            if ctx.user_role == "user":
                rejected_msg = (
                    "죄송합니다. 해당 내용에 대한 자료를 찾지 못했습니다. "
                    "구매하려는 품목이나 서비스를 좀 더 구체적으로 말씀해 주시면 도움을 드리겠습니다."
                )
            elif ctx.user_role == "procurement":
                rejected_msg = (
                    "해당 정보를 보유 자료에서 확인하지 못했습니다. "
                    "검색 범위를 좁히거나 다른 키워드로 질문해 주십시오."
                )
            else:
                rejected_msg = (
                    "죄송합니다. 현재 보유한 자료에서 관련 정보를 찾지 못했습니다. "
                    "질문을 더 구체적으로 해주시거나, 다른 주제로 질문해 주십시오."
                )
            yield self._sse("token", {"content": rejected_msg})
            yield self._sse("suggestions", {"items": rejected_cta})
            yield self._sse("done", {})
            return

        # ── PHASE 2: 헌법 규칙 + 화법 스크립트 주입 (병렬, 임베딩 재사용) ──
        await asyncio.gather(
            self.constitution.inject_rules(ctx, self._critical_pool),
            self.script.inject_scripts(ctx, self._critical_pool),
        )

        # ── Meta 이벤트 전송 ──
        _bt_meta = self._get_bt_routing(ctx)
        yield self._sse("meta", {
            "sources": ctx.sources,
            "rag_score": round(ctx.rag_score, 4),
            "phase_trigger": ctx.phase_trigger,
            "classification": ctx.classification,
            "cta_intent": ctx.cta_intent,
            "user_role": ctx.user_role,
            "ask_role": ask_role,
            "bt_routing": {k: v for k, v in _bt_meta.items() if k != "_user_message"} if _bt_meta else None,
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

        # ── PHASE 4+5: 사후검증 + Suggestions 병렬 실행 ──
        await asyncio.gather(
            self.constitution.post_check(ctx, self._background_pool),
            self.suggestion.execute(ctx, self._background_pool),
        )
        if ctx.post_check_violation:
            # 근거 없는 수치 → 답변 끝에 경고 추가
            if "수치" in ctx.post_check_violation:
                yield self._sse("token", {
                    "content": "\n\n[안내] 위 답변에는 참조 문서에서 확인되지 않은 수치가 포함되어 있을 수 있습니다. 정확한 수치는 별도 확인이 필요합니다."
                })
            else:
                yield self._sse("token", {
                    "content": f"\n\n[안내] {ctx.post_check_violation}"
                })
        # BT 라우팅: 분기1/분기2 기반 CTA 후속질문 제어
        bt_routing = self._get_bt_routing(ctx)
        pr_blocked = bt_routing and bt_routing.get("pr_action") == "blocked"
        b2 = (bt_routing or {}).get("branch2_sourcing", "")

        # 역할별 CTA 분기
        if ctx.user_role == "user":
            ctx.suggestions = [s for s in ctx.suggestions if s != "RFP 작성하기"]
            if pr_blocked:
                # PR 차단 → 구매요청서 제거 + BT별 액션버튼
                ctx.suggestions = [s for s in ctx.suggestions if s != "구매요청서 작성하기"]
                for btn in (bt_routing.get("action_buttons") or [])[:2]:
                    if btn not in ctx.suggestions:
                        ctx.suggestions.append(btn)
            elif ctx.cta_intent in ("hot", "warm"):
                if "구매요청서 작성하기" not in ctx.suggestions:
                    ctx.suggestions.append("구매요청서 작성하기")
                # 분기2 소싱방식에 따라 RFQ/RFP 후속 안내
                if b2 == "2B_RFQ" and "견적요청서(RFQ) 작성하기" not in ctx.suggestions:
                    ctx.suggestions.append("견적요청서(RFQ) 작성하기")
                elif b2 == "2C_RFP입찰" and "제안요청서(RFP) 작성하기" not in ctx.suggestions:
                    ctx.suggestions.append("제안요청서(RFP) 작성하기")
        elif ctx.user_role == "procurement":
            ctx.suggestions = [s for s in ctx.suggestions if s != "구매요청서 작성하기"]
            if ctx.cta_intent in ("hot", "warm"):
                if b2 == "2B_RFQ" and "견적요청서(RFQ) 작성하기" not in ctx.suggestions:
                    ctx.suggestions.append("견적요청서(RFQ) 작성하기")
                elif b2 == "2C_RFP입찰" and "제안요청서(RFP) 작성하기" not in ctx.suggestions:
                    ctx.suggestions.append("제안요청서(RFP) 작성하기")
                elif "RFP 작성하기" not in ctx.suggestions:
                    ctx.suggestions.append("RFP 작성하기")
        else:
            if ctx.cta_intent in ("hot", "warm"):
                if pr_blocked:
                    for btn in (bt_routing.get("action_buttons") or [])[:2]:
                        if btn not in ctx.suggestions:
                            ctx.suggestions.append(btn)
                else:
                    if "구매요청서 작성하기" not in ctx.suggestions:
                        ctx.suggestions.append("구매요청서 작성하기")
                    if b2 == "2B_RFQ" and "견적요청서(RFQ) 작성하기" not in ctx.suggestions:
                        ctx.suggestions.append("견적요청서(RFQ) 작성하기")
                    elif b2 == "2C_RFP입찰" and "제안요청서(RFP) 작성하기" not in ctx.suggestions:
                        ctx.suggestions.append("제안요청서(RFP) 작성하기")
                    elif "RFP 작성하기" not in ctx.suggestions:
                        ctx.suggestions.append("RFP 작성하기")

        yield self._sse("suggestions", {"items": ctx.suggestions})
        yield self._sse("done", {})

        # 타이밍 로그
        ctx.timings["total_ms"] = (time.time() - total_start) * 1000
        logger.info(
            f"[Orchestrator] Total: {ctx.timings['total_ms']:.0f}ms | "
            f"CTA: {ctx.cta_intent} | "
            f"Classification: {ctx.timings.get('classification_ms', 0):.0f}ms | "
            f"Retrieval: {ctx.timings.get('retrieval_ms', 0):.0f}ms | "
            f"Constitution: {ctx.timings.get('constitution_inject_ms', 0):.0f}ms | "
            f"Script: {ctx.timings.get('script_inject_ms', 0):.0f}ms | "
            f"Generation: {ctx.timings.get('generation_ms', 0):.0f}ms | "
            f"PostCheck: {ctx.timings.get('constitution_postcheck_ms', 0):.0f}ms | "
            f"Suggestions: {ctx.timings.get('suggestion_ms', 0):.0f}ms"
        )

    async def execute_sync(self, ctx: AgentContext) -> dict:
        """동기 실행 (filling phase용) — 의도 기반 에이전트 라우팅."""
        total_start = time.time()

        # ── GATE 1: 헌법 사전검사 ──
        await self.constitution.pre_check(ctx, self._critical_pool)
        if ctx.violation:
            return {
                "answer": ctx.violation, "sources": [], "rag_score": 0,
                "phase_trigger": None, "rfp_fields": {}, "classification": None,
            }

        # ── PHASE 1: 의도 감지 (선행, ~0-300ms) ──
        await self.classification.detect_filling_intent(ctx, self._critical_pool)

        # ── PHASE 2: 의도별 에이전트 라우팅 ──
        if ctx.filling_intent == "field_input":
            # 필드 입력 → RFP만 크리티컬, Classification/Retrieval 스킵
            await self.rfp.extract_fields(ctx, self._critical_pool)
        elif ctx.filling_intent == "question":
            # 일반 질문 → Retrieval + RFP 병렬 (질문에 필드 포함 가능)
            await asyncio.gather(
                self.retrieval.execute(ctx, self._critical_pool),
                self.rfp.extract_fields(ctx, self._critical_pool),
                self.classification.execute(ctx, self._background_pool),
            )
        elif ctx.filling_intent == "rfp_question":
            # RFP 개념 질문 → 검색 쿼리를 현재 RFP 맥락으로 보강
            # 예: "품질기준이 뭔가요?" → "사무실인테리어 공사 품질기준이 뭔가요?"
            original_message = ctx.message
            ctx.message = self._enrich_rfp_query(ctx)
            await asyncio.gather(
                self.retrieval.execute(ctx, self._critical_pool),
                self.rfp.extract_fields(ctx, self._background_pool),
                self.classification.execute(ctx, self._background_pool),
            )
            ctx.message = original_message  # Generation에는 원본 질문 사용
        else:
            # 폴백 → 전부 실행
            await asyncio.gather(
                self.classification.execute(ctx, self._critical_pool),
                self.rfp.extract_fields(ctx, self._critical_pool),
                self.retrieval.execute(ctx, self._critical_pool),
            )

        # ── 사후 필터링: 분류 결과로 관련 없는 청크 제거 ──
        self._filter_chunks_by_classification(ctx)

        # ── PHASE 3: 새 필드 머지 + 완성 여부 판단 ──
        trigger = None
        if ctx.phase == "filling":
            new_fields = ctx.rfp_fields.get("rfp_fields", {})
            schema = RFP_SCHEMAS.get(ctx.rfp_type, RFP_SCHEMAS["service_contract"])

            if new_fields:
                # 안전장치: 이전 섹션이 비어있는데 뒤 섹션 필드를 추출한 경우 제거
                # (LLM 할루시네이션 방지 — 요청하지 않은 섹션 필드 차단)
                already_filled = set(k for k, v in ctx.filled_fields.items() if v)
                all_field_keys = [
                    p.split(":")[0].strip()
                    for p in schema["fields"].split(", ")
                    if ":" in p
                ]
                safe_fields = {}
                for k, v in new_fields.items():
                    if not v:
                        continue
                    # 이 필드보다 앞에 있는 필드 중 비어있는 게 2개 이상이면 의심
                    idx = all_field_keys.index(k) if k in all_field_keys else -1
                    if idx >= 0:
                        preceding_empty = sum(
                            1 for pk in all_field_keys[:idx]
                            if pk not in already_filled and pk not in new_fields
                        )
                        if preceding_empty >= 3:
                            logger.warning(
                                f"[Orchestrator] Skipping hallucinated field {k}={v} "
                                f"({preceding_empty} preceding fields empty)"
                            )
                            continue
                    safe_fields[k] = v

                for k, v in safe_fields.items():
                    ctx.filled_fields[k] = v
                # rfp_fields도 안전한 것만 남김
                ctx.rfp_fields["rfp_fields"] = safe_fields

            required_keys = set(k.strip() for k in schema["required"].split(","))
            all_filled = set(k for k, v in ctx.filled_fields.items() if v)
            if required_keys.issubset(all_filled):
                trigger = "complete"
                ctx.phase = "complete"  # Generation이 complete 프롬프트 사용
                logger.info(f"[Orchestrator] RFP complete! required={required_keys}, filled={all_filled}")
            else:
                missing = required_keys - all_filled
                logger.info(f"[Orchestrator] RFP not complete. missing={missing}")

        # ── PHASE 4: 헌법 규칙 + 화법 스크립트 주입 (Retrieval 실행 시만) ──
        if ctx.query_embedding:
            await asyncio.gather(
                self.constitution.inject_rules(ctx, self._critical_pool),
                self.script.inject_scripts(ctx, self._critical_pool),
            )

        # ── PHASE 5: 답변 생성 ──
        await self.generation.execute(ctx, self._critical_pool)

        # ── PHASE 6: 사후검증 ──
        await self.constitution.post_check(ctx, self._background_pool)
        if ctx.post_check_violation:
            ctx.answer += f"\n\n[안내] {ctx.post_check_violation}"

        # ── 타이밍 로그 ──
        total_ms = (time.time() - total_start) * 1000
        logger.info(
            f"[Orchestrator:filling] Intent: {ctx.filling_intent} | "
            f"IntentDetect: {ctx.timings.get('filling_intent_ms', 0):.0f}ms | "
            f"RFP: {ctx.timings.get('rfp_extract_ms', 0):.0f}ms | "
            f"Retrieval: {ctx.timings.get('retrieval_ms', 0):.0f}ms | "
            f"Generation: {ctx.timings.get('generation_ms', 0):.0f}ms | "
            f"Total: {total_ms:.0f}ms"
        )

        return {
            "answer": ctx.answer,
            "sources": ctx.sources,
            "rag_score": round(ctx.rag_score, 4),
            "phase_trigger": trigger,
            "rfp_fields": ctx.rfp_fields.get("rfp_fields", {}),
            "classification": ctx.classification,
        }

    async def execute_sync_pr(self, ctx: AgentContext) -> dict:
        """동기 실행 (pr_filling phase용) — 구매요청서 필드 추출.

        성능 최적화:
        - 의도감지 + PR추출 병렬 (~1000ms, 순차→병렬)
        - field_input 시 Retrieval/Constitution/PostCheck 전부 스킵
        - question 시만 Retrieval 실행
        """
        total_start = time.time()

        # ── GATE 1: 헌법 사전검사 (~0ms, 키워드) ──
        await self.constitution.pre_check(ctx, self._critical_pool)
        if ctx.violation:
            return {
                "answer": ctx.violation, "sources": [], "rag_score": 0,
                "phase_trigger": None, "pr_fields": {}, "classification": None,
            }

        # ── PHASE 1+2: 의도 감지 + PR 추출 병렬 (~1000ms) ──
        # PR 추출은 항상 필요하므로 의도 감지와 동시에 시작
        await asyncio.gather(
            self.classification.detect_filling_intent(ctx, self._critical_pool),
            self.pr.extract_fields(ctx, self._critical_pool),
        )

        # ── Retrieval: PR에서는 field_input 포함 모든 의도에서 RAG 검색 (역제안용) ──
        await self.retrieval.execute(ctx, self._critical_pool)

        # ── PHASE 3: 새 필드 머지 + 완성 여부 판단 ──
        trigger = None
        if ctx.phase == "pr_filling":
            new_fields = ctx.pr_fields.get("pr_fields", {})
            schema = PR_SCHEMAS.get(ctx.pr_type, PR_SCHEMAS["_generic"])

            if new_fields:
                already_filled = set(k for k, v in ctx.filled_fields.items() if v)
                all_field_keys = [
                    p.split(":")[0].strip()
                    for p in schema["fields"].split(", ")
                    if ":" in p
                ]
                safe_fields = {}
                for k, v in new_fields.items():
                    if not v:
                        continue
                    idx = all_field_keys.index(k) if k in all_field_keys else -1
                    if idx >= 0:
                        preceding_empty = sum(
                            1 for pk in all_field_keys[:idx]
                            if pk not in already_filled and pk not in new_fields
                        )
                        if preceding_empty >= 3:
                            logger.warning(
                                f"[Orchestrator:PR] Skipping hallucinated field {k}={v}"
                            )
                            continue
                    safe_fields[k] = v

                for k, v in safe_fields.items():
                    ctx.filled_fields[k] = v
                ctx.pr_fields["pr_fields"] = safe_fields

            required_keys = set(k.strip() for k in schema["required"].split(","))
            all_filled = set(k for k, v in ctx.filled_fields.items() if v)
            if required_keys.issubset(all_filled):
                trigger = "pr_complete"
                ctx.phase = "pr_complete"
                logger.info(f"[Orchestrator:PR] PR complete! required={required_keys}, filled={all_filled}")
            else:
                missing = required_keys - all_filled
                logger.info(f"[Orchestrator:PR] PR not complete. missing={missing}")

        # ── PHASE 4: 답변 생성 (역제안을 위해 항상 헌법 주입) ──
        if ctx.query_embedding:
            await self.constitution.inject_rules(ctx, self._background_pool)

        await self.generation.execute(ctx, self._critical_pool)

        # ── 타이밍 로그 ──
        total_ms = (time.time() - total_start) * 1000
        logger.info(
            f"[Orchestrator:pr_filling] Intent: {ctx.filling_intent} | "
            f"IntentDetect: {ctx.timings.get('filling_intent_ms', 0):.0f}ms | "
            f"PR: {ctx.timings.get('pr_extract_ms', 0):.0f}ms | "
            f"Retrieval: {ctx.timings.get('retrieval_ms', 0):.0f}ms | "
            f"Generation: {ctx.timings.get('generation_ms', 0):.0f}ms | "
            f"Total: {total_ms:.0f}ms"
        )

        return {
            "answer": ctx.answer,
            "sources": ctx.sources,
            "rag_score": round(ctx.rag_score, 4),
            "phase_trigger": trigger,
            "pr_fields": ctx.pr_fields.get("pr_fields", {}),
            "classification": ctx.classification,
        }

    async def execute_sync_rfq(self, ctx: AgentContext) -> dict:
        """동기 실행 (rfq_filling phase용) — 견적서 필드 추출.
        execute_sync_pr과 동일 패턴, RFQ 에이전트 사용.
        """
        total_start = time.time()

        # ── GATE 1: 헌법 사전검사 ──
        await self.constitution.pre_check(ctx, self._critical_pool)
        if ctx.violation:
            return {
                "answer": ctx.violation, "sources": [], "rag_score": 0,
                "phase_trigger": None, "rfq_fields": {}, "classification": None,
            }

        # ── PHASE 1+2: 의도 감지 + RFQ 추출 병렬 ──
        await asyncio.gather(
            self.classification.detect_filling_intent(ctx, self._critical_pool),
            self.rfq.extract_fields(ctx, self._critical_pool),
        )

        # ── question일 때만 Retrieval ──
        if ctx.filling_intent in ("question", "rfp_question"):
            await self.retrieval.execute(ctx, self._critical_pool)

        # ── PHASE 3: 필드 머지 + 완성 여부 ──
        trigger = None
        if ctx.phase == "rfq_filling":
            new_fields = ctx.rfq_fields.get("rfq_fields", {})
            schema = RFQ_SCHEMAS.get(ctx.rfq_type, RFQ_SCHEMAS["_generic"])

            if new_fields:
                already_filled = set(k for k, v in ctx.filled_fields.items() if v)
                all_field_keys = [
                    p.split(":")[0].strip()
                    for p in schema["fields"].split(", ")
                    if ":" in p
                ]
                safe_fields = {}
                for k, v in new_fields.items():
                    if not v:
                        continue
                    idx = all_field_keys.index(k) if k in all_field_keys else -1
                    if idx >= 0:
                        preceding_empty = sum(
                            1 for pk in all_field_keys[:idx]
                            if pk not in already_filled and pk not in new_fields
                        )
                        if preceding_empty >= 3:
                            logger.warning(
                                f"[Orchestrator:RFQ] Skipping hallucinated field {k}={v}"
                            )
                            continue
                    safe_fields[k] = v

                for k, v in safe_fields.items():
                    ctx.filled_fields[k] = v
                ctx.rfq_fields["rfq_fields"] = safe_fields

            required_keys = set(k.strip() for k in schema["required"].split(","))
            all_filled = set(k for k, v in ctx.filled_fields.items() if v)
            if required_keys.issubset(all_filled):
                trigger = "rfq_complete"
                ctx.phase = "rfq_complete"

        # ── PHASE 4: 답변 생성 ──
        if ctx.filling_intent in ("question", "rfp_question") and ctx.query_embedding:
            await self.constitution.inject_rules(ctx, self._background_pool)

        await self.generation.execute(ctx, self._critical_pool)

        total_ms = (time.time() - total_start) * 1000
        logger.info(
            f"[Orchestrator:rfq_filling] Total: {total_ms:.0f}ms"
        )

        return {
            "answer": ctx.answer,
            "sources": ctx.sources,
            "rag_score": round(ctx.rag_score, 4),
            "phase_trigger": trigger,
            "rfq_fields": ctx.rfq_fields.get("rfq_fields", {}),
            "classification": ctx.classification,
        }

    @staticmethod
    def _sse(event_type: str, data: dict) -> str:
        """SSE 이벤트 포맷."""
        payload = {"type": event_type, **data}
        return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"

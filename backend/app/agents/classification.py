"""Classification Agent — 의도파악 + 분류체계 매핑 + Filling 의도 감지"""
import re
import json
import time
from concurrent.futures import ThreadPoolExecutor
from google import genai
from app.agents.base import AgentBase, AgentContext, AgentResult, AgentPriority
from app.rag.classifier import classify_intent
from app.config import GOOGLE_API_KEY, MODELS

# ── Filling 의도 감지용 패턴 ──
QUESTION_MARKERS = [
    "?", "뭔가요", "뭐에요", "뭐야", "무엇", "어떻게", "왜", "얼마",
    "알려주세요", "알려줘", "설명해", "뭘 넣", "뭘 적", "뭘 써",
    "어떤 것", "무슨", "몇", "언제", "어디", "있나요", "인가요",
    "차이가", "차이점", "비교", "종류", "의미",
    "할 수 있", "할수있", "가능한가", "되나요",
]

RFP_CONCEPT_MARKERS = [
    "뭔가요", "뭐에요", "의미", "뭘 넣", "뭘 적", "뭘 써",
    "어떤 것을 적", "어떻게 작성", "어떻게 입력", "예시",
    "기준이 뭐", "기준이 어떻게",
]

FIELD_DATA_PATTERNS = [
    r"[\w.+-]+@[\w-]+\.[\w.]+",                    # 이메일
    r"\d{2,3}[-.\s]?\d{3,4}[-.\s]?\d{4}",         # 전화번호
    r"\d{4}[-./]\d{1,2}[-./]\d{1,2}",             # 날짜
    r"^\d+[명개건대원만억천]",                       # 숫자+단위
]

INTENT_PROMPT = """사용자가 RFP 작성 중입니다. 아래 메시지의 의도를 판단하세요.
JSON만 반환. 설명 없이.

의도 유형:
- "field_input": RFP 필드 정보 제공 (이름, 기관명, 날짜, 금액, 사양 등 데이터)
- "question": 일반 도메인 질문 (구매 절차, 규정, 차량 종류 등에 대한 질문)
- "rfp_question": RFP 필드 개념 질문 ("대상규모가 뭔가요?", "SLA 기준 알려주세요" 등)

[이전 AI 메시지]
{last_ai_msg}

[사용자 메시지]
{message}

출력: {{"intent": "..."}}"""


class ClassificationAgent(AgentBase):
    """의도 분류 에이전트. 레이턴시 예산: <800ms"""
    name = "classification"
    priority = AgentPriority.HIGH

    def __init__(self):
        super().__init__()
        self._client = None

    def _get_client(self):
        if self._client is None:
            self._client = genai.Client(api_key=GOOGLE_API_KEY)
        return self._client

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

    async def detect_filling_intent(self, ctx: AgentContext, executor: ThreadPoolExecutor) -> AgentResult:
        """Filling phase 의도 감지. 키워드 ~0ms / LLM 폴백 ~300ms."""
        start = time.time()
        msg = ctx.message.strip()

        # Tier 1: 키워드 기반 빠른 감지
        intent = self._keyword_intent(msg)
        if intent:
            ctx.filling_intent = intent
            ctx.timings["filling_intent_ms"] = (time.time() - start) * 1000
            self.logger.info(f"[Intent:keyword] '{msg[:30]}...' → {intent}")
            return self._timed_result(start)

        # Tier 2: LLM 폴백 (애매한 경우)
        try:
            intent = await self.run_in_thread(
                executor, self._llm_intent, msg, ctx.history
            )
            ctx.filling_intent = intent or "field_input"
        except Exception as e:
            self.logger.warning(f"Intent LLM fallback failed: {e}")
            ctx.filling_intent = "field_input"

        ctx.timings["filling_intent_ms"] = (time.time() - start) * 1000
        self.logger.info(f"[Intent:llm] '{msg[:30]}...' → {ctx.filling_intent}")
        return self._timed_result(start)

    def _keyword_intent(self, message: str) -> str | None:
        """Tier 1: 키워드/패턴 기반 감지. 확실한 경우만 반환, 애매하면 None."""
        has_question = any(marker in message for marker in QUESTION_MARKERS)
        has_data = any(re.search(pat, message) for pat in FIELD_DATA_PATTERNS)

        # 명확한 질문 (데이터 패턴 없음)
        if has_question and not has_data:
            if any(m in message for m in RFP_CONCEPT_MARKERS):
                return "rfp_question"
            return "question"

        # 명확한 데이터 입력 (질문 마커 없음)
        if has_data and not has_question:
            return "field_input"

        # 짧은 메시지 + 질문 아님 → 필드 입력 가능성 높음
        if len(message) < 60 and not has_question:
            return "field_input"

        # 애매 → None (LLM 폴백)
        return None

    def _llm_intent(self, message: str, history: list[dict]) -> str:
        """Tier 2: LLM 기반 의도 분류 (애매한 메시지용)."""
        last_ai = ""
        if history:
            for msg in reversed(history):
                if msg.get("role") == "assistant":
                    last_ai = msg.get("content", "")[:200]
                    break

        prompt = INTENT_PROMPT.format(
            last_ai_msg=last_ai or "(없음)",
            message=message,
        )
        response = self._get_client().models.generate_content(
            model=MODELS["refinement"],
            contents=prompt,
            config={"max_output_tokens": 30},
        )
        text = response.text.strip()
        if text.startswith("```"):
            text = re.sub(r"```json?\s*", "", text)
            text = re.sub(r"```\s*$", "", text)
        result = json.loads(text)
        return result.get("intent", "field_input")

"""RFP Agent — RFP 필드 추출 + 문서 생성"""
import json
import re
import time
from concurrent.futures import ThreadPoolExecutor
from google import genai
from app.agents.base import AgentBase, AgentContext, AgentResult, AgentPriority
from app.config import GOOGLE_API_KEY, MODELS
from app.constants.rfp_schemas import RFP_SCHEMAS, PHASE_PROMPT


class RfpAgent(AgentBase):
    """RFP 필드 추출 에이전트. filling phase 전용. 레이턴시 예산: <1500ms"""
    name = "rfp"
    priority = AgentPriority.NORMAL

    def __init__(self):
        super().__init__()
        self._client = None

    def _get_client(self):
        if self._client is None:
            self._client = genai.Client(api_key=GOOGLE_API_KEY)
        return self._client

    async def extract_fields(self, ctx: AgentContext, executor: ThreadPoolExecutor) -> AgentResult:
        """사용자 메시지에서 RFP 필드 추출 (flash-lite)."""
        start = time.time()
        if ctx.phase != "filling":
            return self._timed_result(start)

        try:
            schema = RFP_SCHEMAS.get(ctx.rfp_type, RFP_SCHEMAS["service_contract"])
            filled_keys = ", ".join(ctx.filled_fields.keys()) if ctx.filled_fields else "없음"

            history_text = ""
            for msg in (ctx.history or [])[-4:]:
                role = "사용자" if msg.get("role") == "user" else "AI"
                history_text += f"{role}: {msg.get('content', '')}\n"

            prompt = PHASE_PROMPT.format(
                fields=schema["fields"],
                required_keys=schema["required"],
                phase=ctx.phase,
                filled_keys=filled_keys,
                history=history_text or "(없음)",
                message=ctx.message,
            )

            def _extract():
                response = self._get_client().models.generate_content(
                    model=MODELS["refinement"],
                    contents=prompt,
                )
                text = response.text.strip()
                if text.startswith("```"):
                    text = re.sub(r"```json?\s*", "", text)
                    text = re.sub(r"```\s*$", "", text)
                return json.loads(text)

            result = await self.run_in_thread(executor, _extract)
            ctx.rfp_fields = result
            ctx.timings["rfp_extract_ms"] = (time.time() - start) * 1000
            return self._timed_result(start)
        except Exception as e:
            self.logger.warning(f"RFP field extraction failed: {e}")
            ctx.rfp_fields = {"rfp_fields": {}, "is_complete": False}
            return self._timed_result(start, success=False, error=str(e))

"""RFQ Agent — 견적서 필드 추출 (pr.py 패턴 복제)"""
import json
import re
import time
from concurrent.futures import ThreadPoolExecutor
from google import genai
from google.genai import types
from app.agents.base import AgentBase, AgentContext, AgentResult, AgentPriority
from app.config import GOOGLE_API_KEY, MODELS
from app.constants.rfq_schemas import RFQ_SCHEMAS, RFQ_PHASE_PROMPT


class RfqAgent(AgentBase):
    """견적서(RFQ) 필드 추출 에이전트. rfq_filling phase 전용."""
    name = "rfq"
    priority = AgentPriority.NORMAL

    def __init__(self):
        super().__init__()
        self._client = None

    def _get_client(self):
        if self._client is None:
            self._client = genai.Client(api_key=GOOGLE_API_KEY)
        return self._client

    def _get_current_section_fields(self, schema: dict, filled_fields: dict) -> str:
        sections_detail = schema.get("sections_detail", "")
        if not sections_detail:
            return schema["fields"]

        all_fields = schema["fields"]
        filled_keys = set(k for k, v in filled_fields.items() if v)

        sections = sections_detail.split("|")
        active_fields = []
        found_incomplete = False

        for sec in sections:
            if ":" not in sec:
                continue
            sec_name, field_keys_str = sec.split(":", 1)
            sec_field_keys = [k.strip() for k in field_keys_str.split(",")]
            sec_complete = all(k in filled_keys for k in sec_field_keys)

            if not sec_complete or found_incomplete:
                for fk in sec_field_keys:
                    for pair in all_fields.split(", "):
                        if pair.startswith(f"{fk}:"):
                            active_fields.append(pair)
                            break
                if not found_incomplete:
                    found_incomplete = True
                else:
                    break

        return ", ".join(active_fields) if active_fields else all_fields

    async def extract_fields(self, ctx: AgentContext, executor: ThreadPoolExecutor) -> AgentResult:
        """사용자 메시지에서 RFQ 필드 추출."""
        start = time.time()
        if ctx.phase != "rfq_filling":
            return self._timed_result(start)

        try:
            schema = RFQ_SCHEMAS.get(ctx.rfq_type, RFQ_SCHEMAS["_generic"])

            active_fields = self._get_current_section_fields(schema, ctx.filled_fields)

            if ctx.filled_fields:
                field_labels = {}
                for pair in schema["fields"].split(", "):
                    parts = pair.split(":")
                    if len(parts) == 2:
                        field_labels[parts[0].strip()] = parts[1].strip()
                filled_keys = ", ".join(
                    f"{k}({field_labels.get(k, k)})" for k in ctx.filled_fields.keys()
                )
            else:
                filled_keys = "없음"

            history_text = ""
            for msg in (ctx.history or [])[-4:]:
                role = "사용자" if msg.get("role") == "user" else "AI"
                history_text += f"{role}: {msg.get('content', '')}\n"

            prompt = RFQ_PHASE_PROMPT.format(
                fields=active_fields,
                sections=schema.get("sections", ""),
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
                    config=types.GenerateContentConfig(
                        max_output_tokens=200,
                        temperature=0.1,
                        thinking_config=types.ThinkingConfig(thinking_budget=0),
                    ),
                )
                text = response.text.strip()
                if text.startswith("```"):
                    text = re.sub(r"```json?\s*", "", text)
                    text = re.sub(r"```\s*$", "", text)
                return json.loads(text)

            result = await self.run_in_thread(executor, _extract)
            ctx.rfq_fields = result
            ctx.timings["rfq_extract_ms"] = (time.time() - start) * 1000
            return self._timed_result(start)
        except Exception as e:
            self.logger.warning(f"RFQ field extraction failed: {e}")
            ctx.rfq_fields = {"rfq_fields": {}, "is_complete": False}
            return self._timed_result(start, success=False, error=str(e))

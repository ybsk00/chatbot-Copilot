"""PR Agent — 구매요청서 필드 추출 (rfp.py 패턴 복제)"""
import json
import re
import time
from concurrent.futures import ThreadPoolExecutor
from google import genai
from google.genai import types
from app.agents.base import AgentBase, AgentContext, AgentResult, AgentPriority
from app.config import GOOGLE_API_KEY, MODELS
from app.constants.pr_schemas import PR_SCHEMAS, PR_PHASE_PROMPT


class PrAgent(AgentBase):
    """구매요청서(PR) 필드 추출 에이전트. pr_filling phase 전용."""
    name = "pr"
    priority = AgentPriority.NORMAL

    def __init__(self):
        super().__init__()
        self._client = None

    def _get_client(self):
        if self._client is None:
            self._client = genai.Client(api_key=GOOGLE_API_KEY)
        return self._client

    def _get_current_section_fields(self, schema: dict, filled_fields: dict) -> str:
        """현재 진행 중인 섹션의 필드만 반환 (프롬프트 토큰 절약)."""
        sections_detail = schema.get("sections_detail", "")
        if not sections_detail:
            return schema["fields"]

        all_fields = schema["fields"]
        filled_keys = set(k for k, v in filled_fields.items() if v)

        # 섹션별로 순회하여 아직 미완료인 첫 번째 섹션 + 그 다음 섹션의 필드만 반환
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
                # 이 섹션의 필드를 포함
                for fk in sec_field_keys:
                    # all_fields에서 해당 필드의 label 추출
                    for pair in all_fields.split(", "):
                        if pair.startswith(f"{fk}:"):
                            active_fields.append(pair)
                            break
                if not found_incomplete:
                    found_incomplete = True
                else:
                    break  # 다음 섹션까지만

        return ", ".join(active_fields) if active_fields else all_fields

    async def extract_fields(self, ctx: AgentContext, executor: ThreadPoolExecutor) -> AgentResult:
        """사용자 메시지에서 PR 필드 추출."""
        start = time.time()
        if ctx.phase != "pr_filling":
            return self._timed_result(start)

        try:
            schema = PR_SCHEMAS.get(ctx.pr_type, PR_SCHEMAS["_generic"])

            # 현재 섹션 필드만 추출 (프롬프트 토큰 절약 → 속도 향상)
            active_fields = self._get_current_section_fields(schema, ctx.filled_fields)

            # 라벨+값 포맷으로 채워진 필드 전달
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
            for msg in (ctx.history or [])[-4:]:  # 6→4 히스토리 축소 (토큰 절약)
                role = "사용자" if msg.get("role") == "user" else "AI"
                history_text += f"{role}: {msg.get('content', '')}\n"

            prompt = PR_PHASE_PROMPT.format(
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
                    model=MODELS["refinement"],  # flash-lite: 속도 우선 (PR은 필드 구조가 단순)
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
            ctx.pr_fields = result
            ctx.timings["pr_extract_ms"] = (time.time() - start) * 1000
            return self._timed_result(start)
        except Exception as e:
            self.logger.warning(f"PR field extraction failed: {e}")
            ctx.pr_fields = {"pr_fields": {}, "is_complete": False}
            return self._timed_result(start, success=False, error=str(e))

"""Grounding Validator — 할루시네이션 탐지"""
import re


class GroundingValidator:
    """생성된 답변이 검색된 청크에 근거하는지 검증.

    검증 전략:
    1. 토큰 오버랩: 답변 토큰의 30% 이상이 청크에 존재해야 함
    2. 숫자 검증: 답변의 3자리 이상 숫자가 청크에 존재해야 함
    3. 공급업체 추천 감지
    4. 헌법 규칙 준수 확인
    """

    def compute_overlap(self, answer: str, chunks: list[dict]) -> float:
        """답변-청크 토큰 오버랩 비율 계산."""
        if not answer or not chunks:
            return 0.0

        answer_tokens = set(self._tokenize(answer))
        chunk_tokens = set()
        for chunk in chunks:
            chunk_tokens.update(self._tokenize(chunk.get("content", "")))

        if not answer_tokens:
            return 0.0

        overlap = answer_tokens & chunk_tokens
        return len(overlap) / len(answer_tokens)

    def validate(self, answer: str, chunks: list[dict], rules: list[dict], cta_intent: str = "cold") -> dict:
        """전체 검증. grounded=False면 경고 메시지 반환."""
        if not answer:
            return {"grounded": True, "message": None}

        issues = []

        # 1. 토큰 오버랩 (짧은 답변은 토큰이 적어 overlap이 부정확 → 스킵)
        # CTA hot/warm: 역제안·비교분석은 문서를 재구성한 답변이므로 오버랩 검증 스킵
        answer_tokens = self._tokenize(answer)
        overlap = self.compute_overlap(answer, chunks)
        if cta_intent not in ("hot", "warm") and len(answer_tokens) >= 20 and overlap < 0.30:
            issues.append(
                f"답변의 근거 문서 기반율이 낮습니다 ({overlap:.0%}). "
                "참조 문서를 재확인하시기 바랍니다."
            )

        # 2. 숫자 검증
        answer_numbers = set(re.findall(r"\d+(?:\.\d+)?", answer))
        chunk_text = " ".join(c.get("content", "") for c in chunks)
        chunk_numbers = set(re.findall(r"\d+(?:\.\d+)?", chunk_text))

        ungrounded_numbers = answer_numbers - chunk_numbers
        # 일반적인 숫자(연도, 작은 수) 제외
        significant = set()
        for n in ungrounded_numbers:
            try:
                val = float(n)
                if len(n) >= 3 and not (1900 <= val <= 2030):
                    significant.add(n)
            except ValueError:
                pass
        if significant:
            issues.append("답변에 근거 문서에 없는 수치가 포함되어 있을 수 있습니다.")

        # 3. 헌법 규칙 준수
        for rule in rules:
            content = rule.get("content", "")
            rule_type = rule.get("rule_type", "")
            if rule_type == "거부조건":
                if "공급업체" in content and self._mentions_specific_supplier(answer):
                    issues.append("특정 공급업체를 추천하는 내용이 감지되었습니다.")
                if "개인정보" in content and self._contains_pii(answer):
                    issues.append("개인정보가 포함되어 있을 수 있습니다.")

        if issues:
            return {"grounded": False, "message": issues[0]}
        return {"grounded": True, "message": None}

    @staticmethod
    def _tokenize(text: str) -> list[str]:
        """공백 기준 토큰화 (2글자 이상)."""
        return [t for t in text.split() if len(t) >= 2]

    @staticmethod
    def _mentions_specific_supplier(text: str) -> bool:
        """특정 업체명 패턴 탐지 (휴리스틱)."""
        patterns = [
            r"(?:주식회사|㈜|주\))\s*\S+",
            r"\S+(?:코리아|솔루션즈|테크|시스템즈|서비스)\b",
        ]
        return any(re.search(p, text) for p in patterns)

    @staticmethod
    def _contains_pii(text: str) -> bool:
        """PII 패턴 탐지."""
        patterns = [
            r"\d{6}[-]\d{7}",            # 주민등록번호
            r"\d{3}[-]\d{4}[-]\d{4}",    # 전화번호
        ]
        return any(re.search(p, text) for p in patterns)

import re
from google import genai
from app.config import GOOGLE_API_KEY, MODELS

_client = None


def _get_client():
    global _client
    if _client is None:
        _client = genai.Client(api_key=GOOGLE_API_KEY)
    return _client

REFINE_PROMPT = """다음 텍스트는 PDF에서 추출한 원본입니다.
아래 규칙에 따라 정제하여 반환하세요.

규칙:
1. 페이지 번호, 헤더/푸터, 목차 라인 제거
2. 불완전한 문장 (단어 3개 미만) 제거
3. 중복 공백, 특수문자 정리
4. 표에서 추출된 데이터는 "항목: 값" 형식으로 변환
5. 원본 의미를 절대 변경하지 말 것
6. 정제된 텍스트만 반환 (설명 없이)

원본:
{text}
"""


def refine_chunk(raw_text: str) -> str:
    """Flash-Lite로 청크 정제"""
    response = _get_client().models.generate_content(
        model=MODELS["refinement"],
        contents=REFINE_PROMPT.format(text=raw_text),
    )
    return response.text.strip()


QUESTION_PROMPT = """아래 텍스트의 핵심 내용을 묻는 자연스러운 한국어 질문 1개만 생성하세요.
질문만 반환하세요. 설명이나 번호 없이 질문 1줄만.

텍스트:
{text}
"""


def generate_chunk_question(content: str) -> str:
    """청크 내용에 대한 대표 질문 1개 생성 (검색 정확도 향상용)"""
    try:
        response = _get_client().models.generate_content(
            model=MODELS["refinement"],
            contents=QUESTION_PROMPT.format(text=content[:500]),
            config={"max_output_tokens": 100},
        )
        q = response.text.strip()
        # 번호나 불필요한 접두사 제거
        q = re.sub(r'^[\d.\-)\s]+', '', q).strip()
        if q and len(q) >= 5:
            return q
    except Exception:
        pass
    return ""

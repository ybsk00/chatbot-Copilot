import pdfplumber
import re
from pathlib import Path

TARGET_CHARS = 500
OVERLAP_SENTENCES = 1

# 한국어 문장 종결 패턴 (줄 끝 기준)
_SENT_TERMINATORS = re.compile(
    r'[.!?]$'
    r'|다\.$|요\.$|니다\.$|합니다\.$|입니다\.$|세요\.$'
    r'|까요\?$|나요\?$|데요\.$|네요\.$|거든요\.$'
)

# 문장 분할용 (텍스트 내부)
_SENTENCE_SPLIT = re.compile(
    r'(?<=[.!?])\s+'
    r'|(?<=다\.)\s+'
    r'|(?<=요\.)\s+'
    r'|(?<=니다\.)\s+'
    r'|(?<=합니다\.)\s+'
    r'|(?<=입니다\.)\s+'
    r'|(?<=세요\.)\s+'
    r'|(?<=까요\?)\s+'
    r'|(?<=나요\?)\s+'
    r'|(?<=데요\.)\s+'
    r'|(?<=네요\.)\s+'
)

# 폴백 분할: 쉼표, 세미콜론 뒤에서 끊기
_FALLBACK_SPLIT = re.compile(r'(?<=[,;·])\s+')


def _join_broken_lines(text: str) -> str:
    """PDF 줄바꿈으로 잘린 문장을 연결
    - 줄이 문장 종결 패턴으로 끝나면 → 문단 구분 (줄바꿈 유지)
    - 그렇지 않으면 → 같은 문장 (공백으로 연결)
    """
    lines = text.split('\n')
    merged = []
    current = ""

    for line in lines:
        line = line.strip()
        if not line:
            # 빈 줄 = 문단 구분
            if current:
                merged.append(current)
                current = ""
            continue

        if current:
            # 이전 줄이 문장 종결로 끝났는지 확인
            if _SENT_TERMINATORS.search(current):
                merged.append(current)
                current = line
            else:
                # 문장 중간 줄바꿈 → 공백으로 연결
                current = current + " " + line
        else:
            current = line

    if current:
        merged.append(current)

    return '\n'.join(merged)


def split_sentences(text: str) -> list[str]:
    """텍스트를 문장 단위로 분할 (PDF 줄바꿈 보정 포함)"""
    # 1) 줄바꿈으로 잘린 문장 연결
    joined = _join_broken_lines(text)

    # 2) 문단별로 문장 분할
    paragraphs = [p.strip() for p in joined.split('\n') if p.strip()]
    sentences = []
    for para in paragraphs:
        parts = _SENTENCE_SPLIT.split(para)
        for p in parts:
            p = p.strip()
            if not p:
                continue
            # 500자 초과하는 긴 문장은 쉼표 기준으로 추가 분할
            if len(p) > TARGET_CHARS:
                sentences.extend(_split_long_text(p))
            else:
                sentences.append(p)
    return sentences


def _split_long_text(text: str, max_chars: int = TARGET_CHARS) -> list[str]:
    """TARGET_CHARS 초과하는 긴 텍스트를 쉼표/세미콜론 기준으로 분할"""
    if len(text) <= max_chars:
        return [text]

    parts = _FALLBACK_SPLIT.split(text)
    if len(parts) <= 1:
        return [text]

    result = []
    current = ""
    for part in parts:
        part = part.strip()
        if not part:
            continue
        if len(current) + len(part) + 2 > max_chars and current:
            result.append(current.strip())
            current = part
        else:
            current = (current + ", " + part) if current else part

    if current.strip():
        result.append(current.strip())

    return result


def _chunk_sentences(sentences: list[str], target_chars: int = TARGET_CHARS) -> list[str]:
    """문장 리스트를 target_chars 이내 청크로 묶기 (문장 경계 유지)"""
    chunks = []
    current = []
    current_len = 0

    for sent in sentences:
        sent_len = len(sent)
        if current_len + sent_len > target_chars and current:
            chunks.append('\n'.join(current))
            overlap = current[-OVERLAP_SENTENCES:] if OVERLAP_SENTENCES > 0 else []
            current = list(overlap)
            current_len = sum(len(s) for s in current)

        current.append(sent)
        current_len += sent_len

    if current:
        chunks.append('\n'.join(current))

    return chunks


def format_table(table: list[list]) -> str:
    """pdfplumber 표 데이터를 '항목 | 값' 텍스트로 변환"""
    if not table:
        return ""

    rows = []
    for row in table:
        cells = [str(c).strip() if c else "" for c in row]
        if any(cells):
            rows.append(" | ".join(cells))

    return '\n'.join(rows)


def pdf_to_chunks(pdf_path: str, category: str, sub_cat: str = "") -> list[dict]:
    """PDF → 청크 리스트 (500자 문장경계 + 표 추출)"""
    chunks = []
    chunk_idx = 0
    doc_name = Path(pdf_path).name

    with pdfplumber.open(pdf_path) as pdf:
        all_sentences = []

        for page in pdf.pages:
            # 1) 표 추출 → 표 청크 생성
            tables = page.extract_tables() or []
            for table in tables:
                table_text = format_table(table)
                if len(table_text) >= 30:
                    chunks.append({
                        "doc_name": doc_name,
                        "category": category,
                        "sub_cat": sub_cat,
                        "chunk_index": chunk_idx,
                        "content": table_text,
                        "metadata": {"type": "table"},
                    })
                    chunk_idx += 1

            # 2) 텍스트 추출 → 문장 수집
            text = page.extract_text() or ""
            if text.strip():
                page_sentences = split_sentences(text)
                all_sentences.extend(page_sentences)

        # 3) 전체 문장을 500자 이내 청크로 묶기
        text_chunks = _chunk_sentences(all_sentences)
        for tc in text_chunks:
            if len(tc.strip()) >= 30:
                chunks.append({
                    "doc_name": doc_name,
                    "category": category,
                    "sub_cat": sub_cat,
                    "chunk_index": chunk_idx,
                    "content": tc.strip(),
                    "metadata": {"type": "text"},
                })
                chunk_idx += 1

    return chunks

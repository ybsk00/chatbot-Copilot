"""
문제 청크 보완: 문장 중간 절단된 청크의 마지막 문장을 Gemini로 보완
"""
import sys
import os
import re
import time

sys.stdout.reconfigure(encoding="utf-8")
sys.path.insert(0, ".")

from dotenv import load_dotenv
load_dotenv()

from app.db.supabase_client import get_client
from app.config import MODELS, GOOGLE_API_KEY
from app.rag.embedder import embed_document
from google import genai

client = genai.Client(api_key=GOOGLE_API_KEY)

SENT_END = re.compile(r'[.!?]$|다\.$|요\.$|니다\.$|합니다\.$|입니다\.$|세요\.$|까요\?$|나요\?$|데요\.$|네요\.$|거든요\.$')

# Structured data patterns (these are OK, not truncated)
STRUCTURED_END = re.compile(
    r'[\d%원만천억건개월년일회호]$'  # ends with number/unit
    r'|\.co\.kr$|\.com$'  # ends with URL
    r'|@\S+$'  # ends with email
    r'|\d{2,4}[-/]\d{2,4}$'  # ends with phone/date
    r'|[A-Za-z)\]】]$'  # ends with English/bracket
    r'|\S+:\s*$'  # ends with "항목:" heading
)

# Truly truncated patterns
TRUNCATED_END = re.compile(
    r'[,·]$'  # ends with comma or middle dot (enumeration cut)
    r'|[을를이가은는에서의과와로으며]$'  # ends with particle
    r'|[및]$'  # ends with 및
    r'|[가-힣]\s*$'  # check if last char is mid-word Korean
)

def strip_q_prefix(content):
    lines = content.split('\n')
    if lines and lines[0].startswith('Q:'):
        return lines[0], '\n'.join(lines[1:]).strip()
    return None, content

def is_truly_truncated(text):
    """Check if text is genuinely cut mid-sentence"""
    lines = text.strip().split('\n')
    if not lines:
        return False
    
    last_line = lines[-1].strip()
    if not last_line:
        return False
    
    # Already has proper ending
    if SENT_END.search(last_line):
        return False
    
    # Structured data - not a problem
    if re.search(r'[\d%원만천억건개월년일회호]$', last_line):
        return False
    if re.search(r'[A-Za-z)\]】\"]$', last_line):
        return False
    if re.search(r'\.\w{2,3}$', last_line):  # .co.kr, .com
        return False
    if re.search(r'@\S+$', last_line):
        return False
    if re.search(r':\s*$', last_line):  # heading ending with colon
        return False
    if '|' in last_line:  # table format
        return False
    
    # Check for truncation signs
    # 1. Ends with comma, middle dot (enumeration cut)
    if re.search(r'[,·]$', last_line):
        return True
    
    # 2. Ends with Korean particle (mid-sentence)
    if re.search(r'[을를의에서와과로으며]$', last_line):
        return True
    
    # 3. Ends with 및, 또는 (conjunction)
    if last_line.endswith('및') or last_line.endswith('또는'):
        return True
    
    # 4. Ends with Korean character but no sentence terminator
    # Check if last word seems incomplete
    last_char = last_line[-1]
    if re.match(r'[가-힣]', last_char):
        # Check common non-terminating endings
        if re.search(r'(자동|기반|발생|관리|지원|도입|절감|운영|검토|분석|대응|활용|구축|개선|확대|강화|추진|시행|수행|방안|체계|전략|방향|모델|시스템|플랫폼|서비스|프로세스|프로그램|솔루션|네트워크)$', last_line):
            # These COULD be complete noun phrases - need more context
            # Check if the line is very short (likely a fragment)
            if len(last_line) < 30:
                return True
            # If ends in middle of a clear phrase pattern
            if re.search(r'(위한|통한|대한|관한|따른|인한|의한)\s+\S{1,10}$', last_line):
                return True
        
        # Obvious truncation: ends with partial word
        if re.search(r'(화장|에너지\s*절|공장|대형|준대형)$', last_line):
            return True
        
        # Very short last line that doesn't end properly
        if len(last_line) < 15 and not SENT_END.search(last_line):
            return True
    
    return False

COMPLETE_PROMPT = """아래 텍스트의 마지막 문장이 중간에 잘려있습니다.
잘린 마지막 문장만 자연스럽게 완성해주세요.

규칙:
1. 기존 텍스트는 절대 변경하지 마세요
2. 잘린 마지막 문장만 자연스러운 한국어로 완성하세요
3. 완성된 전체 텍스트를 반환하세요
4. 추가 설명 없이 텍스트만 반환하세요
5. 원본의 맥락과 주제에 맞게 완성하세요

텍스트:
{text}
"""

def fix_truncated_chunk(text):
    """Gemini로 잘린 문장 보완"""
    try:
        response = client.models.generate_content(
            model=MODELS["refinement"],
            contents=COMPLETE_PROMPT.format(text=text),
            config={"max_output_tokens": 800},
        )
        result = response.text.strip()
        # Sanity check: result should be similar length (not drastically different)
        if len(result) < len(text) * 0.5 or len(result) > len(text) * 2:
            print(f"    WARNING: 결과 길이 이상 (원본:{len(text)} → 결과:{len(result)})")
            return None
        return result
    except Exception as e:
        print(f"    Gemini 에러: {e}")
        return None


def main():
    supabase = get_client()
    
    # Fetch all chunks
    all_chunks = []
    offset = 0
    while True:
        resp = supabase.table("knowledge_chunks").select("id, content, category, doc_name, chunk_index, metadata").range(offset, offset + 999).execute()
        if not resp.data:
            break
        all_chunks.extend(resp.data)
        offset += 1000
    
    print(f"전체 청크: {len(all_chunks)}개")
    
    # Find truncated chunks
    truncated = []
    for chunk in all_chunks:
        meta = chunk.get('metadata', {})
        if meta.get('type') == 'table':
            continue
        
        q_prefix, text = strip_q_prefix(chunk['content'])
        if not text:
            continue
        
        if is_truly_truncated(text):
            truncated.append((chunk, q_prefix, text))
    
    print(f"문장 절단 감지: {len(truncated)}개\n")
    
    if not truncated:
        print("보완 필요한 청크가 없습니다!")
        return
    
    # Show all detected and fix
    fixed = 0
    errors = 0
    
    for i, (chunk, q_prefix, text) in enumerate(truncated):
        last_line = text.strip().split('\n')[-1].strip()
        print(f"[{i+1}/{len(truncated)}] ID:{chunk['id']} | {chunk['doc_name']} | chunk#{chunk['chunk_index']}")
        print(f"  끝부분: ...{last_line[-60:]}")
        
        # Fix with Gemini
        fixed_text = fix_truncated_chunk(text)
        if not fixed_text:
            errors += 1
            print(f"  → 보완 실패")
            continue
        
        # Show what changed
        fixed_last_line = fixed_text.strip().split('\n')[-1].strip()
        print(f"  보완후: ...{fixed_last_line[-60:]}")
        
        # Reconstruct full content with Q: prefix
        if q_prefix:
            full_content = f"{q_prefix}\n{fixed_text}"
        else:
            full_content = fixed_text
        
        # Re-embed
        try:
            embedding = embed_document(full_content)
        except Exception as e:
            print(f"  → 임베딩 실패: {e}")
            errors += 1
            continue
        
        # Update DB
        try:
            supabase.table("knowledge_chunks").update({
                "content": full_content,
                "embedding": embedding,
            }).eq("id", chunk['id']).execute()
            fixed += 1
            print(f"  → 보완 완료")
        except Exception as e:
            print(f"  → DB 업데이트 실패: {e}")
            errors += 1
        
        time.sleep(0.3)
    
    print(f"\n{'='*50}")
    print(f"보완 완료!")
    print(f"  감지: {len(truncated)}개")
    print(f"  보완: {fixed}개")
    print(f"  실패: {errors}개")
    print(f"{'='*50}")


if __name__ == "__main__":
    main()

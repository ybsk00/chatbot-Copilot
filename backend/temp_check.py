import sys, os, re
sys.stdout.reconfigure(encoding="utf-8")
sys.path.insert(0, ".")
from dotenv import load_dotenv
load_dotenv()
from app.db.supabase_client import get_client

supabase = get_client()

all_chunks = []
offset = 0
while True:
    resp = supabase.table("knowledge_chunks").select("id, content, category, doc_name, chunk_index, metadata").range(offset, offset + 999).execute()
    if not resp.data:
        break
    all_chunks.extend(resp.data)
    offset += 1000

SENT_END = re.compile(r'[.!?]$|다\.$|요\.$|니다\.$|합니다\.$|입니다\.$|세요\.$|까요\?$|나요\?$|데요\.$|네요\.$|거든요\.$')

def strip_q_prefix(content):
    lines = content.split('\n')
    if lines and lines[0].startswith('Q:'):
        return '\n'.join(lines[1:]).strip()
    return content

# Categorize incomplete endings
truly_cut = []       # genuinely cut mid-sentence
structured_end = []  # ends with structured/list data (OK)
number_end = []      # ends with number/percentage

for chunk in all_chunks:
    meta = chunk.get('metadata', {})
    if meta.get('type') == 'table':
        continue
    
    text = strip_q_prefix(chunk['content']).strip()
    if not text:
        continue
    
    last_line = text.split('\n')[-1].strip()
    
    if SENT_END.search(last_line):
        continue  # proper ending
    
    # Classify the type of incomplete ending
    # Structured: ends with | (table-like), or bullet points, or "항목: 값" format
    if '|' in last_line or re.search(r':\s*\S+$', last_line) or re.match(r'^[-·•▶►]\s', last_line):
        structured_end.append(chunk)
    # Ends with number, percentage, unit
    elif re.search(r'[\d%원만천억건개월년일회]$', last_line):
        number_end.append(chunk)
    else:
        truly_cut.append(chunk)

print(f"=== 미완성 끝 문장 세부 분류 ===")
print(f"구조화 데이터 (표/목록 형식): {len(structured_end)}개 → 정상 (정제 불필요)")
print(f"숫자/단위로 끝남: {len(number_end)}개 → 대부분 정상")
print(f"문장 중간 절단 (진짜 문제): {len(truly_cut)}개 → 정제 필요")

print(f"\n\n{'='*60}")
print(f"=== 문장 중간 절단 (진짜 문제) 전체 {len(truly_cut)}개 ===")
print(f"{'='*60}")
for i, chunk in enumerate(truly_cut):
    text = strip_q_prefix(chunk['content']).strip()
    last_line = text.split('\n')[-1].strip()
    print(f"\n[{i+1}] ID:{chunk['id']} | {chunk['doc_name']} | chunk#{chunk['chunk_index']}")
    print(f"    카테고리: {chunk['category']}")
    print(f"    끝 50자: ...{text[-80:]}")
    print(f"    마지막줄: {last_line[-60:]}")

print(f"\n\n{'='*60}")
print(f"=== 숫자/단위 끝 샘플 (최대 10개) ===")
print(f"{'='*60}")
for i, chunk in enumerate(number_end[:10]):
    text = strip_q_prefix(chunk['content']).strip()
    last_line = text.split('\n')[-1].strip()
    print(f"\n[{i+1}] ID:{chunk['id']} | {chunk['doc_name']}")
    print(f"    마지막줄: ...{last_line[-80:]}")

# Also check chunk starts - look for fragments carried over from overlap
print(f"\n\n{'='*60}")
print(f"=== 시작 문장 품질 검사 (오버랩 잔존 확인) ===")
print(f"{'='*60}")

from collections import defaultdict
by_doc = defaultdict(list)
for chunk in all_chunks:
    if chunk.get('metadata', {}).get('type') == 'table':
        continue
    by_doc[chunk['doc_name']].append(chunk)

fragment_starts = []
for doc, chunks_list in by_doc.items():
    chunks_list.sort(key=lambda x: x['chunk_index'])
    for i in range(1, len(chunks_list)):
        prev_text = strip_q_prefix(chunks_list[i-1]['content']).strip()
        curr_text = strip_q_prefix(chunks_list[i]['content']).strip()
        
        prev_lines = prev_text.split('\n')
        curr_lines = curr_text.split('\n')
        
        if prev_lines and curr_lines and len(curr_lines) > 1:
            last_prev = prev_lines[-1].strip()
            first_curr = curr_lines[0].strip()
            # Overlap: first line of current = last line of previous
            if last_prev == first_curr and len(last_prev) > 10:
                fragment_starts.append({
                    'id': chunks_list[i]['id'],
                    'doc': chunks_list[i]['doc_name'],
                    'chunk_idx': chunks_list[i]['chunk_index'],
                    'overlap_line': first_curr[:80],
                    'category': chunks_list[i]['category']
                })

print(f"오버랩으로 인한 중복 시작줄: {len(fragment_starts)}개")
if fragment_starts:
    for i, f in enumerate(fragment_starts[:5]):
        print(f"  [{i+1}] ID:{f['id']} | {f['doc']} | chunk#{f['chunk_idx']}")
        print(f"      중복줄: {f['overlap_line']}")

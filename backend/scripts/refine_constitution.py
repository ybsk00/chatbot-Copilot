"""헌법 원재료 문장 960개를 Gemini로 분류/정제하여 DB에 저장"""
import sys
import os
import re
import json
import time

sys.stdout.reconfigure(encoding="utf-8")
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dotenv import load_dotenv
load_dotenv()

from google import genai
from app.config import GOOGLE_API_KEY
from app.db.supabase_client import get_client

client = genai.Client(api_key=GOOGLE_API_KEY)
supabase = get_client()

# 1. Parse all sentences from the markdown file
SOURCE_FILE = "C:/Users/유범석/개발소스코드/26_03/업무마켓챗봇/출력/헌법_원재료_문장집.md"
with open(SOURCE_FILE, "r", encoding="utf-8") as f:
    content = f.read()

pattern = r"### (\d+)\.\s*\n- \*\*원문:\*\* (.+?)(?=\n- \*\*출처:\*\*)"
matches = re.findall(pattern, content, re.DOTALL)
all_sentences = [text.strip() for _, text in matches]
print(f"총 원재료 문장: {len(all_sentences)}개")

# 2. Process in batches of 200
BATCH_SIZE = 200
all_rules = []

PROMPT_TEMPLATE = """아래는 간접구매 구매전략 PDF에서 추출한 규칙성 문장입니다.
이 문장들을 분석하여 간접구매 AI 코파일럿의 '헌법 조항'으로 사용할 수 있는 핵심 규칙을 추출하세요.

## 분류 기준
- 거부조건: AI가 절대 해서는 안 되는 행동 (예: 특정 업체 추천 금지, 개인정보 처리 금지)
- 행동제어: AI가 반드시 따라야 하는 행동 (예: 근거 문서 출처 명시, 전문가 상담 권고)
- 수치기준: 숫자/비율/기간 등 정량적 기준 (예: SLA 4시간 이내, 단가 인상률 3% 이하)
- 품질기준: 서비스 품질/SLA 관련 기준 (예: TCO 기반 평가, KPI 정량화)
- 비용기준: 비용/견적/계약 관련 기준 (예: 분리 견적 필수, 비용 투명화)
- ESG기준: 환경/사회/거버넌스 관련 기준 (예: 친환경 인증, 탄소배출 관리)

## 출력 형식
JSON 배열로 반환하세요. 각 항목:
{{"rule_type": "분류", "content": "정제된 헌법 조항 문장"}}

## 규칙
1. 중복 제거하여 대표 문장만 선별
2. 문장은 명확하고 실행 가능한 '~해야 한다', '~해서는 안 된다' 형태로 정제
3. 특정 서비스에만 해당하는 것보다 범용적 규칙 우선 (서비스 특정 규칙도 포함 가능)
4. 최소 20개, 최대 50개 추출
5. JSON만 반환 (설명 없이)

## 원문
{sentences}"""

for batch_idx in range(0, len(all_sentences), BATCH_SIZE):
    batch = all_sentences[batch_idx:batch_idx + BATCH_SIZE]
    batch_num = batch_idx // BATCH_SIZE + 1
    total_batches = (len(all_sentences) + BATCH_SIZE - 1) // BATCH_SIZE

    print(f"\n배치 {batch_num}/{total_batches} 처리 중 ({len(batch)}개 문장)...")

    batch_text = "\n".join([f"{i+1}. {s}" for i, s in enumerate(batch)])
    prompt = PROMPT_TEMPLATE.format(sentences=batch_text)

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )

        text = response.text.strip()
        if text.startswith("```"):
            text = re.sub(r"```json?\s*", "", text)
            text = re.sub(r"```\s*$", "", text)

        rules = json.loads(text)
        all_rules.extend(rules)
        print(f"  → {len(rules)}개 조항 추출")

    except Exception as e:
        print(f"  ⚠ 배치 {batch_num} 오류: {e}")

    time.sleep(1)

print(f"\n총 추출 조항: {len(all_rules)}개")

# 3. Deduplicate using Gemini
print("\n중복 제거 및 최종 정제 중...")

dedup_prompt = f"""아래는 간접구매 AI 코파일럿의 헌법 조항 후보 {len(all_rules)}개입니다.
중복을 제거하고 최종 헌법 조항 목록을 만들어 주세요.

## 규칙
1. 의미가 동일하거나 매우 유사한 조항은 하나로 병합
2. 더 구체적이고 명확한 표현 선택
3. rule_type 분류를 재확인
4. 최종 50~80개 범위로 정제
5. JSON 배열만 반환

## 후보 조항
{json.dumps(all_rules, ensure_ascii=False)}"""

try:
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=dedup_prompt,
    )

    text = response.text.strip()
    if text.startswith("```"):
        text = re.sub(r"```json?\s*", "", text)
        text = re.sub(r"```\s*$", "", text)

    final_rules = json.loads(text)
    print(f"최종 헌법 조항: {len(final_rules)}개")

except Exception as e:
    print(f"중복 제거 오류: {e}")
    final_rules = all_rules

# 4. Save to file
output_path = "C:/Users/유범석/개발소스코드/26_03/업무마켓챗봇/출력/헌법_최종_조항.json"
with open(output_path, "w", encoding="utf-8") as f:
    json.dump(final_rules, f, ensure_ascii=False, indent=2)
print(f"파일 저장: {output_path}")

# 5. Insert into Supabase (기존 기본 6개 유지, 추가 삽입)
print("\nSupabase DB 저장 중...")
saved = 0
for rule in final_rules:
    try:
        supabase.table("constitution_rules").insert({
            "rule_type": rule["rule_type"],
            "content": rule["content"],
            "is_active": True,
        }).execute()
        saved += 1
    except Exception as e:
        print(f"  ⚠ 저장 실패: {rule['content'][:40]}... — {e}")

print(f"\n🎉 완료! {saved}개 헌법 조항 DB 저장")

# Summary
type_counts = {}
for r in final_rules:
    t = r["rule_type"]
    type_counts[t] = type_counts.get(t, 0) + 1

print("\n분류별 통계:")
for t, c in sorted(type_counts.items()):
    print(f"  {t}: {c}개")

"""견적서(RFQ) 스키마 — DB-first 로딩

rfq_templates 테이블에서 36개 L3 견적서 템플릿을 로드.
소싱담당자 Zone 1-2 필드만 포함 (공급사 영역 제외).
"""

RFQ_SCHEMAS = {
    "_generic": {
        "label": "일반 견적요청",
        "fields": "q1:요청 품목/서비스명, q2:수량/규모, q3:희망 단가, q4:납품/서비스 기간, q5:기타 요구사항",
        "required": "q1,q2,q3",
        "sections": "1. 견적 기본 정보 (요청 품목/서비스명, 수량/규모, 희망 단가, 납품/서비스 기간, 기타 요구사항)",
        "sections_detail": "견적 기본 정보:q1,q2,q3,q4,q5",
    }
}


def load_rfq_schemas_from_db():
    """rfq_templates 테이블에서 RFQ 템플릿 로드"""
    try:
        from app.db.supabase_client import get_client
        sb = get_client()
        rows = sb.table("rfq_templates").select("*").eq("is_active", True).execute().data
        if not rows:
            return 0

        loaded = 0
        for row in rows:
            key = row["type_key"]
            fields_json = row.get("fields", {})
            sections_json = row.get("sections", [])

            fields_str = ", ".join(f"{k}:{v['label']}" for k, v in fields_json.items())
            required_str = ",".join(k for k, v in fields_json.items() if v.get("required"))

            sections_parts = []
            for s in sections_json:
                field_labels = []
                for fk in s.get("fields", []):
                    if fk in fields_json:
                        field_labels.append(fields_json[fk]["label"])
                sections_parts.append(f"{s['title']} ({', '.join(field_labels)})")
            sections_str = "\n".join(sections_parts)

            detail_parts = []
            for s in sections_json:
                title = s["title"].split(". ", 1)[-1] if ". " in s["title"] else s["title"]
                detail_parts.append(f"{title}:{','.join(s.get('fields', []))}")
            sections_detail_str = "|".join(detail_parts)

            RFQ_SCHEMAS[key] = {
                "label": row.get("name", key),
                "fields": fields_str,
                "required": required_str,
                "sections": sections_str,
                "sections_detail": sections_detail_str,
            }
            loaded += 1

        return loaded
    except Exception as e:
        print(f"[RFQ_SCHEMAS] DB 로드 실패: {e}")
        return 0


_db_loaded = load_rfq_schemas_from_db()
if _db_loaded:
    print(f"[RFQ_SCHEMAS] DB에서 {_db_loaded}개 RFQ 템플릿 로드 완료")


# RFQ 필드 추출용 LLM 프롬프트
RFQ_PHASE_PROMPT = """사용자 메시지에서 견적서(RFQ) 필드 값을 추출하여 JSON만 반환하세요. 설명 없이 JSON만.

## 전체 필드 목록
{fields}

## 섹션 구조
{sections}

## 현재 상태
- 현재 phase: {phase}
- 이미 채워진 필드: {filled_keys}
- 주요 필수 필드: {required_keys}

## 핵심 규칙
1. 대화 이력에서 AI가 마지막으로 요청한 섹션과 필드 목록을 정확히 확인하세요.
2. 사용자의 현재 메시지는 AI가 요청한 필드에 대한 답변입니다.
3. 사용자 입력을 AI가 요청한 필드 순서대로 1:1 매핑하세요.
4. 하나의 필드에 여러 값을 합치지 마세요.
5. 아직 요청하지 않은 섹션의 필드에 값을 넣지 마세요.
6. 이미 채워진 필드는 다시 추출하지 마세요.
7. is_complete: 이미 채워진 필드 + 새로 추출한 필드로 주요 필수 필드가 모두 채워졌으면 true.

## 대화 이력
{history}

## 현재 사용자 메시지
{message}

## 출력 형식
{{"rfq_fields": {{"q1": "값", "q2": "값"}}, "is_complete": false}}"""

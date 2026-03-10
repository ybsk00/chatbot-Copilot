"""RFP 상세 보기 HTML 페이지 — GET /rfp/view/{rfp_id}"""

import logging
from datetime import datetime
from html import escape

from fastapi import APIRouter, HTTPException
from fastapi.responses import HTMLResponse

from app.constants.rfp_schemas import RFP_SCHEMAS
from app.db.supabase_client import get_client

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/rfp", tags=["rfp-view"])

RFP_TYPE_LABELS = {
    "purchase": "일반 구매",
    "service_contract": "일반 용역",
    "service": "서비스",
    "rental": "렌탈·리스",
    "construction": "공사",
    "consulting": "컨설팅",
    "purchase_maintenance": "구매+유지보수",
    "rental_maintenance": "렌탈+유지보수",
    "purchase_lease": "구매·리스",
}


def _parse_fields(fields_str: str) -> dict[str, str]:
    """'s1:발주기관명, s2:담당부서, ...' → {s1: '발주기관명', s2: '담당부서', ...}"""
    result = {}
    for pair in fields_str.split(","):
        pair = pair.strip()
        if ":" in pair:
            key, label = pair.split(":", 1)
            result[key.strip()] = label.strip()
    return result


def _parse_sections(sections_str: str) -> list[dict]:
    """섹션 문자열을 파싱하여 [{title, field_hints}, ...] 반환.

    예: '1. 발주기관 정보 (기관명, 담당부서, 담당자, 연락처, 이메일)'
    → {title: '발주기관 정보', field_hints: ['기관명', '담당부서', ...]}
    """
    sections = []
    for line in sections_str.strip().split("\n"):
        line = line.strip()
        if not line:
            continue
        # '1. 발주기관 정보 (기관명, ...) ' 형태
        # 번호 제거
        if "." in line[:4]:
            line = line.split(".", 1)[1].strip()
        hints = []
        title = line
        if "(" in line and ")" in line:
            paren_start = line.index("(")
            paren_end = line.rindex(")")
            title = line[:paren_start].strip()
            hints_str = line[paren_start + 1:paren_end]
            hints = [h.strip() for h in hints_str.split(",") if h.strip()]
        sections.append({"title": title, "hints": hints})
    return sections


def _match_fields_to_section(hints: list[str], field_labels: dict[str, str]) -> list[str]:
    """섹션 힌트(한글 키워드)를 실제 필드 키에 매칭"""
    matched = []
    for hint in hints:
        for key, label in field_labels.items():
            # 힌트가 라벨에 포함되거나 라벨이 힌트에 포함
            if hint in label or label in hint:
                if key not in matched:
                    matched.append(key)
                break
        else:
            # 부분 매칭 시도 (예: "기관명" → "발주기관명")
            for key, label in field_labels.items():
                if any(h in label for h in [hint]) and key not in matched:
                    matched.append(key)
                    break
    return matched


def _esc(value) -> str:
    """HTML 이스케이프"""
    if value is None:
        return "-"
    return escape(str(value)) if str(value).strip() else "-"


def _render_rfp_html(rfp: dict) -> str:
    """RFP 데이터로 전체 HTML 페이지 렌더링"""
    rfp_type = rfp.get("rfp_type") or rfp.get("template_type") or ""
    type_label = RFP_TYPE_LABELS.get(rfp_type, rfp_type)
    fields_data: dict = rfp.get("fields") or {}
    created_at = str(rfp.get("created_at", ""))[:10]

    schema = RFP_SCHEMAS.get(rfp_type)
    if not schema:
        raise HTTPException(status_code=404, detail=f"알 수 없는 RFP 유형: {rfp_type}")

    field_labels = _parse_fields(schema["fields"])
    sections = _parse_sections(schema["sections"])

    # 섹션별 HTML 생성
    section_html_parts = []
    section_num = 0
    for sec in sections:
        section_num += 1
        matched_keys = _match_fields_to_section(sec["hints"], field_labels)

        # 매칭 안 된 경우 힌트 순서대로 전체 필드에서 찾기
        if not matched_keys and sec["hints"]:
            for hint in sec["hints"]:
                for key, label in field_labels.items():
                    if hint in label and key not in matched_keys:
                        matched_keys.append(key)

        rows_html = ""
        for key in matched_keys:
            label = field_labels.get(key, key)
            value = _esc(fields_data.get(key, ""))
            is_eval = "평가" in label
            rows_html += f"""
            <tr>
              <td class="label-cell{' eval-label' if is_eval else ''}">{escape(label)}</td>
              <td class="value-cell">{value}</td>
            </tr>"""

        if rows_html:
            section_html_parts.append(f"""
        <div class="section">
          <h3 class="section-title">{section_num}. {escape(sec['title'])}</h3>
          <table class="info-table">
            {rows_html}
          </table>
        </div>""")

    sections_html = "\n".join(section_html_parts)

    # 제목 결정 (s6 또는 title 필드)
    title = (
        fields_data.get("s6")
        or rfp.get("title")
        or type_label
    )
    org_name = _esc(fields_data.get("s1", ""))
    requester = _esc(fields_data.get("s3", ""))
    today = datetime.now().strftime("%Y년 %m월 %d일")

    return f"""\
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>제안요청서 - {_esc(title)}</title>
  <style>
    /* ── 기본 ── */
    * {{ margin: 0; padding: 0; box-sizing: border-box; }}
    body {{
      font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif;
      color: #1a1a1a;
      background: #f0f2f5;
      line-height: 1.6;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }}

    /* ── 컨테이너 ── */
    .container {{
      max-width: 800px;
      margin: 24px auto;
      background: #fff;
      box-shadow: 0 2px 16px rgba(0,0,0,0.08);
      border-radius: 4px;
      overflow: hidden;
    }}

    /* ── 다운로드 바 ── */
    .toolbar {{
      background: #1a56db;
      padding: 14px 32px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }}
    .toolbar-title {{
      color: #fff;
      font-size: 14px;
      font-weight: 600;
    }}
    .btn-download {{
      background: #fff;
      color: #1a56db;
      border: none;
      padding: 10px 24px;
      font-size: 14px;
      font-weight: 700;
      border-radius: 6px;
      cursor: pointer;
      transition: background 0.2s;
    }}
    .btn-download:hover {{
      background: #e0e7ff;
    }}

    /* ── RFP 본문 ── */
    .rfp-body {{
      padding: 48px 56px 40px;
    }}

    /* ── 제목 ── */
    .rfp-main-title {{
      text-align: center;
      font-size: 28px;
      font-weight: 800;
      letter-spacing: 12px;
      color: #111;
      margin-bottom: 6px;
    }}
    .rfp-sub-title {{
      text-align: center;
      font-size: 16px;
      color: #4b5563;
      margin-bottom: 36px;
      font-weight: 500;
    }}
    .rfp-type-badge {{
      display: inline-block;
      background: #eff6ff;
      color: #1a56db;
      padding: 4px 14px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 600;
    }}

    /* ── 구분선 ── */
    .divider {{
      border: none;
      border-top: 2px solid #1a56db;
      margin: 0 0 32px;
    }}

    /* ── 섹션 ── */
    .section {{
      margin-bottom: 28px;
    }}
    .section-title {{
      font-size: 16px;
      font-weight: 700;
      color: #1e3a5f;
      padding: 8px 14px;
      background: #f0f4ff;
      border-left: 4px solid #1a56db;
      margin-bottom: 12px;
      border-radius: 0 4px 4px 0;
    }}

    /* ── 테이블 ── */
    .info-table {{
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 4px;
    }}
    .info-table tr {{
      border-bottom: 1px solid #e5e7eb;
    }}
    .info-table tr:last-child {{
      border-bottom: none;
    }}
    .label-cell {{
      width: 180px;
      padding: 10px 14px;
      background: #f9fafb;
      color: #4b5563;
      font-size: 13px;
      font-weight: 600;
      vertical-align: top;
      border-right: 1px solid #e5e7eb;
    }}
    .eval-label {{
      background: #fef3c7;
      color: #92400e;
    }}
    .value-cell {{
      padding: 10px 14px;
      color: #1a1a1a;
      font-size: 14px;
      white-space: pre-wrap;
      word-break: break-word;
    }}

    /* ── 서명 ── */
    .signature-area {{
      margin-top: 48px;
      padding-top: 24px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
    }}
    .signature-date {{
      font-size: 15px;
      color: #374151;
      margin-bottom: 32px;
    }}
    .signature-box {{
      display: inline-block;
      width: 320px;
      text-align: center;
    }}
    .signature-label {{
      font-size: 13px;
      color: #6b7280;
      margin-bottom: 40px;
    }}
    .signature-line {{
      border-top: 1px solid #374151;
      margin-top: 40px;
      padding-top: 8px;
      font-size: 14px;
      font-weight: 600;
      color: #1a1a1a;
    }}
    .signature-org {{
      font-size: 13px;
      color: #6b7280;
      margin-top: 4px;
    }}

    /* ── 푸터 ── */
    .footer {{
      text-align: center;
      padding: 16px;
      background: #f9fafb;
      border-top: 1px solid #e5e7eb;
      font-size: 12px;
      color: #9ca3af;
    }}

    /* ── 인쇄 스타일 ── */
    @media print {{
      body {{
        background: #fff;
        margin: 0;
      }}
      .toolbar {{
        display: none !important;
      }}
      .container {{
        box-shadow: none;
        margin: 0;
        border-radius: 0;
        max-width: 100%;
      }}
      .rfp-body {{
        padding: 40px 48px;
      }}
      .footer {{
        display: none !important;
      }}
      .section {{
        break-inside: avoid;
      }}
      @page {{
        size: A4;
        margin: 15mm 12mm;
      }}
    }}
  </style>
</head>
<body>
<div class="container">

  <!-- 다운로드 바 -->
  <div class="toolbar">
    <span class="toolbar-title">IP Assist &mdash; 제안요청서</span>
    <button class="btn-download" onclick="window.print()">PDF 다운로드</button>
  </div>

  <div class="rfp-body">

    <!-- 제목 -->
    <h1 class="rfp-main-title">제 안 요 청 서</h1>
    <p class="rfp-sub-title">
      <span class="rfp-type-badge">{escape(type_label)}</span>
    </p>

    <hr class="divider">

    <!-- 동적 섹션 -->
    {sections_html}

    <!-- 서명 영역 -->
    <div class="signature-area">
      <p class="signature-date">{today}</p>
      <div class="signature-box">
        <p class="signature-label">위와 같이 제안을 요청합니다.</p>
        <div class="signature-line">
          {requester} (인)
        </div>
        <p class="signature-org">{org_name}</p>
      </div>
    </div>

  </div>

  <!-- 푸터 -->
  <div class="footer">
    &copy; 업무마켓9 &middot; IP Assist &mdash; 간접구매 AI 코파일럿
  </div>

</div>
</body>
</html>"""


@router.get("/view/{rfp_id}", response_class=HTMLResponse)
async def view_rfp(rfp_id: int):
    """RFP 상세 보기 HTML 페이지 (브라우저 인쇄로 PDF 저장 가능)"""
    supabase = get_client()
    result = (
        supabase.table("rfp_requests")
        .select("*")
        .eq("id", rfp_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="RFP를 찾을 수 없습니다.")

    rfp = result.data[0]
    html = _render_rfp_html(rfp)
    return HTMLResponse(content=html, status_code=200)

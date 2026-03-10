"""RFP 상세 보기 HTML 페이지 — GET /rfp/view/{rfp_id}
PDF 다운로드(jsPDF)와 동일한 나라장터 제안요청서 양식.
"""

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


def _parse_fields(fields_str: str) -> list[tuple[str, str]]:
    """'s1:발주기관명, s2:담당부서, ...' → [(s1, '발주기관명'), ...]"""
    result = []
    for pair in fields_str.split(","):
        pair = pair.strip()
        if ":" in pair:
            key, label = pair.split(":", 1)
            result.append((key.strip(), label.strip()))
    return result


def _parse_sections(sections_str: str) -> list[dict]:
    """섹션 문자열 파싱 → [{title, hints}, ...]"""
    sections = []
    for line in sections_str.strip().split("\n"):
        line = line.strip()
        if not line:
            continue
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


def _match_fields_to_section(hints: list[str], field_list: list[tuple[str, str]]) -> list[str]:
    """힌트를 필드에 매칭"""
    matched = []
    for hint in hints:
        for key, label in field_list:
            if (hint in label or label in hint) and key not in matched:
                matched.append(key)
                break
        else:
            for key, label in field_list:
                if any(h in label for h in [hint]) and key not in matched:
                    matched.append(key)
                    break
    return matched


def _esc(value) -> str:
    if value is None:
        return ""
    return escape(str(value)) if str(value).strip() else ""


def _find_field_by_keyword(fields_data: dict, field_keys: list[str],
                           field_labels: dict, keywords: list[str]) -> str:
    """필드 키 목록에서 키워드 매칭으로 값 찾기"""
    for fk in field_keys:
        label = field_labels.get(fk, "")
        if any(kw in label for kw in keywords):
            return _esc(fields_data.get(fk, ""))
    return ""


def _render_rfp_html(rfp: dict) -> str:
    rfp_type = rfp.get("rfp_type") or rfp.get("template_type") or ""
    type_label = RFP_TYPE_LABELS.get(rfp_type, rfp_type)
    fields_data: dict = rfp.get("fields") or {}

    schema = RFP_SCHEMAS.get(rfp_type)
    if not schema:
        raise HTTPException(status_code=404, detail=f"알 수 없는 RFP 유형: {rfp_type}")

    field_list = _parse_fields(schema["fields"])
    field_labels = {k: v for k, v in field_list}
    sections = _parse_sections(schema["sections"])

    # 섹션별 필드 매칭
    section_fields = []
    for sec in sections:
        matched = _match_fields_to_section(sec["hints"], field_list)
        if not matched and sec["hints"]:
            for hint in sec["hints"]:
                for key, label in field_list:
                    if hint in label and key not in matched:
                        matched.append(key)
        section_fields.append(matched)

    # 기본 정보 추출
    org_name = _esc(fields_data.get("s1", ""))
    dept = _esc(fields_data.get("s2", ""))
    manager = _esc(fields_data.get("s3", ""))
    contact = _esc(fields_data.get("s4", ""))

    # 개요 섹션 (sections[1])
    sec2_keys = section_fields[1] if len(section_fields) > 1 else []
    business_name = _esc(fields_data.get(sec2_keys[0], "")) if sec2_keys else ""
    period = _find_field_by_keyword(fields_data, sec2_keys, field_labels, ["기간", "기한"])
    scale = _find_field_by_keyword(fields_data, sec2_keys, field_labels, ["인원", "인력", "수량", "규모", "면적"])

    # 목적 (개요 섹션 두 번째 필드)
    purpose = _esc(fields_data.get(sec2_keys[1], "")) if len(sec2_keys) > 1 else ""

    # 요구사항 섹션 (sections[2])
    req_section = sections[2] if len(sections) > 2 else None
    req_keys = section_fields[2] if len(section_fields) > 2 else []
    req_lines = []
    for fk in req_keys:
        label = field_labels.get(fk, fk)
        val = _esc(fields_data.get(fk, ""))
        if val:
            req_lines.append(f"[{escape(label)}] {val}")

    # 추가 요건 (6섹션 템플릿: sections[3]이 평가가 아닌 경우)
    extra_lines = []
    if len(sections) >= 6 and len(section_fields) > 3:
        sec4 = sections[3]
        if "평가" not in sec4["title"]:
            for fk in section_fields[3]:
                label = field_labels.get(fk, fk)
                val = _esc(fields_data.get(fk, ""))
                if val:
                    extra_lines.append(f"[{escape(label)}] {val}")

    # 평가 기준 섹션
    eval_lines = []
    eval_section_title = "평가 기준"
    for i, sec in enumerate(sections):
        if "평가" in sec["title"]:
            eval_section_title = sec["title"]
            for fk in section_fields[i]:
                label = field_labels.get(fk, fk)
                val = _esc(fields_data.get(fk, ""))
                eval_lines.append(f"- {escape(label)}: {val}" if val else f"- {escape(label)}")
            break

    # 제출 안내 섹션
    submit_rows_html = ""
    for i, sec in enumerate(sections):
        if "제출" in sec["title"]:
            for fk in section_fields[i]:
                label = field_labels.get(fk, fk)
                val = _esc(fields_data.get(fk, ""))
                submit_rows_html += f"""
                <tr>
                  <td class="th">{escape(label)}</td>
                  <td class="td">{val}</td>
                </tr>"""
            break

    today = datetime.now().strftime("%Y년 %m월 %d일")

    # 요구사항 HTML
    req_content = "<br>".join(req_lines) if req_lines else "&nbsp;"
    req_title = escape(req_section["title"]) if req_section else "요구사항"

    # 추가 요건 HTML
    extra_html = ""
    if extra_lines:
        extra_title = escape(sections[3]["title"]) if len(sections) > 3 else "추가 요건"
        extra_content = "<br>".join(extra_lines)
        extra_html = f"""
    <table class="doc-table">
      <tr><td class="section-header" colspan="6">{extra_title}</td></tr>
      <tr><td class="content-cell" colspan="6">{extra_content}</td></tr>
    </table>"""

    return f"""\
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>제안요청서 - {_esc(business_name or type_label)}</title>
  <style>
    * {{ margin: 0; padding: 0; box-sizing: border-box; }}
    body {{
      font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif;
      color: #111;
      background: #f0f2f5;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }}
    .container {{
      max-width: 800px;
      margin: 0 auto;
      background: #fff;
      box-shadow: 0 2px 16px rgba(0,0,0,0.08);
    }}
    .toolbar {{
      background: #222;
      padding: 14px 32px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }}
    .toolbar-title {{ color: #fff; font-size: 14px; font-weight: 600; }}
    .btn-download {{
      background: #fff; color: #222; border: none;
      padding: 10px 24px; font-size: 14px; font-weight: 700;
      border-radius: 4px; cursor: pointer;
    }}
    .btn-download:hover {{ background: #e8e8e8; }}

    .rfp-body {{ padding: 48px 50px 40px; }}

    /* 제목 */
    .main-title {{
      text-align: center;
      font-size: 26px;
      font-weight: 900;
      letter-spacing: 8px;
      color: #111;
      margin-bottom: 8px;
    }}
    .double-line {{
      border: none;
      border-top: 2.5px solid #222;
      margin-bottom: 3px;
    }}
    .thin-line {{
      border: none;
      border-top: 0.5px solid #222;
      margin-bottom: 20px;
    }}

    /* 테이블 공통 */
    .doc-table {{
      width: 100%;
      border-collapse: collapse;
      border: 0.5px solid #333;
      margin-bottom: 0;
    }}
    .doc-table + .doc-table {{ border-top: none; }}

    .th {{
      background: #e8e8e8;
      color: #111;
      font-weight: bold;
      text-align: center;
      padding: 8px 10px;
      font-size: 12px;
      border: 0.5px solid #333;
      white-space: nowrap;
    }}
    .td {{
      background: #fff;
      color: #222;
      padding: 8px 10px;
      font-size: 12px;
      border: 0.5px solid #333;
    }}
    .td-bold {{
      background: #fff;
      color: #222;
      padding: 8px 10px;
      font-size: 13px;
      font-weight: bold;
      border: 0.5px solid #333;
    }}
    .section-header {{
      background: #333;
      color: #fff;
      font-weight: bold;
      text-align: center;
      padding: 8px 10px;
      font-size: 12px;
      border: 0.5px solid #333;
    }}
    .content-cell {{
      background: #fff;
      color: #222;
      padding: 14px 16px;
      font-size: 12px;
      border: 0.5px solid #333;
      line-height: 1.8;
      min-height: 60px;
      white-space: pre-wrap;
    }}

    /* 서명 */
    .signature-area {{
      margin-top: 40px;
      text-align: right;
      padding-right: 20px;
    }}
    .sig-date {{ font-size: 13px; color: #333; margin-bottom: 16px; }}
    .sig-org {{ font-size: 15px; font-weight: bold; color: #111; margin-bottom: 12px; }}
    .sig-line {{
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: #222;
    }}
    .seal-box {{
      display: inline-block;
      width: 36px; height: 36px;
      border: 0.5px solid #999;
      text-align: center;
      line-height: 36px;
      font-size: 10px;
      color: #999;
    }}

    /* 푸터 */
    .footer {{
      margin-top: 30px;
      padding-top: 12px;
      border-top: 0.3px solid #ccc;
      text-align: center;
      font-size: 10px;
      color: #a0a0a0;
    }}

    @media print {{
      body {{ background: #fff; margin: 0; }}
      .toolbar {{ display: none !important; }}
      .container {{ box-shadow: none; margin: 0; max-width: 100%; }}
      .rfp-body {{ padding: 40px 48px; }}
      @page {{ size: A4; margin: 15mm 12mm; }}
    }}
  </style>
</head>
<body>
<div class="container">
  <div class="toolbar">
    <span class="toolbar-title">IP Assist &mdash; 제안요청서</span>
    <button class="btn-download" onclick="window.print()">PDF 다운로드</button>
  </div>

  <div class="rfp-body">
    <h1 class="main-title">제 안 요 청 서</h1>
    <hr class="double-line">
    <hr class="thin-line">

    <!-- 기본 정보 테이블 -->
    <table class="doc-table">
      <tr>
        <td class="th" style="width:80px;">사 업 명</td>
        <td class="td-bold" colspan="5">{business_name}</td>
      </tr>
      <tr>
        <td class="th">발주기관</td>
        <td class="td" colspan="5">{org_name}</td>
      </tr>
      <tr>
        <td class="th">담 당 자</td>
        <td class="th" style="width:40px;">성명</td>
        <td class="td" style="width:100px;">{manager}</td>
        <td class="th" style="width:40px;">부서</td>
        <td class="td" style="width:100px;">{dept}</td>
        <td class="td">{contact}</td>
      </tr>
      <tr>
        <td class="th">사업기간</td>
        <td class="td" colspan="2">{period}</td>
        <td class="th">규모</td>
        <td class="td" colspan="2">{scale}</td>
      </tr>
    </table>

    <!-- 목표 -->
    <table class="doc-table">
      <tr><td class="section-header" colspan="6">목 표</td></tr>
      <tr><td class="content-cell" colspan="6">{purpose or '&nbsp;'}</td></tr>
    </table>

    <!-- 요구사항 -->
    <table class="doc-table">
      <tr><td class="section-header" colspan="6">{req_title}</td></tr>
      <tr><td class="content-cell" colspan="6">{req_content}</td></tr>
    </table>

    <!-- 추가 요건 (6섹션 템플릿) -->
    {extra_html}

    <!-- 평가 기준 -->
    <table class="doc-table">
      <tr><td class="section-header" colspan="6">{escape(eval_section_title)}</td></tr>
      <tr><td class="content-cell" colspan="6">{'<br>'.join(eval_lines) if eval_lines else '&nbsp;'}</td></tr>
    </table>

    <!-- 제출 안내 -->
    <table class="doc-table">
      <tr><td class="section-header" colspan="6">제출 안내</td></tr>
      {submit_rows_html}
    </table>

    <!-- 서명 -->
    <div class="signature-area">
      <div class="sig-date">{today}</div>
      <div class="sig-org">{org_name}</div>
      <div class="sig-line">
        담당자: {manager}
        <span class="seal-box">(인)</span>
      </div>
    </div>

    <!-- 푸터 -->
    <div class="footer">
      업무마켓9 &mdash; AI 기반 제안요청서 자동생성 시스템
    </div>
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

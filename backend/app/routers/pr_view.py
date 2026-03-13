"""PR(구매요청서) 상세 보기 HTML 페이지 — GET /pr/view/{pr_id}"""
import logging
from datetime import datetime
from html import escape

from fastapi import APIRouter, HTTPException
from fastapi.responses import HTMLResponse

from app.constants.pr_schemas import PR_SCHEMAS
from app.db.supabase_client import get_client

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/pr", tags=["pr-view"])


def _esc(value) -> str:
    if value is None:
        return ""
    return escape(str(value)) if str(value).strip() else ""


def _parse_sections_detail(schema: dict) -> list[dict]:
    """sections_detail 파싱 → [{title, field_keys: [...]}, ...]"""
    detail = schema.get("sections_detail", "")
    if not detail:
        return []
    sections = []
    for part in detail.split("|"):
        if ":" not in part:
            continue
        title, keys_str = part.split(":", 1)
        keys = [k.strip() for k in keys_str.split(",") if k.strip()]
        sections.append({"title": title.strip(), "field_keys": keys})
    return sections


def _parse_field_labels(schema: dict) -> dict:
    """fields 문자열 → {p1: "라벨", ...}"""
    labels = {}
    for pair in schema["fields"].split(", "):
        if ":" in pair:
            key, label = pair.split(":", 1)
            labels[key.strip()] = label.strip()
    return labels


def _render_pr_html(pr: dict) -> str:
    pr_type = pr.get("pr_type", "_generic")
    fields_data: dict = pr.get("fields") or {}
    schema = PR_SCHEMAS.get(pr_type, PR_SCHEMAS["_generic"])
    label = schema.get("label", "구매요청서")
    category = schema.get("category", "")

    field_labels = _parse_field_labels(schema)
    sections = _parse_sections_detail(schema)

    supplier_name = _esc(pr.get("selected_supplier_name", ""))
    status = pr.get("status", "draft")
    status_label = {
        "draft": "작성중", "submitted": "제출됨",
        "supplier_selected": "업체선택", "forwarded": "전달됨",
    }.get(status, status)

    created = pr.get("created_at", "")
    if created:
        try:
            dt = datetime.fromisoformat(created.replace("Z", "+00:00"))
            date_str = dt.strftime("%Y년 %m월 %d일")
        except Exception:
            date_str = created[:10]
    else:
        date_str = datetime.now().strftime("%Y년 %m월 %d일")

    # 섹션별 테이블 행 생성
    section_html = ""
    for sec in sections:
        rows = ""
        for fk in sec["field_keys"]:
            fl = _esc(field_labels.get(fk, fk))
            val = _esc(fields_data.get(fk, ""))
            rows += f"""
            <tr>
              <td class="th">{fl}</td>
              <td class="td">{val or '<span class="empty">-</span>'}</td>
            </tr>"""

        section_html += f"""
        <table class="sec-table">
          <tr><td colspan="2" class="sec-header">{_esc(sec["title"])}</td></tr>
          {rows}
        </table>"""

    html = f"""<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>구매요청서 — {_esc(label)}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;600;700&display=swap');
  * {{ margin:0; padding:0; box-sizing:border-box; }}
  body {{ font-family:'Noto Sans KR',sans-serif; background:#f0fdfa; color:#1e293b; padding:40px 20px; }}
  .container {{ max-width:800px; margin:0 auto; background:#fff; border-radius:16px; box-shadow:0 4px 24px rgba(0,0,0,0.08); overflow:hidden; }}
  .header {{ background:linear-gradient(135deg,#06b6d4,#0ea5a0); color:#fff; padding:32px 40px; text-align:center; }}
  .header h1 {{ font-size:28px; letter-spacing:6px; font-weight:700; }}
  .header .sub {{ margin-top:8px; font-size:13px; opacity:0.85; }}
  .meta {{ display:flex; justify-content:space-between; padding:16px 40px; background:#f8fffe; border-bottom:1px solid #e0f7f6; font-size:13px; }}
  .meta .badge {{ padding:4px 12px; border-radius:20px; font-weight:600; font-size:12px; }}
  .badge-draft {{ background:#fef3c7; color:#d97706; }}
  .badge-submitted {{ background:#dbeafe; color:#2563eb; }}
  .badge-supplier_selected {{ background:#d1fae5; color:#059669; }}
  .badge-forwarded {{ background:#ede9fe; color:#7c3aed; }}
  .content {{ padding:24px 40px 40px; }}
  .sec-table {{ width:100%; border-collapse:collapse; margin-bottom:16px; }}
  .sec-header {{ background:#06b6d4; color:#fff; font-weight:700; font-size:13px; padding:10px 16px; text-align:center; }}
  .th {{ background:#f1f5f9; font-weight:600; font-size:12px; color:#475569; padding:10px 16px; width:180px; border:1px solid #e2e8f0; vertical-align:top; }}
  .td {{ font-size:12px; padding:10px 16px; border:1px solid #e2e8f0; line-height:1.7; }}
  .empty {{ color:#94a3b8; font-style:italic; }}
  .supplier-box {{ background:#f0fdf4; border:1.5px solid #bbf7d0; border-radius:12px; padding:16px 20px; margin-top:16px; text-align:center; }}
  .supplier-box .name {{ font-size:16px; font-weight:700; color:#059669; }}
  .footer {{ text-align:center; padding:20px; font-size:11px; color:#94a3b8; border-top:1px solid #f1f5f9; }}
  .btn-download {{ display:inline-block; margin:12px 8px; padding:10px 24px; border-radius:10px; border:1.5px solid #06b6d4; background:#fff; color:#06b6d4; font-weight:600; font-size:13px; cursor:pointer; }}
  .btn-download:hover {{ background:#f0fdfa; }}
  @media print {{
    body {{ background:#fff; padding:0; }}
    .container {{ box-shadow:none; border-radius:0; }}
    .btn-download {{ display:none; }}
  }}
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>구 매 요 청 서</h1>
    <div class="sub">{_esc(category)} · {_esc(label)}</div>
  </div>
  <div class="meta">
    <span>작성일: {date_str}</span>
    <span class="badge badge-{status}">{status_label}</span>
  </div>
  <div class="content">
    {section_html}
    {f'<div class="supplier-box"><div style="font-size:11px;color:#64748b;margin-bottom:4px">선택된 공급업체</div><div class="name">{supplier_name}</div></div>' if supplier_name else ''}
  </div>
  <div class="footer">
    <button class="btn-download" onclick="window.print()">PDF 다운로드</button>
    <br>업무마켓9 — AI 기반 구매요청서 자동생성 시스템
  </div>
</div>
</body>
</html>"""
    return html


@router.get("/view/{pr_id}")
async def view_pr(pr_id: int):
    """PR 상세 보기 HTML 페이지"""
    supabase = get_client()
    result = supabase.table("pr_requests").select("*").eq("id", pr_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="구매요청서를 찾을 수 없습니다.")
    pr = result.data[0]
    html = _render_pr_html(pr)
    return HTMLResponse(content=html)

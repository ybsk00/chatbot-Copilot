"""계약서 API — 템플릿 조회 / 저장 / 미리보기 HTML"""
import logging
from datetime import datetime
from html import escape

from fastapi import APIRouter, HTTPException
from fastapi.responses import HTMLResponse
from pydantic import BaseModel

from app.db.supabase_client import get_client

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/contracts", tags=["contracts"])


def _esc(v) -> str:
    if v is None:
        return ""
    return escape(str(v)) if str(v).strip() else ""


# ── GET /contracts/template/{l3_code} ─────────────────────
@router.get("/template/{l3_code}")
async def get_contract_template(l3_code: str):
    """L3 코드에 매핑된 계약서 템플릿 반환."""
    sb = get_client()
    # l3_codes 배열에 해당 코드가 포함된 템플릿 조회
    rows = sb.table("contract_templates").select("*").contains("l3_codes", [l3_code]).execute().data
    if not rows:
        raise HTTPException(404, f"L3 코드 {l3_code}에 매핑된 계약서 템플릿이 없습니다.")
    return rows[0]


# ── GET /contracts/template-by-type/{contract_type} ───────
@router.get("/template-by-type/{contract_type}")
async def get_contract_template_by_type(contract_type: str):
    """계약유형 코드(A~L)로 직접 조회."""
    sb = get_client()
    rows = sb.table("contract_templates").select("*").eq("contract_type", contract_type).execute().data
    if not rows:
        raise HTTPException(404, f"계약유형 {contract_type} 템플릿이 없습니다.")
    return rows[0]


# ── POST /contracts/save ──────────────────────────────────
class ContractSaveRequest(BaseModel):
    session_id: str | None = None
    contract_type: str
    source_type: str = "pr"          # pr / rfq / direct
    source_id: int | None = None
    l3_code: str | None = None
    l4_code: str | None = None
    buyer_fields: dict = {}
    supplier_fields: dict = {}
    article_fields: dict = {}
    special_terms: str | None = None
    selected_suppliers: list = []


@router.post("/save")
async def save_contract(req: ContractSaveRequest):
    """계약서 저장."""
    sb = get_client()
    row = {
        "session_id": req.session_id,
        "contract_type": req.contract_type,
        "source_type": req.source_type,
        "source_id": req.source_id,
        "l3_code": req.l3_code,
        "l4_code": req.l4_code,
        "buyer_fields": req.buyer_fields,
        "supplier_fields": req.supplier_fields,
        "article_fields": req.article_fields,
        "special_terms": req.special_terms,
        "selected_suppliers": req.selected_suppliers,
        "status": "draft",
    }
    result = sb.table("contract_requests").insert(row).execute()
    if result.data:
        return {"ok": True, "id": result.data[0]["id"]}
    raise HTTPException(500, "계약서 저장 실패")


# ── GET /contracts/view/{contract_id} ─────────────────────
@router.get("/view/{contract_id}", response_class=HTMLResponse)
async def view_contract(contract_id: int):
    """계약서 미리보기 HTML."""
    sb = get_client()

    # 계약서 이력 조회
    rows = sb.table("contract_requests").select("*").eq("id", contract_id).execute().data
    if not rows:
        raise HTTPException(404, "계약서를 찾을 수 없습니다.")
    contract = rows[0]

    # 템플릿 조회
    tpl_rows = sb.table("contract_templates").select("*").eq("contract_type", contract["contract_type"]).execute().data
    if not tpl_rows:
        raise HTTPException(404, "계약서 템플릿을 찾을 수 없습니다.")
    tpl = tpl_rows[0]

    return HTMLResponse(_render_contract_html(contract, tpl))


def _render_contract_html(contract: dict, tpl: dict) -> str:
    """계약서 전체 조항 + 입력값 병합 → HTML."""
    ct_name = tpl.get("contract_name", "계약서")
    buyer = contract.get("buyer_fields") or {}
    supplier = contract.get("supplier_fields") or {}
    article_vals = contract.get("article_fields") or {}
    special = contract.get("special_terms") or ""
    all_articles = tpl.get("all_articles") or []
    key_articles = tpl.get("key_articles") or []

    # 핵심 조항의 입력필드 값을 num 기준으로 인덱싱
    key_fields_by_num = {}
    for ka in key_articles:
        key_fields_by_num[ka["num"]] = ka.get("fields", {})

    now = datetime.now().strftime("%Y년 %m월 %d일")

    # 당사자 정보 HTML
    buyer_html = f"""
    <div class="party-box">
        <div class="party-title">발주자 (갑)</div>
        <table class="party-table">
            <tr><td class="lbl">상 호</td><td>{_esc(buyer.get('buyer_name',''))}</td></tr>
            <tr><td class="lbl">대표자</td><td>{_esc(buyer.get('buyer_rep',''))}</td></tr>
            <tr><td class="lbl">주 소</td><td>{_esc(buyer.get('buyer_addr',''))}</td></tr>
            <tr><td class="lbl">사업자등록번호</td><td>{_esc(buyer.get('buyer_brn',''))}</td></tr>
        </table>
    </div>
    """
    supplier_html = f"""
    <div class="party-box">
        <div class="party-title">수주자 (을)</div>
        <table class="party-table">
            <tr><td class="lbl">상 호</td><td>{_esc(supplier.get('supplier_name',''))}</td></tr>
            <tr><td class="lbl">대표자</td><td>{_esc(supplier.get('supplier_rep',''))}</td></tr>
            <tr><td class="lbl">주 소</td><td>{_esc(supplier.get('supplier_addr',''))}</td></tr>
            <tr><td class="lbl">사업자등록번호</td><td>{_esc(supplier.get('supplier_brn',''))}</td></tr>
        </table>
    </div>
    """

    # 조항 HTML
    articles_html = ""
    for art in all_articles:
        num = art.get("num", "")
        title = art.get("title", "")
        star = ' <span class="star">★발주자유리</span>' if art.get("star") else ""
        body = _esc(art.get("body", "")).replace("\n", "<br/>")
        is_key = art.get("is_key", False)

        # 핵심 조항이면 입력값 삽입
        filled_html = ""
        if is_key and num in key_fields_by_num:
            fields = key_fields_by_num[num]
            for fk, fd in fields.items():
                label = fd.get("label", fk)
                val = article_vals.get(fk, "")
                filled_html += f'<div class="filled-field"><span class="flbl">{_esc(label)}:</span> <span class="fval">{_esc(val) or "—"}</span></div>'

        key_cls = " key-article" if is_key else ""
        articles_html += f"""
        <div class="article{key_cls}">
            <div class="article-header">{_esc(num)} [{_esc(title)}]{star}</div>
            <div class="article-body">{body}</div>
            {filled_html}
        </div>
        """

    # 특약사항
    special_html = ""
    if special:
        special_html = f'<div class="article key-article"><div class="article-header">특약사항</div><div class="article-body">{_esc(special).replace(chr(10), "<br/>")}</div></div>'

    return f"""<!DOCTYPE html>
<html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>{_esc(ct_name)}</title>
<style>
*{{margin:0;padding:0;box-sizing:border-box}}
body{{font-family:'Pretendard','Noto Sans KR',sans-serif;background:#f8f9fa;color:#1a1a2e;line-height:1.7;padding:40px 20px}}
.container{{max-width:800px;margin:0 auto;background:#fff;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.08);overflow:hidden}}
.header{{background:linear-gradient(135deg,#0ea5a0,#0d9488);color:#fff;padding:32px 40px;text-align:center}}
.header h1{{font-size:24px;letter-spacing:8px;margin-bottom:8px}}
.header .sub{{font-size:13px;opacity:0.85}}
.parties{{display:flex;gap:20px;padding:24px 40px;background:#f0fdfa}}
.party-box{{flex:1;background:#fff;border-radius:10px;padding:16px;border:1px solid #e0f2fe}}
.party-title{{font-weight:700;color:#0ea5a0;margin-bottom:8px;font-size:14px}}
.party-table{{width:100%;font-size:13px}}
.party-table td{{padding:4px 8px;border-bottom:1px solid #f3f4f6}}
.party-table .lbl{{width:100px;color:#6b7280;font-weight:600}}
.content{{padding:24px 40px 40px}}
.article{{margin-bottom:16px;padding:12px 16px;border-radius:8px;border:1px solid #f3f4f6}}
.article.key-article{{border-color:#0ea5a0;background:rgba(14,165,160,0.02)}}
.article-header{{font-weight:700;font-size:14px;color:#1a1a2e;margin-bottom:6px}}
.star{{color:#0ea5a0;font-size:11px;font-weight:600}}
.article-body{{font-size:13px;color:#4b5563}}
.filled-field{{margin-top:8px;padding:8px 12px;background:#f0fdfa;border-radius:6px;font-size:13px}}
.flbl{{font-weight:600;color:#0ea5a0}}
.fval{{color:#1a1a2e}}
.signature{{padding:32px 40px;border-top:2px solid #e5e7eb;display:flex;justify-content:space-between;gap:40px}}
.sig-box{{flex:1;text-align:center}}
.sig-box .date{{font-size:13px;color:#6b7280;margin-bottom:16px}}
.sig-box .label{{font-size:14px;font-weight:700;margin-bottom:24px}}
.sig-box .line{{border-top:1px solid #1a1a2e;padding-top:8px;font-size:13px}}
</style></head><body>
<div class="container">
    <div class="header">
        <h1>{_esc(ct_name).replace('계약서','계 약 서')}</h1>
        <div class="sub">작성일: {now}</div>
    </div>
    <div class="parties">{buyer_html}{supplier_html}</div>
    <div class="content">
        <p style="margin-bottom:20px;font-size:14px;text-align:center;color:#4b5563">
            발주자와 수주자는 다음과 같이 계약을 체결하고, 이를 증명하기 위하여 본 계약서 2통을 작성하여 각 1통씩 보관한다.
        </p>
        {articles_html}
        {special_html}
    </div>
    <div class="signature">
        <div class="sig-box">
            <div class="date">{now}</div>
            <div class="label">발주자 (갑)</div>
            <div class="line">{_esc(buyer.get('buyer_name',''))} 대표이사 {_esc(buyer.get('buyer_rep',''))} (인)</div>
        </div>
        <div class="sig-box">
            <div class="date">{now}</div>
            <div class="label">수주자 (을)</div>
            <div class="line">{_esc(supplier.get('supplier_name',''))} 대표이사 {_esc(supplier.get('supplier_rep',''))} (인)</div>
        </div>
    </div>
</div></body></html>"""

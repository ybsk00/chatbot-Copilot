/**
 * RFQ(견적서) 미리보기 HTML + PDF 다운로드
 */

const STYLES = `
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: 'Noto Sans KR', 'Malgun Gothic', sans-serif; max-width:900px; margin:0 auto; padding:40px 30px; color:#1e293b; }
  .header { text-align:center; border-bottom:3px solid #6366f1; padding-bottom:20px; margin-bottom:30px; }
  .header .subtitle { font-size:11px; letter-spacing:3px; color:#94a3b8; margin-bottom:8px; }
  .header h1 { font-size:24px; letter-spacing:6px; color:#1e293b; margin-bottom:12px; }
  .header .badge { display:inline-block; padding:4px 16px; background:#eef2ff; color:#6366f1; border-radius:8px; font-size:13px; font-weight:700; }
  .section { margin-bottom:20px; }
  .section-title { background:#f8fafc; padding:10px 16px; border-left:4px solid #6366f1; font-size:14px; font-weight:700; color:#1e293b; margin-bottom:0; }
  table { width:100%; border-collapse:collapse; margin-bottom:16px; }
  th { background:#f1f5f9; text-align:left; padding:8px 14px; font-size:12px; font-weight:600; color:#475569; width:30%; border:1px solid #e2e8f0; }
  td { padding:8px 14px; font-size:12px; color:#1e293b; border:1px solid #e2e8f0; }
  td.empty { color:#94a3b8; font-style:italic; }
  .required { color:#ef4444; font-size:10px; margin-left:2px; }
  .footer { margin-top:40px; border-top:2px solid #e2e8f0; padding-top:20px; display:flex; justify-content:space-between; }
  .footer .sig { text-align:center; width:30%; }
  .footer .sig-line { border-bottom:1px solid #94a3b8; height:40px; margin-bottom:8px; }
  .footer .sig-label { font-size:11px; color:#64748b; }
  .actions { text-align:center; margin-top:30px; }
  .actions button { padding:12px 28px; margin:0 8px; border-radius:8px; font-size:13px; font-weight:600; cursor:pointer; border:none; }
  .btn-print { background:#6366f1; color:#fff; }
  .btn-close { background:#f1f5f9; color:#475569; border:1px solid #e2e8f0; }
  @media print { .actions { display:none; } }
`;

/**
 * RFQ 미리보기 HTML 페이지 열기
 */
export function previewRfq(rfqFields, rfqSections, templateName) {
  const w = window.open("", "_blank");
  if (!w) return;

  let sectionsHtml = "";
  (rfqSections || []).forEach(sec => {
    let rows = "";
    (sec.fields || []).forEach(fk => {
      const f = rfqFields[fk];
      if (!f) return;
      const val = (f.value || "").trim();
      const reqMark = f.required !== false ? '<span class="required">*</span>' : '';
      rows += `<tr>
        <th>${f.label}${reqMark}</th>
        <td class="${val ? '' : 'empty'}">${val || "미입력"}</td>
      </tr>`;
    });
    sectionsHtml += `
      <div class="section">
        <div class="section-title">${sec.title}</div>
        <table>${rows}</table>
      </div>`;
  });

  const today = new Date().toLocaleDateString("ko-KR");
  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <title>견적요청서 미리보기</title>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;600;700&display=swap" rel="stylesheet">
  <style>${STYLES}</style>
</head>
<body>
  <div class="header">
    <div class="subtitle">표준 견적서 양식</div>
    <h1>견 적 요 청 서</h1>
    <span class="badge">${templateName || "견적요청서"}</span>
  </div>

  ${sectionsHtml}

  <div class="footer">
    <div class="sig">
      <div>작성일: ${today}</div>
    </div>
    <div class="sig">
      <div class="sig-line"></div>
      <div class="sig-label">소싱담당자</div>
    </div>
    <div class="sig">
      <div class="sig-line"></div>
      <div class="sig-label">발주기관 (인)</div>
    </div>
  </div>

  <div class="actions">
    <button class="btn-print" onclick="window.print()">PDF 다운로드 (인쇄)</button>
    <button class="btn-close" onclick="window.close()">닫기</button>
  </div>
</body>
</html>`;

  w.document.write(html);
  w.document.close();
}

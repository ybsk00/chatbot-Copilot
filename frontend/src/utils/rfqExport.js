/**
 * RFQ(견적서) 미리보기 HTML + PDF 다운로드
 * rfpExport.js와 동일 패턴 (버튼/스타일 통일)
 */
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ── 미리보기 HTML 스타일 ──
const STYLES = `
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: 'Noto Sans KR', 'Malgun Gothic', sans-serif; max-width:900px; margin:0 auto; padding:40px 30px; color:#1e293b; }
  .header { text-align:center; border-bottom:3px solid #6366f1; padding-bottom:20px; margin-bottom:30px; }
  .header .subtitle { font-size:11px; letter-spacing:3px; color:#94a3b8; margin-bottom:8px; }
  .header h1 { font-size:24px; letter-spacing:6px; color:#1e293b; margin-bottom:12px; }
  .header .badge { display:inline-block; padding:4px 16px; background:#eef2ff; color:#6366f1; border-radius:8px; font-size:13px; font-weight:700; }
  .section { margin-bottom:20px; }
  .section-title { background:#f8fafc; padding:10px 16px; border-left:4px solid #6366f1; font-size:14px; font-weight:700; color:#1e293b; margin-bottom:0; }
  .section-title.supplier { border-left-color:#f59e0b; background:#fffbeb; }
  .supplier-notice { background:#fef3c7; padding:8px 16px; font-size:11px; color:#92400e; border:1px solid #fde68a; border-top:none; }
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
    const isSupplier = sec.supplier_zone;
    let rows = "";
    (sec.fields || []).forEach(fk => {
      const f = rfqFields[fk];
      if (!f) return;
      const val = (f.value || "").trim();
      const reqMark = f.required !== false && !isSupplier ? '<span class="required">*</span>' : '';
      rows += `<tr>
        <th>${f.label}${reqMark}</th>
        <td class="${val ? '' : 'empty'}">${val || (isSupplier ? "공급업체 기재" : "미입력")}</td>
      </tr>`;
    });

    const titleClass = isSupplier ? "section-title supplier" : "section-title";
    const notice = isSupplier
      ? '<div class="supplier-notice">📦 이 영역은 공급업체가 작성하는 란입니다. 소싱담당자는 입력하지 않아도 됩니다.</div>'
      : '';

    sectionsHtml += `
      <div class="section">
        <div class="${titleClass}">${sec.title}</div>
        ${notice}
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


// ═══════════════════════════════════════════
// PDF 다운로드 (jsPDF — rfpExport.js 동일 패턴)
// ═══════════════════════════════════════════

let fontCache = null;

async function loadKoreanFonts() {
  if (fontCache) return fontCache;
  const [regularRes, boldRes] = await Promise.all([
    fetch("https://fonts.gstatic.com/ea/nanumgothic/v5/NanumGothic-Regular.ttf"),
    fetch("https://fonts.gstatic.com/ea/nanumgothic/v5/NanumGothic-Bold.ttf"),
  ]);
  const [regularBuf, boldBuf] = await Promise.all([
    regularRes.arrayBuffer(),
    boldRes.arrayBuffer(),
  ]);
  fontCache = {
    regular: arrayBufferToBase64(regularBuf),
    bold: arrayBufferToBase64(boldBuf),
  };
  return fontCache;
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

const TH = { fillColor: [232, 232, 232], textColor: [17, 17, 17], fontStyle: "bold", halign: "center", valign: "middle", cellPadding: 3, fontSize: 9.5, cellWidth: 30 };
const TD = { fillColor: [255, 255, 255], textColor: [34, 34, 34], fontStyle: "normal", halign: "left", valign: "top", cellPadding: 3, fontSize: 9.5 };
const SECTION_HDR = { fillColor: [51, 51, 51], textColor: [255, 255, 255], fontStyle: "bold", halign: "center", valign: "middle", cellPadding: 3, fontSize: 10 };
const SUPPLIER_HDR = { fillColor: [254, 243, 199], textColor: [146, 64, 14], fontStyle: "bold", halign: "center", valign: "middle", cellPadding: 3, fontSize: 10 };
const BDR = { lineColor: [51, 51, 51], lineWidth: 0.3 };

export async function downloadRfqPdf(fields, sections, templateName, orgName) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const fonts = await loadKoreanFonts();
  doc.addFileToVFS("NanumGothic-Regular.ttf", fonts.regular);
  doc.addFileToVFS("NanumGothic-Bold.ttf", fonts.bold);
  doc.addFont("NanumGothic-Regular.ttf", "NanumGothic", "normal");
  doc.addFont("NanumGothic-Bold.ttf", "NanumGothic", "bold");
  doc.setFont("NanumGothic", "normal");

  const pageW = doc.internal.pageSize.getWidth();
  const marginX = 20;
  let y = 20;

  // 제목
  doc.setFont("NanumGothic", "bold");
  doc.setFontSize(24);
  doc.setTextColor(17, 17, 17);
  doc.text("견 적 요 청 서", pageW / 2, y, { align: "center" });
  y += 5;
  doc.setDrawColor(34, 34, 34);
  doc.setLineWidth(1.0);
  doc.line(marginX, y, pageW - marginX, y);
  y += 1.8;
  doc.setLineWidth(0.3);
  doc.line(marginX, y, pageW - marginX, y);
  y += 6;

  if (templateName) {
    doc.setFont("NanumGothic", "normal");
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.text(templateName, pageW / 2, y, { align: "center" });
    y += 8;
  }

  // 발주기관 정보
  const orgVal = fields.rq1?.value || orgName || "";
  const dept = fields.rq2?.value || "";
  const manager = fields.rq3?.value || "";
  const phone = fields.rq4?.value || "";
  const email = fields.rq5?.value || "";

  autoTable(doc, {
    startY: y, margin: { left: marginX, right: marginX },
    tableLineColor: BDR.lineColor, tableLineWidth: BDR.lineWidth,
    styles: { font: "NanumGothic", ...BDR },
    body: [
      [{ content: "발주기관", styles: TH }, { content: orgVal, colSpan: 5, styles: { ...TD, fontStyle: "bold", fontSize: 11 } }],
      [{ content: "담 당 자", styles: TH }, { content: "성명", styles: { ...TH, cellWidth: 15 } }, { content: manager, styles: { ...TD, cellWidth: 35 } }, { content: "부서", styles: { ...TH, cellWidth: 15 } }, { content: dept, styles: { ...TD, cellWidth: 35 } }, { content: phone, styles: TD }],
      [{ content: "이 메 일", styles: TH }, { content: email, colSpan: 5, styles: TD }],
    ],
  });
  y = doc.lastAutoTable.finalY;

  // 각 섹션
  for (const sec of sections) {
    if (sec.common) continue;
    const isSupplier = sec.supplier_zone;
    const hdr = isSupplier ? SUPPLIER_HDR : SECTION_HDR;
    const title = isSupplier ? "공급업체 작성란 (입력 불필요)" : sec.title.replace(/^\d+\.\s*/, "").replace(/^※\s*/, "");

    const rows = (sec.fields || []).map(fk => {
      const f = fields[fk];
      if (!f) return null;
      const val = f.value || (isSupplier ? "(공급업체 기재)" : "-");
      const tdStyle = isSupplier ? { ...TD, textColor: [160, 160, 160] } : TD;
      return [{ content: f.label || fk, styles: TH }, { content: val, colSpan: 5, styles: tdStyle }];
    }).filter(Boolean);

    if (rows.length === 0) continue;
    if (y > 240) { doc.addPage(); y = 20; }

    autoTable(doc, {
      startY: y, margin: { left: marginX, right: marginX },
      tableLineColor: BDR.lineColor, tableLineWidth: BDR.lineWidth,
      styles: { font: "NanumGothic", ...BDR },
      body: [[{ content: title, colSpan: 6, styles: hdr }], ...rows],
    });
    y = doc.lastAutoTable.finalY;
  }

  // 서명란
  if (y > 245) { doc.addPage(); y = 20; }
  y += 16;
  const today = new Date();
  const dateStr = `${today.getFullYear()}년 ${String(today.getMonth() + 1).padStart(2, "0")}월 ${String(today.getDate()).padStart(2, "0")}일`;

  doc.setFont("NanumGothic", "normal");
  doc.setFontSize(11);
  doc.setTextColor(51, 51, 51);
  doc.text(dateStr, pageW - marginX, y, { align: "right" });
  y += 10;
  doc.setFont("NanumGothic", "bold");
  doc.setFontSize(13);
  doc.text(orgVal || "발주기관", pageW - marginX, y, { align: "right" });
  y += 9;
  doc.setFont("NanumGothic", "normal");
  doc.setFontSize(11);
  doc.text(`담당자: ${manager}`, pageW - marginX - 22, y, { align: "right" });
  doc.setDrawColor(153, 153, 153);
  doc.setLineWidth(0.3);
  const sealX = pageW - marginX - 18;
  doc.rect(sealX, y - 7, 16, 16);
  doc.setFontSize(8);
  doc.setTextColor(153, 153, 153);
  doc.text("(인)", sealX + 8, y + 2, { align: "center" });

  // 푸터
  y += 22;
  if (y > 280) y = 280;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);
  doc.line(marginX, y, pageW - marginX, y);
  y += 5;
  doc.setFont("NanumGothic", "normal");
  doc.setFontSize(8);
  doc.setTextColor(160, 160, 160);
  doc.text("업무마켓9 — AI 기반 견적요청서 자동생성 시스템", pageW / 2, y, { align: "center" });

  doc.save(`RFQ_${orgVal || "document"}_${today.toISOString().slice(0, 10)}.pdf`);
}

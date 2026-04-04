/**
 * 계약서 PDF 다운로드 — PR/RFP와 동일 스타일
 */
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

let fontCache = null;

async function loadKoreanFonts() {
  if (fontCache) return fontCache;
  const [regularRes, boldRes] = await Promise.all([
    fetch("https://fonts.gstatic.com/ea/nanumgothic/v5/NanumGothic-Regular.ttf"),
    fetch("https://fonts.gstatic.com/ea/nanumgothic/v5/NanumGothic-Bold.ttf"),
  ]);
  const [regularBuf, boldBuf] = await Promise.all([regularRes.arrayBuffer(), boldRes.arrayBuffer()]);
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

const TH = { fillColor: [232, 232, 232], textColor: [17, 17, 17], fontStyle: "bold", halign: "center", valign: "middle", cellPadding: 3, fontSize: 9.5, cellWidth: 38 };
const TD = { fillColor: [255, 255, 255], textColor: [34, 34, 34], fontStyle: "normal", halign: "left", valign: "top", cellPadding: 3, fontSize: 9.5 };
const SECTION_HEADER = { fillColor: [6, 182, 212], textColor: [255, 255, 255], fontStyle: "bold", halign: "center", valign: "middle", cellPadding: 3, fontSize: 10 };
const BORDER = { lineColor: [51, 51, 51], lineWidth: 0.3 };

/**
 * @param {Object} contractFields - 입력값 { buyer_name, k1, ... }
 * @param {Object} template - contract_templates 행
 */
export async function downloadContractPdf(contractFields, template) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const fonts = await loadKoreanFonts();
  doc.addFileToVFS("NanumGothic-Regular.ttf", fonts.regular);
  doc.addFileToVFS("NanumGothic-Bold.ttf", fonts.bold);
  doc.addFont("NanumGothic-Regular.ttf", "NanumGothic", "normal");
  doc.addFont("NanumGothic-Bold.ttf", "NanumGothic", "bold");
  doc.setFont("NanumGothic", "normal");

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginX = 20;
  let y = 20;

  const ctName = template.contract_name || "계약서";
  const today = new Date();
  const dateStr = `${today.getFullYear()}년 ${String(today.getMonth() + 1).padStart(2, "0")}월 ${String(today.getDate()).padStart(2, "0")}일`;

  // ═══ 제목 ═══
  doc.setFont("NanumGothic", "bold");
  doc.setFontSize(22);
  doc.setTextColor(17, 17, 17);
  const titleSpaced = ctName.replace("계약서", "계 약 서");
  doc.text(titleSpaced, pageW / 2, y, { align: "center" });
  y += 5;
  doc.setDrawColor(6, 182, 212);
  doc.setLineWidth(1.0);
  doc.line(marginX, y, pageW - marginX, y);
  y += 1.8;
  doc.setLineWidth(0.3);
  doc.line(marginX, y, pageW - marginX, y);
  y += 8;

  // ═══ 당사자 정보 ═══
  autoTable(doc, {
    startY: y,
    margin: { left: marginX, right: marginX },
    tableLineColor: BORDER.lineColor, tableLineWidth: BORDER.lineWidth,
    styles: { font: "NanumGothic", ...BORDER },
    body: [
      [{ content: "발주자 (갑)", colSpan: 4, styles: SECTION_HEADER }],
      [{ content: "상 호", styles: TH }, { content: contractFields.buyer_name || "", styles: TD },
       { content: "대표자", styles: TH }, { content: contractFields.buyer_rep || "", styles: TD }],
      [{ content: "주 소", styles: TH }, { content: contractFields.buyer_addr || "", colSpan: 3, styles: TD }],
      [{ content: "사업자번호", styles: TH }, { content: contractFields.buyer_brn || "", colSpan: 3, styles: TD }],
      [{ content: "수주자 (을)", colSpan: 4, styles: SECTION_HEADER }],
      [{ content: "상 호", styles: TH }, { content: contractFields.supplier_name || "", styles: TD },
       { content: "대표자", styles: TH }, { content: contractFields.supplier_rep || "", styles: TD }],
      [{ content: "주 소", styles: TH }, { content: contractFields.supplier_addr || "", colSpan: 3, styles: TD }],
      [{ content: "사업자번호", styles: TH }, { content: contractFields.supplier_brn || "", colSpan: 3, styles: TD }],
    ],
  });
  y = doc.lastAutoTable.finalY + 6;

  // ═══ 전문 ═══
  doc.setFont("NanumGothic", "normal");
  doc.setFontSize(9);
  doc.setTextColor(51, 51, 51);
  const preamble = "발주자와 수주자는 다음과 같이 계약을 체결하고, 이를 증명하기 위하여 본 계약서 2통을 작성하여 각 1통씩 보관한다.";
  const splitPreamble = doc.splitTextToSize(preamble, pageW - marginX * 2);
  doc.text(splitPreamble, marginX, y);
  y += splitPreamble.length * 5 + 4;

  // ═══ 조항 ═══
  const allArticles = template.all_articles || [];
  const keyFieldMap = {};
  for (const ka of (template.key_articles || [])) {
    keyFieldMap[ka.num] = ka.fields || {};
  }

  for (const art of allArticles) {
    // 페이지 넘김 체크
    if (y > pageH - 30) {
      doc.addPage();
      y = 20;
    }

    const isKey = art.is_key;
    const star = art.star ? " ★발주자유리" : "";

    // 조항 제목
    doc.setFont("NanumGothic", "bold");
    doc.setFontSize(10);
    doc.setTextColor(isKey ? 6 : 17, isKey ? 182 : 17, isKey ? 212 : 17);
    doc.text(`${art.num} [${art.title}]${star}`, marginX, y);
    y += 5;

    // 조항 본문
    doc.setFont("NanumGothic", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(68, 68, 68);
    const bodyText = (art.body || "").replace(/\n{2,}/g, "\n");
    const lines = doc.splitTextToSize(bodyText, pageW - marginX * 2);
    const maxLines = isKey ? lines.length : Math.min(lines.length, 6);
    for (let i = 0; i < maxLines; i++) {
      if (y > pageH - 15) { doc.addPage(); y = 20; }
      doc.text(lines[i], marginX, y);
      y += 3.8;
    }
    if (!isKey && lines.length > 6) {
      doc.setTextColor(150, 150, 150);
      doc.text("  (...이하 생략, 전문은 미리보기 참조)", marginX, y);
      y += 4;
    }

    // 핵심 조항의 입력값 표시
    if (isKey && keyFieldMap[art.num]) {
      const fields = keyFieldMap[art.num];
      const fieldEntries = Object.entries(fields);
      if (fieldEntries.length > 0) {
        const tableBody = fieldEntries.map(([fk, fd]) => [
          { content: (fd.label || fk).slice(0, 25), styles: { ...TH, fontSize: 8.5, cellWidth: 50 } },
          { content: contractFields[fk] || "—", styles: { ...TD, fontSize: 9 } },
        ]);
        if (y > pageH - 25) { doc.addPage(); y = 20; }
        autoTable(doc, {
          startY: y,
          margin: { left: marginX + 4, right: marginX + 4 },
          tableLineColor: [6, 182, 212], tableLineWidth: 0.2,
          styles: { font: "NanumGothic", lineColor: [6, 182, 212], lineWidth: 0.2 },
          body: tableBody,
        });
        y = doc.lastAutoTable.finalY + 3;
      }
    }
    y += 2;
  }

  // ═══ 특약사항 ═══
  if (contractFields._special_terms) {
    if (y > pageH - 30) { doc.addPage(); y = 20; }
    doc.setFont("NanumGothic", "bold");
    doc.setFontSize(10);
    doc.setTextColor(6, 182, 212);
    doc.text("특약사항", marginX, y);
    y += 5;
    doc.setFont("NanumGothic", "normal");
    doc.setFontSize(9);
    doc.setTextColor(51, 51, 51);
    const spLines = doc.splitTextToSize(contractFields._special_terms, pageW - marginX * 2);
    for (const line of spLines) {
      if (y > pageH - 15) { doc.addPage(); y = 20; }
      doc.text(line, marginX, y);
      y += 4;
    }
    y += 4;
  }

  // ═══ 서명란 ═══
  if (y > pageH - 50) { doc.addPage(); y = 20; }
  y += 10;
  doc.setFont("NanumGothic", "normal");
  doc.setFontSize(10);
  doc.setTextColor(51, 51, 51);
  doc.text(dateStr, pageW / 2, y, { align: "center" });
  y += 10;

  const col1 = marginX + 10;
  const col2 = pageW / 2 + 10;

  doc.setFont("NanumGothic", "bold");
  doc.text("발주자 (갑)", col1, y);
  doc.text("수주자 (을)", col2, y);
  y += 6;
  doc.setFont("NanumGothic", "normal");
  doc.setFontSize(9);
  doc.text(`상호: ${contractFields.buyer_name || ""}`, col1, y);
  doc.text(`상호: ${contractFields.supplier_name || ""}`, col2, y);
  y += 5;
  doc.text(`대표: ${contractFields.buyer_rep || ""}  (인)`, col1, y);
  doc.text(`대표: ${contractFields.supplier_rep || ""}  (인)`, col2, y);

  // ═══ 저장 ═══
  doc.save(`${ctName}_${dateStr.replace(/\s/g, "")}.pdf`);
}

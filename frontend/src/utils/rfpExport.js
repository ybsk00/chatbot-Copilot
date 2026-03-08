/**
 * RFP PDF 다운로드 — 정부 표준양식 스타일 (한글 폰트 지원)
 */
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ── 한글 폰트 캐시 ──
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

export async function downloadRfpPdf(fields, sections, templateLabel, orgName) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  // ── 한글 폰트 로드 + 등록 ──
  const fonts = await loadKoreanFonts();
  doc.addFileToVFS("NanumGothic-Regular.ttf", fonts.regular);
  doc.addFileToVFS("NanumGothic-Bold.ttf", fonts.bold);
  doc.addFont("NanumGothic-Regular.ttf", "NanumGothic", "normal");
  doc.addFont("NanumGothic-Bold.ttf", "NanumGothic", "bold");
  doc.setFont("NanumGothic", "normal");

  const pageW = doc.internal.pageSize.getWidth();
  const marginX = 20;
  const contentW = pageW - marginX * 2;
  let y = 20;

  // ── 헤더 ──
  doc.setFillColor(14, 165, 160);
  doc.rect(0, 0, pageW, 3, "F");

  doc.setFont("NanumGothic", "normal");
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text("Request for Proposal", pageW / 2, y, { align: "center" });
  y += 8;

  doc.setFontSize(22);
  doc.setTextColor(30, 41, 59);
  doc.setFont("NanumGothic", "bold");
  doc.text("제 안 요 청 서 (RFP)", pageW / 2, y, { align: "center" });
  y += 8;

  doc.setFontSize(11);
  doc.setTextColor(14, 165, 160);
  doc.setFont("NanumGothic", "normal");
  doc.text(templateLabel || "RFP", pageW / 2, y, { align: "center" });
  y += 12;

  // ── 구분선 ──
  doc.setDrawColor(14, 165, 160);
  doc.setLineWidth(0.5);
  doc.line(marginX, y, pageW - marginX, y);
  y += 10;

  // ── 섹션별 테이블 ──
  sections.forEach((section) => {
    if (y > 250) {
      doc.addPage();
      y = 20;
    }

    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.setFont("NanumGothic", "bold");
    doc.text(section.title, marginX, y);
    y += 2;

    const rows = section.fields.map((fk) => {
      const f = fields[fk];
      return [f?.label || fk, f?.value || "-"];
    });

    autoTable(doc, {
      startY: y,
      margin: { left: marginX, right: marginX },
      head: [["항목", "내용"]],
      body: rows,
      styles: {
        font: "NanumGothic",
        fontSize: 10,
        cellPadding: 4,
        lineColor: [220, 220, 220],
        lineWidth: 0.3,
      },
      headStyles: {
        fillColor: [14, 165, 160],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 9,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { cellWidth: 50, fontStyle: "bold", textColor: [71, 85, 105] },
        1: { cellWidth: contentW - 50 },
      },
    });

    y = doc.lastAutoTable.finalY + 10;
  });

  // ── 서명란 ──
  if (y > 240) {
    doc.addPage();
    y = 20;
  }

  y += 5;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(marginX, y, pageW - marginX, y);
  y += 12;

  const sigCols = [
    { label: "작성일", value: new Date().toLocaleDateString("ko-KR") },
    { label: "담당자 (서명)", value: fields.s3?.value || "" },
    { label: "발주기관", value: fields.s1?.value || "" },
  ];

  const colW = contentW / 3;
  sigCols.forEach((sig, i) => {
    const cx = marginX + colW * i + colW / 2;
    doc.setFont("NanumGothic", "normal");
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 140);
    doc.text(sig.label, cx, y, { align: "center" });
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text(sig.value, cx, y + 8, { align: "center" });
    doc.setDrawColor(180, 180, 180);
    doc.line(cx - 25, y + 12, cx + 25, y + 12);
  });

  y += 25;

  // ── 푸터 ──
  doc.setFont("NanumGothic", "normal");
  doc.setFontSize(8);
  doc.setTextColor(160, 160, 160);
  doc.text("IP Assist — RAG 기반 제안요청서 자동생성 시스템", pageW / 2, y, { align: "center" });

  // ── 다운로드 ──
  const fileName = `RFP_${orgName || "document"}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
}

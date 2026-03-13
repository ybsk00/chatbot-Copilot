/**
 * PR(구매요청서) PDF 다운로드 — 한글 폰트 지원
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

// ── 스타일 상수 ──
const TH = {
  fillColor: [232, 232, 232],
  textColor: [17, 17, 17],
  fontStyle: "bold",
  halign: "center",
  valign: "middle",
  cellPadding: 3,
  fontSize: 9.5,
  cellWidth: 38,
};

const TD = {
  fillColor: [255, 255, 255],
  textColor: [34, 34, 34],
  fontStyle: "normal",
  halign: "left",
  valign: "top",
  cellPadding: 3,
  fontSize: 9.5,
};

const SECTION_HEADER = {
  fillColor: [6, 182, 212],
  textColor: [255, 255, 255],
  fontStyle: "bold",
  halign: "center",
  valign: "middle",
  cellPadding: 3,
  fontSize: 10,
};

const BORDER = { lineColor: [51, 51, 51], lineWidth: 0.3 };

/**
 * PR PDF 다운로드
 * @param {Object} fields - PR 필드 { p1: { label, value }, ... }
 * @param {Array} sections - PR 섹션 [{ title, fields: ["p1","p2",...] }, ...]
 * @param {string} templateLabel - PR 유형명 (예: "공기청정기 렌탈 서비스")
 * @param {string} supplierName - 선택된 공급업체명 (optional)
 */
export async function downloadPrPdf(fields, sections, templateLabel, supplierName) {
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
  let y = 20;

  // ═══ 제목 ═══
  doc.setFont("NanumGothic", "bold");
  doc.setFontSize(24);
  doc.setTextColor(17, 17, 17);
  doc.text("구 매 요 청 서", pageW / 2, y, { align: "center" });
  y += 5;

  // 이중선
  doc.setDrawColor(6, 182, 212);
  doc.setLineWidth(1.0);
  doc.line(marginX, y, pageW - marginX, y);
  y += 1.8;
  doc.setLineWidth(0.3);
  doc.line(marginX, y, pageW - marginX, y);
  y += 6;

  // ═══ 기본 정보 ═══
  doc.setFont("NanumGothic", "normal");
  doc.setFontSize(11);
  doc.setTextColor(51, 51, 51);

  const today = new Date();
  const dateStr = `${today.getFullYear()}년 ${String(today.getMonth() + 1).padStart(2, "0")}월 ${String(today.getDate()).padStart(2, "0")}일`;

  autoTable(doc, {
    startY: y,
    margin: { left: marginX, right: marginX },
    tableLineColor: BORDER.lineColor,
    tableLineWidth: BORDER.lineWidth,
    styles: { font: "NanumGothic", ...BORDER },
    body: [
      [
        { content: "요청 유형", styles: TH },
        { content: templateLabel || "구매요청서", colSpan: 3, styles: { ...TD, fontStyle: "bold", fontSize: 11 } },
      ],
      [
        { content: "작 성 일", styles: TH },
        { content: dateStr, styles: TD },
        { content: "공급업체", styles: TH },
        { content: supplierName || "(미정)", styles: TD },
      ],
    ],
  });
  y = doc.lastAutoTable.finalY;

  // ═══ 섹션별 필드 테이블 ═══
  for (const sec of sections) {
    const sectionFields = (sec.fields || [])
      .map((fk) => {
        const f = fields[fk];
        if (!f) return null;
        return { label: f.label, value: f.value || "" };
      })
      .filter(Boolean);

    if (sectionFields.length === 0) continue;

    // 페이지 넘김 체크
    if (y > 240) {
      doc.addPage();
      y = 20;
    }

    const rows = sectionFields.map((f) => [
      { content: f.label, styles: TH },
      { content: f.value || "-", colSpan: 3, styles: TD },
    ]);

    autoTable(doc, {
      startY: y,
      margin: { left: marginX, right: marginX },
      tableLineColor: BORDER.lineColor,
      tableLineWidth: BORDER.lineWidth,
      styles: { font: "NanumGothic", ...BORDER },
      body: [
        [{ content: sec.title.replace(/^\d+\.\s*/, ""), colSpan: 4, styles: SECTION_HEADER }],
        ...rows,
      ],
    });
    y = doc.lastAutoTable.finalY;
  }

  // ═══ 서명란 ═══
  if (y > 245) {
    doc.addPage();
    y = 20;
  }

  y += 16;
  doc.setFont("NanumGothic", "normal");
  doc.setFontSize(11);
  doc.setTextColor(51, 51, 51);
  doc.text(dateStr, pageW - marginX, y, { align: "right" });
  y += 10;

  doc.setFont("NanumGothic", "bold");
  doc.setFontSize(13);
  doc.text("요 청 자", pageW - marginX, y, { align: "right" });
  y += 9;

  doc.setFont("NanumGothic", "normal");
  doc.setFontSize(11);
  doc.text("(서명)", pageW - marginX - 5, y, { align: "right" });

  // (인) 박스
  doc.setDrawColor(153, 153, 153);
  doc.setLineWidth(0.3);
  const sealX = pageW - marginX - 2;
  doc.rect(sealX, y - 7, 16, 16);
  doc.setFontSize(8);
  doc.setTextColor(153, 153, 153);
  doc.text("(인)", sealX + 8, y + 2, { align: "center" });

  // ═══ 푸터 ═══
  y += 22;
  if (y > 280) y = 280;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);
  doc.line(marginX, y, pageW - marginX, y);
  y += 5;
  doc.setFont("NanumGothic", "normal");
  doc.setFontSize(8);
  doc.setTextColor(160, 160, 160);
  doc.text(
    "업무마켓9 — AI 기반 구매요청서 자동생성 시스템",
    pageW / 2,
    y,
    { align: "center" }
  );

  // ═══ 다운로드 ═══
  const fileName = `PR_${templateLabel || "document"}_${today.toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
}

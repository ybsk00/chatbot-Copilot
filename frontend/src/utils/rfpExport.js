/**
 * RFP PDF 다운로드 — 나라장터 제안요약서 스타일 (한글 폰트 지원)
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
  cellWidth: 30,
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
  fillColor: [51, 51, 51],
  textColor: [255, 255, 255],
  fontStyle: "bold",
  halign: "center",
  valign: "middle",
  cellPadding: 3,
  fontSize: 10,
};

const BORDER = { lineColor: [51, 51, 51], lineWidth: 0.3 };

// ── 필드 탐색 헬퍼 ──
function findFieldByKeyword(fields, fieldKeys, keywords) {
  for (const fk of fieldKeys) {
    const f = fields[fk];
    if (f && keywords.some((kw) => f.label.includes(kw))) {
      return f.value || "";
    }
  }
  return "";
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
  let y = 20;

  // ═══ 제목 ═══
  doc.setFont("NanumGothic", "bold");
  doc.setFontSize(24);
  doc.setTextColor(17, 17, 17);
  doc.text("제 안 요 청 서", pageW / 2, y, { align: "center" });
  y += 5;

  // 이중선
  doc.setDrawColor(34, 34, 34);
  doc.setLineWidth(1.0);
  doc.line(marginX, y, pageW - marginX, y);
  y += 1.8;
  doc.setLineWidth(0.3);
  doc.line(marginX, y, pageW - marginX, y);
  y += 8;

  // ═══ 기본 정보 추출 ═══
  const sec2 = sections[1]; // 개요 섹션
  const sec2Keys = sec2?.fields || [];

  // 사업명 = 개요 섹션 첫 번째 필드
  const businessName = fields[sec2Keys[0]]?.value || "";
  // 발주기관
  const orgNameVal = fields.s1?.value || orgName || "";
  // 담당자 정보
  const managerName = fields.s3?.value || "";
  const deptName = fields.s2?.value || "";
  const contact = fields.s4?.value || "";
  // 기간 필드 찾기
  const periodValue = findFieldByKeyword(fields, sec2Keys, [
    "기간",
    "기한",
  ]);
  // 규모/인원 필드 찾기
  const scaleValue = findFieldByKeyword(fields, sec2Keys, [
    "인원",
    "인력",
    "수량",
    "규모",
    "면적",
  ]);

  // ═══ 1. 기본 정보 테이블 ═══
  autoTable(doc, {
    startY: y,
    margin: { left: marginX, right: marginX },
    tableLineColor: BORDER.lineColor,
    tableLineWidth: BORDER.lineWidth,
    styles: { font: "NanumGothic", ...BORDER },
    body: [
      [
        { content: "사 업 명", styles: TH },
        {
          content: businessName,
          colSpan: 5,
          styles: { ...TD, fontStyle: "bold", fontSize: 11 },
        },
      ],
      [
        { content: "발주기관", styles: TH },
        { content: orgNameVal, colSpan: 5, styles: TD },
      ],
      [
        { content: "담 당 자", styles: TH },
        { content: "성명", styles: { ...TH, cellWidth: 15 } },
        { content: managerName, styles: { ...TD, cellWidth: 35 } },
        { content: "부서", styles: { ...TH, cellWidth: 15 } },
        { content: deptName, styles: { ...TD, cellWidth: 35 } },
        { content: contact, styles: TD },
      ],
      [
        { content: "사업기간", styles: TH },
        { content: periodValue, colSpan: 2, styles: TD },
        { content: "규모", styles: { ...TH, cellWidth: 15 } },
        { content: scaleValue, colSpan: 2, styles: TD },
      ],
    ],
  });
  y = doc.lastAutoTable.finalY;

  // ═══ 2. 목표 섹션 ═══
  const purposeKey = sec2Keys[1]; // 보통 s7 = 목적
  const purposeValue = fields[purposeKey]?.value || "";

  autoTable(doc, {
    startY: y,
    margin: { left: marginX, right: marginX },
    tableLineColor: BORDER.lineColor,
    tableLineWidth: BORDER.lineWidth,
    styles: { font: "NanumGothic", ...BORDER },
    body: [
      [{ content: "목 표", colSpan: 6, styles: SECTION_HEADER }],
      [
        {
          content: purposeValue || " ",
          colSpan: 6,
          styles: { ...TD, minCellHeight: 30, cellPadding: 5 },
        },
      ],
    ],
  });
  y = doc.lastAutoTable.finalY;

  // ═══ 3. 내용 섹션 (요건/요구사항) ═══
  const sec3 = sections[2]; // 요건 섹션
  if (sec3) {
    const contentLines = (sec3.fields || [])
      .map((fk) => {
        const f = fields[fk];
        if (!f) return null;
        const val = f.value || "";
        return val ? `[${f.label}] ${val}` : null;
      })
      .filter(Boolean)
      .join("\n");

    autoTable(doc, {
      startY: y,
      margin: { left: marginX, right: marginX },
      tableLineColor: BORDER.lineColor,
      tableLineWidth: BORDER.lineWidth,
      styles: { font: "NanumGothic", ...BORDER },
      body: [
        [
          {
            content: sec3.title.replace(/^\d+\.\s*/, ""),
            colSpan: 6,
            styles: SECTION_HEADER,
          },
        ],
        [
          {
            content: contentLines || " ",
            colSpan: 6,
            styles: { ...TD, minCellHeight: 30, cellPadding: 5 },
          },
        ],
      ],
    });
    y = doc.lastAutoTable.finalY;
  }

  // ═══ 4. 추가 요건 섹션 (6-section 템플릿용: 섹션3 + 섹션4가 요건) ═══
  if (sections.length >= 6) {
    const sec4extra = sections[3];
    if (sec4extra && !sec4extra.title.includes("평가")) {
      const extraLines = (sec4extra.fields || [])
        .map((fk) => {
          const f = fields[fk];
          if (!f) return null;
          const val = f.value || "";
          return val ? `[${f.label}] ${val}` : null;
        })
        .filter(Boolean)
        .join("\n");

      autoTable(doc, {
        startY: y,
        margin: { left: marginX, right: marginX },
        tableLineColor: BORDER.lineColor,
        tableLineWidth: BORDER.lineWidth,
        styles: { font: "NanumGothic", ...BORDER },
        body: [
          [
            {
              content: sec4extra.title.replace(/^\d+\.\s*/, ""),
              colSpan: 6,
              styles: SECTION_HEADER,
            },
          ],
          [
            {
              content: extraLines || " ",
              colSpan: 6,
              styles: { ...TD, minCellHeight: 25, cellPadding: 5 },
            },
          ],
        ],
      });
      y = doc.lastAutoTable.finalY;
    }
  }

  // ═══ 5. 평가 기준 ═══
  const evalSection = sections.find((s) => s.title.includes("평가"));
  if (evalSection) {
    const evalLines = (evalSection.fields || [])
      .map((fk) => {
        const f = fields[fk];
        if (!f) return null;
        const val = f.value || "";
        return val ? `- ${f.label}: ${val}` : `- ${f.label}`;
      })
      .filter(Boolean)
      .join("\n");

    if (y > 240) {
      doc.addPage();
      y = 20;
    }

    autoTable(doc, {
      startY: y,
      margin: { left: marginX, right: marginX },
      tableLineColor: BORDER.lineColor,
      tableLineWidth: BORDER.lineWidth,
      styles: { font: "NanumGothic", ...BORDER },
      body: [
        [{ content: "평가 기준", colSpan: 6, styles: SECTION_HEADER }],
        [
          {
            content: evalLines || " ",
            colSpan: 6,
            styles: { ...TD, minCellHeight: 25, cellPadding: 5 },
          },
        ],
      ],
    });
    y = doc.lastAutoTable.finalY;
  }

  // ═══ 6. 제출 안내 ═══
  const submitSection = sections.find((s) => s.title.includes("제출"));
  if (submitSection) {
    const submitRows = (submitSection.fields || []).map((fk) => {
      const f = fields[fk];
      return [
        { content: f?.label || fk, styles: TH },
        { content: f?.value || "", colSpan: 5, styles: TD },
      ];
    });

    if (y > 250) {
      doc.addPage();
      y = 20;
    }

    autoTable(doc, {
      startY: y,
      margin: { left: marginX, right: marginX },
      tableLineColor: BORDER.lineColor,
      tableLineWidth: BORDER.lineWidth,
      styles: { font: "NanumGothic", ...BORDER },
      body: [
        [{ content: "제출 안내", colSpan: 6, styles: SECTION_HEADER }],
        ...submitRows,
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
  const today = new Date();
  const dateStr = `${today.getFullYear()}년 ${String(today.getMonth() + 1).padStart(2, "0")}월 ${String(today.getDate()).padStart(2, "0")}일`;

  doc.setFont("NanumGothic", "normal");
  doc.setFontSize(11);
  doc.setTextColor(51, 51, 51);
  doc.text(dateStr, pageW - marginX, y, { align: "right" });
  y += 10;

  doc.setFont("NanumGothic", "bold");
  doc.setFontSize(13);
  doc.text(orgNameVal || "발주기관", pageW - marginX, y, { align: "right" });
  y += 9;

  doc.setFont("NanumGothic", "normal");
  doc.setFontSize(11);
  const sigText = `담당자: ${managerName}`;
  doc.text(sigText, pageW - marginX - 22, y, { align: "right" });

  // (인) 박스
  doc.setDrawColor(153, 153, 153);
  doc.setLineWidth(0.3);
  const sealX = pageW - marginX - 18;
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
    "업무마켓9 — AI 기반 제안요청서 자동생성 시스템",
    pageW / 2,
    y,
    { align: "center" }
  );

  // ═══ 다운로드 ═══
  const fileName = `RFP_${orgNameVal || "document"}_${today.toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
}

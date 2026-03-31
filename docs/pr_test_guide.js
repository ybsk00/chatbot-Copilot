const fs = require("fs");
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, VerticalAlign, PageNumber } = require("docx");

const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };
const hdrBorder = { style: BorderStyle.SINGLE, size: 1, color: "0EA5A0" };
const hdrBorders = { top: hdrBorder, bottom: hdrBorder, left: hdrBorder, right: hdrBorder };

function hdrCell(text, width) {
  return new TableCell({
    borders: hdrBorders, width: { size: width, type: WidthType.DXA },
    shading: { fill: "0EA5A0", type: ShadingType.CLEAR },
    verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({ alignment: AlignmentType.CENTER,
      children: [new TextRun({ text, bold: true, size: 20, color: "FFFFFF", font: "Arial" })] })]
  });
}
function cell(text, width, opts = {}) {
  return new TableCell({
    borders, width: { size: width, type: WidthType.DXA },
    shading: opts.bg ? { fill: opts.bg, type: ShadingType.CLEAR } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({ alignment: opts.center ? AlignmentType.CENTER : AlignmentType.LEFT,
      spacing: { before: 40, after: 40 },
      children: [new TextRun({ text, size: 18, font: "Arial", bold: !!opts.bold, color: opts.color || "333333" })] })]
  });
}

const doc = new Document({
  styles: {
    default: { document: { run: { font: "Arial", size: 20 } } },
    paragraphStyles: [
      { id: "Title", name: "Title", basedOn: "Normal",
        run: { size: 44, bold: true, color: "0EA5A0", font: "Arial" },
        paragraph: { spacing: { before: 0, after: 100 }, alignment: AlignmentType.CENTER } },
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, color: "0EA5A0", font: "Arial" },
        paragraph: { spacing: { before: 300, after: 100 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, color: "333333", font: "Arial" },
        paragraph: { spacing: { before: 200, after: 80 }, outlineLevel: 1 } },
    ]
  },
  sections: [{
    properties: {
      page: { margin: { top: 1200, right: 1200, bottom: 1200, left: 1200 } }
    },
    headers: {
      default: new Header({ children: [new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [new TextRun({ text: "IP Assist v3.1  |  2026-03-31", size: 16, color: "999999", font: "Arial" })]
      })] })
    },
    footers: {
      default: new Footer({ children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: "Page ", size: 16, color: "999999", font: "Arial" }),
          new TextRun({ children: [PageNumber.CURRENT], size: 16, color: "999999", font: "Arial" }),
          new TextRun({ text: " / ", size: 16, color: "999999", font: "Arial" }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: "999999", font: "Arial" }),
        ]
      })] })
    },
    children: [
      // ── 제목 ──
      new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun("IP Assist 구매요청서 테스트 가이드")] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 300 },
        children: [new TextRun({ text: "BT/GT 분기 시스템 + 카테고리별 퀵필카드 검증", size: 20, color: "666666" })] }),

      // ── 테스트 환경 ──
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("1. 테스트 환경")] }),
      new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: "URL: ", bold: true }), new TextRun("https://chatbot-copilot-82b0a.web.app")] }),
      new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: "역할: ", bold: true }), new TextRun("'물건/서비스를 구매하고 싶어요' 선택")] }),
      new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: "방법: ", bold: true }), new TextRun("아래 키워드를 채팅창에 입력 후 결과 확인")] }),

      // ── 분기 A: 카탈로그 ──
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("2. 분기 A: 카탈로그 직접발주 (PR 차단)")] }),
      new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: "예상 결과: ", bold: true }), new TextRun("'카탈로그에서 직접 발주하세요. PR 작성이 불필요합니다.' 안내 메시지")] }),
      new Table({
        columnWidths: [2200, 2800, 4360],
        rows: [
          new TableRow({ tableHeader: true, children: [
            hdrCell("테스트 키워드", 2200), hdrCell("매칭 품목", 2800), hdrCell("확인 포인트", 4360)
          ] }),
          new TableRow({ children: [
            cell("사무용품 구매", 2200, { bold: true }), cell("사무용품/문구", 2800),
            cell("PR 차단 메시지 + 구매요청서 버튼 없음", 4360)
          ] }),
          new TableRow({ children: [
            cell("명함 제작", 2200, { bold: true }), cell("명함/사내 인쇄물", 2800),
            cell("PR 차단 메시지 + 구매요청서 버튼 없음", 4360)
          ] }),
        ]
      }),

      // ── 분기 B: 주관부서 ──
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("3. 분기 B: 주관부서 신청 (PR 차단)")] }),
      new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: "예상 결과: ", bold: true }), new TextRun("'주관부서를 통해 신청해 주세요.' 안내 + 해당 부서명 표시")] }),
      new Table({
        columnWidths: [2200, 2800, 4360],
        rows: [
          new TableRow({ tableHeader: true, children: [
            hdrCell("테스트 키워드", 2200), hdrCell("매칭 품목", 2800), hdrCell("확인 포인트", 4360)
          ] }),
          new TableRow({ children: [
            cell("노트북 구매", 2200, { bold: true }), cell("노트북/데스크탑 (IT)", 2800),
            cell("주관부서 안내 + PR 차단", 4360)
          ] }),
          new TableRow({ children: [
            cell("정수기 렌탈", 2200, { bold: true }), cell("정수기/공기청정기 (시설)", 2800),
            cell("주관부서 안내 + PR 차단", 4360)
          ] }),
          new TableRow({ children: [
            cell("커피머신 렌탈", 2200, { bold: true }), cell("냉난방 렌탈/커피머신 (총무)", 2800),
            cell("주관부서 안내 + PR 차단", 4360)
          ] }),
          new TableRow({ children: [
            cell("TV 광고", 2200, { bold: true }), cell("TV/라디오 광고 (마케팅)", 2800),
            cell("주관부서 안내 + PR 차단", 4360)
          ] }),
          new TableRow({ children: [
            cell("근무복 제작", 2200, { bold: true }), cell("근무복/유니폼 (총무)", 2800),
            cell("주관부서 안내 + PR 차단", 4360)
          ] }),
        ]
      }),

      // ── 분기 E/F: PR 작성 ──
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("4. 분기 E/F: 구매요청서 작성 (PR 허용)")] }),
      new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: "예상 결과: ", bold: true }),
        new TextRun("AI 답변 + '구매요청서 작성하기' 버튼 표시 → 클릭 시 PR 모드 진입 + 카테고리별 탭 옵션")] }),
      new Table({
        columnWidths: [1800, 2200, 2200, 3160],
        rows: [
          new TableRow({ tableHeader: true, children: [
            hdrCell("테스트 키워드", 1800), hdrCell("매칭 품목", 2200),
            hdrCell("카테고리", 2200), hdrCell("퀵필 c8(계약유형) 옵션", 3160)
          ] }),
          new TableRow({ children: [
            cell("파견 서비스 도입", 1800, { bold: true }), cell("파견도급 서비스", 2200),
            cell("인사/복리후생", 2200, { bg: "FEF3C7" }), cell("파견 계약 / 도급 계약 / 위탁 운영 / 용역 계약", 3160)
          ] }),
          new TableRow({ children: [
            cell("서버 도입", 1800, { bold: true }), cell("랙/블레이드 서버", 2200),
            cell("IT/ICT", 2200, { bg: "DBEAFE" }), cell("구매 / SaaS 구독 / 유지보수 계약 / 개발 도급", 3160)
          ] }),
          new TableRow({ children: [
            cell("IT 컨설팅", 1800, { bold: true }), cell("IT 컨설팅", 2200),
            cell("전문용역", 2200, { bg: "E0E7FF" }), cell("용역 계약 / 자문 계약 / 프로젝트 도급 / 연간 리테이너", 3160)
          ] }),
          new TableRow({ children: [
            cell("화물 운송", 1800, { bold: true }), cell("일반화물 용차", 2200),
            cell("물류", 2200, { bg: "D1FAE5" }), cell("운송 계약 / 창고 임대 / 3PL 위탁 / 건별 발주", 3160)
          ] }),
          new TableRow({ children: [
            cell("회계 세무 서비스", 1800, { bold: true }), cell("회계/세무 서비스", 2200),
            cell("전문용역", 2200, { bg: "E0E7FF" }), cell("용역 계약 / 자문 계약 / 프로젝트 도급 / 연간 리테이너", 3160)
          ] }),
          new TableRow({ children: [
            cell("시장조사 의뢰", 1800, { bold: true }), cell("시장조사", 2200),
            cell("마케팅", 2200, { bg: "FCE7F3" }), cell("대행 계약 / 건별 발주 / 연간 계약 / 성과 기반", 3160)
          ] }),
        ]
      }),

      // ── PR 플로우 확인 ──
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("5. PR 작성 플로우 확인 (분기 E/F 진입 후)")] }),
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("5-1. 진입 ~ 퀵필카드")] }),
      new Table({
        columnWidths: [600, 4000, 4760],
        rows: [
          new TableRow({ tableHeader: true, children: [
            hdrCell("순서", 600), hdrCell("동작", 4000), hdrCell("확인 포인트", 4760)
          ] }),
          new TableRow({ children: [
            cell("1", 600, { center: true }), cell("'구매요청서 작성하기' 버튼 클릭", 4000),
            cell("PR 모드 진입 + 퀵필카드 표시 (RAG 출처 없음)", 4760)
          ] }),
          new TableRow({ children: [
            cell("2", 600, { center: true }), cell("퀵필카드에서 첫 번째 탭 옵션 선택", 4000),
            cell("선택한 값이 채워지고 다음 필드 탭 자동 표시", 4760)
          ] }),
          new TableRow({ children: [
            cell("3", 600, { center: true }), cell("탭 옵션 2~3번 더 선택", 4000),
            cell("3번째 선택 후 우측에 구매요청서 패널 자동 오픈", 4760)
          ] }),
        ]
      }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("5-2. 대화형 필드 수집")] }),
      new Table({
        columnWidths: [600, 4000, 4760],
        rows: [
          new TableRow({ tableHeader: true, children: [
            hdrCell("순서", 600), hdrCell("동작", 4000), hdrCell("확인 포인트", 4760)
          ] }),
          new TableRow({ children: [
            cell("4", 600, { center: true }), cell("'직접 입력' 버튼 클릭 후 채팅으로 값 입력", 4000),
            cell("입력한 값이 해당 필드에 자동 매핑", 4760)
          ] }),
          new TableRow({ children: [
            cell("5", 600, { center: true }), cell("채팅으로 여러 필드 한꺼번에 입력\n(예: '계약기간 24개월, 인원 10명')", 4000),
            cell("AI가 필드 자동 추출 + 패널에 반영", 4760)
          ] }),
          new TableRow({ children: [
            cell("6", 600, { center: true }), cell("우측 패널에서 필드 직접 수정", 4000),
            cell("수정한 값이 즉시 반영", 4760)
          ] }),
        ]
      }),

      // ── 카테고리별 c10 옵션 ──
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("6. 카테고리별 대상규모(c10) 옵션 확인")] }),
      new Paragraph({ spacing: { after: 100 }, children: [
        new TextRun({ text: "주의: ", bold: true, color: "DC2626" }),
        new TextRun("카테고리에 맞지 않는 옵션이 나오면 버그입니다. (예: 인사 카테고리에 '5대 미만' 표시)")
      ] }),
      new Table({
        columnWidths: [2500, 3430, 3430],
        rows: [
          new TableRow({ tableHeader: true, children: [
            hdrCell("카테고리", 2500), hdrCell("c10 옵션 (정상)", 3430), hdrCell("c10 옵션 (오류 예시)", 3430)
          ] }),
          new TableRow({ children: [
            cell("인사/복리후생", 2500, { bold: true, bg: "FEF3C7" }),
            cell("전사원 / 부서별 / 소수 인원 / 기타", 3430),
            cell("5대 미만 / 10대 미만 (X)", 3430, { color: "DC2626" })
          ] }),
          new TableRow({ children: [
            cell("IT/ICT", 2500, { bold: true, bg: "DBEAFE" }),
            cell("5대 미만 / 10~50대 / 50대 이상 / 전사 라이선스", 3430),
            cell("전사원 / 부서별 (X)", 3430, { color: "DC2626" })
          ] }),
          new TableRow({ children: [
            cell("전문용역/컨설팅", 2500, { bold: true, bg: "E0E7FF" }),
            cell("단일 프로젝트 / 연간 자문 / 수시 자문 / 기타", 3430),
            cell("5대 미만 / 10대 미만 (X)", 3430, { color: "DC2626" })
          ] }),
          new TableRow({ children: [
            cell("마케팅", 2500, { bold: true, bg: "FCE7F3" }),
            cell("단일 캠페인 / 연간 다수 / 상시 운영 / 기타", 3430),
            cell("5대 미만 / 전사원 (X)", 3430, { color: "DC2626" })
          ] }),
          new TableRow({ children: [
            cell("물류", 2500, { bold: true, bg: "D1FAE5" }),
            cell("월 100건 미만 / 100~500건 / 500건 이상 / 기타", 3430),
            cell("전사원 / 부서별 (X)", 3430, { color: "DC2626" })
          ] }),
        ]
      }),

      // ── 비고 ──
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("7. 참고 사항")] }),
      new Paragraph({ spacing: { after: 60 }, children: [
        new TextRun({ text: "1. ", bold: true }), new TextRun("PR 작성 중에는 RAG 검색 결과(출처 배지)가 절대 나오지 않아야 합니다.")
      ] }),
      new Paragraph({ spacing: { after: 60 }, children: [
        new TextRun({ text: "2. ", bold: true }), new TextRun("퀵필카드는 옵션이 있는 필드를 우선 표시합니다. 옵션 없는 필드는 '직접 입력'으로 채웁니다.")
      ] }),
      new Paragraph({ spacing: { after: 60 }, children: [
        new TextRun({ text: "3. ", bold: true }), new TextRun("탭 3번 클릭 또는 필수 필드 30% 채우면 우측 구매요청서 패널이 자동으로 열립니다.")
      ] }),
      new Paragraph({ spacing: { after: 60 }, children: [
        new TextRun({ text: "4. ", bold: true }), new TextRun("분기 A/B에서 차단된 품목은 구매요청서 작성이 불가하며, 대안 안내가 표시됩니다.")
      ] }),
      new Paragraph({ spacing: { after: 60 }, children: [
        new TextRun({ text: "5. ", bold: true }), new TextRun("이상 발견 시 스크린샷과 함께 입력한 키워드를 공유해 주세요.")
      ] }),
      new Paragraph({ spacing: { before: 200, after: 60 }, children: [
        new TextRun({ text: "[미세조정 필요 항목]", bold: true, color: "D97706", size: 22 })
      ] }),
      new Paragraph({ spacing: { after: 60 }, children: [
        new TextRun({ text: "6. ", bold: true }),
        new TextRun({ text: "카테고리별 대상규모(c10) 선택 옵션", bold: true }),
        new TextRun("은 현재 초기 설정 상태입니다. 현업 검토 후 각 카테고리에 맞는 단위(명/대/건/사업장 등)와 구간을 피드백 주시면 반영하겠습니다.")
      ] }),
      new Paragraph({ spacing: { after: 60 }, children: [
        new TextRun({ text: "7. ", bold: true }),
        new TextRun({ text: "계약유형(c8), SLA(c13), 단가방식(c15)", bold: true }),
        new TextRun(" 옵션도 카테고리별로 설정되어 있으나, 실무와 다른 항목이 있을 수 있습니다. 수정이 필요한 옵션은 해당 카테고리명 + 변경 내용을 알려주세요.")
      ] }),
      new Paragraph({ spacing: { after: 200 }, children: [
        new TextRun({ text: "8. ", bold: true }),
        new TextRun({ text: "구매요청서 고유 필드(p1~pN)", bold: true }),
        new TextRun("의 선택 옵션은 Excel 원본의 체크박스(☐) 항목에서 자동 추출됩니다. 옵션이 부족하거나 부적절한 필드가 있으면 Excel 수정 후 재시드가 필요합니다.")
      ] }),
    ]
  }]
});

Packer.toBuffer(doc).then(buf => {
  const out = "C:\\Users\\유범석\\개발소스코드\\26_03\\업무마켓챗봇\\ip-assist\\docs\\IP_Assist_PR_테스트가이드.docx";
  fs.writeFileSync(out, buf);
  console.log("Created: " + out);
});

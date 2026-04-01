const fs = require('fs');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
        Header, Footer, AlignmentType, LevelFormat, HeadingLevel, BorderStyle,
        WidthType, ShadingType, VerticalAlign, PageNumber, PageBreak } = require('docx');

const border = { style: BorderStyle.SINGLE, size: 1, color: "BBBBBB" };
const cb = { top: border, bottom: border, left: border, right: border };
const hdrShade = { fill: "0EA5A0", type: ShadingType.CLEAR };
const subShade = { fill: "F0FDFA", type: ShadingType.CLEAR };
const warnShade = { fill: "FEF3C7", type: ShadingType.CLEAR };

function hdr(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 360, after: 200 },
    children: [new TextRun({ text, bold: true, size: 32, font: "Arial", color: "0E7490" })] });
}
function hdr2(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 280, after: 160 },
    children: [new TextRun({ text, bold: true, size: 26, font: "Arial", color: "115E59" })] });
}
function p(text, opts = {}) {
  return new Paragraph({ spacing: { after: 120 }, ...opts,
    children: [new TextRun({ text, size: 21, font: "Arial", ...opts.run })] });
}
function pb(label, value) {
  return new Paragraph({ spacing: { after: 80 },
    children: [
      new TextRun({ text: label + ": ", size: 21, font: "Arial", bold: true }),
      new TextRun({ text: value, size: 21, font: "Arial" }),
    ] });
}
function cell(text, opts = {}) {
  return new TableCell({ borders: cb, width: { size: opts.w || 2340, type: WidthType.DXA },
    shading: opts.shade, verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({ alignment: opts.align || AlignmentType.LEFT, spacing: { before: 40, after: 40 },
      children: [new TextRun({ text, size: opts.sz || 20, font: "Arial", bold: !!opts.bold, color: opts.color || "1E293B" })] })] });
}

const doc = new Document({
  styles: {
    default: { document: { run: { font: "Arial", size: 21 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, color: "0E7490", font: "Arial" },
        paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 26, bold: true, color: "115E59", font: "Arial" },
        paragraph: { spacing: { before: 280, after: 160 }, outlineLevel: 1 } },
    ],
  },
  numbering: { config: [
    { reference: "bl", levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    { reference: "steps", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    { reference: "api-n", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    { reference: "br-n", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
  ]},
  sections: [{
    properties: {
      page: { margin: { top: 1200, right: 1200, bottom: 1200, left: 1200 },
              pageNumbers: { start: 1 } },
    },
    headers: { default: new Header({ children: [
      new Paragraph({ alignment: AlignmentType.RIGHT, children: [
        new TextRun({ text: "IP Assist - L4 공급업체 추천 시스템 테스트 가이드", size: 16, font: "Arial", color: "94A3B8", italics: true }) ] })
    ]})},
    footers: { default: new Footer({ children: [
      new Paragraph({ alignment: AlignmentType.CENTER, children: [
        new TextRun({ text: "Page ", size: 16, font: "Arial", color: "94A3B8" }),
        new TextRun({ children: [PageNumber.CURRENT], size: 16, font: "Arial", color: "94A3B8" }),
        new TextRun({ text: " / ", size: 16, font: "Arial", color: "94A3B8" }),
        new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, font: "Arial", color: "94A3B8" }),
      ]})
    ]})},
    children: [
      // ===== 표지 =====
      new Paragraph({ spacing: { before: 2400 } }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 },
        children: [new TextRun({ text: "L4 공급업체 추천 시스템", size: 48, bold: true, font: "Arial", color: "0E7490" })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 600 },
        children: [new TextRun({ text: "테스트 가이드", size: 40, bold: true, font: "Arial", color: "115E59" })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 },
        children: [new TextRun({ text: "버전 1.0 | 2026-04-01", size: 22, font: "Arial", color: "64748B" })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 },
        children: [new TextRun({ text: "IP Assist 간접구매 AI 코파일럿", size: 22, font: "Arial", color: "64748B" })] }),

      // ===== 1. 개요 =====
      new Paragraph({ children: [new PageBreak()] }),
      hdr("1. 테스트 개요"),
      p("본 문서는 L4(세분류) 공급업체 추천 시스템의 기능을 검증하기 위한 테스트 가이드입니다."),
      p("기존 47개 공급업체 단순 키워드 검색 시스템을 완전히 교체하여, 235개 L4 세분류별 2,808개 공급업체를 평가등급 기반으로 추천합니다."),

      hdr2("1.1 시스템 구성"),
      new Table({ columnWidths: [3000, 6360], margins: { top: 60, bottom: 60, left: 120, right: 120 }, rows: [
        new TableRow({ children: [
          cell("항목", { w: 3000, shade: hdrShade, bold: true, color: "FFFFFF" }),
          cell("내용", { w: 6360, shade: hdrShade, bold: true, color: "FFFFFF" }),
        ]}),
        new TableRow({ children: [cell("taxonomy_l4", { w: 3000, shade: subShade, bold: true }), cell("235개 L4 세분류 (L3 하위)", { w: 6360 })] }),
        new TableRow({ children: [cell("supplier_eval_weights", { w: 3000, shade: subShade, bold: true }), cell("1,175개 평가항목 (L4당 5개, 가중치 합 100%)", { w: 6360 })] }),
        new TableRow({ children: [cell("suppliers_l4", { w: 3000, shade: subShade, bold: true }), cell("2,808개 공급업체 (전국 2,350 + 지역 408 + 공종 50)", { w: 6360 })] }),
      ]}),

      hdr2("1.2 등급 체계"),
      new Table({ columnWidths: [1200, 1800, 2400, 3960], margins: { top: 60, bottom: 60, left: 120, right: 120 }, rows: [
        new TableRow({ children: [
          cell("등급", { w: 1200, shade: hdrShade, bold: true, color: "FFFFFF", align: AlignmentType.CENTER }),
          cell("점수", { w: 1800, shade: hdrShade, bold: true, color: "FFFFFF", align: AlignmentType.CENTER }),
          cell("라벨", { w: 2400, shade: hdrShade, bold: true, color: "FFFFFF", align: AlignmentType.CENTER }),
          cell("표시 방식", { w: 3960, shade: hdrShade, bold: true, color: "FFFFFF" }),
        ]}),
        new TableRow({ children: [cell("S", { w: 1200, align: AlignmentType.CENTER, bold: true }), cell("90점 이상", { w: 1800, align: AlignmentType.CENTER }), cell("최우수 (Best-in-Class)", { w: 2400 }), cell("항상 고정 표시", { w: 3960 })] }),
        new TableRow({ children: [cell("A", { w: 1200, align: AlignmentType.CENTER, bold: true }), cell("80~89점", { w: 1800, align: AlignmentType.CENTER }), cell("우수 (Preferred)", { w: 2400 }), cell("항상 고정 표시", { w: 3960 })] }),
        new TableRow({ children: [cell("B", { w: 1200, align: AlignmentType.CENTER, bold: true }), cell("70~79점", { w: 1800, align: AlignmentType.CENTER }), cell("양호 (Approved)", { w: 2400 }), cell("세션별 롤링 (2개 랜덤)", { w: 3960 })] }),
        new TableRow({ children: [cell("C", { w: 1200, align: AlignmentType.CENTER, bold: true }), cell("60~69점", { w: 1800, align: AlignmentType.CENTER }), cell("보통 (Conditional)", { w: 2400 }), cell("세션별 롤링 (2개 랜덤)", { w: 3960 })] }),
        new TableRow({ children: [cell("D", { w: 1200, align: AlignmentType.CENTER, bold: true }), cell("60점 미만", { w: 1800, align: AlignmentType.CENTER }), cell("미달 (Development)", { w: 2400 }), cell("세션별 롤링 (2개 랜덤)", { w: 3960 })] }),
      ]}),

      // ===== 2. 환경 설정 =====
      new Paragraph({ children: [new PageBreak()] }),
      hdr("2. 테스트 환경 설정"),
      hdr2("2.1 로컬 백엔드 시작"),
      p("터미널에서 아래 명령어를 실행합니다:"),
      p("cd ip-assist/backend", { run: { font: "Consolas", size: 20 } }),
      p("source .env && uvicorn app.main:app --port 8000 --reload", { run: { font: "Consolas", size: 20 } }),
      p("Health 확인: http://localhost:8000/health"),

      hdr2("2.2 로컬 프론트엔드 시작"),
      p("cd ip-assist/frontend", { run: { font: "Consolas", size: 20 } }),
      p("npm run dev", { run: { font: "Consolas", size: 20 } }),
      p("브라우저 접속: http://localhost:5173"),

      hdr2("2.3 프로덕션 환경"),
      pb("백엔드", "https://ip-assist-backend-1058034030780.asia-northeast3.run.app"),
      pb("프론트엔드", "https://chatbot-copilot-82b0a.web.app"),
      p("(주의: 프로덕션 테스트는 배포 후 진행)"),

      // ===== 3. API 테스트 =====
      new Paragraph({ children: [new PageBreak()] }),
      hdr("3. API 테스트 (자동)"),
      hdr2("3.1 실행 방법"),
      p("cd browser-debugger", { run: { font: "Consolas", size: 20 } }),
      p("python test_l4_api.py --local    # 로컬", { run: { font: "Consolas", size: 20 } }),
      p("python test_l4_api.py            # Cloud Run", { run: { font: "Consolas", size: 20 } }),
      p("14개 테스트 케이스를 자동 실행하고 결과를 output/ 폴더에 JSON으로 저장합니다."),

      hdr2("3.2 테스트 케이스 목록 (14건)"),
      new Table({ columnWidths: [800, 3200, 5360], margins: { top: 60, bottom: 60, left: 120, right: 120 }, rows: [
        new TableRow({ children: [
          cell("#", { w: 800, shade: hdrShade, bold: true, color: "FFFFFF", align: AlignmentType.CENTER }),
          cell("테스트명", { w: 3200, shade: hdrShade, bold: true, color: "FFFFFF" }),
          cell("검증 내용", { w: 5360, shade: hdrShade, bold: true, color: "FFFFFF" }),
        ]}),
        new TableRow({ children: [cell("T1", { w: 800, align: AlignmentType.CENTER }), cell("L3->L4 옵션 반환", { w: 3200 }), cell("L3-010101 -> L4 3개 (필기구/용지/소모품)", { w: 5360 })] }),
        new TableRow({ children: [cell("T2", { w: 800, align: AlignmentType.CENTER }), cell("L4 1개 자동선택", { w: 3200 }), cell("auto_select=True, l4_code 반환", { w: 5360 })] }),
        new TableRow({ children: [cell("T3", { w: 800, align: AlignmentType.CENTER }), cell("미존재 L3", { w: 3200 }), cell("빈 배열, 에러 없음", { w: 5360 })] }),
        new TableRow({ children: [cell("T4", { w: 800, align: AlignmentType.CENTER }), cell("전국 추천", { w: 3200 }), cell("fixed + rotating + eval_criteria 존재", { w: 5360 })] }),
        new TableRow({ children: [cell("T5", { w: 800, align: AlignmentType.CENTER }), cell("등급 분리", { w: 3200 }), cell("fixed=S/A만, rotating=B/C/D만", { w: 5360 })] }),
        new TableRow({ children: [cell("T6", { w: 800, align: AlignmentType.CENTER }), cell("가중치 합산", { w: 3200 }), cell("5개 항목 합계 = 100%", { w: 5360 })] }),
        new TableRow({ children: [cell("T7", { w: 800, align: AlignmentType.CENTER }), cell("필수 필드", { w: 3200 }), cell("company, grade, weighted_score, rank", { w: 5360 })] }),
        new TableRow({ children: [cell("T8", { w: 800, align: AlignmentType.CENTER }), cell("동일 세션 롤링", { w: 3200 }), cell("같은 session_id -> 동일 B/C/D", { w: 5360 })] }),
        new TableRow({ children: [cell("T9", { w: 800, align: AlignmentType.CENTER }), cell("다른 세션 롤링", { w: 3200 }), cell("다른 session_id -> 다른 B/C/D", { w: 5360 })] }),
        new TableRow({ children: [cell("T10", { w: 800, align: AlignmentType.CENTER }), cell("지역+공종 분기", { w: 3200 }), cell("건축 수선: 6권역 + 5공종", { w: 5360 })] }),
        new TableRow({ children: [cell("T11", { w: 800, align: AlignmentType.CENTER }), cell("지역만 분기", { w: 3200 }), cell("사무공간 리모델링: 6권역", { w: 5360 })] }),
        new TableRow({ children: [cell("T12", { w: 800, align: AlignmentType.CENTER }), cell("분기 없음", { w: 3200 }), cell("필기구: 전국만", { w: 5360 })] }),
        new TableRow({ children: [cell("T13", { w: 800, align: AlignmentType.CENTER }), cell("지역별 추천", { w: 3200 }), cell("수도권 scope -> 공급업체 반환", { w: 5360 })] }),
        new TableRow({ children: [cell("T14", { w: 800, align: AlignmentType.CENTER }), cell("공종별 추천", { w: 3200 }), cell("전기/조명 scope -> 공급업체 반환", { w: 5360 })] }),
      ]}),

      // ===== 4. 수동 API 테스트 =====
      new Paragraph({ children: [new PageBreak()] }),
      hdr("4. 수동 API 테스트 (브라우저)"),
      p("브라우저 주소창에 아래 URL을 입력하여 직접 확인할 수 있습니다."),

      hdr2("4.1 L4 옵션 조회"),
      p("GET http://localhost:8000/suppliers/l4/options/L3-010101", { run: { font: "Consolas", size: 19 } }),
      p("기대 결과: l4_options 3개 (필기구/용지/소모품), auto_select=false"),

      hdr2("4.2 공급업체 추천"),
      p("GET http://localhost:8000/suppliers/l4/recommend/L3-010101-01?session_id=test1", { run: { font: "Consolas", size: 19 } }),
      p("기대 결과: fixed(S/A등급) + rotating(B/C/D 2개) + eval_criteria(5개)"),

      hdr2("4.3 지역 분기 확인"),
      p("GET http://localhost:8000/suppliers/l4/branch/L3-030104-01", { run: { font: "Consolas", size: 19 } }),
      p("기대 결과: has_region=true, has_worktype=true, 6개 권역, 5개 공종"),

      hdr2("4.4 지역별 추천"),
      p("GET http://localhost:8000/suppliers/l4/recommend/L3-030102-01?scope_type=regional&scope_value=%EC%88%98%EB%8F%84%EA%B6%8C(%EC%84%9C%EC%9A%B8%C2%B7%EA%B2%BD%EA%B8%B0%C2%B7%EC%9D%B8%EC%B2%9C)", { run: { font: "Consolas", size: 16 } }),
      p("(URL 인코딩 주의) 기대 결과: 수도권 공급업체 3개"),

      // ===== 5. 브라우저 테스트 =====
      new Paragraph({ children: [new PageBreak()] }),
      hdr("5. 브라우저 E2E 테스트"),
      hdr2("5.1 자동 테스트 실행"),
      p("python test_l4_browser.py          # 로컬 (localhost:5173)", { run: { font: "Consolas", size: 20 } }),
      p("python test_l4_browser.py --prod   # 프로덕션 (Firebase)", { run: { font: "Consolas", size: 20 } }),
      p("6개 시나리오를 자동 실행하고 스크린샷 + JSON 리포트를 생성합니다."),

      hdr2("5.2 PR 품목 타겟 테스트"),
      p("python test_l4_pr_items.py", { run: { font: "Consolas", size: 20 } }),
      p("PR 작성 가능 품목 2건 (정보보안 솔루션, 시장조사)으로 L4 선택까지 테스트합니다."),

      // ===== 6. 수동 브라우저 테스트 =====
      hdr2("5.3 수동 브라우저 테스트 시나리오"),

      p("시나리오 A: 전국 공급업체 추천", { run: { bold: true, size: 22, color: "0E7490" } }),
      new Paragraph({ numbering: { reference: "steps", level: 0 }, spacing: { after: 80 }, children: [new TextRun({ text: "http://localhost:5173 접속", size: 21, font: "Arial" })] }),
      new Paragraph({ numbering: { reference: "steps", level: 0 }, spacing: { after: 80 }, children: [new TextRun({ text: "\"일반 사용자\" 역할 선택", size: 21, font: "Arial" })] }),
      new Paragraph({ numbering: { reference: "steps", level: 0 }, spacing: { after: 80 }, children: [new TextRun({ text: "\"정보보안 솔루션 도입하고 싶습니다\" 입력", size: 21, font: "Arial" })] }),
      new Paragraph({ numbering: { reference: "steps", level: 0 }, spacing: { after: 80 }, children: [new TextRun({ text: "확인: 구매요청서 카테고리 선택 또는 L4 칩 표시", size: 21, font: "Arial" })] }),
      new Paragraph({ numbering: { reference: "steps", level: 0 }, spacing: { after: 80 }, children: [new TextRun({ text: "L4 칩 클릭 (네트워크/엔드포인트 보안 등)", size: 21, font: "Arial" })] }),
      new Paragraph({ numbering: { reference: "steps", level: 0 }, spacing: { after: 80 }, children: [new TextRun({ text: "확인: 우측 패널에 추천 공급업체 카드 (등급 배지 + 평가 점수 바)", size: 21, font: "Arial" })] }),
      new Paragraph({ numbering: { reference: "steps", level: 0 }, spacing: { after: 200 }, children: [new TextRun({ text: "확인: S/A등급 항상 표시, B/C/D 2개 롤링", size: 21, font: "Arial" })] }),

      p("시나리오 B: 지역별 공급업체 추천", { run: { bold: true, size: 22, color: "0E7490" } }),
      new Paragraph({ numbering: { reference: "br-n", level: 0 }, spacing: { after: 80 }, children: [new TextRun({ text: "새 대화 시작", size: 21, font: "Arial" })] }),
      new Paragraph({ numbering: { reference: "br-n", level: 0 }, spacing: { after: 80 }, children: [new TextRun({ text: "\"일반 사용자\" 역할 선택", size: 21, font: "Arial" })] }),
      new Paragraph({ numbering: { reference: "br-n", level: 0 }, spacing: { after: 80 }, children: [new TextRun({ text: "\"사무실 청소 업체 추천해주세요\" 입력 (시설관리 L3 -> 지역 분기 L4)", size: 21, font: "Arial" })] }),
      new Paragraph({ numbering: { reference: "br-n", level: 0 }, spacing: { after: 80 }, children: [new TextRun({ text: "확인: 지역 선택 버튼 표시 (수도권/충청권/영남권/대경권/호남권/강원제주)", size: 21, font: "Arial" })] }),
      new Paragraph({ numbering: { reference: "br-n", level: 0 }, spacing: { after: 80 }, children: [new TextRun({ text: "\"수도권\" 클릭", size: 21, font: "Arial" })] }),
      new Paragraph({ numbering: { reference: "br-n", level: 0 }, spacing: { after: 200 }, children: [new TextRun({ text: "확인: 수도권 전문 공급업체가 표시됨", size: 21, font: "Arial" })] }),

      p("시나리오 C: 공종별 공급업체 추천 (특수)", { run: { bold: true, size: 22, color: "0E7490" } }),
      new Paragraph({ numbering: { reference: "api-n", level: 0 }, spacing: { after: 80 }, children: [new TextRun({ text: "새 대화 시작 -> \"일반 사용자\"", size: 21, font: "Arial" })] }),
      new Paragraph({ numbering: { reference: "api-n", level: 0 }, spacing: { after: 80 }, children: [new TextRun({ text: "\"건물 수선보수 공사 업체 찾고 있습니다\" 입력", size: 21, font: "Arial" })] }),
      new Paragraph({ numbering: { reference: "api-n", level: 0 }, spacing: { after: 80 }, children: [new TextRun({ text: "확인: 지역 버튼 + 공종 버튼 동시 표시 (전기/조명, 배관/급배수 등)", size: 21, font: "Arial" })] }),
      new Paragraph({ numbering: { reference: "api-n", level: 0 }, spacing: { after: 80 }, children: [new TextRun({ text: "공종 \"전기/조명\" 클릭", size: 21, font: "Arial" })] }),
      new Paragraph({ numbering: { reference: "api-n", level: 0 }, spacing: { after: 200 }, children: [new TextRun({ text: "확인: 전기/조명 전문 공급업체가 표시됨", size: 21, font: "Arial" })] }),

      // ===== 6. 체크리스트 =====
      new Paragraph({ children: [new PageBreak()] }),
      hdr("6. 테스트 체크리스트"),
      p("테스트 완료 후 아래 항목을 확인하세요."),

      new Table({ columnWidths: [600, 5400, 1800, 1560], margins: { top: 60, bottom: 60, left: 120, right: 120 }, rows: [
        new TableRow({ children: [
          cell("", { w: 600, shade: hdrShade, bold: true, color: "FFFFFF", align: AlignmentType.CENTER }),
          cell("확인 항목", { w: 5400, shade: hdrShade, bold: true, color: "FFFFFF" }),
          cell("예상 결과", { w: 1800, shade: hdrShade, bold: true, color: "FFFFFF", align: AlignmentType.CENTER }),
          cell("통과", { w: 1560, shade: hdrShade, bold: true, color: "FFFFFF", align: AlignmentType.CENTER }),
        ]}),
        ...[
          ["1", "API: L3 -> L4 옵션 조회 정상", "14/14"],
          ["2", "L4 선택 칩이 채팅 영역에 표시됨", "O"],
          ["3", "L4 칩 클릭 시 공급업체 카드 로드", "O"],
          ["4", "공급업체 카드에 등급 배지(S/A/B/C/D) 표시", "O"],
          ["5", "평가 항목별 점수 바 렌더링", "O"],
          ["6", "S/A 등급 항상 고정 표시", "O"],
          ["7", "B/C/D 등급 세션별 랜덤 2개", "O"],
          ["8", "지역 분기 품목 -> 6개 권역 버튼", "O"],
          ["9", "공종 분기 품목 -> 공종 버튼", "O"],
          ["10", "지역/공종 선택 시 해당 공급업체 로드", "O"],
          ["11", "PR 작성 플로우 정상 (기존 기능)", "O"],
          ["12", "RAG 답변 정상 (회귀 테스트)", "O"],
          ["13", "JS 콘솔 에러 없음", "0건"],
          ["14", "BT/GT 라우팅 정상 (회귀)", "O"],
        ].map(([n, item, expected]) => new TableRow({ children: [
          cell(n, { w: 600, align: AlignmentType.CENTER }),
          cell(item, { w: 5400 }),
          cell(expected, { w: 1800, align: AlignmentType.CENTER }),
          cell("", { w: 1560, align: AlignmentType.CENTER }),
        ]})),
      ]}),

      // ===== 7. 참고 =====
      new Paragraph({ children: [new PageBreak()] }),
      hdr("7. 참고 정보"),
      hdr2("7.1 API 엔드포인트 요약"),
      new Table({ columnWidths: [1600, 4200, 3560], margins: { top: 60, bottom: 60, left: 120, right: 120 }, rows: [
        new TableRow({ children: [
          cell("Method", { w: 1600, shade: hdrShade, bold: true, color: "FFFFFF", align: AlignmentType.CENTER }),
          cell("경로", { w: 4200, shade: hdrShade, bold: true, color: "FFFFFF" }),
          cell("설명", { w: 3560, shade: hdrShade, bold: true, color: "FFFFFF" }),
        ]}),
        new TableRow({ children: [cell("GET", { w: 1600, align: AlignmentType.CENTER }), cell("/suppliers/l4/options/{l3_code}", { w: 4200, sz: 18 }), cell("L4 세분류 목록", { w: 3560 })] }),
        new TableRow({ children: [cell("GET", { w: 1600, align: AlignmentType.CENTER }), cell("/suppliers/l4/recommend/{l4_code}", { w: 4200, sz: 18 }), cell("공급업체 추천 (고정+롤링)", { w: 3560 })] }),
        new TableRow({ children: [cell("GET", { w: 1600, align: AlignmentType.CENTER }), cell("/suppliers/l4/branch/{l4_code}", { w: 4200, sz: 18 }), cell("지역/공종 분기 옵션", { w: 3560 })] }),
      ]}),

      hdr2("7.2 테스트 데이터 기준"),
      new Paragraph({ numbering: { reference: "bl", level: 0 }, spacing: { after: 80 }, children: [new TextRun({ text: "L3-010101 (사무용품/문구) -> L4 3개: 필기구/접착류, 용지/바인더류, 사무기기 소모품", size: 20, font: "Arial" })] }),
      new Paragraph({ numbering: { reference: "bl", level: 0 }, spacing: { after: 80 }, children: [new TextRun({ text: "L3-030104-01 (건축 수선/보수) -> 지역 6권역 + 공종 5종 (유일한 지역+공종 분기)", size: 20, font: "Arial" })] }),
      new Paragraph({ numbering: { reference: "bl", level: 0 }, spacing: { after: 80 }, children: [new TextRun({ text: "L3-030102-01 (사무공간 리모델링) -> 지역 6권역만 (공종 없음)", size: 20, font: "Arial" })] }),
      new Paragraph({ numbering: { reference: "bl", level: 0 }, spacing: { after: 80 }, children: [new TextRun({ text: "L3-080503 (정보보안 솔루션) -> PR 작성 가능, L4 2개 (네트워크/엔드포인트, 데이터/클라우드)", size: 20, font: "Arial" })] }),
      new Paragraph({ numbering: { reference: "bl", level: 0 }, spacing: { after: 80 }, children: [new TextRun({ text: "L3-070701 (시장조사) -> PR 작성 가능, L4 2개 (시장/소비자 조사, 경쟁/트렌드 분석)", size: 20, font: "Arial" })] }),

      hdr2("7.3 문제 발생 시"),
      new Paragraph({ numbering: { reference: "bl", level: 0 }, spacing: { after: 80 }, children: [new TextRun({ text: "백엔드 로그 확인: /tmp/backend.log", size: 20, font: "Arial" })] }),
      new Paragraph({ numbering: { reference: "bl", level: 0 }, spacing: { after: 80 }, children: [new TextRun({ text: "브라우저 콘솔 (F12) 에서 에러 확인", size: 20, font: "Arial" })] }),
      new Paragraph({ numbering: { reference: "bl", level: 0 }, spacing: { after: 80 }, children: [new TextRun({ text: "테스트 리포트: browser-debugger/output/*.json", size: 20, font: "Arial" })] }),
      new Paragraph({ numbering: { reference: "bl", level: 0 }, spacing: { after: 80 }, children: [new TextRun({ text: "스크린샷: browser-debugger/output/l4_*.png, l4pr_*.png", size: 20, font: "Arial" })] }),
    ]
  }]
});

const outPath = process.argv[2] || "L4_공급업체_테스트_가이드.docx";
Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(outPath, buf);
  console.log("Created:", outPath);
});

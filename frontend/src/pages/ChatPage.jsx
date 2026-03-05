import { useState, useEffect, useRef } from "react";

const C = {
  bg: "#f5f6f8", card: "#ffffff", border: "#eaecf0",
  accent: "#5b6af0", accentSoft: "#eef0fd", accentMid: "#c7cbfb",
  green: "#22c55e", greenSoft: "#f0fdf4", greenMid: "#bbf7d0",
  red: "#ef4444", redSoft: "#fff1f2",
  navy: "#1e3a5f",
  text: "#1a1d23", sub: "#6b7280", muted: "#b0b7c3",
  shadowSm: "0 1px 6px rgba(0,0,0,0.06)",
  shadow: "0 2px 16px rgba(0,0,0,0.07)",
};

const INIT_FIELDS = {
  s1:  { label: "발주기관명",          value: "" },
  s2:  { label: "담당부서",            value: "" },
  s3:  { label: "담당자",              value: "" },
  s4:  { label: "연락처",              value: "" },
  s5:  { label: "이메일",              value: "" },
  s6:  { label: "사업명",              value: "" },
  s7:  { label: "사업목적",            value: "" },
  s8:  { label: "계약형태",            value: "" },
  s9:  { label: "수행기간",            value: "" },
  s10: { label: "대상인원",            value: "" },
  s11: { label: "서비스 범위",         value: "" },
  s12: { label: "교육방식",            value: "" },
  s13: { label: "기술요건",            value: "" },
  s14: { label: "납기기준",            value: "" },
  s15: { label: "SLA 기준",            value: "" },
  s16: { label: "평가① 가격 경쟁력",   value: "30%" },
  s17: { label: "평가② 콘텐츠·강사",   value: "25%" },
  s18: { label: "평가③ ESG 대응",      value: "20%" },
  s19: { label: "평가④ 신뢰도",        value: "15%" },
  s20: { label: "평가⑤ 디지털 역량",   value: "10%" },
  s21: { label: "제출기한",            value: "" },
  s22: { label: "제출방식",            value: "" },
};

const RFP_SECTIONS = [
  { title: "1. 발주기관 정보",       fields: ["s1","s2","s3","s4","s5"],            icon: "🏢" },
  { title: "2. 사업 개요",           fields: ["s6","s7","s8","s9","s10"],           icon: "📋" },
  { title: "3. 서비스 범위 및 요건", fields: ["s11","s12","s13","s14","s15"],       icon: "⚙️" },
  { title: "4. 평가 기준",           fields: ["s16","s17","s18","s19","s20"],       icon: "📊" },
  { title: "5. 제출 안내",           fields: ["s21","s22"],                         icon: "📬" },
];

// ── 데모 시나리오 (백엔드 연동 후 실제 API로 교체)
const CONVO = [
  {
    id: 1, role: "assistant",
    text: "안녕하세요! 간접구매 AI 코파일럿입니다. 😊\n\n구매하려는 품목이나 서비스를 말씀해 주세요.\n견적 요청부터 공급업체 추천, 계약서 작성까지 함께 도와드립니다.",
    trigger: null, fills: {}
  },
  {
    id: 2, role: "user",
    text: "직원 대상 법정 의무교육 서비스를 구매하고 싶어요. 약 300명 규모입니다.",
    trigger: "purchase", fills: {}
  },
  {
    id: 3, role: "assistant",
    text: "분류 확인 완료",
    classification: { 대분류:"교육 서비스", 중분류:"교육 서비스", 소분류:"법정 의무 교육 서비스", 진행단계:"2차" },
    trigger: null, fills: {}
  },
  {
    id: 4, role: "assistant",
    text: "RFP를 생성하기 위해 몇 가지 확인이 필요합니다.\n\n✅  수강 인원 300명 확인\n❓  교육 과목 범위를 알려주세요\n❓  희망 납기 시점은 언제인가요?",
    trigger: "rfp", fills: {}
  },
  {
    id: 5, role: "user",
    text: "성희롱예방, 개인정보보호, 산업안전보건 3가지 필요합니다. 3월 말까지 완료해야 해요.",
    trigger: null,
    fills: {
      s6:"임직원 법정의무교육 위탁 서비스",
      s7:"법정 의무 준수 및 임직원 역량 강화",
      s8:"연간 위탁계약",
      s9:"2026.01.01 ~ 2026.03.31",
      s10:"300명",
      s11:"성희롱예방 / 개인정보보호 / 산업안전보건교육",
      s14:"2026년 3월 31일까지 전 직원 이수 완료"
    }
  },
  {
    id: 6, role: "assistant",
    text: "✅ 사업 개요 입력 완료!\n\n③ 교육 방식과 기술 요건을 알려주세요.\n   LMS 연동, 모바일 지원이 필요하신가요?",
    trigger: null, fills: {}
  },
  {
    id: 7, role: "user",
    text: "이러닝과 오프라인 혼합형으로 진행하고, LMS·HR 연동과 모바일 지원이 필수입니다.",
    trigger: null,
    fills: {
      s12:"이러닝 + 오프라인 혼합형",
      s13:"LMS·HR 연동 필수, 모바일 지원, 출결·이수 자동 수집",
      s15:"이수율 95% 이상 / 장애대응 2h 이내 / 월별 보고서 제출"
    }
  },
  {
    id: 8, role: "assistant",
    text: "✅ 기술 요건 입력 완료!\n\n④ 마지막으로 제안서 제출 기한을 알려주세요.",
    trigger: null, fills: {}
  },
  {
    id: 9, role: "user",
    text: "2026년 2월 15일 오후 5시까지 이메일로 받겠습니다.",
    trigger: null,
    fills: {
      s1:"주식회사 캐스팅엔", s2:"구매팀", s3:"홍길동 차장",
      s4:"02-1234-5678", s5:"buyer@castingn.com",
      s21:"2026년 2월 15일 (월) 17:00 KST",
      s22:"PDF 이메일 제출 (buyer@castingn.com)"
    }
  },
  {
    id: 10, role: "assistant",
    text: "🎉 RFP 작성이 완성되었습니다!\n\n모든 필수 항목이 입력되었습니다.\n다운로드 후 공급업체 추천 단계로 진행할 수 있습니다.",
    trigger: "complete", fills: {}
  },
];

export default function ChatPage() {
  const [phase, setPhase]               = useState("chat");
  const [step, setStep]                 = useState(0);
  const [fields, setFields]             = useState(INIT_FIELDS);
  const [justFilled, setJustFilled]     = useState(new Set());
  const [isTyping, setIsTyping]         = useState(false);
  const [downloaded, setDownloaded]     = useState(false);
  const [openSec, setOpenSec]           = useState({0:true,1:true,2:true,3:true,4:true});
  const [rightVisible, setRightVisible] = useState(false);
  const msgEndRef = useRef(null);
  const fieldRefs = useRef({});

  const visibleMsgs = CONVO.slice(0, step + 1);
  const filled = Object.values(fields).filter(f => f.value.trim()).length;
  const total  = Object.keys(fields).length;
  const pct    = Math.round(filled / total * 100);

  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [visibleMsgs, isTyping]);

  const applyFills = (fills) => {
    if (!Object.keys(fills).length) return;
    const keys = new Set(Object.keys(fills));
    setJustFilled(keys);
    setFields(prev => {
      const next = { ...prev };
      Object.entries(fills).forEach(([k,v]) => { next[k] = { ...next[k], value: v }; });
      return next;
    });
    const firstKey = Object.keys(fills)[0];
    setTimeout(() => fieldRefs.current[firstKey]?.scrollIntoView({ behavior:"smooth", block:"center" }), 300);
    setTimeout(() => setJustFilled(new Set()), 2500);
  };

  const advance = () => {
    if (isTyping) return;
    const nextStep = step + 1;
    if (nextStep >= CONVO.length) return;
    const next = CONVO[nextStep];

    if (next.trigger === "purchase") {
      setRightVisible(true);
      setPhase("blank");
    }

    if (next.role === "assistant") {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        setStep(nextStep);
        if (next.trigger === "rfp")      setPhase("filling");
        if (next.trigger === "complete") setTimeout(() => setPhase("complete"), 800);
        applyFills(next.fills);
      }, 900);
    } else {
      setStep(nextStep);
      setTimeout(() => applyFills(next.fills), 350);
    }
  };

  const Chip = ({ children, color, bg, border }) => (
    <span style={{
      fontSize:10, padding:"2px 8px", borderRadius:6, fontWeight:600,
      background: bg || C.greenSoft,
      color: color || "#16a34a",
      border: `1px solid ${border || C.greenMid}`
    }}>{children}</span>
  );

  // ══ 오른쪽 패널: 빈 RFP 양식 ══
  const PanelBlank = () => (
    <div style={{ flex:1, overflowY:"auto", padding:"24px 28px" }}>
      {/* 문서 타이틀 */}
      <div style={{
        background:C.card, borderRadius:14, padding:"22px 26px",
        textAlign:"center", marginBottom:16,
        border:`2px solid ${C.navy}`, boxShadow:C.shadowSm
      }}>
        <div style={{ fontSize:10, letterSpacing:3, color:C.sub, marginBottom:8 }}>
          대한민국 정부 표준 구매 양식
        </div>
        <div style={{ fontSize:22, fontWeight:900, letterSpacing:6, color:C.navy }}>
          제 안 요 청 서
        </div>
        <div style={{ fontSize:11, color:C.muted, marginTop:5 }}>Request for Proposal (RFP)</div>
        <div style={{ marginTop:14, paddingTop:12, borderTop:`1px solid ${C.border}`, fontSize:11, color:C.sub }}>
          왼쪽 채팅에서 대화를 시작하면 이 양식이 자동으로 채워집니다.
        </div>
      </div>
      {/* 섹션별 빈 필드 */}
      {RFP_SECTIONS.map((sec, si) => (
        <div key={si} style={{ marginBottom:10 }}>
          <div style={{
            background:"#f0f2f5", padding:"9px 16px",
            display:"flex", alignItems:"center", gap:8,
            borderRadius:"8px 8px 0 0", border:`1px solid ${C.border}`
          }}>
            <span>{sec.icon}</span>
            <span style={{ fontSize:12, fontWeight:700, color:C.navy }}>{sec.title}</span>
          </div>
          <div style={{
            background:C.card, border:`1px solid ${C.border}`,
            borderTop:"none", borderRadius:"0 0 8px 8px", overflow:"hidden"
          }}>
            {sec.fields.map((fk, fi) => (
              <div key={fk} style={{
                display:"flex",
                borderBottom: fi < sec.fields.length-1 ? "1px solid #f4f5f7" : "none"
              }}>
                <div style={{
                  width:140, padding:"10px 14px", background:"#fafbfc",
                  borderRight:"1px solid #f0f1f3", fontSize:11,
                  fontWeight:700, color:C.sub, display:"flex", alignItems:"center", flexShrink:0
                }}>{INIT_FIELDS[fk].label}</div>
                <div style={{ flex:1, padding:"10px 16px", minHeight:38, display:"flex", alignItems:"center" }}>
                  {/* 평가기준(s16~s20)은 처음부터 값 표시, 나머진 빈 줄 */}
                  {["s16","s17","s18","s19","s20"].includes(fk)
                    ? <span style={{ fontSize:11, color:C.sub }}>{INIT_FIELDS[fk].value}</span>
                    : <div style={{ width:"75%", height:1.5, background:"#e2e5ea" }} />
                  }
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      {/* 서명란 */}
      <div style={{ background:C.card, borderRadius:10, padding:"20px 24px", border:`1px solid ${C.border}` }}>
        <div style={{ display:"flex", justifyContent:"space-around" }}>
          {["작성일","담당자 (서명)","발주기관"].map(l => (
            <div key={l} style={{ textAlign:"center" }}>
              <div style={{ fontSize:10, color:C.sub, marginBottom:10 }}>{l}</div>
              <div style={{ width:100, borderBottom:`1.5px solid ${C.border}`, paddingBottom:4, minHeight:18 }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ══ 오른쪽 패널: 채워지는 RFP ══
  const PanelFilling = () => (
    <div style={{ flex:1, overflowY:"auto", padding:"20px 24px" }}>
      {/* 완성도 바 */}
      <div style={{
        background:C.card, borderRadius:12, padding:"14px 18px",
        marginBottom:14, border:`1px solid ${C.border}`, boxShadow:C.shadowSm
      }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:9 }}>
          <span style={{ fontSize:12, fontWeight:700 }}>RFP 완성도</span>
          <span style={{
            fontSize:11, fontWeight:700, padding:"3px 10px", borderRadius:20,
            background: pct >= 80 ? C.greenSoft : C.accentSoft,
            color: pct >= 80 ? "#16a34a" : C.accent,
            border: `1px solid ${pct >= 80 ? C.greenMid : C.accentMid}`
          }}>{filled} / {total} · {pct}%</span>
        </div>
        <div style={{ height:7, background:"#f1f5f9", borderRadius:4, overflow:"hidden" }}>
          <div style={{
            height:"100%", width:`${pct}%`, borderRadius:4,
            background:`linear-gradient(90deg, ${C.accent}, #7c3aed)`,
            transition:"width 0.6s ease"
          }} />
        </div>
        {pct < 100 && (
          <div style={{ marginTop:9, fontSize:11, color:C.red }}>
            ⚠ 미완료 항목이 있어 RFP 발송이 불가합니다. 왼쪽 채팅에서 정보를 입력해 주세요.
          </div>
        )}
      </div>
      {/* 섹션 아코디언 */}
      {RFP_SECTIONS.map((sec, si) => {
        const sectionDone = sec.fields.every(f => fields[f]?.value);
        return (
          <div key={si} style={{ marginBottom:9 }}>
            <div
              onClick={() => setOpenSec(p => ({...p,[si]:!p[si]}))}
              style={{
                background:C.card, padding:"11px 14px",
                border:`1px solid ${C.border}`,
                borderRadius: openSec[si] ? "10px 10px 0 0" : 10,
                display:"flex", alignItems:"center", gap:8, cursor:"pointer"
              }}
            >
              <span style={{
                width:22, height:22, borderRadius:"50%",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:11, fontWeight:800, flexShrink:0,
                background: sectionDone ? C.greenSoft : "#fff1f2",
                color: sectionDone ? "#16a34a" : C.red
              }}>{sectionDone ? "✓" : "!"}</span>
              <span style={{ fontSize:12, fontWeight:700, flex:1 }}>{sec.title}</span>
              {sectionDone
                ? <Chip>완료</Chip>
                : <Chip color={C.red} bg={C.redSoft} border="#fecaca">미완료</Chip>
              }
              <span style={{ color:C.muted, fontSize:10 }}>{openSec[si] ? "▲" : "▼"}</span>
            </div>
            {openSec[si] && (
              <div style={{
                background:C.card, border:`1px solid ${C.border}`,
                borderTop:"none", borderRadius:"0 0 10px 10px", overflow:"hidden"
              }}>
                {sec.fields.map((fk, fi) => {
                  const f = fields[fk];
                  const isNew = justFilled.has(fk);
                  return (
                    <div
                      key={fk}
                      ref={el => fieldRefs.current[fk] = el}
                      style={{
                        display:"flex", alignItems:"flex-start",
                        borderBottom: fi < sec.fields.length-1 ? "1px solid #f4f5f7" : "none",
                        animation: isNew ? "flashNew 2.5s ease forwards" : "none"
                      }}
                    >
                      <style>{`
                        @keyframes flashNew { 0%,40% { background:#fef9c3; } 100% { background:transparent; } }
                      `}</style>
                      <div style={{
                        width:140, padding:"10px 14px", flexShrink:0,
                        background:"#fafbfc", borderRight:"1px solid #f0f1f3",
                        fontSize:11, fontWeight:700, color:C.sub,
                        display:"flex", alignItems:"center", minHeight:38
                      }}>{f.label}</div>
                      <div style={{ flex:1, padding:"10px 14px", fontSize:12, lineHeight:1.7, minHeight:38, display:"flex", alignItems:"center" }}>
                        {f.value ? (
                          <span style={{ color:C.text, whiteSpace:"pre-wrap" }}>
                            {isNew && (
                              <span style={{
                                fontSize:9, marginRight:6, padding:"1px 5px",
                                background:"#fef9c3", border:"1px solid #fde68a",
                                borderRadius:4, color:"#92400e", fontWeight:700
                              }}>NEW</span>
                            )}
                            {f.value}
                          </span>
                        ) : (
                          <span style={{ color:C.muted, fontStyle:"italic", fontSize:11 }}>
                            대화를 통해 자동 입력됩니다
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
      {/* 하단 버튼 */}
      <div style={{ display:"flex", gap:8, marginTop:10 }}>
        <button style={{
          flex:1, padding:"11px", borderRadius:10, border:`1px solid ${C.border}`,
          background:C.card, color:C.sub, fontSize:12, fontWeight:600,
          cursor:"pointer", fontFamily:"inherit"
        }}>📥 초안 다운로드</button>
        <button disabled style={{
          flex:1, padding:"11px", borderRadius:10, border:"none",
          background:"#e9ecef", color:C.muted,
          fontSize:12, fontWeight:700, fontFamily:"inherit", cursor:"not-allowed"
        }}>📨 RFP 발송</button>
      </div>
    </div>
  );

  // ══ 오른쪽 패널: 완성된 RFP ══
  const PanelComplete = () => (
    <div style={{ flex:1, overflowY:"auto", padding:"20px 24px" }}>
      {/* 완성 배너 */}
      <div style={{
        background:C.greenSoft, borderRadius:14, padding:"16px 22px",
        marginBottom:16, border:`1.5px solid ${C.greenMid}`,
        display:"flex", alignItems:"center", gap:12
      }}>
        <span style={{ fontSize:28 }}>🎉</span>
        <div>
          <div style={{ fontSize:14, fontWeight:800, color:"#15803d" }}>RFP 작성 완료!</div>
          <div style={{ fontSize:11, color:"#16a34a", marginTop:2 }}>
            모든 항목이 입력되었습니다. 다운로드 후 공급업체에 발송하세요.
          </div>
        </div>
        <button
          onClick={() => setDownloaded(true)}
          style={{
            marginLeft:"auto", padding:"9px 20px", borderRadius:10, border:"none",
            background: downloaded ? "#15803d" : `linear-gradient(135deg,${C.accent},#7c3aed)`,
            color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer",
            fontFamily:"inherit", whiteSpace:"nowrap", transition:"all 0.3s"
          }}
        >{downloaded ? "✅ 다운로드 완료" : "📥 RFP 다운로드"}</button>
      </div>
      {/* 완성된 양식 헤더 */}
      <div style={{
        background:C.card, borderRadius:14, padding:"20px 26px",
        textAlign:"center", marginBottom:14,
        border:`2px solid ${C.green}`, boxShadow:`0 0 0 4px ${C.greenSoft}`
      }}>
        <div style={{ fontSize:10, letterSpacing:3, color:C.sub, marginBottom:6 }}>대한민국 정부 표준 구매 양식</div>
        <div style={{ fontSize:20, fontWeight:900, letterSpacing:4, color:C.navy }}>제 안 요 청 서</div>
        <div style={{ marginTop:10 }}>
          <span style={{
            fontSize:12, fontWeight:700, padding:"4px 14px",
            background:C.accentSoft, color:C.accent, borderRadius:8, border:`1px solid ${C.accentMid}`
          }}>{fields.s6.value}</span>
        </div>
      </div>
      {/* 완성된 섹션들 */}
      {RFP_SECTIONS.map((sec, si) => (
        <div key={si} style={{ marginBottom:10 }}>
          <div style={{
            background:"#f0f2f5", padding:"9px 16px",
            display:"flex", alignItems:"center", gap:8,
            borderRadius:"8px 8px 0 0", border:`1px solid ${C.border}`
          }}>
            <span>{sec.icon}</span>
            <span style={{ fontSize:12, fontWeight:700, color:C.navy }}>{sec.title}</span>
            <Chip>완료 ✓</Chip>
          </div>
          <div style={{
            background:C.card, border:`1px solid ${C.border}`,
            borderTop:"none", borderRadius:"0 0 8px 8px", overflow:"hidden"
          }}>
            {sec.fields.map((fk, fi) => (
              <div key={fk} style={{
                display:"flex", alignItems:"flex-start",
                borderBottom: fi < sec.fields.length-1 ? "1px solid #f4f5f7" : "none"
              }}>
                <div style={{
                  width:140, padding:"10px 14px", background:"#fafbfc",
                  borderRight:"1px solid #f0f1f3", fontSize:11,
                  fontWeight:700, color:C.sub, flexShrink:0, display:"flex", alignItems:"center"
                }}>{fields[fk].label}</div>
                <div style={{ flex:1, padding:"10px 14px", fontSize:12, color:C.text, lineHeight:1.7 }}>
                  {fields[fk].value}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      {/* 서명란 */}
      <div style={{ background:C.card, borderRadius:10, padding:"20px 24px", border:`1px solid ${C.border}` }}>
        <div style={{ display:"flex", justifyContent:"space-around" }}>
          {[
            { label:"작성일", value: new Date().toLocaleDateString("ko-KR") },
            { label:"담당자 (서명)", value: fields.s3.value },
            { label:"발주기관", value: fields.s1.value },
          ].map(item => (
            <div key={item.label} style={{ textAlign:"center" }}>
              <div style={{ fontSize:10, color:C.sub, marginBottom:8 }}>{item.label}</div>
              <div style={{ width:110, borderBottom:`1.5px solid ${C.border}`, paddingBottom:4, fontSize:12, color:C.text }}>
                {item.value}
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop:14, textAlign:"center" }}>
          <span style={{ fontSize:10, color:C.muted, padding:"4px 12px", background:C.bg, borderRadius:20, border:`1px solid ${C.border}` }}>
            📚 RAG 기반 생성 · 구매전략·표준프로세스 문서 근거
          </span>
        </div>
      </div>
      <div style={{ height:20 }} />
    </div>
  );

  // ══════════════════════════════════════════════
  // 메인 렌더
  // ══════════════════════════════════════════════
  return (
    <div style={{
      display:"flex", height:"100vh", background:C.bg,
      fontFamily:"'Pretendard','Apple SD Gothic Neo','Noto Sans KR',sans-serif",
      color:C.text, overflow:"hidden"
    }}>

      {/* ════ LEFT: 채팅 패널 ════ */}
      <div style={{
        width: rightVisible ? "44%" : "520px",
        minWidth: 360,
        display:"flex", flexDirection:"column",
        background:C.card,
        borderRight: rightVisible ? `1px solid ${C.border}` : "none",
        transition:"width 0.4s ease",
        ...(phase === "chat" ? {
          margin:"0 auto",
          borderRadius:16,
          boxShadow:"0 4px 32px rgba(0,0,0,0.10)"
        } : {})
      }}>
        {/* 채팅 헤더 */}
        <div style={{ padding:"15px 20px 13px", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", gap:12 }}>
          <div style={{
            width:44, height:44, borderRadius:13, flexShrink:0,
            background:"linear-gradient(135deg,#5b6af0,#8b5cf6)",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:22, boxShadow:"0 4px 12px rgba(91,106,240,0.32)"
          }}>🛒</div>
          <div>
            <div style={{ fontSize:15, fontWeight:800, letterSpacing:"-0.4px" }}>간접구매 코파일럿</div>
            <div style={{ display:"flex", alignItems:"center", gap:5, marginTop:2 }}>
              <span style={{ width:7, height:7, borderRadius:"50%", background:C.green, display:"inline-block" }} />
              <span style={{ fontSize:11, color:C.sub }}>
                {phase === "chat"     ? "대화 시작 대기중"
                 : phase === "blank"   ? "요구사항 수집 중"
                 : phase === "filling" ? "RFP 작성 진행 중"
                 : "RFP 작성 완료 ✓"}
              </span>
            </div>
          </div>
          <div style={{ marginLeft:"auto", display:"flex", gap:6 }}>
            <span style={{ fontSize:10, padding:"3px 9px", borderRadius:20, fontWeight:600, background:C.greenSoft, color:"#16a34a", border:`1px solid ${C.greenMid}` }}>● RAG 활성</span>
            <span style={{ fontSize:10, padding:"3px 9px", borderRadius:20, fontWeight:600, background:C.accentSoft, color:C.accent, border:`1px solid ${C.accentMid}` }}>헌법 준수</span>
          </div>
        </div>

        {/* 메시지 목록 */}
        <div style={{
          flex:1, overflowY:"auto", padding:"18px 14px",
          display:"flex", flexDirection:"column", gap:12,
          background:"linear-gradient(180deg,#f7f8fc,#f5f6f8)"
        }}>
          {visibleMsgs.map(msg => (
            <div key={msg.id} style={{
              display:"flex",
              flexDirection: msg.role === "user" ? "row-reverse" : "row",
              gap:8, alignItems:"flex-start"
            }}>
              {msg.role === "assistant" && (
                <div style={{
                  width:32, height:32, borderRadius:9, flexShrink:0,
                  background:"linear-gradient(135deg,#5b6af0,#8b5cf6)",
                  display:"flex", alignItems:"center", justifyContent:"center", fontSize:15
                }}>🛒</div>
              )}
              <div style={{ maxWidth:"80%", display:"flex", flexDirection:"column", gap:5 }}>
                {/* 분류 결과 카드 */}
                {msg.classification && (
                  <div style={{
                    background:C.accentSoft, border:`1px solid ${C.accentMid}`,
                    borderRadius:"10px 10px 10px 2px", padding:"10px 14px"
                  }}>
                    <div style={{ fontSize:10, fontWeight:700, color:C.accent, marginBottom:6 }}>🔍 분류 결과</div>
                    {Object.entries(msg.classification).map(([k,v]) => (
                      <div key={k} style={{ fontSize:11, display:"flex", gap:6, lineHeight:1.9 }}>
                        <span style={{ color:C.muted, width:56, flexShrink:0 }}>{k}</span>
                        <span style={{ fontWeight:600, color:C.text }}>{v}</span>
                      </div>
                    ))}
                  </div>
                )}
                {/* 말풍선 */}
                {msg.text && (
                  <div style={{
                    background: msg.role === "user"
                      ? "linear-gradient(135deg,#5b6af0,#7c3aed)"
                      : msg.trigger === "complete" ? C.greenSoft : C.card,
                    color: msg.role === "user" ? "#fff" : C.text,
                    borderRadius: msg.role === "user" ? "12px 2px 12px 12px" : "2px 12px 12px 12px",
                    padding:"11px 15px", fontSize:13, lineHeight:1.7,
                    boxShadow: msg.role === "user" ? "0 4px 14px rgba(91,106,240,0.24)" : C.shadowSm,
                    border: msg.trigger === "complete" ? `1px solid ${C.greenMid}`
                      : msg.role === "user" ? "none" : `1px solid ${C.border}`
                  }}>
                    {msg.trigger === "complete" && (
                      <div style={{ fontSize:10, fontWeight:700, color:"#16a34a", marginBottom:4 }}>✅ RFP 작성 완료</div>
                    )}
                    <span style={{ whiteSpace:"pre-wrap" }}>{msg.text}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
          {/* 타이핑 인디케이터 */}
          {isTyping && (
            <div style={{ display:"flex", gap:8 }}>
              <div style={{ width:32, height:32, borderRadius:9, background:"linear-gradient(135deg,#5b6af0,#8b5cf6)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:15 }}>🛒</div>
              <div style={{ background:C.card, borderRadius:"2px 12px 12px 12px", padding:"12px 16px", border:`1px solid ${C.border}`, display:"flex", gap:5, alignItems:"center" }}>
                {[0,1,2].map(i => (
                  <span key={i} style={{
                    width:7, height:7, borderRadius:"50%", background:C.accentMid,
                    display:"inline-block",
                    animation:`bop 1.2s ease-in-out ${i * 0.2}s infinite`
                  }} />
                ))}
                <style>{`@keyframes bop{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-6px)}}`}</style>
              </div>
            </div>
          )}
          <div ref={msgEndRef} />
        </div>

        {/* 빠른 입력 칩 (chat 이후 단계에서만) */}
        {phase !== "chat" && (
          <div style={{ padding:"8px 14px 5px", background:C.card, borderTop:`1px solid ${C.border}`, display:"flex", gap:6, flexWrap:"wrap" }}>
            {["기술 요건 추가","평가 기준 설정","공급업체 보기"].map(q => (
              <button key={q} style={{
                padding:"4px 11px", borderRadius:20, border:`1px solid ${C.border}`,
                background:C.bg, color:C.sub, fontSize:11, cursor:"pointer", fontFamily:"inherit"
              }}>{q}</button>
            ))}
          </div>
        )}

        {/* 입력창 */}
        <div style={{ background:C.card, borderTop:`1px solid ${C.border}` }}>
          {step < CONVO.length - 1 && (
            <div style={{ padding:"10px 14px 5px" }}>
              <button onClick={advance} disabled={isTyping} style={{
                width:"100%", padding:"11px", borderRadius:11, border:"none",
                background: isTyping ? C.border : `linear-gradient(135deg,${C.accent},#7c3aed)`,
                color: isTyping ? C.muted : "#fff",
                fontSize:13, fontWeight:700, cursor: isTyping ? "not-allowed" : "pointer",
                fontFamily:"inherit", transition:"all 0.2s",
                display:"flex", alignItems:"center", justifyContent:"center", gap:8
              }}>
                {isTyping ? "답변 생성 중..."
                  : phase === "chat" ? "💬 대화 시작하기"
                  : `다음 단계 → (${step + 1}/${CONVO.length - 1})`}
              </button>
            </div>
          )}
          <div style={{ padding:"8px 14px 10px", display:"flex", gap:8, alignItems:"center" }}>
            <button style={{ width:34, height:34, borderRadius:9, border:`1px solid ${C.border}`, background:C.bg, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontSize:15 }}>🎙</button>
            <input
              placeholder={
                phase === "chat"     ? "구매 관련 내용을 입력해주세요... (Shift+Enter: 줄바꿈)" :
                phase === "complete" ? "공급업체 추천 또는 추가 질문..." :
                "추가 정보를 입력하세요..."
              }
              style={{ flex:1, height:40, background:C.bg, border:`1.5px solid ${C.border}`, borderRadius:11, padding:"0 14px", color:C.text, fontSize:13, outline:"none", fontFamily:"inherit" }}
            />
            <button style={{ width:40, height:40, borderRadius:11, border:"none", background:`linear-gradient(135deg,${C.accent},#7c3aed)`, color:"#fff", fontSize:17, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>➤</button>
          </div>
          <div style={{ padding:"2px 14px 9px", fontSize:10, color:C.muted, textAlign:"center" }}>
            본 답변은 RAG 기반 참조 응답이며, 최종 결정은 담당자 검토 후 진행하시기 바랍니다.
          </div>
        </div>
      </div>

      {/* ════ RIGHT: RFP 패널 (phase가 blank 이후에만 표시) ════ */}
      {rightVisible && (
        <div style={{
          flex:1, display:"flex", flexDirection:"column", background:C.bg,
          animation:"slideIn 0.4s ease forwards"
        }}>
          <style>{`@keyframes slideIn{from{opacity:0;transform:translateX(24px)}to{opacity:1;transform:translateX(0)}}`}</style>

          {/* 오른쪽 헤더 */}
          <div style={{
            background:C.card, borderBottom:`1px solid ${C.border}`,
            padding:"14px 24px", boxShadow:C.shadowSm,
            display:"flex", alignItems:"center", gap:10
          }}>
            <div style={{ width:34, height:34, borderRadius:8, background:"linear-gradient(135deg,#1e3a8a,#1d4ed8)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:17 }}>📋</div>
            <div>
              <div style={{ fontSize:13, fontWeight:800 }}>
                {phase === "blank"    ? "제안요청서 (RFP) — 빈 양식"
                 : phase === "filling"  ? "제안요청서 (RFP) — 작성 중"
                 : "제안요청서 (RFP) — 작성 완료"}
              </div>
              <div style={{ fontSize:10, color:C.sub, marginTop:1 }}>대한민국 정부 표준 구매 양식 기준</div>
            </div>
            {/* 단계 표시 */}
            <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:3 }}>
              {[
                { label:"요구수집", done: true },
                { label:"RFP",     done: phase === "filling" || phase === "complete", active: phase === "filling" },
                { label:"공급업체", done: phase === "complete" },
                { label:"완료",    done: false },
              ].map((s, i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:3 }}>
                  <div style={{
                    fontSize:10, padding:"3px 9px", borderRadius:20, fontWeight:600,
                    background: s.done ? C.greenSoft : s.active ? C.accentSoft : "#f8fafc",
                    color: s.done ? "#16a34a" : s.active ? C.accent : C.muted,
                    border: s.done ? `1px solid ${C.greenMid}` : s.active ? `1.5px solid ${C.accent}` : `1px solid ${C.border}`
                  }}>{s.done && !s.active ? "✓ " : ""}{s.label}</div>
                  {i < 3 && <span style={{ color:C.muted, fontSize:9 }}>›</span>}
                </div>
              ))}
            </div>
          </div>

          {/* 패널 콘텐츠 — phase에 따라 전환 */}
          {phase === "blank"    && <PanelBlank />}
          {phase === "filling"  && <PanelFilling />}
          {phase === "complete" && <PanelComplete />}
        </div>
      )}
    </div>
  );
}

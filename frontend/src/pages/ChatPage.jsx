import { useState, useEffect, useRef } from "react";

const API_URL = import.meta.env.VITE_API_URL || "https://ip-assist-backend-1058034030780.asia-northeast3.run.app";

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

let msgIdCounter = 1;

export default function ChatPage() {
  const [phase, setPhase]               = useState("chat");
  const [messages, setMessages]         = useState([
    { id: msgIdCounter++, role: "assistant", text: "안녕하세요! 간접구매 AI 코파일럿입니다. 😊\n\n구매하려는 품목이나 서비스를 말씀해 주세요.\n견적 요청부터 공급업체 추천, 계약서 작성까지 함께 도와드립니다." }
  ]);
  const [fields, setFields]             = useState(INIT_FIELDS);
  const [justFilled, setJustFilled]     = useState(new Set());
  const [isTyping, setIsTyping]         = useState(false);
  const [userInput, setUserInput]       = useState("");
  const [downloaded, setDownloaded]     = useState(false);
  const [openSec, setOpenSec]           = useState({0:true,1:true,2:true,3:true,4:true});
  const [rightVisible, setRightVisible] = useState(false);
  const [sessionId]                     = useState(() => crypto.randomUUID());
  const msgEndRef  = useRef(null);
  const fieldRefs  = useRef({});
  const inputRef   = useRef(null);

  const filled = Object.values(fields).filter(f => f.value.trim()).length;
  const total  = Object.keys(fields).length;
  const pct    = Math.round(filled / total * 100);

  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const applyFills = (fills) => {
    if (!fills || !Object.keys(fills).length) return;
    const keys = new Set(Object.keys(fills));
    setJustFilled(keys);
    setFields(prev => {
      const next = { ...prev };
      Object.entries(fills).forEach(([k,v]) => {
        if (next[k]) next[k] = { ...next[k], value: v };
      });
      return next;
    });
    const firstKey = Object.keys(fills)[0];
    setTimeout(() => fieldRefs.current[firstKey]?.scrollIntoView({ behavior:"smooth", block:"center" }), 300);
    setTimeout(() => setJustFilled(new Set()), 2500);
  };

  // 현재 채워진 필드 맵 (백엔드에 전달용)
  const getFilledFields = () => {
    const result = {};
    Object.entries(fields).forEach(([k, v]) => {
      if (v.value.trim()) result[k] = v.value;
    });
    return result;
  };

  const handleSend = async () => {
    const text = userInput.trim();
    if (!text || isTyping) return;

    // 1. 사용자 메시지 추가
    const userMsg = { id: msgIdCounter++, role: "user", text };
    setMessages(prev => [...prev, userMsg]);
    setUserInput("");
    setIsTyping(true);

    // 2. 대화 이력 구성
    const history = messages.map(m => ({ role: m.role, content: m.text }));

    try {
      // 3. 백엔드 API 호출
      const res = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          message: text,
          category: null,
          history,
          phase,
          filled_fields: getFilledFields(),
        }),
      });
      const data = await res.json();

      // 4. Phase 전환 처리
      if (data.phase_trigger === "purchase" && phase === "chat") {
        setRightVisible(true);
        setPhase("blank");
      }

      // 5. 분류 결과가 있으면 별도 메시지로 추가
      if (data.classification) {
        setMessages(prev => [...prev, {
          id: msgIdCounter++, role: "assistant",
          text: "분류 확인 완료",
          classification: data.classification,
        }]);
      }

      // 6. RFP 모드 전환
      if (data.phase_trigger === "purchase" || (phase === "blank" && data.rfp_fields && Object.keys(data.rfp_fields).length > 0)) {
        setPhase("filling");
      }

      // 7. RFP 필드 채우기
      if (data.rfp_fields && Object.keys(data.rfp_fields).length > 0) {
        applyFills(data.rfp_fields);
      }

      // 8. AI 답변 메시지 추가
      const aiMsg = {
        id: msgIdCounter++,
        role: "assistant",
        text: data.answer,
        sources: data.sources,
        rag_score: data.rag_score,
        trigger: data.phase_trigger,
      };
      setMessages(prev => [...prev, aiMsg]);

      // 9. 완성 처리
      if (data.phase_trigger === "complete") {
        setTimeout(() => setPhase("complete"), 800);
      }

    } catch (err) {
      setMessages(prev => [...prev, {
        id: msgIdCounter++, role: "assistant",
        text: "죄송합니다. 서버 연결에 실패했습니다. 잠시 후 다시 시도해 주세요.",
      }]);
    } finally {
      setIsTyping(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
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
      <div style={{
        background:C.card, borderRadius:14, padding:"22px 26px",
        textAlign:"center", marginBottom:16,
        border:`2px solid ${C.navy}`, boxShadow:C.shadowSm
      }}>
        <div style={{ fontSize:10, letterSpacing:3, color:C.sub, marginBottom:8 }}>대한민국 정부 표준 구매 양식</div>
        <div style={{ fontSize:22, fontWeight:900, letterSpacing:6, color:C.navy }}>제 안 요 청 서</div>
        <div style={{ fontSize:11, color:C.muted, marginTop:5 }}>Request for Proposal (RFP)</div>
        <div style={{ marginTop:14, paddingTop:12, borderTop:`1px solid ${C.border}`, fontSize:11, color:C.sub }}>
          왼쪽 채팅에서 대화를 시작하면 이 양식이 자동으로 채워집니다.
        </div>
      </div>
      {RFP_SECTIONS.map((sec, si) => (
        <div key={si} style={{ marginBottom:10 }}>
          <div style={{ background:"#f0f2f5", padding:"9px 16px", display:"flex", alignItems:"center", gap:8, borderRadius:"8px 8px 0 0", border:`1px solid ${C.border}` }}>
            <span>{sec.icon}</span>
            <span style={{ fontSize:12, fontWeight:700, color:C.navy }}>{sec.title}</span>
          </div>
          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderTop:"none", borderRadius:"0 0 8px 8px", overflow:"hidden" }}>
            {sec.fields.map((fk, fi) => (
              <div key={fk} style={{ display:"flex", borderBottom: fi < sec.fields.length-1 ? "1px solid #f4f5f7" : "none" }}>
                <div style={{ width:140, padding:"10px 14px", background:"#fafbfc", borderRight:"1px solid #f0f1f3", fontSize:11, fontWeight:700, color:C.sub, display:"flex", alignItems:"center", flexShrink:0 }}>{INIT_FIELDS[fk].label}</div>
                <div style={{ flex:1, padding:"10px 16px", minHeight:38, display:"flex", alignItems:"center" }}>
                  {["s16","s17","s18","s19","s20"].includes(fk)
                    ? <span style={{ fontSize:11, color:C.sub }}>{INIT_FIELDS[fk].value}</span>
                    : <div style={{ width:"75%", height:1.5, background:"#e2e5ea" }} />}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
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
      <div style={{ background:C.card, borderRadius:12, padding:"14px 18px", marginBottom:14, border:`1px solid ${C.border}`, boxShadow:C.shadowSm }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:9 }}>
          <span style={{ fontSize:12, fontWeight:700 }}>RFP 완성도</span>
          <span style={{ fontSize:11, fontWeight:700, padding:"3px 10px", borderRadius:20, background: pct >= 80 ? C.greenSoft : C.accentSoft, color: pct >= 80 ? "#16a34a" : C.accent, border: `1px solid ${pct >= 80 ? C.greenMid : C.accentMid}` }}>{filled} / {total} · {pct}%</span>
        </div>
        <div style={{ height:7, background:"#f1f5f9", borderRadius:4, overflow:"hidden" }}>
          <div style={{ height:"100%", width:`${pct}%`, borderRadius:4, background:`linear-gradient(90deg, ${C.accent}, #7c3aed)`, transition:"width 0.6s ease" }} />
        </div>
        {pct < 100 && <div style={{ marginTop:9, fontSize:11, color:C.red }}>⚠ 미완료 항목이 있습니다. 왼쪽 채팅에서 정보를 입력해 주세요.</div>}
      </div>
      {RFP_SECTIONS.map((sec, si) => {
        const sectionDone = sec.fields.every(f => fields[f]?.value);
        return (
          <div key={si} style={{ marginBottom:9 }}>
            <div onClick={() => setOpenSec(p => ({...p,[si]:!p[si]}))} style={{ background:C.card, padding:"11px 14px", border:`1px solid ${C.border}`, borderRadius: openSec[si] ? "10px 10px 0 0" : 10, display:"flex", alignItems:"center", gap:8, cursor:"pointer" }}>
              <span style={{ width:22, height:22, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:800, flexShrink:0, background: sectionDone ? C.greenSoft : "#fff1f2", color: sectionDone ? "#16a34a" : C.red }}>{sectionDone ? "✓" : "!"}</span>
              <span style={{ fontSize:12, fontWeight:700, flex:1 }}>{sec.title}</span>
              {sectionDone ? <Chip>완료</Chip> : <Chip color={C.red} bg={C.redSoft} border="#fecaca">미완료</Chip>}
              <span style={{ color:C.muted, fontSize:10 }}>{openSec[si] ? "▲" : "▼"}</span>
            </div>
            {openSec[si] && (
              <div style={{ background:C.card, border:`1px solid ${C.border}`, borderTop:"none", borderRadius:"0 0 10px 10px", overflow:"hidden" }}>
                {sec.fields.map((fk, fi) => {
                  const f = fields[fk];
                  const isNew = justFilled.has(fk);
                  return (
                    <div key={fk} ref={el => fieldRefs.current[fk] = el} style={{ display:"flex", alignItems:"flex-start", borderBottom: fi < sec.fields.length-1 ? "1px solid #f4f5f7" : "none", animation: isNew ? "flashNew 2.5s ease forwards" : "none" }}>
                      <style>{`@keyframes flashNew { 0%,40% { background:#fef9c3; } 100% { background:transparent; } }`}</style>
                      <div style={{ width:140, padding:"10px 14px", flexShrink:0, background:"#fafbfc", borderRight:"1px solid #f0f1f3", fontSize:11, fontWeight:700, color:C.sub, display:"flex", alignItems:"center", minHeight:38 }}>{f.label}</div>
                      <div style={{ flex:1, padding:"10px 14px", fontSize:12, lineHeight:1.7, minHeight:38, display:"flex", alignItems:"center" }}>
                        {f.value ? (
                          <span style={{ color:C.text, whiteSpace:"pre-wrap" }}>
                            {isNew && <span style={{ fontSize:9, marginRight:6, padding:"1px 5px", background:"#fef9c3", border:"1px solid #fde68a", borderRadius:4, color:"#92400e", fontWeight:700 }}>NEW</span>}
                            {f.value}
                          </span>
                        ) : <span style={{ color:C.muted, fontStyle:"italic", fontSize:11 }}>대화를 통해 자동 입력됩니다</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
      <div style={{ display:"flex", gap:8, marginTop:10 }}>
        <button style={{ flex:1, padding:"11px", borderRadius:10, border:`1px solid ${C.border}`, background:C.card, color:C.sub, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>📥 초안 다운로드</button>
        <button disabled style={{ flex:1, padding:"11px", borderRadius:10, border:"none", background:"#e9ecef", color:C.muted, fontSize:12, fontWeight:700, fontFamily:"inherit", cursor:"not-allowed" }}>📨 RFP 발송</button>
      </div>
    </div>
  );

  // ══ 오른쪽 패널: 완성된 RFP ══
  const PanelComplete = () => (
    <div style={{ flex:1, overflowY:"auto", padding:"20px 24px" }}>
      <div style={{ background:C.greenSoft, borderRadius:14, padding:"16px 22px", marginBottom:16, border:`1.5px solid ${C.greenMid}`, display:"flex", alignItems:"center", gap:12 }}>
        <span style={{ fontSize:28 }}>🎉</span>
        <div>
          <div style={{ fontSize:14, fontWeight:800, color:"#15803d" }}>RFP 작성 완료!</div>
          <div style={{ fontSize:11, color:"#16a34a", marginTop:2 }}>모든 항목이 입력되었습니다. 다운로드 후 공급업체에 발송하세요.</div>
        </div>
        <button onClick={() => setDownloaded(true)} style={{ marginLeft:"auto", padding:"9px 20px", borderRadius:10, border:"none", background: downloaded ? "#15803d" : `linear-gradient(135deg,${C.accent},#7c3aed)`, color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap", transition:"all 0.3s" }}>{downloaded ? "✅ 다운로드 완료" : "📥 RFP 다운로드"}</button>
      </div>
      <div style={{ background:C.card, borderRadius:14, padding:"20px 26px", textAlign:"center", marginBottom:14, border:`2px solid ${C.green}`, boxShadow:`0 0 0 4px ${C.greenSoft}` }}>
        <div style={{ fontSize:10, letterSpacing:3, color:C.sub, marginBottom:6 }}>대한민국 정부 표준 구매 양식</div>
        <div style={{ fontSize:20, fontWeight:900, letterSpacing:4, color:C.navy }}>제 안 요 청 서</div>
        <div style={{ marginTop:10 }}>
          <span style={{ fontSize:12, fontWeight:700, padding:"4px 14px", background:C.accentSoft, color:C.accent, borderRadius:8, border:`1px solid ${C.accentMid}` }}>{fields.s6.value || "사업명 미입력"}</span>
        </div>
      </div>
      {RFP_SECTIONS.map((sec, si) => (
        <div key={si} style={{ marginBottom:10 }}>
          <div style={{ background:"#f0f2f5", padding:"9px 16px", display:"flex", alignItems:"center", gap:8, borderRadius:"8px 8px 0 0", border:`1px solid ${C.border}` }}>
            <span>{sec.icon}</span>
            <span style={{ fontSize:12, fontWeight:700, color:C.navy }}>{sec.title}</span>
            <Chip>완료 ✓</Chip>
          </div>
          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderTop:"none", borderRadius:"0 0 8px 8px", overflow:"hidden" }}>
            {sec.fields.map((fk, fi) => (
              <div key={fk} style={{ display:"flex", alignItems:"flex-start", borderBottom: fi < sec.fields.length-1 ? "1px solid #f4f5f7" : "none" }}>
                <div style={{ width:140, padding:"10px 14px", background:"#fafbfc", borderRight:"1px solid #f0f1f3", fontSize:11, fontWeight:700, color:C.sub, flexShrink:0, display:"flex", alignItems:"center" }}>{fields[fk].label}</div>
                <div style={{ flex:1, padding:"10px 14px", fontSize:12, color:C.text, lineHeight:1.7 }}>{fields[fk].value}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
      <div style={{ background:C.card, borderRadius:10, padding:"20px 24px", border:`1px solid ${C.border}` }}>
        <div style={{ display:"flex", justifyContent:"space-around" }}>
          {[{ label:"작성일", value: new Date().toLocaleDateString("ko-KR") }, { label:"담당자 (서명)", value: fields.s3.value }, { label:"발주기관", value: fields.s1.value }].map(item => (
            <div key={item.label} style={{ textAlign:"center" }}>
              <div style={{ fontSize:10, color:C.sub, marginBottom:8 }}>{item.label}</div>
              <div style={{ width:110, borderBottom:`1.5px solid ${C.border}`, paddingBottom:4, fontSize:12, color:C.text }}>{item.value}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop:14, textAlign:"center" }}>
          <span style={{ fontSize:10, color:C.muted, padding:"4px 12px", background:C.bg, borderRadius:20, border:`1px solid ${C.border}` }}>📚 RAG 기반 생성 · 구매전략·표준프로세스 문서 근거</span>
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
      color:C.text, overflow:"hidden",
      alignItems: phase === "chat" ? "center" : "stretch",
      justifyContent: phase === "chat" ? "center" : "flex-start",
    }}>

      {/* ════ LEFT: 채팅 패널 ════ */}
      <div style={{
        width: rightVisible ? "44%" : "520px",
        minWidth: 360,
        height: phase === "chat" ? "80vh" : "100vh",
        display:"flex", flexDirection:"column",
        background:C.card,
        borderRight: rightVisible ? `1px solid ${C.border}` : "none",
        transition:"all 0.4s ease",
        ...(phase === "chat" ? {
          borderRadius:16,
          boxShadow:"0 4px 32px rgba(0,0,0,0.10)"
        } : {})
      }}>
        {/* 채팅 헤더 */}
        <div style={{ padding:"15px 20px 13px", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:44, height:44, borderRadius:13, flexShrink:0, background:"linear-gradient(135deg,#5b6af0,#8b5cf6)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, boxShadow:"0 4px 12px rgba(91,106,240,0.32)" }}>🛒</div>
          <div>
            <div style={{ fontSize:15, fontWeight:800, letterSpacing:"-0.4px" }}>간접구매 코파일럿</div>
            <div style={{ display:"flex", alignItems:"center", gap:5, marginTop:2 }}>
              <span style={{ width:7, height:7, borderRadius:"50%", background:C.green, display:"inline-block" }} />
              <span style={{ fontSize:11, color:C.sub }}>
                {phase === "chat" ? "대화 시작 대기중" : phase === "blank" ? "요구사항 수집 중" : phase === "filling" ? "RFP 작성 진행 중" : "RFP 작성 완료 ✓"}
              </span>
            </div>
          </div>
          <div style={{ marginLeft:"auto", display:"flex", gap:6 }}>
            <span style={{ fontSize:10, padding:"3px 9px", borderRadius:20, fontWeight:600, background:C.greenSoft, color:"#16a34a", border:`1px solid ${C.greenMid}` }}>● RAG 활성</span>
            <span style={{ fontSize:10, padding:"3px 9px", borderRadius:20, fontWeight:600, background:C.accentSoft, color:C.accent, border:`1px solid ${C.accentMid}` }}>헌법 준수</span>
          </div>
        </div>

        {/* 메시지 목록 */}
        <div style={{ flex:1, overflowY:"auto", padding:"18px 14px", display:"flex", flexDirection:"column", gap:12, background:"linear-gradient(180deg,#f7f8fc,#f5f6f8)" }}>
          {messages.map(msg => (
            <div key={msg.id} style={{ display:"flex", flexDirection: msg.role === "user" ? "row-reverse" : "row", gap:8, alignItems:"flex-start" }}>
              {msg.role === "assistant" && (
                <div style={{ width:32, height:32, borderRadius:9, flexShrink:0, background:"linear-gradient(135deg,#5b6af0,#8b5cf6)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:15 }}>🛒</div>
              )}
              <div style={{ maxWidth:"80%", display:"flex", flexDirection:"column", gap:5 }}>
                {msg.classification && (
                  <div style={{ background:C.accentSoft, border:`1px solid ${C.accentMid}`, borderRadius:"10px 10px 10px 2px", padding:"10px 14px" }}>
                    <div style={{ fontSize:10, fontWeight:700, color:C.accent, marginBottom:6 }}>🔍 분류 결과</div>
                    {Object.entries(msg.classification).map(([k,v]) => (
                      <div key={k} style={{ fontSize:11, display:"flex", gap:6, lineHeight:1.9 }}>
                        <span style={{ color:C.muted, width:56, flexShrink:0 }}>{k}</span>
                        <span style={{ fontWeight:600, color:C.text }}>{v}</span>
                      </div>
                    ))}
                  </div>
                )}
                {msg.text && (
                  <div style={{
                    background: msg.role === "user" ? "linear-gradient(135deg,#5b6af0,#7c3aed)" : msg.trigger === "complete" ? C.greenSoft : C.card,
                    color: msg.role === "user" ? "#fff" : C.text,
                    borderRadius: msg.role === "user" ? "12px 2px 12px 12px" : "2px 12px 12px 12px",
                    padding:"11px 15px", fontSize:13, lineHeight:1.7,
                    boxShadow: msg.role === "user" ? "0 4px 14px rgba(91,106,240,0.24)" : C.shadowSm,
                    border: msg.trigger === "complete" ? `1px solid ${C.greenMid}` : msg.role === "user" ? "none" : `1px solid ${C.border}`
                  }}>
                    {msg.trigger === "complete" && <div style={{ fontSize:10, fontWeight:700, color:"#16a34a", marginBottom:4 }}>✅ RFP 작성 완료</div>}
                    <span style={{ whiteSpace:"pre-wrap" }}>{msg.text}</span>
                  </div>
                )}
                {/* 출처 표시 */}
                {msg.sources && msg.sources.length > 0 && (
                  <div style={{ display:"flex", gap:4, flexWrap:"wrap", marginTop:2 }}>
                    {msg.sources.slice(0,3).map((s,i) => (
                      <span key={i} style={{ fontSize:9, padding:"2px 6px", background:C.bg, border:`1px solid ${C.border}`, borderRadius:4, color:C.sub }}>📄 {s.replace(".pdf","")}</span>
                    ))}
                    {msg.rag_score > 0 && <span style={{ fontSize:9, padding:"2px 6px", background:C.accentSoft, border:`1px solid ${C.accentMid}`, borderRadius:4, color:C.accent }}>{(msg.rag_score*100).toFixed(0)}% 일치</span>}
                  </div>
                )}
              </div>
            </div>
          ))}
          {isTyping && (
            <div style={{ display:"flex", gap:8 }}>
              <div style={{ width:32, height:32, borderRadius:9, background:"linear-gradient(135deg,#5b6af0,#8b5cf6)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:15 }}>🛒</div>
              <div style={{ background:C.card, borderRadius:"2px 12px 12px 12px", padding:"12px 16px", border:`1px solid ${C.border}`, display:"flex", gap:5, alignItems:"center" }}>
                {[0,1,2].map(i => (
                  <span key={i} style={{ width:7, height:7, borderRadius:"50%", background:C.accentMid, display:"inline-block", animation:`bop 1.2s ease-in-out ${i*0.2}s infinite` }} />
                ))}
                <style>{`@keyframes bop{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-6px)}}`}</style>
              </div>
            </div>
          )}
          <div ref={msgEndRef} />
        </div>

        {/* 입력창 */}
        <div style={{ background:C.card, borderTop:`1px solid ${C.border}` }}>
          <div style={{ padding:"10px 14px 10px", display:"flex", gap:8, alignItems:"center" }}>
            <input
              ref={inputRef}
              value={userInput}
              onChange={e => setUserInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={phase === "chat" ? "구매 관련 내용을 입력해주세요..." : phase === "complete" ? "공급업체 추천 또는 추가 질문..." : "추가 정보를 입력하세요..."}
              style={{ flex:1, height:44, background:C.bg, border:`1.5px solid ${C.border}`, borderRadius:11, padding:"0 14px", color:C.text, fontSize:13, outline:"none", fontFamily:"inherit" }}
            />
            <button onClick={handleSend} disabled={isTyping || !userInput.trim()} style={{
              width:44, height:44, borderRadius:11, border:"none",
              background: isTyping || !userInput.trim() ? C.border : `linear-gradient(135deg,${C.accent},#7c3aed)`,
              color: isTyping || !userInput.trim() ? C.muted : "#fff",
              fontSize:17, display:"flex", alignItems:"center", justifyContent:"center", cursor: isTyping ? "not-allowed" : "pointer"
            }}>➤</button>
          </div>
          <div style={{ padding:"2px 14px 9px", fontSize:10, color:C.muted, textAlign:"center" }}>
            본 답변은 RAG 기반 참조 응답이며, 최종 결정은 담당자 검토 후 진행하시기 바랍니다.
          </div>
        </div>
      </div>

      {/* ════ RIGHT: RFP 패널 ════ */}
      {rightVisible && (
        <div style={{ flex:1, display:"flex", flexDirection:"column", background:C.bg, animation:"slideIn 0.4s ease forwards" }}>
          <style>{`@keyframes slideIn{from{opacity:0;transform:translateX(24px)}to{opacity:1;transform:translateX(0)}}`}</style>
          <div style={{ background:C.card, borderBottom:`1px solid ${C.border}`, padding:"14px 24px", boxShadow:C.shadowSm, display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:34, height:34, borderRadius:8, background:"linear-gradient(135deg,#1e3a8a,#1d4ed8)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:17 }}>📋</div>
            <div>
              <div style={{ fontSize:13, fontWeight:800 }}>{phase === "blank" ? "제안요청서 (RFP) — 빈 양식" : phase === "filling" ? "제안요청서 (RFP) — 작성 중" : "제안요청서 (RFP) — 작성 완료"}</div>
              <div style={{ fontSize:10, color:C.sub, marginTop:1 }}>대한민국 정부 표준 구매 양식 기준</div>
            </div>
            <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:3 }}>
              {[{ label:"요구수집", done: true }, { label:"RFP", done: phase==="filling"||phase==="complete", active: phase==="filling" }, { label:"공급업체", done: phase==="complete" }, { label:"완료", done: false }].map((s,i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:3 }}>
                  <div style={{ fontSize:10, padding:"3px 9px", borderRadius:20, fontWeight:600, background: s.done ? C.greenSoft : s.active ? C.accentSoft : "#f8fafc", color: s.done ? "#16a34a" : s.active ? C.accent : C.muted, border: s.done ? `1px solid ${C.greenMid}` : s.active ? `1.5px solid ${C.accent}` : `1px solid ${C.border}` }}>{s.done && !s.active ? "✓ " : ""}{s.label}</div>
                  {i < 3 && <span style={{ color:C.muted, fontSize:9 }}>›</span>}
                </div>
              ))}
            </div>
          </div>
          {phase === "blank" && <PanelBlank />}
          {phase === "filling" && <PanelFilling />}
          {phase === "complete" && <PanelComplete />}
        </div>
      )}
    </div>
  );
}

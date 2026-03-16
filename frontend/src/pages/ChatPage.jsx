import { useState, useEffect, useRef } from "react";
import { api } from "../api/client";
import { T } from "../styles/tokens";
import { RFP_TEMPLATES } from "../data/rfpTemplates";
import { PR_TEMPLATES, PR_CATEGORIES } from "../data/prTemplates";
import { PR_TO_RFP_MAPPING } from "../data/fieldMapping";
import { downloadRfpPdf } from "../utils/rfpExport";
import { downloadPrPdf } from "../utils/prExport";
// BackgroundBlobs 제거 — 업무마켓9 임베드 시 외부 배경 불필요

// ═══════════════════════════════════════════
// SVG Icons
// ═══════════════════════════════════════════
const IconBot = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v6m12-3v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9m0 0h18" />
    <circle cx="9" cy="15" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="15" cy="15" r="1.5" fill="currentColor" stroke="none" />
  </svg>
);

const IconSend = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M3.478 2.405a.75.75 0 0 0-.926.94l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.405Z" />
  </svg>
);

const IconNewChat = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
  </svg>
);

const IconChevron = ({ open, size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
    style={{ transition: "transform 0.25s ease", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const IconCheck = ({ size = 12 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const IconAlert = ({ size = 12 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 15c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm1-4h-2V7h2v6z" />
  </svg>
);

const IconDoc = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
  </svg>
);

const IconDownload = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const IconPreview = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const IconSearch = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
  </svg>
);

const IconParty = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5.8 11.3 2 22l10.7-3.79" /><path d="M4 3h.01" /><path d="M22 8h.01" /><path d="M15 2h.01" /><path d="M22 20h.01" />
    <path d="m22 2-2.24.75a2.9 2.9 0 0 0-1.96 3.12c.1.86-.57 1.63-1.45 1.63h-.38c-.86 0-1.6.6-1.76 1.44L14 10" />
    <path d="m22 13-.82-.33c-.86-.34-1.82.2-1.98 1.11-.11.7-.72 1.22-1.43 1.22H17" />
    <path d="m11 2 .33.82c.34.86-.2 1.82-1.11 1.98C9.52 4.9 9 5.52 9 6.23V7" />
    <path d="M11 13c1.93 1.93 2.83 4.17 2 5-.83.83-3.07-.07-5-2-1.93-1.93-2.83-4.17-2-5 .83-.83 3.07.07 5 2Z" />
  </svg>
);

const IconSendMail = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 2L11 13" /><path d="M22 2L15 22 11 13 2 9z" />
  </svg>
);

// ─── RFP 유형별 SVG 아이콘 ───
const IconBox = ({ size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);

const IconPenDoc = ({ size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const IconWrenchTool = ({ size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  </svg>
);

const IconCar = ({ size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 16H9m10 0h3v-3.15a1 1 0 0 0-.84-.99L16 11l-2.7-3.6a1 1 0 0 0-.8-.4H5.24a2 2 0 0 0-1.8 1.1l-.8 1.63A6 6 0 0 0 2 12.42V16h2" />
    <circle cx="6.5" cy="16.5" r="2.5" /><circle cx="16.5" cy="16.5" r="2.5" />
  </svg>
);

const IconHardHat = ({ size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 18v3c0 .6.4 1 1 1h4v-3h3v-3h2l1.4-1.4a6.5 6.5 0 1 0-4-4L8 12H5v3H2z" />
    <circle cx="16.5" cy="7.5" r=".5" fill={color} />
  </svg>
);

const IconBriefcase = ({ size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
  </svg>
);

// ─── 섹션 SVG 아이콘 ───
const IconBuilding = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="2" width="16" height="20" rx="2" /><path d="M9 22v-4h6v4" /><path d="M8 6h.01M16 6h.01M8 10h.01M16 10h.01M8 14h.01M16 14h.01" />
  </svg>
);

const IconClipboard = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" />
  </svg>
);

const IconGear = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const IconBarChart = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);

const IconMailBox = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
  </svg>
);

// ─── 혼합 유형 SVG 아이콘 ───
const IconBoxGear = ({ size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 7l-8-4-8 4v10l8 4 8-4V7z" /><path d="M12 12v9" /><circle cx="17" cy="8" r="2" /><path d="M19 8h1M17 6V5" />
  </svg>
);

const IconCarGear = ({ size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 16H9m10 0h3v-3.15a1 1 0 0 0-.84-.99L16 11l-2.7-3.6a1 1 0 0 0-.8-.4H5.24a2 2 0 0 0-1.8 1.1l-.8 1.63A6 6 0 0 0 2 12.42V16h2" />
    <circle cx="6.5" cy="16.5" r="2.5" /><circle cx="16.5" cy="16.5" r="2.5" />
    <circle cx="20" cy="5" r="2" /><path d="M22 5h1M20 3V2" />
  </svg>
);

const IconBoxArrow = ({ size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" />
    <path d="M17 2l3 3-3 3" /><path d="M14 5h6" />
  </svg>
);

// RFP 유형별 아이콘 (SVG) — 9종 (소프트 파스텔 톤)
const RFP_TYPE_ICONS = {
  purchase:              { icon: (c) => <IconBox size={20} color={c} />,          color: "#0EA5A0", bg: "#F0FAFA" },
  service_contract:      { icon: (c) => <IconPenDoc size={20} color={c} />,      color: "#A78BFA", bg: "#F5F3FF" },
  service:               { icon: (c) => <IconWrenchTool size={20} color={c} />,  color: "#06B6D4", bg: "#ECFEFF" },
  rental:                { icon: (c) => <IconCar size={20} color={c} />,         color: "#FBBF24", bg: "#FFFBEB" },
  construction:          { icon: (c) => <IconHardHat size={20} color={c} />,     color: "#FB923C", bg: "#FFF7ED" },
  consulting:            { icon: (c) => <IconBriefcase size={20} color={c} />,   color: "#818CF8", bg: "#EEF2FF" },
  purchase_maintenance:  { icon: (c) => <IconBoxGear size={20} color={c} />,     color: "#14B8A6", bg: "#F0FDFA" },
  rental_maintenance:    { icon: (c) => <IconCarGear size={20} color={c} />,     color: "#FBBF24", bg: "#FFFBEB" },
  purchase_lease:        { icon: (c) => <IconBoxArrow size={20} color={c} />,    color: "#A78BFA", bg: "#F5F3FF" },
};

// 섹션 아이콘 (SVG)
const SECTION_ICONS = {
  org:   <IconBuilding size={14} />,
  doc:   <IconClipboard size={14} />,
  gear:  <IconGear size={14} />,
  chart: <IconBarChart size={14} />,
  mail:  <IconMailBox size={14} />,
};

let msgIdCounter = 1;

export default function ChatPage() {
  const [phase, setPhase]               = useState("chat");
  const [rfpType, setRfpType]           = useState(null);
  const [messages, setMessages]         = useState([
    { id: msgIdCounter++, role: "assistant", text: "안녕하세요! 간접구매 상담도우미입니다.\n\n구매하려는 품목이나 서비스를 말씀해 주세요.\n견적 요청부터 공급업체 추천까지 함께 도와드립니다.\n\n💡 **물건·서비스를 구매하시는 분**이라면 구매요청서 작성을,\n**구매 업무를 담당하시는 분**이라면 RFP 작성을 도와드립니다.\n역할을 미리 알려주시면 더 정확한 안내가 가능합니다." }
  ]);
  const [fields, setFields]             = useState({});
  const [justFilled, setJustFilled]     = useState(new Set());
  const [isTyping, setIsTyping]         = useState(false);
  const [userInput, setUserInput]       = useState("");
  const [downloaded, setDownloaded]     = useState(false);
  const [sent, setSent]                 = useState(false);
  const [openSec, setOpenSec]           = useState({0:true,1:true,2:true,3:true,4:true,5:true});
  const [rightVisible, setRightVisible] = useState(false);
  const [sessionId]                     = useState(() => crypto.randomUUID());
  const [inputFocused, setInputFocused] = useState(false);
  const [recommendedRfp, setRecommendedRfp] = useState(null);
  const [lastClassification, setLastClassification] = useState(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailTo, setEmailTo]           = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent]       = useState(false);
  const [rfpRequestId, setRfpRequestId] = useState(null);
  const [rfpHistory, setRfpHistory]     = useState([]);
  const [showHistory, setShowHistory]   = useState(false);
  // PR (구매요청서) state
  const [userRole, setUserRole]         = useState(null);    // "user" | "procurement"
  const [roleTurnCount, setRoleTurnCount] = useState(0);
  const [prType, setPrType]             = useState(null);
  const [prFields, setPrFields]         = useState({});
  const [prJustFilled, setPrJustFilled] = useState(new Set());
  const [prRightVisible, setPrRightVisible] = useState(false);
  const [prSuppliers, setPrSuppliers]       = useState([]);
  const [selectedPrSuppliers, setSelectedPrSuppliers] = useState([]);  // [{id, name}, ...]
  const [prSaved, setPrSaved] = useState(false);
  const [uploadedPrSuppliers, setUploadedPrSuppliers] = useState([]);  // PDF에서 추출된 공급업체
  const [prSupplierLoading, setPrSupplierLoading] = useState(false);
  const [dbPrTemplates, setDbPrTemplates] = useState(null); // DB에서 로드된 PR 템플릿
  const msgEndRef  = useRef(null);
  const chatScrollRef = useRef(null);
  const fieldRefs  = useRef({});
  const inputRef   = useRef(null);

  // PR 템플릿 가져오기 (DB 우선, 폴백: 프론트 하드코딩) — 아래 계산에서 사용하므로 먼저 선언
  const getPrTemplate = (typeKey) => {
    if (dbPrTemplates && dbPrTemplates[typeKey]) return dbPrTemplates[typeKey];
    return PR_TEMPLATES[typeKey] || null;
  };

  const currentTemplate = rfpType ? RFP_TEMPLATES[rfpType] : null;
  const currentSections = currentTemplate?.sections || [];
  const filled = Object.values(fields).filter(f => (f.value || "").trim()).length;
  const total  = Object.keys(fields).length;
  const pct    = total > 0 ? Math.round(filled / total * 100) : 0;

  // PR 계산
  const currentPrTemplate = prType ? getPrTemplate(prType) : null;
  const currentPrSections = currentPrTemplate?.sections || [];
  const prFilled = Object.values(prFields).filter(f => (f.value || "").trim()).length;
  const prTotal  = Object.keys(prFields).length;
  const prPct    = prTotal > 0 ? Math.round(prFilled / prTotal * 100) : 0;

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // PR 패널 직접 편집 시 100% 도달하면 자동 완료 전환
  useEffect(() => {
    if (phase === "pr_filling" && prPct >= 100 && prTotal > 0) {
      setTimeout(() => {
        setPhase("pr_complete");
        setPrRightVisible(true);
        setMessages(prev => [...prev, {
          id: msgIdCounter++, role: "assistant",
          text: "구매요청서가 완성되었습니다! 내용을 확인하시고 다운로드해 주세요.",
        }]);
      }, 500);
    }
  }, [prPct, phase, prTotal]);

  // DB에서 PR 템플릿 로드
  useEffect(() => {
    api.getPrTemplates().then(res => {
      if (res.templates && res.templates.length > 0) {
        const map = {};
        res.templates.forEach(t => { map[t.type_key] = t; });
        setDbPrTemplates(map);
      }
    }).catch(() => {});
  }, []);


  // RFP 완료 시 신청 내역 조회
  useEffect(() => {
    if (phase === "complete") {
      setTimeout(() => {
        api.getSessionRfpRequests(sessionId).then(res => {
          const reqs = res.rfp_requests || [];
          setRfpHistory(reqs);
          if (reqs.length > 0) {
            setRfpRequestId(reqs[0].id);
          }
        }).catch(() => {});
      }, 1500);
    }
  }, [phase]);

  // PR 완료 시 공급업체 검색 (사용자 전용)
  useEffect(() => {
    if (phase === "pr_complete" && userRole === "user" && prType) {
      setPrSupplierLoading(true);
      // PR 카테고리 → 대분류 역매핑
      let prCategory = "";
      for (const [cat, keys] of Object.entries(PR_CATEGORIES)) {
        if (keys.includes(prType)) { prCategory = cat; break; }
      }
      // PR 대분류 → DB 공급업체 카테고리 매핑
      const PR_TO_DB_CATEGORY = {
        "건물 관리": "일반 용역",
        "마케팅": "서비스",
        "교육 서비스": "서비스",
      };
      const dbCat = PR_TO_DB_CATEGORY[prCategory] || "일반 용역";
      const schema = getPrTemplate(prType);
      // PR 필드에서 키워드 추출
      const keywords = Object.values(prFields)
        .map(f => (f.value || "").trim())
        .filter(v => v && v.length >= 2 && v.length <= 30)
        .slice(0, 5)
        .join(",");

      api.searchSuppliers(dbCat, keywords || schema?.label || "").then(res => {
        setPrSuppliers(res.suppliers || []);
      }).catch(() => {
        api.getSuppliers(dbCat).then(res => {
          setPrSuppliers(res.suppliers || []);
        }).catch(() => setPrSuppliers([]));
      }).finally(() => setPrSupplierLoading(false));
    }
  }, [phase, userRole, prType]);

  const applyFills = (fills) => {
    if (!fills || !Object.keys(fills).length) return;
    const keys = new Set(Object.keys(fills));
    setJustFilled(keys);
    setFields(prev => {
      const next = { ...prev };
      Object.entries(fills).forEach(([k,v]) => {
        if (next[k] && v != null) {
          let val = String(v).trim();
          // 평가 기준 필드: 숫자만 입력 시 자동 % 추가
          if (next[k].label && next[k].label.startsWith("평가") && val) {
            const numOnly = val.replace(/[%％\s]/g, "");
            if (/^\d+(\.\d+)?$/.test(numOnly)) {
              val = numOnly + "%";
            }
          }
          next[k] = { ...next[k], value: val };
        }
      });
      return next;
    });
    setTimeout(() => setJustFilled(new Set()), 2500);
  };

  const getFilledFields = () => {
    const result = {};
    Object.entries(fields).forEach(([k, v]) => {
      if ((v.value || "").trim()) result[k] = v.value;
    });
    return result;
  };

  // PR 필드 적용
  const applyPrFills = (fills) => {
    if (!fills || !Object.keys(fills).length) return;
    const keys = new Set(Object.keys(fills));
    setPrJustFilled(keys);
    setPrFields(prev => {
      const next = { ...prev };
      Object.entries(fills).forEach(([k,v]) => {
        if (next[k] && v != null) {
          next[k] = { ...next[k], value: String(v).trim() };
        }
      });
      return next;
    });
    setTimeout(() => setPrJustFilled(new Set()), 2500);

  };

  // ── 패널 직접 편집 핸들러 ──
  const handleFieldEdit = (fieldKey, value) => {
    setFields(prev => ({ ...prev, [fieldKey]: { ...prev[fieldKey], value } }));
  };
  const handlePrFieldEdit = (fieldKey, value) => {
    setPrFields(prev => ({ ...prev, [fieldKey]: { ...prev[fieldKey], value } }));
  };

  // ── PR → RFP 전환 ──
  const convertPrToRfp = () => {
    const mapping = PR_TO_RFP_MAPPING[prType];
    if (!mapping) return;

    const rfpTemplateFields = {};
    Object.entries(RFP_TEMPLATES[mapping.rfpType].fields).forEach(([k, v]) => {
      rfpTemplateFields[k] = { ...v };
    });

    // PR 값 → RFP 필드로 복사
    Object.entries(mapping.fieldMap).forEach(([prKey, rfpKey]) => {
      if (prFields[prKey]?.value && rfpTemplateFields[rfpKey]) {
        rfpTemplateFields[rfpKey] = { ...rfpTemplateFields[rfpKey], value: prFields[prKey].value };
      }
    });

    setRfpType(mapping.rfpType);
    setFields(rfpTemplateFields);
    setPhase("filling");
    setRightVisible(true);
    setPrRightVisible(false);

    const rfpLabel = RFP_TEMPLATES[mapping.rfpType].label;
    setMessages(prev => [
      ...prev,
      { id: msgIdCounter++, role: "assistant", text: `구매요청서 내용을 기반으로 ${rfpLabel} 제안요청서(RFP)를 준비했습니다.\n자동 매핑된 항목을 확인하시고, 추가 정보를 입력해 주세요.` }
    ]);
  };

  const getPrFilledFields = () => {
    const result = {};
    Object.entries(prFields).forEach(([k, v]) => {
      if ((v.value || "").trim()) result[k] = v.value;
    });
    return result;
  };

  const handleRfpTypeSelect = (type) => {
    setRfpType(type);
    const templateFields = {};
    Object.entries(RFP_TEMPLATES[type].fields).forEach(([k, v]) => {
      templateFields[k] = { ...v };
    });
    setFields(templateFields);
    setRightVisible(true);
    setPhase("filling");

    const tmpl = RFP_TEMPLATES[type];
    const icon = RFP_TYPE_ICONS[type];
    setMessages(prev => [
      ...prev,
      { id: msgIdCounter++, role: "user", text: tmpl.label },
      { id: msgIdCounter++, role: "assistant", text: `${tmpl.label} 제안요청서 작성을 시작하겠습니다.\n먼저 발주기관 정보를 알려주십시오.\n기관명, 담당부서, 담당자, 연락처, 이메일이 필요합니다.` }
    ]);
  };

  // PR 카테고리 선택
  const handlePrTypeSelect = (type) => {
    setPrType(type);
    const tmpl = getPrTemplate(type);
    if (!tmpl) return;

    const templateFields = {};
    Object.entries(tmpl.fields).forEach(([k, v]) => {
      // DB에서 가져온 default 값으로 미리 채움
      templateFields[k] = { ...v, value: v.default || "" };
    });
    setPrFields(templateFields);
    setPrRightVisible(true);
    setPhase("pr_filling");

    const label = tmpl.name || tmpl.label;
    setMessages(prev => [
      ...prev,
      { id: msgIdCounter++, role: "user", text: label },
      { id: msgIdCounter++, role: "assistant", text: `${label} 구매요청서를 준비했습니다.\n기본값이 미리 입력되어 있습니다. 변경이 필요한 항목만 수정해 주세요.\n우측 패널에서 직접 수정하거나, 채팅으로 알려주셔도 됩니다.` }
    ]);
  };

  // 역할 선택
  const handleRoleSelect = (role) => {
    setUserRole(role);
    if (role === "user") {
      setMessages(prev => [...prev, {
        id: msgIdCounter++, role: "assistant",
        text: "구매하시려는 품목이나 서비스에 대해 질문해 주세요.\n도움이 되는 정보를 안내해 드리고, 구매요청서 작성도 도와드리겠습니다.",
      }]);
    } else {
      setMessages(prev => [...prev, {
        id: msgIdCounter++, role: "assistant",
        text: "구매 업무 관련 질문을 해 주세요.\n제안요청서(RFP) 작성이 필요하시면 말씀해 주십시오.",
      }]);
    }
  };

  const handleSend = async (directText) => {
    const text = (typeof directText === "string" ? directText : userInput).trim();
    if (!text || isTyping) return;

    const userMsg = { id: msgIdCounter++, role: "user", text };
    setMessages(prev => [...prev, userMsg]);
    setUserInput("");
    setIsTyping(true);

    const history = messages.map(m => ({ role: m.role, content: m.text }));

    try {
      if (phase === "pr_filling") {
        // PR 필드 추출
        const data = await api.chat(sessionId, text, null, history, phase, {}, rfpType, prType, getPrFilledFields(), userRole, roleTurnCount);
        if (data.pr_fields && Object.keys(data.pr_fields).length > 0) {
          applyPrFills(data.pr_fields);
        }
        setMessages(prev => [...prev, {
          id: msgIdCounter++, role: "assistant",
          text: data.answer, sources: data.sources,
          rag_score: data.rag_score, trigger: data.phase_trigger,
        }]);
        if (data.phase_trigger === "pr_complete") {
          setTimeout(() => setPhase("pr_complete"), 800);
          setPrRightVisible(true);
        }
      } else if (phase === "filling") {
        const data = await api.chat(sessionId, text, null, history, phase, getFilledFields(), rfpType);
        if (data.rfp_fields && Object.keys(data.rfp_fields).length > 0) {
          applyFills(data.rfp_fields);
        }
        setMessages(prev => [...prev, {
          id: msgIdCounter++, role: "assistant",
          text: data.answer, sources: data.sources,
          rag_score: data.rag_score, trigger: data.phase_trigger,
        }]);
        if (data.phase_trigger === "complete") {
          setTimeout(() => setPhase("complete"), 800);
        }
      } else {
        const aiMsgId = msgIdCounter++;
        let metaData = {};
        setIsTyping(false);
        setMessages(prev => [...prev, { id: aiMsgId, role: "assistant", text: "", isStreaming: true }]);

        await api.streamChat(
          sessionId, text, null, history, phase, getFilledFields(),
          (token) => {
            setMessages(prev => prev.map(m =>
              m.id === aiMsgId ? { ...m, text: m.text + token } : m
            ));
          },
          (meta) => {
            metaData = meta;
            // 역할 감지 결과 반영
            if (meta.user_role && !userRole) {
              setUserRole(meta.user_role);
            }
            if (meta.ask_role) {
              // 3턴 초과: 역할 선택 카드 표시
              setMessages(prev => prev.map(m =>
                m.id === aiMsgId ? { ...m, roleSelect: true } : m
              ));
            }
            // 분류 결과 저장 (다음 요청의 카테고리 필터용)
            if (meta.classification) {
              setLastClassification(meta.classification);
              if (meta.classification.rfp_type) {
                setRecommendedRfp(meta.classification.rfp_type);
              }
            }
            setMessages(prev => prev.map(m =>
              m.id === aiMsgId ? {
                ...m,
                sources: meta.sources,
                rag_score: meta.rag_score,
                trigger: meta.phase_trigger,
                classification: meta.classification,
              } : m
            ));
          },
          () => {
            setMessages(prev => prev.map(m =>
              m.id === aiMsgId ? { ...m, isStreaming: false } : m
            ));
            if (metaData.phase_trigger === "pr_agreed") {
              setMessages(prev => prev.map(m =>
                m.id === aiMsgId ? { ...m, prTypeSelect: true } : m
              ));
            } else if (metaData.phase_trigger === "rfp_agreed") {
              setMessages(prev => prev.map(m =>
                m.id === aiMsgId ? { ...m, rfpTypeSelect: true } : m
              ));
            } else if (metaData.phase_trigger === "complete") {
              setTimeout(() => setPhase("complete"), 800);
            }
          },
          (items) => {
            if (items && items.length > 0) {
              setMessages(prev => prev.map(m =>
                m.id === aiMsgId ? { ...m, suggestions: items } : m
              ));
            }
          },
          rfpType,
          userRole,
          roleTurnCount,
          prType,
        );
      }
    } catch {
      setMessages(prev => [...prev, {
        id: msgIdCounter++, role: "assistant",
        text: "죄송합니다. 서버 연결에 실패했습니다. 잠시 후 다시 시도해 주세요.",
      }]);
    } finally {
      setIsTyping(false);
      if (!userRole) setRoleTurnCount(prev => prev + 1);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSend();
    }
  };

  // ─── Status Dot with pulse ───
  const StatusDot = () => (
    <span style={{ position:"relative", width:8, height:8, display:"inline-flex", alignItems:"center", justifyContent:"center" }}>
      <span style={{
        position:"absolute", width:8, height:8, borderRadius:"50%",
        background: T.green,
        animation: "status-pulse 2s ease-in-out infinite",
      }} />
      <span style={{
        position:"relative", width:8, height:8, borderRadius:"50%",
        background: T.green,
      }} />
    </span>
  );

  // ─── Badge Chip ───
  const Chip = ({ children, color, bg, border }) => (
    <span style={{
      fontSize: 10, padding: "2px 8px", borderRadius: 6, fontWeight: 600,
      background: bg || T.greenLight,
      color: color || T.greenDark,
      border: `1px solid ${border || T.greenMid}`,
      lineHeight: "16px",
    }}>{children}</span>
  );

  // ═══ RFP 유형 선택 카드 (9종, 3×3 그리드) ═══
  const renderRfpTypeSelector = () => (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginTop:12, position:"relative", zIndex:2 }}>
      {Object.entries(RFP_TEMPLATES).map(([key, tmpl]) => {
        const iconCfg = RFP_TYPE_ICONS[key];
        if (!iconCfg) return null;
        const isRecommended = recommendedRfp === key;
        return (
          <button
            key={key}
            onPointerDown={(e) => { e.stopPropagation(); handleRfpTypeSelect(key); }}
            onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
            style={{
              display:"flex", flexDirection:"column", alignItems:"center", gap:6,
              padding:"14px 8px 12px", borderRadius: T.r12,
              border: isRecommended ? `2px solid ${iconCfg.color}` : `1.5px solid ${T.border}`,
              background: isRecommended ? iconCfg.bg : T.card,
              cursor:"pointer", textAlign:"center", fontFamily:"inherit",
              transition:"border-color 0.15s, background 0.15s, box-shadow 0.15s",
              boxShadow: isRecommended ? `0 0 0 3px ${iconCfg.bg}` : T.shadowXs,
              position:"relative", zIndex:3,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = iconCfg.color;
              e.currentTarget.style.background = iconCfg.bg;
              e.currentTarget.style.boxShadow = T.shadowMd;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = isRecommended ? iconCfg.color : T.border;
              e.currentTarget.style.background = isRecommended ? iconCfg.bg : T.card;
              e.currentTarget.style.boxShadow = isRecommended ? `0 0 0 3px ${iconCfg.bg}` : T.shadowXs;
            }}
          >
            {isRecommended && (
              <span style={{
                position:"absolute", top:-8, right:-4,
                fontSize:9, padding:"2px 8px", borderRadius:10,
                background: iconCfg.color, color:"#fff", fontWeight:700,
                boxShadow: T.shadowSm,
              }}>추천</span>
            )}
            <span style={{
              width: 36, height: 36, borderRadius: T.r10,
              background: isRecommended ? T.card : iconCfg.bg,
              display:"flex", alignItems:"center", justifyContent:"center",
              flexShrink: 0,
            }}>{iconCfg.icon(iconCfg.color)}</span>
            <div style={{ fontSize:11, fontWeight:700, color: T.text, lineHeight:1.3 }}>{tmpl.label}</div>
            <div style={{ fontSize:9, color: T.sub, lineHeight:1.3 }}>{tmpl.desc}</div>
          </button>
        );
      })}
    </div>
  );

  // ═══ PR 카테고리 선택 카드 (대분류별 그룹) ═══
  const PR_CATEGORY_ICONS = {
    "건물 관리": { emoji: "🏢", color: "#0EA5A0", bg: "#F0FAFA" },
    "마케팅": { emoji: "📢", color: "#FB923C", bg: "#FFF7ED" },
    "교육 서비스": { emoji: "📚", color: "#818CF8", bg: "#EEF2FF" },
    "시장정보": { emoji: "📊", color: "#F472B6", bg: "#FDF2F8" },
  };

  const renderPrTypeSelector = () => (
    <div style={{ marginTop:12, position:"relative", zIndex:2 }}>
      {Object.entries(PR_CATEGORIES).map(([category, keys]) => {
        const catCfg = PR_CATEGORY_ICONS[category] || { emoji: "📦", color: T.primary, bg: T.primaryLight };
        return (
          <div key={category} style={{ marginBottom:12 }}>
            <div style={{ fontSize:11, fontWeight:700, color: catCfg.color, marginBottom:6, display:"flex", alignItems:"center", gap:4 }}>
              <span>{catCfg.emoji}</span> {category}
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6 }}>
              {keys.map(key => {
                const tmpl = getPrTemplate(key);
                if (!tmpl) return null;
                return (
                  <button
                    key={key}
                    onPointerDown={(e) => { e.stopPropagation(); handlePrTypeSelect(key); }}
                    onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
                    style={{
                      padding:"10px 8px", borderRadius: T.r10,
                      border:`1.5px solid ${T.border}`, background: T.card,
                      cursor:"pointer", fontFamily:"inherit", textAlign:"center",
                      transition:"all 0.15s", fontSize:11, fontWeight:600, color: T.text,
                      position:"relative", zIndex:3,
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = catCfg.color;
                      e.currentTarget.style.background = catCfg.bg;
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = T.border;
                      e.currentTarget.style.background = T.card;
                    }}
                  >
                    {tmpl.label || tmpl.name}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );

  // ══ 오른쪽 패널: 채워지는 RFP ══
  const PanelFilling = () => (
    <div className="custom-scroll" style={{ flex:1, overflowY:"auto", padding:"20px 22px" }}>
      {/* 진행률 카드 */}
      <div style={{
        background: `linear-gradient(135deg, rgba(14,165,160,0.06) 0%, rgba(6,182,212,0.04) 100%)`,
        borderRadius: T.r16, padding:"16px 20px", marginBottom:16,
        border: `1px solid rgba(14,165,160,0.12)`,
        boxShadow: '0 2px 8px rgba(14,165,160,0.06)',
      }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
          <span style={{ fontSize:12, fontWeight:700, color: T.text }}>RFP 완성도</span>
          <span style={{
            fontSize:11, fontWeight:700, padding:"4px 12px", borderRadius:20,
            background: pct >= 80 ? T.greenLight : 'rgba(255,255,255,0.8)',
            color: pct >= 80 ? T.greenDark : T.primary,
            border: `1px solid ${pct >= 80 ? T.greenMid : 'rgba(14,165,160,0.15)'}`,
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          }}>{filled} / {total} · {pct}%</span>
        </div>
        <div style={{ height:8, background:"rgba(255,255,255,0.7)", borderRadius:4, overflow:"hidden" }}>
          <div style={{
            height:"100%", width:`${pct}%`, borderRadius:4,
            background: `linear-gradient(90deg, ${T.primary}, ${T.teal})`,
            backgroundSize: "200% 100%",
            animation: pct > 0 && pct < 100 ? "shimmer 2s linear infinite" : "none",
            transition:"width 0.6s ease",
          }} />
        </div>
        {pct < 100 && <div style={{ marginTop:10, fontSize:11, color: T.red, display:"flex", alignItems:"center", gap:4 }}>
          <IconAlert size={13} /> 미완료 항목이 있습니다. 직접 입력하거나 채팅으로 입력해 주세요.
        </div>}
      </div>

      {/* 섹션 아코디언 */}
      {currentSections.map((sec, si) => {
        const sectionDone = sec.fields.every(f => fields[f]?.value);
        return (
          <div key={si} style={{ marginBottom:10 }}>
            <div
              onClick={() => setOpenSec(p => ({...p,[si]:!p[si]}))}
              style={{
                background: 'rgba(255,255,255,0.7)', padding:"12px 16px",
                border: `1px solid rgba(14,165,160,0.08)`,
                borderRadius: openSec[si] ? `${T.r12}px ${T.r12}px 0 0` : T.r12,
                display:"flex", alignItems:"center", gap:10, cursor:"pointer",
                transition:"all 0.2s ease",
                backdropFilter: "blur(6px)",
                WebkitBackdropFilter: "blur(6px)",
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(14,165,160,0.04)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.7)'}
            >
              <span style={{
                width:24, height:24, borderRadius:"50%",
                display:"flex", alignItems:"center", justifyContent:"center",
                flexShrink:0,
                background: sectionDone ? T.greenLight : T.redLight,
                color: sectionDone ? T.greenDark : T.red,
              }}>{sectionDone ? <IconCheck size={12} /> : <IconAlert size={12} />}</span>
              <span style={{ fontSize:12, fontWeight:700, flex:1, color: T.text }}>
                {SECTION_ICONS[sec.icon]} {sec.title}
              </span>
              {sectionDone
                ? <Chip>완료</Chip>
                : <Chip color={T.red} bg={T.redLight} border={T.redMid}>미완료</Chip>
              }
              <span style={{ color: T.muted }}>
                <IconChevron open={openSec[si]} />
              </span>
            </div>
            {openSec[si] && (
              <div style={{
                background: 'rgba(255,255,255,0.65)', border:`1px solid rgba(14,165,160,0.08)`, borderTop:"none",
                borderRadius:`0 0 ${T.r12}px ${T.r12}px`, overflow:"hidden",
              }}>
                {sec.fields.map((fk, fi) => {
                  const f = fields[fk];
                  if (!f) return null;
                  const isNew = justFilled.has(fk);
                  return (
                    <div key={fk} ref={el => fieldRefs.current[fk] = el} style={{
                      display:"flex", alignItems:"flex-start",
                      borderBottom: fi < sec.fields.length-1 ? `1px solid ${T.borderLight}` : "none",
                      animation: isNew ? "field-highlight 2.5s ease forwards" : "none",
                      background: fi % 2 === 1 ? "rgba(14,165,160,0.02)" : "transparent",
                    }}>
                      <div style={{
                        width:136, padding:"10px 14px", flexShrink:0,
                        background:"rgba(14,165,160,0.03)", borderRight:`1px solid rgba(14,165,160,0.06)`,
                        fontSize:11, fontWeight:700, color: T.sub,
                        display:"flex", alignItems:"center", minHeight:40,
                      }}>{f.label}</div>
                      <div style={{
                        flex:1, padding:"4px 8px", fontSize:12,
                        lineHeight:1.7, minHeight:40, display:"flex", alignItems:"center", gap:4,
                      }}>
                        <input
                          type="text"
                          value={f.value || ""}
                          placeholder="직접 입력 또는 채팅으로 입력"
                          onChange={(e) => handleFieldEdit(fk, e.target.value)}
                          style={{
                            width:"100%", border:"none", outline:"none",
                            background:"transparent", fontSize:12, color: T.text,
                            padding:"6px 8px", borderRadius:4, fontFamily:"inherit",
                            transition:"background 0.2s",
                          }}
                          onFocus={(e) => { e.target.style.background = "rgba(14,165,160,0.06)"; }}
                          onBlur={(e) => { e.target.style.background = "transparent"; }}
                        />
                        {isNew && <span style={{
                          fontSize:9, padding:"2px 6px", flexShrink:0,
                          background: T.tealLight, border:`1px solid ${T.tealMid}`,
                          borderRadius:4, color: T.tealDark, fontWeight:700,
                        }}>NEW</span>}
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
      <div style={{ display:"flex", gap:8, marginTop:12 }}>
        <button onClick={() => {
          const tmpl = RFP_TEMPLATES[rfpType];
          if (tmpl) downloadRfpPdf(fields, tmpl.sections, tmpl.label, fields.s1?.value);
        }} style={{
          flex:1, padding:"12px", borderRadius: T.r10,
          border:`1px solid ${T.border}`, background: T.card,
          color: T.sub, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit",
          display:"flex", alignItems:"center", justifyContent:"center", gap:6,
          transition:"all 0.2s",
        }}
          onMouseEnter={e => { e.currentTarget.style.background = T.bgSubtle; e.currentTarget.style.borderColor = T.primary; }}
          onMouseLeave={e => { e.currentTarget.style.background = T.card; e.currentTarget.style.borderColor = T.border; }}
        >
          <IconDownload size={14} /> 초안 다운로드
        </button>
        <button
          disabled={pct < 100}
          onClick={() => { if (pct >= 100) { setPhase("complete"); } }}
          style={{
            flex:1, padding:"12px", borderRadius: T.r10,
            border:"none",
            background: pct >= 100 ? T.gradPrimary : T.borderLight,
            color: pct >= 100 ? "#fff" : T.muted,
            fontSize:12, fontWeight:700, fontFamily:"inherit",
            cursor: pct >= 100 ? "pointer" : "not-allowed",
            display:"flex", alignItems:"center", justifyContent:"center", gap:5,
            transition:"all 0.3s",
            boxShadow: pct >= 100 ? T.shadowBlue : "none",
          }}
        ><IconSendMail size={13} /> {pct >= 100 ? "RFP 완료 / 발송" : "RFP 발송"}</button>
      </div>
    </div>
  );

  // ══ 오른쪽 패널: 완성된 RFP ══
  const PanelComplete = () => (
    <div className="custom-scroll" style={{ flex:1, overflowY:"auto", padding:"20px 22px" }}>
      {/* 성공 배너 */}
      <div style={{
        background: `linear-gradient(135deg, rgba(16,185,129,0.08), rgba(14,165,160,0.06))`,
        borderRadius: T.r16, padding:"18px 22px", marginBottom:18,
        border:`1.5px solid rgba(16,185,129,0.15)`,
        display:"flex", alignItems:"center", gap:14,
      }}>
        <IconParty size={32} />
        <div>
          <div style={{ fontSize:14, fontWeight:800, color: T.greenDark }}>RFP 작성 완료!</div>
          <div style={{ fontSize:11, color:"#16a34a", marginTop:3 }}>미리보기로 확인 후 다운로드하세요.</div>
        </div>
        <button
          onClick={() => {
            const baseUrl = import.meta.env.VITE_API_URL || "https://ip-assist-backend-1058034030780.asia-northeast3.run.app";
            if (rfpRequestId) {
              window.open(`${baseUrl}/rfp/view/${rfpRequestId}`, "_blank");
            } else {
              const tmpl = RFP_TEMPLATES[rfpType];
              if (tmpl) downloadRfpPdf(fields, tmpl.sections, tmpl.label, fields.s1?.value);
            }
          }}
          style={{
            marginLeft:"auto", padding:"10px 22px", borderRadius: T.r10,
            border:`1.5px solid ${T.primary}`,
            background: "rgba(14,165,160,0.06)",
            color: T.primary, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit",
            whiteSpace:"nowrap", transition:"all 0.2s",
            display:"flex", alignItems:"center", gap:6,
          }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(14,165,160,0.12)"}
          onMouseLeave={e => e.currentTarget.style.background = "rgba(14,165,160,0.06)"}
        >
          <IconPreview size={14} /> 미리보기
        </button>
      </div>

      {/* RFP 문서 헤더 */}
      <div style={{
        background: 'rgba(255,255,255,0.8)', borderRadius: T.r16, padding:"22px 28px", textAlign:"center",
        marginBottom:16, border:`1.5px solid rgba(14,165,160,0.15)`,
        boxShadow:'0 2px 12px rgba(14,165,160,0.06)',
        position:"relative", overflow:"hidden",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}>
        <div style={{
          position:"absolute", top:0, left:0, right:0, height:3,
          background: T.gradTeal,
        }} />
        <div style={{ fontSize:10, letterSpacing:3, color: T.sub, marginBottom:8 }}>대한민국 정부 표준 구매 양식</div>
        <div style={{ fontSize:20, fontWeight:900, letterSpacing:4, color: T.navy }}>제 안 요 청 서</div>
        {currentTemplate && (
          <div style={{ marginTop:12, display:"flex", justifyContent:"center", gap:8 }}>
            <span style={{
              fontSize:12, fontWeight:700, padding:"4px 14px",
              background: T.primaryLight, color: T.primary,
              borderRadius:8, border:`1px solid ${T.primaryMid}`,
              display:"flex", alignItems:"center", gap:5,
            }}>{RFP_TYPE_ICONS[rfpType]?.icon(T.primary)} {currentTemplate.label}</span>
            {fields.s6?.value && <span style={{
              fontSize:12, fontWeight:700, padding:"4px 14px",
              background: T.primaryLight, color: T.primary,
              borderRadius:8, border:`1px solid ${T.primaryMid}`,
            }}>{fields.s6.value}</span>}
          </div>
        )}
      </div>

      {/* 섹션 내용 */}
      {currentSections.map((sec, si) => (
        <div key={si} style={{ marginBottom:12 }}>
          <div style={{
            background: 'rgba(14,165,160,0.04)', padding:"10px 16px",
            display:"flex", alignItems:"center", gap:8,
            borderRadius:`${T.r10}px ${T.r10}px 0 0`,
            border:`1px solid rgba(14,165,160,0.08)`,
          }}>
            <span>{SECTION_ICONS[sec.icon]}</span>
            <span style={{ fontSize:12, fontWeight:700, color: T.navy }}>{sec.title}</span>
            <Chip>완료 ✓</Chip>
          </div>
          <div style={{
            background: 'rgba(255,255,255,0.7)', border:`1px solid rgba(14,165,160,0.08)`, borderTop:"none",
            borderRadius:`0 0 ${T.r10}px ${T.r10}px`, overflow:"hidden",
          }}>
            {sec.fields.map((fk, fi) => {
              const f = fields[fk];
              if (!f) return null;
              return (
                <div key={fk} style={{
                  display:"flex", alignItems:"flex-start",
                  borderBottom: fi < sec.fields.length-1 ? `1px solid ${T.borderLight}` : "none",
                }}>
                  <div style={{
                    width:136, padding:"10px 14px",
                    background:"rgba(14,165,160,0.03)", borderRight:`1px solid rgba(14,165,160,0.06)`,
                    fontSize:11, fontWeight:700, color: T.sub, flexShrink:0,
                    display:"flex", alignItems:"center",
                  }}>{f.label}</div>
                  <div style={{ flex:1, padding:"10px 14px", fontSize:12, color: T.text, lineHeight:1.7 }}>{f.value}</div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* 서명 영역 */}
      <div style={{ background: 'rgba(255,255,255,0.7)', borderRadius: T.r12, padding:"22px 26px", border:`1px solid rgba(14,165,160,0.08)` }}>
        <div style={{ display:"flex", justifyContent:"space-around" }}>
          {[
            { label:"작성일", value: new Date().toLocaleDateString("ko-KR") },
            { label:"담당자 (서명)", value: fields.s3?.value || "" },
            { label:"발주기관", value: fields.s1?.value || "" },
          ].map(item => (
            <div key={item.label} style={{ textAlign:"center" }}>
              <div style={{ fontSize:10, color: T.sub, marginBottom:10 }}>{item.label}</div>
              <div style={{
                width:120, borderBottom:`1.5px solid ${T.border}`, paddingBottom:6,
                fontSize:12, color: T.text,
              }}>{item.value}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop:16, textAlign:"center" }}>
          <span style={{
            fontSize:10, color: T.muted, padding:"5px 14px",
            background: T.bg, borderRadius:20, border:`1px solid ${T.border}`,
          }}>RAG 기반 생성 · 구매전략·표준프로세스 문서 근거</span>
        </div>
      </div>

      {/* 사용자 선택 공급업체 (PDF 업로드 시) */}
      {uploadedPrSuppliers.length > 0 && (
        <div style={{
          background: `linear-gradient(135deg, rgba(14,165,160,0.06), rgba(6,182,212,0.04))`,
          borderRadius: T.r16, padding:"18px 22px", marginTop:16,
          border:`1.5px solid rgba(14,165,160,0.15)`,
        }}>
          <div style={{ fontSize:13, fontWeight:800, color: T.primary, marginBottom:6, display:"flex", alignItems:"center", gap:6 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            요청자 선택 공급업체
          </div>
          <div style={{ fontSize:11, color: T.sub, marginBottom:12 }}>구매요청서에서 요청자가 선택한 공급업체입니다.</div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {uploadedPrSuppliers.map((name, i) => (
              <div key={i} style={{
                display:"flex", alignItems:"center", gap:8,
                padding:"10px 16px", borderRadius: T.r12,
                background:"rgba(255,255,255,0.8)", border:`1px solid rgba(14,165,160,0.15)`,
              }}>
                <div style={{
                  width:28, height:28, borderRadius:7,
                  background: T.gradPrimary,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  color:"#fff", fontSize:12, fontWeight:800,
                }}>{i + 1}</div>
                <span style={{ fontSize:13, fontWeight:700, color: T.text }}>{name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 발송 버튼 */}
      <div style={{ marginTop:16, display:"flex", gap:8 }}>
        <button onClick={() => {
          const baseUrl = import.meta.env.VITE_API_URL || "https://ip-assist-backend-1058034030780.asia-northeast3.run.app";
          if (rfpRequestId) {
            window.open(`${baseUrl}/rfp/view/${rfpRequestId}`, "_blank");
          } else {
            const tmpl = RFP_TEMPLATES[rfpType];
            if (tmpl) downloadRfpPdf(fields, tmpl.sections, tmpl.label, fields.s1?.value);
          }
        }} style={{
          flex:1, padding:"14px", borderRadius: T.r10,
          border:`1px solid ${T.primary}`, background: "rgba(14,165,160,0.04)",
          color: T.primary, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit",
          display:"flex", alignItems:"center", justifyContent:"center", gap:6,
          transition:"all 0.2s",
        }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(14,165,160,0.1)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(14,165,160,0.04)"; }}
        >
          <IconPreview size={14} /> 미리보기
        </button>
        <button onClick={() => {
          if (rfpRequestId) {
            const baseUrl = import.meta.env.VITE_API_URL || "https://ip-assist-backend-1058034030780.asia-northeast3.run.app";
            window.open(`${baseUrl}/rfp/view/${rfpRequestId}`, "_blank");
          } else {
            const tmpl = RFP_TEMPLATES[rfpType];
            if (tmpl) downloadRfpPdf(fields, tmpl.sections, tmpl.label, fields.s1?.value);
          }
          setDownloaded(true);
        }} style={{
          flex:1, padding:"14px", borderRadius: T.r10,
          border:`1px solid ${T.border}`, background: T.card,
          color: T.sub, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit",
          display:"flex", alignItems:"center", justifyContent:"center", gap:6,
          transition:"all 0.2s",
        }}
          onMouseEnter={e => { e.currentTarget.style.background = T.bgSubtle; e.currentTarget.style.borderColor = T.primary; }}
          onMouseLeave={e => { e.currentTarget.style.background = T.card; e.currentTarget.style.borderColor = T.border; }}
        >
          <IconDownload size={14} /> PDF 다운로드
        </button>
        <button onClick={() => {
          if (!rfpRequestId) {
            alert("RFP 저장 중입니다. 잠시 후 다시 시도해주세요.");
            return;
          }
          setEmailTo(fields?.s5?.value || "");
          setShowEmailModal(true);
        }} style={{
          flex:1, padding:"14px", borderRadius: T.r10,
          border:"none",
          background: emailSent ? T.greenDark : T.gradPrimary,
          color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit",
          display:"flex", alignItems:"center", justifyContent:"center", gap:6,
          transition:"all 0.3s",
          boxShadow: emailSent ? "none" : T.shadowBlue,
        }}
          onMouseEnter={e => { if(!emailSent) e.currentTarget.style.transform = "scale(1.02)"; }}
          onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
        >
          {emailSent ? <><IconCheck /> 발송 완료</> : <><IconSendMail size={13} /> RFP 발송</>}
        </button>
      </div>

      {/* RFP 신청 내역 */}
      {rfpHistory.length > 0 && (
        <div style={{ marginTop:16, background:T.bg, borderRadius:12, padding:16, border:`1px solid ${T.border}` }}>
          <div style={{ fontSize:13, fontWeight:600, color:T.text, marginBottom:10, display:"flex", alignItems:"center", gap:6 }}>
            <IconDoc size={13} /> 신청 내역
          </div>
          {rfpHistory.map(req => (
            <div key={req.id} style={{
              display:"flex", justifyContent:"space-between", alignItems:"center",
              padding:"8px 0", borderBottom:`1px solid ${T.border}`,
              fontSize:12,
            }}>
              <div>
                <span style={{ fontWeight:600, color:T.text }}>{req.title || req.org_name || "RFP"}</span>
                <span style={{ color:T.sub, marginLeft:8 }}>
                  {new Date(req.created_at).toLocaleDateString("ko-KR")}
                </span>
              </div>
              <span style={{
                fontSize:11, fontWeight:600, padding:"2px 8px", borderRadius:6,
                background: req.status === "sent" ? "#ECFDF5" : req.status === "submitted" ? "#EFF6FF" : "#F1F5F9",
                color: req.status === "sent" ? "#059669" : req.status === "submitted" ? "#2563EB" : "#64748B",
              }}>
                {req.status === "sent" ? "발송완료" : req.status === "submitted" ? "신청" : req.status === "reviewing" ? "검토중" : req.status === "approved" ? "승인" : req.status === "rejected" ? "반려" : req.status}
              </span>
            </div>
          ))}
        </div>
      )}

      <div style={{ height:20 }} />
    </div>
  );

  // ══ 오른쪽 패널: 추천 업체 (DB + 업무마켓9 통합) ══
  const [dbSuppliers, setDbSuppliers] = useState([]);

  // RFP 유형 → DB 카테고리 매핑
  const RFP_TO_DB_CATEGORY = {
    purchase: "일반 구매",
    service_contract: "일반 용역",
    service: "서비스",
    rental: "렌탈·리스",
    construction: "공사",
    consulting: "컨설팅",
    purchase_maintenance: "구매+유지보수",
    rental_maintenance: "렌탈+유지보수",
    purchase_lease: "구매·리스",
  };

  // RFP 완료 시 키워드 기반 공급업체 검색
  useEffect(() => {
    if (phase === "complete" && emailSent && rfpType) {
      const dbCat = RFP_TO_DB_CATEGORY[rfpType];
      if (dbCat) {
        // fields에서 서비스명/품목명/사업명 등 키워드 추출
        const keywordFields = ["s6", "s7", "s10", "s11"];
        const keywords = keywordFields
          .map(k => (fields[k]?.value || "").trim())
          .filter(Boolean)
          .join(",");

        api.searchSuppliers(dbCat, keywords).then(res => {
          setDbSuppliers(res.suppliers || []);
        }).catch(() => {
          // 폴백: 키워드 없이 카테고리만
          api.getSuppliers(dbCat).then(res => {
            setDbSuppliers(res.suppliers || []);
          }).catch(() => setDbSuppliers([]));
        });
      }
    }
  }, [phase, emailSent, rfpType]);

  const getMatchedSuppliers = () => {
    return dbSuppliers
      .map(s => ({
        name: s.name,
        categories: [s.category],
        tags: s.tags || [],
        satisfaction: (s.score || 0) / 20,
        total_reviews: 0,
        matchRate: s.match_rate || 80,
      }))
      .sort((a, b) => b.matchRate - a.matchRate)
      .slice(0, 8);
  };

  const PanelSuppliers = () => {
    const suppliers = getMatchedSuppliers();
    return (
    <div className="custom-scroll" style={{ flex:1, overflowY:"auto", padding:"20px 22px" }}>
      {/* 헤더 */}
      <div style={{
        background: `linear-gradient(135deg, rgba(14,165,160,0.08), rgba(6,182,212,0.06))`,
        borderRadius: T.r16, padding:"18px 22px", marginBottom:18,
        border:`1.5px solid rgba(14,165,160,0.12)`,
      }}>
        <div style={{ fontSize:14, fontWeight:800, color: T.primary }}>추천 공급업체</div>
        <div style={{ fontSize:11, color: T.sub, marginTop:4 }}>RFP 요건 기반 공급업체 매칭 결과입니다.</div>
      </div>

      {/* 업체 카드 */}
      {suppliers.map((s, i) => {
        const satScore = Math.round((s.satisfaction || 0) * 20);
        const statusLabel = i < 3 ? "추천" : "검토";
        return (
        <div key={s.name + i} style={{
          background: 'rgba(255,255,255,0.75)',
          backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
          borderRadius: T.r12, padding:"16px 20px", marginBottom:10,
          border:`1px solid rgba(14,165,160,0.08)`,
          transition:"all 0.2s",
          cursor:"pointer",
        }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = T.primary; e.currentTarget.style.boxShadow = "0 4px 16px rgba(14,165,160,0.12)"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(14,165,160,0.08)"; e.currentTarget.style.boxShadow = "none"; }}
        >
          {/* 상단: 업체명 + 매칭률 */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{
                width:36, height:36, borderRadius:10,
                background: i < 3 ? T.gradPrimary : `linear-gradient(135deg, ${T.bgSubtle}, ${T.bg})`,
                display:"flex", alignItems:"center", justifyContent:"center",
                color: i < 3 ? "#fff" : T.sub, fontSize:14, fontWeight:800,
              }}>{i + 1}</div>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color: T.text }}>{s.name}</div>
                <div style={{ fontSize:10, color: T.muted }}>{s.categories.join(", ")}</div>
              </div>
            </div>
            <div style={{ display:"flex", gap:4, alignItems:"center" }}>
              <span style={{
                fontSize:9, fontWeight:600, padding:"2px 6px", borderRadius:8,
                background: "rgba(14,165,160,0.08)",
                color: T.primary,
                border: "1px solid rgba(14,165,160,0.15)",
              }}>업무마켓9</span>
              <span style={{
                fontSize:11, fontWeight:700, padding:"4px 10px", borderRadius:20,
                background: statusLabel === "추천" ? "rgba(16,185,129,0.1)" : "rgba(251,191,36,0.1)",
                color: statusLabel === "추천" ? "#059669" : "#d97706",
              }}>{statusLabel}</span>
            </div>
          </div>

          {/* 매칭률 + 만족도 바 */}
          <div style={{ display:"flex", gap:16, marginBottom:8 }}>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:9, color: T.muted, marginBottom:3 }}>매칭률</div>
              <div style={{ height:6, borderRadius:3, background: T.bgSubtle, overflow:"hidden" }}>
                <div style={{ width:`${s.matchRate}%`, height:"100%", borderRadius:3, background: T.gradPrimary, transition:"width 1s ease" }} />
              </div>
              <div style={{ fontSize:10, fontWeight:700, color: T.primary, marginTop:2 }}>{s.matchRate}%</div>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:9, color: T.muted, marginBottom:3 }}>만족도</div>
              <div style={{ height:6, borderRadius:3, background: T.bgSubtle, overflow:"hidden" }}>
                <div style={{ width:`${satScore}%`, height:"100%", borderRadius:3, background: "linear-gradient(90deg, #f59e0b, #eab308)", transition:"width 1s ease" }} />
              </div>
              <div style={{ fontSize:10, fontWeight:700, color: "#d97706", marginTop:2 }}>{s.satisfaction}점 ({s.total_reviews}건)</div>
            </div>
          </div>

          {/* 태그 */}
          <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
            {(s.tags || []).slice(0, 3).map(tag => (
              <span key={tag} style={{
                fontSize:9, padding:"2px 8px", borderRadius:10,
                background: T.bgSubtle, color: T.sub, border:`1px solid ${T.border}`,
                maxWidth: 140, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
              }}>{tag}</span>
            ))}
            {(s.tags || []).length > 3 && (
              <span style={{ fontSize:9, padding:"2px 8px", borderRadius:10, color: T.muted }}>
                +{(s.tags || []).length - 3}개
              </span>
            )}
          </div>
        </div>
        );
      })}

      {/* 안내 */}
      <div style={{
        textAlign:"center", padding:"16px", marginTop:8,
        fontSize:10, color: T.muted,
        background: T.bgSubtle, borderRadius: T.r10,
      }}>
        업무마켓9(workmarket9.com) 등록 업체 기준 · 매칭률은 카테고리 유사도 + 리뷰 기반
      </div>
    </div>
    );
  };

  // ══ 이메일 발송 모달 ══
  const EmailModal = () => {
    if (!showEmailModal) return null;
    return (
      <div style={{
        position:"fixed", inset:0, zIndex:9999,
        display:"flex", alignItems:"center", justifyContent:"center",
        background:"rgba(0,0,0,0.4)", backdropFilter:"blur(4px)",
      }} onClick={() => !emailSending && setShowEmailModal(false)}>
        <div style={{
          background:"#fff", borderRadius:20, width:440, padding:0,
          boxShadow:"0 20px 60px rgba(0,0,0,0.15)",
          overflow:"hidden",
        }} onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div style={{
            padding:"24px 28px 16px",
            borderBottom:"1px solid #F0F2F5",
          }}>
            <div style={{ fontSize:18, fontWeight:700, color:"#1E293B" }}>
              RFP 이메일 발송
            </div>
            <div style={{ fontSize:13, color:"#94A3B8", marginTop:4 }}>
              제안요청서를 이메일로 발송합니다
            </div>
          </div>

          {/* Body */}
          <div style={{ padding:"20px 28px" }}>
            {/* RFP Summary */}
            <div style={{
              background:"#F8FFFE", borderRadius:12, padding:16, marginBottom:20,
              border:"1px solid #E0F7F6",
            }}>
              <div style={{ fontSize:12, color:"#0D9488", fontWeight:600, marginBottom:8 }}>발송 문서</div>
              <div style={{ fontSize:14, fontWeight:600, color:"#1E293B" }}>
                {fields.s6?.value || fields.s1?.value || "제안요청서"}
              </div>
              <div style={{ fontSize:12, color:"#64748B", marginTop:4 }}>
                {currentTemplate?.label} · {fields.s1?.value || ""}
              </div>
            </div>

            {/* Email Input */}
            <div style={{ marginBottom:8 }}>
              <label style={{ fontSize:13, fontWeight:600, color:"#374151", display:"block", marginBottom:8 }}>
                수신자 이메일
              </label>
              <input
                type="email"
                value={emailTo}
                onChange={e => setEmailTo(e.target.value)}
                placeholder="example@company.com"
                style={{
                  width:"100%", padding:"12px 16px", borderRadius:12,
                  border:"1px solid #E2E8F0", fontSize:14, outline:"none",
                  fontFamily:"inherit", boxSizing:"border-box",
                  transition:"border-color 0.15s",
                }}
                onFocus={e => e.target.style.borderColor = "#0D9488"}
                onBlur={e => e.target.style.borderColor = "#E2E8F0"}
                disabled={emailSending}
                autoFocus
              />
            </div>
            <div style={{ fontSize:11, color:"#94A3B8", marginBottom:20 }}>
              수신자에게 RFP 요약 정보와 상세 보기 링크가 포함된 이메일이 발송됩니다
            </div>
          </div>

          {/* Footer */}
          <div style={{
            padding:"16px 28px", borderTop:"1px solid #F0F2F5",
            display:"flex", gap:10, justifyContent:"flex-end",
          }}>
            <button
              onClick={() => { setShowEmailModal(false); setEmailTo(""); }}
              disabled={emailSending}
              style={{
                padding:"10px 20px", borderRadius:10, border:"1px solid #E2E8F0",
                background:"#fff", fontSize:13, fontWeight:600, color:"#64748B",
                cursor:"pointer", fontFamily:"inherit",
              }}
            >
              취소
            </button>
            <button
              onClick={async () => {
                if (!emailTo || !emailTo.includes("@")) {
                  alert("올바른 이메일 주소를 입력해주세요.");
                  return;
                }
                setEmailSending(true);
                try {
                  const res = await api.sendRfpEmail(rfpRequestId, emailTo);
                  if (res.status === "sent") {
                    setEmailSent(true);
                    setSent(true);
                    setShowEmailModal(false);
                    setEmailTo("");
                  } else {
                    alert("발송 실패: " + (res.detail || "알 수 없는 오류"));
                  }
                } catch (err) {
                  alert("발송 중 오류가 발생했습니다.");
                }
                setEmailSending(false);
              }}
              disabled={emailSending || !emailTo}
              style={{
                padding:"10px 24px", borderRadius:10, border:"none",
                background: emailSending ? "#94A3B8" : "#0D9488",
                fontSize:13, fontWeight:700, color:"#fff",
                cursor: emailSending ? "wait" : "pointer", fontFamily:"inherit",
                display:"flex", alignItems:"center", gap:6,
                transition:"all 0.2s",
              }}
            >
              {emailSending ? (
                <>
                  <span style={{
                    width:14, height:14, border:"2px solid rgba(255,255,255,0.3)",
                    borderTopColor:"#fff", borderRadius:"50%",
                    animation:"spin 0.8s linear infinite", display:"inline-block",
                  }} />
                  발송 중...
                </>
              ) : (
                <>발송</>
              )}
            </button>
          </div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  };

  // ══════════════════════════════════════════════
  // 메인 렌더
  // ══════════════════════════════════════════════
  return (
    <div style={{
      display:"flex", height:"100vh",
      background: "transparent",
      fontFamily: T.font,
      color: T.text, overflow:"hidden",
      alignItems:"center", justifyContent:"center",
      gap: rightVisible ? 20 : 0,
      padding:"0 24px",
      position:"relative",
    }}>
      {/* 외부 배경 없음 — 업무마켓9에 임베드 */}

      {/* ════ LEFT: 채팅 패널 (글래스모피즘) ════ */}
      <div style={{
        width: 520, minWidth: 360, maxWidth: 520,
        height: "85vh",
        display:"flex", flexDirection:"column",
        background: 'rgba(255,255,255,0.72)',
        backdropFilter: "blur(30px) saturate(1.4)",
        WebkitBackdropFilter: "blur(30px) saturate(1.4)",
        borderRadius: T.r24,
        border: `1px solid rgba(14,165,160,0.12)`,
        boxShadow: '0 4px 24px rgba(14,165,160,0.08), 0 1px 3px rgba(0,0,0,0.06)',
        transition:"all 0.4s ease",
        flexShrink:0,
        position:"relative",
        zIndex:1,
        overflow:"hidden",
      }}>
        {/* ── 채팅 헤더 (글래스모피즘) ── */}
        <div style={{
          padding:"14px 20px",
          borderBottom:`1px solid rgba(14,165,160,0.08)`,
          display:"flex", alignItems:"center", gap:12,
          background: "rgba(255,255,255,0.75)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
        }}>
          {/* 봇 아바타 */}
          <div style={{
            width:44, height:44, borderRadius: T.r14, flexShrink:0,
            background: T.gradPrimary,
            display:"flex", alignItems:"center", justifyContent:"center",
            color: "#fff",
            boxShadow: '0 4px 12px rgba(14,165,160,0.2)',
          }}>
            <IconBot size={22} />
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:15, fontWeight:800, letterSpacing:"-0.3px", color: T.text }}>
              업무마켓9 도우미
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:3 }}>
              <StatusDot />
              <span style={{ fontSize:11, color: T.sub }}>
                {phase === "chat" ? "상담 대기중" : phase === "filling" ? "RFP 작성 진행 중" : "RFP 작성 완료"}
              </span>
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <span style={{
              fontSize:10, padding:"3px 10px", borderRadius:20, fontWeight:600,
              background: T.primaryLight, color: T.primaryDark,
              border:`1px solid ${T.primaryMid}`,
            }}>RAG</span>
            <button
              onClick={() => {
                setMessages([{ id: msgIdCounter++, role: "assistant", text: "안녕하세요! 간접구매 상담도우미입니다.\n\n구매하려는 품목이나 서비스를 말씀해 주세요.\n견적 요청부터 공급업체 추천까지 함께 도와드립니다.\n\n💡 **물건·서비스를 구매하시는 분**이라면 구매요청서 작성을,\n**구매 업무를 담당하시는 분**이라면 RFP 작성을 도와드립니다.\n역할을 미리 알려주시면 더 정확한 안내가 가능합니다." }]);
                setPhase("chat"); setRfpType(null); setFields({}); setRightVisible(false); setDownloaded(false); setRecommendedRfp(null); setLastClassification(null); setSent(false); setEmailSent(false); setRfpRequestId(null); setRfpHistory([]); setShowEmailModal(false); setEmailTo("");
                // PR state 초기화
                setUserRole(null); setRoleTurnCount(0); setPrType(null); setPrFields({}); setPrJustFilled(new Set()); setPrRightVisible(false); setPrSuppliers([]); setSelectedPrSuppliers([]); setPrSaved(false); setPrSupplierLoading(false); setUploadedPrSuppliers([]);
              }}
              style={{
                width:34, height:34, borderRadius: T.r8,
                border:`1px solid ${T.border}`, background:"transparent",
                display:"flex", alignItems:"center", justifyContent:"center",
                cursor:"pointer", color: T.sub,
                transition:"all 0.2s",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = T.bgSubtle; e.currentTarget.style.color = T.primary; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = T.sub; }}
              title="새 대화"
            >
              <IconNewChat size={16} />
            </button>
          </div>
        </div>

        {/* ── 메시지 목록 ── */}
        <div ref={chatScrollRef} className="custom-scroll" style={{
          flex:1, overflowY:"auto", padding:"20px 16px",
          display:"flex", flexDirection:"column", gap:16,
          background: T.gradChat,
        }}>
          {messages.map((msg, mi) => (
            <div key={msg.id} style={{
              display:"flex",
              flexDirection: msg.role === "user" ? "row-reverse" : "row",
              gap:10, alignItems:"flex-start",
              animation: "message-in 0.3s ease-out",
              animationFillMode: "backwards",
              animationDelay: `${mi * 0.02}s`,
            }}>
              {msg.role === "assistant" && (
                <div style={{
                  width:34, height:34, borderRadius: T.r10, flexShrink:0,
                  background: 'linear-gradient(135deg, #0EA5A0 0%, #14B8A6 100%)',
                  display:"flex", alignItems:"center", justifyContent:"center",
                  color:"#fff",
                  boxShadow: '0 3px 10px rgba(14,165,160,0.18)',
                }}>
                  <IconBot size={17} />
                </div>
              )}
              <div style={{ maxWidth:"78%", display:"flex", flexDirection:"column", gap:6 }}>
                {/* 봇 이름 + 시간 */}
                {msg.role === "assistant" && (
                  <div style={{ display:"flex", alignItems:"center", gap:6, paddingLeft:2 }}>
                    <span style={{ fontSize:11, fontWeight:600, color: T.sub }}>업무마켓9</span>
                    <span style={{ fontSize:10, color: T.muted }}>
                      {new Date().toLocaleTimeString("ko-KR", { hour:"2-digit", minute:"2-digit" })}
                    </span>
                  </div>
                )}

                {/* 분류 결과 (내부 필드 cta, rfp_type 숨김) */}
                {msg.classification && (
                  <div style={{
                    background: 'rgba(14,165,160,0.05)',
                    borderLeft: `3px solid ${T.primary}`,
                    borderRadius: `2px ${T.r12}px ${T.r12}px 2px`,
                    padding:"12px 16px",
                    backdropFilter: "blur(6px)",
                    WebkitBackdropFilter: "blur(6px)",
                  }}>
                    <div style={{ fontSize:10, fontWeight:700, color: T.primary, marginBottom:8, display:"flex", alignItems:"center", gap:4 }}><IconSearch size={12} /> 분류 결과</div>
                    {Object.entries(msg.classification).filter(([k]) => !["cta","rfp_type"].includes(k)).map(([k,v]) => (
                      <div key={k} style={{ fontSize:11, display:"flex", gap:8, lineHeight:1.9 }}>
                        <span style={{ color: T.muted, width:56, flexShrink:0 }}>{k}</span>
                        <span style={{ fontWeight:600, color: T.text }}>{v}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* 메시지 버블 */}
                {(msg.text || msg.isStreaming) && (
                  <div style={{
                    background: msg.role === "user"
                      ? 'linear-gradient(135deg, #0EA5A0 0%, #14B8A6 100%)'
                      : msg.trigger === "complete" ? T.greenLight : 'rgba(255,255,255,0.85)',
                    color: msg.role === "user" ? T.inverse : T.text,
                    borderRadius: msg.role === "user"
                      ? `${T.r16}px ${T.r4}px ${T.r16}px ${T.r16}px`
                      : `${T.r4}px ${T.r16}px ${T.r16}px ${T.r16}px`,
                    padding:"12px 16px", fontSize:13, lineHeight:1.75,
                    boxShadow: msg.role === "user" ? '0 3px 12px rgba(14,165,160,0.15)' : '0 1px 4px rgba(0,0,0,0.04)',
                    border: msg.trigger === "complete"
                      ? `1px solid ${T.greenMid}`
                      : msg.role === "user" ? "none" : `1px solid rgba(14,165,160,0.08)`,
                    backdropFilter: msg.role === "user" ? "none" : "blur(8px)",
                    WebkitBackdropFilter: msg.role === "user" ? "none" : "blur(8px)",
                  }}>
                    {msg.trigger === "complete" && (
                      <div style={{ fontSize:10, fontWeight:700, color: T.greenDark, marginBottom:6, display:"flex", alignItems:"center", gap:4 }}>
                        <IconCheck size={11} /> RFP 작성 완료
                      </div>
                    )}
                    {msg.text ? (
                      <span style={{ whiteSpace:"pre-wrap" }}>{msg.text}</span>
                    ) : msg.isStreaming ? (
                      <span style={{ display:"flex", gap:6, alignItems:"center", padding:"2px 0" }}>
                        {[0,1,2].map(i => (
                          <span key={i} style={{
                            width:7, height:7, borderRadius:"50%",
                            background: T.primaryMid, display:"inline-block",
                            animation:`dot-wave 1.4s ease-in-out ${i * 0.16}s infinite`,
                          }} />
                        ))}
                      </span>
                    ) : null}
                  </div>
                )}

                {/* 추천 질문 버튼 */}
                {msg.suggestions && msg.suggestions.length > 0 && !msg.isStreaming && (
                  <div style={{ display:"flex", flexDirection:"column", gap:6, marginTop:4 }}>
                    {msg.suggestions.map((item, i) => (
                      <button key={i} onClick={() => handleSend(item)} style={{
                        padding:"9px 14px", borderRadius: T.r10,
                        border:`1px solid ${item.includes("RFP") || item.includes("제안요청서") ? 'rgba(14,165,160,0.3)' : 'rgba(14,165,160,0.12)'}`,
                        background: item.includes("RFP") || item.includes("제안요청서")
                          ? 'linear-gradient(135deg, rgba(14,165,160,0.08), rgba(14,165,160,0.04))'
                          : 'rgba(255,255,255,0.7)',
                        color: T.text, fontSize:12, fontWeight: item.includes("RFP") || item.includes("제안요청서") ? 600 : 500,
                        cursor:"pointer", textAlign:"left", fontFamily:"inherit",
                        transition:"all 0.15s", display:"flex", alignItems:"center", gap:6,
                        backdropFilter:"blur(4px)", WebkitBackdropFilter:"blur(4px)",
                      }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = T.primary; e.currentTarget.style.background = 'rgba(14,165,160,0.06)'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = item.includes("RFP") || item.includes("제안요청서") ? 'rgba(14,165,160,0.3)' : 'rgba(14,165,160,0.12)'; e.currentTarget.style.background = item.includes("RFP") || item.includes("제안요청서") ? 'linear-gradient(135deg, rgba(14,165,160,0.08), rgba(14,165,160,0.04))' : 'rgba(255,255,255,0.7)'; }}
                      >
                        <span style={{ color: T.primary, fontSize:13 }}>›</span>
                        {item}
                      </button>
                    ))}
                  </div>
                )}

                {/* 역할 선택 카드 */}
                {msg.roleSelect && !userRole && (
                  <div style={{ marginTop:12 }}>
                    <div style={{ fontSize:12, fontWeight:600, color: T.sub, marginBottom:8 }}>어떤 업무를 도와드릴까요?</div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                      <button onClick={() => handleRoleSelect("user")} style={{
                        padding:"16px 14px", borderRadius: T.r12,
                        border:`1.5px solid ${T.border}`, background: T.card,
                        cursor:"pointer", fontFamily:"inherit", textAlign:"center",
                        transition:"all 0.2s",
                      }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = "#06B6D4"; e.currentTarget.style.background = "#ECFEFF"; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.background = T.card; }}
                      >
                        <div style={{ fontSize:22, marginBottom:6 }}>🛒</div>
                        <div style={{ fontSize:12, fontWeight:700, color: T.text }}>물건/서비스를 구매하고 싶어요</div>
                        <div style={{ fontSize:10, color: T.sub, marginTop:4 }}>구매요청서 작성 + 공급업체 추천</div>
                      </button>
                      <button onClick={() => handleRoleSelect("procurement")} style={{
                        padding:"16px 14px", borderRadius: T.r12,
                        border:`1.5px solid ${T.border}`, background: T.card,
                        cursor:"pointer", fontFamily:"inherit", textAlign:"center",
                        transition:"all 0.2s",
                      }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = "#A78BFA"; e.currentTarget.style.background = "#F5F3FF"; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.background = T.card; }}
                      >
                        <div style={{ fontSize:22, marginBottom:6 }}>📋</div>
                        <div style={{ fontSize:12, fontWeight:700, color: T.text }}>구매 업무를 담당하고 있어요</div>
                        <div style={{ fontSize:10, color: T.sub, marginTop:4 }}>RFP/RFQ 작성 + 소싱</div>
                      </button>
                    </div>
                  </div>
                )}

                {/* PR 카테고리 선택 카드 */}
                {msg.prTypeSelect && !prType && renderPrTypeSelector()}

                {/* RFP 유형 선택 카드 */}
                {msg.rfpTypeSelect && !rfpType && renderRfpTypeSelector()}

                {/* 출처 표시 */}
                {msg.sources && msg.sources.length > 0 && !msg.isStreaming && (
                  <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginTop:2 }}>
                    {msg.sources.slice(0,3).map((s,i) => (
                      <span key={i} style={{
                        fontSize:9, padding:"3px 8px",
                        background: 'rgba(14,165,160,0.04)', border:`1px solid rgba(14,165,160,0.1)`,
                        borderRadius: T.r6, color: T.sub,
                        display:"flex", alignItems:"center", gap:3,
                      }}>
                        <IconDoc size={10} /> {s.replace(".pdf","")}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* 타이핑 인디케이터 */}
          {isTyping && (
            <div style={{ display:"flex", gap:10, animation:"message-in 0.3s ease-out" }}>
              <div style={{
                width:34, height:34, borderRadius: T.r10,
                background: 'linear-gradient(135deg, #0EA5A0 0%, #14B8A6 100%)',
                display:"flex", alignItems:"center", justifyContent:"center",
                color:"#fff", boxShadow: '0 3px 10px rgba(14,165,160,0.18)',
              }}>
                <IconBot size={17} />
              </div>
              <div style={{
                background: 'rgba(255,255,255,0.85)',
                borderRadius:`${T.r4}px ${T.r16}px ${T.r16}px ${T.r16}px`,
                padding:"14px 18px",
                border:`1px solid rgba(14,165,160,0.08)`,
                display:"flex", gap:6, alignItems:"center",
                boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
              }}>
                {[0,1,2].map(i => (
                  <span key={i} style={{
                    width:7, height:7, borderRadius:"50%",
                    background: T.primaryMid, display:"inline-block",
                    animation:`dot-wave 1.4s ease-in-out ${i * 0.16}s infinite`,
                  }} />
                ))}
              </div>
            </div>
          )}
          <div ref={msgEndRef} />
        </div>

        {/* ── 입력창 (글래스) ── */}
        <div style={{
          background: "rgba(255,255,255,0.75)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          borderTop:`1px solid rgba(14,165,160,0.08)`,
        }}>
          <div style={{ padding:"12px 16px 10px", display:"flex", gap:10, alignItems:"center" }}>
            {/* 구매담당자 PDF 업로드 버튼 */}
            {userRole === "procurement" && phase === "chat" && (
              <>
                <input
                  type="file" accept=".pdf"
                  id="pr-upload-input"
                  style={{ display:"none" }}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setIsTyping(true);
                    setMessages(prev => [...prev,
                      { id: msgIdCounter++, role: "user", text: `[PDF 업로드] ${file.name}` },
                    ]);
                    try {
                      const formData = new FormData();
                      formData.append("file", file);
                      const res = await api.uploadPr(formData);
                      if (res.error) {
                        setMessages(prev => [...prev, {
                          id: msgIdCounter++, role: "assistant",
                          text: `PDF 분석 실패: ${res.error}`,
                        }]);
                      } else {
                        // 추출된 필드로 RFP 자동 채움
                        const extractedFields = res.extracted_fields || {};
                        // 공급업체 정보 저장
                        if (res.selected_supplier) {
                          const suppliers = res.selected_supplier.split(/[,，、]/).map(s => s.trim()).filter(Boolean);
                          setUploadedPrSuppliers(suppliers);
                        }
                        setMessages(prev => [...prev, {
                          id: msgIdCounter++, role: "assistant",
                          text: `구매요청서를 분석했습니다.\n\n**유형:** ${res.label || "일반"}\n**제목:** ${res.title || "-"}\n**요청부서:** ${res.department || "-"}\n**요청자:** ${res.requester || "-"}\n${res.selected_supplier ? `**선택 공급업체:** ${res.selected_supplier}` : ""}\n\n총 ${Object.keys(extractedFields).length}개 필드를 추출했습니다.\n이 내용을 바탕으로 제안요청서(RFP)를 작성하시겠습니까?`,
                          prUploadResult: res,
                        }]);
                      }
                    } catch {
                      setMessages(prev => [...prev, {
                        id: msgIdCounter++, role: "assistant",
                        text: "PDF 업로드 중 오류가 발생했습니다.",
                      }]);
                    }
                    setIsTyping(false);
                    e.target.value = "";
                  }}
                />
                <button
                  onClick={() => document.getElementById("pr-upload-input")?.click()}
                  title="구매요청서 PDF 업로드"
                  style={{
                    width:48, height:48, borderRadius: T.r14, border:`1.5px solid ${T.border}`,
                    background:"transparent", display:"flex", alignItems:"center", justifyContent:"center",
                    cursor:"pointer", transition:"all 0.2s", flexShrink:0,
                    color: T.sub,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = T.primary; e.currentTarget.style.color = T.primary; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.sub; }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </button>
              </>
            )}
            <input
              ref={inputRef}
              value={userInput}
              onChange={e => setUserInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              placeholder={
                phase === "chat" ? (userRole === "procurement" ? "질문을 입력하거나 구매요청서 PDF를 업로드하세요..." : "궁금한 내용을 입력해주세요...")
                  : phase === "complete" ? "공급업체 추천 또는 추가 질문..."
                  : "추가 정보를 입력하세요..."
              }
              style={{
                flex:1, height:48, background: inputFocused ? T.card : T.bgSubtle,
                border:`1.5px solid ${inputFocused ? T.primary : "transparent"}`,
                borderRadius: T.r14, padding:"0 16px",
                color: T.text, fontSize:14, outline:"none", fontFamily:"inherit",
                transition:"all 0.2s ease",
                boxShadow: inputFocused ? `0 0 0 3px rgba(14,165,160,0.10)` : "none",
              }}
            />
            <button
              onClick={handleSend}
              disabled={isTyping || !userInput.trim()}
              aria-label="메시지 전송"
              style={{
                width:48, height:48, borderRadius: T.r14, border:"none",
                background: isTyping || !userInput.trim() ? T.borderLight : T.gradPrimary,
                color: isTyping || !userInput.trim() ? T.muted : "#fff",
                display:"flex", alignItems:"center", justifyContent:"center",
                cursor: isTyping || !userInput.trim() ? "not-allowed" : "pointer",
                transition:"all 0.2s ease",
                boxShadow: isTyping || !userInput.trim() ? "none" : T.shadowBlue,
              }}
              onMouseEnter={e => {
                if (!isTyping && userInput.trim()) e.currentTarget.style.transform = "scale(1.05)";
              }}
              onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
            >
              <IconSend size={18} />
            </button>
          </div>
          <div style={{
            padding:"2px 16px 10px", fontSize:10, color: T.muted, textAlign:"center",
            display:"flex", alignItems:"center", justifyContent:"center", gap:8,
          }}>
            <span style={{ flex:1, height:1, background: T.borderLight }} />
            <span>본 답변은 RAG 기반 참조 응답이며, 최종 결정은 담당자 검토 후 진행하시기 바랍니다.</span>
            <span style={{ flex:1, height:1, background: T.borderLight }} />
          </div>
        </div>
      </div>

      {/* ════ RIGHT: PR 패널 ════ */}
      {prRightVisible && phase.startsWith("pr_") && (
        <div style={{
          width:440, maxWidth:440, height:"85vh",
          display:"flex", flexDirection:"column",
          background: 'rgba(255,255,255,0.72)',
          backdropFilter: "blur(30px) saturate(1.4)",
          WebkitBackdropFilter: "blur(30px) saturate(1.4)",
          borderRadius: T.r24,
          border: `1px solid rgba(14,165,160,0.12)`,
          boxShadow: '0 4px 24px rgba(14,165,160,0.08), 0 1px 3px rgba(0,0,0,0.06)',
          animation:"panel-slide-in 0.45s cubic-bezier(0.16, 1, 0.3, 1)",
          flexShrink:0, overflow:"hidden",
          position:"relative", zIndex:1,
        }}>
          {/* PR 헤더 */}
          <div style={{
            background: "rgba(255,255,255,0.75)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            borderBottom:`1px solid rgba(14,165,160,0.08)`,
            padding:"14px 20px",
            display:"flex", alignItems:"center", gap:12, flexShrink:0,
          }}>
            <div style={{
              width:38, height:38, borderRadius: T.r10,
              background: "linear-gradient(135deg, #06B6D4, #0EA5A0)",
              display:"flex", alignItems:"center", justifyContent:"center",
              color:"#fff", boxShadow: T.shadowSm,
            }}>
              <IconDoc size={18} />
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:800, color: T.text }}>
                구매요청서 (PR) — {currentPrTemplate?.label || ""}
              </div>
              <div style={{ fontSize:10, color: T.sub, marginTop:2 }}>
                {phase === "pr_filling" ? "작성 진행 중" : "작성 완료"}
              </div>
            </div>
            <span style={{
              fontSize:10, padding:"4px 10px", borderRadius:20, fontWeight:600,
              background: phase === "pr_complete" ? T.greenLight : T.primaryLight,
              color: phase === "pr_complete" ? T.greenDark : T.primary,
              border: `1px solid ${phase === "pr_complete" ? T.greenMid : T.primaryMid}`,
            }}>{phase === "pr_complete" ? "✓ 완료" : "작성 중"}</span>
            <button
              onClick={() => setPrRightVisible(false)}
              style={{
                width:28, height:28, borderRadius:8, border:"none",
                background:"rgba(100,116,139,0.08)", cursor:"pointer",
                display:"flex", alignItems:"center", justifyContent:"center",
                color: T.muted, fontSize:16, lineHeight:1,
                marginLeft:4, flexShrink:0, transition:"all 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.1)"; e.currentTarget.style.color = "#ef4444"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(100,116,139,0.08)"; e.currentTarget.style.color = T.muted; }}
              title="패널 닫기"
            >✕</button>
          </div>
          {/* PR 패널 내용 — filling / complete 분기 */}
          <div className="custom-scroll" style={{ flex:1, overflowY:"auto", padding:"20px 22px" }}>
            {/* ── PR Complete: 성공 배너 + 공급업체 추천 ── */}
            {phase === "pr_complete" && (
              <>
                {/* 성공 배너 */}
                <div style={{
                  background: `linear-gradient(135deg, rgba(16,185,129,0.08), rgba(6,182,212,0.06))`,
                  borderRadius: T.r16, padding:"18px 22px", marginBottom:18,
                  border:`1.5px solid rgba(16,185,129,0.15)`,
                  display:"flex", alignItems:"center", gap:14,
                }}>
                  <IconParty size={32} />
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:14, fontWeight:800, color: T.greenDark }}>
                      {prSaved ? "구매요청서 저장 완료!" : "구매요청서 작성 완료!"}
                    </div>
                    <div style={{ fontSize:11, color:"#16a34a", marginTop:3 }}>
                      {prSaved
                        ? `공급업체 ${selectedPrSuppliers.length}개 선택됨`
                        : selectedPrSuppliers.length > 0
                          ? `공급업체 ${selectedPrSuppliers.length}개 선택 중`
                          : "아래에서 공급업체를 선택해 주세요."}
                    </div>
                  </div>
                  {prSaved && (
                    <button
                      onClick={() => {
                        if (currentPrTemplate) {
                          const supplierNames = selectedPrSuppliers.map(s => s.name).join(", ");
                          downloadPrPdf(prFields, currentPrSections, currentPrTemplate.label, supplierNames);
                        }
                      }}
                      style={{
                        padding:"8px 16px", borderRadius: T.r10,
                        border:`1px solid ${T.primary}`, background:"rgba(6,182,212,0.06)",
                        color: T.primary, fontSize:11, fontWeight:700, cursor:"pointer",
                        fontFamily:"inherit", whiteSpace:"nowrap",
                        display:"flex", alignItems:"center", gap:5,
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(6,182,212,0.12)"}
                      onMouseLeave={e => e.currentTarget.style.background = "rgba(6,182,212,0.06)"}
                    >
                      <IconDownload size={13} /> PDF
                    </button>
                  )}
                </div>

                {/* 채워진 필드 요약 (접기/펼치기) */}
                <div style={{ marginBottom:16 }}>
                  <div
                    onClick={() => setOpenSec(p => ({...p, pr_summary: !p.pr_summary}))}
                    style={{
                      background: 'rgba(255,255,255,0.7)', padding:"12px 16px",
                      border: `1px solid rgba(6,182,212,0.08)`,
                      borderRadius: openSec.pr_summary ? `${T.r12}px ${T.r12}px 0 0` : T.r12,
                      display:"flex", alignItems:"center", gap:10, cursor:"pointer",
                    }}
                  >
                    <IconDoc size={14} />
                    <span style={{ fontSize:12, fontWeight:700, flex:1, color: T.text }}>작성된 구매요청서</span>
                    <Chip>{prFilled}/{prTotal} 항목</Chip>
                    <span style={{ color: T.muted }}><IconChevron open={openSec.pr_summary} /></span>
                  </div>
                  {openSec.pr_summary && (
                    <div style={{
                      background: 'rgba(255,255,255,0.65)', border:`1px solid rgba(6,182,212,0.08)`, borderTop:"none",
                      borderRadius:`0 0 ${T.r12}px ${T.r12}px`, overflow:"hidden",
                    }}>
                      {Object.entries(prFields).filter(([,f]) => f.value).map(([fk, f], fi) => (
                        <div key={fk} style={{
                          display:"flex", alignItems:"flex-start",
                          borderBottom: `1px solid ${T.borderLight}`,
                          background: fi % 2 === 1 ? "rgba(6,182,212,0.02)" : "transparent",
                        }}>
                          <div style={{
                            width:136, padding:"8px 14px", flexShrink:0,
                            background:"rgba(6,182,212,0.03)", borderRight:`1px solid rgba(6,182,212,0.06)`,
                            fontSize:11, fontWeight:700, color: T.sub,
                          }}>{f.label}</div>
                          <div style={{ flex:1, padding:"8px 14px", fontSize:12, color: T.text }}>{f.value}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 공급업체 추천 (사용자 전용) — 저장 전 */}
                {userRole === "user" && !prSaved && (
                  <>
                    {/* 선택된 공급업체 태그 */}
                    {selectedPrSuppliers.length > 0 && (
                      <div style={{
                        background: 'rgba(16,185,129,0.06)', borderRadius: T.r12,
                        padding:"12px 16px", marginBottom:12,
                        border:`1px solid rgba(16,185,129,0.12)`,
                      }}>
                        <div style={{ fontSize:11, fontWeight:700, color: T.greenDark, marginBottom:8 }}>
                          선택된 공급업체 ({selectedPrSuppliers.length}개)
                        </div>
                        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                          {selectedPrSuppliers.map(sp => (
                            <span key={sp.id} style={{
                              display:"inline-flex", alignItems:"center", gap:4,
                              fontSize:11, padding:"4px 10px", borderRadius:20,
                              background:"rgba(16,185,129,0.12)", color: T.greenDark,
                              fontWeight:600,
                            }}>
                              {sp.name}
                              <span
                                onClick={() => setSelectedPrSuppliers(prev => prev.filter(x => x.id !== sp.id))}
                                style={{ cursor:"pointer", fontSize:13, lineHeight:1, marginLeft:2, opacity:0.6 }}
                              >✕</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div style={{
                      background: `linear-gradient(135deg, rgba(14,165,160,0.08), rgba(6,182,212,0.06))`,
                      borderRadius: T.r16, padding:"14px 18px", marginBottom:14,
                      border:`1px solid rgba(14,165,160,0.12)`,
                    }}>
                      <div style={{ fontSize:13, fontWeight:800, color: T.primary }}>추천 공급업체</div>
                      <div style={{ fontSize:11, color: T.sub, marginTop:3 }}>구매요청 내용 기반 매칭 결과입니다. 여러 업체를 선택할 수 있습니다.</div>
                    </div>

                    {prSupplierLoading ? (
                      <div style={{ textAlign:"center", padding:30, color: T.muted, fontSize:12 }}>
                        공급업체 검색 중...
                      </div>
                    ) : prSuppliers.length === 0 ? (
                      <div style={{ textAlign:"center", padding:30, color: T.muted, fontSize:12 }}>
                        매칭되는 공급업체가 없습니다.
                      </div>
                    ) : prSuppliers.slice(0, 8).map((s, i) => {
                      const isTop = i < 3;
                      const isSelected = selectedPrSuppliers.some(sp => sp.id === s.id);
                      return (
                        <div key={s.id || s.name + i} style={{
                          background: isSelected ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.75)',
                          backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
                          borderRadius: T.r12, padding:"14px 18px", marginBottom:8,
                          border: isSelected ? `2px solid rgba(16,185,129,0.4)` : `1px solid rgba(14,165,160,0.08)`,
                          transition:"all 0.2s", cursor:"pointer",
                        }}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedPrSuppliers(prev => prev.filter(x => x.id !== s.id));
                            } else {
                              setSelectedPrSuppliers(prev => [...prev, { id: s.id, name: s.name }]);
                            }
                          }}
                          onMouseEnter={e => { if (!isSelected) { e.currentTarget.style.borderColor = T.primary; e.currentTarget.style.boxShadow = "0 4px 16px rgba(14,165,160,0.12)"; }}}
                          onMouseLeave={e => { if (!isSelected) { e.currentTarget.style.borderColor = "rgba(14,165,160,0.08)"; e.currentTarget.style.boxShadow = "none"; }}}
                        >
                          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
                            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                              <div style={{
                                width:32, height:32, borderRadius:8,
                                background: isSelected ? "rgba(16,185,129,0.15)" : isTop ? T.gradPrimary : `linear-gradient(135deg, ${T.bgSubtle}, ${T.bg})`,
                                display:"flex", alignItems:"center", justifyContent:"center",
                                color: isSelected ? T.greenDark : isTop ? "#fff" : T.sub, fontSize:13, fontWeight:800,
                              }}>{isSelected ? "✓" : i + 1}</div>
                              <div>
                                <div style={{ fontSize:13, fontWeight:700, color: T.text }}>{s.name}</div>
                                <div style={{ fontSize:10, color: T.muted }}>{s.sub_category || s.category}</div>
                              </div>
                            </div>
                            <span style={{
                              fontSize:9, fontWeight:600, padding:"2px 6px", borderRadius:8,
                              background: isSelected ? "rgba(16,185,129,0.15)" : isTop ? "rgba(16,185,129,0.1)" : "rgba(251,191,36,0.1)",
                              color: isSelected ? T.greenDark : isTop ? "#059669" : "#d97706",
                            }}>{isSelected ? "선택됨" : isTop ? "추천" : "검토"}</span>
                          </div>

                          {/* 매칭률 바 */}
                          <div style={{ marginBottom:8 }}>
                            <div style={{ fontSize:9, color: T.muted, marginBottom:3 }}>매칭률</div>
                            <div style={{ height:5, borderRadius:3, background: T.bgSubtle, overflow:"hidden" }}>
                              <div style={{ width:`${s.match_rate || 80}%`, height:"100%", borderRadius:3, background: isSelected ? "linear-gradient(90deg,#10b981,#059669)" : T.gradPrimary, transition:"width 1s ease" }} />
                            </div>
                            <div style={{ fontSize:10, fontWeight:700, color: isSelected ? T.greenDark : T.primary, marginTop:2 }}>{s.match_rate || 80}%</div>
                          </div>

                          {/* 태그 */}
                          <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                            {(s.tags || []).slice(0, 3).map(tag => (
                              <span key={tag} style={{
                                fontSize:9, padding:"2px 7px", borderRadius:10,
                                background: T.bgSubtle, color: T.sub, border:`1px solid ${T.border}`,
                              }}>{tag}</span>
                            ))}
                          </div>
                        </div>
                      );
                    })}

                    <div style={{
                      textAlign:"center", padding:"12px", marginTop:6,
                      fontSize:10, color: T.muted,
                      background: T.bgSubtle, borderRadius: T.r10,
                    }}>
                      업무마켓9(workmarket9.com) 등록 업체 기준
                    </div>

                    {/* 저장 버튼 */}
                    <button
                      onClick={async () => {
                        try {
                          const supplierNames = selectedPrSuppliers.map(sp => sp.name).join(", ");
                          const supplierIds = selectedPrSuppliers.map(sp => sp.id);
                          // 첫 번째 공급업체로 DB 저장 (기존 API 호환) + 전체 목록은 fields에 포함
                          if (selectedPrSuppliers.length > 0) {
                            await api.updatePrSupplier(sessionId, supplierIds[0], supplierNames);
                          }
                          setPrSaved(true);
                          setMessages(prev => [...prev, {
                            id: msgIdCounter++, role: "assistant",
                            text: `구매요청서가 저장되었습니다.${selectedPrSuppliers.length > 0 ? `\n선택 공급업체: ${supplierNames}` : ""}\n\n구매담당자가 확인할 수 있습니다.`,
                          }]);
                        } catch (err) {
                          console.warn("PR save failed:", err);
                        }
                      }}
                      style={{
                        width:"100%", padding:"14px", borderRadius: T.r12, marginTop:12,
                        border:"none", background: T.gradPrimary,
                        color:"#fff", fontSize:14, fontWeight:800, cursor:"pointer",
                        fontFamily:"inherit", transition:"all 0.2s",
                        boxShadow: "0 4px 16px rgba(6,182,212,0.3)",
                      }}
                      onMouseEnter={e => e.currentTarget.style.transform = "translateY(-1px)"}
                      onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
                    >
                      {selectedPrSuppliers.length > 0
                        ? `구매요청서 저장 (공급업체 ${selectedPrSuppliers.length}개)`
                        : "구매요청서 저장"}
                    </button>
                  </>
                )}

                {/* 저장 완료 */}
                {prSaved && (
                  <div style={{
                    background: 'rgba(16,185,129,0.06)', borderRadius: T.r16,
                    padding:"22px", border:`1.5px solid rgba(16,185,129,0.15)`,
                    textAlign:"center",
                  }}>
                    <IconCheck size={28} />
                    <div style={{ fontSize:15, fontWeight:800, color: T.greenDark, marginTop:10 }}>
                      구매요청서 저장 완료
                    </div>
                    {selectedPrSuppliers.length > 0 && (
                      <div style={{ marginTop:10, display:"flex", gap:6, flexWrap:"wrap", justifyContent:"center" }}>
                        {selectedPrSuppliers.map(sp => (
                          <span key={sp.id} style={{
                            fontSize:12, padding:"5px 14px", borderRadius:20,
                            background:"rgba(16,185,129,0.12)", color: T.greenDark, fontWeight:700,
                          }}>{sp.name}</span>
                        ))}
                      </div>
                    )}
                    <div style={{ fontSize:11, color: T.sub, marginTop:10 }}>
                      구매담당자가 관리 페이지에서 확인할 수 있습니다.
                    </div>
                    <div style={{ display:"flex", gap:8, marginTop:16, justifyContent:"center" }}>
                      <button
                        onClick={() => {
                          if (currentPrTemplate) {
                            const supplierNames = selectedPrSuppliers.map(s => s.name).join(", ");
                            downloadPrPdf(prFields, currentPrSections, currentPrTemplate.label, supplierNames);
                          }
                        }}
                        style={{
                          padding:"10px 22px", borderRadius: T.r10,
                          border:`1px solid ${T.primary}`, background:"rgba(6,182,212,0.06)",
                          color: T.primary, fontSize:12, fontWeight:700, cursor:"pointer",
                          fontFamily:"inherit", display:"flex", alignItems:"center", gap:6,
                        }}
                      ><IconDownload size={14} /> PDF 다운로드</button>
                      {PR_TO_RFP_MAPPING[prType] && (
                        <button
                          onClick={convertPrToRfp}
                          style={{
                            padding:"10px 22px", borderRadius: T.r10,
                            border:`1px solid ${T.primary}`, background:"rgba(6,182,212,0.06)",
                            color: T.primary, fontSize:12, fontWeight:700, cursor:"pointer",
                            fontFamily:"inherit", display:"flex", alignItems:"center", gap:6,
                          }}
                        >RFP로 전환</button>
                      )}
                      <button
                        onClick={() => {
                          setPhase("chat"); setPrRightVisible(false);
                          setMessages(prev => [...prev, {
                            id: msgIdCounter++, role: "assistant",
                            text: "다른 질문이 있으시면 말씀해 주세요.",
                          }]);
                        }}
                        style={{
                          padding:"10px 22px", borderRadius: T.r10,
                          border:"none", background: T.gradPrimary,
                          color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer",
                          fontFamily:"inherit",
                        }}
                      >새 질문하기</button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ── PR Filling: 진행률 + 섹션 아코디언 ── */}
            {phase === "pr_filling" && (
              <>
                {/* 진행률 */}
                <div style={{
                  background: `linear-gradient(135deg, rgba(6,182,212,0.06) 0%, rgba(14,165,160,0.04) 100%)`,
                  borderRadius: T.r16, padding:"16px 20px", marginBottom:16,
                  border: `1px solid rgba(6,182,212,0.12)`,
                }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                    <span style={{ fontSize:12, fontWeight:700, color: T.text }}>구매요청서 완성도</span>
                    <span style={{
                      fontSize:11, fontWeight:700, padding:"4px 12px", borderRadius:20,
                      background: prPct >= 80 ? T.greenLight : 'rgba(255,255,255,0.8)',
                      color: prPct >= 80 ? T.greenDark : T.primary,
                      border: `1px solid ${prPct >= 80 ? T.greenMid : 'rgba(6,182,212,0.15)'}`,
                    }}>{prFilled} / {prTotal} · {prPct}%</span>
                  </div>
                  <div style={{ height:8, background:"rgba(255,255,255,0.7)", borderRadius:4, overflow:"hidden" }}>
                    <div style={{
                      height:"100%", width:`${prPct}%`, borderRadius:4,
                      background: `linear-gradient(90deg, #06B6D4, #0EA5A0)`,
                      transition:"width 0.6s ease",
                    }} />
                  </div>
                </div>

                {/* 섹션 아코디언 */}
                {currentPrSections.map((sec, si) => {
                  const sectionDone = sec.fields.every(f => prFields[f]?.value);
                  return (
                    <div key={si} style={{ marginBottom:10 }}>
                      <div
                        onClick={() => setOpenSec(p => ({...p,[`pr_${si}`]:!p[`pr_${si}`]}))}
                        style={{
                          background: 'rgba(255,255,255,0.7)', padding:"12px 16px",
                          border: `1px solid rgba(6,182,212,0.08)`,
                          borderRadius: openSec[`pr_${si}`] !== false ? `${T.r12}px ${T.r12}px 0 0` : T.r12,
                          display:"flex", alignItems:"center", gap:10, cursor:"pointer",
                          transition:"all 0.2s ease",
                        }}
                      >
                        <span style={{
                          width:24, height:24, borderRadius:"50%",
                          display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
                          background: sectionDone ? T.greenLight : T.redLight,
                          color: sectionDone ? T.greenDark : T.red,
                        }}>{sectionDone ? <IconCheck size={12} /> : <IconAlert size={12} />}</span>
                        <span style={{ fontSize:12, fontWeight:700, flex:1, color: T.text }}>
                          {SECTION_ICONS[sec.icon]} {sec.title}
                        </span>
                        {sectionDone
                          ? <Chip>완료</Chip>
                          : <Chip color={T.red} bg={T.redLight} border={T.redMid}>미완료</Chip>
                        }
                        <span style={{ color: T.muted }}><IconChevron open={openSec[`pr_${si}`] !== false} /></span>
                      </div>
                      {openSec[`pr_${si}`] !== false && (
                        <div style={{
                          background: 'rgba(255,255,255,0.65)', border:`1px solid rgba(6,182,212,0.08)`, borderTop:"none",
                          borderRadius:`0 0 ${T.r12}px ${T.r12}px`, overflow:"hidden",
                        }}>
                          {sec.fields.map((fk, fi) => {
                            const f = prFields[fk];
                            if (!f) return null;
                            const isNew = prJustFilled.has(fk);
                            return (
                              <div key={fk} style={{
                                display:"flex", alignItems:"flex-start",
                                borderBottom: fi < sec.fields.length-1 ? `1px solid ${T.borderLight}` : "none",
                                animation: isNew ? "field-highlight 2.5s ease forwards" : "none",
                                background: fi % 2 === 1 ? "rgba(6,182,212,0.02)" : "transparent",
                              }}>
                                <div style={{
                                  width:136, padding:"10px 14px", flexShrink:0,
                                  background:"rgba(6,182,212,0.03)", borderRight:`1px solid rgba(6,182,212,0.06)`,
                                  fontSize:11, fontWeight:700, color: T.sub,
                                  display:"flex", alignItems:"center", minHeight:40,
                                }}>{f.label}</div>
                                <div style={{
                                  flex:1, padding:"4px 8px", fontSize:12,
                                  lineHeight:1.7, minHeight:40, display:"flex", alignItems:"center", gap:4,
                                }}>
                                  <input
                                    type="text"
                                    value={f.value || ""}
                                    placeholder="직접 입력 또는 채팅으로 입력"
                                    onChange={(e) => handlePrFieldEdit(fk, e.target.value)}
                                    style={{
                                      width:"100%", border:"none", outline:"none",
                                      background:"transparent", fontSize:12, color: T.text,
                                      padding:"6px 8px", borderRadius:4, fontFamily:"inherit",
                                      transition:"background 0.2s",
                                    }}
                                    onFocus={(e) => { e.target.style.background = "rgba(6,182,212,0.06)"; }}
                                    onBlur={(e) => { e.target.style.background = "transparent"; }}
                                  />
                                  {isNew && <span style={{
                                    fontSize:9, padding:"2px 6px", flexShrink:0,
                                    background: T.tealLight, border:`1px solid ${T.tealMid}`,
                                    borderRadius:4, color: T.tealDark, fontWeight:700,
                                  }}>NEW</span>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>
      )}

      {/* ════ RIGHT: RFP 패널 ════ */}
      {rightVisible && (
        <div style={{
          width:440, maxWidth:440, height:"85vh",
          display:"flex", flexDirection:"column",
          background: 'rgba(255,255,255,0.72)',
          backdropFilter: "blur(30px) saturate(1.4)",
          WebkitBackdropFilter: "blur(30px) saturate(1.4)",
          borderRadius: T.r24,
          border: `1px solid rgba(14,165,160,0.12)`,
          boxShadow: '0 4px 24px rgba(14,165,160,0.08), 0 1px 3px rgba(0,0,0,0.06)',
          animation:"panel-slide-in 0.45s cubic-bezier(0.16, 1, 0.3, 1)",
          flexShrink:0, overflow:"hidden",
          position:"relative", zIndex:1,
        }}>
          {/* RFP 헤더 (글래스) */}
          <div style={{
            background: "rgba(255,255,255,0.75)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            borderBottom:`1px solid rgba(14,165,160,0.08)`,
            padding:"14px 20px",
            display:"flex", alignItems:"center", gap:12, flexShrink:0,
          }}>
            <div style={{
              width:38, height:38, borderRadius: T.r10,
              background: T.gradNavy,
              display:"flex", alignItems:"center", justifyContent:"center",
              color:"#fff",
              boxShadow: T.shadowSm,
            }}>
              <IconDoc size={18} />
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:800, color: T.text }}>
                {phase === "filling"
                  ? `제안요청서 (RFP) — ${currentTemplate?.label || ""}`
                  : `제안요청서 (RFP) — ${currentTemplate?.label || ""}`}
              </div>
              <div style={{ fontSize:10, color: T.sub, marginTop:2 }}>
                {phase === "filling" ? "작성 진행 중" : "작성 완료"}
                {" · "}대한민국 정부 표준 구매 양식 기준
              </div>
            </div>
            <span style={{
              fontSize:10, padding:"4px 10px", borderRadius:20, fontWeight:600,
              background: sent ? "rgba(14,165,160,0.08)" : phase === "complete" ? T.greenLight : T.primaryLight,
              color: sent ? T.primary : phase === "complete" ? T.greenDark : T.primary,
              border: `1px solid ${sent ? T.primaryMid : phase === "complete" ? T.greenMid : T.primaryMid}`,
            }}>{sent ? "추천 업체" : phase === "complete" ? "✓ 완료" : "작성 중"}</span>
            <button
              onClick={() => setRightVisible(false)}
              style={{
                width:28, height:28, borderRadius:8, border:"none",
                background:"rgba(100,116,139,0.08)", cursor:"pointer",
                display:"flex", alignItems:"center", justifyContent:"center",
                color: T.muted, fontSize:16, lineHeight:1,
                marginLeft:4, flexShrink:0,
                transition:"all 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.1)"; e.currentTarget.style.color = "#ef4444"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(100,116,139,0.08)"; e.currentTarget.style.color = T.muted; }}
              title="패널 닫기"
            >✕</button>
          </div>
          {phase === "filling" && PanelFilling()}
          {phase === "complete" && !sent && PanelComplete()}
          {phase === "complete" && sent && userRole !== "procurement" && PanelSuppliers()}
        </div>
      )}

      {/* 이메일 발송 모달 */}
      <EmailModal />
    </div>
  );
}

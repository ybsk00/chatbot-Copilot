import { useState, useEffect, useRef } from "react";
import { api } from "../api/client";
import { T } from "../styles/tokens";
import { RFP_TEMPLATES } from "../data/rfpTemplates";
import { PR_TEMPLATES, PR_CATEGORIES } from "../data/prTemplates";
import { COMMON_SECTIONS } from "../data/commonFields";
import { PR_TO_RFP_MAPPING, getPrToRfpMapping } from "../data/fieldMapping";
import { CATEGORY_FIELD_OPTIONS, getCategoryGroup } from "../data/categoryFieldOptions";
import { downloadRfpPdf } from "../utils/rfpExport";
import { downloadPrPdf } from "../utils/prExport";
import { previewRfq, downloadRfqPdf } from "../utils/rfqExport";
// BackgroundBlobs 제거 — 업무마켓9 임베드 시 외부 배경 불필요

// PR 패널 자동 오픈 임계값 (사용자 답변 기준 %)
const PR_AUTO_OPEN_PCT = 30;  // 나중에 50으로 조정 가능

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
  const [prTab, setPrTab]               = useState(0); // PR 3탭: 0=기본정보, 1=상세요건, 2=계약조건
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
  const [prUserFilledKeys, setPrUserFilledKeys] = useState(new Set());  // 사용자가 채팅으로 채운 필드 키 추적
  const [prFillingTurns, setPrFillingTurns] = useState(0);  // pr_filling에서 사용자 메시지 턴 수
  const [activePrFieldKey, setActivePrFieldKey] = useState(null);  // 자율답변 대상 필드 키
  const [prRequestId, setPrRequestId] = useState(null);
  const [uploadedPrSuppliers, setUploadedPrSuppliers] = useState([]);  // PDF에서 추출된 공급업체
  const [prSupplierLoading, setPrSupplierLoading] = useState(false);
  const [dbPrTemplates, setDbPrTemplates] = useState(null); // DB에서 로드된 PR 템플릿
  // RFQ (견적서) state
  const [rfqType, setRfqType]               = useState(null);
  const [rfqFields, setRfqFields]           = useState({});
  const [rfqRightVisible, setRfqRightVisible] = useState(false);
  const [rfqRequestId, setRfqRequestId]     = useState(null);
  const [dbRfqTemplates, setDbRfqTemplates] = useState(null);
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

  // PR 계산 — 필수 필드 기준 (c1~c5 제외: 추후 시스템 연동으로 자동 입력)
  const currentPrTemplate = prType ? getPrTemplate(prType) : null;
  const currentPrSections = currentPrTemplate?.sections || [];
  const PR_SKIP_KEYS_CALC = new Set(["c1","c2","c3","c4","c5"]);
  const prRequiredFields = Object.entries(prFields).filter(([k, f]) => f.required !== false && !PR_SKIP_KEYS_CALC.has(k));
  const prOptionalFields = Object.entries(prFields).filter(([, f]) => f.required === false);
  const prRequiredFilled = prRequiredFields.filter(([, f]) => (f.value || "").trim()).length;
  const prRequiredTotal  = prRequiredFields.length;
  const prFilled = Object.values(prFields).filter(f => (f.value || "").trim()).length;
  const prTotal  = Object.keys(prFields).length;
  const prPct    = prRequiredTotal > 0 ? Math.round(prRequiredFilled / prRequiredTotal * 100) : 0;

  // 사용자가 채팅으로 채운 필수 필드 기준 % (자동오픈용 — default 값 제외)
  const prUserFilledPct = prRequiredTotal > 0
    ? Math.round(prRequiredFields.filter(([k]) => prUserFilledKeys.has(k)).length / prRequiredTotal * 100)
    : 0;

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // PR 패널 자동 오픈: 사용자 답변 30% 이상 또는 대화 3턴 이상
  useEffect(() => {
    if (phase === "pr_filling" && !prRightVisible) {
      if (prUserFilledPct >= PR_AUTO_OPEN_PCT || prFillingTurns >= 3) {
        setPrRightVisible(true);
      }
    }
  }, [prUserFilledPct, prFillingTurns, phase, prRightVisible]);

  // PR 패널 "작성 완료" 버튼 핸들러
  const handlePrManualComplete = () => {
    setPhase("pr_complete");
    setPrRightVisible(true);
    setMessages(prev => [...prev, {
      id: msgIdCounter++, role: "assistant",
      text: "구매요청서가 완성되었습니다! 내용을 확인하시고 다운로드해 주세요.",
    }]);
  };

  // DB에서 PR 템플릿 로드
  useEffect(() => {
    api.getPrTemplates().then(res => {
      const arr = Array.isArray(res) ? res : (res.templates || []);
      if (arr.length > 0) {
        const map = {};
        arr.forEach(t => { map[t.type_key] = t; });
        setDbPrTemplates(map);
      }
    }).catch(() => {});
    // RFQ 템플릿도 로드
    api.getRfqTemplates().then(res => {
      const arr = Array.isArray(res) ? res : [];
      if (arr.length > 0) {
        const map = {};
        arr.forEach(t => { map[t.type_key] = t; });
        setDbRfqTemplates(map);
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
      // PR 카테고리 → L1 대분류 역매핑 (suppliers.category = L1 이름)
      let dbCat = "";
      const tpl = getPrTemplate(prType);
      if (tpl?.category_group) {
        dbCat = tpl.category_group;
      } else {
        for (const [cat, keys] of Object.entries(PR_CATEGORIES)) {
          if (keys.includes(prType)) { dbCat = cat; break; }
        }
      }
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

  // PR 필수 필드(c1~c5 제외) 채움률 감지 → 패널 자동 오픈
  const PR_SKIP_KEYS = new Set(["c1","c2","c3","c4","c5"]);

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
    // 사용자가 채운 키 누적 추적 (자동오픈 임계값용)
    setPrUserFilledKeys(prev => new Set([...prev, ...keys]));
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
    const mapping = getPrToRfpMapping(prType);
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

  // ── PR → RFQ 전환 ──
  const convertPrToRfq = () => {
    // RFQ 템플릿 확인 (같은 L3 코드로)
    const rfqTpl = dbRfqTemplates?.[prType];
    if (!rfqTpl) {
      setMessages(prev => [
        ...prev,
        { id: msgIdCounter++, role: "assistant", text: "이 품목은 아직 견적서(RFQ) 양식이 준비되지 않았습니다.\n현재 L01(사무·총무), L02(인사·복리후생), L03(시설·건물관리) 카테고리만 지원됩니다." }
      ]);
      return;
    }

    // RFQ 필드 초기화
    const rfqTemplateFields = {};
    Object.entries(rfqTpl.fields).forEach(([k, v]) => {
      rfqTemplateFields[k] = { ...v };
    });

    setRfqType(prType);
    setRfqFields(rfqTemplateFields);
    setPhase("rfq_filling");
    setRfqRightVisible(true);
    setPrRightVisible(false);

    setMessages(prev => [
      ...prev,
      { id: msgIdCounter++, role: "assistant", text: `구매요청서 내용을 기반으로 **${rfqTpl.name}** 견적서(RFQ)를 준비했습니다.\n소싱담당자 필수 항목을 채워주세요. 채팅으로 입력하시면 자동 매핑됩니다.` }
    ]);
  };

  // ── 업로드된 PR → RFP 변환 ──
  const convertUploadToRfp = (uploadResult) => {
    const prType_ = uploadResult.pr_type || "_generic";
    const mapping = getPrToRfpMapping(prType_);
    const rfpTypeKey = mapping?.rfpType || "service_contract";
    const tpl = RFP_TEMPLATES[rfpTypeKey];
    if (!tpl) return;

    const rfpTemplateFields = {};
    Object.entries(tpl.fields).forEach(([k, v]) => {
      rfpTemplateFields[k] = { ...v };
    });

    // 추출 필드 매핑
    const extracted = uploadResult.extracted_fields || {};
    if (mapping?.fieldMap) {
      Object.entries(mapping.fieldMap).forEach(([prKey, rfpKey]) => {
        if (extracted[prKey] && rfpTemplateFields[rfpKey]) {
          rfpTemplateFields[rfpKey] = { ...rfpTemplateFields[rfpKey], value: extracted[prKey] };
        }
      });
    }
    if (uploadResult.department && rfpTemplateFields.s2) rfpTemplateFields.s2 = { ...rfpTemplateFields.s2, value: uploadResult.department };
    if (uploadResult.requester && rfpTemplateFields.s3) rfpTemplateFields.s3 = { ...rfpTemplateFields.s3, value: uploadResult.requester };
    if (uploadResult.title && rfpTemplateFields.s6 && !rfpTemplateFields.s6.value) rfpTemplateFields.s6 = { ...rfpTemplateFields.s6, value: uploadResult.title };

    setRfpType(rfpTypeKey);
    setFields(rfpTemplateFields);
    setPhase("filling");
    setRightVisible(true);

    setMessages(prev => [...prev, {
      id: msgIdCounter++, role: "assistant",
      text: `업로드된 구매요청서를 기반으로 **${tpl.label}** 제안요청서(RFP)를 준비했습니다.\n자동 매핑된 항목을 확인하시고, 추가 정보를 입력해 주세요.`,
    }]);
  };

  // ── 업로드된 PR → RFQ 변환 ──
  const convertUploadToRfq = (uploadResult) => {
    const prType_ = uploadResult.pr_type || "_generic";
    const rfqTpl = dbRfqTemplates?.[prType_];
    if (!rfqTpl) {
      setMessages(prev => [...prev, {
        id: msgIdCounter++, role: "assistant",
        text: "이 품목은 아직 견적서(RFQ) 양식이 준비되지 않았습니다.\n현재 L01(사무·총무), L02(인사·복리후생), L03(시설·건물관리) 카테고리만 지원됩니다.",
      }]);
      return;
    }

    const rfqTemplateFields = {};
    Object.entries(rfqTpl.fields).forEach(([k, v]) => {
      rfqTemplateFields[k] = { ...v };
    });

    // 추출 필드에서 기본 매핑 (품목명→q1, 수량→q2 등)
    const extracted = uploadResult.extracted_fields || {};
    if (uploadResult.title && rfqTemplateFields.q1) rfqTemplateFields.q1 = { ...rfqTemplateFields.q1, value: uploadResult.title };
    if (extracted.c10 && rfqTemplateFields.q2) rfqTemplateFields.q2 = { ...rfqTemplateFields.q2, value: extracted.c10 };
    if (extracted.c9 && rfqTemplateFields.q4) rfqTemplateFields.q4 = { ...rfqTemplateFields.q4, value: extracted.c9 };

    setRfqType(prType_);
    setRfqFields(rfqTemplateFields);
    setPhase("rfq_filling");
    setRfqRightVisible(true);
    setPrRightVisible(false);

    setMessages(prev => [...prev, {
      id: msgIdCounter++, role: "assistant",
      text: `업로드된 구매요청서를 기반으로 **${rfqTpl.name}** 견적서(RFQ)를 준비했습니다.\n소싱담당자 필수 항목을 채워주세요.`,
    }]);
  };

  const getPrFilledFields = () => {
    const result = {};
    Object.entries(prFields).forEach(([k, v]) => {
      if ((v.value || "").trim()) result[k] = v.value;
    });
    return result;
  };

  // ── RFP/PR 인라인 프리뷰 (새 탭에 HTML 렌더링) ──
  const openLocalPreview = (title, subtitle, sections, fieldsObj) => {
    const rows = sections.flatMap(sec =>
      sec.fields.map(fk => {
        const f = fieldsObj[fk];
        if (!f) return null;
        return `<tr><td style="width:180px;background:#f8fafb;padding:10px 14px;font-weight:700;font-size:13px;color:#475569;border:1px solid #e2e8f0">${f.label}</td><td style="padding:10px 14px;font-size:13px;color:#1e293b;border:1px solid #e2e8f0">${f.value || ""}</td></tr>`;
      }).filter(Boolean)
    ).join("");
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:800px;margin:40px auto;padding:0 20px;color:#1e293b}h1{text-align:center;font-size:22px;letter-spacing:4px;margin-bottom:4px}h2{text-align:center;font-size:13px;color:#64748b;margin-bottom:24px}table{width:100%;border-collapse:collapse;margin-bottom:24px}@media print{body{margin:20px}}</style></head><body><h1>${title}</h1><h2>${subtitle}</h2><table>${rows}</table><div style="text-align:center;margin-top:24px"><button onclick="window.print()" style="padding:10px 24px;background:#0EA5A0;color:#fff;border:none;border-radius:8px;font-size:14px;cursor:pointer">PDF 다운로드 (인쇄)</button></div></body></html>`;
    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); }
  };

  const previewRfp = () => {
    const baseUrl = import.meta.env.VITE_API_URL || "https://ip-assist-backend-1058034030780.asia-northeast3.run.app";
    if (rfpRequestId) {
      window.open(`${baseUrl}/rfp/view/${rfpRequestId}`, "_blank");
    } else {
      const tmpl = RFP_TEMPLATES[rfpType];
      if (tmpl) openLocalPreview("제 안 요 청 서", tmpl.label, tmpl.sections, fields);
    }
  };

  const previewPr = () => {
    const baseUrl = import.meta.env.VITE_API_URL || "https://ip-assist-backend-1058034030780.asia-northeast3.run.app";
    if (prRequestId) {
      window.open(`${baseUrl}/pr/view/${prRequestId}`, "_blank");
    } else if (currentPrTemplate) {
      openLocalPreview("구 매 요 청 서", currentPrTemplate.label || currentPrTemplate.name, currentPrSections, prFields);
    }
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

  // PR 카테고리 선택 — 패널 즉시 열지 않고 인터랙티브 퀵필 카드 표시
  const handlePrTypeSelect = (type) => {
    setPrType(type);
    const tmpl = getPrTemplate(type);
    if (!tmpl) return;

    const templateFields = {};
    // c10(대상 규모/수량)은 탭 선택으로 받아야 하므로 기본값 자동 채움 제외
    const NO_AUTO_FILL = new Set(["c9", "c10"]);
    Object.entries(tmpl.fields).forEach(([k, v]) => {
      templateFields[k] = { ...v, value: NO_AUTO_FILL.has(k) ? "" : (v.default || "") };
    });
    setPrFields(templateFields);
    setPrRightVisible(false);   // 대화로 필드 수집 후 자동 오픈 (PR_AUTO_OPEN_PCT% 도달 시)
    setPrUserFilledKeys(new Set());  // 사용자 채움 추적 초기화
    setPrFillingTurns(0);            // 대화 턴 초기화
    setActivePrFieldKey(null);       // 자율답변 대상 초기화
    setPhase("pr_filling");

    const label = tmpl.name || tmpl.label;
    setMessages(prev => [
      ...prev,
      { id: msgIdCounter++, role: "user", text: label },
      {
        id: msgIdCounter++, role: "assistant",
        text: `${label} 구매요청서를 준비했습니다.\n아래 항목들을 확인하시고, 채팅으로 내용을 알려주시면 자동으로 채워드립니다.`,
        prQuickFill: true,
      }
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

    // ── PR 직접 진입: "구매요청서" 키워드 → 백엔드 안 거치고 바로 PR filling ──
    if (phase !== "pr_filling" && phase !== "rfq_filling" && (
      text.includes("구매요청서 작성") || text.includes("구매요청서") || text === "구매요청서 작성하기"
    )) {
      const prKey = lastClassification?.pr_template_key;
      if (prKey && prKey !== "_generic" && getPrTemplate(prKey)) {
        setUserInput("");
        handlePrTypeSelect(prKey);
        return;
      }
      // fallback: 스트리밍 우회 → 카테고리 선택 UI 바로 표시
      setUserInput("");
      setMessages(prev => [...prev,
        { id: msgIdCounter++, role: "user", text },
        { id: msgIdCounter++, role: "assistant",
          text: "구매요청서 작성을 진행하겠습니다. 아래에서 구매 카테고리를 선택해 주십시오.",
          prTypeSelect: true },
      ]);
      return;
    }

    const userMsg = { id: msgIdCounter++, role: "user", text };
    setMessages(prev => [...prev, userMsg]);
    setUserInput("");
    setIsTyping(true);

    const history = messages.map(m => {
      const h = { role: m.role, content: m.text };
      // classification 메타데이터를 history에 포함 (BT 라우팅 맥락 유지)
      if (m.classification) h.classification = m.classification;
      return h;
    });

    try {
      if (phase === "pr_filling" && activePrFieldKey) {
        // ── 자율답변 모드: 특정 필드에 직접 매핑 (백엔드 호출 없이 정확도 100%) ──
        const fieldLabel = prFields[activePrFieldKey]?.label || activePrFieldKey;
        applyPrFills({ [activePrFieldKey]: text });
        setActivePrFieldKey(null);
        setPrFillingTurns(prev => prev + 1);
        setMessages(prev => [...prev, {
          id: msgIdCounter++, role: "assistant",
          text: `"${fieldLabel}" 항목에 "${text}"(을)를 입력했습니다. 다음 항목을 선택하거나 채팅으로 입력해 주세요.`,
          prInlineTabs: true,
        }]);
        setIsTyping(false);
        return;
      } else if (phase === "pr_filling") {
        // ── 일반 대화 모드: 백엔드 PR 필드 추출 ──
        setPrFillingTurns(prev => prev + 1);
        const data = await api.chat(sessionId, text, null, history, phase, {}, rfpType, prType, getPrFilledFields(), userRole, roleTurnCount);
        if (data.pr_fields && Object.keys(data.pr_fields).length > 0) {
          applyPrFills(data.pr_fields);
        }
        setMessages(prev => [...prev, {
          id: msgIdCounter++, role: "assistant",
          text: data.answer, sources: data.sources,
          rag_score: data.rag_score, trigger: data.phase_trigger,
          prInlineTabs: true,
        }]);
        if (data.phase_trigger === "pr_complete") {
          if (data.pr_request_id) setPrRequestId(data.pr_request_id);
          setTimeout(() => setPhase("pr_complete"), 800);
          setPrRightVisible(true);
        }
      } else if (phase === "rfq_filling") {
        // RFQ 필드 추출
        const rfqFilled = {};
        Object.entries(rfqFields).forEach(([k, v]) => { if ((v.value || "").trim()) rfqFilled[k] = v.value; });
        const data = await api.chat(sessionId, text, null, history, phase, {}, rfpType, prType, {}, userRole, roleTurnCount, rfqType, rfqFilled);
        if (data.rfq_fields && Object.keys(data.rfq_fields).length > 0) {
          setRfqFields(prev => {
            const updated = { ...prev };
            Object.entries(data.rfq_fields).forEach(([k, v]) => {
              if (updated[k] && v) updated[k] = { ...updated[k], value: v };
            });
            return updated;
          });
        }
        setMessages(prev => [...prev, {
          id: msgIdCounter++, role: "assistant",
          text: data.answer, sources: data.sources,
        }]);
        if (data.phase_trigger === "rfq_complete") {
          if (data.rfq_request_id) setRfqRequestId(data.rfq_request_id);
          setTimeout(() => { setPhase("rfq_complete"); setRfqRightVisible(true); }, 800);
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
            // 역할 감지 결과 반영 — 백엔드 감지 결과를 항상 저장
            if (meta.user_role) {
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
                btRouting: meta.bt_routing || m.btRouting,
              } : m
            ));
          },
          () => {
            setMessages(prev => prev.map(m =>
              m.id === aiMsgId ? { ...m, isStreaming: false } : m
            ));
            if (metaData.phase_trigger === "pr_blocked") {
              // BT-A/B/C/D: PR 차단 → 안내 메시지 + 액션버튼
              setMessages(prev => prev.map(m =>
                m.id === aiMsgId ? {
                  ...m,
                  btRouting: metaData.bt_routing,
                } : m
              ));
            } else if (metaData.phase_trigger === "pr_conditional") {
              // BT-J: 조건부 → 기존계약 확인 안내 + 액션버튼
              setMessages(prev => prev.map(m =>
                m.id === aiMsgId ? {
                  ...m,
                  btRouting: metaData.bt_routing,
                } : m
              ));
            } else if (metaData.phase_trigger === "pr_agreed") {
              // 분류 결과에 pr_template_key가 있으면 자동 선택 (카테고리 선택 스킵)
              // "구매요청서 작성하기" 메시지는 분류 안 되므로 lastClassification 우선
              const newKey = metaData.classification?.pr_template_key;
              const lastKey = lastClassification?.pr_template_key;
              const autoKey = (newKey && newKey !== "_generic" && newKey !== "") ? newKey : lastKey;
              if (autoKey && autoKey !== "_generic" && autoKey !== "" && getPrTemplate(autoKey)) {
                // 분류 성공 → 바로 PR 작성 진입
                handlePrTypeSelect(autoKey);
              } else {
                // 분류 실패/불확실 → 카테고리 선택 화면 표시
                setMessages(prev => prev.map(m =>
                  m.id === aiMsgId ? {
                    ...m,
                    text: m.text || "구매요청서 작성을 진행하겠습니다. 아래에서 구매 카테고리를 선택해 주십시오.",
                    prTypeSelect: true,
                  } : m
                ));
              }
            } else if (metaData.phase_trigger === "rfp_agreed") {
              setMessages(prev => prev.map(m =>
                m.id === aiMsgId ? { ...m, rfpTypeSelect: true } : m
              ));
            } else if (metaData.phase_trigger === "rfq_agreed") {
              // 소싱담당자 RFQ 직행 — L3 코드 기반 RFQ 템플릿 자동 선택
              const l3Code = metaData.classification?.l3_code;
              const prKey = metaData.classification?.pr_template_key;
              const rfqKey = prKey || l3Code;
              const rfqTpl = rfqKey && dbRfqTemplates?.[rfqKey];
              if (rfqTpl) {
                // RFQ 템플릿 있음 → 바로 rfq_filling 진입
                const rfqTemplateFields = {};
                Object.entries(rfqTpl.fields).forEach(([k, v]) => {
                  rfqTemplateFields[k] = { ...v };
                });
                setRfqType(rfqKey);
                setRfqFields(rfqTemplateFields);
                setPhase("rfq_filling");
                setRfqRightVisible(true);
                setPrRightVisible(false);
                setMessages(prev => prev.map(m =>
                  m.id === aiMsgId ? {
                    ...m,
                    text: `**${rfqTpl.name}** 견적서(RFQ) 작성을 시작합니다.\n소싱담당자 필수 항목을 채워주세요.`,
                  } : m
                ));
              } else {
                // RFQ 템플릿 자동매칭 실패 → 카테고리 선택기 표시
                setMessages(prev => prev.map(m =>
                  m.id === aiMsgId ? {
                    ...m,
                    text: "견적서(RFQ) 작성을 진행합니다. 아래에서 견적서 유형을 선택해 주십시오.",
                    rfqTypeSelect: true,
                  } : m
                ));
              }
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

  // ═══ PR 카테고리 선택 카드 (차세대 품목체계 L1 11개 대분류) ═══
  const PR_CATEGORY_ICONS = {
    "사무·총무":       { emoji: "📎", color: "#6B7280", bg: "#F3F4F6" },
    "인사·복리후생":    { emoji: "👥", color: "#8B5CF6", bg: "#F5F3FF" },
    "시설·건물관리":    { emoji: "🏢", color: "#0EA5A0", bg: "#F0FAFA" },
    "차량·출장":       { emoji: "✈️", color: "#3B82F6", bg: "#EFF6FF" },
    "보험 서비스":     { emoji: "🛡️", color: "#10B981", bg: "#ECFDF5" },
    "전문용역·컨설팅":  { emoji: "💼", color: "#F59E0B", bg: "#FFFBEB" },
    "마케팅":         { emoji: "📢", color: "#FB923C", bg: "#FFF7ED" },
    "IT/ICT":        { emoji: "💻", color: "#6366F1", bg: "#EEF2FF" },
    "물류":           { emoji: "🚚", color: "#14B8A6", bg: "#F0FDFA" },
    "생산관리":        { emoji: "🏭", color: "#EF4444", bg: "#FEF2F2" },
    "연구개발":        { emoji: "🔬", color: "#A855F7", bg: "#FAF5FF" },
  };

  const [prSearchTerm, setPrSearchTerm] = useState("");
  const [prOpenL1, setPrOpenL1] = useState({});

  const renderPrTypeSelector = () => {
    // DB 템플릿이 있으면 category_group별로 그루핑
    let categories = PR_CATEGORIES;
    if (dbPrTemplates && Object.keys(dbPrTemplates).length > 30) {
      const grouped = {};
      Object.entries(dbPrTemplates).forEach(([key, tpl]) => {
        if (key === "_generic") return;
        const group = tpl.category_group || "기타";
        if (!grouped[group]) grouped[group] = [];
        grouped[group].push(key);
      });
      categories = grouped;
    }

    // 검색 필터
    const term = prSearchTerm.trim().toLowerCase();
    const filteredCategories = {};
    Object.entries(categories).forEach(([cat, keys]) => {
      const filtered = keys.filter(key => {
        if (!term) return true;
        const tmpl = getPrTemplate(key);
        const name = (tmpl?.label || tmpl?.name || key).toLowerCase();
        return name.includes(term) || cat.toLowerCase().includes(term);
      });
      if (filtered.length > 0) filteredCategories[cat] = filtered;
    });

    return (
    <div style={{ marginTop:12, position:"relative", zIndex:2 }}>
      {/* 검색창 */}
      <div style={{ marginBottom:12 }}>
        <input
          value={prSearchTerm}
          onChange={e => setPrSearchTerm(e.target.value)}
          placeholder="품목명 검색 (예: 정수기, 서버, 보험...)"
          style={{
            width:"100%", padding:"10px 14px", fontSize:12, borderRadius: T.r10,
            border:`1.5px solid ${T.border}`, outline:"none", fontFamily:"inherit",
            background:"#fff", boxSizing:"border-box", transition:"border 0.2s",
          }}
          onFocus={e => e.target.style.borderColor = T.primary}
          onBlur={e => e.target.style.borderColor = T.border}
        />
      </div>

      {/* L1 아코디언 (접힘 기본, 검색 시 자동 펼침) */}
      {Object.entries(filteredCategories).map(([category, keys]) => {
        const catCfg = PR_CATEGORY_ICONS[category] || { emoji: "📦", color: T.primary, bg: T.primaryLight };
        const isOpen = term ? true : prOpenL1[category];
        return (
          <div key={category} style={{ marginBottom:8 }}>
            <div
              onClick={() => setPrOpenL1(p => ({...p, [category]: !p[category]}))}
              style={{
                fontSize:12, fontWeight:700, color: catCfg.color, padding:"8px 10px",
                display:"flex", alignItems:"center", gap:6, cursor:"pointer",
                background: catCfg.bg, borderRadius: isOpen ? `${T.r10}px ${T.r10}px 0 0` : T.r10,
                border:`1px solid ${catCfg.color}20`, transition:"all 0.2s",
              }}
            >
              <span style={{ fontSize:10, transform: isOpen ? "rotate(90deg)" : "rotate(0)", transition:"0.2s" }}>▶</span>
              <span>{catCfg.emoji}</span> {category}
              <span style={{ fontSize:10, color: T.sub, marginLeft:"auto" }}>{keys.length}개</span>
            </div>
            {isOpen && (
              <div style={{
                display:"grid", gridTemplateColumns:"1fr 1fr", gap:4, padding:6,
                border:`1px solid ${catCfg.color}15`, borderTop:"none",
                borderRadius:`0 0 ${T.r10}px ${T.r10}px`, background:"#fff",
              }}>
                {keys.map(key => {
                  const tmpl = getPrTemplate(key);
                  if (!tmpl) return null;
                  return (
                    <button
                      key={key}
                      onPointerDown={(e) => { e.stopPropagation(); handlePrTypeSelect(key); }}
                      onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
                      style={{
                        padding:"8px 6px", borderRadius: 8,
                        border:`1px solid ${T.border}`, background: T.card,
                        cursor:"pointer", fontFamily:"inherit", textAlign:"left",
                        transition:"all 0.15s", fontSize:11, fontWeight:500, color: T.text,
                        position:"relative", zIndex:3, overflow:"hidden", textOverflow:"ellipsis",
                        whiteSpace:"nowrap",
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = catCfg.color;
                        e.currentTarget.style.background = catCfg.bg;
                        e.currentTarget.style.fontWeight = "700";
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = T.border;
                        e.currentTarget.style.background = T.card;
                        e.currentTarget.style.fontWeight = "500";
                      }}
                      title={tmpl.label || tmpl.name}
                    >
                      {tmpl.label || tmpl.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
      {Object.keys(filteredCategories).length === 0 && (
        <div style={{ padding:16, textAlign:"center", color: T.sub, fontSize:12 }}>
          "{prSearchTerm}" 검색 결과가 없습니다.
        </div>
      )}
    </div>
  ); };

  // ═══ RFQ 카테고리 선택 카드 (11개 대분류 → L3 견적서 선택) ═══
  const RFQ_CATEGORY_ICONS = {
    "사무·총무":       { emoji: "📎", color: "#6B7280", bg: "#F3F4F6" },
    "인사·복리후생":    { emoji: "👥", color: "#8B5CF6", bg: "#F5F3FF" },
    "시설·건물관리":    { emoji: "🏢", color: "#0EA5A0", bg: "#F0FAFA" },
    "차량·출장":       { emoji: "✈️", color: "#3B82F6", bg: "#EFF6FF" },
    "보험 서비스":     { emoji: "🛡️", color: "#10B981", bg: "#ECFDF5" },
    "전문용역·컨설팅":  { emoji: "💼", color: "#F59E0B", bg: "#FFFBEB" },
    "마케팅":         { emoji: "📢", color: "#FB923C", bg: "#FFF7ED" },
    "IT/ICT":        { emoji: "💻", color: "#6366F1", bg: "#EEF2FF" },
    "물류":           { emoji: "🚚", color: "#14B8A6", bg: "#F0FDFA" },
    "생산관리":        { emoji: "🏭", color: "#EF4444", bg: "#FEF2F2" },
    "연구개발":        { emoji: "🔬", color: "#A855F7", bg: "#FAF5FF" },
  };

  const [rfqSearchTerm, setRfqSearchTerm] = useState("");
  const [rfqOpenL1, setRfqOpenL1] = useState({});

  const handleRfqTypeSelect = (key) => {
    const tpl = dbRfqTemplates?.[key];
    if (!tpl) return;
    const templateFields = {};
    Object.entries(tpl.fields).forEach(([k, v]) => {
      templateFields[k] = { ...v };
    });
    setRfqType(key);
    setRfqFields(templateFields);
    setPhase("rfq_filling");
    setRfqRightVisible(true);
    setPrRightVisible(false);
    setMessages(prev => [...prev, {
      id: msgIdCounter++, role: "assistant",
      text: `**${tpl.name}** 견적서(RFQ) 작성을 시작합니다.\n소싱담당자 필수 항목을 채워주세요. 채팅으로 입력하시면 자동 매핑됩니다.`,
    }]);
  };

  const renderRfqTypeSelector = () => {
    if (!dbRfqTemplates || Object.keys(dbRfqTemplates).length === 0) {
      return <div style={{ padding:16, textAlign:"center", color: T.sub, fontSize:12 }}>견적서 템플릿을 로드 중입니다...</div>;
    }
    // category_group별 그루핑
    const grouped = {};
    Object.entries(dbRfqTemplates).forEach(([key, tpl]) => {
      if (key === "_generic") return;
      const group = tpl.category_group || "기타";
      if (!grouped[group]) grouped[group] = [];
      grouped[group].push(key);
    });

    const term = rfqSearchTerm.trim().toLowerCase();
    const filtered = {};
    Object.entries(grouped).forEach(([cat, keys]) => {
      const filt = keys.filter(key => {
        if (!term) return true;
        const tpl = dbRfqTemplates[key];
        const name = (tpl?.name || key).toLowerCase();
        return name.includes(term) || cat.toLowerCase().includes(term);
      });
      if (filt.length > 0) filtered[cat] = filt;
    });

    return (
    <div style={{ marginTop:12, position:"relative", zIndex:2 }}>
      <div style={{ marginBottom:12 }}>
        <input
          value={rfqSearchTerm}
          onChange={e => setRfqSearchTerm(e.target.value)}
          placeholder="견적서 검색 (예: 사무용품, 서버, 보험...)"
          style={{
            width:"100%", padding:"10px 14px", fontSize:12, borderRadius: T.r10,
            border:`1.5px solid ${T.border}`, outline:"none", fontFamily:"inherit",
            background:"#fff", boxSizing:"border-box", transition:"border 0.2s",
          }}
          onFocus={e => e.target.style.borderColor = "#6366f1"}
          onBlur={e => e.target.style.borderColor = T.border}
        />
      </div>

      {Object.entries(filtered).map(([category, keys]) => {
        const catCfg = RFQ_CATEGORY_ICONS[category] || { emoji: "📦", color: "#6366f1", bg: "#EEF2FF" };
        const isOpen = term ? true : rfqOpenL1[category];
        return (
          <div key={category} style={{ marginBottom:8 }}>
            <div
              onClick={() => setRfqOpenL1(p => ({...p, [category]: !p[category]}))}
              style={{
                fontSize:12, fontWeight:700, color: catCfg.color, padding:"8px 10px",
                display:"flex", alignItems:"center", gap:6, cursor:"pointer",
                background: catCfg.bg, borderRadius: isOpen ? `${T.r10}px ${T.r10}px 0 0` : T.r10,
                border:`1px solid ${catCfg.color}20`, transition:"all 0.2s",
              }}
            >
              <span style={{ fontSize:10, transform: isOpen ? "rotate(90deg)" : "rotate(0)", transition:"0.2s" }}>▶</span>
              <span>{catCfg.emoji}</span> {category}
              <span style={{ fontSize:10, color: T.sub, marginLeft:"auto" }}>{keys.length}개</span>
            </div>
            {isOpen && (
              <div style={{
                display:"grid", gridTemplateColumns:"1fr 1fr", gap:4, padding:6,
                border:`1px solid ${catCfg.color}15`, borderTop:"none",
                borderRadius:`0 0 ${T.r10}px ${T.r10}px`, background:"#fff",
              }}>
                {keys.map(key => {
                  const tpl = dbRfqTemplates[key];
                  if (!tpl) return null;
                  return (
                    <button
                      key={key}
                      onPointerDown={(e) => { e.stopPropagation(); handleRfqTypeSelect(key); }}
                      onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
                      style={{
                        padding:"8px 6px", borderRadius: 8,
                        border:`1px solid ${T.border}`, background: T.card,
                        cursor:"pointer", fontFamily:"inherit", textAlign:"left",
                        transition:"all 0.15s", fontSize:11, fontWeight:500, color: T.text,
                        position:"relative", zIndex:3, overflow:"hidden", textOverflow:"ellipsis",
                        whiteSpace:"nowrap",
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = catCfg.color;
                        e.currentTarget.style.background = catCfg.bg;
                        e.currentTarget.style.fontWeight = "700";
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = T.border;
                        e.currentTarget.style.background = T.card;
                        e.currentTarget.style.fontWeight = "500";
                      }}
                      title={tpl.name}
                    >
                      {tpl.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
      {Object.keys(filtered).length === 0 && (
        <div style={{ padding:16, textAlign:"center", color: T.sub, fontSize:12 }}>
          "{rfqSearchTerm}" 검색 결과가 없습니다.
        </div>
      )}
    </div>
  ); };

  // ── PR 필드별 선택 옵션 생성 (퀵필 카드 + 패널 모두 사용) ──
  const getPrFieldOptions = (key, f) => {
    const label = (f.label || "").toLowerCase();
    // c1~c5 요청자 정보: 탭 불필요
    if (["c1","c2","c3","c4","c5"].includes(key)) return [];

    // 카테고리별 특화 옵션 조회
    const catGroup = prType ? getCategoryGroup(prType, dbPrTemplates, PR_CATEGORIES) : null;
    const catOpts = catGroup ? CATEGORY_FIELD_OPTIONS[catGroup] : null;

    // ── 공통 필드 (c6~c20) ──
    // c6 서비스/품목명
    if (key === "c6") return f.default ? [f.default] : [];
    // c7 구매/계약 목적
    if (key === "c7") return f.default ? [f.default] : [];
    // c8 계약 유형 — 카테고리별 특화
    if (key === "c8")
      return catOpts?.c8 || ["단가 계약", "연간 구독/위탁", "렌탈", "도급 계약"];
    // c9 계약 기간
    if (key === "c9")
      return ["12개월", "24개월", "36개월", "48개월"];
    // c10 대상 규모/수량 — 카테고리별 특화
    if (key === "c10")
      return catOpts?.c10 || ["5대 미만", "10대 미만", "20대 미만", "기타"];
    // c11 서비스 범위/요구 사양
    if (key === "c11") return f.default ? [f.default] : [];
    // c12 제공/수행 방식
    if (key === "c12") return f.default ? [f.default] : [];
    // c13 품질/SLA 기준 — 카테고리별 특화
    if (key === "c13")
      return catOpts?.c13 || ["24시간 내 대응", "월간 리포트 제공", "정기 평가"];
    // c14 보안/법적 요건
    if (key === "c14")
      return ["개인정보보호법 준수", "보안서약서 징구", "해당 없음"];
    // c15 단가 산정 방식 — 카테고리별 특화
    if (key === "c15")
      return catOpts?.c15 || ["월 정액제", "건당 단가", "인건비 기반", "실비 정산"];
    // c16 구간 할인
    if (key === "c16")
      return ["수량 할인 적용", "연간 계약 할인", "해당 없음"];
    // c17 결제 주기
    if (key === "c17")
      return ["월별 후불", "분기별 후불", "선불 (연납)"];
    // c18 단가 인상 조건
    if (key === "c18")
      return ["CPI 연동 연 1회", "계약 기간 내 동결", "협의"];
    // c19 해지/위약금
    if (key === "c19")
      return ["30일 전 서면 통보", "위약금 없음", "잔여 기간 ×10%"];
    // c20 BSM/전산 연동
    if (key === "c20")
      return ["ERP 연동 필요", "API 연동", "해당 없음"];

    // ── 고유 필드 (p*) — description 체크박스 파싱 + 라벨 키워드 기반 ──
    if (key.startsWith("p")) {
      // 1순위: description에서 ☐ 옵션 추출 (Excel 원본 구조)
      const desc = f.description || "";
      if (desc.includes("☐")) {
        const checkboxOpts = desc.match(/☐\s*([^☐()\n]{2,30})/g);
        if (checkboxOpts && checkboxOpts.length >= 2) {
          const opts = checkboxOpts
            .map(o => o.replace("☐", "").trim())
            .filter(o => o.length >= 2 && o.length <= 25)
            .slice(0, 5);
          if (opts.length >= 2) return opts;
        }
      }

      // 2순위: 라벨 키워드 매칭
      // 수량/인원/대수
      if (label.includes("수량") || label.includes("인원") || label.includes("대수"))
        return f.default ? [f.default, "기타"] : ["5대 미만", "10~20대", "30대 이상", "기타"];
      // 희망일/시작일/착공일
      if (label.includes("희망일") || label.includes("시작")) {
        const d1 = new Date(); d1.setDate(d1.getDate() + 14);
        const d2 = new Date(); d2.setDate(d2.getDate() + 30);
        return [d1.toLocaleDateString("ko-KR"), d2.toLocaleDateString("ko-KR"), "협의"];
      }
      // 방식 (교육, 제공, 수행)
      if (label.includes("방식"))
        return f.default ? [f.default, "협의"] : ["온라인", "오프라인", "혼합", "협의"];
      // 기간/약정
      if (label.includes("기간") || label.includes("약정"))
        return ["12개월", "24개월", "36개월", "60개월"];
      // 여부/포함
      if (label.includes("여부") || label.includes("포함"))
        return f.default ? [f.default] : ["포함", "미포함", "협의"];
      // 유형/선택
      if (label.includes("유형") || label.includes("선택"))
        return f.default ? [f.default, "기타"] : [];
      // 장소/사업장
      if (label.includes("장소") || label.includes("사업장"))
        return f.default ? [f.default] : ["본사", "전 사업장", "협의"];
      // 주기 (교체/관리/점검)
      if (label.includes("주기") || label.includes("교체"))
        return ["3개월", "6개월", "12개월", "협의"];
      // 예산/비용/금액
      if (label.includes("예산") || label.includes("비용") || label.includes("금액"))
        return f.default ? [f.default] : [];
      // SLA/지표
      if (label.includes("sla") || label.includes("지표"))
        return f.default ? [f.default] : [];
      // 기본값이 있으면 탭으로
      if (f.default) return [f.default];
    }
    return [];
  };

  // ── PR 인라인 탭: AI 응답 아래에 사용자 미확인 필드 탭 표시 (최대 5개) ──
  const renderPrInlineTabs = () => {
    if (!prType || !prFields || Object.keys(prFields).length === 0) return null;
    // 사용자가 아직 확인하지 않은 필수 필드 (c1~c5 제외)
    const unconfirmed = Object.entries(prFields)
      .filter(([k, f]) => f.required !== false && !PR_SKIP_KEYS.has(k) && !prUserFilledKeys.has(k));
    if (unconfirmed.length === 0) return null;

    // 1개만 표시 (옵션 있는 필드 우선)
    const withOpts = unconfirmed.filter(([k, f]) => getPrFieldOptions(k, f).length > 0);
    const [fk, f] = withOpts.length > 0 ? withOpts[0] : unconfirmed[0];
    const opts = getPrFieldOptions(fk, f);
    const currentVal = (f.value || "").trim();

    return (
      <div style={{ marginTop:10 }}>
        <div style={{ fontSize:10, fontWeight:600, color: T.sub, marginBottom:6 }}>
          다음 항목을 입력해 주세요 ({unconfirmed.length}개 남음)
        </div>
        <div style={{
          background: "rgba(6,182,212,0.04)",
          border: "1px solid rgba(6,182,212,0.12)",
          borderRadius: 10, padding:"8px 12px",
        }}>
          <div style={{ fontSize:11, fontWeight:700, color: T.primary, marginBottom:5, display:"flex", alignItems:"center", gap:4 }}>
            <span style={{ color: T.red, fontSize:10 }}>*</span>
            {f.label}
            {currentVal && <span style={{ fontSize:10, fontWeight:500, color: T.sub, marginLeft:"auto" }}>현재: {currentVal}</span>}
          </div>
          <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
            {opts.map((opt, i) => (
              <button
                key={i}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  applyPrFills({ [fk]: opt });
                  setPrFillingTurns(prev => prev + 1);
                }}
                style={{
                  padding:"5px 11px", borderRadius:14, fontSize:11, fontWeight:600,
                  border: `1px solid ${opt === currentVal ? T.primary : "rgba(6,182,212,0.2)"}`,
                  background: opt === currentVal ? "rgba(14,165,160,0.1)" : "rgba(255,255,255,0.8)",
                  color: opt === currentVal ? T.primary : T.text,
                  cursor:"pointer", fontFamily:"inherit", transition:"all 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(6,182,212,0.1)"; e.currentTarget.style.borderColor = T.primary; }}
                onMouseLeave={e => { e.currentTarget.style.background = opt === currentVal ? "rgba(14,165,160,0.1)" : "rgba(255,255,255,0.8)"; e.currentTarget.style.borderColor = opt === currentVal ? T.primary : "rgba(6,182,212,0.2)"; }}
              >{opt}</button>
            ))}
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setActivePrFieldKey(fk);
                inputRef.current?.focus();
              }}
              style={{
                padding:"5px 11px", borderRadius:14, fontSize:11, fontWeight:600,
                border:`1px dashed ${activePrFieldKey === fk ? T.primary : "rgba(100,116,139,0.3)"}`,
                background: activePrFieldKey === fk ? "rgba(14,165,160,0.08)" : "transparent",
                color: activePrFieldKey === fk ? T.primary : T.muted,
                cursor:"pointer", fontFamily:"inherit", transition:"all 0.15s",
              }}
            >직접 입력</button>
          </div>
        </div>
      </div>
    );
  };

  // ── PR 퀵필 카드: 필수 항목을 탭 형태로 선택 (c1~c5 제외) ──
  const renderPrQuickFillCards = () => {
    if (!prType || !prFields || Object.keys(prFields).length === 0) return null;
    // c1~c5 제외, 필수 필드 중 미완성만
    const unfilledFields = Object.entries(prFields)
      .filter(([k, f]) => f.required !== false && !PR_SKIP_KEYS.has(k) && !(f.value || "").trim());
    if (unfilledFields.length === 0) return null;

    // 옵션 있는 필드 우선 표시 (탭 선택 가능한 항목 먼저)
    const withOpts = unfilledFields.filter(([k, f]) => getPrFieldOptions(k, f).length > 0);
    const [fk, f] = withOpts.length > 0 ? withOpts[0] : unfilledFields[0];
    const opts = getPrFieldOptions(fk, f);

    return (
      <div style={{ marginTop:12 }}>
        <div style={{ fontSize:10, color: T.sub, marginBottom:6 }}>
          필수 항목 {unfilledFields.length}개 남음
        </div>
        <div style={{
          background: "rgba(6,182,212,0.04)",
          border: "1px solid rgba(6,182,212,0.12)",
          borderRadius: 10, padding:"10px 14px",
        }}>
          <div style={{ fontSize:11, fontWeight:700, color: T.primary, marginBottom:6, display:"flex", alignItems:"center", gap:4 }}>
            <span style={{ color: T.red, fontSize:10 }}>*</span>
            {f.label}
          </div>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
            {opts.map((opt, i) => (
              <button
                key={i}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  applyPrFills({ [fk]: opt });
                  setPrFillingTurns(prev => prev + 1);
                }}
                style={{
                  padding:"6px 12px", borderRadius:16, fontSize:11, fontWeight:600,
                  border:"1px solid rgba(6,182,212,0.2)", background:"rgba(255,255,255,0.8)",
                  color: T.text, cursor:"pointer", fontFamily:"inherit", transition:"all 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(6,182,212,0.1)"; e.currentTarget.style.borderColor = T.primary; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.8)"; e.currentTarget.style.borderColor = "rgba(6,182,212,0.2)"; }}
              >{opt}</button>
            ))}
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setActivePrFieldKey(fk);
                inputRef.current?.focus();
              }}
              style={{
                padding:"6px 12px", borderRadius:16, fontSize:11, fontWeight:600,
                border:`1px dashed ${activePrFieldKey === fk ? T.primary : "rgba(100,116,139,0.3)"}`,
                background: activePrFieldKey === fk ? "rgba(14,165,160,0.08)" : "transparent",
                color: activePrFieldKey === fk ? T.primary : T.muted,
                cursor:"pointer", fontFamily:"inherit", transition:"all 0.15s",
              }}
            >직접 입력</button>
          </div>
        </div>
      </div>
    );
  };

  // ── RFP 필드별 선택 옵션 생성 ──
  const getRfpFieldOptions = (key, f) => {
    const label = (f.label || "").toLowerCase();
    // 발주기관 정보(s1~s5): 탭 불필요
    if (["s1","s2","s3","s4","s5"].includes(key)) return [];

    // ── 계약/사업 개요 ──
    // 계약형태 / 계약유형 / 리스/렌탈 형태
    if (label.includes("형태") || (label.includes("계약") && label.includes("유형")))
      return ["순수 렌탈 (반납)", "리스 (인수 옵션)", "도급 계약", "연간 구독/위탁"];
    // 기간 (계약/수행/공사/유지보수)
    if (label.includes("기간"))
      return ["12개월", "24개월", "36개월", "48개월"];
    // 수량
    if (label.includes("수량"))
      return ["5대 미만", "10대 미만", "20대 미만", "기타"];
    // 대상 규모 / 대상인원
    if (label.includes("규모"))
      return ["5대 미만", "10대 미만", "20대 미만", "기타"];
    if (label.includes("인원"))
      return ["10명 이내", "10~50명", "50~100명", "100명 이상"];
    // 투입 인력
    if (label.includes("투입") && label.includes("인력"))
      return ["1~2명", "3~5명", "5~10명", "10명 이상"];

    // ── 납품/배송 ──
    if (label.includes("납품") && label.includes("기한"))
      return ["1주 이내", "2주 이내", "1개월 이내", "협의"];
    if (label.includes("납품") && label.includes("조건"))
      return ["지정 장소 납품", "택배 배송", "직접 설치", "협의"];

    // ── 서비스/수행 방식 ──
    if (label.includes("방식") && (label.includes("수행") || label.includes("제공")))
      return ["상주", "원격", "상주+원격 혼합", "정기 방문"];

    // ── 품질/SLA ──
    if (label.includes("sla") || label.includes("품질"))
      return ["24시간 내 대응", "99.9% 가용성", "월간 리포트"];
    if (label.includes("안전") && label.includes("기준"))
      return ["산업안전보건법 준수", "안전관리자 배치", "KOSHA-MS 인증"];

    // ── 보안 ──
    if (label.includes("보안") || label.includes("기밀"))
      return ["개인정보보호법 준수", "보안서약서 징구", "해당 없음"];

    // ── 반납/인수 ──
    if (label.includes("반납") || label.includes("인수"))
      return ["반납 (원상복구)", "인수 (잔존가 정산)", "재계약 협의"];
    // 중도 해지
    if (label.includes("해지"))
      return ["30일 전 서면 통보", "위약금 없음", "잔여 기간 ×10%"];
    // 잔존 가치
    if (label.includes("잔존"))
      return ["감가상각 후 무상 이전", "시장가 정산", "협의"];
    // 소모품 포함
    if (label.includes("소모품"))
      return ["렌탈료 포함", "별도 과금", "협의"];
    // 장애 대응
    if (label.includes("장애"))
      return ["신고 후 4시간 내 대응", "24시간 내 대체기 제공", "원격 즉시 대응"];
    // A/S 조건
    if (label.includes("a/s"))
      return ["무상 1년", "무상 2년", "유상 A/S"];
    // 리스 조건
    if (label.includes("리스") && label.includes("조건"))
      return ["운용 리스", "금융 리스", "협의"];

    // ── 평가 기준 (%) ──
    if (label.includes("평가"))
      return ["25%", "30%", "20%", "15%"];

    // ── 제출 ──
    if (label.includes("제출") && label.includes("기한")) {
      const d1 = new Date(); d1.setDate(d1.getDate() + 14);
      const d2 = new Date(); d2.setDate(d2.getDate() + 21);
      return [d1.toLocaleDateString("ko-KR"), d2.toLocaleDateString("ko-KR")];
    }
    if (label.includes("제출") && label.includes("방식"))
      return ["이메일 제출", "온라인 시스템", "우편 + 전자본"];

    // ── 목적 ──
    if (label.includes("목적"))
      return ["업무 환경 개선", "비용 절감", "생산성 향상", "법적 의무"];

    // 기타: 선택지 없음
    return [];
  };

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
                  const rfpEmpty = !(f.value || "").trim();
                  const rfpOpts = rfpEmpty ? getRfpFieldOptions(fk, f) : [];
                  return (
                    <div key={fk} ref={el => fieldRefs.current[fk] = el} style={{
                      borderBottom: fi < sec.fields.length-1 ? `1px solid ${T.borderLight}` : "none",
                      animation: isNew ? "field-highlight 2.5s ease forwards" : "none",
                      background: fi % 2 === 1 ? "rgba(14,165,160,0.02)" : "transparent",
                    }}>
                      <div style={{ display:"flex", alignItems:"flex-start" }}>
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
                      {/* RFP 필드 선택 탭 */}
                      {rfpOpts.length > 0 && (
                        <div style={{ padding:"4px 8px 8px 144px", display:"flex", gap:4, flexWrap:"wrap" }}>
                          {rfpOpts.map((opt, oi) => (
                            <button
                              key={oi}
                              onMouseDown={(e) => { e.preventDefault(); handleFieldEdit(fk, opt); }}
                              style={{
                                padding:"4px 10px", borderRadius:12, fontSize:10, fontWeight:600,
                                border:`1px solid rgba(14,165,160,0.2)`, background:"rgba(14,165,160,0.04)",
                                color: T.primary, cursor:"pointer", fontFamily:"inherit", transition:"all 0.15s",
                              }}
                              onMouseEnter={e => { e.currentTarget.style.background = "rgba(14,165,160,0.12)"; e.currentTarget.style.borderColor = T.primary; }}
                              onMouseLeave={e => { e.currentTarget.style.background = "rgba(14,165,160,0.04)"; e.currentTarget.style.borderColor = "rgba(14,165,160,0.2)"; }}
                            >{opt}</button>
                          ))}
                        </div>
                      )}
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
          onClick={previewRfp}
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
        <button onClick={previewRfp} style={{
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
          const tmpl = RFP_TEMPLATES[rfpType];
          if (tmpl) downloadRfpPdf(fields, tmpl.sections, tmpl.label, fields.s1?.value);
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

  // ══ RFQ 패널: 견적서 작성 ══
  const rfqTemplate = rfqType && dbRfqTemplates ? dbRfqTemplates[rfqType] : null;
  const rfqSections = rfqTemplate?.sections || [];
  const rfqFilled = Object.values(rfqFields).filter(f => f.zone !== "supplier" && (f.value || "").trim()).length;
  const rfqTotal = Object.values(rfqFields).filter(f => f.zone !== "supplier").length;
  const rfqPct = rfqTotal > 0 ? Math.round(rfqFilled / rfqTotal * 100) : 0;
  const rfqRequiredFilled = Object.entries(rfqFields).filter(([, f]) => f.zone !== "supplier" && f.required !== false && (f.value || "").trim()).length;
  const rfqRequiredTotal = Object.entries(rfqFields).filter(([, f]) => f.zone !== "supplier" && f.required !== false).length;

  const [rfqOpenSec, setRfqOpenSec] = useState({0:true,1:true,2:true,3:true,4:true});

  const RfqPanelFilling = () => (
    <div className="custom-scroll" style={{ flex:1, overflowY:"auto", padding:"20px 22px" }}>
      {/* 진행률 */}
      <div style={{
        background: `linear-gradient(135deg, rgba(99,102,241,0.06) 0%, rgba(129,140,248,0.04) 100%)`,
        borderRadius: T.r16, padding:"16px 20px", marginBottom:16,
        border: `1px solid rgba(99,102,241,0.12)`,
      }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
          <span style={{ fontSize:12, fontWeight:700, color: T.text }}>견적서(RFQ) 완성도</span>
          <span style={{
            fontSize:11, fontWeight:700, padding:"4px 12px", borderRadius:20,
            background: rfqPct >= 80 ? T.greenLight : 'rgba(255,255,255,0.8)',
            color: rfqPct >= 80 ? T.greenDark : '#6366f1',
          }}>필수 {rfqRequiredFilled}/{rfqRequiredTotal} · {rfqPct}%</span>
        </div>
        <div style={{ height:8, background:"rgba(255,255,255,0.7)", borderRadius:4, overflow:"hidden" }}>
          <div style={{
            height:"100%", width:`${rfqPct}%`, borderRadius:4,
            background: `linear-gradient(90deg, #6366f1, #818cf8)`,
            transition:"width 0.6s ease",
          }} />
        </div>
      </div>

      {/* 섹션 아코디언 */}
      {rfqSections.map((sec, si) => {
        const isSupplier = sec.supplier_zone;
        const isCommon = sec.common;
        const secDone = sec.fields.every(f => rfqFields[f]?.value);
        const headerBg = isSupplier ? 'rgba(245,158,11,0.06)' : isCommon ? 'rgba(14,165,160,0.06)' : secDone ? 'rgba(16,185,129,0.04)' : 'rgba(99,102,241,0.04)';
        const headerBorder = isSupplier ? 'rgba(245,158,11,0.2)' : isCommon ? 'rgba(14,165,160,0.2)' : secDone ? 'rgba(16,185,129,0.15)' : 'rgba(99,102,241,0.12)';
        return (
          <div key={si} style={{ marginBottom:10 }}>
            <div
              onClick={() => setRfqOpenSec(p => ({...p,[si]:!p[si]}))}
              style={{
                display:"flex", alignItems:"center", gap:8, padding:"10px 16px",
                background: headerBg,
                borderRadius: rfqOpenSec[si] ? `${T.r10}px ${T.r10}px 0 0` : T.r10,
                cursor:"pointer", border:`1px solid ${headerBorder}`,
                transition:"all 0.2s",
              }}
            >
              <span style={{ fontSize:10, transform: rfqOpenSec[si] ? "rotate(90deg)" : "rotate(0)", transition:"0.2s" }}>▶</span>
              <span style={{ flex:1, fontSize:12, fontWeight:700, color: isSupplier ? '#92400E' : T.navy }}>{sec.title}</span>
              {!isSupplier && secDone && <span style={{ fontSize:10, color: T.greenDark, fontWeight:700 }}>✓</span>}
              {isSupplier && <span style={{ fontSize:9, color: '#92400E', fontWeight:600 }}>선택</span>}
              <span style={{ fontSize:10, color: T.sub }}>
                {sec.fields.filter(f => (rfqFields[f]?.value || "").trim()).length}/{sec.fields.length}
              </span>
            </div>
            {rfqOpenSec[si] && (
              <div style={{
                border:`1px solid ${isSupplier ? 'rgba(245,158,11,0.15)' : 'rgba(99,102,241,0.08)'}`, borderTop:"none",
                borderRadius:`0 0 ${T.r10}px ${T.r10}px`, overflow:"hidden",
              }}>
                {/* 공급업체 섹션 안내 배너 */}
                {isSupplier && (
                  <div style={{ padding:"10px 16px", background:"#FEF3C7", fontSize:11, color:"#92400E", borderBottom:`1px solid #FDE68A` }}>
                    📦 이 영역은 공급업체가 작성하는 란입니다. 소싱담당자는 입력하지 않아도 됩니다.
                  </div>
                )}
                {sec.fields.map(fk => {
                  const f = rfqFields[fk];
                  if (!f) return null;
                  return (
                    <div key={fk} style={{
                      padding:"10px 16px", borderBottom:`1px solid ${T.border}`,
                      background: isSupplier ? 'rgba(254,243,199,0.15)' : (f.value || "").trim() ? 'rgba(16,185,129,0.02)' : '#fff',
                    }}>
                      <div style={{ fontSize:11, fontWeight:600, color: isSupplier ? '#92400E' : T.navy, marginBottom:4, display:"flex", alignItems:"center", gap:4 }}>
                        {f.label}
                        {!isSupplier && f.required !== false && <span style={{ color: T.red, fontSize:10 }}>*</span>}
                      </div>
                      {f.description && <div style={{ fontSize:10, color: T.sub, marginBottom:4 }}>{f.description.slice(0, 80)}</div>}
                      <input
                        value={f.value || ""}
                        onChange={e => {
                          const val = e.target.value;
                          setRfqFields(prev => ({ ...prev, [fk]: { ...prev[fk], value: val } }));
                        }}
                        placeholder={isSupplier ? "공급업체 기재란" : (f.default || "입력하세요")}
                        style={{
                          width:"100%", padding:"8px 10px", fontSize:12, border:`1px solid ${T.border}`,
                          borderRadius:6, outline:"none", fontFamily:"inherit",
                          background: isSupplier ? '#FFFBEB' : '#fff',
                          boxSizing:"border-box",
                        }}
                        onFocus={e => e.target.style.borderColor = isSupplier ? '#F59E0B' : '#6366f1'}
                        onBlur={e => e.target.style.borderColor = T.border}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* 하단 버튼: RFP와 동일 스타일 (초안 다운로드 | RFQ 완료) */}
      <div style={{ display:"flex", gap:8, marginTop:12 }}>
        <button onClick={() => {
          downloadRfqPdf(rfqFields, rfqSections, rfqTemplate?.name, rfqFields.rq1?.value);
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
          disabled={rfqPct < 100}
          onClick={() => { if (rfqPct >= 100) { setPhase("rfq_complete"); } }}
          style={{
            flex:1, padding:"12px", borderRadius: T.r10,
            border:"none",
            background: rfqPct >= 100 ? T.gradPrimary : T.borderLight,
            color: rfqPct >= 100 ? "#fff" : T.muted,
            fontSize:12, fontWeight:700, fontFamily:"inherit",
            cursor: rfqPct >= 100 ? "pointer" : "not-allowed",
            display:"flex", alignItems:"center", justifyContent:"center", gap:5,
            transition:"all 0.3s",
            boxShadow: rfqPct >= 100 ? T.shadowBlue : "none",
          }}
        ><IconSendMail size={13} /> {rfqPct >= 100 ? "RFQ 완료 / 발송" : "RFQ 발송"}</button>
      </div>
      <div style={{ height:20 }} />
    </div>
  );

  const RfqPanelComplete = () => (
    <div className="custom-scroll" style={{ flex:1, overflowY:"auto", padding:"20px 22px" }}>
      {/* 성공 배너 */}
      <div style={{
        background: `linear-gradient(135deg, rgba(16,185,129,0.08), rgba(99,102,241,0.06))`,
        borderRadius: T.r16, padding:"18px 22px", marginBottom:18,
        border:`1.5px solid rgba(16,185,129,0.15)`,
        display:"flex", alignItems:"center", gap:14,
      }}>
        <IconParty size={32} />
        <div>
          <div style={{ fontSize:14, fontWeight:800, color: T.greenDark }}>견적서(RFQ) 작성 완료!</div>
          <div style={{ fontSize:11, color:"#16a34a", marginTop:3 }}>RFP로 전환하거나 미리보기로 확인하세요.</div>
        </div>
      </div>

      {/* 문서 헤더 */}
      <div style={{
        background: 'rgba(255,255,255,0.8)', borderRadius: T.r16, padding:"22px 28px", textAlign:"center",
        marginBottom:16, border:`1.5px solid rgba(99,102,241,0.15)`,
        boxShadow:'0 2px 12px rgba(99,102,241,0.06)',
        position:"relative", overflow:"hidden",
      }}>
        <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background: "linear-gradient(90deg, #6366f1, #818cf8)" }} />
        <div style={{ fontSize:10, letterSpacing:3, color: T.sub, marginBottom:8 }}>표준 견적서 양식</div>
        <div style={{ fontSize:20, fontWeight:900, letterSpacing:4, color: T.navy }}>견 적 요 청 서</div>
        {rfqTemplate && (
          <div style={{ marginTop:12 }}>
            <span style={{ fontSize:12, fontWeight:700, padding:"4px 14px", background:"rgba(99,102,241,0.08)", color:"#6366f1", borderRadius:8 }}>
              {rfqTemplate.name}
            </span>
          </div>
        )}
      </div>

      {/* 섹션 요약 */}
      {rfqSections.map((sec, si) => (
        <div key={si} style={{ marginBottom:12 }}>
          <div style={{
            background: 'rgba(99,102,241,0.04)', padding:"10px 16px",
            display:"flex", alignItems:"center", gap:8,
            borderRadius:`${T.r10}px ${T.r10}px 0 0`,
            border:`1px solid rgba(99,102,241,0.08)`,
          }}>
            <span style={{ fontSize:12, fontWeight:700, color: T.navy }}>{sec.title}</span>
            <span style={{ fontSize:10, color: T.greenDark, fontWeight:700 }}>완료 ✓</span>
          </div>
          <div style={{
            background: 'rgba(255,255,255,0.7)', border:`1px solid rgba(99,102,241,0.08)`, borderTop:"none",
            borderRadius:`0 0 ${T.r10}px ${T.r10}px`, overflow:"hidden",
          }}>
            {sec.fields.map(fk => {
              const f = rfqFields[fk];
              if (!f) return null;
              return (
                <div key={fk} style={{ padding:"8px 16px", borderBottom:`1px solid ${T.border}`, fontSize:12, display:"flex", gap:8 }}>
                  <span style={{ fontWeight:600, color: T.navy, minWidth:100 }}>{f.label}</span>
                  <span style={{ color: T.text }}>{f.value || "-"}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* 하단 3버튼: RFP Complete와 동일 (미리보기 | PDF 다운로드 | RFP 전환) */}
      <div style={{ marginTop:16, display:"flex", gap:8 }}>
        <button onClick={() => previewRfq(rfqFields, rfqSections, rfqTemplate?.name)} style={{
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
          downloadRfqPdf(rfqFields, rfqSections, rfqTemplate?.name, rfqFields.rq1?.value);
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
        <button onClick={convertRfqToRfp} style={{
          flex:1, padding:"14px", borderRadius: T.r10,
          border:"none", background: T.gradPrimary,
          color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit",
          display:"flex", alignItems:"center", justifyContent:"center", gap:6,
          transition:"all 0.3s", boxShadow: T.shadowBlue,
        }}
          onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.02)"; }}
          onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
        >
          <IconSendMail size={13} /> RFP 전환
        </button>
      </div>
      <div style={{ height:20 }} />
    </div>
  );

  // ══ RFQ → RFP 전환 ══
  const convertRfqToRfp = () => {
    // RFQ 필드에서 RFP로 매핑 가능한 값 추출
    const mapping = getPrToRfpMapping(rfqType || prType);
    if (!mapping) return;

    const rfpTemplateFields = {};
    Object.entries(RFP_TEMPLATES[mapping.rfpType]?.fields || {}).forEach(([k, v]) => {
      rfpTemplateFields[k] = { ...v };
    });

    // RFQ 값 중 매칭 가능한 것을 RFP에 복사
    // 먼저 PR에서 온 공통필드(c→s) 매핑
    if (prFields && Object.keys(prFields).length > 0) {
      Object.entries(mapping.fieldMap).forEach(([prKey, rfpKey]) => {
        if (prFields[prKey]?.value && rfpTemplateFields[rfpKey]) {
          rfpTemplateFields[rfpKey] = { ...rfpTemplateFields[rfpKey], value: prFields[prKey].value };
        }
      });
    }

    setRfpType(mapping.rfpType);
    setFields(rfpTemplateFields);
    setPhase("filling");
    setRightVisible(true);
    setRfqRightVisible(false);

    const rfpLabel = RFP_TEMPLATES[mapping.rfpType]?.label || "제안요청서";
    setMessages(prev => [
      ...prev,
      { id: msgIdCounter++, role: "assistant", text: `견적서(RFQ) 내용을 기반으로 **${rfpLabel}** 제안요청서(RFP)를 준비했습니다.\n자동 매핑된 항목을 확인하시고, 추가 정보를 입력해 주세요.` }
    ]);
  };

  // ══ 오른쪽 패널: 추천 업체 (DB + 업무마켓9 통합) ══
  const [dbSuppliers, setDbSuppliers] = useState([]);

  // RFP 완료 시 키워드 기반 공급업체 검색
  useEffect(() => {
    if (phase === "complete" && emailSent && rfpType) {
      // fields에서 서비스명/품목명/사업명 등 키워드 추출
      const keywordFields = ["s6", "s7", "s10", "s11"];
      const keywords = keywordFields
        .map(k => (fields[k]?.value || "").trim())
        .filter(Boolean)
        .join(",");

      if (keywords) {
        // 키워드로 전체 공급업체 검색 (카테고리 필터 없이)
        api.searchSuppliers("", keywords).then(res => {
          setDbSuppliers(res.suppliers || []);
        }).catch(() => setDbSuppliers([]));
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

                {/* 분류 결과 — 대분류·중분류만 간결 표시 */}
                {msg.classification && msg.classification["대분류"] && (
                  <div style={{
                    display:"flex", gap:6, flexWrap:"wrap", marginBottom:2,
                  }}>
                    <span style={{
                      fontSize:10, fontWeight:600, padding:"3px 10px", borderRadius:12,
                      background: 'rgba(14,165,160,0.08)', color: T.primary,
                      border: `1px solid rgba(14,165,160,0.15)`,
                    }}>{msg.classification["대분류"]}</span>
                    {msg.classification["중분류"] && (
                      <span style={{
                        fontSize:10, fontWeight:600, padding:"3px 10px", borderRadius:12,
                        background: 'rgba(14,165,160,0.05)', color: T.sub,
                        border: `1px solid ${T.border}`,
                      }}>{msg.classification["중분류"]}</span>
                    )}
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

                {/* BT 라우팅 안내 카드 (v2: 분기1 5-path + 분기2 소싱) */}
                {msg.btRouting && !msg.isStreaming && (() => {
                  const bt = msg.btRouting;
                  const b1 = bt.branch1_path || "";
                  const b2 = bt.branch2_sourcing || "";
                  const isBlocked = bt.pr_action === "blocked";
                  const isConditional = bt.pr_action === "conditional";
                  const isAllowed = bt.pr_action === "allowed";

                  // 분기1별 스타일
                  const pathStyle = {
                    "A_카탈로그직접발주": { bg: "linear-gradient(135deg, #ECFDF5, #D1FAE5)", border: "#A7F3D0", badge: "#059669", label: "카탈로그" },
                    "B_주관부서신청": { bg: "linear-gradient(135deg, #FEF2F2, #FFF7ED)", border: "#FECACA", badge: "#DC2626", label: "주관부서" },
                    "D_조건부_기존계약확인": { bg: "linear-gradient(135deg, #FFFBEB, #FEF3C7)", border: "#FDE68A", badge: "#D97706", label: "계약확인" },
                    "E_PR작성_주관부서있음": { bg: "linear-gradient(135deg, #EFF6FF, #DBEAFE)", border: "#BFDBFE", badge: "#2563EB", label: "PR+부서" },
                    "F_PR작성_주관부서없음": { bg: "linear-gradient(135deg, #EFF6FF, #DBEAFE)", border: "#BFDBFE", badge: "#2563EB", label: "PR" },
                  }[b1] || { bg: "#F9FAFB", border: "#E5E7EB", badge: "#6B7280", label: bt.bt_type };

                  // 분기2 소싱 라벨
                  const sourcingLabel = { "2A_PR만": "PR만 (소싱불필요)", "2B_RFQ": "RFQ 3사 경쟁견적", "2C_RFP입찰": "RFP 기술+가격 입찰" }[b2];

                  // blocked/conditional/allowed 중 카드 표시 조건: 항상 표시 (분기 정보 제공)
                  if (!isBlocked && !isConditional && !sourcingLabel) return null;

                  return (
                    <div style={{
                      marginTop: 10, padding: "12px 14px", borderRadius: T.r12,
                      background: pathStyle.bg,
                      border: `1px solid ${pathStyle.border}`,
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: "2px 8px",
                            borderRadius: T.r6, background: `${pathStyle.badge}15`, color: pathStyle.badge,
                          }}>
                            {pathStyle.label}
                          </span>
                          <span style={{ fontSize: 10, color: "#6B7280", fontWeight: 500 }}>
                            {bt.bt_type} · {bt.gt_code}
                          </span>
                          {bt.dept && bt.dept !== "—" && (
                            <span style={{ fontSize: 10, color: "#6B7280" }}>· {bt.dept}</span>
                          )}
                          {sourcingLabel && isAllowed && (
                            <span style={{
                              fontSize: 9, fontWeight: 600, padding: "2px 6px",
                              borderRadius: T.r6, background: "#DBEAFE", color: "#1D4ED8",
                            }}>
                              {sourcingLabel}
                            </span>
                          )}
                        </div>
                        {bt.sla && (
                          <span style={{ fontSize: 9, color: "#9CA3AF", fontWeight: 500 }}>
                            SLA {bt.sla}
                          </span>
                        )}
                      </div>
                      {(bt.action_buttons || []).length > 0 && (isBlocked || isConditional) && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {bt.action_buttons.map((btn, i) => (
                            <button key={i} onClick={() => handleSend(btn)} style={{
                              padding: "7px 14px", borderRadius: T.r8,
                              fontSize: 12, fontWeight: 600, fontFamily: "inherit",
                              background: i === 0 ? pathStyle.badge : "#fff",
                              color: i === 0 ? "#fff" : pathStyle.badge,
                              border: `1px solid ${pathStyle.border}`,
                              cursor: "pointer", transition: "all 0.15s",
                            }}
                              onMouseEnter={e => { e.currentTarget.style.opacity = "0.85"; }}
                              onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
                            >
                              {btn}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* 추천 질문/액션 버튼 — 백엔드 suggestions 그대로 표시 */}
                {msg.suggestions && msg.suggestions.length > 0 && !msg.isStreaming && (() => {
                  const display = msg.suggestions;
                  if (display.length === 0) return null;
                  return (
                  <div style={{ display:"flex", flexDirection:"column", gap:6, marginTop:4 }}>
                    {display.map((item, i) => (
                      <button key={i} onClick={() => {
                        if (item === "구매요청서 작성하기") {
                          // PR 직접 진입: 스트리밍 우회 → 바로 PR 모드
                          const prKey = lastClassification?.pr_template_key;
                          if (prKey && prKey !== "_generic" && getPrTemplate(prKey)) {
                            handlePrTypeSelect(prKey);
                          } else {
                            setMessages(prev => [...prev,
                              { id: msgIdCounter++, role: "user", text: item },
                              { id: msgIdCounter++, role: "assistant",
                                text: "구매요청서 작성을 진행하겠습니다. 아래에서 구매 카테고리를 선택해 주십시오.",
                                prTypeSelect: true },
                            ]);
                          }
                        } else if (item === "견적요청서(RFQ) 작성하기" || item === "RFQ 작성하기") {
                          // RFQ 직접 진입 (소싱담당자)
                          handleSend(item);
                        } else if (item === "제안요청서(RFP) 작성하기" || item === "RFP 작성하기") {
                          // RFP 직접 진입 (소싱담당자)
                          handleSend(item);
                        } else {
                          handleSend(item);
                        }
                      }} style={{
                        padding:"9px 14px", borderRadius: T.r10,
                        border:`1px solid ${item.includes("RFP") || item.includes("제안요청서") || item.includes("RFQ") || item.includes("견적") ? 'rgba(14,165,160,0.3)' : 'rgba(14,165,160,0.12)'}`,
                        background: item.includes("RFP") || item.includes("제안요청서") || item.includes("RFQ") || item.includes("견적")
                          ? 'linear-gradient(135deg, rgba(14,165,160,0.08), rgba(14,165,160,0.04))'
                          : 'rgba(255,255,255,0.7)',
                        color: T.text, fontSize:12, fontWeight: item.includes("RFP") || item.includes("제안요청서") || item.includes("RFQ") || item.includes("견적") ? 600 : 500,
                        cursor:"pointer", textAlign:"left", fontFamily:"inherit",
                        transition:"all 0.15s", display:"flex", alignItems:"center", gap:6,
                        backdropFilter:"blur(4px)", WebkitBackdropFilter:"blur(4px)",
                      }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = T.primary; e.currentTarget.style.background = 'rgba(14,165,160,0.06)'; }}
                        onMouseLeave={e => { const hl = item.includes("RFP") || item.includes("제안요청서") || item.includes("RFQ") || item.includes("견적"); e.currentTarget.style.borderColor = hl ? 'rgba(14,165,160,0.3)' : 'rgba(14,165,160,0.12)'; e.currentTarget.style.background = hl ? 'linear-gradient(135deg, rgba(14,165,160,0.08), rgba(14,165,160,0.04))' : 'rgba(255,255,255,0.7)'; }}
                      >
                        <span style={{ color: T.primary, fontSize:13 }}>›</span>
                        {item}
                      </button>
                    ))}
                  </div>
                  );
                })()}

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

                {/* PR 퀵필 카드 — 초기 전체 필수 항목 탭 (첫 메시지만) */}
                {msg.prQuickFill && phase === "pr_filling" && renderPrQuickFillCards()}

                {/* PR 인라인 탭 — AI 응답마다 다음 미완 필드 탭 표시 */}
                {msg.prInlineTabs && phase === "pr_filling" && renderPrInlineTabs()}

                {/* RFP 유형 선택 카드 */}
                {msg.rfpTypeSelect && !rfpType && renderRfpTypeSelector()}

                {/* RFQ 견적서 카테고리 선택 카드 */}
                {msg.rfqTypeSelect && !rfqType && renderRfqTypeSelector()}

                {/* PR 업로드 결과 → RFP/RFQ 변환 버튼 (procurement만) */}
                {msg.prUploadResult && userRole === "procurement" && phase === "chat" && (
                  <div style={{ display:"flex", gap:8, marginTop:10 }}>
                    <button onClick={() => convertUploadToRfp(msg.prUploadResult)} style={{
                      flex:1, padding:"12px 16px", borderRadius: T.r10,
                      background: T.gradPrimary, color:"#fff",
                      border:"none", cursor:"pointer", fontWeight:600, fontSize:13,
                    }}>
                      RFP(제안요청서)로 변환
                    </button>
                    <button onClick={() => convertUploadToRfq(msg.prUploadResult)} style={{
                      flex:1, padding:"12px 16px", borderRadius: T.r10,
                      background:"linear-gradient(135deg, #6366f1, #818cf8)", color:"#fff",
                      border:"none", cursor:"pointer", fontWeight:600, fontSize:13,
                    }}>
                      RFQ(견적서)로 변환
                    </button>
                  </div>
                )}

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
            {userRole === "procurement" && (phase === "chat" || phase === "filling") && (
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
                      } else if (phase === "filling" && rfpType) {
                        // RFP filling 중 PDF 업로드 → PR 필드를 RFP 필드로 자동 매핑
                        const prType_ = res.pr_type || "_generic";
                        const mapping = PR_TO_RFP_MAPPING[prType_];
                        const extractedFields = res.extracted_fields || {};
                        if (mapping) {
                          const rfpFills = {};
                          // PR 필드 → RFP 필드 매핑 적용
                          Object.entries(mapping.fieldMap).forEach(([prKey, rfpKey]) => {
                            if (extractedFields[prKey]) {
                              rfpFills[rfpKey] = extractedFields[prKey];
                            }
                          });
                          // 요청자 정보 직접 매핑 (title, department, requester)
                          if (res.department) rfpFills.s2 = res.department;
                          if (res.requester) rfpFills.s3 = res.requester;
                          if (res.title) rfpFills.s6 = rfpFills.s6 || res.title;
                          // RFP 필드에 적용
                          const filledCount = Object.keys(rfpFills).length;
                          if (filledCount > 0) {
                            applyFills(rfpFills);
                          }
                          setMessages(prev => [...prev, {
                            id: msgIdCounter++, role: "assistant",
                            text: `구매요청서 PDF를 분석하여 RFP에 ${filledCount}개 항목을 자동 반영했습니다.\n\n**유형:** ${res.label || "일반"}\n${res.selected_supplier ? `**공급업체:** ${res.selected_supplier}\n` : ""}\n우측 패널에서 내용을 확인하고 수정해 주세요.`,
                          }]);
                        }
                      } else {
                        // chat phase: 기존 동작 (분석 결과 표시)
                        const extractedFields = res.extracted_fields || {};
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
                activePrFieldKey && phase === "pr_filling"
                  ? `✎ "${prFields[activePrFieldKey]?.label || activePrFieldKey}" 값을 입력하세요...`
                  : phase === "chat" ? (userRole === "procurement" ? "질문을 입력하거나 구매요청서 PDF를 업로드하세요..." : "궁금한 내용을 입력해주세요...")
                  : phase === "complete" ? "공급업체 추천 또는 추가 질문..."
                  : "추가 정보를 입력하세요..."
              }
              style={{
                flex:1, height:48,
                background: activePrFieldKey ? "rgba(14,165,160,0.06)" : (inputFocused ? T.card : T.bgSubtle),
                border:`1.5px solid ${activePrFieldKey ? T.primary : (inputFocused ? T.primary : "transparent")}`,
                borderRadius: T.r14, padding:"0 16px",
                color: T.text, fontSize:14, outline:"none", fontFamily:"inherit",
                transition:"all 0.2s ease",
                boxShadow: activePrFieldKey ? `0 0 0 3px rgba(14,165,160,0.15)` : (inputFocused ? `0 0 0 3px rgba(14,165,160,0.10)` : "none"),
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
                구매요청서 (PR) — {currentPrTemplate?.label || currentPrTemplate?.name || ""}
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
            {/* ── PR Complete: RFP 완료와 동일한 구조 ── */}
            {phase === "pr_complete" && (
              <>
                {/* 성공 배너 — RFP PanelComplete와 동일 */}
                <div style={{
                  background: `linear-gradient(135deg, rgba(16,185,129,0.08), rgba(14,165,160,0.06))`,
                  borderRadius: T.r16, padding:"18px 22px", marginBottom:18,
                  border:`1.5px solid rgba(16,185,129,0.15)`,
                  display:"flex", alignItems:"center", gap:14,
                }}>
                  <IconParty size={32} />
                  <div>
                    <div style={{ fontSize:14, fontWeight:800, color: T.greenDark }}>구매요청서 작성 완료!</div>
                    <div style={{ fontSize:11, color:"#16a34a", marginTop:3 }}>미리보기로 확인 후 다운로드하세요.</div>
                  </div>
                  <button
                    onClick={previewPr}
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

                {/* PR 문서 헤더 — RFP와 동일 스타일 */}
                <div style={{
                  background: 'rgba(255,255,255,0.8)', borderRadius: T.r16, padding:"22px 28px", textAlign:"center",
                  marginBottom:16, border:`1.5px solid rgba(14,165,160,0.15)`,
                  boxShadow:'0 2px 12px rgba(14,165,160,0.06)',
                  position:"relative", overflow:"hidden",
                  backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
                }}>
                  <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background: T.gradTeal }} />
                  <div style={{ fontSize:10, letterSpacing:3, color: T.sub, marginBottom:8 }}>간접구매 표준 양식</div>
                  <div style={{ fontSize:20, fontWeight:900, letterSpacing:4, color: T.navy }}>구 매 요 청 서</div>
                  {currentPrTemplate && (
                    <div style={{ marginTop:12, display:"flex", justifyContent:"center", gap:8 }}>
                      <span style={{
                        fontSize:12, fontWeight:700, padding:"4px 14px",
                        background: T.primaryLight, color: T.primary,
                        borderRadius:8, border:`1px solid ${T.primaryMid}`,
                      }}>{currentPrTemplate.label || currentPrTemplate.name}</span>
                      {prFields.c6?.value && prFields.c6.value !== (currentPrTemplate.label || currentPrTemplate.name) && <span style={{
                        fontSize:12, fontWeight:700, padding:"4px 14px",
                        background: T.primaryLight, color: T.primary,
                        borderRadius:8, border:`1px solid ${T.primaryMid}`,
                      }}>{prFields.c6.value}</span>}
                    </div>
                  )}
                </div>

                {/* 섹션별 아코디언 — RFP와 동일 */}
                {currentPrSections.map((sec, si) => {
                  const sectionDone = sec.fields.every(f => prFields[f]?.value);
                  return (
                    <div key={si} style={{ marginBottom:12 }}>
                      <div style={{
                        background: 'rgba(14,165,160,0.04)', padding:"10px 16px",
                        display:"flex", alignItems:"center", gap:8,
                        borderRadius:`${T.r10}px ${T.r10}px 0 0`,
                        border:`1px solid rgba(14,165,160,0.08)`,
                      }}>
                        <span>{SECTION_ICONS[sec.icon]}</span>
                        <span style={{ fontSize:12, fontWeight:700, color: T.navy }}>{sec.title}</span>
                        {sectionDone
                          ? <Chip>완료 ✓</Chip>
                          : <Chip color={T.red} bg={T.redLight} border={T.redMid}>미완료</Chip>
                        }
                      </div>
                      <div style={{
                        background: 'rgba(255,255,255,0.7)', border:`1px solid rgba(14,165,160,0.08)`, borderTop:"none",
                        borderRadius:`0 0 ${T.r10}px ${T.r10}px`, overflow:"hidden",
                      }}>
                        {sec.fields.map((fk, fi) => {
                          const f = prFields[fk];
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
                              <div style={{ flex:1, padding:"10px 14px", fontSize:12, color: T.text, lineHeight:1.7 }}>{f.value || ""}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {/* 서명 영역 — RFP와 동일 */}
                <div style={{ background: 'rgba(255,255,255,0.7)', borderRadius: T.r12, padding:"22px 26px", border:`1px solid rgba(14,165,160,0.08)` }}>
                  <div style={{ display:"flex", justifyContent:"space-around" }}>
                    {[
                      { label:"작성일", value: new Date().toLocaleDateString("ko-KR") },
                      { label:"요청자 (서명)", value: prFields.c3?.value || "" },
                      { label:"발주기관", value: prFields.c1?.value || "" },
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

                {/* 공급업체 추천 (사용자 전용) — 저장 전 */}
                {userRole === "user" && !prSaved && (
                  <>
                    {selectedPrSuppliers.length > 0 && (
                      <div style={{
                        background: 'rgba(16,185,129,0.06)', borderRadius: T.r12,
                        padding:"12px 16px", marginTop:16, marginBottom:12,
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
                              background:"rgba(16,185,129,0.12)", color: T.greenDark, fontWeight:600,
                            }}>
                              {sp.name}
                              <span onClick={() => setSelectedPrSuppliers(prev => prev.filter(x => x.id !== sp.id))}
                                style={{ cursor:"pointer", fontSize:13, lineHeight:1, marginLeft:2, opacity:0.6 }}>✕</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div style={{
                      background: `linear-gradient(135deg, rgba(14,165,160,0.08), rgba(6,182,212,0.06))`,
                      borderRadius: T.r16, padding:"14px 18px", marginTop:16, marginBottom:14,
                      border:`1px solid rgba(14,165,160,0.12)`,
                    }}>
                      <div style={{ fontSize:13, fontWeight:800, color: T.primary }}>추천 공급업체</div>
                      <div style={{ fontSize:11, color: T.sub, marginTop:3 }}>구매요청 내용 기반 매칭 결과입니다. 여러 업체를 선택할 수 있습니다.</div>
                    </div>

                    {prSupplierLoading ? (
                      <div style={{ textAlign:"center", padding:30, color: T.muted, fontSize:12 }}>공급업체 검색 중...</div>
                    ) : prSuppliers.length === 0 ? (
                      <div style={{ textAlign:"center", padding:30, color: T.muted, fontSize:12 }}>매칭되는 공급업체가 없습니다.</div>
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
                            if (isSelected) setSelectedPrSuppliers(prev => prev.filter(x => x.id !== s.id));
                            else setSelectedPrSuppliers(prev => [...prev, { id: s.id, name: s.name }]);
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
                          <div style={{ marginBottom:8 }}>
                            <div style={{ fontSize:9, color: T.muted, marginBottom:3 }}>매칭률</div>
                            <div style={{ height:5, borderRadius:3, background: T.bgSubtle, overflow:"hidden" }}>
                              <div style={{ width:`${s.match_rate || 80}%`, height:"100%", borderRadius:3, background: isSelected ? "linear-gradient(90deg,#10b981,#059669)" : T.gradPrimary, transition:"width 1s ease" }} />
                            </div>
                            <div style={{ fontSize:10, fontWeight:700, color: isSelected ? T.greenDark : T.primary, marginTop:2 }}>{s.match_rate || 80}%</div>
                          </div>
                          <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                            {(s.tags || []).slice(0, 3).map(tag => (
                              <span key={tag} style={{ fontSize:9, padding:"2px 7px", borderRadius:10, background: T.bgSubtle, color: T.sub, border:`1px solid ${T.border}` }}>{tag}</span>
                            ))}
                          </div>
                        </div>
                      );
                    })}

                    <div style={{ textAlign:"center", padding:"12px", marginTop:6, fontSize:10, color: T.muted, background: T.bgSubtle, borderRadius: T.r10 }}>
                      업무마켓9(workmarket9.com) 등록 업체 기준
                    </div>
                  </>
                )}

                {/* 하단 버튼 — RFP PanelComplete와 동일 레이아웃 */}
                {!prSaved ? (
                  /* 저장 전: 미리보기 | PDF 다운로드 | 저장 */
                  <div style={{ marginTop:16, display:"flex", gap:8 }}>
                    <button onClick={previewPr} style={{
                      flex:1, padding:"14px", borderRadius: T.r10,
                      border:`1px solid ${T.primary}`, background: "rgba(14,165,160,0.04)",
                      color: T.primary, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit",
                      display:"flex", alignItems:"center", justifyContent:"center", gap:6, transition:"all 0.2s",
                    }}
                      onMouseEnter={e => { e.currentTarget.style.background = "rgba(14,165,160,0.1)"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "rgba(14,165,160,0.04)"; }}
                    >
                      <IconPreview size={14} /> 미리보기
                    </button>
                    <button onClick={() => {
                      if (currentPrTemplate) {
                        const supplierNames = selectedPrSuppliers.map(s => s.name).join(", ");
                        downloadPrPdf(prFields, currentPrSections, currentPrTemplate.label || currentPrTemplate.name, supplierNames);
                      }
                    }} style={{
                      flex:1, padding:"14px", borderRadius: T.r10,
                      border:`1px solid ${T.border}`, background: T.card,
                      color: T.sub, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit",
                      display:"flex", alignItems:"center", justifyContent:"center", gap:6, transition:"all 0.2s",
                    }}
                      onMouseEnter={e => { e.currentTarget.style.background = T.bgSubtle; e.currentTarget.style.borderColor = T.primary; }}
                      onMouseLeave={e => { e.currentTarget.style.background = T.card; e.currentTarget.style.borderColor = T.border; }}
                    >
                      <IconDownload size={14} /> PDF 다운로드
                    </button>
                    <button onClick={async () => {
                      try {
                        const supplierNames = selectedPrSuppliers.map(sp => sp.name).join(", ");
                        const supplierIds = selectedPrSuppliers.map(sp => sp.id);
                        if (selectedPrSuppliers.length > 0) {
                          await api.updatePrSupplier(sessionId, supplierIds[0], supplierNames);
                        }
                        setPrSaved(true);
                        setMessages(prev => [...prev, {
                          id: msgIdCounter++, role: "assistant",
                          text: `구매요청서가 저장되었습니다.${selectedPrSuppliers.length > 0 ? `\n선택 공급업체: ${supplierNames}` : ""}\n\n구매담당자가 확인할 수 있습니다.`,
                        }]);
                      } catch (err) { console.warn("PR save failed:", err); }
                    }} style={{
                      flex:1, padding:"14px", borderRadius: T.r10,
                      border:"none", background: T.gradPrimary,
                      color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit",
                      display:"flex", alignItems:"center", justifyContent:"center", gap:6, transition:"all 0.3s",
                      boxShadow: T.shadowBlue,
                    }}
                      onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.02)"; }}
                      onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                    >
                      {selectedPrSuppliers.length > 0 ? `저장 (업체 ${selectedPrSuppliers.length}개)` : "저장"}
                    </button>
                  </div>
                ) : (
                  /* 저장 후: 미리보기 | RFP 전환 | RFQ 전환 */
                  <div style={{ marginTop:16, display:"flex", gap:8 }}>
                    <button onClick={previewPr} style={{
                      flex:1, padding:"14px", borderRadius: T.r10,
                      border:`1px solid ${T.primary}`, background: "rgba(14,165,160,0.04)",
                      color: T.primary, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit",
                      display:"flex", alignItems:"center", justifyContent:"center", gap:6, transition:"all 0.2s",
                    }}
                      onMouseEnter={e => { e.currentTarget.style.background = "rgba(14,165,160,0.1)"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "rgba(14,165,160,0.04)"; }}
                    >
                      <IconPreview size={14} /> 미리보기
                    </button>
                    <button onClick={convertPrToRfp} style={{
                      flex:1, padding:"14px", borderRadius: T.r10,
                      border:"none", background: T.gradPrimary,
                      color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit",
                      display:"flex", alignItems:"center", justifyContent:"center", gap:6, transition:"all 0.3s",
                      boxShadow: T.shadowBlue,
                    }}
                      onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.02)"; }}
                      onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                    >
                      <IconSendMail size={13} /> RFP 전환
                    </button>
                    <button onClick={convertPrToRfq} style={{
                      flex:1, padding:"14px", borderRadius: T.r10,
                      border:"none", background: "linear-gradient(135deg, #6366f1, #818cf8)",
                      color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit",
                      display:"flex", alignItems:"center", justifyContent:"center", gap:6, transition:"all 0.3s",
                      boxShadow: "0 2px 8px rgba(99,102,241,0.3)",
                    }}
                      onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.02)"; }}
                      onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                    >
                      <IconDownload size={13} /> RFQ 전환
                    </button>
                  </div>
                )}
              </>
            )}

            {/* ── PR Filling: 진행률 + 3탭 구조 ── */}
            {phase === "pr_filling" && (() => {
              // 3탭 필드 그룹핑: 기본정보(c1~c10) / 상세요건(c11~c14 + p*) / 계약조건(c15~c20)
              const basicKeys = new Set([...COMMON_SECTIONS.requester.fields, ...COMMON_SECTIONS.contract.fields]);
              const detailKeys = new Set(COMMON_SECTIONS.require.fields);
              const contractKeys = new Set(COMMON_SECTIONS.payment.fields);
              const basicFields = Object.entries(prFields).filter(([k]) => basicKeys.has(k));
              const detailFields = Object.entries(prFields).filter(([k]) => detailKeys.has(k) || k.startsWith("p"));
              const contractFields = Object.entries(prFields).filter(([k]) => contractKeys.has(k));
              const tabGroups = [
                { key: "basic", label: "기본 정보", icon: "📋", fields: basicFields },
                { key: "detail", label: "상세 요건", icon: "📦", fields: detailFields },
                { key: "contract", label: "계약 조건", icon: "💰", fields: contractFields },
              ];
              const currentTabFields = tabGroups[prTab]?.fields || [];
              return (
              <>
                {/* 진행률 */}
                <div style={{
                  background: `linear-gradient(135deg, rgba(6,182,212,0.06) 0%, rgba(14,165,160,0.04) 100%)`,
                  borderRadius: T.r16, padding:"14px 18px", marginBottom:14,
                  border: `1px solid rgba(6,182,212,0.12)`,
                }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                    <span style={{ fontSize:12, fontWeight:700, color: T.text }}>구매요청서 완성도</span>
                    <span style={{
                      fontSize:11, fontWeight:700, padding:"4px 12px", borderRadius:20,
                      background: prPct >= 100 ? T.greenLight : 'rgba(255,255,255,0.8)',
                      color: prPct >= 100 ? T.greenDark : T.primary,
                      border: `1px solid ${prPct >= 100 ? T.greenMid : 'rgba(6,182,212,0.15)'}`,
                    }}>필수 {prRequiredFilled}/{prRequiredTotal} · {prPct}%</span>
                  </div>
                  <div style={{ height:6, background:"rgba(255,255,255,0.7)", borderRadius:3, overflow:"hidden" }}>
                    <div style={{
                      height:"100%", width:`${prPct}%`, borderRadius:3,
                      background: prPct >= 100 ? `linear-gradient(90deg, #10B981, #059669)` : `linear-gradient(90deg, #06B6D4, #0EA5A0)`,
                      transition:"width 0.6s ease",
                    }} />
                  </div>
                </div>

                {/* 3탭 네비게이션 */}
                <div style={{ display:"flex", gap:6, marginBottom:14 }}>
                  {tabGroups.map((tab, ti) => {
                    const tabFilled = tab.fields.filter(([,f]) => (f.value||"").trim()).length;
                    const tabTotal = tab.fields.length;
                    const tabDone = tabFilled === tabTotal && tabTotal > 0;
                    const isActive = prTab === ti;
                    return (
                      <button
                        key={tab.key}
                        onMouseDown={(e) => { e.preventDefault(); setPrTab(ti); }}
                        style={{
                          flex:1, padding:"10px 4px", borderRadius: T.r10,
                          border: isActive ? `2px solid ${T.primary}` : `1.5px solid ${T.border}`,
                          background: isActive ? "rgba(6,182,212,0.06)" : T.card,
                          cursor:"pointer", fontFamily:"inherit", textAlign:"center",
                          transition:"all 0.15s",
                        }}
                      >
                        <div style={{ fontSize:14, marginBottom:2 }}>{tab.icon}</div>
                        <div style={{ fontSize:10, fontWeight:700, color: isActive ? T.primary : T.text, marginBottom:2 }}>
                          {tab.label}
                        </div>
                        <div style={{
                          fontSize:9, fontWeight:600,
                          color: tabDone ? T.greenDark : T.muted,
                        }}>
                          {tabDone ? "✓ 완료" : `${tabFilled}/${tabTotal}`}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* 현재 탭 필드 목록 */}
                <div style={{
                  background: 'rgba(255,255,255,0.65)',
                  border: `1px solid rgba(6,182,212,0.08)`,
                  borderRadius: T.r12, overflow:"hidden", marginBottom:12,
                }}>
                  {currentTabFields.map(([fk, f], fi) => {
                    if (!f) return null;
                    const isNew = prJustFilled.has(fk);
                    const isRequired = f.required !== false;
                    const isEmpty = !(f.value || "").trim();
                    const fieldOpts = isRequired && isEmpty ? getPrFieldOptions(fk, f) : [];
                    return (
                      <div key={fk} style={{
                        borderBottom: fi < currentTabFields.length-1 ? `1px solid ${T.borderLight}` : "none",
                        animation: isNew ? "field-highlight 2.5s ease forwards" : "none",
                        background: fi % 2 === 1 ? "rgba(6,182,212,0.02)" : "transparent",
                      }}>
                        <div style={{ display:"flex", alignItems:"flex-start" }}>
                          <div style={{
                            width:126, padding:"10px 12px", flexShrink:0,
                            background:"rgba(6,182,212,0.03)", borderRight:`1px solid rgba(6,182,212,0.06)`,
                            fontSize:11, fontWeight:700, color: T.sub,
                            display:"flex", alignItems:"center", minHeight:40, gap:3,
                          }}>
                            {isRequired && <span style={{ color: T.red, fontSize:10 }}>*</span>}
                            {f.label}
                          </div>
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
                        {/* 필수 필드 선택 탭 — 값이 비어있을 때만 표시 */}
                        {fieldOpts.length > 0 && (
                          <div style={{ padding:"4px 8px 8px 134px", display:"flex", gap:4, flexWrap:"wrap" }}>
                            {fieldOpts.map((opt, oi) => (
                              <button
                                key={oi}
                                onMouseDown={(e) => { e.preventDefault(); handlePrFieldEdit(fk, opt); }}
                                style={{
                                  padding:"4px 10px", borderRadius:12, fontSize:10, fontWeight:600,
                                  border:`1px solid rgba(6,182,212,0.2)`, background:"rgba(6,182,212,0.04)",
                                  color: T.primary, cursor:"pointer", fontFamily:"inherit", transition:"all 0.15s",
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = "rgba(6,182,212,0.12)"; e.currentTarget.style.borderColor = T.primary; }}
                                onMouseLeave={e => { e.currentTarget.style.background = "rgba(6,182,212,0.04)"; e.currentTarget.style.borderColor = "rgba(6,182,212,0.2)"; }}
                              >{opt}</button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* 이전/다음 + 완료 버튼 */}
                <div style={{ display:"flex", gap:8, marginTop:4 }}>
                  {prTab > 0 && (
                    <button
                      onMouseDown={(e) => { e.preventDefault(); setPrTab(prTab - 1); }}
                      style={{
                        flex:1, padding:"11px 0", borderRadius: T.r10,
                        border:`1.5px solid ${T.border}`, background: T.card,
                        color: T.text, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit",
                      }}
                    >◀ {tabGroups[prTab-1]?.label}</button>
                  )}
                  {prTab < 2 ? (
                    <button
                      onMouseDown={(e) => { e.preventDefault(); setPrTab(prTab + 1); }}
                      style={{
                        flex:1, padding:"11px 0", borderRadius: T.r10,
                        border:"none", background: T.gradPrimary,
                        color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit",
                      }}
                    >{tabGroups[prTab+1]?.label} ▶</button>
                  ) : (
                    <button
                      onMouseDown={(e) => { e.preventDefault(); if (prPct >= 100) handlePrManualComplete(); }}
                      style={{
                        flex:1, padding:"11px 0", borderRadius: T.r10,
                        border:"none", cursor: prPct >= 100 ? "pointer" : "not-allowed",
                        background: prPct >= 100 ? T.gradPrimary : "rgba(0,0,0,0.08)",
                        color: prPct >= 100 ? "#fff" : T.muted,
                        fontSize:12, fontWeight:700, fontFamily:"inherit",
                        transition:"all 0.3s ease",
                      }}
                    >
                      {prPct >= 100 ? "✓ 작성 완료" : `작성 완료 (${prPct}%)`}
                    </button>
                  )}
                </div>
              </>
              );
            })()}
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

      {/* ══ RFQ 우측 패널 ══ */}
      {(phase === "rfq_filling" || phase === "rfq_complete") && (
        <div style={{
          width: 420, flexShrink:0, background: T.card,
          borderLeft:`1px solid ${T.border}`,
          display:"flex", flexDirection:"column", position:"relative",
          boxShadow: "-4px 0 20px rgba(0,0,0,0.03)",
        }}>
          {/* 헤더 */}
          <div style={{
            padding:"16px 22px", borderBottom:`1px solid ${T.border}`,
            display:"flex", alignItems:"center", justifyContent:"space-between",
            background: "linear-gradient(135deg, rgba(99,102,241,0.03), rgba(129,140,248,0.02))",
          }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <div style={{
                width:28, height:28, borderRadius:8,
                background: "linear-gradient(135deg, #6366f1, #818cf8)",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:13, color:"#fff",
              }}>📋</div>
              <div>
                <div style={{ fontSize:13, fontWeight:800, color: T.navy }}>견적요청서 (RFQ)</div>
                <div style={{ fontSize:10, color: T.sub }}>{rfqTemplate?.name || ""}</div>
              </div>
            </div>
            <button
              onClick={() => setRfqRightVisible(false)}
              style={{
                width:28, height:28, borderRadius:8, border:"none",
                background:"rgba(100,116,139,0.08)", cursor:"pointer",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:14, color: T.muted,
              }}
            >✕</button>
          </div>
          {phase === "rfq_filling" && RfqPanelFilling()}
          {phase === "rfq_complete" && RfqPanelComplete()}
        </div>
      )}

      {/* 이메일 발송 모달 */}
      <EmailModal />
    </div>
  );
}

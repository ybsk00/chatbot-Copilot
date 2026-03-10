import { useState, useEffect } from 'react'
import { api } from '../../api/client'

const PAGE_SIZE = 10
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

const STATUS_MAP = {
  submitted: { label: '신청', bg: '#EFF6FF', color: '#2563EB' },
  reviewing: { label: '검토중', bg: '#FFFBEB', color: '#D97706' },
  approved:  { label: '승인', bg: '#ECFDF5', color: '#059669' },
  rejected:  { label: '반려', bg: '#FEF2F2', color: '#DC2626' },
  sent:      { label: '발송완료', bg: '#F0FDFA', color: '#0D9488' },
}

const RFP_TYPE_LABELS = {
  purchase: '일반 구매',
  service_contract: '일반 용역',
  service: '서비스',
  rental: '렌탈·리스',
  construction: '공사',
  consulting: '컨설팅',
  purchase_maintenance: '구매+유지보수',
  rental_maintenance: '렌탈+유지보수',
  purchase_lease: '구매·리스',
}

// RFP 섹션 구조 (rfp_schemas.py sections와 동일)
const RFP_SECTIONS = {
  purchase: [
    { title: '발주기관 정보', keys: ['s1','s2','s3','s4','s5'] },
    { title: '구매 개요', keys: ['s6','s7','s8','s9'] },
    { title: '요구사항', keys: ['s10','s11','s12'] },
    { title: '평가 기준', keys: ['s13','s14','s15','s16'] },
    { title: '제출 안내', keys: ['s17','s18'] },
  ],
  service_contract: [
    { title: '발주기관 정보', keys: ['s1','s2','s3','s4','s5'] },
    { title: '사업 개요', keys: ['s6','s7','s8','s9','s10'] },
    { title: '서비스 요건', keys: ['s11','s12','s13','s14'] },
    { title: '평가 기준', keys: ['s15','s16','s17','s18'] },
    { title: '제출 안내', keys: ['s19','s20'] },
  ],
  service: [
    { title: '발주기관 정보', keys: ['s1','s2','s3','s4','s5'] },
    { title: '서비스 개요', keys: ['s6','s7','s8','s9'] },
    { title: '서비스 요건', keys: ['s10','s11','s12','s13'] },
    { title: '평가 기준', keys: ['s14','s15','s16','s17'] },
    { title: '제출 안내', keys: ['s18','s19'] },
  ],
  rental: [
    { title: '발주기관 정보', keys: ['s1','s2','s3','s4','s5'] },
    { title: '계약 개요', keys: ['s6','s7','s8','s9','s10'] },
    { title: '요구사항', keys: ['s11','s12','s13','s14'] },
    { title: '평가 기준', keys: ['s15','s16','s17','s18'] },
    { title: '제출 안내', keys: ['s19','s20'] },
  ],
  construction: [
    { title: '발주기관 정보', keys: ['s1','s2','s3','s4','s5'] },
    { title: '공사 개요', keys: ['s6','s7','s8','s9'] },
    { title: '공사 요건', keys: ['s10','s11','s12','s13'] },
    { title: '평가 기준', keys: ['s14','s15','s16','s17'] },
    { title: '제출 안내', keys: ['s18','s19'] },
  ],
  consulting: [
    { title: '발주기관 정보', keys: ['s1','s2','s3','s4','s5'] },
    { title: '사업 개요', keys: ['s6','s7','s8','s9'] },
    { title: '수행 요건', keys: ['s10','s11','s12','s13'] },
    { title: '평가 기준', keys: ['s14','s15','s16','s17'] },
    { title: '제출 안내', keys: ['s18','s19'] },
  ],
  purchase_maintenance: [
    { title: '발주기관 정보', keys: ['s1','s2','s3','s4','s5'] },
    { title: '구매 개요', keys: ['s6','s7','s8','s9'] },
    { title: '제품 요구사항', keys: ['s10','s11'] },
    { title: '유지보수 요건', keys: ['s12','s13','s14','s15'] },
    { title: '평가 기준', keys: ['s16','s17','s18','s19'] },
    { title: '제출 안내', keys: ['s20','s21'] },
  ],
  rental_maintenance: [
    { title: '발주기관 정보', keys: ['s1','s2','s3','s4','s5'] },
    { title: '렌탈 개요', keys: ['s6','s7','s8','s9','s10'] },
    { title: '장비 요구사항', keys: ['s11','s12'] },
    { title: '유지보수 요건', keys: ['s13','s14','s15','s16'] },
    { title: '평가 기준', keys: ['s17','s18','s19','s20'] },
    { title: '제출 안내', keys: ['s21','s22'] },
  ],
  purchase_lease: [
    { title: '발주기관 정보', keys: ['s1','s2','s3','s4','s5'] },
    { title: '구매·리스 개요', keys: ['s6','s7','s8','s9','s10'] },
    { title: '장비 요구사항', keys: ['s11','s12'] },
    { title: '리스 조건', keys: ['s13','s14','s15'] },
    { title: '평가 기준', keys: ['s16','s17','s18','s19'] },
    { title: '제출 안내', keys: ['s20','s21'] },
  ],
}

// RFP 스키마 필드 라벨 (rfp_schemas.py와 동일)
const RFP_FIELD_LABELS = {
  purchase: "s1:발주기관명, s2:담당부서, s3:담당자, s4:연락처, s5:이메일, s6:구매품목, s7:구매목적, s8:수량, s9:납품기한, s10:요구사양, s11:품질기준, s12:납품조건, s13:평가①가격경쟁력, s14:평가②품질신뢰도, s15:평가③납기준수, s16:평가④기술역량, s17:제출기한, s18:제출방식",
  service_contract: "s1:발주기관명, s2:담당부서, s3:담당자, s4:연락처, s5:이메일, s6:사업명, s7:사업목적, s8:계약형태, s9:수행기간, s10:대상인원, s11:서비스범위, s12:수행방식, s13:요구사양, s14:SLA기준, s15:평가①가격경쟁력, s16:평가②전문성실적, s17:평가③ESG대응, s18:평가④기술역량, s19:제출기한, s20:제출방식",
  service: "s1:발주기관명, s2:담당부서, s3:담당자, s4:연락처, s5:이메일, s6:서비스명, s7:서비스목적, s8:계약기간, s9:대상규모, s10:서비스범위, s11:제공방식, s12:품질SLA기준, s13:보안요건, s14:평가①가격경쟁력, s15:평가②서비스품질, s16:평가③안정성신뢰도, s17:평가④ESG대응, s18:제출기한, s19:제출방식",
  rental: "s1:발주기관명, s2:담당부서, s3:담당자, s4:연락처, s5:이메일, s6:사업명, s7:계약목적, s8:리스렌탈형태, s9:계약기간, s10:대상규모, s11:요구사양, s12:포함서비스, s13:유지보수기준, s14:반납인수조건, s15:평가①총비용TCO, s16:평가②서비스품질, s17:평가③신뢰도실적, s18:평가④ESG대응, s19:제출기한, s20:제출방식",
  construction: "s1:발주기관명, s2:담당부서, s3:담당자, s4:연락처, s5:이메일, s6:공사명, s7:공사목적, s8:공사기간, s9:공사규모면적, s10:공사범위, s11:요구사양, s12:품질기준, s13:안전기준, s14:평가①가격경쟁력, s15:평가②시공실적, s16:평가③기술역량, s17:평가④안전관리, s18:제출기한, s19:제출방식",
  consulting: "s1:발주기관명, s2:담당부서, s3:담당자, s4:연락처, s5:이메일, s6:사업명, s7:사업목적, s8:수행기간, s9:투입인력, s10:컨설팅범위, s11:요구역량, s12:산출물, s13:보안기밀요건, s14:평가①전문성실적, s15:평가②투입인력역량, s16:평가③가격경쟁력, s17:평가④방법론, s18:제출기한, s19:제출방식",
  purchase_maintenance: "s1:발주기관명, s2:담당부서, s3:담당자, s4:연락처, s5:이메일, s6:구매품목, s7:구매목적, s8:수량, s9:납품기한, s10:요구사양, s11:품질기준, s12:유지보수범위, s13:유지보수기간, s14:A/S조건, s15:소모품교체기준, s16:평가①가격경쟁력, s17:평가②품질신뢰도, s18:평가③유지보수역량, s19:평가④기술지원, s20:제출기한, s21:제출방식",
  rental_maintenance: "s1:발주기관명, s2:담당부서, s3:담당자, s4:연락처, s5:이메일, s6:사업명, s7:계약목적, s8:렌탈형태, s9:계약기간, s10:대상규모, s11:요구사양, s12:포함서비스, s13:유지보수SLA, s14:장애대응기준, s15:소모품포함여부, s16:반납인수조건, s17:평가①총비용TCO, s18:평가②유지보수품질, s19:평가③신뢰도실적, s20:평가④ESG대응, s21:제출기한, s22:제출방식",
  purchase_lease: "s1:발주기관명, s2:담당부서, s3:담당자, s4:연락처, s5:이메일, s6:대상장비, s7:도입목적, s8:계약형태, s9:수량, s10:계약기간, s11:요구사양, s12:품질기준, s13:리스조건, s14:중도해지조건, s15:잔존가치처리, s16:평가①총비용TCO, s17:평가②장비성능, s18:평가③기술지원, s19:평가④ESG대응, s20:제출기한, s21:제출방식",
}

function getFieldLabel(rfpType, key) {
  const str = RFP_FIELD_LABELS[rfpType] || ""
  const match = str.match(new RegExp(`${key}:([^,]+)`))
  return match ? match[1].trim() : key
}

/* ── 달력 유틸 ── */
function getDaysInMonth(y, m) { return new Date(y, m + 1, 0).getDate() }
function getFirstDayOfWeek(y, m) { return new Date(y, m, 1).getDay() }
function fmtDate(y, m, d) { return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}` }

/* ── 상세 모달 ── */
function DetailModal({ req, onClose, onStatusChange, onDelete }) {
  const [selectFocused, setSelectFocused] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  if (!req) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)',
    }} onClick={onClose}>
      <div style={{
        background: '#fff', borderRadius: 20, width: 600, maxHeight: '80vh',
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)', overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
      }} onClick={e => e.stopPropagation()}>
        {/* 헤더 */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid #F0F2F5',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#1E293B' }}>
              {req.title || req.org_name || 'RFP 상세'}
            </div>
            <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>
              {RFP_TYPE_LABELS[req.rfp_type] || req.rfp_type} · {new Date(req.created_at).toLocaleString('ko-KR')}
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 8, border: 'none',
            background: '#F1F5F9', cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center', color: '#64748B',
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style={{ width: 16, height: 16 }}>
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>

        {/* 바디 */}
        <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
          {/* 상태 변경 */}
          <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>상태</div>
            <select
              value={req.status}
              onChange={e => onStatusChange(req.id, e.target.value)}
              onFocus={() => setSelectFocused(true)}
              onBlur={() => setSelectFocused(false)}
              style={{
                padding: '8px 14px', borderRadius: 10, fontSize: 13,
                border: selectFocused ? '1px solid #0D9488' : '1px solid #E2E8F0',
                outline: 'none', background: '#fff', cursor: 'pointer',
                transition: 'border-color 0.15s',
              }}
            >
              <option value="submitted">신청</option>
              <option value="reviewing">검토중</option>
              <option value="approved">승인</option>
              <option value="rejected">반려</option>
              <option value="sent">발송완료</option>
            </select>
            <span style={{ fontSize: 11, color: '#94A3B8', marginLeft: 'auto' }}>Session: {req.session_id?.slice(0, 8)}</span>
          </div>

          {/* 섹션별 RFP 필드 */}
          {req.fields && Object.keys(req.fields).length > 0 && (() => {
            const sections = RFP_SECTIONS[req.rfp_type] || []
            const SECTION_COLORS = ['#0D9488', '#2563EB', '#7C3AED', '#D97706', '#DC2626', '#059669']
            return sections.map((sec, si) => {
              const hasData = sec.keys.some(k => req.fields[k])
              if (!hasData) return null
              return (
                <div key={si} style={{ marginBottom: 16 }}>
                  <div style={{
                    fontSize: 12, fontWeight: 700, color: SECTION_COLORS[si % SECTION_COLORS.length],
                    marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                    <span style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: SECTION_COLORS[si % SECTION_COLORS.length],
                    }} />
                    {sec.title}
                  </div>
                  <div style={{ background: '#FAFBFC', borderRadius: 12, overflow: 'hidden' }}>
                    {sec.keys.map((k, i) => {
                      const val = req.fields[k]
                      if (!val) return null
                      return (
                        <div key={k} style={{
                          display: 'flex', padding: '10px 16px',
                          borderBottom: '1px solid #F0F2F5',
                        }}>
                          <span style={{ width: 120, fontSize: 12, color: '#64748B', fontWeight: 500, flexShrink: 0 }}>
                            {getFieldLabel(req.rfp_type, k)}
                          </span>
                          <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#1E293B' }}>{String(val)}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })
          })()}
        </div>

        {/* 푸터 */}
        <div style={{
          padding: '16px 24px', borderTop: '1px solid #F0F2F5',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <button onClick={() => {
            if (!confirmDelete) { setConfirmDelete(true); return }
            onDelete(req.id)
          }} style={{
            padding: '10px 16px', borderRadius: 10, border: 'none', fontSize: 13, fontWeight: 600,
            background: confirmDelete ? '#DC2626' : '#FEF2F2',
            color: confirmDelete ? '#fff' : '#DC2626',
            cursor: 'pointer', transition: 'all 0.15s',
          }}>
            {confirmDelete ? '정말 삭제' : '삭제'}
          </button>
          <button onClick={onClose} style={{
            padding: '10px 20px', borderRadius: 10, border: '1px solid #E2E8F0',
            background: '#fff', fontSize: 13, fontWeight: 600, color: '#64748B', cursor: 'pointer',
          }}>
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── 메인 컴포넌트 ── */
function RfpRequests() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)

  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState(fmtDate(today.getFullYear(), today.getMonth(), today.getDate()))
  const [page, setPage] = useState(1)
  const [detailReq, setDetailReq] = useState(null)
  const [hoveredRow, setHoveredRow] = useState(null)
  const [hoveredDay, setHoveredDay] = useState(null)

  useEffect(() => { loadRequests() }, [])

  const loadRequests = async () => {
    try {
      const data = await api.getRfpRequests()
      setRequests(data.rfp_requests || [])
    } catch (err) {
      console.error('RFP 신청 로드 실패:', err)
    }
    setLoading(false)
  }

  const handleStatusChange = async (id, newStatus) => {
    try {
      await api.updateRfpStatus(id, newStatus)
      await loadRequests()
      if (detailReq?.id === id) setDetailReq(prev => ({ ...prev, status: newStatus }))
    } catch (err) { alert('상태 변경 실패') }
  }

  const handleDelete = async (id) => {
    try {
      await api.deleteRfpRequest(id)
      setDetailReq(null)
      await loadRequests()
    } catch (err) { alert('삭제 실패') }
  }

  // 날짜별 신청 수
  const countByDate = {}
  requests.forEach(r => {
    const d = r.created_at?.slice(0, 10)
    if (d) countByDate[d] = (countByDate[d] || 0) + 1
  })

  // 선택 날짜 필터 + 페이지네이션
  const filtered = requests.filter(r => r.created_at?.slice(0, 10) === selectedDate)
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  // 월 네비게이션
  const prevMonth = () => { if (viewMonth === 0) { setViewYear(viewYear - 1); setViewMonth(11) } else setViewMonth(viewMonth - 1) }
  const nextMonth = () => { if (viewMonth === 11) { setViewYear(viewYear + 1); setViewMonth(0) } else setViewMonth(viewMonth + 1) }

  const handleDateClick = (day) => { setSelectedDate(fmtDate(viewYear, viewMonth, day)); setPage(1) }

  const daysInMonth = getDaysInMonth(viewYear, viewMonth)
  const firstDay = getFirstDayOfWeek(viewYear, viewMonth)
  const monthPrefix = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`
  const monthTotal = requests.filter(r => r.created_at?.startsWith(monthPrefix)).length

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%', margin: '0 auto 14px',
            border: '3px solid #E2E8F0', borderTopColor: '#0D9488',
            animation: 'spin 0.8s linear infinite',
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          <div style={{ fontSize: 14, color: '#94A3B8' }}>데이터 로딩 중...</div>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* 페이지 헤더 */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1E293B', margin: 0 }}>RFP 신청 관리</h1>
        <p style={{ fontSize: 14, color: '#94A3B8', marginTop: 6 }}>날짜별 RFP 신청 내역을 조회합니다.</p>
      </div>

      <div style={{ display: 'flex', gap: 24 }}>
        {/* ── 좌측: 월별 달력 ── */}
        <div style={{
          width: 320, flexShrink: 0,
          background: '#fff', borderRadius: 18, border: '1px solid #F0F2F5',
          boxShadow: '0 1px 4px rgba(0,0,0,0.02)', overflow: 'hidden',
        }}>
          {/* 월 네비게이션 */}
          <div style={{
            padding: '18px 20px', borderBottom: '1px solid #F0F2F5',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <button onClick={prevMonth} style={{
              width: 32, height: 32, borderRadius: 8, border: '1px solid #E2E8F0',
              background: '#fff', cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center', color: '#64748B',
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style={{ width: 14, height: 14 }}>
                <path fillRule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
              </svg>
            </button>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#1E293B' }}>
                {viewYear}년 {viewMonth + 1}월
              </div>
              <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>
                이달 신청 {monthTotal}건
              </div>
            </div>
            <button onClick={nextMonth} style={{
              width: 32, height: 32, borderRadius: 8, border: '1px solid #E2E8F0',
              background: '#fff', cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center', color: '#64748B',
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style={{ width: 14, height: 14 }}>
                <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          {/* 요일 헤더 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', padding: '10px 12px 6px' }}>
            {WEEKDAYS.map((d, i) => (
              <div key={d} style={{
                textAlign: 'center', fontSize: 12, fontWeight: 600,
                color: i === 0 ? '#EF4444' : i === 6 ? '#3B82F6' : '#94A3B8',
              }}>{d}</div>
            ))}
          </div>

          {/* 날짜 그리드 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', padding: '4px 12px 16px', gap: '2px 0' }}>
            {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} style={{ height: 52 }} />)}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
              const dateStr = fmtDate(viewYear, viewMonth, day)
              const count = countByDate[dateStr] || 0
              const isSelected = selectedDate === dateStr
              const isToday = dateStr === fmtDate(today.getFullYear(), today.getMonth(), today.getDate())
              const isHovered = hoveredDay === day
              const dow = new Date(viewYear, viewMonth, day).getDay()
              return (
                <button key={day} onClick={() => handleDateClick(day)}
                  onMouseEnter={() => setHoveredDay(day)} onMouseLeave={() => setHoveredDay(null)}
                  style={{
                    height: 52, border: 'none', borderRadius: 10, cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    gap: 2, padding: 0,
                    background: isSelected ? '#0D9488' : isHovered ? '#F0FDFA' : 'transparent',
                    transition: 'all 0.15s',
                  }}>
                  <span style={{
                    fontSize: 13, fontWeight: isToday || isSelected ? 700 : 500,
                    color: isSelected ? '#fff' : isToday ? '#0D9488' : dow === 0 ? '#EF4444' : dow === 6 ? '#3B82F6' : '#374151',
                  }}>{day}</span>
                  {count > 0 && (
                    <span style={{
                      fontSize: 10, fontWeight: 700, lineHeight: 1,
                      color: isSelected ? 'rgba(255,255,255,0.9)' : '#0D9488',
                      background: isSelected ? 'rgba(255,255,255,0.2)' : '#E0F7F6',
                      padding: '2px 6px', borderRadius: 6, minWidth: 16, textAlign: 'center',
                    }}>{count}</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* ── 우측: 날짜별 RFP 리스트 ── */}
        <div style={{
          flex: 1, background: '#fff', borderRadius: 18, border: '1px solid #F0F2F5',
          boxShadow: '0 1px 4px rgba(0,0,0,0.02)', overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
        }}>
          {/* 헤더 */}
          <div style={{
            padding: '18px 24px', borderBottom: '1px solid #F0F2F5',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
              </svg>
              <span style={{ fontSize: 15, fontWeight: 650, color: '#1E293B' }}>
                {selectedDate.replace(/-/g, '.')} RFP 신청 목록
              </span>
            </div>
            <span style={{ fontSize: 13, color: '#94A3B8' }}>{filtered.length}건</span>
          </div>

          {/* 테이블 헤더 */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 120px 100px 80px 70px',
            padding: '10px 24px', borderBottom: '1px solid #F0F2F5', background: '#FAFBFC',
          }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8' }}>제목 / 기관</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8' }}>유형</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8' }}>요청자</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8', textAlign: 'center' }}>상태</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8', textAlign: 'center' }}>상세</div>
          </div>

          {/* 리스트 */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {paged.length === 0 ? (
              <div style={{ padding: '60px 0', textAlign: 'center', color: '#94A3B8', fontSize: 14 }}>
                해당 날짜의 RFP 신청이 없습니다.
              </div>
            ) : paged.map((req, idx) => {
              const sm = STATUS_MAP[req.status]
              return (
                <div key={req.id} style={{
                  display: 'grid', gridTemplateColumns: '1fr 120px 100px 80px 70px',
                  padding: '14px 24px', alignItems: 'center',
                  borderBottom: idx < paged.length - 1 ? '1px solid #F8FAFC' : 'none',
                  background: hoveredRow === idx ? '#F8FFFE' : 'transparent',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={() => setHoveredRow(idx)}
                onMouseLeave={() => setHoveredRow(null)}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#1E293B' }}>
                      {req.title || req.org_name || '제목 없음'}
                    </div>
                    <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>
                      {req.org_name || '-'}
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: '#64748B' }}>
                    {RFP_TYPE_LABELS[req.rfp_type] || req.rfp_type || '-'}
                  </div>
                  <div style={{ fontSize: 13, color: '#64748B' }}>
                    {req.requester || '-'}
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6,
                      background: sm?.bg || '#F1F5F9', color: sm?.color || '#64748B',
                    }}>
                      {sm?.label || req.status || '-'}
                    </span>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <button onClick={() => setDetailReq(req)} style={{
                      padding: '6px 12px', borderRadius: 8, border: '1px solid #E2E8F0',
                      background: '#fff', fontSize: 12, fontWeight: 600, color: '#64748B',
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { e.target.style.borderColor = '#0D9488'; e.target.style.color = '#0D9488' }}
                    onMouseLeave={e => { e.target.style.borderColor = '#E2E8F0'; e.target.style.color = '#64748B' }}>
                      보기
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div style={{
              padding: '14px 24px', borderTop: '1px solid #F0F2F5',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1} style={{
                padding: '6px 12px', borderRadius: 8, border: '1px solid #E2E8F0',
                background: '#fff', fontSize: 12, fontWeight: 600,
                color: currentPage <= 1 ? '#CBD5E1' : '#64748B',
                cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
              }}>이전</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)} style={{
                  width: 32, height: 32, borderRadius: 8, border: 'none',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  background: p === currentPage ? '#0D9488' : 'transparent',
                  color: p === currentPage ? '#fff' : '#64748B',
                }}>{p}</button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} style={{
                padding: '6px 12px', borderRadius: 8, border: '1px solid #E2E8F0',
                background: '#fff', fontSize: 12, fontWeight: 600,
                color: currentPage >= totalPages ? '#CBD5E1' : '#64748B',
                cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
              }}>다음</button>
            </div>
          )}
        </div>
      </div>

      {/* 상세 모달 */}
      {detailReq && (
        <DetailModal
          req={detailReq}
          onClose={() => setDetailReq(null)}
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
        />
      )}
    </div>
  )
}

export default RfpRequests

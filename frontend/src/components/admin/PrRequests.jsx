import { useState, useEffect } from 'react'
import { api } from '../../api/client'

const PAGE_SIZE = 10
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

const STATUS_MAP = {
  draft:             { label: '작성중',   bg: '#FEF3C7', color: '#D97706' },
  submitted:         { label: '제출됨',   bg: '#DBEAFE', color: '#2563EB' },
  supplier_selected: { label: '업체선택', bg: '#D1FAE5', color: '#059669' },
  forwarded:         { label: '전달됨',   bg: '#EDE9FE', color: '#7C3AED' },
}

const PR_TYPE_LABELS = {
  air_purifier_rental: '공기청정기 렌탈',
  digital_ad: '디지털 광고',
  document_shredding: '문서파기',
  physical_security: '물리보안',
  viral_marketing: '바이럴 마케팅',
  pest_control: '방역소독',
  mandatory_education: '법정의무교육',
  security_guard: '보안경비',
  copier_rental: '복합기 렌탈',
  bidet_rental: '비데 렌탈',
  safety_management: '안전관리',
  language_education: '어학교육',
  professional_education: '전문교육',
  landscaping: '조경관리',
  _generic: '일반 구매요청',
}

/* ── 달력 유틸 ── */
function getDaysInMonth(y, m) { return new Date(y, m + 1, 0).getDate() }
function getFirstDayOfWeek(y, m) { return new Date(y, m, 1).getDay() }
function fmtDate(y, m, d) { return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}` }

function getFieldLabel(fields, key) {
  if (!fields || !fields[key]) return key
  return key
}

/* ── 상세 모달 ── */
function DetailModal({ req, onClose, onStatusChange, onDelete }) {
  const [selectFocused, setSelectFocused] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  if (!req) return null

  const fields = req.fields || {}
  const fieldKeys = Object.keys(fields).filter(k => fields[k])

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
              {req.title || PR_TYPE_LABELS[req.pr_type] || '구매요청서 상세'}
            </div>
            <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>
              {PR_TYPE_LABELS[req.pr_type] || req.pr_type} · {new Date(req.created_at).toLocaleString('ko-KR')}
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
              <option value="draft">작성중</option>
              <option value="submitted">제출됨</option>
              <option value="supplier_selected">업체선택</option>
              <option value="forwarded">전달됨</option>
            </select>
            <span style={{ fontSize: 11, color: '#94A3B8', marginLeft: 'auto' }}>Session: {req.session_id?.slice(0, 8)}</span>
          </div>

          {/* 공급업체 정보 */}
          {req.selected_supplier_name && (
            <div style={{
              marginBottom: 20, padding: '12px 16px', borderRadius: 12,
              background: '#F0FDF4', border: '1px solid #BBF7D0',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="#059669" style={{ width: 18, height: 18, flexShrink: 0 }}>
                <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
              </svg>
              <div>
                <div style={{ fontSize: 11, color: '#64748B' }}>선택된 공급업체</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#059669' }}>{req.selected_supplier_name}</div>
              </div>
            </div>
          )}

          {/* 요청자 정보 */}
          {(req.department || req.requester) && (
            <div style={{ marginBottom: 16 }}>
              <div style={{
                fontSize: 12, fontWeight: 700, color: '#0D9488',
                marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#0D9488' }} />
                요청자 정보
              </div>
              <div style={{ background: '#FAFBFC', borderRadius: 12, overflow: 'hidden' }}>
                {req.department && (
                  <div style={{ display: 'flex', padding: '10px 16px', borderBottom: '1px solid #F0F2F5' }}>
                    <span style={{ width: 120, fontSize: 12, color: '#64748B', fontWeight: 500, flexShrink: 0 }}>요청부서</span>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#1E293B' }}>{req.department}</span>
                  </div>
                )}
                {req.requester && (
                  <div style={{ display: 'flex', padding: '10px 16px', borderBottom: '1px solid #F0F2F5' }}>
                    <span style={{ width: 120, fontSize: 12, color: '#64748B', fontWeight: 500, flexShrink: 0 }}>요청자</span>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#1E293B' }}>{req.requester}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PR 필드 */}
          {fieldKeys.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{
                fontSize: 12, fontWeight: 700, color: '#2563EB',
                marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#2563EB' }} />
                구매요청 필드 ({fieldKeys.length}개)
              </div>
              <div style={{ background: '#FAFBFC', borderRadius: 12, overflow: 'hidden' }}>
                {fieldKeys.map((k, i) => (
                  <div key={k} style={{
                    display: 'flex', padding: '10px 16px',
                    borderBottom: i < fieldKeys.length - 1 ? '1px solid #F0F2F5' : 'none',
                  }}>
                    <span style={{ width: 120, fontSize: 12, color: '#64748B', fontWeight: 500, flexShrink: 0 }}>{k}</span>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#1E293B', wordBreak: 'break-word' }}>
                      {String(fields[k])}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PR 상세 보기 링크 */}
          <div style={{ marginTop: 16, textAlign: 'center' }}>
            <a
              href={`${import.meta.env.VITE_API_URL || 'https://ip-assist-backend-1058034030780.asia-northeast3.run.app'}/pr/view/${req.id}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-block', padding: '8px 20px', borderRadius: 10,
                border: '1px solid #0D9488', color: '#0D9488', fontSize: 13,
                fontWeight: 600, textDecoration: 'none', transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.target.style.background = '#F0FDFA' }}
              onMouseLeave={e => { e.target.style.background = 'transparent' }}
            >
              구매요청서 보기
            </a>
          </div>
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
function PrRequests() {
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
      const data = await api.getPrRequests()
      setRequests(data.pr_requests || [])
    } catch (err) {
      console.error('PR 신청 로드 실패:', err)
    }
    setLoading(false)
  }

  const handleStatusChange = async (id, newStatus) => {
    try {
      await api.updatePrStatus(id, newStatus)
      await loadRequests()
      if (detailReq?.id === id) setDetailReq(prev => ({ ...prev, status: newStatus }))
    } catch (err) { alert('상태 변경 실패') }
  }

  const handleDelete = async (id) => {
    try {
      await api.deletePrRequest(id)
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
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1E293B', margin: 0 }}>구매요청서 관리</h1>
        <p style={{ fontSize: 14, color: '#94A3B8', marginTop: 6 }}>날짜별 구매요청서 내역을 조회합니다.</p>
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
                이달 요청 {monthTotal}건
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

        {/* ── 우측: 날짜별 PR 리스트 ── */}
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
                <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="2" /><path d="M9 14h.01" /><path d="M13 14h2" /><path d="M9 18h.01" /><path d="M13 18h2" />
              </svg>
              <span style={{ fontSize: 15, fontWeight: 650, color: '#1E293B' }}>
                {selectedDate.replace(/-/g, '.')} 구매요청 목록
              </span>
            </div>
            <span style={{ fontSize: 13, color: '#94A3B8' }}>{filtered.length}건</span>
          </div>

          {/* 테이블 헤더 */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 120px 100px 90px 80px 70px',
            padding: '10px 24px', borderBottom: '1px solid #F0F2F5', background: '#FAFBFC',
          }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8' }}>제목</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8' }}>유형</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8' }}>요청자</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8' }}>공급업체</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8', textAlign: 'center' }}>상태</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8', textAlign: 'center' }}>상세</div>
          </div>

          {/* 리스트 */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {paged.length === 0 ? (
              <div style={{ padding: '60px 0', textAlign: 'center', color: '#94A3B8', fontSize: 14 }}>
                해당 날짜의 구매요청이 없습니다.
              </div>
            ) : paged.map((req, idx) => {
              const sm = STATUS_MAP[req.status]
              return (
                <div key={req.id} style={{
                  display: 'grid', gridTemplateColumns: '1fr 120px 100px 90px 80px 70px',
                  padding: '14px 24px', alignItems: 'center',
                  borderBottom: idx < paged.length - 1 ? '1px solid #F8FAFC' : 'none',
                  background: hoveredRow === idx ? '#F8FFFE' : 'transparent',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={() => setHoveredRow(idx)}
                onMouseLeave={() => setHoveredRow(null)}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#1E293B' }}>
                      {req.title || PR_TYPE_LABELS[req.pr_type] || '제목 없음'}
                    </div>
                    <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>
                      {req.department || '-'}
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: '#64748B' }}>
                    {PR_TYPE_LABELS[req.pr_type] || req.pr_type || '-'}
                  </div>
                  <div style={{ fontSize: 13, color: '#64748B' }}>
                    {req.requester || '-'}
                  </div>
                  <div style={{ fontSize: 12, color: req.selected_supplier_name ? '#059669' : '#CBD5E1', fontWeight: req.selected_supplier_name ? 600 : 400 }}>
                    {req.selected_supplier_name || '-'}
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

export default PrRequests

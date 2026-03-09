import { useState, useEffect } from 'react'
import { api } from '../../api/client'

const PAGE_SIZE = 10
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

const STATUS_MAP = {
  submitted: { label: '신청', bg: '#EFF6FF', color: '#2563EB' },
  reviewing: { label: '검토중', bg: '#FFFBEB', color: '#D97706' },
  approved:  { label: '승인', bg: '#ECFDF5', color: '#059669' },
  rejected:  { label: '반려', bg: '#FEF2F2', color: '#DC2626' },
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
          {/* 기본 정보 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            {[
              { label: '기관명', value: req.org_name },
              { label: '부서', value: req.department },
              { label: '요청자', value: req.requester },
              { label: 'Session', value: req.session_id?.slice(0, 8) },
            ].map(item => (
              <div key={item.label} style={{ background: '#FAFBFC', borderRadius: 12, padding: 14 }}>
                <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 4 }}>{item.label}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1E293B' }}>{item.value || '-'}</div>
              </div>
            ))}
          </div>

          {/* 상태 변경 */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>상태 변경</div>
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
            </select>
          </div>

          {/* 입력 필드 */}
          {req.fields && Object.keys(req.fields).length > 0 && (
            <>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>입력 필드</div>
              <div style={{ background: '#FAFBFC', borderRadius: 12, overflow: 'hidden' }}>
                {Object.entries(req.fields).map(([k, v], i, arr) => (
                  <div key={k} style={{
                    display: 'flex', padding: '10px 16px',
                    borderBottom: i < arr.length - 1 ? '1px solid #F0F2F5' : 'none',
                  }}>
                    <span style={{ width: 128, fontSize: 12, color: '#94A3B8', fontWeight: 500, flexShrink: 0 }}>{k}</span>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#1E293B' }}>{String(v)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
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

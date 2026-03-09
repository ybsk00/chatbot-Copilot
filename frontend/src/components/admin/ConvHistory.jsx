import { useState, useEffect } from 'react'
import { api } from '../../api/client'

const PAGE_SIZE = 10
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

/* ── 달력 유틸 ── */
function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}
function getFirstDayOfWeek(year, month) {
  return new Date(year, month, 1).getDay()
}
function formatDate(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/* ── 대화 상세 모달 ── */
function DetailModal({ conv, onClose }) {
  if (!conv) return null
  const messages = conv.messages || []
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
          padding: '18px 24px', borderBottom: '1px solid #F0F2F5',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#1E293B' }}>
              {conv.user_name || '익명'} — {conv.category || '카테고리 없음'}
            </div>
            <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>
              {new Date(conv.created_at).toLocaleString('ko-KR')} | RAG: {conv.rag_score ? conv.rag_score.toFixed(2) : 'N/A'}
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
        {/* 메시지 */}
        <div style={{ padding: 20, overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {messages.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#94A3B8', fontSize: 14 }}>메시지가 없습니다.</div>
          ) : messages.map((msg, i) => (
            <div key={i} style={{
              padding: '10px 14px', borderRadius: 12, fontSize: 13, lineHeight: 1.6,
              ...(msg.role === 'user'
                ? { background: '#F0FDFA', color: '#0D9488', marginLeft: 40 }
                : { background: '#F8FAFC', color: '#475569', marginRight: 40 }),
            }}>
              <span style={{ fontSize: 11, fontWeight: 600, opacity: 0.6, display: 'block', marginBottom: 3 }}>
                {msg.role === 'user' ? '사용자' : '상담도우미'}
              </span>
              <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{msg.content}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── 메인 컴포넌트 ── */
function ConvHistory() {
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)

  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState(formatDate(today.getFullYear(), today.getMonth(), today.getDate()))
  const [page, setPage] = useState(1)
  const [detailConv, setDetailConv] = useState(null)
  const [hoveredRow, setHoveredRow] = useState(null)
  const [hoveredDay, setHoveredDay] = useState(null)

  useEffect(() => { loadConversations() }, [])

  const loadConversations = async () => {
    try {
      const data = await api.getConversations()
      setConversations(data.conversations || [])
    } catch (err) {
      console.error('Conversations load error:', err)
    }
    setLoading(false)
  }

  // 날짜별 대화 수 집계
  const countByDate = {}
  conversations.forEach(c => {
    const d = c.created_at?.slice(0, 10)
    if (d) countByDate[d] = (countByDate[d] || 0) + 1
  })

  // 선택된 날짜의 대화 필터
  const filtered = conversations.filter(c => c.created_at?.slice(0, 10) === selectedDate)
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  // 월 변경
  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(viewYear - 1); setViewMonth(11) }
    else setViewMonth(viewMonth - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(viewYear + 1); setViewMonth(0) }
    else setViewMonth(viewMonth + 1)
  }

  // 날짜 선택
  const handleDateClick = (day) => {
    const dateStr = formatDate(viewYear, viewMonth, day)
    setSelectedDate(dateStr)
    setPage(1)
  }

  // 달력 렌더
  const daysInMonth = getDaysInMonth(viewYear, viewMonth)
  const firstDay = getFirstDayOfWeek(viewYear, viewMonth)

  // 이번 달 대화 총 수
  const monthPrefix = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`
  const monthTotal = conversations.filter(c => c.created_at?.startsWith(monthPrefix)).length

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
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1E293B', margin: 0 }}>대화 이력</h1>
        <p style={{ fontSize: 14, color: '#94A3B8', marginTop: 6 }}>날짜별 사용자 상담 대화 내역을 조회합니다.</p>
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
                이달 대화 {monthTotal}건
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
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
            padding: '10px 12px 6px',
          }}>
            {WEEKDAYS.map((d, i) => (
              <div key={d} style={{
                textAlign: 'center', fontSize: 12, fontWeight: 600,
                color: i === 0 ? '#EF4444' : i === 6 ? '#3B82F6' : '#94A3B8',
              }}>
                {d}
              </div>
            ))}
          </div>

          {/* 날짜 그리드 */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
            padding: '4px 12px 16px', gap: '2px 0',
          }}>
            {/* 빈 칸 */}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`e-${i}`} style={{ height: 52 }} />
            ))}
            {/* 날짜 */}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
              const dateStr = formatDate(viewYear, viewMonth, day)
              const count = countByDate[dateStr] || 0
              const isSelected = selectedDate === dateStr
              const isToday = dateStr === formatDate(today.getFullYear(), today.getMonth(), today.getDate())
              const isHovered = hoveredDay === day
              const dayOfWeek = new Date(viewYear, viewMonth, day).getDay()

              return (
                <button
                  key={day}
                  onClick={() => handleDateClick(day)}
                  onMouseEnter={() => setHoveredDay(day)}
                  onMouseLeave={() => setHoveredDay(null)}
                  style={{
                    height: 52, border: 'none', borderRadius: 10, cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    gap: 2, padding: 0,
                    background: isSelected ? '#0D9488' : isHovered ? '#F0FDFA' : 'transparent',
                    transition: 'all 0.15s',
                  }}
                >
                  <span style={{
                    fontSize: 13, fontWeight: isToday || isSelected ? 700 : 500,
                    color: isSelected ? '#fff'
                      : isToday ? '#0D9488'
                      : dayOfWeek === 0 ? '#EF4444'
                      : dayOfWeek === 6 ? '#3B82F6'
                      : '#374151',
                  }}>
                    {day}
                  </span>
                  {count > 0 && (
                    <span style={{
                      fontSize: 10, fontWeight: 700, lineHeight: 1,
                      color: isSelected ? 'rgba(255,255,255,0.9)' : '#0D9488',
                      background: isSelected ? 'rgba(255,255,255,0.2)' : '#E0F7F6',
                      padding: '2px 6px', borderRadius: 6, minWidth: 16, textAlign: 'center',
                    }}>
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* ── 우측: 날짜별 대화 리스트 ── */}
        <div style={{
          flex: 1,
          background: '#fff', borderRadius: 18, border: '1px solid #F0F2F5',
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
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <span style={{ fontSize: 15, fontWeight: 650, color: '#1E293B' }}>
                {selectedDate.replace(/-/g, '.')} 대화 목록
              </span>
            </div>
            <span style={{ fontSize: 13, color: '#94A3B8' }}>{filtered.length}건</span>
          </div>

          {/* 테이블 헤더 */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 140px 100px 70px 80px',
            padding: '10px 24px', borderBottom: '1px solid #F0F2F5', background: '#FAFBFC',
          }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8' }}>사용자</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8' }}>카테고리</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8' }}>시간</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8', textAlign: 'center' }}>상태</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8', textAlign: 'center' }}>상세</div>
          </div>

          {/* 리스트 */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {paged.length === 0 ? (
              <div style={{ padding: '60px 0', textAlign: 'center', color: '#94A3B8', fontSize: 14 }}>
                해당 날짜의 대화 이력이 없습니다.
              </div>
            ) : (
              paged.map((conv, idx) => {
                const time = new Date(conv.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
                return (
                  <div
                    key={conv.id}
                    style={{
                      display: 'grid', gridTemplateColumns: '1fr 140px 100px 70px 80px',
                      padding: '14px 24px', alignItems: 'center',
                      borderBottom: idx < paged.length - 1 ? '1px solid #F8FAFC' : 'none',
                      background: hoveredRow === idx ? '#F8FFFE' : 'transparent',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={() => setHoveredRow(idx)}
                    onMouseLeave={() => setHoveredRow(null)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                        background: '#F0FDFA', color: '#0D9488',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 700,
                      }}>
                        {(conv.user_name || '익')[0]}
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#1E293B' }}>
                          {conv.user_name || '익명'}
                        </div>
                        <div style={{ fontSize: 11, color: '#94A3B8' }}>
                          {conv.department || ''}
                        </div>
                      </div>
                    </div>
                    <div style={{ fontSize: 13, color: '#64748B' }}>
                      {conv.category || '-'}
                    </div>
                    <div style={{ fontSize: 13, color: '#64748B' }}>
                      {time}
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6,
                        background: conv.status === 'active' ? '#ECFDF5' : conv.status === 'complete' ? '#F0FDFA' : '#F1F5F9',
                        color: conv.status === 'active' ? '#059669' : conv.status === 'complete' ? '#0D9488' : '#94A3B8',
                      }}>
                        {conv.status === 'active' ? '진행' : conv.status === 'complete' ? '완료' : conv.status || '-'}
                      </span>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <button
                        onClick={() => setDetailConv(conv)}
                        style={{
                          padding: '6px 12px', borderRadius: 8, border: '1px solid #E2E8F0',
                          background: '#fff', fontSize: 12, fontWeight: 600, color: '#64748B',
                          cursor: 'pointer', transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => { e.target.style.borderColor = '#0D9488'; e.target.style.color = '#0D9488' }}
                        onMouseLeave={e => { e.target.style.borderColor = '#E2E8F0'; e.target.style.color = '#64748B' }}
                      >
                        보기
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div style={{
              padding: '14px 24px', borderTop: '1px solid #F0F2F5',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                style={{
                  padding: '6px 12px', borderRadius: 8, border: '1px solid #E2E8F0',
                  background: '#fff', fontSize: 12, fontWeight: 600,
                  color: currentPage <= 1 ? '#CBD5E1' : '#64748B',
                  cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
                }}
              >
                이전
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button
                  key={p} onClick={() => setPage(p)}
                  style={{
                    width: 32, height: 32, borderRadius: 8, border: 'none',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    background: p === currentPage ? '#0D9488' : 'transparent',
                    color: p === currentPage ? '#fff' : '#64748B',
                  }}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                style={{
                  padding: '6px 12px', borderRadius: 8, border: '1px solid #E2E8F0',
                  background: '#fff', fontSize: 12, fontWeight: 600,
                  color: currentPage >= totalPages ? '#CBD5E1' : '#64748B',
                  cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                }}
              >
                다음
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 대화 상세 모달 */}
      {detailConv && (
        <DetailModal conv={detailConv} onClose={() => setDetailConv(null)} />
      )}
    </div>
  )
}

export default ConvHistory

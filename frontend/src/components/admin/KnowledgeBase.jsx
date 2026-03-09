import { useState, useEffect } from 'react'
import { api } from '../../api/client'

/* ── 아이콘 컴포넌트 ── */
const CardIcon = ({ color, bg, children }) => (
  <div style={{
    width: 48, height: 48, borderRadius: 14, flexShrink: 0,
    background: bg, color: color,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }}>
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style={{ width: 24, height: 24 }}>
      {children}
    </svg>
  </div>
)

/* ── 통계 카드 스타일 ── */
const CARD_STYLES = [
  {
    bg: '#E0F7F6', color: '#0D9488',
    icon: <path d="M11.25 4.533A9.707 9.707 0 0 0 6 3a9.735 9.735 0 0 0-3.25.555.75.75 0 0 0-.5.707v14.25a.75.75 0 0 0 1 .707A8.237 8.237 0 0 1 6 18.75c1.995 0 3.823.707 5.25 1.886V4.533ZM12.75 20.636A8.214 8.214 0 0 1 18 18.75c.966 0 1.89.166 2.75.47a.75.75 0 0 0 1-.708V4.262a.75.75 0 0 0-.5-.707A9.735 9.735 0 0 0 18 3a9.707 9.707 0 0 0-5.25 1.533v16.103Z" />,
  },
  {
    bg: '#FCE7F3', color: '#DB2777',
    icon: <path fillRule="evenodd" d="M4.804 21.644A6.707 6.707 0 0 0 6 21.75a6.721 6.721 0 0 0 3.583-1.029c.774.182 1.584.279 2.417.279 5.322 0 9.75-3.97 9.75-9 0-5.03-4.428-9-9.75-9s-9.75 3.97-9.75 9c0 2.09.768 4.04 2.084 5.558a8.96 8.96 0 0 1-1.603 2.602.75.75 0 0 0 .58 1.238 10.622 10.622 0 0 0 1.493-.246Z" clipRule="evenodd" />,
  },
  {
    bg: '#FEF3C7', color: '#D97706',
    icon: <path fillRule="evenodd" d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0 0 16.5 9h-1.875a1.875 1.875 0 0 1-1.875-1.875V5.25A3.75 3.75 0 0 0 9 1.5H5.625ZM7.5 15a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5A.75.75 0 0 1 7.5 15Zm.75 2.25a.75.75 0 0 0 0 1.5H12a.75.75 0 0 0 0-1.5H8.25Z" clipRule="evenodd" />,
  },
  {
    bg: '#EDE9FE', color: '#7C3AED',
    icon: <path fillRule="evenodd" d="M2.25 13.5a8.25 8.25 0 0 1 8.25-8.25.75.75 0 0 1 .75.75v6.75H18a.75.75 0 0 1 .75.75 8.25 8.25 0 0 1-16.5 0Z" clipRule="evenodd" />,
  },
]

const PAGE_SIZE = 10

function KnowledgeBase() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [hoveredRow, setHoveredRow] = useState(null)
  const [page, setPage] = useState(1)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      const res = await api.getKnowledgeOverview()
      setData(res)
    } catch (err) {
      console.error('Knowledge overview error:', err)
    }
    setLoading(false)
  }

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

  const cards = [
    { label: '총 청크 수', value: data?.total_chunks || 0 },
    { label: '총 FAQ 수', value: data?.total_faqs || 0 },
    { label: '문서 수', value: data?.total_documents || 0 },
    { label: '카테고리 수', value: data?.total_categories || 0 },
  ]

  const categories = data?.categories || []
  const totalPages = Math.max(1, Math.ceil(categories.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paged = categories.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  return (
    <div>
      {/* 페이지 헤더 */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1E293B', margin: 0 }}>지식베이스 현황</h1>
        <p style={{ fontSize: 14, color: '#94A3B8', marginTop: 6 }}>카테고리별 청크 DB 및 FAQ DB 현황을 확인합니다.</p>
      </div>

      {/* 통계 카드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 28 }}>
        {cards.map((card, i) => {
          const st = CARD_STYLES[i]
          return (
            <div key={card.label} style={{
              background: '#fff', borderRadius: 18, padding: '24px 22px',
              border: '1px solid #F0F2F5',
              boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
              transition: 'box-shadow 0.2s, transform 0.2s',
              cursor: 'default',
            }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.06)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.02)'; e.currentTarget.style.transform = 'none' }}
            >
              <div style={{ marginBottom: 18 }}>
                <CardIcon bg={st.bg} color={st.color}>{st.icon}</CardIcon>
              </div>
              <div style={{ fontSize: 13, color: '#64748B', marginBottom: 6, fontWeight: 500 }}>{card.label}</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: '#1E293B', letterSpacing: '-0.02em', lineHeight: 1 }}>
                {card.value.toLocaleString()}
              </div>
            </div>
          )
        })}
      </div>

      {/* 카테고리별 현황 테이블 */}
      <div style={{
        background: '#fff', borderRadius: 18, border: '1px solid #F0F2F5',
        boxShadow: '0 1px 4px rgba(0,0,0,0.02)', overflow: 'hidden',
      }}>
        <div style={{
          padding: '18px 24px', borderBottom: '1px solid #F0F2F5',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
            <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
          </svg>
          <span style={{ fontSize: 15, fontWeight: 650, color: '#1E293B' }}>카테고리별 DB 현황</span>
          <span style={{ fontSize: 12, color: '#94A3B8', marginLeft: 'auto' }}>{categories.length}개 카테고리</span>
        </div>

        {categories.length === 0 ? (
          <div style={{ padding: '60px 0', textAlign: 'center', color: '#94A3B8', fontSize: 14 }}>
            등록된 지식베이스 데이터가 없습니다.
          </div>
        ) : (
          <div>
            {/* 테이블 헤더 */}
            <div style={{
              display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr',
              padding: '12px 24px', borderBottom: '1px solid #F0F2F5',
              background: '#FAFBFC',
            }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.03em' }}>카테고리</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8', textAlign: 'right' }}>청크 수</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8', textAlign: 'right' }}>FAQ 수</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8', textAlign: 'right' }}>문서 수</div>
            </div>

            {/* 데이터 행 */}
            {paged.map((cat, idx) => (
              <div
                key={cat.category}
                style={{
                  display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr',
                  padding: '16px 24px',
                  borderBottom: idx < paged.length - 1 ? '1px solid #F8FAFC' : 'none',
                  background: hoveredRow === idx ? '#F8FFFE' : 'transparent',
                  transition: 'background 0.15s',
                  cursor: 'default',
                }}
                onMouseEnter={() => setHoveredRow(idx)}
                onMouseLeave={() => setHoveredRow(null)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: '#10B981',
                    boxShadow: '0 0 6px rgba(16,185,129,0.4)',
                    flexShrink: 0,
                  }} />
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#1E293B' }}>{cat.category}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{
                    fontSize: 14, fontWeight: 700, color: '#0D9488',
                    background: '#F0FDFA', padding: '4px 12px', borderRadius: 8,
                  }}>
                    {cat.chunks.toLocaleString()}
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{
                    fontSize: 14, fontWeight: 700, color: '#DB2777',
                    background: '#FDF2F8', padding: '4px 12px', borderRadius: 8,
                  }}>
                    {cat.faqs.toLocaleString()}
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{
                    fontSize: 14, fontWeight: 700, color: '#D97706',
                    background: '#FFFBEB', padding: '4px 12px', borderRadius: 8,
                  }}>
                    {cat.documents.toLocaleString()}
                  </span>
                </div>
              </div>
            ))}

            {/* 합계 행 */}
            <div style={{
              display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr',
              padding: '16px 24px',
              borderTop: '2px solid #F0F2F5',
              background: '#FAFBFC',
            }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1E293B' }}>합계</div>
              <div style={{ textAlign: 'right', fontSize: 14, fontWeight: 800, color: '#0D9488' }}>
                {(data?.total_chunks || 0).toLocaleString()}
              </div>
              <div style={{ textAlign: 'right', fontSize: 14, fontWeight: 800, color: '#DB2777' }}>
                {(data?.total_faqs || 0).toLocaleString()}
              </div>
              <div style={{ textAlign: 'right', fontSize: 14, fontWeight: 800, color: '#D97706' }}>
                {(data?.total_documents || 0).toLocaleString()}
              </div>
            </div>

            {/* 페이지네이션 */}
            {totalPages > 1 && (
              <div style={{
                padding: '16px 24px', borderTop: '1px solid #F0F2F5',
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
                >이전</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => setPage(p)} style={{
                    width: 32, height: 32, borderRadius: 8, border: 'none',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    background: p === currentPage ? '#0D9488' : 'transparent',
                    color: p === currentPage ? '#fff' : '#64748B',
                    transition: 'all 0.15s',
                  }}>{p}</button>
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
                >다음</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default KnowledgeBase

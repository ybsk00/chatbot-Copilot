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
    icon: <path fillRule="evenodd" d="M12.516 2.17a.75.75 0 0 0-1.032 0 11.209 11.209 0 0 1-7.877 3.08.75.75 0 0 0-.722.515A12.74 12.74 0 0 0 2.25 9.75c0 5.942 4.064 10.933 9.563 12.348a.749.749 0 0 0 .374 0c5.499-1.415 9.563-6.406 9.563-12.348 0-1.39-.223-2.73-.635-3.985a.75.75 0 0 0-.722-.516 11.209 11.209 0 0 1-7.877-3.08Z" clipRule="evenodd" />,
  },
  {
    bg: '#EDE9FE', color: '#7C3AED',
    icon: <path fillRule="evenodd" d="M4.5 2.25a.75.75 0 0 0 0 1.5v16.5h-.75a.75.75 0 0 0 0 1.5h16.5a.75.75 0 0 0 0-1.5h-.75V3.75a.75.75 0 0 0 0-1.5h-15ZM9 6a.75.75 0 0 0 0 1.5h1.5a.75.75 0 0 0 0-1.5H9Zm-.75 3.75A.75.75 0 0 1 9 9h1.5a.75.75 0 0 1 0 1.5H9a.75.75 0 0 1-.75-.75ZM9 12a.75.75 0 0 0 0 1.5h1.5a.75.75 0 0 0 0-1.5H9Zm3.75-5.25A.75.75 0 0 1 13.5 6H15a.75.75 0 0 1 0 1.5h-1.5a.75.75 0 0 1-.75-.75ZM13.5 9a.75.75 0 0 0 0 1.5H15a.75.75 0 0 0 0-1.5h-1.5Zm-.75 3.75a.75.75 0 0 1 .75-.75H15a.75.75 0 0 1 0 1.5h-1.5a.75.75 0 0 1-.75-.75ZM9 19.5v-2.25a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 .75.75v2.25H9Z" clipRule="evenodd" />,
  },
]

function Dashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => { loadStats() }, [])

  const loadStats = async () => {
    setError(null)
    try {
      const data = await api.getDashboard()
      setStats(data)
    } catch (err) {
      console.error('Dashboard load error:', err)
      setError(err.name === 'AbortError' ? '응답 시간 초과 (8초)' : '데이터를 불러올 수 없습니다')
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
          <div style={{ fontSize: 14, color: '#94A3B8' }}>대시보드 로딩 중...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 14, color: '#EF4444', marginBottom: 12 }}>{error}</div>
          <button onClick={() => { setLoading(true); loadStats() }}
            style={{ padding: '8px 20px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', cursor: 'pointer', fontSize: 13 }}>
            다시 시도
          </button>
        </div>
      </div>
    )
  }

  const cards = [
    { label: '지식베이스 청크', value: stats?.knowledge_chunks || 0 },
    { label: '총 대화 수', value: stats?.conversations || 0 },
    { label: '헌법 조항', value: stats?.constitution_rules || 0 },
    { label: '등록 공급업체', value: stats?.suppliers || 0 },
  ]

  return (
    <div>
      {/* 페이지 헤더 */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1E293B', margin: 0 }}>시스템 개요</h1>
        <p style={{ fontSize: 14, color: '#94A3B8', marginTop: 6 }}>실시간 지표 모니터링</p>
      </div>

      {/* 통계 카드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
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
    </div>
  )
}

export default Dashboard

import { useState, useEffect } from 'react'
import { api } from '../../api/client'
import Dashboard from './Dashboard'
import KnowledgeBase from './KnowledgeBase'
import Constitution from './Constitution'
import ConvHistory from './ConvHistory'
import Suppliers from './Suppliers'
// import Taxonomy from './Taxonomy'  // 분류체계 메뉴 비활성화
import UserManagement from './UserManagement'
import RfpRequests from './RfpRequests'
// import SupplierRecommend from './SupplierRecommend'  // 공급업체 관리로 통합
import RfpTemplates from './RfpTemplates'
import PrRequests from './PrRequests'

/* ── SVG Icons (stroke, 20×20) ── */
const Icon = ({ children, size = 20 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"
    style={{ width: size, height: size, flexShrink: 0 }}>
    {children}
  </svg>
)

const ICONS = {
  dashboard: <Icon><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="4" rx="1.5"/><rect x="14" y="11" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="4" rx="1.5"/></Icon>,
  knowledge: <Icon><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></Icon>,
  constitution: <Icon><path d="M12 3 2 7l10 4 10-4-10-4Z"/><path d="m2 17 10 4 10-4"/><path d="m2 12 10 4 10-4"/></Icon>,
  conversations: <Icon><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></Icon>,
  'rfp-requests': <Icon><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a1 1 0 0 0 1 1h3"/><path d="M10 13h4"/><path d="M10 17h4"/></Icon>,
  'pr-requests': <Icon><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="2"/><path d="M9 14h.01"/><path d="M13 14h2"/><path d="M9 18h.01"/><path d="M13 18h2"/></Icon>,
  'rfp-templates': <Icon><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/></Icon>,
  suppliers: <Icon><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></Icon>,
  // taxonomy: <Icon><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></Icon>,  // 분류체계 메뉴 비활성화
  users: <Icon><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></Icon>,
}

const NAV_SECTIONS = [
  {
    items: [
      { key: 'dashboard', label: '대시보드' },
      { key: 'knowledge', label: '지식베이스' },
      { key: 'constitution', label: '헌법관리' },
      { key: 'conversations', label: '대화 이력' },
    ]
  },
  {
    title: '애플리케이션',
    items: [
      { key: 'rfp-requests', label: 'RFP 신청' },
      { key: 'pr-requests', label: '구매요청서' },
      { key: 'rfp-templates', label: 'RFP 양식' },
      { key: 'suppliers', label: '공급업체 관리' },
      // { key: 'taxonomy', label: '분류체계' },  // 분류체계 메뉴 비활성화
      { key: 'users', label: '사용자 관리' },
    ]
  },
]

const TAB_TITLES = {
  dashboard: '관리자 대시보드',
  knowledge: '지식베이스 관리',
  constitution: '헌법 관리',
  conversations: '대화 이력',
  'rfp-requests': 'RFP 신청 관리',
  'pr-requests': '구매요청서 관리',
  'rfp-templates': 'RFP 양식 관리',
  suppliers: '공급업체 관리',
  // taxonomy: '분류체계 관리',  // 분류체계 메뉴 비활성화
  users: '사용자 관리',
}

const ROLE_LABEL = { superadmin: '최고 관리자', admin: '관리자', viewer: '뷰어' }

function AdminPage() {
  const [user, setUser] = useState(null)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const saved = sessionStorage.getItem('admin_user')
    if (saved) setUser(JSON.parse(saved))
  }, [])

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoginError('')
    setLoading(true)
    try {
      const res = await api.login(email, password)
      if (res.ok) {
        setUser(res.user)
        sessionStorage.setItem('admin_user', JSON.stringify(res.user))
      } else {
        setLoginError(res.error || '로그인에 실패했습니다.')
      }
    } catch {
      setLoginError('서버 연결에 실패했습니다.')
    }
    setLoading(false)
  }

  const handleLogout = () => {
    setUser(null)
    sessionStorage.removeItem('admin_user')
  }

  /* ═══ 로그인 화면 (라이트 모드) ═══ */
  if (!user) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #F0FDFA 0%, #F8FAFC 30%, #F3EFFA 60%, #EFF6FF 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {/* 배경 블롭 */}
        <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
          <div style={{
            position: 'absolute', width: 500, height: 500, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(14,165,160,0.06) 0%, transparent 70%)',
            top: '-5%', right: '10%',
          }} />
          <div style={{
            position: 'absolute', width: 400, height: 400, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(139,92,246,0.05) 0%, transparent 70%)',
            bottom: '5%', left: '5%',
          }} />
        </div>

        <form onSubmit={handleLogin} style={{
          width: 440, padding: '48px 44px', borderRadius: 24,
          background: 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.6)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.06), 0 4px 20px rgba(0,0,0,0.03)',
          position: 'relative', zIndex: 1,
        }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{
              width: 64, height: 64, borderRadius: 18, margin: '0 auto 20px',
              background: 'linear-gradient(135deg, #0ea5a0, #06b6d4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 24, color: '#fff', fontWeight: 800,
              boxShadow: '0 8px 24px rgba(14,165,160,0.25)',
            }}>W9</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#1E293B', letterSpacing: '-0.02em' }}>업무마켓9 관리자</div>
            <div style={{ fontSize: 14, color: '#94A3B8', marginTop: 6 }}>관리자 계정으로 로그인하세요</div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 8, display: 'block' }}>이메일</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="이메일을 입력하세요" required
              style={{
                width: '100%', padding: '14px 16px', borderRadius: 12,
                border: '1px solid #E2E8F0',
                background: '#F8FAFC', color: '#1E293B',
                fontSize: 14, outline: 'none', boxSizing: 'border-box',
                transition: 'all 0.2s',
              }}
              onFocus={e => { e.target.style.borderColor = '#0ea5a0'; e.target.style.background = '#fff'; e.target.style.boxShadow = '0 0 0 3px rgba(14,165,160,0.08)' }}
              onBlur={e => { e.target.style.borderColor = '#E2E8F0'; e.target.style.background = '#F8FAFC'; e.target.style.boxShadow = 'none' }}
            />
          </div>

          <div style={{ marginBottom: 32 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 8, display: 'block' }}>비밀번호</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="비밀번호를 입력하세요" required
              style={{
                width: '100%', padding: '14px 16px', borderRadius: 12,
                border: '1px solid #E2E8F0',
                background: '#F8FAFC', color: '#1E293B',
                fontSize: 14, outline: 'none', boxSizing: 'border-box',
                transition: 'all 0.2s',
              }}
              onFocus={e => { e.target.style.borderColor = '#0ea5a0'; e.target.style.background = '#fff'; e.target.style.boxShadow = '0 0 0 3px rgba(14,165,160,0.08)' }}
              onBlur={e => { e.target.style.borderColor = '#E2E8F0'; e.target.style.background = '#F8FAFC'; e.target.style.boxShadow = 'none' }}
            />
          </div>

          {loginError && (
            <div style={{
              padding: '12px 16px', borderRadius: 12, marginBottom: 20,
              background: '#FEF2F2', color: '#DC2626',
              fontSize: 13, border: '1px solid #FECACA',
            }}>{loginError}</div>
          )}

          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '15px 0', borderRadius: 14,
            background: loading ? 'rgba(14,165,160,0.4)' : 'linear-gradient(135deg, #0ea5a0, #06b6d4)',
            color: '#fff', fontSize: 15, fontWeight: 700,
            border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            boxShadow: loading ? 'none' : '0 4px 16px rgba(14,165,160,0.25)',
          }}>{loading ? '로그인 중...' : '로그인'}</button>
        </form>
      </div>
    )
  }

  /* ═══ 관리자 메인 ═══ */
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard />
      case 'knowledge': return <KnowledgeBase />
      case 'constitution': return <Constitution />
      case 'conversations': return <ConvHistory />
      case 'rfp-requests': return <RfpRequests />
      case 'pr-requests': return <PrRequests />
      case 'rfp-templates': return <RfpTemplates />
      case 'suppliers': return <Suppliers />
      // case 'taxonomy': return <Taxonomy />  // 분류체계 메뉴 비활성화
      case 'users': return <UserManagement />
      default: return <Dashboard />
    }
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#F8FAFC' }}>
      {/* ── 사이드바 ── */}
      <aside style={{
        width: 250, display: 'flex', flexDirection: 'column',
        background: '#fff',
        borderRight: '1px solid #F0F2F5',
        boxShadow: '2px 0 8px rgba(0,0,0,0.02)',
        flexShrink: 0,
      }}>
        {/* 브랜드 헤더 */}
        <div style={{
          padding: '24px 22px 20px',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12, flexShrink: 0,
            background: 'linear-gradient(135deg, #0ea5a0, #06b6d4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, color: '#fff', fontWeight: 800,
            boxShadow: '0 3px 10px rgba(14,165,160,0.2)',
          }}>W9</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#1E293B', lineHeight: 1.2 }}>업무마켓9</div>
            <div style={{ fontSize: 11, color: '#0D9488', fontWeight: 600, marginTop: 2, letterSpacing: '0.05em' }}>ADMIN PORTAL</div>
          </div>
        </div>

        {/* 네비게이션 */}
        <nav style={{ flex: 1, padding: '8px 14px', overflowY: 'auto' }}>
          {NAV_SECTIONS.map((section, si) => (
            <div key={si} style={{ marginBottom: 8 }}>
              {section.title && (
                <div style={{
                  fontSize: 11, fontWeight: 600, color: '#94A3B8',
                  padding: '16px 10px 8px', letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}>{section.title}</div>
              )}
              {section.items.map(tab => {
                const isActive = activeTab === tab.key
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 14px', width: '100%', textAlign: 'left',
                      borderRadius: 10, border: 'none', cursor: 'pointer',
                      fontSize: 13.5, fontWeight: isActive ? 600 : 450,
                      color: isActive ? '#fff' : '#64748B',
                      background: isActive ? 'linear-gradient(135deg, #0ea5a0, #14B8A6)' : 'transparent',
                      boxShadow: isActive ? '0 3px 12px rgba(14,165,160,0.2)' : 'none',
                      transition: 'all 0.2s ease',
                      marginBottom: 2,
                    }}
                    onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = '#F0FDFA'; e.currentTarget.style.color = '#0D9488' } }}
                    onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748B' } }}
                  >
                    <span style={{ opacity: isActive ? 1 : 0.7 }}>{ICONS[tab.key]}</span>
                    <span>{tab.label}</span>
                  </button>
                )
              })}
            </div>
          ))}
        </nav>

        {/* 하단: 나가기 */}
        <div style={{ padding: '12px 14px', borderTop: '1px solid #F0F2F5' }}>
          <button
            onClick={() => { window.location.href = '/' }}
            style={{
              width: '100%', padding: '10px 14px', borderRadius: 10,
              background: 'transparent', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 10,
              fontSize: 13.5, fontWeight: 450, color: '#64748B',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#F1F5F9'; e.currentTarget.style.color = '#475569' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748B' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20, opacity: 0.7 }}>
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            <span>나가기</span>
          </button>
        </div>
      </aside>

      {/* ── 메인 영역 ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* 탑 헤더 */}
        <header style={{
          height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 28px', background: '#fff',
          borderBottom: '1px solid #F0F2F5',
          flexShrink: 0,
        }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: '#1E293B', margin: 0 }}>
            {TAB_TITLES[activeTab] || '관리자'}
          </h1>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1E293B' }}>{user.name}</div>
            <div style={{ fontSize: 11, color: '#94A3B8' }}>{ROLE_LABEL[user.role] || user.role}</div>

            {/* 로그아웃 */}
            <button
              onClick={handleLogout}
              title="로그아웃"
              style={{
                width: 36, height: 36, borderRadius: 10, border: '1px solid #E8ECF1',
                background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#64748B', transition: 'all 0.15s', marginLeft: 2,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#FEF2F2'; e.currentTarget.style.color = '#DC2626'; e.currentTarget.style.borderColor = '#FECACA' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#64748B'; e.currentTarget.style.borderColor = '#E8ECF1' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          </div>
        </header>

        {/* 콘텐츠 영역 */}
        <main style={{
          flex: 1, overflowY: 'auto', padding: 28,
          background: 'linear-gradient(160deg, #F5FAFA 0%, #F8FAFC 30%, #F6F3FB 60%, #F8FAFC 100%)',
        }}>
          {renderContent()}
        </main>
      </div>
    </div>
  )
}

export default AdminPage

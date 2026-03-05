import { useState } from 'react'
import Dashboard from './Dashboard'
import KnowledgeBase from './KnowledgeBase'
import Constitution from './Constitution'
import ConvHistory from './ConvHistory'
import Suppliers from './Suppliers'
import Taxonomy from './Taxonomy'
import UserManagement from './UserManagement'

const TABS = [
  { key: 'dashboard', label: '대시보드' },
  { key: 'knowledge', label: '지식베이스' },
  { key: 'constitution', label: '헌법 관리' },
  { key: 'conversations', label: '대화 이력' },
  { key: 'suppliers', label: '공급업체' },
  { key: 'taxonomy', label: '분류체계' },
  { key: 'users', label: '사용자 관리' },
]

function AdminPage() {
  const [activeTab, setActiveTab] = useState('dashboard')

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard />
      case 'knowledge': return <KnowledgeBase />
      case 'constitution': return <Constitution />
      case 'conversations': return <ConvHistory />
      case 'suppliers': return <Suppliers />
      case 'taxonomy': return <Taxonomy />
      case 'users': return <UserManagement />
      default: return <Dashboard />
    }
  }

  return (
    <div className="flex h-[calc(100vh-57px)]">
      {/* 사이드바 */}
      <aside className="w-56 bg-white border-r border-gray-200 py-4">
        <div className="px-4 mb-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">관리자</h2>
        </div>
        <nav className="space-y-1 px-2">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                activeTab === tab.key
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* 콘텐츠 영역 */}
      <main className="flex-1 overflow-y-auto p-6">
        {renderContent()}
      </main>
    </div>
  )
}

export default AdminPage

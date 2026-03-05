import { Routes, Route, Link, useLocation } from 'react-router-dom'
import ChatPage from './components/chat/ChatPage'
import AdminPage from './components/admin/AdminPage'

function App() {
  const location = useLocation()
  const isAdmin = location.pathname.startsWith('/admin')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 상단 네비게이션 */}
      <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-blue-600">IP Assist</h1>
          <span className="text-sm text-gray-400">간접구매 AI 코파일럿</span>
        </div>
        <div className="flex gap-2">
          <Link
            to="/"
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              !isAdmin
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            챗봇
          </Link>
          <Link
            to="/admin"
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isAdmin
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            관리자
          </Link>
        </div>
      </nav>

      {/* 라우트 */}
      <Routes>
        <Route path="/" element={<ChatPage />} />
        <Route path="/admin/*" element={<AdminPage />} />
      </Routes>
    </div>
  )
}

export default App

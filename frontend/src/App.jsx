import { Routes, Route } from 'react-router-dom'
import ChatPage from './pages/ChatPage'
import AdminPage from './components/admin/AdminPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<ChatPage />} />
      <Route path="/admin/*" element={<AdminPage />} />
    </Routes>
  )
}

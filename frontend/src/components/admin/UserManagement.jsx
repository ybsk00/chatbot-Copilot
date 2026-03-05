import { useState, useEffect } from 'react'
import { api } from '../../api/client'

function UserManagement() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      const data = await api.getUsers()
      setUsers(data.users || [])
    } catch (err) {
      console.error('Users load error:', err)
    }
    setLoading(false)
  }

  const roleColors = {
    superadmin: 'bg-red-100 text-red-700',
    admin: 'bg-blue-100 text-blue-700',
    viewer: 'bg-gray-100 text-gray-700',
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-400">로딩 중...</div>
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">사용자 관리</h1>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">이름</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">이메일</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">역할</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">부서</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">상태</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">마지막 로그인</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                  등록된 사용자가 없습니다.
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 text-sm font-medium text-gray-800">{user.name}</td>
                  <td className="px-6 py-3 text-sm text-gray-600">{user.email}</td>
                  <td className="px-6 py-3">
                    <span className={`text-xs px-2 py-1 rounded font-medium ${roleColors[user.role] || 'bg-gray-100 text-gray-700'}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-600">{user.department || '-'}</td>
                  <td className="px-6 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      user.is_active ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                    }`}>
                      {user.is_active ? '활성' : '비활성'}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-400">
                    {user.last_login
                      ? new Date(user.last_login).toLocaleDateString('ko-KR')
                      : '-'
                    }
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default UserManagement

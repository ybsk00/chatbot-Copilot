import { useState, useEffect } from 'react'
import { api } from '../../api/client'

function ConvHistory() {
  const [conversations, setConversations] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadConversations()
  }, [])

  const loadConversations = async () => {
    try {
      const data = await api.getConversations()
      setConversations(data.conversations || [])
    } catch (err) {
      console.error('Conversations load error:', err)
    }
    setLoading(false)
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-400">로딩 중...</div>
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">대화 이력</h1>

      <div className="flex gap-6">
        {/* 대화 목록 */}
        <div className="w-1/3 bg-white rounded-xl border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-600">
              전체 대화 ({conversations.length})
            </h2>
          </div>
          <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-400 text-sm">
                대화 이력이 없습니다.
              </div>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setSelected(conv)}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                    selected?.id === conv.id ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      {conv.user_name || '익명'}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      conv.status === 'active'
                        ? 'bg-green-100 text-green-600'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {conv.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {conv.category || '카테고리 없음'} | {new Date(conv.created_at).toLocaleDateString('ko-KR')}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* 대화 상세 */}
        <div className="flex-1 bg-white rounded-xl border border-gray-200">
          {selected ? (
            <div>
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-800">
                  {selected.user_name || '익명'} — {selected.category || '카테고리 없음'}
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  세션: {selected.session_id} | RAG 점수: {selected.rag_score || 'N/A'}
                </p>
              </div>
              <div className="p-6 max-h-[500px] overflow-y-auto space-y-3">
                {(selected.messages || []).map((msg, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-lg text-sm ${
                      msg.role === 'user'
                        ? 'bg-blue-50 text-blue-800 ml-12'
                        : 'bg-gray-50 text-gray-700 mr-12'
                    }`}
                  >
                    <span className="text-xs font-medium opacity-60">
                      {msg.role === 'user' ? '사용자' : 'AI'}
                    </span>
                    <p className="mt-1">{msg.content}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
              대화를 선택하세요
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ConvHistory

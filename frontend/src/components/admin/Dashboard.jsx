import { useState, useEffect } from 'react'
import { api } from '../../api/client'

function Dashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const data = await api.getDashboard()
      setStats(data)
    } catch (err) {
      console.error('Dashboard load error:', err)
    }
    setLoading(false)
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-400">로딩 중...</div>
  }

  const cards = [
    { label: '지식베이스 청크', value: stats?.knowledge_chunks || 0, color: 'blue' },
    { label: '총 대화 수', value: stats?.conversations || 0, color: 'green' },
    { label: '헌법 조항', value: stats?.constitution_rules || 0, color: 'purple' },
    { label: '등록 공급업체', value: stats?.suppliers || 0, color: 'orange' },
  ]

  const colorMap = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    orange: 'bg-orange-50 text-orange-700 border-orange-200',
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">대시보드</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map(card => (
          <div
            key={card.label}
            className={`rounded-xl border p-5 ${colorMap[card.color]}`}
          >
            <p className="text-sm opacity-75">{card.label}</p>
            <p className="text-3xl font-bold mt-1">{card.value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">시스템 정보</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">LLM 모델:</span>
            <span className="ml-2 font-medium">gemini-2.5-flash</span>
          </div>
          <div>
            <span className="text-gray-500">임베딩 모델:</span>
            <span className="ml-2 font-medium">gemini-embedding-001</span>
          </div>
          <div>
            <span className="text-gray-500">정제 모델:</span>
            <span className="ml-2 font-medium">gemini-2.5-flash-lite</span>
          </div>
          <div>
            <span className="text-gray-500">벡터 차원:</span>
            <span className="ml-2 font-medium">1536</span>
          </div>
          <div>
            <span className="text-gray-500">검색 방식:</span>
            <span className="ml-2 font-medium">하이브리드 (Vector 0.7 + BM25 0.3)</span>
          </div>
          <div>
            <span className="text-gray-500">Vector DB:</span>
            <span className="ml-2 font-medium">Supabase pgvector</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard

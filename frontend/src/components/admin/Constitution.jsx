import { useState, useEffect } from 'react'
import { api } from '../../api/client'

function Constitution() {
  const [rules, setRules] = useState([])
  const [loading, setLoading] = useState(true)
  const [newType, setNewType] = useState('행동제어')
  const [newContent, setNewContent] = useState('')
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    loadRules()
  }, [])

  const loadRules = async () => {
    try {
      const data = await api.getConstitution()
      setRules(data.rules || [])
    } catch (err) {
      console.error('Constitution load error:', err)
    }
    setLoading(false)
  }

  const handleAdd = async () => {
    if (!newContent.trim()) return
    setAdding(true)
    try {
      await api.addConstitution(newType, newContent.trim())
      setNewContent('')
      await loadRules()
    } catch (err) {
      console.error('Add rule error:', err)
    }
    setAdding(false)
  }

  const typeColors = {
    '거부조건': 'bg-red-100 text-red-700',
    '행동제어': 'bg-blue-100 text-blue-700',
    '수치기준': 'bg-green-100 text-green-700',
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-400">로딩 중...</div>
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">헌법 관리</h1>

      {/* 새 조항 추가 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">새 조항 추가</h2>
        <div className="flex gap-3">
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="행동제어">행동제어</option>
            <option value="거부조건">거부조건</option>
            <option value="수치기준">수치기준</option>
          </select>
          <input
            type="text"
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
            placeholder="헌법 조항 내용을 입력하세요..."
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <button
            onClick={handleAdd}
            disabled={adding || !newContent.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
          >
            {adding ? '추가 중...' : '추가'}
          </button>
        </div>
      </div>

      {/* 조항 목록 */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">
            활성 조항 ({rules.length})
          </h2>
        </div>
        <div className="divide-y divide-gray-100">
          {rules.map((rule) => (
            <div key={rule.id} className="px-6 py-4 flex items-start gap-3">
              <span className={`text-xs px-2 py-1 rounded font-medium whitespace-nowrap ${typeColors[rule.rule_type] || 'bg-gray-100 text-gray-700'}`}>
                {rule.rule_type}
              </span>
              <p className="text-sm text-gray-700 flex-1">{rule.content}</p>
              <span className={`text-xs px-2 py-0.5 rounded ${rule.is_active ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                {rule.is_active ? '활성' : '비활성'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Constitution

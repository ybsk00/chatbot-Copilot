import { useState, useEffect } from 'react'
import { api } from '../../api/client'

function Suppliers() {
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', category: '', score: 0, tags: '' })

  useEffect(() => {
    loadSuppliers()
  }, [])

  const loadSuppliers = async () => {
    try {
      const data = await api.getSuppliers()
      setSuppliers(data.suppliers || [])
    } catch (err) {
      console.error('Suppliers load error:', err)
    }
    setLoading(false)
  }

  const handleCreate = async () => {
    if (!form.name || !form.category) return
    try {
      await api.createSupplier({
        name: form.name,
        category: form.category,
        score: parseInt(form.score) || 0,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      })
      setForm({ name: '', category: '', score: 0, tags: '' })
      setShowForm(false)
      await loadSuppliers()
    } catch (err) {
      console.error('Create supplier error:', err)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-400">로딩 중...</div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">공급업체 관리</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          {showForm ? '취소' : '+ 공급업체 추가'}
        </button>
      </div>

      {/* 추가 폼 */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">업체명 *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">카테고리 *</label>
              <input
                type="text"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">평가 점수</label>
              <input
                type="number"
                value={form.score}
                onChange={(e) => setForm({ ...form, score: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                min="0" max="100"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">태그 (콤마 구분)</label>
              <input
                type="text"
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="예: ISO인증, 대기업"
              />
            </div>
          </div>
          <button
            onClick={handleCreate}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            등록
          </button>
        </div>
      )}

      {/* 공급업체 테이블 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">업체명</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">카테고리</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">점수</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">매칭률</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">태그</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">상태</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {suppliers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                  등록된 공급업체가 없습니다.
                </td>
              </tr>
            ) : (
              suppliers.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 text-sm font-medium text-gray-800">{s.name}</td>
                  <td className="px-6 py-3 text-sm text-gray-600">{s.category}</td>
                  <td className="px-6 py-3 text-sm text-gray-600">{s.score}</td>
                  <td className="px-6 py-3 text-sm text-gray-600">{s.match_rate}%</td>
                  <td className="px-6 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(s.tags || []).map((tag, i) => (
                        <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      s.status === 'active' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {s.status}
                    </span>
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

export default Suppliers

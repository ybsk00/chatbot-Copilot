import { useState, useEffect } from 'react'
import { api } from '../../api/client'

const STATUS_COLORS = {
  active:   'bg-green-100 text-green-700',
  review:   'bg-yellow-100 text-yellow-700',
  inactive: 'bg-gray-100 text-gray-500',
}

function SupplierRecommend() {
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [catFilter, setCatFilter] = useState('')
  const [form, setForm] = useState({ name: '', category: '', score: 80, match_rate: 80, tags: '', status: 'active' })

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      const data = await api.getSuppliers()
      setSuppliers(data.suppliers || [])
    } catch (err) {
      console.error('공급업체 로드 실패:', err)
    }
    setLoading(false)
  }

  const categories = [...new Set(suppliers.map(s => s.category))].filter(Boolean)
  const filtered = catFilter ? suppliers.filter(s => s.category === catFilter) : suppliers

  const resetForm = () => {
    setForm({ name: '', category: '', score: 80, match_rate: 80, tags: '', status: 'active' })
    setEditId(null)
    setShowForm(false)
  }

  const handleSave = async () => {
    if (!form.name || !form.category) return alert('업체명과 카테고리를 입력하세요.')
    const data = {
      name: form.name,
      category: form.category,
      score: Number(form.score),
      match_rate: Number(form.match_rate),
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      status: form.status,
    }
    try {
      if (editId) {
        await api.updateSupplier(editId, data)
      } else {
        await api.createSupplier(data)
      }
      resetForm()
      await loadData()
    } catch (err) {
      alert('저장 실패')
    }
  }

  const handleEdit = (s) => {
    setForm({
      name: s.name, category: s.category,
      score: s.score, match_rate: s.match_rate,
      tags: (s.tags || []).join(', '), status: s.status,
    })
    setEditId(s.id)
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('이 업체를 삭제하시겠습니까?')) return
    try {
      await api.deleteSupplier(id)
      await loadData()
    } catch (err) {
      alert('삭제 실패')
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">로딩 중...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">공급업체 추천 관리</h1>
        <button
          onClick={() => { resetForm(); setShowForm(!showForm) }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          {showForm ? '취소' : '+ 업체 등록'}
        </button>
      </div>

      {/* 카테고리 필터 */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setCatFilter('')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium ${!catFilter ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >전체</button>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setCatFilter(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${catFilter === cat ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >{cat}</button>
        ))}
      </div>

      {/* 등록/수정 폼 */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">{editId ? '업체 수정' : '새 업체 등록'}</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">업체명 *</label>
              <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">카테고리 *</label>
              <input value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">상태</label>
              <select value={form.status} onChange={e => setForm(f => ({...f, status: e.target.value}))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="active">활성</option>
                <option value="review">검토</option>
                <option value="inactive">비활성</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">평점 (0~100)</label>
              <input type="number" value={form.score} onChange={e => setForm(f => ({...f, score: e.target.value}))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">매칭률 (0~100)</label>
              <input type="number" value={form.match_rate} onChange={e => setForm(f => ({...f, match_rate: e.target.value}))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">태그 (쉼표 구분)</label>
              <input value={form.tags} onChange={e => setForm(f => ({...f, tags: e.target.value}))}
                placeholder="ESG 우수, 대기업 실적" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={resetForm} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">취소</button>
            <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
              {editId ? '수정' : '등록'}
            </button>
          </div>
        </div>
      )}

      {/* 업체 카드 그리드 */}
      {filtered.length === 0 ? (
        <div className="text-center text-gray-400 py-16 bg-white rounded-xl border border-gray-200">등록된 공급업체가 없습니다.</div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {filtered.sort((a,b) => b.score - a.score).map(s => (
            <div key={s.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-bold text-gray-800">{s.name}</h3>
                  <p className="text-xs text-gray-500">{s.category}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${STATUS_COLORS[s.status] || STATUS_COLORS.active}`}>
                  {s.status === 'active' ? '활성' : s.status === 'review' ? '검토' : '비활성'}
                </span>
              </div>

              {/* 점수 바 */}
              <div className="flex gap-4 mb-3">
                <div className="flex-1">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500">평점</span>
                    <span className="font-semibold text-blue-600">{s.score}점</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${s.score}%` }} />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500">매칭률</span>
                    <span className="font-semibold text-green-600">{s.match_rate}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: `${s.match_rate}%` }} />
                  </div>
                </div>
              </div>

              {/* 태그 */}
              {s.tags?.length > 0 && (
                <div className="flex gap-1 flex-wrap mb-3">
                  {s.tags.map(tag => (
                    <span key={tag} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">{tag}</span>
                  ))}
                </div>
              )}

              {/* 액션 */}
              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button onClick={() => handleEdit(s)}
                  className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1">수정</button>
                <button onClick={() => handleDelete(s.id)}
                  className="text-xs text-red-500 hover:text-red-700 px-2 py-1">삭제</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default SupplierRecommend

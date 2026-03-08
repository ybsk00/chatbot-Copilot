import { useState, useEffect } from 'react'
import { api } from '../../api/client'

// 하드코딩된 기본 템플릿 (DB에 없으면 이 목록 표시)
const DEFAULT_TEMPLATES = [
  { type_key: 'purchase', name: '일반 구매', description: '비품, 소모품, 전자기기, 인쇄물 등', fields_count: 18 },
  { type_key: 'service_contract', name: '일반 용역', description: '교육, 개발, 마케팅, 연구개발 등', fields_count: 20 },
  { type_key: 'service', name: '서비스', description: '급여대행, 건물관리, 복지, 물류 등', fields_count: 19 },
  { type_key: 'rental', name: '렌탈·리스', description: '차량, 장비, 사무기기 렌탈/리스', fields_count: 20 },
  { type_key: 'construction', name: '공사', description: '인테리어, 시설, 건축, 토목 등', fields_count: 19 },
  { type_key: 'consulting', name: '컨설팅', description: '경영, IT, 법률, 회계 컨설팅 등', fields_count: 19 },
  { type_key: 'purchase_maintenance', name: '구매+유지보수', description: '장비 구매 + 유지보수 포함', fields_count: 21 },
  { type_key: 'rental_maintenance', name: '렌탈+유지보수', description: '렌탈 + 유지보수 SLA 포함', fields_count: 22 },
  { type_key: 'purchase_lease', name: '구매·리스', description: '장비 도입 (구매/리스 병행)', fields_count: 21 },
]

function RfpTemplates() {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState({
    type_key: '', name: '', description: '',
    fields: '{}', sections: '[]', is_active: true,
  })

  useEffect(() => { loadTemplates() }, [])

  const loadTemplates = async () => {
    try {
      const data = await api.getRfpTemplates()
      const dbTemplates = data.templates || []
      // DB 템플릿이 없으면 기본 목록 표시
      if (dbTemplates.length === 0) {
        setTemplates(DEFAULT_TEMPLATES.map((t, i) => ({ id: -(i+1), ...t, is_active: true, source: 'default' })))
      } else {
        setTemplates(dbTemplates.map(t => ({ ...t, source: 'db' })))
      }
    } catch (err) {
      console.error('RFP 양식 로드 실패:', err)
      setTemplates(DEFAULT_TEMPLATES.map((t, i) => ({ id: -(i+1), ...t, is_active: true, source: 'default' })))
    }
    setLoading(false)
  }

  const resetForm = () => {
    setForm({ type_key: '', name: '', description: '', fields: '{}', sections: '[]', is_active: true })
    setEditId(null)
    setShowForm(false)
  }

  const handleSave = async () => {
    if (!form.type_key || !form.name) return alert('유형 키와 이름을 입력하세요.')
    let fieldsJson, sectionsJson
    try {
      fieldsJson = JSON.parse(form.fields)
      sectionsJson = JSON.parse(form.sections)
    } catch {
      return alert('필드 또는 섹션 JSON 형식이 올바르지 않습니다.')
    }
    const data = {
      type_key: form.type_key, name: form.name, description: form.description,
      fields: fieldsJson, sections: sectionsJson, is_active: form.is_active,
    }
    try {
      if (editId && editId > 0) {
        await api.updateRfpTemplate(editId, data)
      } else {
        await api.createRfpTemplate(data)
      }
      resetForm()
      await loadTemplates()
    } catch (err) {
      alert('저장 실패')
    }
  }

  const handleEdit = (t) => {
    setForm({
      type_key: t.type_key, name: t.name, description: t.description || '',
      fields: JSON.stringify(t.fields || {}, null, 2),
      sections: JSON.stringify(t.sections || [], null, 2),
      is_active: t.is_active ?? true,
    })
    setEditId(t.id)
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (id < 0) return alert('기본 양식은 삭제할 수 없습니다.')
    if (!confirm('이 양식을 삭제하시겠습니까?')) return
    try {
      await api.deleteRfpTemplate(id)
      await loadTemplates()
    } catch (err) {
      alert('삭제 실패')
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">로딩 중...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">RFP 양식 관리</h1>
        <button
          onClick={() => { resetForm(); setShowForm(!showForm) }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          {showForm ? '취소' : '+ 양식 추가'}
        </button>
      </div>

      {/* 등록/수정 폼 */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">{editId ? '양식 수정' : '새 양식 등록'}</h3>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">유형 키 * (영문)</label>
              <input value={form.type_key} onChange={e => setForm(f => ({...f, type_key: e.target.value}))}
                placeholder="custom_type" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">양식 이름 *</label>
              <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))}
                placeholder="맞춤형 구매" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">설명</label>
              <input value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">필드 (JSON)</label>
              <textarea value={form.fields} onChange={e => setForm(f => ({...f, fields: e.target.value}))}
                rows={6} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">섹션 (JSON)</label>
              <textarea value={form.sections} onChange={e => setForm(f => ({...f, sections: e.target.value}))}
                rows={6} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({...f, is_active: e.target.checked}))} />
              활성화
            </label>
            <div className="flex gap-2">
              <button onClick={resetForm} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">취소</button>
              <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                {editId ? '수정' : '등록'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 양식 목록 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">유형 키</th>
              <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">이름</th>
              <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">설명</th>
              <th className="text-center text-xs font-semibold text-gray-500 px-4 py-3">필드 수</th>
              <th className="text-center text-xs font-semibold text-gray-500 px-4 py-3">상태</th>
              <th className="text-center text-xs font-semibold text-gray-500 px-4 py-3">소스</th>
              <th className="text-right text-xs font-semibold text-gray-500 px-4 py-3">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {templates.map(t => (
              <tr key={t.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-mono text-gray-700">{t.type_key}</td>
                <td className="px-4 py-3 text-sm font-semibold text-gray-800">{t.name}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{t.description || '-'}</td>
                <td className="px-4 py-3 text-sm text-center text-gray-600">
                  {t.fields_count || (t.fields ? Object.keys(t.fields).length : 0)}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`text-xs px-2 py-0.5 rounded ${t.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {t.is_active ? '활성' : '비활성'}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`text-xs px-2 py-0.5 rounded ${t.source === 'db' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                    {t.source === 'db' ? 'DB' : '기본'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => handleEdit(t)}
                    className="text-xs text-blue-600 hover:text-blue-800 mr-2">수정</button>
                  {t.source === 'db' && (
                    <button onClick={() => handleDelete(t.id)}
                      className="text-xs text-red-500 hover:text-red-700">삭제</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default RfpTemplates

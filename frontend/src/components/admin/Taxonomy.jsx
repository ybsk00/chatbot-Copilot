import { useState, useEffect } from 'react'
import { api } from '../../api/client'

function Taxonomy() {
  const [taxonomy, setTaxonomy] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')

  useEffect(() => {
    loadTaxonomy()
  }, [])

  const loadTaxonomy = async () => {
    try {
      const data = await api.getTaxonomy()
      setTaxonomy(data.taxonomy || [])
    } catch (err) {
      console.error('Taxonomy load error:', err)
    }
    setLoading(false)
  }

  const filtered = filter
    ? taxonomy.filter(
        (t) =>
          t.major?.includes(filter) ||
          t.middle?.includes(filter) ||
          t.minor?.includes(filter)
      )
    : taxonomy

  // 대분류별 그룹핑
  const grouped = {}
  filtered.forEach((t) => {
    if (!grouped[t.major]) grouped[t.major] = []
    grouped[t.major].push(t)
  })

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-400">로딩 중...</div>
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">분류체계</h1>

      {/* 검색 */}
      <div className="mb-6">
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg text-sm"
          placeholder="분류 검색..."
        />
      </div>

      {/* 통계 */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">대분류</p>
          <p className="text-2xl font-bold text-blue-600">{Object.keys(grouped).length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">전체 항목</p>
          <p className="text-2xl font-bold text-green-600">{filtered.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">원본 전체</p>
          <p className="text-2xl font-bold text-gray-600">{taxonomy.length}</p>
        </div>
      </div>

      {/* 분류 트리 */}
      <div className="space-y-4">
        {Object.entries(grouped).map(([major, items]) => (
          <div key={major} className="bg-white rounded-xl border border-gray-200">
            <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">{major}</h3>
              <span className="text-xs text-gray-400">{items.length}개 항목</span>
            </div>
            <div className="divide-y divide-gray-50">
              {items.map((item) => (
                <div key={item.id} className="px-6 py-2 flex items-center gap-4 text-sm">
                  <span className="text-gray-600 w-40">{item.middle || '-'}</span>
                  <span className="text-gray-500 w-40">{item.minor || '-'}</span>
                  {item.stage && (
                    <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded">
                      {item.stage}
                    </span>
                  )}
                  {item.stage_desc && (
                    <span className="text-xs text-gray-400">{item.stage_desc}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {taxonomy.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
          분류체계 데이터가 없습니다.
        </div>
      )}
    </div>
  )
}

export default Taxonomy

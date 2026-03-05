import { useState, useEffect } from 'react'
import { api } from '../../api/client'

function KnowledgeBase() {
  const [chunks, setChunks] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadCategory, setUploadCategory] = useState('')
  const [uploadSubCat, setUploadSubCat] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [chunksRes, statsRes] = await Promise.all([
        api.getKnowledge(),
        api.getKnowledgeStats(),
      ])
      setChunks(chunksRes.chunks || [])
      setStats(statsRes)
    } catch (err) {
      console.error('Knowledge load error:', err)
    }
    setLoading(false)
  }

  const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (!file || !uploadCategory) return

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('category', uploadCategory)
    formData.append('sub_cat', uploadSubCat)

    try {
      await api.uploadKnowledge(formData)
      await loadData()
    } catch (err) {
      console.error('Upload error:', err)
    }
    setUploading(false)
    e.target.value = ''
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-400">로딩 중...</div>
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">지식베이스 관리</h1>

      {/* 통계 */}
      {stats && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-500">총 청크</p>
            <p className="text-2xl font-bold text-blue-600">{stats.total_chunks?.toLocaleString() || 0}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-500">카테고리</p>
            <p className="text-2xl font-bold text-green-600">{stats.categories?.length || 0}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-500">문서 수</p>
            <p className="text-2xl font-bold text-purple-600">{stats.documents || 0}</p>
          </div>
        </div>
      )}

      {/* 업로드 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">PDF 업로드</h2>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-sm text-gray-600 mb-1">카테고리 *</label>
            <input
              type="text"
              value={uploadCategory}
              onChange={(e) => setUploadCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="예: 교육 서비스"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm text-gray-600 mb-1">소분류</label>
            <input
              type="text"
              value={uploadSubCat}
              onChange={(e) => setUploadSubCat(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="선택 사항"
            />
          </div>
          <div>
            <label className={`px-4 py-2 rounded-lg text-sm font-medium cursor-pointer ${
              uploading || !uploadCategory
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}>
              {uploading ? '업로드 중...' : 'PDF 선택'}
              <input
                type="file"
                accept=".pdf"
                onChange={handleUpload}
                disabled={uploading || !uploadCategory}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>

      {/* 청크 목록 */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">
            청크 목록 ({chunks.length})
          </h2>
        </div>
        <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
          {chunks.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-400">
              지식베이스가 비어 있습니다.
            </div>
          ) : (
            chunks.slice(0, 50).map((chunk) => (
              <div key={chunk.id} className="px-6 py-3 hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                    {chunk.category}
                  </span>
                  <span className="text-sm text-gray-700 font-medium">{chunk.doc_name}</span>
                  <span className="text-xs text-gray-400">#{chunk.chunk_index}</span>
                </div>
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">{chunk.content}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default KnowledgeBase

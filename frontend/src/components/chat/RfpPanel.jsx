import { useState } from 'react'
import { api } from '../../api/client'

function RfpPanel({ category, sessionId }) {
  const [requirements, setRequirements] = useState('')
  const [rfpContent, setRfpContent] = useState('')
  const [rfpSources, setRfpSources] = useState([])
  const [loading, setLoading] = useState(false)

  const handleGenerate = async () => {
    if (!category) return
    setLoading(true)
    try {
      const res = await api.generateRfp(category, requirements, sessionId)
      setRfpContent(res.rfp_content || '')
      setRfpSources(res.sources || [])
    } catch (err) {
      setRfpContent('RFP 생성 중 오류가 발생했습니다.')
    }
    setLoading(false)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(rfpContent)
  }

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800">RFP 생성</h2>
        <p className="text-sm text-gray-500 mt-1">
          카테고리: {category || '미선택'}
        </p>
      </div>

      {/* 요구사항 입력 */}
      <div className="p-4 border-b border-gray-200">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          추가 요구사항
        </label>
        <textarea
          value={requirements}
          onChange={(e) => setRequirements(e.target.value)}
          className="w-full h-24 px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="RFP에 포함할 추가 요구사항을 입력하세요..."
        />
        <button
          onClick={handleGenerate}
          disabled={loading || !category}
          className="mt-2 w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? '생성 중...' : 'RFP 생성'}
        </button>
      </div>

      {/* RFP 결과 */}
      <div className="flex-1 overflow-y-auto p-4">
        {rfpContent ? (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">생성된 RFP</h3>
              <button
                onClick={handleCopy}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                복사
              </button>
            </div>
            <div className="prose prose-sm max-w-none whitespace-pre-wrap text-gray-700 bg-gray-50 rounded-lg p-4 text-sm leading-relaxed">
              {rfpContent}
            </div>
            {rfpSources.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-gray-400 mb-1">참조 문서:</p>
                <div className="flex flex-wrap gap-1">
                  {[...new Set(rfpSources)].map((src, i) => (
                    <span key={i} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">
                      {src}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">
            카테고리를 선택하고 RFP를 생성하세요
          </div>
        )}
      </div>
    </div>
  )
}

export default RfpPanel

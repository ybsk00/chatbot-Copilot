import { useState, useRef, useEffect } from 'react'
import { api } from '../../api/client'
import MessageBubble from './MessageBubble'
import RfpPanel from './RfpPanel'

const CATEGORIES = [
  '교육 서비스', '시설관리', '인쇄/출판', '복리후생', 'IT/소프트웨어',
  '마케팅/광고', '물류/운송', '보안/안전', '법무/세무', '컨설팅',
  '인사/채용', '사무용품', '건설/인테리어', '차량관리', '통신/네트워크', '기타'
]

function ChatPage() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId] = useState(() => `sess_${Date.now()}`)
  const [category, setCategory] = useState('')
  const [showRfp, setShowRfp] = useState(false)
  const [stage, setStage] = useState(1) // 1:인사 2:카테고리 3:질의응답 4:RFP
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 초기 인사 메시지
  useEffect(() => {
    setMessages([
      {
        role: 'assistant',
        content:
          '안녕하세요! IP Assist 간접구매 AI 코파일럿입니다.\n\n어떤 간접구매 카테고리에 대해 도움이 필요하신가요? 아래에서 카테고리를 선택하시거나, 바로 질문해 주세요.',
      },
    ])
  }, [])

  const handleCategorySelect = (cat) => {
    setCategory(cat)
    setStage(3)
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: `카테고리: ${cat}` },
      {
        role: 'assistant',
        content: `'${cat}' 카테고리가 선택되었습니다. 관련 질문을 해주세요!\n\n예시:\n- 이 서비스의 구매 절차가 어떻게 되나요?\n- RFP에 포함해야 할 항목은?\n- 관련 규정이 있나요?`,
      },
    ])
  }

  const handleSend = async () => {
    const msg = input.trim()
    if (!msg || loading) return

    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: msg }])
    setLoading(true)

    if (stage < 3) setStage(3)

    try {
      const history = messages.map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      }))

      const res = await api.chat(sessionId, msg, category, history)

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: res.answer,
          sources: res.sources,
          ragScore: res.rag_score,
        },
      ])
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: '죄송합니다. 응답 생성 중 오류가 발생했습니다.' },
      ])
    }

    setLoading(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex h-[calc(100vh-57px)]">
      {/* 메인 챗봇 영역 */}
      <div className={`flex flex-col ${showRfp ? 'w-1/2' : 'w-full'} transition-all`}>
        {/* 메시지 영역 */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {messages.map((msg, i) => (
            <MessageBubble
              key={i}
              role={msg.role}
              content={msg.content}
              sources={msg.sources}
              ragScore={msg.ragScore}
            />
          ))}

          {/* 카테고리 선택 UI */}
          {stage <= 2 && (
            <div className="mb-4">
              <p className="text-sm text-gray-500 mb-3">카테고리 선택:</p>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => handleCategorySelect(cat)}
                    className="px-3 py-1.5 bg-white border border-gray-200 rounded-full text-sm text-gray-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 transition-colors"
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 로딩 인디케이터 */}
          {loading && (
            <div className="flex justify-start mb-4">
              <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                  <span className="text-sm text-gray-400">답변 생성 중...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* 입력 영역 */}
        <div className="border-t border-gray-200 bg-white px-6 py-4">
          <div className="flex items-center gap-3">
            {category && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full whitespace-nowrap">
                {category}
              </span>
            )}
            <div className="flex-1 relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="질문을 입력하세요..."
                rows={1}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.896 28.896 0 0015.293-7.154.75.75 0 000-1.115A28.897 28.897 0 003.105 2.289z" />
                </svg>
              </button>
            </div>
            <button
              onClick={() => {
                setShowRfp(!showRfp)
                if (!showRfp) setStage(4)
              }}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                showRfp
                  ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              RFP
            </button>
          </div>
        </div>
      </div>

      {/* RFP 패널 */}
      {showRfp && (
        <div className="w-1/2 border-l border-gray-200">
          <RfpPanel category={category} sessionId={sessionId} />
        </div>
      )}
    </div>
  )
}

export default ChatPage

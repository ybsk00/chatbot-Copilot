function MessageBubble({ role, content, sources, ragScore }) {
  const isUser = role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-blue-600 text-white rounded-br-md'
            : 'bg-white border border-gray-200 text-gray-800 rounded-bl-md shadow-sm'
        }`}
      >
        <div className="whitespace-pre-wrap text-sm leading-relaxed">{content}</div>

        {/* AI 답변의 출처 표시 */}
        {!isUser && sources && sources.length > 0 && (
          <div className="mt-3 pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-400 mb-1">참조 문서:</p>
            <div className="flex flex-wrap gap-1">
              {[...new Set(sources)].map((src, i) => (
                <span
                  key={i}
                  className="inline-block text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded"
                >
                  {src}
                </span>
              ))}
            </div>
            {ragScore > 0 && (
              <p className="text-xs text-gray-400 mt-1">
                유사도: {(ragScore * 100).toFixed(1)}%
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default MessageBubble

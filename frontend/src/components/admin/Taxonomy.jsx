import { useState, useEffect } from 'react'
import { api } from '../../api/client'

function Taxonomy() {
  const [taxonomy, setTaxonomy] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)

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
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: 256,
          color: '#94A3B8',
          fontSize: 15,
        }}
      >
        로딩 중...
      </div>
    )
  }

  return (
    <div>
      {/* Page Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1E293B', margin: 0 }}>
          분류체계
        </h1>
        <p style={{ fontSize: 14, color: '#64748B', marginTop: 6, marginBottom: 0 }}>
          간접구매 분류체계를 조회합니다.
        </p>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 24, position: 'relative', maxWidth: 400 }}>
        <svg
          style={{
            position: 'absolute',
            left: 13,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 16,
            height: 16,
            color: '#94A3B8',
            pointerEvents: 'none',
          }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          placeholder="분류 검색..."
          style={{
            width: '100%',
            padding: '10px 14px 10px 40px',
            borderRadius: 12,
            border: searchFocused ? '1px solid #0D9488' : '1px solid #E2E8F0',
            background: '#F8FAFC',
            fontSize: 14,
            color: '#1E293B',
            outline: 'none',
            boxSizing: 'border-box',
            transition: 'border-color 0.2s',
          }}
        />
      </div>

      {/* Stats Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            background: '#fff',
            borderRadius: 18,
            border: '1px solid #F0F2F5',
            boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
            padding: '20px 24px',
          }}
        >
          <p style={{ fontSize: 13, color: '#64748B', margin: 0, marginBottom: 6 }}>
            대분류
          </p>
          <p style={{ fontSize: 26, fontWeight: 700, color: '#0D9488', margin: 0 }}>
            {Object.keys(grouped).length}
          </p>
        </div>
        <div
          style={{
            background: '#fff',
            borderRadius: 18,
            border: '1px solid #F0F2F5',
            boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
            padding: '20px 24px',
          }}
        >
          <p style={{ fontSize: 13, color: '#64748B', margin: 0, marginBottom: 6 }}>
            전체 항목
          </p>
          <p style={{ fontSize: 26, fontWeight: 700, color: '#059669', margin: 0 }}>
            {filtered.length}
          </p>
        </div>
        <div
          style={{
            background: '#fff',
            borderRadius: 18,
            border: '1px solid #F0F2F5',
            boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
            padding: '20px 24px',
          }}
        >
          <p style={{ fontSize: 13, color: '#64748B', margin: 0, marginBottom: 6 }}>
            원본 전체
          </p>
          <p style={{ fontSize: 26, fontWeight: 700, color: '#64748B', margin: 0 }}>
            {taxonomy.length}
          </p>
        </div>
      </div>

      {/* Taxonomy Tree */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {Object.entries(grouped).map(([major, items]) => (
          <div
            key={major}
            style={{
              background: '#fff',
              borderRadius: 18,
              border: '1px solid #F0F2F5',
              boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
              overflow: 'hidden',
            }}
          >
            {/* Group Header */}
            <div
              style={{
                background: '#FAFBFC',
                padding: '14px 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid #F0F2F5',
              }}
            >
              <h3
                style={{
                  fontSize: 14,
                  fontWeight: 650,
                  color: '#1E293B',
                  margin: 0,
                }}
              >
                {major}
              </h3>
              <span style={{ fontSize: 12, color: '#94A3B8', fontWeight: 500 }}>
                {items.length}개 항목
              </span>
            </div>

            {/* Tree Items */}
            <div>
              {items.map((item, idx) => (
                <div
                  key={item.id}
                  style={{
                    padding: '12px 24px 12px 40px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    borderBottom:
                      idx < items.length - 1 ? '1px solid #F8FAFC' : 'none',
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      color: '#1E293B',
                      width: 160,
                      flexShrink: 0,
                    }}
                  >
                    {item.middle || '-'}
                  </span>
                  <span
                    style={{
                      fontSize: 13,
                      color: '#64748B',
                      width: 160,
                      flexShrink: 0,
                    }}
                  >
                    {item.minor || '-'}
                  </span>
                  {item.stage && (
                    <span
                      style={{
                        background: '#F0FDFA',
                        color: '#0D9488',
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 600,
                        padding: '3px 10px',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {item.stage}
                    </span>
                  )}
                  {item.stage_desc && (
                    <span style={{ fontSize: 12, color: '#94A3B8' }}>
                      {item.stage_desc}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {taxonomy.length === 0 && (
        <div
          style={{
            background: '#fff',
            borderRadius: 18,
            border: '1px solid #F0F2F5',
            boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
            padding: 40,
            textAlign: 'center',
            color: '#94A3B8',
            fontSize: 14,
          }}
        >
          분류체계 데이터가 없습니다.
        </div>
      )}
    </div>
  )
}

export default Taxonomy

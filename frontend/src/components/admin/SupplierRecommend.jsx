import { useState, useEffect } from 'react'
import { api } from '../../api/client'

const STATUS_COLORS = {
  active:   { background: '#ECFDF5', color: '#059669' },
  review:   { background: '#FFFBEB', color: '#D97706' },
  inactive: { background: '#F1F5F9', color: '#94A3B8' },
}

const STATUS_LABELS = {
  active: '활성',
  review: '검토',
  inactive: '비활성',
}

function SupplierRecommend() {
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [catFilter, setCatFilter] = useState('')
  const [form, setForm] = useState({ name: '', category: '', score: 80, match_rate: 80, tags: '', status: 'active' })
  const [hoveredCard, setHoveredCard] = useState(null)
  const [focusedInput, setFocusedInput] = useState(null)
  const [hoveredBtn, setHoveredBtn] = useState(null)

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

  const getInputStyle = (fieldName) => ({
    width: '100%',
    padding: '10px 14px',
    borderRadius: 10,
    border: focusedInput === fieldName ? '1px solid #0D9488' : '1px solid #E2E8F0',
    background: '#F8FAFC',
    fontSize: 14,
    color: '#1E293B',
    outline: 'none',
    boxShadow: focusedInput === fieldName ? '0 0 0 3px rgba(14,165,160,0.08)' : 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    boxSizing: 'border-box',
  })

  const labelStyle = {
    fontSize: 12,
    fontWeight: 500,
    color: '#64748B',
    marginBottom: 6,
    display: 'block',
  }

  const primaryBtnStyle = {
    background: 'linear-gradient(135deg, #0ea5a0, #06b6d4)',
    color: '#fff',
    borderRadius: 12,
    fontWeight: 600,
    boxShadow: '0 3px 12px rgba(14,165,160,0.2)',
    border: 'none',
    cursor: 'pointer',
    fontSize: 14,
    padding: '10px 20px',
    transition: 'opacity 0.2s',
  }

  const cardStyle = {
    background: '#fff',
    borderRadius: 18,
    border: '1px solid #F0F2F5',
    boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
    padding: 24,
    transition: 'box-shadow 0.25s ease, transform 0.25s ease',
  }

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: 256,
        color: '#94A3B8',
        fontSize: 14,
      }}>
        로딩 중...
      </div>
    )
  }

  return (
    <div>
      {/* Page Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 28,
      }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1E293B', margin: 0 }}>
            공급업체 추천 관리
          </h1>
          <p style={{ fontSize: 13, color: '#94A3B8', marginTop: 6, marginBottom: 0 }}>
            RFP 매칭에 사용될 공급업체를 관리합니다.
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(!showForm) }}
          style={primaryBtnStyle}
        >
          {showForm ? '취소' : '+ 업체 등록'}
        </button>
      </div>

      {/* Category Filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <button
          onClick={() => setCatFilter('')}
          style={{
            padding: '7px 16px',
            borderRadius: 10,
            fontSize: 12,
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s',
            ...(
              !catFilter
                ? { background: 'linear-gradient(135deg, #0ea5a0, #06b6d4)', color: '#fff', boxShadow: '0 3px 12px rgba(14,165,160,0.2)' }
                : { background: '#F1F5F9', color: '#64748B' }
            ),
          }}
        >
          전체
        </button>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setCatFilter(cat)}
            style={{
              padding: '7px 16px',
              borderRadius: 10,
              fontSize: 12,
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s',
              ...(
                catFilter === cat
                  ? { background: 'linear-gradient(135deg, #0ea5a0, #06b6d4)', color: '#fff', boxShadow: '0 3px 12px rgba(14,165,160,0.2)' }
                  : { background: '#F1F5F9', color: '#64748B' }
              ),
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <div style={{
          ...cardStyle,
          padding: 28,
          marginBottom: 24,
        }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1E293B', marginTop: 0, marginBottom: 20 }}>
            {editId ? '업체 수정' : '새 업체 등록'}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>업체명 *</label>
              <input
                value={form.name}
                onChange={e => setForm(f => ({...f, name: e.target.value}))}
                onFocus={() => setFocusedInput('name')}
                onBlur={() => setFocusedInput(null)}
                style={getInputStyle('name')}
              />
            </div>
            <div>
              <label style={labelStyle}>카테고리 *</label>
              <input
                value={form.category}
                onChange={e => setForm(f => ({...f, category: e.target.value}))}
                onFocus={() => setFocusedInput('category')}
                onBlur={() => setFocusedInput(null)}
                style={getInputStyle('category')}
              />
            </div>
            <div>
              <label style={labelStyle}>상태</label>
              <select
                value={form.status}
                onChange={e => setForm(f => ({...f, status: e.target.value}))}
                onFocus={() => setFocusedInput('status')}
                onBlur={() => setFocusedInput(null)}
                style={{
                  ...getInputStyle('status'),
                  appearance: 'auto',
                }}
              >
                <option value="active">활성</option>
                <option value="review">검토</option>
                <option value="inactive">비활성</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>평점 (0~100)</label>
              <input
                type="number"
                value={form.score}
                onChange={e => setForm(f => ({...f, score: e.target.value}))}
                onFocus={() => setFocusedInput('score')}
                onBlur={() => setFocusedInput(null)}
                style={getInputStyle('score')}
              />
            </div>
            <div>
              <label style={labelStyle}>매칭률 (0~100)</label>
              <input
                type="number"
                value={form.match_rate}
                onChange={e => setForm(f => ({...f, match_rate: e.target.value}))}
                onFocus={() => setFocusedInput('match_rate')}
                onBlur={() => setFocusedInput(null)}
                style={getInputStyle('match_rate')}
              />
            </div>
            <div>
              <label style={labelStyle}>태그 (쉼표 구분)</label>
              <input
                value={form.tags}
                onChange={e => setForm(f => ({...f, tags: e.target.value}))}
                onFocus={() => setFocusedInput('tags')}
                onBlur={() => setFocusedInput(null)}
                placeholder="ESG 우수, 대기업 실적"
                style={getInputStyle('tags')}
              />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
            <button
              onClick={resetForm}
              onMouseEnter={() => setHoveredBtn('cancel')}
              onMouseLeave={() => setHoveredBtn(null)}
              style={{
                padding: '10px 20px',
                fontSize: 13,
                fontWeight: 500,
                color: '#64748B',
                background: hoveredBtn === 'cancel' ? '#F1F5F9' : 'transparent',
                border: 'none',
                borderRadius: 10,
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
            >
              취소
            </button>
            <button onClick={handleSave} style={primaryBtnStyle}>
              {editId ? '수정' : '등록'}
            </button>
          </div>
        </div>
      )}

      {/* Supplier Card Grid */}
      {filtered.length === 0 ? (
        <div style={{
          textAlign: 'center',
          color: '#94A3B8',
          padding: '64px 0',
          fontSize: 14,
          ...cardStyle,
        }}>
          등록된 공급업체가 없습니다.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {filtered.sort((a, b) => b.score - a.score).map(s => (
            <div
              key={s.id}
              onMouseEnter={() => setHoveredCard(s.id)}
              onMouseLeave={() => setHoveredCard(null)}
              style={{
                ...cardStyle,
                boxShadow: hoveredCard === s.id
                  ? '0 8px 24px rgba(0,0,0,0.06)'
                  : '0 1px 4px rgba(0,0,0,0.02)',
                transform: hoveredCard === s.id ? 'translateY(-2px)' : 'none',
              }}
            >
              {/* Header Row */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 16,
              }}>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1E293B', margin: 0 }}>
                    {s.name}
                  </h3>
                  <p style={{ fontSize: 12, color: '#64748B', margin: '4px 0 0 0' }}>
                    {s.category}
                  </p>
                </div>
                <span style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '4px 12px',
                  borderRadius: 6,
                  ...(STATUS_COLORS[s.status] || STATUS_COLORS.active),
                }}>
                  {STATUS_LABELS[s.status] || STATUS_LABELS.active}
                </span>
              </div>

              {/* Score Bars */}
              <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 6,
                  }}>
                    <span style={{ fontSize: 12, color: '#64748B' }}>평점</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#0ea5a0' }}>{s.score}점</span>
                  </div>
                  <div style={{
                    height: 6,
                    borderRadius: 3,
                    background: '#F1F5F9',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%',
                      borderRadius: 3,
                      background: 'linear-gradient(90deg, #0ea5a0, #14B8A6)',
                      width: `${s.score}%`,
                      transition: 'width 0.4s ease',
                    }} />
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 6,
                  }}>
                    <span style={{ fontSize: 12, color: '#64748B' }}>매칭률</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#059669' }}>{s.match_rate}%</span>
                  </div>
                  <div style={{
                    height: 6,
                    borderRadius: 3,
                    background: '#F1F5F9',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%',
                      borderRadius: 3,
                      background: 'linear-gradient(90deg, #059669, #10B981)',
                      width: `${s.match_rate}%`,
                      transition: 'width 0.4s ease',
                    }} />
                  </div>
                </div>
              </div>

              {/* Tags */}
              {s.tags?.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
                  {s.tags.map(tag => (
                    <span
                      key={tag}
                      style={{
                        background: '#F0FDFA',
                        color: '#0D9488',
                        borderRadius: 6,
                        fontSize: 11,
                        padding: '3px 10px',
                        fontWeight: 500,
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 8,
                paddingTop: 12,
                borderTop: '1px solid #F0F2F5',
              }}>
                <button
                  onClick={() => handleEdit(s)}
                  onMouseEnter={() => setHoveredBtn(`edit-${s.id}`)}
                  onMouseLeave={() => setHoveredBtn(null)}
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: '#0D9488',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px 10px',
                    borderRadius: 6,
                    transition: 'background 0.2s',
                    ...(hoveredBtn === `edit-${s.id}` ? { background: '#F0FDFA' } : {}),
                  }}
                >
                  수정
                </button>
                <button
                  onClick={() => handleDelete(s.id)}
                  onMouseEnter={() => setHoveredBtn(`del-${s.id}`)}
                  onMouseLeave={() => setHoveredBtn(null)}
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: '#DC2626',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px 10px',
                    borderRadius: 6,
                    transition: 'background 0.2s',
                    ...(hoveredBtn === `del-${s.id}` ? { background: '#FEF2F2' } : {}),
                  }}
                >
                  삭제
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default SupplierRecommend

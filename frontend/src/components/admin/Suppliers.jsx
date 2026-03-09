import { useState, useEffect } from 'react'
import { api } from '../../api/client'

const PAGE_SIZE = 15

const CATEGORY_OPTIONS = [
  '전체', '컨설팅', '일반 용역', '서비스', '구매·리스', '렌탈·리스', '공사', '일반 구매',
  '렌탈+유지보수', '구매+유지보수',
]

/* ── 추가/수정 모달 ── */
function SupplierModal({ supplier, onClose, onSave }) {
  const isEdit = !!supplier?.id
  const [form, setForm] = useState({
    name: supplier?.name || '',
    category: supplier?.category || '',
    score: supplier?.score ?? 0,
    match_rate: supplier?.match_rate ?? 0,
    tags: (supplier?.tags || []).join(', '),
    status: supplier?.status || 'active',
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!form.name.trim() || !form.category.trim()) return
    setSaving(true)
    await onSave({
      id: supplier?.id,
      name: form.name.trim(),
      category: form.category.trim(),
      score: parseInt(form.score) || 0,
      match_rate: parseInt(form.match_rate) || 0,
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      status: form.status,
    })
    setSaving(false)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)',
    }} onClick={onClose}>
      <div style={{
        background: '#fff', borderRadius: 20, width: 520,
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)', overflow: 'hidden',
      }} onClick={e => e.stopPropagation()}>
        {/* 헤더 */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid #F0F2F5',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#1E293B' }}>
            {isEdit ? '공급업체 수정' : '공급업체 등록'}
          </span>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 8, border: 'none',
            background: '#F1F5F9', cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center', color: '#64748B',
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style={{ width: 16, height: 16 }}>
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>

        {/* 바디 */}
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8, display: 'block' }}>업체명 *</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="업체명" style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#0D9488'}
                onBlur={e => e.target.style.borderColor = '#E2E8F0'} />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8, display: 'block' }}>카테고리 *</label>
              <input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                placeholder="예: 컨설팅" style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#0D9488'}
                onBlur={e => e.target.style.borderColor = '#E2E8F0'} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8, display: 'block' }}>평점 (0~100)</label>
              <input type="number" value={form.score} onChange={e => setForm({ ...form, score: e.target.value })}
                min="0" max="100" style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#0D9488'}
                onBlur={e => e.target.style.borderColor = '#E2E8F0'} />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8, display: 'block' }}>매칭률 (0~100%)</label>
              <input type="number" value={form.match_rate} onChange={e => setForm({ ...form, match_rate: e.target.value })}
                min="0" max="100" style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#0D9488'}
                onBlur={e => e.target.style.borderColor = '#E2E8F0'} />
            </div>
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8, display: 'block' }}>태그 (콤마 구분)</label>
            <input value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })}
              placeholder="예: 전략, 조직혁신, 디지털" style={inputStyle}
              onFocus={e => e.target.style.borderColor = '#0D9488'}
              onBlur={e => e.target.style.borderColor = '#E2E8F0'} />
          </div>
          {isEdit && (
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8, display: 'block' }}>상태</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="active">활성</option>
                <option value="review">검토중</option>
                <option value="inactive">비활성</option>
              </select>
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div style={{
          padding: '16px 24px', borderTop: '1px solid #F0F2F5',
          display: 'flex', justifyContent: 'flex-end', gap: 10,
        }}>
          <button onClick={onClose} style={{
            padding: '10px 20px', borderRadius: 10, border: '1px solid #E2E8F0',
            background: '#fff', fontSize: 13, fontWeight: 600, color: '#64748B', cursor: 'pointer',
          }}>취소</button>
          <button onClick={handleSave} disabled={saving || !form.name.trim() || !form.category.trim()} style={{
            padding: '10px 20px', borderRadius: 10, border: 'none', fontSize: 13, fontWeight: 600,
            background: 'linear-gradient(135deg, #0ea5a0, #06b6d4)', color: '#fff', cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(14,165,160,0.18)',
            opacity: saving || !form.name.trim() || !form.category.trim() ? 0.5 : 1,
          }}>{saving ? '저장 중...' : isEdit ? '수정' : '등록'}</button>
        </div>
      </div>
    </div>
  )
}

const inputStyle = {
  width: '100%', padding: '10px 14px', borderRadius: 10, fontSize: 14,
  border: '1px solid #E2E8F0', outline: 'none', boxSizing: 'border-box',
  transition: 'border-color 0.15s',
}

/* ── 메인 컴포넌트 ── */
function Suppliers() {
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterCategory, setFilterCategory] = useState('전체')
  const [page, setPage] = useState(1)
  const [modal, setModal] = useState(null) // null | {} (추가) | supplier (수정)
  const [hoveredRow, setHoveredRow] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState(null)

  useEffect(() => { loadSuppliers() }, [])

  const loadSuppliers = async () => {
    try {
      const data = await api.getSuppliers()
      setSuppliers(data.suppliers || [])
    } catch (err) {
      console.error('Suppliers load error:', err)
    }
    setLoading(false)
  }

  // 필터
  const filtered = filterCategory === '전체'
    ? suppliers
    : suppliers.filter(s => s.category === filterCategory)

  // 페이지네이션
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const handleFilterChange = (cat) => { setFilterCategory(cat); setPage(1) }

  // 저장 (추가/수정)
  const handleSave = async (data) => {
    try {
      const payload = {
        name: data.name, category: data.category,
        score: data.score, match_rate: data.match_rate,
        tags: data.tags, status: data.status || 'active',
      }
      if (data.id) {
        await api.updateSupplier(data.id, payload)
      } else {
        await api.createSupplier(payload)
      }
      setModal(null)
      await loadSuppliers()
    } catch (err) {
      alert('저장 실패')
    }
  }

  // 삭제
  const handleDelete = async (id) => {
    if (!confirm('이 공급업체를 삭제하시겠습니까?')) return
    try {
      await api.deleteSupplier(id)
      await loadSuppliers()
    } catch (err) {
      alert('삭제 실패')
    }
  }

  // CSV 업로드
  const handleCsvUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    setUploadResult(null)
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await api.uploadSuppliersCsv(formData)
      setUploadResult(res)
      await loadSuppliers()
    } catch (err) {
      setUploadResult({ status: 'error', errors: ['업로드 실패'] })
    }
    setUploading(false)
    e.target.value = ''
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%', margin: '0 auto 14px',
            border: '3px solid #E2E8F0', borderTopColor: '#0D9488',
            animation: 'spin 0.8s linear infinite',
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          <div style={{ fontSize: 14, color: '#94A3B8' }}>데이터 로딩 중...</div>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* 페이지 헤더 */}
      <div style={{ marginBottom: 28, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1E293B', margin: 0 }}>공급업체 관리</h1>
          <p style={{ fontSize: 14, color: '#94A3B8', marginTop: 6 }}>공급업체 등록, 평점, 매칭률을 관리합니다.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {/* CSV 업로드 */}
          <label style={{
            padding: '10px 16px', borderRadius: 10, border: '1px solid #E2E8F0',
            background: '#fff', fontSize: 13, fontWeight: 600, color: '#64748B',
            cursor: uploading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            opacity: uploading ? 0.5 : 1,
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style={{ width: 16, height: 16 }}>
              <path d="M9.25 13.25a.75.75 0 0 0 1.5 0V4.636l2.955 3.129a.75.75 0 0 0 1.09-1.03l-4.25-4.5a.75.75 0 0 0-1.09 0l-4.25 4.5a.75.75 0 1 0 1.09 1.03L9.25 4.636v8.614Z" />
              <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
            </svg>
            {uploading ? '업로드 중...' : 'CSV 업로드'}
            <input type="file" accept=".csv" onChange={handleCsvUpload} disabled={uploading} style={{ display: 'none' }} />
          </label>
          {/* 업체 추가 */}
          <button onClick={() => setModal({})} style={{
            padding: '10px 20px', borderRadius: 10, border: 'none', fontSize: 13, fontWeight: 600,
            background: 'linear-gradient(135deg, #0ea5a0, #06b6d4)', color: '#fff', cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(14,165,160,0.18)', display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style={{ width: 16, height: 16 }}>
              <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
            </svg>
            업체 등록
          </button>
        </div>
      </div>

      {/* CSV 업로드 결과 */}
      {uploadResult && (
        <div style={{
          padding: '14px 20px', borderRadius: 12, marginBottom: 20,
          background: uploadResult.errors?.length ? '#FFFBEB' : '#ECFDF5',
          border: `1px solid ${uploadResult.errors?.length ? '#FDE68A' : '#A7F3D0'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 13, color: '#374151' }}>
            {uploadResult.created}건 등록 완료
            {uploadResult.errors?.length > 0 && ` · ${uploadResult.errors.length}건 오류`}
          </span>
          <button onClick={() => setUploadResult(null)} style={{
            border: 'none', background: 'transparent', cursor: 'pointer', color: '#94A3B8', fontSize: 18,
          }}>×</button>
        </div>
      )}

      {/* 메인 테이블 */}
      <div style={{
        background: '#fff', borderRadius: 18, border: '1px solid #F0F2F5',
        boxShadow: '0 1px 4px rgba(0,0,0,0.02)', overflow: 'hidden',
      }}>
        {/* 필터 헤더 */}
        <div style={{
          padding: '16px 24px', borderBottom: '1px solid #F0F2F5',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <select value={filterCategory} onChange={e => handleFilterChange(e.target.value)}
              style={{
                padding: '8px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                border: '1px solid #E2E8F0', outline: 'none', background: '#fff',
                color: '#1E293B', cursor: 'pointer',
              }}>
              {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <span style={{ fontSize: 13, color: '#94A3B8' }}>{filtered.length}개 업체</span>
          </div>
        </div>

        {/* 테이블 헤더 */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1.5fr 1fr 70px 70px 1.5fr 70px 90px',
          padding: '10px 24px', borderBottom: '1px solid #F0F2F5', background: '#FAFBFC',
        }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8' }}>업체명</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8' }}>카테고리</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8', textAlign: 'center' }}>평점</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8', textAlign: 'center' }}>매칭률</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8' }}>태그</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8', textAlign: 'center' }}>상태</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8', textAlign: 'center' }}>관리</div>
        </div>

        {/* 데이터 행 */}
        {paged.length === 0 ? (
          <div style={{ padding: '60px 0', textAlign: 'center', color: '#94A3B8', fontSize: 14 }}>
            등록된 공급업체가 없습니다.
          </div>
        ) : paged.map((s, idx) => (
          <div key={s.id} style={{
            display: 'grid', gridTemplateColumns: '1.5fr 1fr 70px 70px 1.5fr 70px 90px',
            padding: '14px 24px', alignItems: 'center',
            borderBottom: idx < paged.length - 1 ? '1px solid #F8FAFC' : 'none',
            background: hoveredRow === idx ? '#F8FFFE' : 'transparent',
            transition: 'background 0.15s',
          }}
          onMouseEnter={() => setHoveredRow(idx)}
          onMouseLeave={() => setHoveredRow(null)}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#1E293B' }}>{s.name}</div>
            <div style={{ fontSize: 13, color: '#64748B' }}>{s.category}</div>
            <div style={{ textAlign: 'center', fontSize: 14, fontWeight: 700, color: '#0D9488' }}>{s.score}</div>
            <div style={{ textAlign: 'center', fontSize: 14, fontWeight: 700, color: '#2563EB' }}>{s.match_rate}%</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {(s.tags || []).map((tag, i) => (
                <span key={i} style={{
                  fontSize: 11, fontWeight: 500, padding: '3px 8px', borderRadius: 6,
                  background: '#F0FDFA', color: '#0D9488',
                }}>{tag}</span>
              ))}
            </div>
            <div style={{ textAlign: 'center' }}>
              <span style={{
                fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6,
                background: s.status === 'active' ? '#ECFDF5' : '#F1F5F9',
                color: s.status === 'active' ? '#059669' : '#94A3B8',
              }}>{s.status === 'active' ? '활성' : s.status}</span>
            </div>
            <div style={{ textAlign: 'center', display: 'flex', gap: 6, justifyContent: 'center' }}>
              <button onClick={() => setModal(s)} style={{
                padding: '5px 10px', borderRadius: 7, border: '1px solid #E2E8F0',
                background: '#fff', fontSize: 11, fontWeight: 600, color: '#64748B', cursor: 'pointer',
              }}
              onMouseEnter={e => { e.target.style.borderColor = '#0D9488'; e.target.style.color = '#0D9488' }}
              onMouseLeave={e => { e.target.style.borderColor = '#E2E8F0'; e.target.style.color = '#64748B' }}>
                수정
              </button>
              <button onClick={() => handleDelete(s.id)} style={{
                padding: '5px 10px', borderRadius: 7, border: '1px solid #FECACA',
                background: '#fff', fontSize: 11, fontWeight: 600, color: '#DC2626', cursor: 'pointer',
              }}>삭제</button>
            </div>
          </div>
        ))}

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div style={{
            padding: '14px 24px', borderTop: '1px solid #F0F2F5',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1} style={{
              padding: '6px 12px', borderRadius: 8, border: '1px solid #E2E8F0',
              background: '#fff', fontSize: 12, fontWeight: 600,
              color: currentPage <= 1 ? '#CBD5E1' : '#64748B',
              cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
            }}>이전</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)} style={{
                width: 32, height: 32, borderRadius: 8, border: 'none',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                background: p === currentPage ? '#0D9488' : 'transparent',
                color: p === currentPage ? '#fff' : '#64748B',
              }}>{p}</button>
            ))}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} style={{
              padding: '6px 12px', borderRadius: 8, border: '1px solid #E2E8F0',
              background: '#fff', fontSize: 12, fontWeight: 600,
              color: currentPage >= totalPages ? '#CBD5E1' : '#64748B',
              cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
            }}>다음</button>
          </div>
        )}
      </div>

      {/* 모달 */}
      {modal !== null && (
        <SupplierModal
          supplier={modal}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}
    </div>
  )
}

export default Suppliers

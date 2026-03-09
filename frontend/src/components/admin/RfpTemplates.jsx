import { useState, useEffect } from 'react'
import { api } from '../../api/client'
import { RFP_TEMPLATES } from '../../data/rfpTemplates'

/* ── 기본 양식 목록 (코드 내장) ── */
const BUILTIN_LIST = Object.entries(RFP_TEMPLATES).map(([key, t]) => ({
  type_key: key,
  name: t.label,
  description: t.desc,
  fields: t.fields,
  sections: t.sections,
  is_active: true,
  source: 'default',
}))

/* ── 잠금 섹션 (삭제/이름변경 불가) ── */
const LOCKED_SECTIONS = ['발주기관 정보', '제출 안내']
function isLocked(title) {
  return LOCKED_SECTIONS.some(s => title.includes(s))
}

/* ── 섹션/필드 편집 모달 ── */
function TemplateEditorModal({ template, onClose, onSave }) {
  const [name, setName] = useState(template.name || '')
  const [description, setDescription] = useState(template.description || '')
  const [sections, setSections] = useState(() => {
    // sections + fields에서 구조 복원
    const tFields = template.fields || {}
    return (template.sections || []).map(sec => ({
      ...sec,
      fieldItems: (sec.fields || []).map(fk => ({
        key: fk,
        label: tFields[fk]?.label || fk,
      })),
    }))
  })
  const [saving, setSaving] = useState(false)
  const [expandedSection, setExpandedSection] = useState(0)
  const [editingSectionIdx, setEditingSectionIdx] = useState(null)
  const [editingSectionTitle, setEditingSectionTitle] = useState('')

  // 섹션 추가
  const addSection = () => {
    const num = sections.length + 1
    const newSection = {
      title: `${num}. 새 섹션`,
      fields: [],
      icon: 'gear',
      fieldItems: [],
    }
    if (sections.length === 0) {
      setSections([newSection])
      setExpandedSection(0)
    } else {
      const last = sections[sections.length - 1]
      if (isLocked(last.title)) {
        setSections([...sections.slice(0, -1), newSection, last])
        setExpandedSection(sections.length - 1)
      } else {
        setSections([...sections, newSection])
        setExpandedSection(sections.length)
      }
    }
  }

  // 섹션 삭제
  const removeSection = (idx) => {
    setSections(sections.filter((_, i) => i !== idx))
  }

  // 섹션 이름 변경
  const startEditSection = (idx) => {
    setEditingSectionIdx(idx)
    setEditingSectionTitle(sections[idx].title)
  }
  const saveEditSection = () => {
    if (editingSectionIdx === null) return
    const updated = [...sections]
    updated[editingSectionIdx] = { ...updated[editingSectionIdx], title: editingSectionTitle }
    setSections(updated)
    setEditingSectionIdx(null)
  }

  // 필드 추가
  const addField = (secIdx) => {
    const updated = [...sections]
    const sec = { ...updated[secIdx] }
    const newKey = `s${Date.now()}`
    sec.fieldItems = [...sec.fieldItems, { key: newKey, label: '' }]
    sec.fields = sec.fieldItems.map(f => f.key)
    updated[secIdx] = sec
    setSections(updated)
  }

  // 필드 삭제
  const removeField = (secIdx, fIdx) => {
    const updated = [...sections]
    const sec = { ...updated[secIdx] }
    sec.fieldItems = sec.fieldItems.filter((_, i) => i !== fIdx)
    sec.fields = sec.fieldItems.map(f => f.key)
    updated[secIdx] = sec
    setSections(updated)
  }

  // 필드 라벨 변경
  const updateFieldLabel = (secIdx, fIdx, label) => {
    const updated = [...sections]
    const sec = { ...updated[secIdx] }
    sec.fieldItems = sec.fieldItems.map((f, i) => i === fIdx ? { ...f, label } : f)
    updated[secIdx] = sec
    setSections(updated)
  }

  // 저장
  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)

    // sections → fields/sections 구조로 변환
    const fieldsObj = {}
    let fieldIdx = 1
    const sectionsArr = sections.map(sec => {
      const fieldKeys = []
      sec.fieldItems.forEach(fi => {
        const key = `s${fieldIdx}`
        fieldsObj[key] = { label: fi.label, value: '' }
        fieldKeys.push(key)
        fieldIdx++
      })
      return { title: sec.title, fields: fieldKeys, icon: sec.icon || 'gear' }
    })

    // type_key 자동 생성
    const typeKey = template.type_key || name.trim().toLowerCase().replace(/[^a-z0-9가-힣]/g, '_').replace(/_+/g, '_')

    await onSave({
      id: template.id,
      type_key: typeKey,
      name: name.trim(),
      description: description.trim(),
      fields: fieldsObj,
      sections: sectionsArr,
      is_active: template.is_active !== false,
    })
    setSaving(false)
  }

  const totalFields = sections.reduce((sum, s) => sum + (s?.fieldItems?.length || 0), 0)

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)',
    }} onClick={onClose}>
      <div style={{
        background: '#fff', borderRadius: 20, width: 700, maxHeight: '85vh',
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)', overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
      }} onClick={e => e.stopPropagation()}>

        {/* 모달 헤더 */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid #F0F2F5',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#1E293B' }}>
            {template.id ? '양식 수정' : '새 양식 등록'}
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

        {/* 모달 바디 */}
        <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
          {/* 기본 정보 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8, display: 'block' }}>양식 이름 *</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="예: 일반 구매"
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 10, fontSize: 14,
                  border: '1px solid #E2E8F0', outline: 'none', boxSizing: 'border-box',
                }}
                onFocus={e => e.target.style.borderColor = '#0D9488'}
                onBlur={e => e.target.style.borderColor = '#E2E8F0'}
              />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8, display: 'block' }}>설명</label>
              <input value={description} onChange={e => setDescription(e.target.value)} placeholder="예: 비품, 소모품 등"
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 10, fontSize: 14,
                  border: '1px solid #E2E8F0', outline: 'none', boxSizing: 'border-box',
                }}
                onFocus={e => e.target.style.borderColor = '#0D9488'}
                onBlur={e => e.target.style.borderColor = '#E2E8F0'}
              />
            </div>
          </div>

          {/* 섹션 목록 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#1E293B' }}>
              섹션 ({sections.length}개) · 필드 ({totalFields}개)
            </div>
            <button onClick={addSection} style={{
              padding: '6px 14px', borderRadius: 8, border: '1px solid #E2E8F0',
              background: '#fff', fontSize: 12, fontWeight: 600, color: '#0D9488',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style={{ width: 14, height: 14 }}>
                <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
              </svg>
              섹션 추가
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {sections.map((sec, sIdx) => {
              const locked = isLocked(sec.title)
              const isExpanded = expandedSection === sIdx
              return (
                <div key={sIdx} style={{
                  border: '1px solid #F0F2F5', borderRadius: 14, overflow: 'hidden',
                  background: locked ? '#FAFBFC' : '#fff',
                }}>
                  {/* 섹션 헤더 */}
                  <div style={{
                    padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10,
                    cursor: 'pointer', background: isExpanded ? '#F8FFFE' : 'transparent',
                    borderBottom: isExpanded ? '1px solid #F0F2F5' : 'none',
                  }} onClick={() => setExpandedSection(isExpanded ? null : sIdx)}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="#94A3B8" style={{
                      width: 14, height: 14, transition: 'transform 0.2s',
                      transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                    }}>
                      <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                    </svg>

                    {editingSectionIdx === sIdx ? (
                      <input value={editingSectionTitle}
                        onChange={e => setEditingSectionTitle(e.target.value)}
                        onBlur={saveEditSection}
                        onKeyDown={e => e.key === 'Enter' && saveEditSection()}
                        onClick={e => e.stopPropagation()}
                        autoFocus
                        style={{
                          flex: 1, padding: '4px 8px', borderRadius: 6, fontSize: 13, fontWeight: 600,
                          border: '1px solid #0D9488', outline: 'none',
                        }}
                      />
                    ) : (
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 650, color: '#1E293B' }}>
                        {sec.title}
                      </span>
                    )}

                    <span style={{ fontSize: 11, color: '#94A3B8' }}>{(sec.fieldItems || []).length}개 필드</span>

                    {locked ? (
                      <span style={{
                        fontSize: 10, padding: '2px 8px', borderRadius: 5,
                        background: '#F1F5F9', color: '#94A3B8', fontWeight: 600,
                      }}>기본</span>
                    ) : (
                      <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                        <button onClick={() => startEditSection(sIdx)} title="섹션 이름 변경" style={{
                          width: 26, height: 26, borderRadius: 6, border: '1px solid #E2E8F0',
                          background: '#fff', cursor: 'pointer', display: 'flex',
                          alignItems: 'center', justifyContent: 'center', color: '#64748B',
                        }}>
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style={{ width: 12, height: 12 }}>
                            <path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
                          </svg>
                        </button>
                        <button onClick={() => removeSection(sIdx)} title="섹션 삭제" style={{
                          width: 26, height: 26, borderRadius: 6, border: '1px solid #FECACA',
                          background: '#fff', cursor: 'pointer', display: 'flex',
                          alignItems: 'center', justifyContent: 'center', color: '#DC2626',
                        }}>
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style={{ width: 12, height: 12 }}>
                            <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5Z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 섹션 필드 목록 */}
                  {isExpanded && (
                    <div style={{ padding: '8px 16px 12px' }}>
                      {sec.fieldItems.map((fi, fIdx) => (
                        <div key={fIdx} style={{
                          display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0',
                          borderBottom: fIdx < sec.fieldItems.length - 1 ? '1px solid #F8FAFC' : 'none',
                        }}>
                          <span style={{ fontSize: 11, color: '#CBD5E1', width: 24, textAlign: 'center', flexShrink: 0 }}>
                            {fIdx + 1}
                          </span>
                          <input value={fi.label}
                            onChange={e => updateFieldLabel(sIdx, fIdx, e.target.value)}
                            placeholder="필드 이름"
                            readOnly={locked}
                            style={{
                              flex: 1, padding: '6px 10px', borderRadius: 8, fontSize: 13,
                              border: locked ? '1px solid transparent' : '1px solid #E2E8F0',
                              outline: 'none', background: locked ? 'transparent' : '#fff',
                              color: '#1E293B',
                            }}
                            onFocus={e => { if (!locked) e.target.style.borderColor = '#0D9488' }}
                            onBlur={e => e.target.style.borderColor = '#E2E8F0'}
                          />
                          {!locked && (
                            <button onClick={() => removeField(sIdx, fIdx)} style={{
                              width: 24, height: 24, borderRadius: 6, border: 'none',
                              background: 'transparent', cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#CBD5E1',
                            }}
                            onMouseEnter={e => e.target.style.color = '#DC2626'}
                            onMouseLeave={e => e.target.style.color = '#CBD5E1'}>
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style={{ width: 14, height: 14 }}>
                                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                              </svg>
                            </button>
                          )}
                        </div>
                      ))}
                      {!locked && (
                        <button onClick={() => addField(sIdx)} style={{
                          marginTop: 6, padding: '6px 12px', borderRadius: 8,
                          border: '1px dashed #CBD5E1', background: 'transparent',
                          fontSize: 12, color: '#94A3B8', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 4, width: '100%',
                          justifyContent: 'center',
                        }}>
                          + 필드 추가
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* 모달 푸터 */}
        <div style={{
          padding: '16px 24px', borderTop: '1px solid #F0F2F5',
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, flexShrink: 0,
        }}>
          <button onClick={onClose} style={{
            padding: '10px 20px', borderRadius: 10, border: '1px solid #E2E8F0',
            background: '#fff', fontSize: 13, fontWeight: 600, color: '#64748B', cursor: 'pointer',
          }}>취소</button>
          <button onClick={handleSave} disabled={saving || !name.trim()} style={{
            padding: '10px 20px', borderRadius: 10, border: 'none', fontSize: 13, fontWeight: 600,
            background: 'linear-gradient(135deg, #0ea5a0, #06b6d4)', color: '#fff', cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(14,165,160,0.18)',
            opacity: saving || !name.trim() ? 0.5 : 1,
          }}>{saving ? '저장 중...' : template.id ? '수정' : '등록'}</button>
        </div>
      </div>
    </div>
  )
}

/* ── 메인 컴포넌트 ── */
function RfpTemplates() {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [editModal, setEditModal] = useState(null) // null | template object
  const [hoveredRow, setHoveredRow] = useState(null)

  useEffect(() => { loadTemplates() }, [])

  const loadTemplates = async () => {
    try {
      const data = await api.getRfpTemplates()
      const dbTemplates = (data.templates || []).map(t => ({ ...t, source: 'db' }))

      // DB 양식의 type_key 집합
      const dbKeys = new Set(dbTemplates.map(t => t.type_key))

      // 기본 양식 중 DB에 없는 것만 유지 → DB 양식이 우선
      const remaining = BUILTIN_LIST.filter(t => !dbKeys.has(t.type_key))

      setTemplates([...dbTemplates, ...remaining])
    } catch (err) {
      console.error('RFP 양식 로드 실패:', err)
      setTemplates(BUILTIN_LIST)
    }
    setLoading(false)
  }

  const handleSave = async (data) => {
    try {
      const payload = {
        type_key: data.type_key,
        name: data.name,
        description: data.description,
        fields: data.fields,
        sections: data.sections,
        is_active: data.is_active,
      }
      if (data.id && data.id > 0) {
        await api.updateRfpTemplate(data.id, payload)
      } else {
        await api.createRfpTemplate(payload)
      }
      setEditModal(null)
      await loadTemplates()
    } catch (err) {
      alert('저장 실패')
    }
  }

  const handleDelete = async (id) => {
    if (id < 0) return
    if (!confirm('이 양식을 삭제하시겠습니까?')) return
    try {
      await api.deleteRfpTemplate(id)
      await loadTemplates()
    } catch (err) {
      alert('삭제 실패')
    }
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
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1E293B', margin: 0 }}>RFP 양식 관리</h1>
          <p style={{ fontSize: 14, color: '#94A3B8', marginTop: 6 }}>RFP 양식의 섹션과 필드를 관리합니다.</p>
        </div>
        <button onClick={() => setEditModal({ sections: [], fields: {} })} style={{
          padding: '10px 20px', borderRadius: 10, border: 'none', fontSize: 13, fontWeight: 600,
          background: 'linear-gradient(135deg, #0ea5a0, #06b6d4)', color: '#fff', cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(14,165,160,0.18)', display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style={{ width: 16, height: 16 }}>
            <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
          </svg>
          새 양식
        </button>
      </div>

      {/* 양식 목록 */}
      <div style={{
        background: '#fff', borderRadius: 18, border: '1px solid #F0F2F5',
        boxShadow: '0 1px 4px rgba(0,0,0,0.02)', overflow: 'hidden',
      }}>
        {/* 테이블 헤더 */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 200px 80px 80px 80px 100px',
          padding: '12px 24px', borderBottom: '1px solid #F0F2F5', background: '#FAFBFC',
        }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8' }}>양식 이름</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8' }}>설명</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8', textAlign: 'center' }}>섹션</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8', textAlign: 'center' }}>필드</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8', textAlign: 'center' }}>상태</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8', textAlign: 'center' }}>관리</div>
        </div>

        {/* 데이터 행 */}
        {templates.map((t, idx) => {
          const fieldsCount = t.fields ? Object.keys(t.fields).length : (t.fields_count || 0)
          const sectionsCount = t.sections ? t.sections.length : 0
          return (
            <div key={t.type_key || idx} style={{
              display: 'grid', gridTemplateColumns: '1fr 200px 80px 80px 80px 100px',
              padding: '14px 24px', alignItems: 'center',
              borderBottom: idx < templates.length - 1 ? '1px solid #F8FAFC' : 'none',
              background: hoveredRow === idx ? '#F8FFFE' : 'transparent',
              transition: 'background 0.15s',
            }}
            onMouseEnter={() => setHoveredRow(idx)}
            onMouseLeave={() => setHoveredRow(null)}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#1E293B' }}>{t.name}</div>
              <div style={{ fontSize: 13, color: '#94A3B8' }}>{t.description || '-'}</div>
              <div style={{ textAlign: 'center', fontSize: 13, fontWeight: 600, color: '#64748B' }}>{sectionsCount}</div>
              <div style={{ textAlign: 'center', fontSize: 13, fontWeight: 600, color: '#64748B' }}>{fieldsCount}</div>
              <div style={{ textAlign: 'center' }}>
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6,
                  background: t.is_active ? '#ECFDF5' : '#F1F5F9',
                  color: t.is_active ? '#059669' : '#94A3B8',
                }}>
                  {t.is_active !== false ? '활성' : '비활성'}
                </span>
              </div>
              <div style={{ textAlign: 'center', display: 'flex', gap: 6, justifyContent: 'center' }}>
                <button onClick={() => setEditModal(t)} style={{
                  padding: '6px 12px', borderRadius: 8, border: '1px solid #E2E8F0',
                  background: '#fff', fontSize: 12, fontWeight: 600, color: '#64748B', cursor: 'pointer',
                }}
                onMouseEnter={e => { e.target.style.borderColor = '#0D9488'; e.target.style.color = '#0D9488' }}
                onMouseLeave={e => { e.target.style.borderColor = '#E2E8F0'; e.target.style.color = '#64748B' }}>
                  수정
                </button>
                {t.source === 'db' && (
                  <button onClick={() => handleDelete(t.id)} style={{
                    padding: '6px 10px', borderRadius: 8, border: '1px solid #FECACA',
                    background: '#fff', fontSize: 12, fontWeight: 600, color: '#DC2626', cursor: 'pointer',
                  }}>삭제</button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* 편집 모달 */}
      {editModal && (
        <TemplateEditorModal
          template={editModal}
          onClose={() => setEditModal(null)}
          onSave={handleSave}
        />
      )}
    </div>
  )
}

export default RfpTemplates

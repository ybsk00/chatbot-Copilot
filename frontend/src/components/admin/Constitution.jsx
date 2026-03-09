import { useState, useEffect } from 'react'
import { api } from '../../api/client'

const TYPE_OPTIONS = ['전체', '거부조건', '행동제어', '수치기준']
const PAGE_SIZE = 10

const TYPE_STYLES = {
  '거부조건': { bg: '#FEF2F2', color: '#DC2626', border: '#FECACA' },
  '행동제어': { bg: '#F0FDFA', color: '#0D9488', border: '#99F6E4' },
  '수치기준': { bg: '#F5F3FF', color: '#7C3AED', border: '#DDD6FE' },
}

/* ── 모달 컴포넌트 ── */
function RuleModal({ rule, onClose, onSave, onDelete }) {
  const isEdit = !!rule?.id
  const [ruleType, setRuleType] = useState(rule?.rule_type || '행동제어')
  const [content, setContent] = useState(rule?.content || '')
  const [isActive, setIsActive] = useState(rule?.is_active !== false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const handleSave = async () => {
    if (!content.trim()) return
    setSaving(true)
    await onSave({ id: rule?.id, rule_type: ruleType, content: content.trim(), is_active: isActive })
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return }
    setDeleting(true)
    await onDelete(rule.id)
    setDeleting(false)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)',
    }} onClick={onClose}>
      <div style={{
        background: '#fff', borderRadius: 20, width: 540, maxHeight: '80vh',
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)', overflow: 'hidden',
      }} onClick={e => e.stopPropagation()}>
        {/* 모달 헤더 */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid #F0F2F5',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#1E293B' }}>
            {isEdit ? '조항 수정' : '새 조항 추가'}
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
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* 유형 선택 */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8, display: 'block' }}>
              조항 유형
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              {['거부조건', '행동제어', '수치기준'].map(t => {
                const ts = TYPE_STYLES[t]
                const selected = ruleType === t
                return (
                  <button key={t} onClick={() => setRuleType(t)} style={{
                    padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                    border: `1.5px solid ${selected ? ts.color : '#E2E8F0'}`,
                    background: selected ? ts.bg : '#fff',
                    color: selected ? ts.color : '#94A3B8',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}>
                    {t}
                  </button>
                )
              })}
            </div>
          </div>

          {/* 내용 */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8, display: 'block' }}>
              조항 내용
            </label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="헌법 조항 내용을 입력하세요..."
              rows={4}
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 12, fontSize: 14,
                border: '1px solid #E2E8F0', outline: 'none', boxSizing: 'border-box',
                resize: 'vertical', lineHeight: 1.6, fontFamily: 'inherit',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => e.target.style.borderColor = '#0D9488'}
              onBlur={e => e.target.style.borderColor = '#E2E8F0'}
            />
          </div>

          {/* 활성 상태 (수정 시만) */}
          {isEdit && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button onClick={() => setIsActive(!isActive)} style={{
                width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
                background: isActive ? '#0D9488' : '#CBD5E1', transition: 'background 0.2s',
                position: 'relative', padding: 0,
              }}>
                <div style={{
                  width: 18, height: 18, borderRadius: '50%', background: '#fff',
                  position: 'absolute', top: 3,
                  left: isActive ? 23 : 3, transition: 'left 0.2s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                }} />
              </button>
              <span style={{ fontSize: 13, color: isActive ? '#0D9488' : '#94A3B8', fontWeight: 500 }}>
                {isActive ? '활성' : '비활성'}
              </span>
            </div>
          )}
        </div>

        {/* 모달 푸터 */}
        <div style={{
          padding: '16px 24px', borderTop: '1px solid #F0F2F5',
          display: 'flex', alignItems: 'center', justifyContent: isEdit ? 'space-between' : 'flex-end',
          gap: 10,
        }}>
          {isEdit && (
            <button onClick={handleDelete} style={{
              padding: '10px 16px', borderRadius: 10, border: 'none', fontSize: 13, fontWeight: 600,
              background: confirmDelete ? '#DC2626' : '#FEF2F2',
              color: confirmDelete ? '#fff' : '#DC2626',
              cursor: 'pointer', transition: 'all 0.15s',
            }}>
              {deleting ? '삭제 중...' : confirmDelete ? '정말 삭제' : '삭제'}
            </button>
          )}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} style={{
              padding: '10px 20px', borderRadius: 10, border: '1px solid #E2E8F0',
              background: '#fff', fontSize: 13, fontWeight: 600, color: '#64748B', cursor: 'pointer',
            }}>
              취소
            </button>
            <button onClick={handleSave} disabled={saving || !content.trim()} style={{
              padding: '10px 20px', borderRadius: 10, border: 'none', fontSize: 13, fontWeight: 600,
              background: 'linear-gradient(135deg, #0ea5a0, #06b6d4)', color: '#fff', cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(14,165,160,0.18)',
              opacity: saving || !content.trim() ? 0.5 : 1,
            }}>
              {saving ? '저장 중...' : isEdit ? '수정' : '추가'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── 삭제 확인 모달 ── */
function DeleteConfirmModal({ rule, onClose, onConfirm }) {
  const [deleting, setDeleting] = useState(false)
  const handleConfirm = async () => {
    setDeleting(true)
    await onConfirm(rule.id)
    setDeleting(false)
  }
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)',
    }} onClick={onClose}>
      <div style={{
        background: '#fff', borderRadius: 18, width: 420, padding: '28px 28px 24px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12, background: '#FEF2F2',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#DC2626" style={{ width: 22, height: 22 }}>
              <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#1E293B' }}>조항 삭제</div>
            <div style={{ fontSize: 13, color: '#94A3B8', marginTop: 2 }}>이 작업은 되돌릴 수 없습니다.</div>
          </div>
        </div>
        <div style={{
          padding: '12px 14px', borderRadius: 10, background: '#F8FAFC',
          border: '1px solid #F0F2F5', marginBottom: 20,
          fontSize: 13, color: '#374151', lineHeight: 1.6,
        }}>
          {rule.content}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onClose} style={{
            padding: '10px 20px', borderRadius: 10, border: '1px solid #E2E8F0',
            background: '#fff', fontSize: 13, fontWeight: 600, color: '#64748B', cursor: 'pointer',
          }}>취소</button>
          <button onClick={handleConfirm} disabled={deleting} style={{
            padding: '10px 20px', borderRadius: 10, border: 'none', fontSize: 13, fontWeight: 600,
            background: '#DC2626', color: '#fff', cursor: deleting ? 'not-allowed' : 'pointer',
            opacity: deleting ? 0.6 : 1,
          }}>{deleting ? '삭제 중...' : '삭제'}</button>
        </div>
      </div>
    </div>
  )
}

/* ── 메인 컴포넌트 ── */
function Constitution() {
  const [rules, setRules] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState('전체')
  const [page, setPage] = useState(1)
  const [modal, setModal] = useState(null) // null | {} (추가) | {id, ...} (수정)
  const [deleteTarget, setDeleteTarget] = useState(null) // 삭제 확인 대상
  const [hoveredRow, setHoveredRow] = useState(null)

  useEffect(() => { loadRules() }, [])

  const loadRules = async () => {
    try {
      const data = await api.getConstitution()
      setRules(data.rules || [])
    } catch (err) {
      console.error('Constitution load error:', err)
    }
    setLoading(false)
  }

  // 필터 적용
  const filtered = filterType === '전체'
    ? rules
    : rules.filter(r => r.rule_type === filterType)

  // 페이지네이션
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  // 필터 변경 시 1페이지로
  const handleFilterChange = (type) => {
    setFilterType(type)
    setPage(1)
  }

  // 저장 (추가/수정)
  const handleSave = async (data) => {
    try {
      if (data.id) {
        await api.updateConstitution(data.id, data.rule_type, data.content, data.is_active)
      } else {
        await api.addConstitution(data.rule_type, data.content)
      }
      setModal(null)
      await loadRules()
    } catch (err) {
      console.error('Save rule error:', err)
    }
  }

  // 삭제
  const handleDelete = async (id) => {
    try {
      await api.deleteConstitution(id)
      setModal(null)
      await loadRules()
    } catch (err) {
      console.error('Delete rule error:', err)
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

  // 유형별 건수
  const typeCounts = {}
  rules.forEach(r => { typeCounts[r.rule_type] = (typeCounts[r.rule_type] || 0) + 1 })

  return (
    <div>
      {/* 페이지 헤더 */}
      <div style={{ marginBottom: 28, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1E293B', margin: 0 }}>헌법 관리</h1>
          <p style={{ fontSize: 14, color: '#94A3B8', marginTop: 6 }}>상담도우미의 행동 원칙과 제한 조건을 관리합니다.</p>
        </div>
        <button onClick={() => setModal({})} style={{
          padding: '10px 20px', borderRadius: 10, border: 'none', fontSize: 13, fontWeight: 600,
          background: 'linear-gradient(135deg, #0ea5a0, #06b6d4)', color: '#fff', cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(14,165,160,0.18)', display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style={{ width: 16, height: 16 }}>
            <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
          </svg>
          새 조항
        </button>
      </div>

      {/* 드롭다운 필터 */}
      <div style={{
        background: '#fff', borderRadius: 18, border: '1px solid #F0F2F5',
        boxShadow: '0 1px 4px rgba(0,0,0,0.02)', overflow: 'hidden',
      }}>
        <div style={{
          padding: '16px 24px', borderBottom: '1px solid #F0F2F5',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <select
              value={filterType}
              onChange={e => handleFilterChange(e.target.value)}
              style={{
                padding: '8px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                border: '1px solid #E2E8F0', outline: 'none', background: '#fff',
                color: '#1E293B', cursor: 'pointer', appearance: 'auto',
              }}
            >
              {TYPE_OPTIONS.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <span style={{ fontSize: 13, color: '#94A3B8' }}>
              {filtered.length}개 조항
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {Object.entries(typeCounts).map(([type, count]) => {
              const ts = TYPE_STYLES[type]
              if (!ts) return null
              return (
                <span key={type} style={{
                  fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 8,
                  background: ts.bg, color: ts.color,
                }}>
                  {type} {count}
                </span>
              )
            })}
          </div>
        </div>

        {/* 테이블 헤더 */}
        <div style={{
          display: 'grid', gridTemplateColumns: '50px 100px 1fr 80px 120px',
          padding: '12px 24px', borderBottom: '1px solid #F0F2F5', background: '#FAFBFC',
        }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8' }}>#</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8' }}>유형</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8' }}>내용</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8', textAlign: 'center' }}>상태</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8', textAlign: 'center' }}>관리</div>
        </div>

        {/* 데이터 행 */}
        {paged.length === 0 ? (
          <div style={{ padding: '60px 0', textAlign: 'center', color: '#94A3B8', fontSize: 14 }}>
            해당 유형의 조항이 없습니다.
          </div>
        ) : (
          paged.map((rule, idx) => {
            const ts = TYPE_STYLES[rule.rule_type] || TYPE_STYLES['행동제어']
            const globalIdx = (currentPage - 1) * PAGE_SIZE + idx + 1
            return (
              <div
                key={rule.id}
                style={{
                  display: 'grid', gridTemplateColumns: '50px 100px 1fr 80px 120px',
                  padding: '14px 24px', alignItems: 'center',
                  borderBottom: idx < paged.length - 1 ? '1px solid #F8FAFC' : 'none',
                  background: hoveredRow === idx ? '#F8FFFE' : 'transparent',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={() => setHoveredRow(idx)}
                onMouseLeave={() => setHoveredRow(null)}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: '#94A3B8' }}>{globalIdx}</div>
                <div>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 6,
                    background: ts.bg, color: ts.color, border: `1px solid ${ts.border}`,
                  }}>
                    {rule.rule_type}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, paddingRight: 16 }}>
                  {rule.content}
                </div>
                <div style={{ textAlign: 'center' }}>
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 6,
                    background: rule.is_active ? '#ECFDF5' : '#F1F5F9',
                    color: rule.is_active ? '#059669' : '#94A3B8',
                  }}>
                    {rule.is_active ? '활성' : '비활성'}
                  </span>
                </div>
                <div style={{ textAlign: 'center', display: 'flex', gap: 6, justifyContent: 'center' }}>
                  <button
                    onMouseDown={e => { e.preventDefault(); setModal(rule) }}
                    style={{
                      padding: '6px 12px', borderRadius: 8, border: '1px solid #E2E8F0',
                      background: '#fff', fontSize: 12, fontWeight: 600, color: '#64748B',
                      cursor: 'pointer', transition: 'all 0.15s', userSelect: 'none',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#0D9488'; e.currentTarget.style.color = '#0D9488' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.color = '#64748B' }}
                  >
                    수정
                  </button>
                  <button
                    onMouseDown={e => { e.preventDefault(); setDeleteTarget(rule) }}
                    style={{
                      padding: '6px 12px', borderRadius: 8, border: '1px solid #E2E8F0',
                      background: '#fff', fontSize: 12, fontWeight: 600, color: '#64748B',
                      cursor: 'pointer', transition: 'all 0.15s', userSelect: 'none',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#DC2626'; e.currentTarget.style.color = '#DC2626' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.color = '#64748B' }}
                  >
                    삭제
                  </button>
                </div>
              </div>
            )
          })
        )}

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div style={{
            padding: '16px 24px', borderTop: '1px solid #F0F2F5',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              style={{
                padding: '6px 12px', borderRadius: 8, border: '1px solid #E2E8F0',
                background: '#fff', fontSize: 12, fontWeight: 600,
                color: currentPage <= 1 ? '#CBD5E1' : '#64748B',
                cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
              }}
            >
              이전
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                onClick={() => setPage(p)}
                style={{
                  width: 32, height: 32, borderRadius: 8, border: 'none',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  background: p === currentPage ? '#0D9488' : 'transparent',
                  color: p === currentPage ? '#fff' : '#64748B',
                  transition: 'all 0.15s',
                }}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              style={{
                padding: '6px 12px', borderRadius: 8, border: '1px solid #E2E8F0',
                background: '#fff', fontSize: 12, fontWeight: 600,
                color: currentPage >= totalPages ? '#CBD5E1' : '#64748B',
                cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
              }}
            >
              다음
            </button>
          </div>
        )}
      </div>

      {/* 수정/추가 모달 */}
      {modal !== null && (
        <RuleModal
          rule={modal}
          onClose={() => setModal(null)}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}

      {/* 삭제 확인 모달 */}
      {deleteTarget && (
        <DeleteConfirmModal
          rule={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={async (id) => {
            await handleDelete(id)
            setDeleteTarget(null)
          }}
        />
      )}
    </div>
  )
}

export default Constitution

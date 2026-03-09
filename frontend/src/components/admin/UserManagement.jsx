import { useState, useEffect } from 'react'
import { api } from '../../api/client'

const PAGE_SIZE = 10

const ROLES = [
  { key: 'superadmin', label: '최고 관리자' },
  { key: 'admin', label: '관리자' },
  { key: 'viewer', label: '뷰어' },
]

const roleStyleMap = {
  superadmin: { background: '#FEF2F2', color: '#DC2626' },
  admin:      { background: '#F0FDFA', color: '#0D9488' },
  viewer:     { background: '#F1F5F9', color: '#64748B' },
}

const ROLE_LABEL = { superadmin: '최고 관리자', admin: '관리자', viewer: '뷰어' }

/* ═══ 사용자 추가/수정 모달 ═══ */
function UserModal({ user, onClose, onSaved }) {
  const isEdit = !!user
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    password: '',
    role: user?.role || 'viewer',
    department: user?.department || '',
    is_active: user?.is_active ?? true,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      setError('이름과 이메일은 필수입니다.')
      return
    }
    if (!isEdit && !form.password) {
      setError('비밀번호를 입력하세요.')
      return
    }
    setSaving(true)
    setError('')
    try {
      if (isEdit) {
        const data = {
          name: form.name,
          email: form.email,
          role: form.role,
          department: form.department,
          is_active: form.is_active,
        }
        if (form.password) data.password = form.password
        const res = await api.updateUser(user.id, data)
        if (res.status === 'error') { setError(res.error); setSaving(false); return }
      } else {
        const res = await api.createUser({
          name: form.name,
          email: form.email,
          password: form.password,
          role: form.role,
          department: form.department,
        })
        if (res.status === 'error') { setError(res.error); setSaving(false); return }
      }
      onSaved()
    } catch {
      setError('저장에 실패했습니다.')
    }
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return }
    setSaving(true)
    try {
      await api.deleteUser(user.id)
      onSaved()
    } catch {
      setError('삭제에 실패했습니다.')
    }
    setSaving(false)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(15,23,42,0.3)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        width: 500, maxHeight: '85vh', overflowY: 'auto',
        background: '#fff', borderRadius: 20,
        border: '1px solid #F0F2F5',
        boxShadow: '0 20px 60px rgba(0,0,0,0.08)',
      }} onClick={e => e.stopPropagation()}>
        {/* 헤더 */}
        <div style={{
          padding: '24px 28px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1E293B' }}>
            {isEdit ? '관리자 수정' : '관리자 추가'}
          </h3>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 8, border: 'none',
            background: '#F1F5F9', cursor: 'pointer', fontSize: 16, color: '#64748B',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>×</button>
        </div>

        {/* 폼 */}
        <div style={{ padding: '20px 28px' }}>
          {/* 이름 */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6, display: 'block' }}>이름 *</label>
            <input
              value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="이름을 입력하세요"
              style={{
                width: '100%', padding: '11px 14px', borderRadius: 10,
                border: '1px solid #E2E8F0', fontSize: 14, color: '#1E293B',
                background: '#F8FAFC', outline: 'none', boxSizing: 'border-box',
              }}
              onFocus={e => { e.target.style.borderColor = '#0ea5a0'; e.target.style.background = '#fff' }}
              onBlur={e => { e.target.style.borderColor = '#E2E8F0'; e.target.style.background = '#F8FAFC' }}
            />
          </div>

          {/* 이메일 */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6, display: 'block' }}>이메일 *</label>
            <input
              type="email"
              value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
              placeholder="example@email.com"
              style={{
                width: '100%', padding: '11px 14px', borderRadius: 10,
                border: '1px solid #E2E8F0', fontSize: 14, color: '#1E293B',
                background: '#F8FAFC', outline: 'none', boxSizing: 'border-box',
              }}
              onFocus={e => { e.target.style.borderColor = '#0ea5a0'; e.target.style.background = '#fff' }}
              onBlur={e => { e.target.style.borderColor = '#E2E8F0'; e.target.style.background = '#F8FAFC' }}
            />
          </div>

          {/* 비밀번호 */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6, display: 'block' }}>
              비밀번호 {isEdit ? '(변경 시에만 입력)' : '*'}
            </label>
            <input
              type="password"
              value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
              placeholder={isEdit ? '변경하려면 새 비밀번호 입력' : '비밀번호를 입력하세요'}
              style={{
                width: '100%', padding: '11px 14px', borderRadius: 10,
                border: '1px solid #E2E8F0', fontSize: 14, color: '#1E293B',
                background: '#F8FAFC', outline: 'none', boxSizing: 'border-box',
              }}
              onFocus={e => { e.target.style.borderColor = '#0ea5a0'; e.target.style.background = '#fff' }}
              onBlur={e => { e.target.style.borderColor = '#E2E8F0'; e.target.style.background = '#F8FAFC' }}
            />
          </div>

          {/* 역할 */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 8, display: 'block' }}>역할</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {ROLES.map(r => {
                const sel = form.role === r.key
                return (
                  <button key={r.key} onClick={() => setForm({ ...form, role: r.key })} style={{
                    flex: 1, padding: '9px 0', borderRadius: 8, fontSize: 13, fontWeight: 600,
                    border: sel ? '2px solid #0D9488' : '1px solid #E2E8F0',
                    background: sel ? '#F0FDFA' : '#fff',
                    color: sel ? '#0D9488' : '#64748B',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}>{r.label}</button>
                )
              })}
            </div>
          </div>

          {/* 부서 */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6, display: 'block' }}>부서</label>
            <input
              value={form.department} onChange={e => setForm({ ...form, department: e.target.value })}
              placeholder="부서를 입력하세요"
              style={{
                width: '100%', padding: '11px 14px', borderRadius: 10,
                border: '1px solid #E2E8F0', fontSize: 14, color: '#1E293B',
                background: '#F8FAFC', outline: 'none', boxSizing: 'border-box',
              }}
              onFocus={e => { e.target.style.borderColor = '#0ea5a0'; e.target.style.background = '#fff' }}
              onBlur={e => { e.target.style.borderColor = '#E2E8F0'; e.target.style.background = '#F8FAFC' }}
            />
          </div>

          {/* 상태 (수정 시만) */}
          {isEdit && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 8, display: 'block' }}>상태</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[{ key: true, label: '활성' }, { key: false, label: '비활성' }].map(s => {
                  const sel = form.is_active === s.key
                  return (
                    <button key={String(s.key)} onClick={() => setForm({ ...form, is_active: s.key })} style={{
                      flex: 1, padding: '9px 0', borderRadius: 8, fontSize: 13, fontWeight: 600,
                      border: sel ? '2px solid #0D9488' : '1px solid #E2E8F0',
                      background: sel ? '#F0FDFA' : '#fff',
                      color: sel ? '#0D9488' : '#64748B',
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}>{s.label}</button>
                  )
                })}
              </div>
            </div>
          )}

          {/* 에러 */}
          {error && (
            <div style={{
              padding: '10px 14px', borderRadius: 10, marginBottom: 16,
              background: '#FEF2F2', color: '#DC2626', fontSize: 13, border: '1px solid #FECACA',
            }}>{error}</div>
          )}
        </div>

        {/* 푸터 */}
        <div style={{
          padding: '16px 28px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            {isEdit && (
              <button onClick={handleDelete} disabled={saving} style={{
                padding: '9px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                border: '1px solid #FECACA', cursor: 'pointer',
                background: confirmDelete ? '#DC2626' : '#FEF2F2',
                color: confirmDelete ? '#fff' : '#DC2626',
                transition: 'all 0.15s',
              }}>{confirmDelete ? '정말 삭제' : '삭제'}</button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} style={{
              padding: '9px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600,
              border: '1px solid #E2E8F0', background: '#fff', color: '#64748B', cursor: 'pointer',
            }}>취소</button>
            <button onClick={handleSave} disabled={saving} style={{
              padding: '9px 24px', borderRadius: 10, fontSize: 13, fontWeight: 700,
              border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
              background: saving ? '#94D5D0' : 'linear-gradient(135deg, #0ea5a0, #14B8A6)',
              color: '#fff', boxShadow: '0 2px 8px rgba(14,165,160,0.18)',
              transition: 'all 0.15s',
            }}>{saving ? '저장 중...' : isEdit ? '수정' : '추가'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ═══ 메인 컴포넌트 ═══ */
function UserManagement() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [modalUser, setModalUser] = useState(null)  // null=closed, undefined=new, object=edit
  const [showModal, setShowModal] = useState(false)
  const [hoveredRow, setHoveredRow] = useState(null)

  useEffect(() => { loadUsers() }, [])

  const loadUsers = async () => {
    try {
      const data = await api.getUsers()
      setUsers(data.users || [])
    } catch (err) {
      console.error('Users load error:', err)
    }
    setLoading(false)
  }

  const totalPages = Math.max(1, Math.ceil(users.length / PAGE_SIZE))
  const paged = users.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const openNew = () => { setModalUser(undefined); setShowModal(true) }
  const openEdit = (u) => { setModalUser(u); setShowModal(true) }
  const closeModal = () => { setShowModal(false); setModalUser(null) }
  const handleSaved = () => { closeModal(); loadUsers() }

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 256, color: '#94A3B8', fontSize: 14 }}>로딩 중...</div>
  }

  return (
    <div style={{ padding: 0 }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1E293B', margin: 0, lineHeight: 1.3 }}>사용자 관리</h1>
          <p style={{ fontSize: 14, color: '#94A3B8', marginTop: 6, fontWeight: 400 }}>
            관리자 계정을 관리합니다. 총 {users.length}명
          </p>
        </div>
        <button onClick={openNew} style={{
          padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 700,
          border: 'none', cursor: 'pointer',
          background: 'linear-gradient(135deg, #0ea5a0, #14B8A6)',
          color: '#fff', boxShadow: '0 2px 8px rgba(14,165,160,0.18)',
          transition: 'all 0.15s',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> 관리자 추가
        </button>
      </div>

      {/* 테이블 */}
      <div style={{
        background: '#fff', borderRadius: 18,
        border: '1px solid #F0F2F5', boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
        overflow: 'hidden',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#FAFBFC' }}>
              {['이름', '이메일', '역할', '부서', '상태', '마지막 로그인', '관리'].map(h => (
                <th key={h} style={{
                  textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#94A3B8',
                  textTransform: 'uppercase', padding: '12px 20px',
                  borderBottom: '1px solid #F0F2F5', letterSpacing: '0.03em',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '48px 24px', textAlign: 'center', color: '#94A3B8', fontSize: 14 }}>
                  등록된 사용자가 없습니다.
                </td>
              </tr>
            ) : paged.map(user => {
              const rs = roleStyleMap[user.role] || roleStyleMap.viewer
              return (
                <tr
                  key={user.id}
                  style={{
                    borderBottom: '1px solid #F8FAFC',
                    background: hoveredRow === user.id ? '#FAFBFC' : 'transparent',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={() => setHoveredRow(user.id)}
                  onMouseLeave={() => setHoveredRow(null)}
                >
                  <td style={{ padding: '14px 20px', fontSize: 14, fontWeight: 600, color: '#1E293B' }}>
                    {user.name}
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: 13, color: '#64748B' }}>
                    {user.email}
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <span style={{
                      display: 'inline-block', fontSize: 11, fontWeight: 600,
                      padding: '3px 10px', borderRadius: 6, ...rs,
                    }}>
                      {ROLE_LABEL[user.role] || user.role}
                    </span>
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: 13, color: '#64748B' }}>
                    {user.department || '-'}
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <span style={{
                      display: 'inline-block', fontSize: 11, fontWeight: 600,
                      padding: '3px 10px', borderRadius: 6,
                      ...(user.is_active
                        ? { background: '#ECFDF5', color: '#059669' }
                        : { background: '#F1F5F9', color: '#94A3B8' }),
                    }}>
                      {user.is_active ? '활성' : '비활성'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: 12, color: '#94A3B8' }}>
                    {user.last_login ? new Date(user.last_login).toLocaleDateString('ko-KR') : '-'}
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <button
                      onClick={() => openEdit(user)}
                      style={{
                        padding: '5px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                        border: '1px solid #E2E8F0', background: '#fff', color: '#0D9488',
                        cursor: 'pointer', transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#F0FDFA'; e.currentTarget.style.borderColor = '#0D9488' }}
                      onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#E2E8F0' }}
                    >수정</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 20 }}>
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            style={{
              padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              border: '1px solid #E2E8F0', background: '#fff', color: currentPage === 1 ? '#CBD5E1' : '#475569',
              cursor: currentPage === 1 ? 'default' : 'pointer',
            }}
          >이전</button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setCurrentPage(p)} style={{
              width: 34, height: 34, borderRadius: 8, fontSize: 13, fontWeight: 600,
              border: p === currentPage ? '2px solid #0D9488' : '1px solid #E2E8F0',
              background: p === currentPage ? '#F0FDFA' : '#fff',
              color: p === currentPage ? '#0D9488' : '#64748B',
              cursor: 'pointer',
            }}>{p}</button>
          ))}
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            style={{
              padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              border: '1px solid #E2E8F0', background: '#fff', color: currentPage === totalPages ? '#CBD5E1' : '#475569',
              cursor: currentPage === totalPages ? 'default' : 'pointer',
            }}
          >다음</button>
        </div>
      )}

      {/* 모달 */}
      {showModal && (
        <UserModal user={modalUser} onClose={closeModal} onSaved={handleSaved} />
      )}
    </div>
  )
}

export default UserManagement

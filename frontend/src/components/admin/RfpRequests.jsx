import { useState, useEffect } from 'react'
import { api } from '../../api/client'

const STATUS_MAP = {
  submitted:  { label: '신청', color: 'bg-blue-100 text-blue-700' },
  reviewing:  { label: '검토중', color: 'bg-yellow-100 text-yellow-700' },
  approved:   { label: '승인', color: 'bg-green-100 text-green-700' },
  rejected:   { label: '반려', color: 'bg-red-100 text-red-700' },
}

const RFP_TYPE_LABELS = {
  purchase: '일반 구매',
  service_contract: '일반 용역',
  service: '서비스',
  rental: '렌탈·리스',
  construction: '공사',
  consulting: '컨설팅',
  purchase_maintenance: '구매+유지보수',
  rental_maintenance: '렌탈+유지보수',
  purchase_lease: '구매·리스',
}

function RfpRequests() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [filter, setFilter] = useState('')

  useEffect(() => { loadRequests() }, [])

  const loadRequests = async () => {
    try {
      const data = await api.getRfpRequests(filter || undefined)
      setRequests(data.rfp_requests || [])
    } catch (err) {
      console.error('RFP 신청 로드 실패:', err)
    }
    setLoading(false)
  }

  useEffect(() => { loadRequests() }, [filter])

  const handleStatusChange = async (id, newStatus) => {
    try {
      await api.updateRfpStatus(id, newStatus)
      await loadRequests()
      if (selected?.id === id) setSelected(prev => ({ ...prev, status: newStatus }))
    } catch (err) {
      alert('상태 변경 실패')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('이 RFP 신청을 삭제하시겠습니까?')) return
    try {
      await api.deleteRfpRequest(id)
      if (selected?.id === id) setSelected(null)
      await loadRequests()
    } catch (err) {
      alert('삭제 실패')
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">로딩 중...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">RFP 신청 관리</h1>
        <div className="flex gap-2">
          {['', 'submitted', 'reviewing', 'approved', 'rejected'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === f ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f ? STATUS_MAP[f]?.label : '전체'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-6">
        {/* 목록 */}
        <div className="w-2/5 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="max-h-[calc(100vh-200px)] overflow-y-auto divide-y divide-gray-100">
            {requests.length === 0 ? (
              <div className="text-center text-gray-400 py-16">RFP 신청이 없습니다.</div>
            ) : requests.map(req => (
              <button
                key={req.id}
                onClick={() => setSelected(req)}
                className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                  selected?.id === req.id ? 'bg-blue-50 border-l-3 border-l-blue-600' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-gray-800">{req.title || req.org_name || '제목 없음'}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${STATUS_MAP[req.status]?.color || 'bg-gray-100 text-gray-600'}`}>
                    {STATUS_MAP[req.status]?.label || req.status}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span>{RFP_TYPE_LABELS[req.rfp_type] || req.rfp_type}</span>
                  <span>{req.org_name}</span>
                  <span>{req.requester}</span>
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {new Date(req.created_at).toLocaleDateString('ko-KR')}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 상세 */}
        <div className="flex-1 bg-white rounded-xl border border-gray-200 p-6">
          {selected ? (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold text-gray-800">{selected.title || selected.org_name || 'RFP 상세'}</h2>
                  <p className="text-sm text-gray-500 mt-1">{RFP_TYPE_LABELS[selected.rfp_type]} · {new Date(selected.created_at).toLocaleString('ko-KR')}</p>
                </div>
                <div className="flex gap-2">
                  <select
                    value={selected.status}
                    onChange={(e) => handleStatusChange(selected.id, e.target.value)}
                    className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="submitted">신청</option>
                    <option value="reviewing">검토중</option>
                    <option value="approved">승인</option>
                    <option value="rejected">반려</option>
                  </select>
                  <button
                    onClick={() => handleDelete(selected.id)}
                    className="text-sm text-red-600 hover:text-red-800 px-3 py-1.5 border border-red-200 rounded-lg hover:bg-red-50"
                  >삭제</button>
                </div>
              </div>

              {/* 기본 정보 */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                {[
                  { label: '기관명', value: selected.org_name },
                  { label: '부서', value: selected.department },
                  { label: '요청자', value: selected.requester },
                  { label: 'Session', value: selected.session_id?.slice(0, 8) },
                ].map(item => (
                  <div key={item.label} className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">{item.label}</div>
                    <div className="text-sm font-medium text-gray-800">{item.value || '-'}</div>
                  </div>
                ))}
              </div>

              {/* 필드 상세 */}
              <h3 className="text-sm font-semibold text-gray-700 mb-3">입력 필드</h3>
              <div className="bg-gray-50 rounded-lg divide-y divide-gray-200">
                {selected.fields && Object.entries(selected.fields).map(([k, v]) => (
                  <div key={k} className="flex px-4 py-2.5">
                    <span className="w-32 text-xs text-gray-500 font-medium">{k}</span>
                    <span className="flex-1 text-sm text-gray-800">{String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-400">
              RFP 신청을 선택하세요.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default RfpRequests

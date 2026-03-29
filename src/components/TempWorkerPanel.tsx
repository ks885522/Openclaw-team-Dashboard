import React, { useState, useEffect, useCallback } from 'react'
import './TempWorkerPanel.css'
import {
  fetchTempWorkers,
  createTempWorker,
  startTempWorker,
  stopTempWorker,
  terminateTempWorker,
  type TempWorker,
} from '../services/api/tempWorker'

interface TempWorkerPanelProps {
  maxHeight?: string
}

type SortField = 'name' | 'status' | 'port' | 'createdAt'
type SortDir = 'asc' | 'desc'

const statusLabel: Record<TempWorker['status'], string> = {
  created: '已創建',
  starting: '啟動中',
  running: '運行中',
  stopping: '停止中',
  stopped: '已停止',
  terminating: '終止中',
  terminated: '已終止',
}

const TempWorkerPanel: React.FC<TempWorkerPanelProps> = ({ maxHeight = 'none' }) => {
  const [workers, setWorkers] = useState<TempWorker[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('')
  const [sortField, setSortField] = useState<SortField>('createdAt')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 10

  // Modal states
  const [showCreate, setShowCreate] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const [selectedWorker, setSelectedWorker] = useState<TempWorker | null>(null)
  const [createName, setCreateName] = useState('')
  const [createDesc, setCreateDesc] = useState('')
  const [createError, setCreateError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const loadWorkers = useCallback(async () => {
    try {
      const data = await fetchTempWorkers()
      setWorkers(data)
    } catch (err) {
      console.error('Failed to load temp workers:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadWorkers()
    const interval = setInterval(loadWorkers, 30000)
    return () => clearInterval(interval)
  }, [loadWorkers])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('asc')
    }
    setPage(1)
  }

  const filtered = workers
    .filter(w => {
      if (filterStatus && w.status !== filterStatus) return false
      if (search && !w.name.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
    .sort((a, b) => {
      let cmp = 0
      if (sortField === 'name') cmp = a.name.localeCompare(b.name)
      else if (sortField === 'status') cmp = a.status.localeCompare(b.status)
      else if (sortField === 'port') cmp = a.port - b.port
      else cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      return sortDir === 'asc' ? cmp : -cmp
    })

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize)

  const stats = {
    running: workers.filter(w => w.status === 'running' || w.status === 'starting').length,
    stopped: workers.filter(w => w.status === 'stopped' || w.status === 'stopping').length,
    offline: workers.filter(w => w.status === 'terminated').length,
    total: workers.length,
  }

  const handleCreate = async () => {
    if (!createName.trim()) {
      setCreateError('請輸入臨時工名稱')
      return
    }
    setSubmitting(true)
    setCreateError('')
    try {
      await createTempWorker({ name: createName.trim(), description: createDesc.trim() })
      setShowCreate(false)
      setCreateName('')
      setCreateDesc('')
      loadWorkers()
    } catch (err: any) {
      setCreateError(err.message || '創建失敗')
    } finally {
      setSubmitting(false)
    }
  }

  const handleStart = async (id: string) => {
    setActionLoading(id)
    try {
      await startTempWorker(id)
      loadWorkers()
    } catch (err) {
      console.error('Start failed:', err)
    } finally {
      setActionLoading(null)
    }
  }

  const handleStop = async (id: string) => {
    setActionLoading(id)
    try {
      await stopTempWorker(id)
      loadWorkers()
    } catch (err) {
      console.error('Stop failed:', err)
    } finally {
      setActionLoading(null)
    }
  }

  const handleTerminate = async (id: string) => {
    if (!confirm('確定要終止此臨時工嗎？此操作無法復原。')) return
    setActionLoading(id)
    try {
      await terminateTempWorker(id)
      loadWorkers()
    } catch (err) {
      console.error('Terminate failed:', err)
    } finally {
      setActionLoading(null)
    }
  }

  const openDetail = (worker: TempWorker) => {
    setSelectedWorker(worker)
    setShowDetail(true)
  }

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getAvatarClass = (status: TempWorker['status']) => {
    if (status === 'running' || status === 'starting') return 'worker-avatar'
    if (status === 'stopped' || status === 'stopping') return 'worker-avatar stopped'
    return 'worker-avatar offline'
  }

  const getStatusClass = (status: TempWorker['status']) => {
    if (status === 'running' || status === 'starting' || status === 'created') return 'running'
    if (status === 'stopped' || status === 'stopping') return 'stopped'
    if (status === 'terminated') return 'terminated'
    return 'offline'
  }

  const sortIcon = (field: SortField) => {
    if (sortField !== field) return <span className="sort-icon">⬆</span>
    return <span className="sort-icon">{sortDir === 'asc' ? '▲' : '▼'}</span>
  }

  if (loading) {
    return (
      <div className="temp-worker-panel" style={{ maxHeight }}>
        <div className="loading-state">
          <div className="loading-spinner" />
          <span>載入中...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="temp-worker-panel" style={{ maxHeight }}>
      {/* Header */}
      <div className="temp-worker-panel-header">
        <div className="temp-worker-panel-title">
          <span className="panel-title-icon">👷</span>
          <h2>臨時工管理面板</h2>
        </div>
        <div className="live-badge">
          <span className="live-dot" />
          即時更新中
        </div>
      </div>

      {/* Action Bar */}
      <div className="temp-worker-action-bar">
        <div className="temp-worker-filters">
          <div className="filter-group">
            <span className="filter-label">狀態</span>
            <select
              className="filter-select"
              value={filterStatus}
              onChange={e => { setFilterStatus(e.target.value); setPage(1) }}
            >
              <option value="">全部狀態</option>
              <option value="running">運行中</option>
              <option value="stopped">已停止</option>
              <option value="terminated">已終止</option>
              <option value="created">已創建</option>
            </select>
          </div>
          <div className="filter-group">
            <span className="filter-label">排序</span>
            <select
              className="filter-select"
              value={`${sortField}-${sortDir}`}
              onChange={e => {
                const [field, dir] = e.target.value.split('-') as [SortField, SortDir]
                setSortField(field)
                setSortDir(dir)
                setPage(1)
              }}
            >
              <option value="createdAt-desc">創建時間 (新→舊)</option>
              <option value="createdAt-asc">創建時間 (舊→新)</option>
              <option value="name-asc">名稱 (A→Z)</option>
              <option value="name-desc">名稱 (Z→A)</option>
              <option value="status-asc">狀態</option>
            </select>
          </div>
          <div className="search-wrapper">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="search-input"
              placeholder="搜尋臨時工名稱..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
            />
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          ➕ 新增臨時工
        </button>
      </div>

      {/* Stats */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-icon running">🚀</div>
          <div className="stat-info">
            <div className="stat-value" style={{ color: '#10B981' }}>{stats.running}</div>
            <div className="stat-label">運行中</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stopped">⏸️</div>
          <div className="stat-info">
            <div className="stat-value" style={{ color: '#F59E0B' }}>{stats.stopped}</div>
            <div className="stat-label">已停止</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon offline">📴</div>
          <div className="stat-info">
            <div className="stat-value" style={{ color: '#EF4444' }}>{stats.offline}</div>
            <div className="stat-label">已終止</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon total">📋</div>
          <div className="stat-info">
            <div className="stat-value" style={{ color: '#3B82F6' }}>{stats.total}</div>
            <div className="stat-label">總計</div>
          </div>
        </div>
      </div>

      {/* Table */}
      {paginated.length === 0 ? (
        <div className="temp-worker-table-container">
          <div className="empty-state">
            <div className="empty-icon">🤖</div>
            <div className="empty-title">暫無臨時工</div>
            <div className="empty-desc">點擊「新增臨時工」創建第一個臨時工</div>
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
              ➕ 新增臨時工
            </button>
          </div>
        </div>
      ) : (
        <div className="temp-worker-table-container">
          <table className="temp-worker-table">
            <thead>
              <tr>
                <th className={`sortable ${sortField === 'name' ? 'sorted' : ''}`} onClick={() => handleSort('name')}>
                  臨時工 {sortIcon('name')}
                </th>
                <th className={`sortable ${sortField === 'status' ? 'sorted' : ''}`} onClick={() => handleSort('status')}>
                  狀態 {sortIcon('status')}
                </th>
                <th className={`sortable ${sortField === 'port' ? 'sorted' : ''}`} onClick={() => handleSort('port')}>
                  端口 {sortIcon('port')}
                </th>
                <th className={`sortable ${sortField === 'createdAt' ? 'sorted' : ''}`} onClick={() => handleSort('createdAt')}>
                  創建時間 {sortIcon('createdAt')}
                </th>
                <th>元老成員</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map(worker => (
                <tr key={worker.id}>
                  <td>
                    <div className="worker-info">
                      <div className={getAvatarClass(worker.status)}>🤖</div>
                      <div className="worker-details">
                        <div className="worker-name">{worker.name}</div>
                        <div className="worker-id">#{worker.id.slice(0, 16)}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`status-badge ${getStatusClass(worker.status)}`}>
                      <span className="status-dot" />
                      {statusLabel[worker.status]}
                    </span>
                  </td>
                  <td>
                    <span className="port-badge">:{worker.port}</span>
                  </td>
                  <td>{formatDate(worker.createdAt)}</td>
                  <td>⚙️ 編譯器</td>
                  <td>
                    <div className="actions-cell">
                      {(worker.status === 'created' || worker.status === 'stopped') && (
                        <button
                          className="action-btn start"
                          title="啟動"
                          disabled={actionLoading === worker.id}
                          onClick={() => handleStart(worker.id)}
                        >
                          ▶️
                        </button>
                      )}
                      {worker.status === 'running' && (
                        <button
                          className="action-btn stop"
                          title="停止"
                          disabled={actionLoading === worker.id}
                          onClick={() => handleStop(worker.id)}
                        >
                          ⏸️
                        </button>
                      )}
                      <button
                        className="action-btn"
                        title="詳情"
                        onClick={() => openDetail(worker)}
                      >
                        🔍
                      </button>
                      {worker.status !== 'terminated' && (
                        <button
                          className="action-btn delete"
                          title="終止"
                          disabled={actionLoading === worker.id}
                          onClick={() => handleTerminate(worker.id)}
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="temp-worker-pagination">
            <div className="page-info">
              顯示 {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, filtered.length)}，共 {filtered.length} 筆
            </div>
            <div className="page-controls">
              <button
                className="page-btn"
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
              >
                ◀
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .map((p, idx, arr) => (
                  <React.Fragment key={p}>
                    {idx > 0 && arr[idx - 1] !== p - 1 && <span style={{ color: '#5C6577', padding: '0 4px' }}>...</span>}
                    <button
                      className={`page-btn ${p === page ? 'active' : ''}`}
                      onClick={() => setPage(p)}
                    >
                      {p}
                    </button>
                  </React.Fragment>
                ))}
              <button
                className="page-btn"
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                ▶
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => !submitting && setShowCreate(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">新增臨時工</div>
              <button className="modal-close" onClick={() => setShowCreate(false)} disabled={submitting}>
                ✕
              </button>
            </div>
            <div className="form-group">
              <label className="form-label">名稱 *</label>
              <input
                type="text"
                className="form-input"
                placeholder="例如：temp-worker-alpha"
                value={createName}
                onChange={e => setCreateName(e.target.value)}
                disabled={submitting}
                autoFocus
              />
              {createError && <div className="form-error">{createError}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">描述</label>
              <textarea
                className="form-textarea"
                placeholder="描述此臨時工的職責或用途..."
                value={createDesc}
                onChange={e => setCreateDesc(e.target.value)}
                disabled={submitting}
              />
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowCreate(false)} disabled={submitting}>
                取消
              </button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={submitting}>
                {submitting ? '創建中...' : '創建'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetail && selectedWorker && (
        <div className="modal-overlay" onClick={() => setShowDetail(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">臨時工詳情</div>
              <button className="modal-close" onClick={() => setShowDetail(false)}>✕</button>
            </div>
            <div className="detail-grid">
              <div className="detail-item">
                <div className="detail-label">名稱</div>
                <div className="detail-value">{selectedWorker.name}</div>
              </div>
              <div className="detail-item">
                <div className="detail-label">ID</div>
                <div className="detail-value" style={{ fontSize: '12px', fontFamily: 'monospace' }}>{selectedWorker.id}</div>
              </div>
              <div className="detail-item">
                <div className="detail-label">狀態</div>
                <div className="detail-value">
                  <span className={`status-badge ${getStatusClass(selectedWorker.status)}`}>
                    <span className="status-dot" />
                    {statusLabel[selectedWorker.status]}
                  </span>
                </div>
              </div>
              <div className="detail-item">
                <div className="detail-label">端口</div>
                <div className="detail-value">
                  <span className="port-badge">:{selectedWorker.port}</span>
                </div>
              </div>
              <div className="detail-item full-width">
                <div className="detail-label">描述</div>
                <div className="detail-value">{selectedWorker.description || '無描述'}</div>
              </div>
              <div className="detail-item">
                <div className="detail-label">創建時間</div>
                <div className="detail-value">{formatDate(selectedWorker.createdAt)}</div>
              </div>
              {selectedWorker.startedAt && (
                <div className="detail-item">
                  <div className="detail-label">啟動時間</div>
                  <div className="detail-value">{formatDate(selectedWorker.startedAt)}</div>
                </div>
              )}
              {selectedWorker.stoppedAt && (
                <div className="detail-item">
                  <div className="detail-label">停止時間</div>
                  <div className="detail-value">{formatDate(selectedWorker.stoppedAt)}</div>
                </div>
              )}
              {selectedWorker.terminatedAt && (
                <div className="detail-item">
                  <div className="detail-label">終止時間</div>
                  <div className="detail-value">{formatDate(selectedWorker.terminatedAt)}</div>
                </div>
              )}
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowDetail(false)}>關閉</button>
              {selectedWorker.status !== 'terminated' && (
                <button
                  className="btn btn-danger"
                  style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid #EF4444', color: '#EF4444' }}
                  onClick={() => {
                    handleTerminate(selectedWorker.id)
                    setShowDetail(false)
                  }}
                  disabled={actionLoading === selectedWorker.id}
                >
                  終止臨時工
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export { TempWorkerPanel }
export default TempWorkerPanel

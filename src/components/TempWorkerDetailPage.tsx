import React, { useState, useEffect, useCallback } from 'react'
import './TempWorkerDetailPage.css'
import {
  fetchTempWorkerLogs,
  getTempWorker,
  startTempWorker,
  stopTempWorker,
  terminateTempWorker,
  type TempWorker,
  type TempWorkerOpLog,
} from '../services/api/tempWorker'

const statusLabel: Record<TempWorker['status'], string> = {
  created: '已創建',
  starting: '啟動中',
  running: '運行中',
  stopping: '停止中',
  stopped: '已停止',
  terminating: '終止中',
  terminated: '已終止',
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString('zh-TW', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '剛剛'
  if (mins < 60) return `${mins} 分鐘前`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} 小時前`
  const days = Math.floor(hours / 24)
  return `${days} 天前`
}

function getStatusClass(status: TempWorker['status']): string {
  return `status-${status}`
}

function getActionClass(action: string): string {
  if (action.includes('建立') || action.includes('建立') || action.includes('created')) return 'log-action-create'
  if (action.includes('啟動') || action.includes('Start') || action.includes('start')) return 'log-action-start'
  if (action.includes('停止') || action.includes('Stop') || action.includes('stop')) return 'log-action-stop'
  if (action.includes('終止') || action.includes('Terminate') || action.includes('terminate')) return 'log-action-terminate'
  return ''
}

// Map log entry to human-readable action
function getLogActionText(log: TempWorkerOpLog): string {
  const action = log.action?.toLowerCase() || ''
  if (action.includes('create') || log.fromStatus === '' || !log.fromStatus) return '創建臨時工'
  if (action.includes('start')) return '啟動'
  if (action.includes('stop')) return '停止'
  if (action.includes('terminate')) return '終止'
  return log.action || action
}

interface Props {
  workerId: string
  onBack: () => void
  onWorkerChange?: () => void
}

const TempWorkerDetailPage: React.FC<Props> = ({ workerId, onBack, onWorkerChange }) => {
  const [worker, setWorker] = useState<TempWorker | null>(null)
  const [logs, setLogs] = useState<TempWorkerOpLog[]>([])
  const [loading, setLoading] = useState(true)
  const [logsLoading, setLogsLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadWorker = useCallback(async () => {
    try {
      const w = await getTempWorker(workerId)
      setWorker(w)
      setError(null)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [workerId])

  const loadLogs = useCallback(async () => {
    try {
      const result = await fetchTempWorkerLogs(workerId, 50)
      setLogs(result.logs)
    } catch (err) {
      console.error('Failed to load logs:', err)
    } finally {
      setLogsLoading(false)
    }
  }, [workerId])

  useEffect(() => {
    loadWorker()
    loadLogs()
    const interval = setInterval(() => {
      loadWorker()
      loadLogs()
    }, 5000)
    return () => clearInterval(interval)
  }, [loadWorker, loadLogs])

  const handleAction = async (action: 'start' | 'stop' | 'terminate') => {
    setActionLoading(action)
    try {
      if (action === 'start') await startTempWorker(workerId)
      else if (action === 'stop') await stopTempWorker(workerId)
      else if (action === 'terminate') await terminateTempWorker(workerId)
      await loadWorker()
      await loadLogs()
      onWorkerChange?.()
    } catch (err) {
      alert(`操作失敗: ${(err as Error).message}`)
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="detail-loading">
        <div className="detail-loading-spinner" />
        載入中...
      </div>
    )
  }

  if (error || !worker) {
    return (
      <div className="detail-loading" style={{ color: '#EF4444' }}>
        {error || '載入失敗'}
      </div>
    )
  }

  return (
    <div className="detail-page">
      {/* Back navigation */}
      <div className="detail-back-bar">
        <button className="back-btn" onClick={onBack}>
          ← 返回面板
        </button>
        <span style={{ fontSize: '13px', color: '#5C6577' }}>
          臨時工詳情 #{workerId.slice(0, 12)}
        </span>
      </div>

      {/* Header card */}
      <div className="detail-header">
        <div className="detail-header-icon">🤖</div>
        <div className="detail-header-info">
          <div className="detail-header-name">{worker.name}</div>
          <div className="detail-header-id">#{worker.id}</div>
        </div>
        <div className="detail-header-status">
          <span className={`status-badge ${getStatusClass(worker.status)}`}>
            <span className="status-dot" />
            {statusLabel[worker.status]}
          </span>
          <span className="port-badge">:{worker.port}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="detail-card">
        <div className="detail-card-title">操作</div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {(worker.status === 'created' || worker.status === 'stopped') && (
            <button
              className="action-btn btn-start"
              onClick={() => handleAction('start')}
              disabled={actionLoading !== null}
            >
              {actionLoading === 'start' ? '處理中...' : '▶ 啟動'}
            </button>
          )}
          {worker.status === 'running' && (
            <button
              className="action-btn btn-stop"
              onClick={() => handleAction('stop')}
              disabled={actionLoading !== null}
            >
              {actionLoading === 'stop' ? '處理中...' : '⏸ 停止'}
            </button>
          )}
          {worker.status !== 'terminated' && (
            <button
              className="action-btn btn-terminate"
              onClick={() => {
                if (confirm(`確定要終止臨時工「${worker.name}」嗎？此操作不可逆。`)) {
                  handleAction('terminate')
                }
              }}
              disabled={actionLoading !== null}
            >
              {actionLoading === 'terminate' ? '處理中...' : '⛔ 終止'}
            </button>
          )}
        </div>
      </div>

      {/* Info grid */}
      <div className="detail-grid-2col">
        <div className="detail-card">
          <div className="detail-card-title">基本信息</div>
          <div className="info-grid">
            <div className="info-item">
              <div className="info-label">名稱</div>
              <div className="info-value">{worker.name}</div>
            </div>
            <div className="info-item">
              <div className="info-label">端口</div>
              <div className="info-value">{worker.port}</div>
            </div>
            <div className="info-item full-width">
              <div className="info-label">描述</div>
              <div className="info-value">{worker.description || '無描述'}</div>
            </div>
            <div className="info-item">
              <div className="info-label">Agent</div>
              <div className="info-value">⚙️ 編譯器</div>
            </div>
          </div>
        </div>

        <div className="detail-card">
          <div className="detail-card-title">時間線</div>
          <div className="timeline">
            <div className="timeline-item">
              <div className={`timeline-dot ${worker.status === 'created' ? 'current' : 'completed'}`}>
                🕐
              </div>
              <div className="timeline-content">
                <div className="timeline-action">創建</div>
                <div className="timeline-time">{formatDate(worker.createdAt)}</div>
              </div>
            </div>
            {worker.startedAt && (
              <div className="timeline-item">
                <div className={`timeline-dot ${worker.status === 'running' || worker.status === 'stopped' ? 'completed' : worker.status === 'starting' ? 'current' : ''}`}>
                  ▶
                </div>
                <div className="timeline-content">
                  <div className="timeline-action">啟動</div>
                  <div className="timeline-time">{formatDate(worker.startedAt)}</div>
                </div>
              </div>
            )}
            {worker.stoppedAt && (
              <div className="timeline-item">
                <div className={`timeline-dot ${worker.status === 'stopped' ? 'completed' : worker.status === 'stopping' ? 'current' : ''}`}>
                  ⏸
                </div>
                <div className="timeline-content">
                  <div className="timeline-action">停止</div>
                  <div className="timeline-time">{formatDate(worker.stoppedAt)}</div>
                </div>
              </div>
            )}
            {worker.terminatedAt && (
              <div className="timeline-item">
                <div className="timeline-dot active">⛔</div>
                <div className="timeline-content">
                  <div className="timeline-action">終止</div>
                  <div className="timeline-time">{formatDate(worker.terminatedAt)}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Docker info - only for running workers */}
      {worker.status === 'running' && (
        <div className="detail-card">
          <div className="detail-card-title">容器狀態</div>
          <div className="docker-info">
            <div className="docker-row">
              <div className="docker-label">容器名</div>
              <div className="docker-value">temp-worker-{workerId.slice(0, 8)}</div>
            </div>
            <div className="docker-row">
              <div className="docker-label">映射端口</div>
              <div className="docker-value">:{worker.port}</div>
            </div>
            <div className="docker-row">
              <div className="docker-label">運行時間</div>
              <div className="docker-uptime">
                {worker.startedAt ? formatRelative(worker.startedAt) : '—'}
              </div>
            </div>
            <div className="docker-stats">
              <div className="docker-stat">
                <div className="docker-stat-label">CPU</div>
                <div className="docker-stat-value">—</div>
              </div>
              <div className="docker-stat">
                <div className="docker-stat-label">記憶體</div>
                <div className="docker-stat-value">—</div>
              </div>
              <div className="docker-stat">
                <div className="docker-stat-label">狀態</div>
                <div className="docker-stat-value" style={{ color: '#10B981' }}>運行中</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Operation logs */}
      <div className="detail-card">
        <div className="detail-card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>操作日誌</span>
          <span style={{ fontSize: '12px', color: '#5C6577', fontWeight: 400 }}>
            {logs.length} 筆記錄
          </span>
        </div>
        {logsLoading ? (
          <div className="logs-empty">載入中...</div>
        ) : logs.length === 0 ? (
          <div className="logs-empty">尚無操作記錄</div>
        ) : (
          <div className="logs-container">
            {logs.map((log, idx) => (
              <div key={idx} className="log-entry">
                <div className="log-timestamp">
                  {new Date(log.timestamp).toLocaleString('zh-TW', {
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false,
                  })}
                </div>
                <div className="log-content">
                  <div className={`log-action ${getActionClass(log.action)}`}>
                    {getLogActionText(log)}
                  </div>
                  {log.fromStatus && log.toStatus && (
                    <div className="log-transition">
                      {statusLabel[log.fromStatus as TempWorker['status']] || log.fromStatus}
                      {' → '}
                      {statusLabel[log.toStatus as TempWorker['status']] || log.toStatus}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export { TempWorkerDetailPage }
export default TempWorkerDetailPage

// Workflow Topology Component - 工作流依賴拓撲圖
// 展示 7 個 Agent 的協作狀態與依賴關係

import { useState, useEffect, useMemo } from 'react'
import { fetchAgentStatuses, type AgentStatus } from '../services/api/agentStatus'

// Agent 定義
interface Agent {
  id: string
  name: string
  emoji: string
  role: string
}

// 團隊成員配置
const AGENTS: Agent[] = [
  { id: 'task-tracking', name: '指揮台', emoji: '📋', role: 'issue 看板管理' },
  { id: 'requirements', name: '透析器', emoji: '🔍', role: '需求解析' },
  { id: 'art-design', name: '調色盤', emoji: '🎨', role: 'UI/美術設計' },
  { id: 'engineering', name: '編譯器', emoji: '⚙️', role: '功能實作' },
  { id: 'art-review', name: '鑑賞家', emoji: '🖼️', role: '視覺審查' },
  { id: 'feature-review', name: '測試台', emoji: '🧪', role: '功能測試' },
  { id: 'devops', name: '部署艦', emoji: '🚀', role: '部署維護' },
]

// 依賴關係定義 (從上游到下游)
const DEPENDENCIES: { from: string; to: string; label: string }[] = [
  { from: 'task-tracking', to: 'requirements', label: '建立需求' },
  { from: 'requirements', to: 'art-design', label: '需求澄清' },
  { from: 'requirements', to: 'engineering', label: '任務指派' },
  { from: 'art-design', to: 'engineering', label: '設計稿' },
  { from: 'art-design', to: 'art-review', label: '美術審查' },
  { from: 'engineering', to: 'feature-review', label: '程式碼' },
  { from: 'engineering', to: 'art-review', label: 'PR 審查' },
  { from: 'feature-review', to: 'devops', label: '測試通過' },
  { from: 'art-review', to: 'devops', label: '審查通過' },
  { from: 'devops', to: 'task-tracking', label: '部署完成' },
]

export function WorkflowTopology() {
  const [agents, setAgents] = useState<AgentStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'idle' | 'busy' | 'offline' | 'blocked'>('all')

  useEffect(() => {
    const loadAgents = async () => {
      try {
        const data = await fetchAgentStatuses()
        setAgents(data)
      } catch (err) {
        console.error('Failed to load agents:', err)
      } finally {
        setLoading(false)
      }
    }
    loadAgents()

    // 啟動輪詢更新
    const intervalId = setInterval(loadAgents, 30000)
    return () => clearInterval(intervalId)
  }, [])

  // 建立狀態映射
  const statusMap = useMemo(() => {
    const map = new Map<string, AgentStatus['status']>()
    agents.forEach(agent => {
      const id = agent.id.replace(/[^a-z-]/g, '').toLowerCase()
      map.set(id, agent.status)
    })
    return map
  }, [agents])

  // 計算每個 Agent 的阻塞狀態
  const blockedAgents = useMemo(() => {
    const blocked = new Set<string>()
    agents.forEach(agent => {
      const id = agent.id.replace(/[^a-z-]/g, '').toLowerCase()
      // 檢查是否有依賴的 Agent 處於工作狀態
      const incomingDeps = DEPENDENCIES.filter(d => d.to === id)
      const hasActiveDependency = incomingDeps.some(dep => {
        const fromStatus = statusMap.get(dep.from)
        return fromStatus === 'busy' || fromStatus === 'idle'
      })
      if (hasActiveDependency && agent.status === 'idle') {
        blocked.add(id)
      }
    })
    return blocked
  }, [agents, statusMap])

  // 過濾 Agent
  const filteredAgents = useMemo(() => {
    return agents.filter(agent => {
      const id = agent.id.replace(/[^a-z-]/g, '').toLowerCase()
      if (filter === 'all') return true
      if (filter === 'blocked') return blockedAgents.has(id)
      return filter === 'idle' || filter === 'busy' || filter === 'offline'
        ? agent.status === filter
        : false
    })
  }, [agents, filter, blockedAgents])

  const getStatusColor = (status: AgentStatus['status'], isBlocked: boolean) => {
    if (isBlocked) return 'var(--status-blocked)'
    switch (status) {
      case 'busy': return 'var(--status-busy)'
      case 'idle': return 'var(--status-idle)'
      case 'offline': return 'var(--status-offline)'
      default: return 'var(--status-offline)'
    }
  }

  const getStatusLabel = (status: AgentStatus['status'], isBlocked: boolean) => {
    if (isBlocked) return '阻塞'
    switch (status) {
      case 'busy': return '工作中'
      case 'idle': return '閒置'
      case 'offline': return '離線'
      default: return '未知'
    }
  }

  // 獲取 Agent 的依賴關係
  const getDependencies = (agentId: string) => {
    const id = agentId.replace(/[^a-z-]/g, '').toLowerCase()
    return DEPENDENCIES.filter(d => d.from === id || d.to === id)
  }

  if (loading) {
    return (
      <div className="topology-loading">
        <div className="loading-spinner">載入中...</div>
      </div>
    )
  }

  return (
    <div className="workflow-topology">
      {/* 過濾器 */}
      <div className="topology-filters">
        <button
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          全部 ({agents.length})
        </button>
        <button
          className={`filter-btn busy ${filter === 'busy' ? 'active' : ''}`}
          onClick={() => setFilter('busy')}
        >
          工作中 ({agents.filter(a => a.status === 'busy').length})
        </button>
        <button
          className={`filter-btn idle ${filter === 'idle' ? 'active' : ''}`}
          onClick={() => setFilter('idle')}
        >
          閒置 ({agents.filter(a => a.status === 'idle').length})
        </button>
        <button
          className={`filter-btn offline ${filter === 'offline' ? 'active' : ''}`}
          onClick={() => setFilter('offline')}
        >
          離線 ({agents.filter(a => a.status === 'offline').length})
        </button>
        <button
          className={`filter-btn blocked ${filter === 'blocked' ? 'active' : ''}`}
          onClick={() => setFilter('blocked')}
        >
          阻塞 ({blockedAgents.size})
        </button>
      </div>

      {/* 圖例 */}
      <div className="topology-legend">
        <div className="legend-item">
          <span className="legend-dot busy"></span>
          <span>工作中</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot idle"></span>
          <span>閒置</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot offline"></span>
          <span>離線</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot blocked"></span>
          <span>被阻塞</span>
        </div>
      </div>

      {/* 拓撲圖 */}
      <div className="topology-graph">
        {/* 節點 */}
        <div className="topology-nodes">
          {filteredAgents.map(agent => {
            const id = agent.id.replace(/[^a-z-]/g, '').toLowerCase()
            const isBlocked = blockedAgents.has(id)
            const deps = getDependencies(agent.id)
            
            return (
              <div
                key={agent.id}
                className={`topology-node ${agent.status} ${isBlocked ? 'blocked' : ''} ${selectedAgent === agent.id ? 'selected' : ''}`}
                onClick={() => setSelectedAgent(selectedAgent === agent.id ? null : agent.id)}
                style={{
                  '--status-color': getStatusColor(agent.status, isBlocked),
                } as React.CSSProperties}
              >
                <div className="node-emoji">{agent.emoji}</div>
                <div className="node-name">{agent.name}</div>
                <div className="node-status">
                  <span className={`status-dot ${agent.status} ${isBlocked ? 'blocked' : ''}`}></span>
                  <span>{getStatusLabel(agent.status, isBlocked)}</span>
                </div>
                <div className="node-role">{agent.role}</div>
                {agent.currentTask && agent.status === 'busy' && (
                  <div className="node-task">{agent.currentTask}</div>
                )}
                
                {/* 依賴關係指示器 */}
                {deps.length > 0 && (
                  <div className="node-deps">
                    {deps.map((dep, i) => (
                      <span key={i} className="dep-tag">
                        {dep.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* 連接線 (CSS 實現) */}
        <svg className="topology-lines" xmlns="http://www.w3.org/2000/svg">
          {DEPENDENCIES.map((dep, i) => {
            const fromAgent = agents.find(a => a.id.replace(/[^a-z-]/g, '').toLowerCase() === dep.from)
            const toAgent = agents.find(a => a.id.replace(/[^a-z-]/g, '').toLowerCase() === dep.to)
            
            if (!fromAgent || !toAgent) return null
            
            const fromId = fromAgent.id.replace(/[^a-z-]/g, '').toLowerCase()
            const toId = toAgent.id.replace(/[^a-z-]/g, '').toLowerCase()
            
            // 檢查是否需要顯示這條線
            const isAll = (filter as string) === 'all'
            const showLine = isAll || 
              (filter === 'blocked' && (blockedAgents.has(fromId) || blockedAgents.has(toId))) ||
              agents.some(a => {
                const id = a.id.replace(/[^a-z-]/g, '').toLowerCase()
                return id === fromId || id === toId
              })
            
            if (!showLine && !isAll) return null
            const fromStatus = statusMap.get(fromId) || 'offline'
            const toStatus = statusMap.get(toId) || 'offline'
            const isActive = (fromStatus === 'busy' || fromStatus === 'idle') && (toStatus === 'busy' || toStatus === 'idle')
            const isBlocked = blockedAgents.has(toId)
            
            return (
              <g key={i}>
                <line
                  x1={`${(AGENTS.findIndex(a => a.id === dep.from) + 0.5) * (100 / AGENTS.length)}%`}
                  y1="50%"
                  x2={`${(AGENTS.findIndex(a => a.id === dep.to) + 0.5) * (100 / AGENTS.length)}%`}
                  y2="50%"
                  className={`connection-line ${isActive ? 'active' : ''} ${isBlocked ? 'blocked' : ''}`}
                />
              </g>
            )
          })}
        </svg>
      </div>

      {/* 詳細資訊面板 */}
      {selectedAgent && (
        <div className="topology-detail">
          <h3>Agent 詳細資訊</h3>
          {(() => {
            const agent = agents.find(a => a.id === selectedAgent)
            if (!agent) return null
            const id = agent.id.replace(/[^a-z-]/g, '').toLowerCase()
            const isBlocked = blockedAgents.has(id)
            const incomingDeps = DEPENDENCIES.filter(d => d.to === id)
            const outgoingDeps = DEPENDENCIES.filter(d => d.from === id)
            
            return (
              <>
                <div className="detail-header">
                  <span className="detail-emoji">{agent.emoji}</span>
                  <span className="detail-name">{agent.name}</span>
                  <span className={`detail-status ${agent.status} ${isBlocked ? 'blocked' : ''}`}>
                    {getStatusLabel(agent.status, isBlocked)}
                  </span>
                </div>
                <div className="detail-role">{agent.role}</div>
                {agent.currentTask && (
                  <div className="detail-task">
                    <strong>當前任務:</strong> {agent.currentTask}
                  </div>
                )}
                
                <div className="detail-dependencies">
                  <div className="deps-section">
                    <h4>依賴於 (上游):</h4>
                    {incomingDeps.length > 0 ? (
                      <ul>
                        {incomingDeps.map((dep, i) => {
                          const fromAgent = AGENTS.find(a => a.id === dep.from)
                          const fromStatus = statusMap.get(dep.from) || 'offline'
                          return (
                            <li key={i} className={fromStatus}>
                              {fromAgent?.emoji} {fromAgent?.name} - {dep.label}
                              <span className={`status-badge ${fromStatus}`}>{fromStatus}</span>
                            </li>
                          )
                        })}
                      </ul>
                    ) : (
                      <p className="no-deps">無</p>
                    )}
                  </div>
                  
                  <div className="deps-section">
                    <h4>提供給 (下游):</h4>
                    {outgoingDeps.length > 0 ? (
                      <ul>
                        {outgoingDeps.map((dep, i) => {
                          const toAgent = AGENTS.find(a => a.id === dep.to)
                          const toStatus = statusMap.get(dep.to) || 'offline'
                          return (
                            <li key={i} className={toStatus}>
                              {toAgent?.emoji} {toAgent?.name} - {dep.label}
                              <span className={`status-badge ${toStatus}`}>{toStatus}</span>
                            </li>
                          )
                        })}
                      </ul>
                    ) : (
                      <p className="no-deps">無</p>
                    )}
                  </div>
                </div>
              </>
            )
          })()}
        </div>
      )}
    </div>
  )
}

export default WorkflowTopology

import { useState, useEffect } from 'react'
import { fetchAgentStatuses, createStatusPoller, type AgentStatus } from './services/api/agentStatus'

function App() {
  const [agents, setAgents] = useState<AgentStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // 初始載入
    fetchAgentStatuses()
      .then(data => {
        setAgents(data)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })

    // 啟動輪詢更新（每 30 秒刷新一次）
    const stopPolling = createStatusPoller((updatedAgents) => {
      setAgents(updatedAgents)
    }, 30000)

    return () => {
      stopPolling()
    }
  }, [])

  const getStatusLabel = (status: AgentStatus['status']) => {
    switch (status) {
      case 'idle': return '閒置'
      case 'busy': return '忙碌中'
      case 'offline': return '離線'
    }
  }

  if (loading) {
    return (
      <div className="dashboard loading">
        <div className="loading-spinner">載入中...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="dashboard error">
        <div className="error-message">載入失敗: {error}</div>
      </div>
    )
  }

  return (
    <div className="dashboard">
      <header>
        <h1>🤖 OpenClaw Team Dashboard</h1>
        <p className="subtitle">七 Agent 團隊即時狀態監控</p>
      </header>
      
      <main>
        <div className="agents-grid">
          {agents.map(agent => (
            <div key={agent.id} className={`agent-card ${agent.status}`}>
              <div className="agent-avatar">{agent.emoji}</div>
              <div className="agent-info">
                <div className="agent-name">{agent.name}</div>
                <div className="agent-role">{agent.role}</div>
              </div>
              <div className="agent-status">
                <span className={`status-dot ${agent.status}`}></span>
                {getStatusLabel(agent.status)}
              </div>
              {agent.currentTask && (
                <div className="current-task">
                  <span className="task-label">目前任務:</span>
                  {agent.currentTask}
                </div>
              )}
              {agent.lastActive && (
                <div className="last-active">
                  最後活動: {agent.lastActive.toLocaleTimeString()}
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

export default App

import { useState, useEffect } from 'react'
import { fetchAgentStatuses, createStatusPoller, type AgentStatus } from './services/api/agentStatus'

// 項目類型
interface Project {
  id: number
  title: string
  agentName: string
  agentEmoji: string
  status: 'in_progress' | 'completed'
  progress: number
  completedAt?: Date
}

function App() {
  const [agents, setAgents] = useState<AgentStatus[]>([])
  const [projects, setProjects] = useState<Project[]>([])
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

  // 模擬項目數據（實際應該從 API 獲取）
  useEffect(() => {
    const mockProjects: Project[] = [
      {
        id: 5,
        title: '前端頁面開發 - Dashboard 介面',
        agentName: '編譯器',
        agentEmoji: '⚙️',
        status: 'in_progress',
        progress: 65
      },
      {
        id: 6,
        title: 'Agent 狀態 API 串接',
        agentName: '編譯器',
        agentEmoji: '⚙️',
        status: 'in_progress',
        progress: 90
      },
      {
        id: 3,
        title: '專案初始化與環境建置',
        agentName: '部署艦',
        agentEmoji: '🚀',
        status: 'completed',
        progress: 100,
        completedAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
      },
      {
        id: 2,
        title: '前端技術評估與框架選擇',
        agentName: '編譯器',
        agentEmoji: '⚙️',
        status: 'completed',
        progress: 100,
        completedAt: new Date(Date.now() - 3 * 60 * 60 * 1000)
      },
      {
        id: 4,
        title: 'UI/UX 設計 - Dashboard 介面',
        agentName: '調色盤',
        agentEmoji: '🎨',
        status: 'completed',
        progress: 100,
        completedAt: new Date(Date.now() - 1 * 60 * 60 * 1000)
      }
    ]
    setProjects(mockProjects)
  }, [])

  const getStatusLabel = (status: AgentStatus['status']) => {
    switch (status) {
      case 'idle': return '閒置'
      case 'busy': return '忙碌中'
      case 'offline': return '離線'
    }
  }

  const formatTimeAgo = (date: Date) => {
    const hours = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60))
    if (hours < 1) return '剛剛'
    if (hours === 1) return '1小時前'
    return `${hours}小時前`
  }

  const handleRefresh = () => {
    setLoading(true)
    fetchAgentStatuses()
      .then(data => {
        setAgents(data)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }

  if (error) {
    return (
      <div className="dashboard error">
        <div className="error-message">載入失敗: {error}</div>
      </div>
    )
  }

  const inProgressProjects = projects.filter(p => p.status === 'in_progress')
  const completedProjects = projects.filter(p => p.status === 'completed')

  return (
    <div className="dashboard">
      {/* Header */}
      <header className="header">
        <div className="header-left">
          <div className="logo">⚡</div>
          <h1 className="header-title">OpenClaw Team Dashboard</h1>
        </div>
        <div className="header-actions">
          <button 
            className="icon-btn" 
            title="重新整理"
            onClick={handleRefresh}
            disabled={loading}
          >
            🔄
          </button>
          <button className="icon-btn" title="設定">⚙️</button>
        </div>
      </header>

      <main className="main">
        {/* Agent Status Section */}
        <section className="section">
          <h2 className="section-title">Agent 團隊狀態</h2>
          {loading && agents.length === 0 ? (
            <div className="loading-spinner">載入中...</div>
          ) : (
            <div className="agent-grid">
              {agents.map(agent => (
                <div key={agent.id} className={`agent-card ${agent.status}`}>
                  <div className="agent-emoji">{agent.emoji}</div>
                  <div className="agent-name">{agent.name}</div>
                  <div className="agent-role">{agent.role}</div>
                  <div className="agent-status">
                    <span className={`status-dot ${agent.status}`}></span>
                    <span style={{ 
                      color: agent.status === 'idle' ? 'var(--status-idle)' : 
                             agent.status === 'busy' ? 'var(--status-busy)' : 'var(--status-offline)'
                    }}>
                      {getStatusLabel(agent.status)}
                    </span>
                  </div>
                  <div className="agent-task">
                    {agent.currentTask || '等待新任務...'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* In Progress Section */}
        <section className="section">
          <h2 className="section-title">進行中項目</h2>
          {inProgressProjects.map(project => (
            <div key={project.id} className="project-card">
              <div className="project-header">
                <div className="project-title">
                  <span>🔄</span>
                  {project.title}
                </div>
                <div className="project-meta">
                  {project.agentEmoji} {project.agentName}
                </div>
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${project.progress}%` }}
                ></div>
              </div>
            </div>
          ))}
        </section>

        {/* Completed Section */}
        <section className="section">
          <h2 className="section-title">已完成項目</h2>
          {completedProjects.map(project => (
            <div key={project.id} className="project-card">
              <div className="project-header">
                <div className="project-title">
                  <span>✅</span>
                  {project.title}
                </div>
                <div className="project-meta">
                  {project.agentEmoji} {project.agentName}
                  {project.completedAt && ` · ${formatTimeAgo(project.completedAt)}`}
                </div>
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill completed" 
                  style={{ width: '100%' }}
                ></div>
              </div>
            </div>
          ))}
        </section>
      </main>
    </div>
  )
}

export default App

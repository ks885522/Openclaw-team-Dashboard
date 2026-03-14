import { useState, useEffect } from 'react'
import { fetchAgentStatuses, createStatusPoller, type AgentStatus } from './services/api/agentStatus'
import { fetchAllAgentTasks, createTaskPoller, type Task } from './services/api/githubTasks'

// 項目類型 - 基於 GitHub Issues
interface Project {
  id: number
  number: number
  title: string
  body: string
  agentName: string
  agentEmoji: string
  agentId: string
  status: 'in_progress' | 'completed'
  progress: number
  labels: string[]
  updatedAt: Date
  completedAt?: Date
}

// Agent 成員定義
const AGENT_MEMBERS = [
  { id: 'task-tracking', name: '指揮台', emoji: '📋', role: 'issue 看板管理' },
  { id: 'requirements', name: '透析器', emoji: '🔍', role: '需求解析' },
  { id: 'art-design', name: '調色盤', emoji: '🎨', role: 'UI/美術設計' },
  { id: 'engineering', name: '編譯器', emoji: '⚙️', role: '功能實作' },
  { id: 'art-review', name: '鑑賞家', emoji: '🖼️', role: '視覺審查' },
  { id: 'feature-review', name: '測試台', emoji: '🧪', role: '功能測試' },
  { id: 'devops', name: '部署艦', emoji: '🚀', role: '部署維護' },
] as const

function App() {
  const [agents, setAgents] = useState<AgentStatus[]>([])
  const [tasks, setTasks] = useState<Record<string, Task[]>>({})
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // 初始載入 Agent 狀態
    fetchAgentStatuses()
      .then(data => {
        setAgents(data)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })

    // 啟動 Agent 狀態輪詢（每 30 秒刷新一次）
    const stopStatusPolling = createStatusPoller((updatedAgents) => {
      setAgents(updatedAgents)
    }, 30000)

    // 啟動任務輪詢（每 30 秒刷新一次）
    const stopTaskPolling = createTaskPoller((updatedTasks) => {
      setTasks(updatedTasks)
    }, 30000)

    return () => {
      stopStatusPolling()
      stopTaskPolling()
    }
  }, [])

  // 將 GitHub Tasks 轉換為 Projects
  useEffect(() => {
    const newProjects: Project[] = []
    
    AGENT_MEMBERS.forEach(member => {
      const memberTasks = tasks[member.id] || []
      
      memberTasks.forEach(task => {
        // 根據標籤判斷任務狀態
        const labels = task.labels || []
        const isCompleted = task.state === 'closed'
        
        // 根據標籤計算進度
        let progress = 0
        if (isCompleted) {
          progress = 100
        } else if (labels.includes('in-progress') || labels.includes('in_progress')) {
          progress = 50
        } else if (labels.includes('review-needed')) {
          progress = 80
        } else if (labels.includes('art-approved') || labels.includes('func-approved')) {
          progress = 90
        } else {
          progress = 20
        }

        newProjects.push({
          id: task.id,
          number: task.number,
          title: task.title,
          body: task.body.substring(0, 100) + (task.body.length > 100 ? '...' : ''),
          agentName: member.name,
          agentEmoji: member.emoji,
          agentId: member.id,
          status: isCompleted ? 'completed' : 'in_progress',
          progress,
          labels,
          updatedAt: task.updatedAt,
          completedAt: task.closedAt,
        })
      })
    })

    // 按更新時間排序
    newProjects.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    
    setProjects(newProjects)
  }, [tasks])

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
    if (hours < 24) return `${hours}小時前`
    const days = Math.floor(hours / 24)
    return `${days}天前`
  }

  const handleRefresh = () => {
    setLoading(true)
    Promise.all([
      fetchAgentStatuses(),
      fetchAllAgentTasks(),
    ])
      .then(([agentData, taskData]) => {
        setAgents(agentData)
        setTasks(taskData)
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
              {agents.map(agent => {
                const agentTask = tasks[agent.id]?.[0]
                return (
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
                      {agentTask ? (
                        <a 
                          href={`https://github.com/ks885522/Openclaw-team-Dashboard/issues/${agentTask.number}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={agentTask.title}
                        >
                          #{agentTask.number} {agentTask.title}
                        </a>
                      ) : (
                        '等待新任務...'
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* In Progress Section */}
        <section className="section">
          <h2 className="section-title">進行中項目</h2>
          {inProgressProjects.length === 0 ? (
            <div className="empty-state">目前沒有進行中的項目</div>
          ) : (
            inProgressProjects.map(project => (
              <div key={project.id} className="project-card">
                <div className="project-header">
                  <div className="project-title">
                    <span>🔄</span>
                    <a 
                      href={`https://github.com/ks885522/Openclaw-team-Dashboard/issues/${project.number}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      #{project.number} {project.title}
                    </a>
                  </div>
                  <div className="project-meta">
                    {project.agentEmoji} {project.agentName}
                  </div>
                </div>
                {project.body && (
                  <div className="project-description">
                    {project.body}
                  </div>
                )}
                <div className="project-labels">
                  {project.labels.slice(0, 4).map(label => (
                    <span key={label} className="label">{label}</span>
                  ))}
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${project.progress}%` }}
                  ></div>
                </div>
                <div className="project-updated">
                  更新於 {formatTimeAgo(project.updatedAt)}
                </div>
              </div>
            ))
          )}
        </section>

        {/* Completed Section */}
        <section className="section">
          <h2 className="section-title">已完成項目</h2>
          {completedProjects.length === 0 ? (
            <div className="empty-state">暫無已完成項目</div>
          ) : (
            completedProjects.map(project => (
              <div key={project.id} className="project-card">
                <div className="project-header">
                  <div className="project-title">
                    <span>✅</span>
                    <a 
                      href={`https://github.com/ks885522/Openclaw-team-Dashboard/issues/${project.number}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      #{project.number} {project.title}
                    </a>
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
            ))
          )}
        </section>
      </main>
    </div>
  )
}

export default App

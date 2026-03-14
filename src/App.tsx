import { useState, useEffect, useCallback, useRef } from 'react'
import { fetchAgentStatuses, createStatusPoller, type AgentStatus } from './services/api/agentStatus'
import { fetchCompletedTasks, type CompletedTask } from './services/api/completedTasks'
import { useToast, ToastContainer, showToast } from './hooks/useToast'

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
  const [completedTasks, setCompletedTasks] = useState<CompletedTask[]>([])
  const [loading, setLoading] = useState(true)
  const [completedLoading, setCompletedLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('dashboard-theme')
    return (saved as 'dark' | 'light') || 'dark'
  })
  const { toasts, removeToast } = useToast()
  const loaderRef = useRef<HTMLDivElement>(null)

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
        showToast('error', '載入 Agent 狀態失敗')
      })

    // 啟動輪詢更新（每 30 秒刷新一次）
    const stopPolling = createStatusPoller((updatedAgents) => {
      // 檢測狀態變化並顯示通知
      setAgents(prevAgents => {
        const prevMap = new Map(prevAgents.map(a => [a.id, a.status]))
        updatedAgents.forEach(agent => {
          const prevStatus = prevMap.get(agent.id)
          if (prevStatus && prevStatus !== agent.status) {
            const statusMessages: Record<string, Record<string, string>> = {
              idle: { busy: '已閒置', offline: '已離線' },
              busy: { idle: '現在閒置', offline: '已離線' },
              offline: { idle: '上線了', busy: '上線了' }
            }
            const msg = statusMessages[prevStatus]?.[agent.status]
            if (msg) {
              showToast('info', `${agent.name} ${msg}`)
            }
          }
        })
        return updatedAgents
      })
    }, 30000)

    return () => {
      stopPolling()
    }
  }, [])

  // 主題切換
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('dashboard-theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark')
  }

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

  // 載入已完成任務（從 API 獲取）
  useEffect(() => {
    const loadCompletedTasks = async () => {
      setCompletedLoading(true)
      try {
        const tasks = await fetchCompletedTasks({
          sortBy: 'closed_at',
          sortOrder: sortOrder,
          perPage: 10,
          page: 1
        })
        setCompletedTasks(tasks)
        setHasMore(tasks.length >= 10)
      } catch (err) {
        console.error('Failed to load completed tasks:', err)
      } finally {
        setCompletedLoading(false)
      }
    }
    loadCompletedTasks()
  }, [sortOrder])

  // 無限滾動載入更多
  const loadMoreTasks = useCallback(async () => {
    if (completedLoading || !hasMore) return
    
    setCompletedLoading(true)
    try {
      const nextPage = currentPage + 1
      const newTasks = await fetchCompletedTasks({
        sortBy: 'closed_at',
        sortOrder: sortOrder,
        perPage: 10,
        page: nextPage
      })
      
      if (newTasks.length > 0) {
        setCompletedTasks(prev => [...prev, ...newTasks])
        setCurrentPage(nextPage)
        setHasMore(newTasks.length >= 10)
      } else {
        setHasMore(false)
      }
    } catch (err) {
      console.error('Failed to load more tasks:', err)
    } finally {
      setCompletedLoading(false)
    }
  }, [completedLoading, hasMore, currentPage, sortOrder])

  // 監聽滾動以觸發載入更多
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !completedLoading) {
          loadMoreTasks()
        }
      },
      { threshold: 0.1 }
    )

    if (loaderRef.current) {
      observer.observe(loaderRef.current)
    }

    return () => observer.disconnect()
  }, [loadMoreTasks, hasMore, completedLoading])

  // 切換排序順序
  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')
    setCurrentPage(1)
  }

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

  return (
    <div className="dashboard">
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      {/* Header */}
      <header className="header">
        <div className="header-left">
          <div className="logo">⚡</div>
          <h1 className="header-title">OpenClaw Team Dashboard</h1>
        </div>
        <div className="header-actions">
          <button 
            className="icon-btn" 
            title={theme === 'dark' ? '切換到淺色主題' : '切換到深色主題'}
            onClick={toggleTheme}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
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
          <div className="section-header">
            <h2 className="section-title">已完成項目</h2>
            <button 
              className="sort-btn" 
              onClick={toggleSortOrder}
              title={sortOrder === 'desc' ? '最新優先' : '最舊優先'}
            >
              {sortOrder === 'desc' ? '📅 最新優先' : '📅 最舊優先'}
            </button>
          </div>
          {completedTasks.length === 0 && !completedLoading ? (
            <div className="empty-state">暫無已完成項目</div>
          ) : (
            <>
              {completedTasks.map(task => (
                <div key={task.id} className="project-card">
                  <div className="project-header">
                    <div className="project-title">
                      <span>✅</span>
                      <a href={task.url} target="_blank" rel="noopener noreferrer">
                        {task.title}
                      </a>
                    </div>
                    <div className="project-meta">
                      {task.agentEmoji} {task.agentName}
                      {task.completedAt && ` · ${formatTimeAgo(task.completedAt)}`}
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
              {/* Infinite scroll loader */}
              <div ref={loaderRef} className="load-more">
                {completedLoading && <div className="loading-spinner">載入中...</div>}
                {!hasMore && completedTasks.length > 0 && (
                  <div className="end-message">已載入全部</div>
                )}
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  )
}

export default App

import { useState, useEffect, useCallback, useRef } from 'react'
import { fetchAgentStatuses, createStatusSSEUpdater, type AgentStatus } from './services/api/agentStatus'
import { fetchCompletedTasks, type CompletedTask } from './services/api/completedTasks'
import { createAutoIssue, getSuggestedAssignment, type AutoIssueParams } from './services/api/autoIssue'
import { fetchPerformanceMetrics, type PerformanceMetrics } from './services/api/performanceMetrics'
import { controlAgent, type AgentAction } from './services/api/agentControl'
import { useToast, ToastContainer, showToast } from './hooks/useToast'
import { VisualAnnotation } from './components/VisualAnnotation'
import { PerformanceDashboard } from './components/PerformanceDashboard'
import { ScoreLeaderboard } from './components/ScoreLeaderboard'
import { PromptInjectionPanel } from './components/PromptInjection'
import { ActivityTimeline } from './components/ActivityTimeline'
import { WorkflowTopology } from './components/WorkflowTopology'
import { ThinkingChainDisplay } from './components/ThinkingChainDisplay'
import AlertHistory from './components/AlertHistory'

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
  const prevCompletedTasksRef = useRef<CompletedTask[]>([])
  const isFirstLoadRef = useRef(true) // 跳過首次載入的 Toast 顯示
  const loaderRef = useRef<HTMLDivElement>(null)
  const [showVisualAnnotation, setShowVisualAnnotation] = useState(false)
  const [showPromptInjection, setShowPromptInjection] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<{
    show: boolean
    title: string
    message: string
    onConfirm: () => void
  } | null>(null)
  const [injectionTargetAgent, setInjectionTargetAgent] = useState<{id: string, name: string, emoji: string} | null>(null)
  const [costMetrics, setCostMetrics] = useState<PerformanceMetrics['cost'] | null>(null)
  const [costLoading, setCostLoading] = useState(true)
  const [costDays, setCostDays] = useState(30)
  const [activeTab, setActiveTab] = useState<'dashboard' | 'performance' | 'scores' | 'topology' | 'timeline' | 'alerts' | 'thinking'>('dashboard')

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

    // 啟動 SSE 即時狀態更新（每 5 秒檢測一次變化）
    const stopSSE = createStatusSSEUpdater(
      (updatedAgents) => {
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
      }
    )

    return () => {
      stopSSE()
    }
  }, [])

  // 載入成本監控數據
  useEffect(() => {
    const loadCostMetrics = async () => {
      setCostLoading(true)
      try {
        const data = await fetchPerformanceMetrics()
        setCostMetrics(data.cost || null)
      } catch (err) {
        console.error('Failed to load cost metrics:', err)
      } finally {
        setCostLoading(false)
      }
    }
    loadCostMetrics()
  }, [costDays])

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
          sortOrder: 'desc', // 始终按降序获取最新完成的任务
          perPage: 10,
          page: 1
        })
        
        // 检测新完成的任务并显示 Toast（跳过首次加载）
        if (!isFirstLoadRef.current) {
          const prevTaskIds = new Set(prevCompletedTasksRef.current.map(t => t.id))
          tasks.forEach(task => {
            if (!prevTaskIds.has(task.id)) {
              // 新完成的任务
              showToast('success', `✅ 任務已完成: ${task.title}`)
            }
          })
        } else {
          isFirstLoadRef.current = false
        }
        
        // 更新 ref
        prevCompletedTasksRef.current = tasks
        
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

  // 處理 Agent 控制操作
  const handleAgentControl = async (agentId: string, action: AgentAction) => {
    const actionLabels: Record<AgentAction, string> = {
      pause: '暫停',
      resume: '恢復',
      stop: '終止',
      restart: '重試',
    }
    
    const confirmMessages: Record<AgentAction, { title: string; message: string }> = {
      pause: { title: '確認暫停', message: `確定要暫停 Agent ${agentId} 嗎？` },
      resume: { title: '確認恢復', message: `確定要恢復 Agent ${agentId} 嗎？` },
      stop: { title: '確認終止', message: `確定要終止 Agent ${agentId} 嗎？此操作可能會中斷正在執行的任務。` },
      restart: { title: '確認重試', message: `確定要重試 Agent ${agentId} 嗎？` },
    }
    
    const doAction = async () => {
      try {
        const result = await controlAgent(agentId, action)
        if (result.success) {
          showToast('success', `${actionLabels[action]}指令已發送`)
          handleRefresh()
        } else {
          showToast('error', result.error || '操作失敗')
        }
      } catch (err) {
        showToast('error', '操作失敗')
      }
    }
    
    setConfirmDialog({
      show: true,
      title: confirmMessages[action].title,
      message: confirmMessages[action].message,
      onConfirm: doAction,
    })
  }

  // 打開提示注入面板
  const handleOpenPromptInjection = (agentId: string, agentName: string, agentEmoji: string) => {
    setInjectionTargetAgent({ id: agentId, name: agentName, emoji: agentEmoji })
    setShowPromptInjection(true)
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
      {/* Confirm Dialog */}
      {confirmDialog?.show && (
        <div className="modal-overlay" onClick={() => setConfirmDialog(null)}>
          <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
            <div className="confirm-title">{confirmDialog.title}</div>
            <div className="confirm-message">{confirmDialog.message}</div>
            <div className="confirm-actions">
              <button 
                className="btn btn-cancel"
                onClick={() => setConfirmDialog(null)}
              >
                取消
              </button>
              <button 
                className="btn btn-confirm"
                onClick={() => {
                  confirmDialog.onConfirm()
                  setConfirmDialog(null)
                }}
              >
                確認
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Header */}
      <header className="header">
        <div className="header-left">
          <div className="logo">⚡</div>
          <h1 className="header-title">OpenClaw Team Dashboard</h1>
          <nav className="header-nav">
            <button 
              className={`nav-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              📊 監控台
            </button>
            <button 
              className={`nav-tab ${activeTab === 'performance' ? 'active' : ''}`}
              onClick={() => setActiveTab('performance')}
            >
              📈 績效看板
            </button>
            <button 
              className={`nav-tab ${activeTab === 'scores' ? 'active' : ''}`}
              onClick={() => setActiveTab('scores')}
            >
              🏈 積分榜
            </button>
            <button 
              className={`nav-tab ${activeTab === 'topology' ? 'active' : ''}`}
              onClick={() => setActiveTab('topology')}
            >
              🔗 依賴拓撲
            </button>
            <button 
              className={`nav-tab ${activeTab === 'timeline' ? 'active' : ''}`}
              onClick={() => setActiveTab('timeline')}
            >
              📜 活動時間軸
            </button>
            <button 
              className={`nav-tab ${activeTab === 'alerts' ? 'active' : ''}`}
              onClick={() => setActiveTab('alerts')}
            >
              🔔 警報歷史
            </button>
            <button 
              className={`nav-tab ${activeTab === 'thinking' ? 'active' : ''}`}
              onClick={() => setActiveTab('thinking')}
            >
              🧠 思考鏈
            </button>
          </nav>
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
          <button 
            className="icon-btn" 
            title="截圖與標記"
            onClick={() => setShowVisualAnnotation(true)}
          >
            📸
          </button>
          <button className="icon-btn" title="設定">⚙️</button>
        </div>
      </header>

      <main className="main">
        {activeTab === 'dashboard' ? (
          <>
            {/* Agent Status Section */}
            <section className="section">
          <h2 className="section-title">Agent 團隊狀態</h2>
          {loading && agents.length === 0 ? (
            <div className="loading-spinner">載入中...</div>
          ) : (
            <div className="agent-grid">
              {agents.map(agent => {
                // 提取 agent id (去掉 emoji)
                const agentId = agent.id || agent.name.replace(/[^a-z-]/g, '').toLowerCase()
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
                    {agent.currentTask || '等待新任務...'}
                  </div>
                  <div className="agent-controls">
                    <button 
                      className="control-btn pause" 
                      title="暫停"
                      onClick={() => handleAgentControl(agentId, 'pause')}
                      disabled={agent.status === 'offline'}
                    >
                      ⏸️
                    </button>
                    <button 
                      className="control-btn stop" 
                      title="終止"
                      onClick={() => handleAgentControl(agentId, 'stop')}
                      disabled={agent.status === 'offline'}
                    >
                      ⏹️
                    </button>
                    <button 
                      className="control-btn restart" 
                      title="重試"
                      onClick={() => handleAgentControl(agentId, 'restart')}
                      disabled={agent.status === 'offline'}
                    >
                      🔄
                    </button>
                    <button 
                      className="control-btn inject" 
                      title="注入提示"
                      onClick={() => handleOpenPromptInjection(agentId, agent.name, agent.emoji)}
                      disabled={agent.status === 'offline'}
                    >
                      💉
                    </button>
                  </div>
                </div>
              )})}
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

        {/* Cost & Resource Monitoring Section */}
        <section className="section">
          <div className="section-header">
            <h2 className="section-title">💰 成本與資源監控</h2>
            <select 
              className="filter-select"
              value={costDays}
              onChange={(e) => setCostDays(Number(e.target.value))}
            >
              <option value={7}>近 7 天</option>
              <option value={30}>近 30 天</option>
              <option value={90}>近 90 天</option>
            </select>
          </div>
          
          {costLoading ? (
            <div className="loading-spinner">載入中...</div>
          ) : costMetrics ? (
            <div className="cost-grid">
              <div className="cost-card primary">
                <div className="cost-label">預估總成本 (USD)</div>
                <div className="cost-value">${costMetrics.estimatedCostUSD.toFixed(2)}</div>
              </div>
              <div className="cost-card">
                <div className="cost-label">總 Token 消耗</div>
                <div className="cost-value">{costMetrics.totalTokens.toLocaleString()}</div>
              </div>
              <div className="cost-card">
                <div className="cost-label">輸入 Token</div>
                <div className="cost-value">{costMetrics.totalInputTokens.toLocaleString()}</div>
              </div>
              <div className="cost-card">
                <div className="cost-label">輸出 Token</div>
                <div className="cost-value">{costMetrics.totalOutputTokens.toLocaleString()}</div>
              </div>
              <div className="cost-card">
                <div className="cost-label">API 呼叫次數</div>
                <div className="cost-value">{costMetrics.apiCalls}</div>
              </div>
              <div className="cost-card">
                <div className="cost-label">平均任務耗時</div>
                <div className="cost-value">
                  {costMetrics.avgTaskDurationMs > 0 
                    ? `${Math.round(costMetrics.avgTaskDurationMs / 1000)}s` 
                    : 'N/A'}
                </div>
              </div>
            </div>
          ) : (
            <div className="empty-state">暫無成本數據</div>
          )}
        </section>
        </>
        ) : activeTab === 'scores' ? (
          <ScoreLeaderboard />
        ) : activeTab === 'topology' ? (
          <WorkflowTopology />
        ) : activeTab === 'timeline' ? (
          <ActivityTimeline />
        ) : activeTab === 'alerts' ? (
          <AlertHistory maxHeight="calc(100vh - 140px)" />
        ) : activeTab === 'thinking' ? (
          <ThinkingChainDisplay maxHeight="calc(100vh - 140px)" />
        ) : (
          <PerformanceDashboard />
        )}
      </main>
      
      {/* Visual Annotation Tool */}
      <VisualAnnotation 
        isOpen={showVisualAnnotation}
        onClose={() => setShowVisualAnnotation(false)}
        onSubmit={async (imageDataUrl, description) => {
          console.log('Screenshot submitted:', { imageDataUrl, description })
          
          // 根據描述自動判斷類型並獲取建議的標籤和指派人
          const issueType = description.toLowerCase().includes('ui') || 
                           description.toLowerCase().includes('design') ? 'ui' : 'feature'
          const suggestion = getSuggestedAssignment(issueType)
          
          // 自動建立 GitHub Issue
          const params: AutoIssueParams = {
            title: `[Issue] ${description.substring(0, 50)}${description.length > 50 ? '...' : ''}`,
            description: description,
            imageDataUrl,
            labels: suggestion.labels,
            assignee: suggestion.assignee,
          }
          
          try {
            const result = await createAutoIssue(params)
            if (result.success) {
              showToast('success', `已建立 Issue #${result.issueNumber}`)
            } else {
              showToast('error', `建立失敗: ${result.error}`)
            }
          } catch (err) {
            showToast('error', '建立 Issue 失敗')
            console.error(err)
          }
          
          setShowVisualAnnotation(false)
        }}
      />
      
      {/* Prompt Injection Panel */}
      {showPromptInjection && injectionTargetAgent && (
        <div className="modal-overlay" onClick={() => setShowPromptInjection(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <PromptInjectionPanel
              agentId={injectionTargetAgent.id}
              agentName={injectionTargetAgent.name}
              agentEmoji={injectionTargetAgent.emoji}
              onClose={() => setShowPromptInjection(false)}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default App

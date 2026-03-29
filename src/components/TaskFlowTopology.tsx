// TaskFlowTopology Component - 基於 {agent}-needed 標籤的任務流轉拓撲圖
// 根據 GitHub Issues 的 {agent}-needed 標籤自動繪製任務流轉與阻塞圖

import { useState, useEffect, useMemo } from 'react'
import { fetchTaskFlowData, type IssueNode, type TaskFlowData } from '../services/api/taskFlow'
import './TaskFlowTopology.css'

// Agent 定義
const AGENTS = [
  { id: 'engineering', name: '編譯器', emoji: '⚙️', color: '#f59e0b' },
  { id: 'requirements', name: '透析器', emoji: '🔍', color: '#3b82f6' },
  { id: 'art-design', name: '調色盤', emoji: '🎨', color: '#ec4899' },
  { id: 'art-review', name: '鑑賞家', emoji: '🖼️', color: '#8b5cf6' },
  { id: 'feature-review', name: '測試台', emoji: '🧪', color: '#10b981' },
  { id: 'devops', name: '部署艦', emoji: '🚀', color: '#ef4444' },
]

interface AgentDef {
  id: string
  name: string
  emoji: string
  color: string
}

export function TaskFlowTopology() {
  const [flowData, setFlowData] = useState<TaskFlowData>({ issues: [], agentNodes: [] })
  const [loading, setLoading] = useState(true)
  const [selectedIssue, setSelectedIssue] = useState<IssueNode | null>(null)
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await fetchTaskFlowData()
        setFlowData(data)
      } catch (err) {
        console.error('Failed to load task flow data:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()

    // 啟動輪詢更新（每 60 秒刷新一次）
    const intervalId = setInterval(loadData, 60000)
    return () => clearInterval(intervalId)
  }, [])

  // 過濾：只顯示有 agent-needed 標籤的 issue
  const filteredIssues = useMemo(() => {
    return flowData.issues.filter(issue => issue.agentNeeded.length > 0)
  }, [flowData.issues])

  // 按 agent 分組 issue
  const issuesByAgent = useMemo(() => {
    const map = new Map<string, IssueNode[]>()
    AGENTS.forEach(agent => map.set(agent.id, []))
    
    filteredIssues.forEach(issue => {
      issue.agentNeeded.forEach(agentId => {
        const list = map.get(agentId)
        if (list) list.push(issue)
      })
    })
    
    return map
  }, [filteredIssues])

  // 獲取某個 issue 等待的所有 agents
  const getIssueAgents = (issue: IssueNode): AgentDef[] => {
    return AGENTS.filter(a => issue.agentNeeded.includes(a.id))
  }

  if (loading) {
    return (
      <div className="task-flow-topology">
        <div className="topology-loading">
          <div className="loading-spinner">載入任務流轉資料中...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="task-flow-topology">
      {/* Header */}
      <div className="task-flow-header">
        <h2>🔗 任務流轉拓撲圖</h2>
        <p className="task-flow-desc">
          根據 Issue 的 <code>{'{agent}-needed'}</code> 標籤自動繪製任務流轉與阻塞圖
        </p>
        <div className="task-flow-stats">
          <span>📋 待處理 Issue: <strong>{filteredIssues.length}</strong></span>
          <span>⏳ 等待中: <strong>{filteredIssues.filter(i => i.agentNeeded.length > 0).length}</strong></span>
        </div>
      </div>

      {/* Agent Cards with Issues */}
      <div className="agent-issue-flow">
        {AGENTS.map(agent => {
          const issues = issuesByAgent.get(agent.id) || []
          const isSelected = selectedAgent === agent.id
          
          return (
            <div 
              key={agent.id}
              className={`agent-flow-card ${isSelected ? 'selected' : ''}`}
              onClick={() => setSelectedAgent(isSelected ? null : agent.id)}
              style={{ '--agent-color': agent.color } as React.CSSProperties}
            >
              <div className="agent-flow-header">
                <span className="agent-flow-emoji">{agent.emoji}</span>
                <span className="agent-flow-name">{agent.name}</span>
                <span className="agent-flow-count" style={{ backgroundColor: agent.color }}>
                  {issues.length}
                </span>
              </div>
              
              <div className="agent-flow-issues">
                {issues.length === 0 ? (
                  <div className="no-issues">✅ 無待處理</div>
                ) : (
                  issues.slice(0, 5).map(issue => (
                    <div 
                      key={issue.id}
                      className={`issue-node ${selectedIssue?.id === issue.id ? 'selected' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedIssue(selectedIssue?.id === issue.id ? null : issue)
                      }}
                    >
                      <span className="issue-number">#{issue.id}</span>
                      <span className="issue-title">{issue.title.substring(0, 30)}{issue.title.length > 30 ? '...' : ''}</span>
                    </div>
                  ))
                )}
                {issues.length > 5 && (
                  <div className="more-issues">+{issues.length - 5} 更多</div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Issue Detail Panel */}
      {selectedIssue && (
        <div className="issue-detail-panel">
          <div className="detail-panel-header">
            <h3>📋 Issue 詳情</h3>
            <button 
              className="close-btn"
              onClick={() => setSelectedIssue(null)}
            >
              ✕
            </button>
          </div>
          
          <div className="detail-content">
            <div className="detail-title">
              <a 
                href={selectedIssue.url} 
                target="_blank" 
                rel="noopener noreferrer"
              >
                #{selectedIssue.id} {selectedIssue.title}
              </a>
            </div>
            
            <div className="detail-section">
              <h4>等待中的 Agent:</h4>
              <div className="detail-agents">
                {getIssueAgents(selectedIssue).map(agent => (
                  <span 
                    key={agent.id}
                    className="agent-badge"
                    style={{ backgroundColor: agent.color }}
                  >
                    {agent.emoji} {agent.name}
                  </span>
                ))}
              </div>
            </div>
            
            <div className="detail-section">
              <h4>所有標籤:</h4>
              <div className="detail-labels">
                {selectedIssue.labels
                  .filter(l => !l.endsWith('-needed'))
                  .map(label => (
                    <span key={label} className="label-badge">{label}</span>
                  ))
                }
              </div>
            </div>
            
            <div className="detail-section">
              <h4>創建時間:</h4>
              <p>{new Date(selectedIssue.createdAt).toLocaleString('zh-TW')}</p>
            </div>
            
            <div className="detail-actions">
              <a 
                href={selectedIssue.url}
                target="_blank"
                rel="noopener noreferrer"
                className="action-btn primary"
              >
                在 GitHub 查看
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Full Issue List */}
      {filteredIssues.length > 0 && (
        <div className="issue-list-section">
          <h3>📋 所有等待中的 Issue</h3>
          <div className="issue-list">
            {filteredIssues.map(issue => (
              <div 
                key={issue.id}
                className={`issue-list-item ${selectedIssue?.id === issue.id ? 'selected' : ''}`}
                onClick={() => setSelectedIssue(selectedIssue?.id === issue.id ? null : issue)}
              >
                <div className="issue-list-main">
                  <span className="issue-list-number">#{issue.id}</span>
                  <span className="issue-list-title">{issue.title}</span>
                </div>
                <div className="issue-list-agents">
                  {getIssueAgents(issue).map(agent => (
                    <span 
                      key={agent.id}
                      className="agent-badge small"
                      style={{ backgroundColor: agent.color }}
                    >
                      {agent.emoji}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {filteredIssues.length === 0 && !loading && (
        <div className="empty-state">
          <p>目前沒有等待中的 Issue</p>
        </div>
      )}
    </div>
  )
}

export default TaskFlowTopology

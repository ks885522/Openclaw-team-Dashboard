import { useState, useEffect } from 'react'
import { type AgentActivityLog, type AgentId, type AgentAction } from '../types/agent-log'

// Agent information mapping
const AGENT_INFO: Record<string, { name: string; emoji: string; role: string }> = {
  'task-tracking': { name: '指揮台', emoji: '📋', role: 'Issue 看板管理' },
  'requirements': { name: '透析器', emoji: '🔍', role: '需求分析' },
  'art-design': { name: '調色盤', emoji: '🎨', role: 'UI/美術設計' },
  'engineering': { name: '編譯器', emoji: '⚙️', role: '功能實作' },
  'art-review': { name: '鑑賞家', emoji: '🖼️', role: '視覺審查' },
  'feature-review': { name: '測試台', emoji: '🧪', role: '功能測試' },
  'devops': { name: '部署艦', emoji: '🚀', role: '部署維運' },
}

// Action type to display text and icon mapping
const ACTION_CONFIG: Record<AgentAction, { label: string; icon: string; color: string }> = {
  'session_start': { label: '上線', icon: '🟢', color: 'var(--status-idle)' },
  'session_end': { label: '下線', icon: '🔴', color: 'var(--status-offline)' },
  'task_assigned': { label: '接任務', icon: '📥', color: 'var(--color-primary)' },
  'task_completed': { label: '完成', icon: '✅', color: 'var(--status-idle)' },
  'task_failed': { label: '失敗', icon: '❌', color: 'var(--status-busy)' },
  'message_sent': { label: '發訊息', icon: '💬', color: 'var(--color-primary)' },
  'tool_called': { label: '工具', icon: '🔧', color: 'var(--color-primary)' },
  'error_occurred': { label: '錯誤', icon: '⚠️', color: 'var(--status-busy)' },
  'heartbeat': { label: '心跳', icon: '💓', color: 'var(--color-text-dim)' },
}

// Format timestamp to full datetime
function formatDateTime(timestamp: string): string {
  const date = new Date(timestamp)
  return date.toLocaleString('zh-TW', { 
    month: 'short', 
    day: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit' 
  })
}

// Mock activity data (in real implementation, this would come from an API)
function generateMockActivities(): AgentActivityLog[] {
  const now = Date.now()
  const agents = Object.keys(AGENT_INFO)
  const actions: AgentAction[] = ['task_assigned', 'task_completed', 'message_sent', 'tool_called', 'session_start', 'session_end']
  const outcomes: Array<'success' | 'failure' | 'pending'> = ['success', 'success', 'success', 'pending']
  
  const activities: AgentActivityLog[] = []
  
  // Generate activities for the past 24 hours
  for (let i = 0; i < 50; i++) {
    const agentId = agents[Math.floor(Math.random() * agents.length)]
    const action = actions[Math.floor(Math.random() * actions.length)]
    const outcome = action === 'task_failed' ? 'failure' : outcomes[Math.floor(Math.random() * outcomes.length)]
    const timestamp = new Date(now - Math.random() * 24 * 60 * 60 * 1000).toISOString()
    
    activities.push({
      agent_id: agentId as AgentId,
      action,
      outcome,
      timestamp,
      task_id: action.includes('task') ? `#${Math.floor(Math.random() * 150) + 1}` : undefined,
      session_id: `session-${Math.random().toString(36).substr(2, 9)}`,
      metadata: {
        description: getActionDescription(action, agentId, outcome)
      }
    })
  }
  
  return activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}

function getActionDescription(action: AgentAction, agentId: string, outcome: string): string {
  const agent = AGENT_INFO[agentId]
  const agentName = agent?.name || agentId
  
  switch (action) {
    case 'session_start':
      return `${agentName} 開始工作`
    case 'session_end':
      return `${agentName} 結束工作`
    case 'task_assigned':
      return `${agentName} 收到新任務`
    case 'task_completed':
      return outcome === 'success' ? `${agentName} 完成任務` : `${agentName} 任務失敗`
    case 'message_sent':
      return `${agentName} 發送訊息`
    case 'tool_called':
      return `${agentName} 使用工具`
    case 'error_occurred':
      return `${agentName} 發生錯誤`
    case 'heartbeat':
      return `${agentName} 心跳檢查`
    default:
      return `${agentName} 执行了 ${action}`
  }
}

interface ActivityTimelineProps {
  maxItems?: number
  showAgentFilter?: boolean
}

export function ActivityTimeline({ maxItems = 20, showAgentFilter = true }: ActivityTimelineProps) {
  const [activities, setActivities] = useState<AgentActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)
  
  useEffect(() => {
    // Simulate API call - in real implementation, this would fetch from the backend
    setTimeout(() => {
      const mockActivities = generateMockActivities()
      setActivities(mockActivities)
      setLoading(false)
    }, 500)
  }, [])
  
  // Filter activities by selected agent
  const filteredActivities = selectedAgent 
    ? activities.filter(a => a.agent_id === selectedAgent)
    : activities
  
  const displayActivities = filteredActivities.slice(0, maxItems)
  
  // Group activities by date
  const groupedActivities = displayActivities.reduce((groups, activity) => {
    const date = new Date(activity.timestamp)
    const dateKey = date.toLocaleDateString('zh-TW', { month: 'long', day: 'numeric' })
    if (!groups[dateKey]) {
      groups[dateKey] = []
    }
    groups[dateKey].push(activity)
    return groups
  }, {} as Record<string, AgentActivityLog[]>)
  
  if (loading) {
    return (
      <div className="activity-timeline loading">
        <div className="loading-spinner">載入活動記錄...</div>
      </div>
    )
  }
  
  return (
    <div className="activity-timeline">
      {/* Agent Filter */}
      {showAgentFilter && (
        <div className="timeline-filter">
          <select 
            className="filter-select"
            value={selectedAgent || ''}
            onChange={(e) => setSelectedAgent(e.target.value || null)}
          >
            <option value="">全部 Agent</option>
            {Object.entries(AGENT_INFO).map(([id, info]) => (
              <option key={id} value={id}>
                {info.emoji} {info.name}
              </option>
            ))}
          </select>
        </div>
      )}
      
      {/* Timeline */}
      <div className="timeline">
        {Object.keys(groupedActivities).length === 0 ? (
          <div className="empty-state">暫無活動記錄</div>
        ) : (
          Object.entries(groupedActivities).map(([date, items]) => (
            <div key={date} className="timeline-group">
              <div className="timeline-date">{date}</div>
              <div className="timeline-items">
                {items.map((activity, index) => {
                  const agent = AGENT_INFO[activity.agent_id]
                  const actionConfig = ACTION_CONFIG[activity.action] || { 
                    label: activity.action, 
                    icon: '📌', 
                    color: 'var(--color-text-dim)' 
                  }
                  
                  return (
                    <div 
                      key={`${activity.timestamp}-${index}`} 
                      className={`timeline-item ${activity.outcome}`}
                    >
                      <div className="timeline-connector">
                        <div 
                          className="timeline-dot" 
                          style={{ backgroundColor: actionConfig.color }}
                        >
                          {actionConfig.icon}
                        </div>
                        {index < items.length - 1 && <div className="timeline-line"></div>}
                      </div>
                      <div className="timeline-content">
                        <div className="timeline-header">
                          <span className="timeline-agent">
                            {agent?.emoji || '🤖'} {agent?.name || activity.agent_id}
                          </span>
                          <span className="timeline-action" style={{ color: actionConfig.color }}>
                            {actionConfig.icon} {actionConfig.label}
                          </span>
                        </div>
                        <div className="timeline-description">
                          {activity.metadata?.description as string || ''}
                        </div>
                        <div className="timeline-time">
                          {formatDateTime(activity.timestamp)}
                        </div>
                        {activity.task_id && (
                          <div className="timeline-task">
                            📋 {activity.task_id}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>
      
      {/* Load more indicator */}
      {filteredActivities.length > maxItems && (
        <div className="timeline-more">
          <button className="load-more-btn">
            載入更多 ({filteredActivities.length - maxItems} 筆)
          </button>
        </div>
      )}
    </div>
  )
}

// Standalone component for embedding in other pages
export function ActivityTimelinePanel() {
  return (
    <div className="activity-timeline-panel">
      <ActivityTimeline maxItems={15} showAgentFilter={true} />
    </div>
  )
}

export default ActivityTimeline

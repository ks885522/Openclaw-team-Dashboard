// OpenClaw Agent Status API Service
// 串接 OpenClaw API 獲取 7 個 Agent 的即時狀態

export interface AgentStatus {
  id: string
  name: string
  emoji: string
  role: string
  status: 'idle' | 'busy' | 'offline'
  currentTask?: string
  lastActive?: Date
}

// 7 個團隊成員的定義
const AGENT_MEMBERS = [
  { id: 'task-tracking', name: '指揮台', emoji: '📋', role: 'issue 看板管理' },
  { id: 'requirements', name: '透析器', emoji: '🔍', role: '需求解析' },
  { id: 'art-design', name: '調色盤', emoji: '🎨', role: 'UI/美術設計' },
  { id: 'engineering', name: '編譯器', emoji: '⚙️', role: '功能實作' },
  { id: 'art-review', name: '鑑賞家', emoji: '🖼️', role: '視覺審查' },
  { id: 'feature-review', name: '測試台', emoji: '🧪', role: '功能測試' },
  { id: 'devops', name: '部署艦', emoji: '🚀', role: '部署維護' },
] as const

// 從 sessions_list API 回應映射狀態
function mapSessionToStatus(session: any): AgentStatus['status'] {
  if (!session || session.activeMinutes === undefined) {
    return 'offline'
  }
  // 有最近活動的 session 視為 idle 或 busy
  // 這是簡單的判斷邏輯，實際應根據 session 內容更精確判斷
  return 'idle'
}

// 獲取所有 Agent 的狀態
export async function fetchAgentStatuses(): Promise<AgentStatus[]> {
  try {
    // 調用 OpenClaw sessions_list API
    const response = await fetch('/api/sessions?activeMinutes=60')
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }
    
    const sessions = await response.json()
    
    // 將 sessions 映射到 Agent 狀態
    return AGENT_MEMBERS.map(member => {
      const session = sessions.find((s: any) => s.label === member.id || s.agentId === member.id)
      
      return {
        id: member.id,
        name: `${member.emoji} ${member.name}`,
        emoji: member.emoji,
        role: member.role,
        status: session ? mapSessionToStatus(session) : 'offline',
        currentTask: session?.currentTask,
        lastActive: session?.lastActive ? new Date(session.lastActive) : undefined,
      }
    })
  } catch (error) {
    console.error('Failed to fetch agent statuses:', error)
    
    // API 請求失敗時返回離線狀態
    return AGENT_MEMBERS.map(member => ({
      id: member.id,
      name: `${member.emoji} ${member.name}`,
      emoji: member.emoji,
      role: member.role,
      status: 'offline' as const,
    }))
  }
}

// 輪詢獲取狀態（用於即時更新）
export function createStatusPoller(
  onUpdate: (agents: AgentStatus[]) => void,
  intervalMs: number = 30000
) {
  let polling = true
  
  const poll = async () => {
    if (!polling) return
    
    const agents = await fetchAgentStatuses()
    onUpdate(agents)
    
    if (polling) {
      setTimeout(poll, intervalMs)
    }
  }
  
  // 立即開始第一次輪詢
  poll()
  
  // 返回停止函數
  return () => {
    polling = false
  }
}

// SSE 即時狀態更新 - 使用 Server-Sent Events 接收即時更新
export function createStatusSSEUpdater(
  onUpdate: (agents: AgentStatus[]) => void,
  onError?: (error: Event) => void
) {
  let eventSource: EventSource | null = null
  let reconnectTimer: number | null = null
  
  // 建立 SSE 連接
  const connect = () => {
    // 從當前主機獲取 API URL
    const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:'
    const host = window.location.host || 'localhost:3001'
    const sseUrl = `${protocol}//${host}/api/agent-status/stream`
    
    eventSource = new EventSource(sseUrl)
    
    // 連接建立
    eventSource.onopen = () => {
      console.log('[Agent Status SSE] Connected')
      if (reconnectTimer) {
        clearTimeout(reconnectTimer)
        reconnectTimer = null
      }
    }
    
    // 接收訊息
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        
        if (data.type === 'status_update' && data.agents) {
          // 將 API 回應映射為 AgentStatus 格式
          const mappedAgents: AgentStatus[] = AGENT_MEMBERS.map(member => {
            const apiAgent = data.agents.find((a: any) => 
              a.id === member.id || a.id === member.name.replace(/[^a-z-]/g, '').toLowerCase()
            )
            
            return {
              id: member.id,
              name: `${member.emoji} ${member.name}`,
              emoji: member.emoji,
              role: member.role,
              status: apiAgent?.status || 'offline',
              currentTask: apiAgent?.currentTask,
              lastActive: apiAgent?.lastActive ? new Date(apiAgent.lastActive) : undefined,
            }
          })
          
          onUpdate(mappedAgents)
        } else if (data.type === 'connected') {
          console.log('[Agent Status SSE]', data.message)
        }
      } catch (e) {
        console.error('[Agent Status SSE] Parse error:', e)
      }
    }
    
    // 錯誤處理
    eventSource.onerror = (error) => {
      console.error('[Agent Status SSE] Error:', error)
      eventSource?.close()
      eventSource = null
      
      // 通知錯誤回調
      if (onError) {
        onError(error)
      }
      
      // 5 秒後嘗試重新連接
      if (!reconnectTimer) {
        reconnectTimer = window.setTimeout(() => {
          console.log('[Agent Status SSE] Reconnecting...')
          connect()
        }, 5000)
      }
    }
  }
  
  // 開始連接
  connect()
  
  // 返回停止函數
  return () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    if (eventSource) {
      eventSource.close()
      eventSource = null
    }
  }
}

export default {
  fetchAgentStatuses,
  createStatusPoller,
  createStatusSSEUpdater,
}

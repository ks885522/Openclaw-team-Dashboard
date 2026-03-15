// Agent Control API Service
// 控制 Agent 的暫停、終止、重試等操作

export type AgentAction = 'pause' | 'resume' | 'stop' | 'restart'

export interface AgentControlResult {
  success: boolean
  message?: string
  error?: string
}

// 發送 Agent 控制指令
export async function controlAgent(
  agentId: string,
  action: AgentAction
): Promise<AgentControlResult> {
  try {
    const response = await fetch(`/api/agents/${agentId}/control`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `API error: ${response.status}`)
    }

    const data = await response.json()
    return {
      success: true,
      message: data.message || `Agent 已${getActionLabel(action)}`,
    }
  } catch (error) {
    console.error(`Failed to ${action} agent:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '操作失敗',
    }
  }
}

// 獲取操作的中文標籤
function getActionLabel(action: AgentAction): string {
  const labels: Record<AgentAction, string> = {
    pause: '暫停',
    resume: '恢復',
    stop: '終止',
    restart: '重試',
  }
  return labels[action]
}

export default {
  controlAgent,
}

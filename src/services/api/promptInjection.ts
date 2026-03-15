// Prompt Injection API - 允許人類在 Agent 執行中途注入新提示

export interface PromptInjectionParams {
  agentId: string
  prompt: string
  priority?: 'low' | 'normal' | 'high'
}

export interface PromptInjectionResponse {
  success: boolean
  message: string
  injectionId?: string
}

/**
 * 發送提示注入請求到指定的 Agent
 */
export async function injectPrompt(
  agentId: string,
  prompt: string,
  priority: 'low' | 'normal' | 'high' = 'normal'
): Promise<PromptInjectionResponse> {
  try {
    const response = await fetch('/api/agent/prompt-inject', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        agent_id: agentId,
        prompt,
        priority,
        timestamp: new Date().toISOString(),
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.message || `HTTP ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Prompt injection failed:', error)
    throw error
  }
}

/**
 * 獲取某個 Agent 的當前對話上下文
 */
export async function getAgentContext(agentId: string): Promise<{
  currentPrompt: string
  recentInjections: Array<{
    id: string
    prompt: string
    timestamp: string
    status: 'pending' | 'accepted' | 'rejected'
  }>
}> {
  try {
    const response = await fetch(`/api/agent/${agentId}/context`)
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Failed to get agent context:', error)
    // 返回mock數據以便離線開發
    return {
      currentPrompt: 'Working on current task...',
      recentInjections: [],
    }
  }
}

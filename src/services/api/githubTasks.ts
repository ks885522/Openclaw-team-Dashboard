// GitHub API Service - 獲取 Agent 相關的 Issues
// 用於顯示每個 Agent 正在處理的任務

export interface Task {
  id: number
  number: number
  title: string
  body: string
  assignee?: string
  assignees: string[]
  labels: string[]
  state: 'open' | 'closed'
  createdAt: Date
  updatedAt: Date
  closedAt?: Date
}

// Agent GitHub 帳號映射
const AGENT_GITHUB_ACCOUNTS: Record<string, string> = {
  'task-tracking': 'ks885522',
  'requirements': 'ks885522',
  'art-design': 'ks885522',
  'engineering': 'ks885522',
  'art-review': 'ks885522',
  'feature-review': 'ks885522',
  'devops': 'ks885522',
}

const REPO_OWNER = 'ks885522'
const REPO_NAME = 'Openclaw-team-Dashboard'

// 從 GitHub API 獲取某個 Agent 的 open issues
export async function fetchAgentTasks(agentId: string): Promise<Task[]> {
  const githubAccount = AGENT_GITHUB_ACCOUNTS[agentId]
  if (!githubAccount) {
    console.warn(`Unknown agent: ${agentId}`)
    return []
  }

  try {
    // 搜尋該帳號被 assigned 的 open issues
    const query = encodeURIComponent(
      `repo:${REPO_OWNER}/${REPO_NAME} assignee:${githubAccount} is:open`
    )
    
    const response = await fetch(
      `https://api.github.com/search/issues?q=${query}&sort=updated&order=desc&per_page=10`,
      {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
        },
      }
    )

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`)
    }

    const data = await response.json()
    
    return (data.items || []).map((item: any) => ({
      id: item.id,
      number: item.number,
      title: item.title,
      body: item.body || '',
      assignee: item.assignee?.login,
      assignees: item.assignees?.map((a: any) => a.login) || [],
      labels: item.labels?.map((l: any) => l.name) || [],
      state: item.state,
      createdAt: new Date(item.created_at),
      updatedAt: new Date(item.updated_at),
      closedAt: item.closed_at ? new Date(item.closed_at) : undefined,
    }))
  } catch (error) {
    console.error(`Failed to fetch tasks for agent ${agentId}:`, error)
    return []
  }
}

// 獲取所有 Agent 的進行中任務
export async function fetchAllAgentTasks(): Promise<Record<string, Task[]>> {
  const agentIds = Object.keys(AGENT_GITHUB_ACCOUNTS)
  const results: Record<string, Task[]> = {}
  
  // 並行獲取所有 Agent 的任務
  await Promise.all(
    agentIds.map(async (agentId) => {
      results[agentId] = await fetchAgentTasks(agentId)
    })
  )
  
  return results
}

// 輪詢獲取任務狀態
export function createTaskPoller(
  onUpdate: (tasks: Record<string, Task[]>) => void,
  intervalMs: number = 30000
) {
  let polling = true
  
  const poll = async () => {
    if (!polling) return
    
    const tasks = await fetchAllAgentTasks()
    onUpdate(tasks)
    
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

export default {
  fetchAgentTasks,
  fetchAllAgentTasks,
  createTaskPoller,
}

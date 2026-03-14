// Completed Tasks API Service
// 從 GitHub Issues API 獲取已完成任務的歷史記錄

export interface CompletedTask {
  id: number
  title: string
  agentName: string
  agentEmoji: string
  completedAt: Date
  url: string
}

export interface FetchCompletedTasksOptions {
  sortBy?: 'created' | 'updated' | 'comments' | 'closed_at'
  sortOrder?: 'asc' | 'desc'
  perPage?: number
  page?: number
}

// 從 issue 標籤解析 Agent 名稱
function parseAgentFromIssue(issue: any): { name: string; emoji: string } {
  // 檢查標籤中的 Agent 識別
  const agentLabels = issue.labels
    ?.map((l: any) => l.name)
    ?.filter((name: string) => 
      ['指揮台', '透析器', '調色盤', '編譯器', '鑑賞家', '測試台', '部署艦'].includes(name)
    )

  const agentMap: Record<string, { name: string; emoji: string }> = {
    '指揮台': { name: '指揮台', emoji: '📋' },
    '透析器': { name: '透析器', emoji: '🔍' },
    '調色盤': { name: '調色盤', emoji: '🎨' },
    '編譯器': { name: '編譯器', emoji: '⚙️' },
    '鑑賞家': { name: '鑑賞家', emoji: '🖼️' },
    '測試台': { name: '測試台', emoji: '🧪' },
    '部署艦': { name: '部署艦', emoji: '🚀' },
  }

  if (agentLabels && agentLabels.length > 0) {
    return agentMap[agentLabels[0]] || { name: '未知', emoji: '❓' }
  }

  // 從 issue 內容或標題推斷 Agent（如果標題包含 Agent 名稱）
  for (const [key, value] of Object.entries(agentMap)) {
    if (issue.title.includes(key)) {
      return value
    }
  }

  return { name: '未知', emoji: '❓' }
}

// 從 GitHub API 獲取已完成任務
export async function fetchCompletedTasks(
  options: FetchCompletedTasksOptions = {}
): Promise<CompletedTask[]> {
  const { sortBy = 'closed_at', sortOrder = 'desc', perPage = 20, page = 1 } = options

  try {
    // 調用 GitHub API 獲取已關閉的 issues
    const owner = 'ks885522'
    const repo = 'Openclaw-team-Dashboard'
    const response = await fetch(
      `/api/github/repos/${owner}/${repo}/issues?state=closed&sort=${sortBy}&direction=${sortOrder}&per_page=${perPage}&page=${page}`
    )

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`)
    }

    const issues = await response.json()

    // 過濾掉 Pull Requests，只保留 Issues
    const tasks = issues
      .filter((issue: any) => !issue.pull_request)
      .map((issue: any) => {
        const { name, emoji } = parseAgentFromIssue(issue)
        
        return {
          id: issue.number,
          title: issue.title,
          agentName: name,
          agentEmoji: emoji,
          completedAt: new Date(issue.closed_at),
          url: issue.html_url,
        }
      })

    return tasks
  } catch (error) {
    console.error('Failed to fetch completed tasks:', error)
    return []
  }
}

// 滾動載入更多已完成任務
export async function fetchMoreCompletedTasks(
  page: number,
  perPage: number = 20
): Promise<CompletedTask[]> {
  return fetchCompletedTasks({ page, perPage })
}

export default {
  fetchCompletedTasks,
  fetchMoreCompletedTasks,
}

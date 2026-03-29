// GitHub Issues with {agent}-needed labels API Service
// Fetches open issues and their agent-needed labels for task flow visualization

export interface IssueNode {
  id: number
  title: string
  labels: string[]
  agentNeeded: string[]  // e.g. ['engineering', 'requirements']
  state: 'open' | 'closed'
  createdAt: string
  url: string
}

export interface TaskFlowData {
  issues: IssueNode[]
  agentNodes: {
    id: string
    name: string
    emoji: string
    waitingCount: number
  }[]
}

// Agent labels to display names
const AGENT_LABELS: Record<string, { name: string; emoji: string }> = {
  'engineering-needed': { name: '編譯器', emoji: '⚙️' },
  'requirements-needed': { name: '透析器', emoji: '🔍' },
  'art-design-needed': { name: '調色盤', emoji: '🎨' },
  'art-review-needed': { name: '鑑賞家', emoji: '🖼️' },
  'func-review-needed': { name: '測試台', emoji: '🧪' },
  'devops-needed': { name: '部署艦', emoji: '🚀' },
  'design-needed': { name: '調色盤', emoji: '🎨' },
}

const ALL_AGENT_IDS = ['engineering', 'requirements', 'art-design', 'art-review', 'feature-review', 'devops']

/**
 * Fetch all open issues with {agent}-needed labels
 */
export async function fetchTaskFlowData(): Promise<TaskFlowData> {
  try {
    const response = await fetch('/api/tasks?status=open&labels=engineering-needed,requirements-needed,art-design-needed,art-review-needed,func-review-needed,devops-needed,design-needed')
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }
    
    const data = await response.json()
    const issues: IssueNode[] = data.tasks || []
    
    // Build issue nodes with agent-needed labels
    const issueNodes: IssueNode[] = issues.map((issue: any) => {
      const agentNeeded: string[] = []
      issue.labels.forEach((label: string) => {
        if (label.endsWith('-needed')) {
          const agentId = label.replace('-needed', '')
          if (!agentNeeded.includes(agentId)) {
            agentNeeded.push(agentId)
          }
        }
      })
      
      return {
        id: issue.id,
        title: issue.title,
        labels: issue.labels,
        agentNeeded,
        state: issue.state === 'CLOSED' ? 'closed' as const : 'open' as const,
        createdAt: issue.createdAt,
        url: `https://github.com/ks885522/Openclaw-team-Dashboard/issues/${issue.id}`
      }
    })
    
    // Build agent nodes with waiting count
    const agentWaitingCount: Record<string, number> = {}
    ALL_AGENT_IDS.forEach(id => { agentWaitingCount[id] = 0 })
    
    issueNodes.forEach(issue => {
      issue.agentNeeded.forEach(agentId => {
        if (agentWaitingCount[agentId] !== undefined) {
          agentWaitingCount[agentId]++
        }
      })
    })
    
    const agentNodes = ALL_AGENT_IDS.map(id => ({
      id,
      name: AGENT_LABELS[`${id}-needed`]?.name || id,
      emoji: AGENT_LABELS[`${id}-needed`]?.emoji || '❓',
      waitingCount: agentWaitingCount[id]
    }))
    
    return {
      issues: issueNodes,
      agentNodes
    }
  } catch (error) {
    console.error('Failed to fetch task flow data:', error)
    return { issues: [], agentNodes: [] }
  }
}

export default { fetchTaskFlowData }

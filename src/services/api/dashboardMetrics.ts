// Performance Dashboard API Service
// 串接後端 /api/performance/dashboard 獲取儀表板數據

export interface DashboardLeaderboard {
  agentId: string
  name: string
  emoji: string
  score: number
}

export interface DashboardAgentStats {
  agentId: string
  name: string
  emoji: string
  prs: number
  merged: number
  closed: number
  efficiency: number
}

export interface DashboardHeatmapDay {
  date: string
  count: number
  label: string
}

export interface DashboardIdleAgent {
  agentId: string
  name: string
  emoji: string
  idleMinutes: number
  activeMinutes: number
}

export interface DashboardIdleAnalysis {
  totalIdleMinutes: number
  avgIdleMinutes: number
  byAgent: DashboardIdleAgent[]
}

export interface DashboardMetrics {
  leaderboard: DashboardLeaderboard[]
  agentStats: DashboardAgentStats[]
  heatmap: DashboardHeatmapDay[]
  idleAnalysis: DashboardIdleAnalysis
  timestamp: string
  error?: string
}

/**
 * 獲取 Dashboard 所需的完整數據
 */
export async function fetchDashboardMetrics(days: number = 30): Promise<DashboardMetrics> {
  try {
    const response = await fetch(`/api/performance/dashboard?days=${days}`)
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }
    
    return await response.json()
  } catch (error) {
    console.error('Failed to fetch dashboard metrics:', error)
    throw error
  }
}

export default {
  fetchDashboardMetrics
}

// Performance Metrics API Service
// 串接後端 API 獲取 Performance Data

export interface CostMetrics {
  totalTokens: number
  totalInputTokens: number
  totalOutputTokens: number
  estimatedCostUSD: number
  apiCalls: number
  avgTaskDurationMs: number
  byTaskType: Record<string, {
    count: number
    tokens: number
    cost: number
  }>
}

export interface PerformanceMetrics {
  summary: {
    totalPRs: number
    mergedPRs: number
    closedPRs: number
    mergeRate: string
  }
  output: Record<string, number>
  efficiency: {
    avgDurationMs: number
    avgDurationHuman: string
  }
  reliability: {
    totalTasks: number
    successTasks: number
    rate: string
  }
  cost: CostMetrics
  timestamp: string
  error?: string
}

// 獲取 Performance Metrics
export async function fetchPerformanceMetrics(): Promise<PerformanceMetrics> {
  try {
    const response = await fetch('/api/performance')
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }
    
    return await response.json()
  } catch (error) {
    console.error('Failed to fetch performance metrics:', error)
    throw error
  }
}

// 輪詢獲取 Metrics（用於即時更新）
export function createMetricsPoller(
  onUpdate: (metrics: PerformanceMetrics) => void,
  intervalMs: number = 60000
) {
  let polling = true
  
  const poll = async () => {
    if (!polling) return
    
    try {
      const metrics = await fetchPerformanceMetrics()
      onUpdate(metrics)
    } catch (error) {
      console.error('Metrics poll error:', error)
    }
    
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
  fetchPerformanceMetrics,
  createMetricsPoller
}

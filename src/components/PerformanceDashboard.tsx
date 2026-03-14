import { useState, useEffect } from 'react'
import { fetchPerformanceMetrics, type PerformanceMetrics } from '../services/api/performanceMetrics'

interface AgentStats {
  name: string
  emoji: string
  prs: number
  merged: number
  closed: number
  efficiency: number
  tasks: number
  successTasks: number
  totalIdleMinutes: number
}

export function PerformanceDashboard() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState<'7' | '30' | '90'>('30')

  useEffect(() => {
    const loadMetrics = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await fetchPerformanceMetrics()
        setMetrics(data)
      } catch (err) {
        setError('無法載入績效數據')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    loadMetrics()
  }, [timeRange])

  // 模擬 Agent 排行榜數據（實際應該從 API 獲取）
  const agentStats: AgentStats[] = [
    { name: '編譯器', emoji: '⚙️', prs: 45, merged: 42, closed: 3, efficiency: 94, tasks: 89, successTasks: 85, totalIdleMinutes: 120 },
    { name: '調色盤', emoji: '🎨', prs: 38, merged: 35, closed: 3, efficiency: 92, tasks: 72, successTasks: 68, totalIdleMinutes: 180 },
    { name: '部署艦', emoji: '🚀', prs: 32, merged: 30, closed: 2, efficiency: 94, tasks: 65, successTasks: 62, totalIdleMinutes: 90 },
    { name: '測試台', emoji: '🧪', prs: 28, merged: 26, closed: 2, efficiency: 93, tasks: 54, successTasks: 51, totalIdleMinutes: 210 },
    { name: '透析器', emoji: '🔍', prs: 22, merged: 20, closed: 2, efficiency: 91, tasks: 48, successTasks: 44, totalIdleMinutes: 150 },
    { name: '鑑賞家', emoji: '🖼️', prs: 18, merged: 17, closed: 1, efficiency: 94, tasks: 36, successTasks: 34, totalIdleMinutes: 240 },
    { name: '指揮台', emoji: '📋', prs: 15, merged: 14, closed: 1, efficiency: 93, tasks: 32, successTasks: 30, totalIdleMinutes: 300 },
  ]

  // 生成熱度圖數據（過去 28 天）
  const generateHeatmapData = () => {
    const days: { date: string; count: number; label: string }[] = []
    const now = new Date()
    for (let i = 27; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      days.push({
        date: dateStr,
        count: Math.floor(Math.random() * 20) + 5, // 模擬數據
        label: date.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' })
      })
    }
    return days
  }

  const heatmapData = generateHeatmapData()

  // 計算空轉分析
  const calculateIdleAnalysis = () => {
    const totalIdle = agentStats.reduce((sum, agent) => sum + agent.totalIdleMinutes, 0)
    const avgIdle = Math.round(totalIdle / agentStats.length)
    return { totalIdle, avgIdle }
  }

  const { totalIdle, avgIdle } = calculateIdleAnalysis()

  const getHeatmapColor = (count: number) => {
    if (count === 0) return 'var(--heatmap-empty)'
    if (count < 10) return 'var(--heatmap-low)'
    if (count < 15) return 'var(--heatmap-medium)'
    return 'var(--heatmap-high)'
  }

  if (loading) {
    return (
      <div className="performance-dashboard">
        <div className="loading-spinner">載入績效數據中...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="performance-dashboard">
        <div className="error-message">{error}</div>
      </div>
    )
  }

  return (
    <div className="performance-dashboard">
      {/* Summary Cards */}
      <section className="section">
        <div className="section-header">
          <h2 className="section-title">📊 團隊概覽</h2>
          <select 
            className="filter-select"
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as '7' | '30' | '90')}
          >
            <option value="7">近 7 天</option>
            <option value="30">近 30 天</option>
            <option value="90">近 90 天</option>
          </select>
        </div>
        
        {metrics && (
          <div className="summary-grid">
            <div className="summary-card primary">
              <div className="summary-icon">📝</div>
              <div className="summary-content">
                <div className="summary-value">{metrics.summary.totalPRs}</div>
                <div className="summary-label">總 PR 數</div>
              </div>
            </div>
            <div className="summary-card success">
              <div className="summary-icon">✅</div>
              <div className="summary-content">
                <div className="summary-value">{metrics.summary.mergedPRs}</div>
                <div className="summary-label">已合併</div>
              </div>
            </div>
            <div className="summary-card info">
              <div className="summary-icon">📈</div>
              <div className="summary-content">
                <div className="summary-value">{metrics.summary.mergeRate}</div>
                <div className="summary-label">合併率</div>
              </div>
            </div>
            <div className="summary-card warning">
              <div className="summary-icon">⏱️</div>
              <div className="summary-content">
                <div className="summary-value">{metrics.efficiency.avgDurationHuman}</div>
                <div className="summary-label">平均耗時</div>
              </div>
            </div>
            <div className="summary-card">
              <div className="summary-icon">🎯</div>
              <div className="summary-content">
                <div className="summary-value">{metrics.reliability.rate}</div>
                <div className="summary-label">任務成功率</div>
              </div>
            </div>
            <div className="summary-card">
              <div className="summary-icon">💰</div>
              <div className="summary-content">
                <div className="summary-value">${metrics.cost.estimatedCostUSD.toFixed(2)}</div>
                <div className="summary-label">預估成本</div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Agent Leaderboard */}
      <section className="section">
        <h2 className="section-title">🏆 Agent 排行榜</h2>
        <div className="leaderboard">
          {agentStats
            .sort((a, b) => b.merged - a.merged)
            .reduce<Array<{agent: AgentStats; rank: number}>>((acc, agent, idx) => {
              acc.push({ agent, rank: idx + 1 })
              return acc
            }, [])
            .map(({ agent, rank }) => (
              <div key={agent.name} className={`leaderboard-item rank-${rank}`}>
                <div className="leaderboard-rank">
                  {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`}
                </div>
                <div className="leaderboard-emoji">{agent.emoji}</div>
                <div className="leaderboard-name">{agent.name}</div>
                <div className="leaderboard-stats">
                  <div className="stat-item">
                    <span className="stat-value">{agent.merged}</span>
                    <span className="stat-label">合併</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-value">{agent.efficiency}%</span>
                    <span className="stat-label">效率</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-value">{agent.successTasks}</span>
                    <span className="stat-label">任務</span>
                  </div>
                </div>
                <div className="leaderboard-bar">
                  <div 
                    className="leaderboard-bar-fill"
                    style={{ width: `${(agent.merged / agentStats[0].merged) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
        </div>
      </section>

      {/* Activity Heatmap */}
      <section className="section">
        <h2 className="section-title">🔥 活動熱度圖（過去 28 天）</h2>
        <div className="heatmap-container">
          <div className="heatmap-grid">
            {heatmapData.map((day) => (
              <div 
                key={day.date} 
                className="heatmap-cell"
                style={{ backgroundColor: getHeatmapColor(day.count) }}
                title={`${day.label}: ${day.count} 次活動`}
              >
                <span className="heatmap-tooltip">{day.label}: {day.count}</span>
              </div>
            ))}
          </div>
          <div className="heatmap-legend">
            <span className="legend-label">少</span>
            <div className="legend-scale">
              <div className="legend-item" style={{ backgroundColor: 'var(--heatmap-empty)' }}></div>
              <div className="legend-item" style={{ backgroundColor: 'var(--heatmap-low)' }}></div>
              <div className="legend-item" style={{ backgroundColor: 'var(--heatmap-medium)' }}></div>
              <div className="legend-item" style={{ backgroundColor: 'var(--heatmap-high)' }}></div>
            </div>
            <span className="legend-label">多</span>
          </div>
        </div>
      </section>

      {/* Idle Analysis */}
      <section className="section">
        <h2 className="section-title">⏰ 空轉分析</h2>
        <div className="idle-analysis">
          <div className="idle-summary">
            <div className="idle-stat">
              <div className="idle-value">{Math.round(totalIdle / 60)}h</div>
              <div className="idle-label">總空轉時間</div>
            </div>
            <div className="idle-stat">
              <div className="idle-value">{Math.round(avgIdle / 60)}h</div>
              <div className="idle-label">平均空轉時間</div>
            </div>
            <div className="idle-stat">
              <div className="idle-value">{agentStats.length}</div>
              <div className="idle-label">Agent 數量</div>
            </div>
          </div>
          <div className="idle-chart">
            {agentStats
              .sort((a, b) => b.totalIdleMinutes - a.totalIdleMinutes)
              .map(agent => (
                <div key={agent.name} className="idle-bar-row">
                  <div className="idle-bar-label">
                    {agent.emoji} {agent.name}
                  </div>
                  <div className="idle-bar-container">
                    <div 
                      className="idle-bar-fill"
                      style={{ 
                        width: `${(agent.totalIdleMinutes / Math.max(...agentStats.map(a => a.totalIdleMinutes))) * 100}%`,
                        backgroundColor: agent.totalIdleMinutes > 200 ? 'var(--status-busy)' : 'var(--status-idle)'
                      }}
                    ></div>
                  </div>
                  <div className="idle-bar-value">{Math.round(agent.totalIdleMinutes / 60)}h</div>
                </div>
              ))}
          </div>
        </div>
      </section>
    </div>
  )
}

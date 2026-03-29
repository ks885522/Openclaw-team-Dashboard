import { useState, useEffect } from 'react';
import { 
  fetchTokenCycles, 
  formatTokens, 
  formatCost, 
  getWarningLevel,
  type TokenCyclesResponse 
} from '../services/api/tokenUsage';

const AGENT_LIST = [
  { id: 'engineering', name: '編譯器', emoji: '⚙️' },
  { id: 'art-design', name: '調色盤', emoji: '🎨' },
  { id: 'requirements', name: '透析器', emoji: '🔍' },
  { id: 'task-tracking', name: '指揮台', emoji: '📋' },
  { id: 'art-review', name: '鑑賞家', emoji: '🖼️' },
  { id: 'feature-review', name: '測試台', emoji: '🧪' },
  { id: 'devops', name: '部署艦', emoji: '🚀' },
];

export function TokenDistribution() {
  const [data, setData] = useState<TokenCyclesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState<1 | 3 | 7>(1);
  const [selectedAgent, setSelectedAgent] = useState<string | 'all'>('all');

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchTokenCycles(days, selectedAgent === 'all' ? undefined : selectedAgent);
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : '載入失敗');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [days, selectedAgent]);

  if (loading) {
    return (
      <div className="token-distribution">
        <div className="loading-spinner">載入 Token 消耗數據中...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="token-distribution">
        <div className="error-message">載入失敗: {error || '無數據'}</div>
      </div>
    );
  }

  // Get current cycle for selected agent or aggregate
  const displayCycles = selectedAgent === 'all' 
    ? data.cycles 
    : (data.byAgent[selectedAgent]?.cycles || []);

  const currentCycle = displayCycles[0];
  const currentRemainingPct = currentCycle?.remainingPercent ?? 100;
  const warningLevel = getWarningLevel(currentRemainingPct);

  // Generate cycle history for chart (last 5 cycles)
  const chartCycles = displayCycles.slice(0, 5).reverse();

  return (
    <div className="token-distribution">
      {/* Header */}
      <section className="section">
        <div className="section-header">
          <h2 className="section-title">💰 Token 消耗分佈</h2>
          <div className="header-controls">
            <select 
              className="filter-select"
              value={days}
              onChange={(e) => setDays(Number(e.target.value) as 1 | 3 | 7)}
            >
              <option value={1}>近 1 天</option>
              <option value={3}>近 3 天</option>
              <option value={7}>近 7 天</option>
            </select>
            <select
              className="filter-select"
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
            >
              <option value="all">全部 Agent</option>
              {AGENT_LIST.map(agent => (
                <option key={agent.id} value={agent.id}>
                  {agent.emoji} {agent.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Current Cycle Status */}
      <section className="section">
        <h3 className="subsection-title">📍 當前週期狀態（{data.cycleDurationHours} 小時循環）</h3>
        <div className="current-cycle-info">
          <span className="cycle-time">
            {data.currentCycle.start.replace('T', ' ').substring(0, 16)} 
            ~ 
            {data.currentCycle.end.replace('T', ' ').substring(0, 16)}
          </span>
        </div>

        {currentCycle ? (
          <div className={`current-budget-card ${warningLevel}`}>
            <div className="budget-header">
              <span className="budget-label">額度剩餘</span>
              <span className={`budget-status status-${warningLevel}`}>
                {warningLevel === 'critical' ? '🔴 緊急' : 
                 warningLevel === 'warning' ? '🟡 警告' : '🟢 正常'}
              </span>
            </div>
            <div className="budget-bar-container">
              <div 
                className={`budget-bar-fill ${warningLevel}`}
                style={{ width: `${Math.max(0, currentRemainingPct)}%` }}
              ></div>
            </div>
            <div className="budget-numbers">
              <span className="budget-remaining">
                {formatTokens(currentCycle.remaining)} / {formatTokens(currentCycle.budget)}
              </span>
              <span className="budget-percent" style={{ 
                color: warningLevel === 'critical' ? 'var(--status-busy)' : 
                       warningLevel === 'warning' ? '#f59e0b' : 'var(--status-idle)'
              }}>
                {currentRemainingPct.toFixed(1)}%
              </span>
            </div>
            <div className="budget-details">
              <span>已用: {formatTokens(currentCycle.totalTokens)}</span>
              <span>花費: {formatCost(currentCycle.estimatedCost)}</span>
              <span>請求: {currentCycle.requestCount} 次</span>
            </div>
          </div>
        ) : (
          <div className="empty-state">目前無消耗數據</div>
        )}
      </section>

      {/* Agent Breakdown */}
      {selectedAgent === 'all' && (
        <section className="section">
          <h3 className="subsection-title">👥 各 Agent 消耗</h3>
          <div className="agent-token-grid">
            {AGENT_LIST.map(agent => {
              const agentData = data.byAgent[agent.id];
              const latestCycle = agentData?.cycles?.[0];
              const remaining = latestCycle?.remainingPercent ?? 100;
              const level = getWarningLevel(remaining);

              return (
                <div key={agent.id} className={`agent-token-card ${level}`}>
                  <div className="agent-token-header">
                    <span className="agent-emoji">{agent.emoji}</span>
                    <span className="agent-name">{agent.name}</span>
                  </div>
                  {latestCycle ? (
                    <>
                      <div className="agent-token-bar">
                        <div 
                          className={`agent-token-fill ${level}`}
                          style={{ width: `${Math.max(0, 100 - remaining)}%` }}
                        ></div>
                      </div>
                      <div className="agent-token-info">
                        <span>{formatTokens(latestCycle.totalTokens)} / {formatTokens(latestCycle.budget)}</span>
                        <span className={level === 'ok' ? '' : level === 'warning' ? 'text-warning' : 'text-critical'}>
                          {remaining.toFixed(1)}%
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="agent-token-empty">無數據</div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Consumption Trend Chart */}
      <section className="section">
        <h3 className="subsection-title">📈 消耗趨勢（近 {chartCycles.length} 個週期）</h3>
        {chartCycles.length > 0 ? (
          <div className="trend-chart">
            <div className="trend-y-axis">
              <span>{formatTokens(data.budgetPerCycle)}</span>
              <span>{formatTokens(data.budgetPerCycle / 2)}</span>
              <span>0</span>
            </div>
            <div className="trend-bars">
              {chartCycles.map((cycle, idx) => {
                const pct = (cycle.totalTokens / cycle.budget) * 100;
                const agent = AGENT_LIST.find(a => a.id === cycle.agentId);
                return (
                  <div key={idx} className="trend-bar-wrapper">
                    <div className="trend-bar-container">
                      <div 
                        className={`trend-bar-fill ${getWarningLevel(100 - pct)}`}
                        style={{ height: `${Math.min(100, pct)}%` }}
                        title={`${agent?.emoji || ''} ${agent?.name || cycle.agentId}: ${formatTokens(cycle.totalTokens)}`}
                      ></div>
                    </div>
                    <div className="trend-bar-label">
                      {new Date(cycle.cycleStartISO).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="empty-state">無歷史數據</div>
        )}
      </section>

      {/* Cycle History Table */}
      <section className="section">
        <h3 className="subsection-title">📋 週期歷史</h3>
        {displayCycles.length > 0 ? (
          <div className="cycle-table-wrapper">
            <table className="cycle-table">
              <thead>
                <tr>
                  <th>時間</th>
                  <th>Agent</th>
                  <th>輸入 Token</th>
                  <th>輸出 Token</th>
                  <th>總消耗</th>
                  <th>剩餘</th>
                  <th>狀態</th>
                </tr>
              </thead>
              <tbody>
                {displayCycles.map((cycle, idx) => {
                  const agent = AGENT_LIST.find(a => a.id === cycle.agentId);
                  const level = getWarningLevel(cycle.remainingPercent);
                  return (
                    <tr key={idx} className={level !== 'ok' ? `row-${level}` : ''}>
                      <td className="cell-time">
                        {new Date(cycle.cycleStartISO).toLocaleString('zh-TW', { 
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                        })}
                      </td>
                      <td className="cell-agent">
                        {agent?.emoji} {agent?.name || cycle.agentId}
                      </td>
                      <td className="cell-num">{formatTokens(cycle.totalInputTokens)}</td>
                      <td className="cell-num">{formatTokens(cycle.totalOutputTokens)}</td>
                      <td className="cell-num cell-total">{formatTokens(cycle.totalTokens)}</td>
                      <td className={`cell-num cell-remaining ${level}`}>
                        {cycle.remainingPercent.toFixed(1)}%
                      </td>
                      <td className="cell-status">
                        {level === 'critical' ? '🔴' : level === 'warning' ? '🟡' : '🟢'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">無歷史記錄</div>
        )}
      </section>

      {/* Summary */}
      <section className="section">
        <h3 className="subsection-title">📊 統計摘要</h3>
        <div className="summary-grid">
          <div className="summary-card">
            <div className="summary-value">{formatTokens(data.summary.totalTokensUsed)}</div>
            <div className="summary-label">總消耗 Token</div>
          </div>
          <div className="summary-card">
            <div className="summary-value">{formatCost(data.summary.totalCostUSD)}</div>
            <div className="summary-label">預估成本</div>
          </div>
          <div className="summary-card">
            <div className="summary-value">{data.summary.totalRequests}</div>
            <div className="summary-label">總請求次數</div>
          </div>
          <div className={`summary-card ${data.summary.lowBudgetAgents.length > 0 ? 'warning' : ''}`}>
            <div className="summary-value">
              {data.summary.lowBudgetAgents.length > 0 
                ? data.summary.lowBudgetAgents.map(aid => AGENT_LIST.find(a => a.id === aid)?.emoji || '').join(' ')
                : '—'}
            </div>
            <div className="summary-label">低額度 Agent</div>
          </div>
        </div>
      </section>
    </div>
  );
}

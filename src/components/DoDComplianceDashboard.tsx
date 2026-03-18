import { useState, useEffect } from 'react';
import { fetchDoDCompliance, type DoDComplianceData } from '../services/api/dodCompliance';

interface DoDComplianceDashboardProps {
  compact?: boolean;
}

type TimeRange = 7 | 14 | 30 | 60 | 90;

export function DoDComplianceDashboard({ compact = false }: DoDComplianceDashboardProps) {
  const [data, setData] = useState<DoDComplianceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState<TimeRange>(30);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const complianceData = await fetchDoDCompliance(days);
        setData(complianceData);
        setLastUpdate(new Date());
        setError(null);
      } catch (err) {
        console.error('Failed to load DoD compliance:', err);
        setError('無法載入合規率數據');
      } finally {
        setLoading(false);
      }
    }
    loadData();
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(loadData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [days]);

  if (loading && !data) {
    return (
      <div className="dod-compliance-dashboard">
        <div className="loading">載入中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dod-compliance-dashboard">
        <div className="error">{error}</div>
      </div>
    );
  }

  if (!data) return null;

  const { summary, period, issues } = data;

  if (compact) {
    return (
      <div className="dod-compliance-dashboard compact">
        <div className="compliance-rate">
          <span className="rate">{summary.complianceRate}%</span>
          <span className="label">合規率</span>
        </div>
        <div className="stats">
          <span>{summary.totalClosed} 結案</span>
          <span>{summary.bothApproved} 完成</span>
        </div>
      </div>
    );
  }

  return (
    <div className="dod-compliance-dashboard">
      <div className="header">
        <h3>📋 DoD 合規率統計</h3>
        <div className="controls">
          <select 
            value={days} 
            onChange={(e) => setDays(Number(e.target.value) as TimeRange)}
          >
            <option value={7}>過去 7 天</option>
            <option value={14}>過去 14 天</option>
            <option value={30}>過去 30 天</option>
            <option value={60}>過去 60 天</option>
            <option value={90}>過去 90 天</option>
          </select>
          {lastUpdate && (
            <span className="last-update">
              更新: {lastUpdate.toLocaleTimeString('zh-TW')}
            </span>
          )}
        </div>
      </div>

      <div className="summary-cards">
        <div className="card primary">
          <div className="rate">{summary.complianceRate}%</div>
          <div className="label">合規率</div>
        </div>
        <div className="card">
          <div className="count">{summary.totalClosed}</div>
          <div className="label">總結案數</div>
        </div>
        <div className="card">
          <div className="count">{summary.bothApproved}</div>
          <div className="label">三方通過</div>
        </div>
        <div className="card">
          <div className="count">{summary.totalClosed - summary.bothApproved}</div>
          <div className="label">未合規</div>
        </div>
      </div>

      <div className="period-info">
        統計區間: {period.since} ~ {period.until}
      </div>

      <div className="breakdown">
        <div className="breakdown-item">
          <span className="badge art">🎨 art-approved</span>
          <span className="count">{summary.artApproved}</span>
        </div>
        <div className="breakdown-item">
          <span className="badge func">🧪 func-approved</span>
          <span className="count">{summary.funcApproved}</span>
        </div>
      </div>

      {issues.length > 0 && (
        <div className="issues-list">
          <h4>最近結案 Issue ({issues.length})</h4>
          <div className="issues">
            {issues.slice(0, 10).map(issue => (
              <div key={issue.number} className={`issue-item ${issue.compliant ? 'compliant' : 'non-compliant'}`}>
                <span className="issue-number">#{issue.number}</span>
                <span className="issue-title">{issue.title}</span>
                <div className="badges">
                  {issue.artApproved && <span className="badge art">🎨</span>}
                  {issue.funcApproved && <span className="badge func">🧪</span>}
                  {!issue.compliant && <span className="badge missing">⚠️</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

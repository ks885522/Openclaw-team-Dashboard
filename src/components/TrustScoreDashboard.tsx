import { useState, useEffect } from 'react';
import { fetchTrustScores, fetchTrustLeaderboard, type TrustScoreData } from '../services/api/trustScores';

// Agent emoji mapping
const AGENT_EMOJI: Record<string, string> = {
  engineering: '⚙️',
  'art-design': '🎨',
  requirements: '🔍',
  'task-tracking': '📋',
  'art-review': '🖼️',
  'feature-review': '🧪',
  devops: '🚀'
};

const AGENT_NAMES: Record<string, string> = {
  engineering: '編譯器',
  'art-design': '調色盤',
  requirements: '透析器',
  'task-tracking': '指揮台',
  'art-review': '鑑賞家',
  'feature-review': '測試台',
  devops: '部署艦'
};

interface TrustScoreDashboardProps {
  compact?: boolean;
}

export function TrustScoreDashboard({ compact = false }: TrustScoreDashboardProps) {
  const [trustData, setTrustData] = useState<TrustScoreData | null>(null);
  const [leaderboard, setLeaderboard] = useState<{ agentId: string; score: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [trustDataResult, leaderboardData] = await Promise.all([
          fetchTrustScores(),
          fetchTrustLeaderboard()
        ]);
        setTrustData(trustDataResult);
        setLeaderboard(leaderboardData);
        setLastUpdate(new Date());
        setError(null);
      } catch (err) {
        console.error('Failed to load trust scores:', err);
        setError('無法載入誠信分數據');
      } finally {
        setLoading(false);
      }
    }

    loadData();
    const interval = setInterval(loadData, 60000); // Refresh every minute

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="trust-score-dashboard loading">
        <div className="loading-spinner">載入中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="trust-score-dashboard error">
        <div className="error-message">{error}</div>
      </div>
    );
  }

  const maxScore = 100;
  const getScoreColor = (score: number): string => {
    if (score >= 80) return '#4ade80'; // green
    if (score >= 60) return '#fbbf24'; // yellow
    if (score >= 40) return '#f97316'; // orange
    return '#ef4444'; // red
  };

  const getScoreGrade = (score: number): string => {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  };

  if (compact) {
    return (
      <div className="trust-score-dashboard compact">
        <h3>🔒 誠信評分</h3>
        <div className="trust-list">
          {leaderboard.slice(0, 5).map((entry, index) => (
            <div key={entry.agentId} className="trust-item">
              <span className="rank">#{index + 1}</span>
              <span className="emoji">{AGENT_EMOJI[entry.agentId] || '❓'}</span>
              <span className="name">{AGENT_NAMES[entry.agentId] || entry.agentId}</span>
              <span 
                className="score" 
                style={{ color: getScoreColor(entry.score) }}
              >
                {entry.score} 分
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="trust-score-dashboard">
      <div className="trust-header">
        <h2>🔒 Agent 誠信評分</h2>
        {lastUpdate && (
          <span className="last-update">
            更新於 {lastUpdate.toLocaleTimeString('zh-TW')}
          </span>
        )}
      </div>
      
      <div className="trust-content">
        <div className="trust-main">
          <h3>誠信分數 (100分制)</h3>
          <div className="trust-list">
            {leaderboard.map((entry, index) => (
              <div key={entry.agentId} className="trust-item">
                <div className="rank-badge">
                  {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                </div>
                <div className="agent-info">
                  <span className="emoji">{AGENT_EMOJI[entry.agentId] || '❓'}</span>
                  <span className="name">{AGENT_NAMES[entry.agentId] || entry.agentId}</span>
                </div>
                <div className="trust-bar-container">
                  <div 
                    className="trust-bar" 
                    style={{ 
                      width: `${(entry.score / maxScore) * 100}%`,
                      backgroundColor: getScoreColor(entry.score)
                    }}
                  />
                </div>
                <div 
                  className="score-value"
                  style={{ color: getScoreColor(entry.score) }}
                >
                  {entry.score} 分
                </div>
                <div 
                  className="grade-badge"
                  style={{ 
                    backgroundColor: getScoreColor(entry.score),
                    color: entry.score >= 60 ? '#000' : '#fff'
                  }}
                >
                  {getScoreGrade(entry.score)}
                </div>
              </div>
            ))}
            {leaderboard.length === 0 && (
              <div className="empty-message">尚無誠信數據</div>
            )}
          </div>
        </div>

        <div className="trust-history">
          <h3>QA 駁回記錄</h3>
          <div className="history-list">
            {trustData?.history.slice(0, 10).map((event, index) => (
              <div key={index} className="history-item">
                <span className="emoji">{AGENT_EMOJI[event.agentId] || '❓'}</span>
                <span className="agent">{AGENT_NAMES[event.agentId] || event.agentId}</span>
                <span className="issue-num">#{event.issueNumber}</span>
                <span className="timestamp">
                  {new Date(event.timestamp).toLocaleDateString('zh-TW')}
                </span>
              </div>
            ))}
            {(!trustData?.history || trustData.history.length === 0) && (
              <div className="empty-message">尚無QA駁回記錄</div>
            )}
          </div>
        </div>
      </div>

      <div className="trust-rules">
        <h4>誠信評分規則</h4>
        <ul>
          <li><span className="points base">100</span> 初始分數</li>
          <li><span className="points negative">-10</span> 每次 QA 駁回 (qa-rejected)</li>
          <li><span className="points positive">+2</span> 完成任務</li>
          <li><span className="points positive">+1</span> 審查通過</li>
          <li><span className="points negative">-20</span> 嚴重問題</li>
        </ul>
      </div>
    </div>
  );
}

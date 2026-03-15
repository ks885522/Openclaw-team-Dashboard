import { useState, useEffect } from 'react';
import { fetchLeaderboard, fetchScores, type LeaderboardEntry, type ScoreEvent } from '../services/api/scores';

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

interface ScoreLeaderboardProps {
  compact?: boolean;
}

export function ScoreLeaderboard({ compact = false }: ScoreLeaderboardProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [history, setHistory] = useState<ScoreEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [lbData, scoreData] = await Promise.all([
          fetchLeaderboard(),
          fetchScores()
        ]);
        setLeaderboard(lbData);
        setHistory(scoreData.history || []);
        setLastUpdate(new Date());
        setError(null);
      } catch (err) {
        console.error('Failed to load scores:', err);
        setError('無法載入積分數據');
      } finally {
        setLoading(false);
      }
    }

    loadData();
    const interval = setInterval(loadData, 30000); // Refresh every 30s

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="score-leaderboard loading">
        <div className="loading-spinner">載入中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="score-leaderboard error">
        <div className="error-message">{error}</div>
      </div>
    );
  }

  const maxScore = leaderboard.length > 0 ? Math.max(...leaderboard.map(e => e.score)) : 1;

  if (compact) {
    return (
      <div className="score-leaderboard compact">
        <h3>🏆 積分排行</h3>
        <div className="leaderboard-list">
          {leaderboard.slice(0, 5).map((entry, index) => (
            <div key={entry.agentId} className={`leaderboard-item rank-${index + 1}`}>
              <span className="rank">#{index + 1}</span>
              <span className="emoji">{AGENT_EMOJI[entry.agentId] || '❓'}</span>
              <span className="name">{AGENT_NAMES[entry.agentId] || entry.agentId}</span>
              <span className="score">{entry.score} pts</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="score-leaderboard">
      <div className="leaderboard-header">
        <h2>🏆 Agent 積分排行榜</h2>
        {lastUpdate && (
          <span className="last-update">
            更新於 {lastUpdate.toLocaleTimeString('zh-TW')}
          </span>
        )}
      </div>
      
      <div className="leaderboard-content">
        <div className="leaderboard-main">
          <h3>總積分</h3>
          <div className="leaderboard-list">
            {leaderboard.map((entry, index) => (
              <div key={entry.agentId} className={`leaderboard-item rank-${index + 1}`}>
                <div className="rank-badge">
                  {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                </div>
                <div className="agent-info">
                  <span className="emoji">{AGENT_EMOJI[entry.agentId] || '❓'}</span>
                  <span className="name">{AGENT_NAMES[entry.agentId] || entry.agentId}</span>
                </div>
                <div className="score-bar-container">
                  <div 
                    className="score-bar" 
                    style={{ width: `${(entry.score / maxScore) * 100}%` }}
                  />
                </div>
                <div className="score-value">{entry.score} pts</div>
              </div>
            ))}
            {leaderboard.length === 0 && (
              <div className="empty-message">尚無積分數據</div>
            )}
          </div>
        </div>

        <div className="leaderboard-history">
          <h3>最近活動</h3>
          <div className="history-list">
            {history.slice(0, 10).map((event, index) => (
              <div key={index} className="history-item">
                <span className="emoji">{AGENT_EMOJI[event.agentId] || '❓'}</span>
                <span className="agent">{AGENT_NAMES[event.agentId] || event.agentId}</span>
                <span className={`points ${event.points > 0 ? 'positive' : 'negative'}`}>
                  {event.points > 0 ? '+' : ''}{event.points}
                </span>
                <span className="event-type">{getEventTypeName(event.eventType)}</span>
              </div>
            ))}
            {history.length === 0 && (
              <div className="empty-message">尚無活動記錄</div>
            )}
          </div>
        </div>
      </div>

      <div className="score-rules">
        <h4>積分規則</h4>
        <ul>
          <li><span className="points positive">+10</span> 完成任務 (PR merged)</li>
          <li><span className="points positive">+5</span> 審查通過</li>
          <li><span className="points negative">-3</span> 任務退回 (PR closed)</li>
          <li><span className="points positive">+15</span> 發現關鍵 Bug</li>
        </ul>
      </div>
    </div>
  );
}

function getEventTypeName(eventType: string): string {
  const names: Record<string, string> = {
    task_completed: '完成任務',
    task_rejected: '任務退回',
    review_approved: '審查通過',
    critical_bug: '關鍵 Bug'
  };
  return names[eventType] || eventType;
}

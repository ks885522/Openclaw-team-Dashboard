import { useState, useEffect } from 'react';
import './TokenAllocation.css';

interface Task {
  id: number;
  title: string;
  labels: string[];
  assignees: string[];
  estimatedTokens: number;
}

interface PriorityData {
  tasks: number;
  tokens: number;
}

interface AllocationData {
  quota: number;
  used: number;
  remaining: number;
  usagePercent: number;
  status: 'normal' | 'warning' | 'critical';
  byPriority: {
    critical: PriorityData;
    high: PriorityData;
    normal: PriorityData;
  };
  tasks: {
    'priority:critical': Task[];
    'priority:high': Task[];
    'priority:normal': Task[];
  };
  suggestion: {
    action: string;
    message: string;
    tasksToPause?: { id: number; title: string }[];
  } | null;
  timestamp: string;
}

export default function TokenAllocation() {
  const [data, setData] = useState<AllocationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pausing, setPausing] = useState<number[]>([]);

  const fetchAllocation = async () => {
    try {
      const res = await fetch('/api/token-allocation');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllocation();
    const interval = setInterval(fetchAllocation, 30000);
    return () => clearInterval(interval);
  }, []);

  const handlePause = async (taskId: number) => {
    setPausing(prev => [...prev, taskId]);
    try {
      await fetch(`/api/token-allocation/pause`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issueNumber: taskId, action: 'pause' })
      });
      await fetchAllocation();
    } finally {
      setPausing(prev => prev.filter(id => id !== taskId));
    }
  };

  const handleResume = async (taskId: number) => {
    setPausing(prev => [...prev, taskId]);
    try {
      await fetch(`/api/token-allocation/pause`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issueNumber: taskId, action: 'resume' })
      });
      await fetchAllocation();
    } finally {
      setPausing(prev => prev.filter(id => id !== taskId));
    }
  };

  if (loading) return <div className="token-allocation loading">載入中...</div>;
  if (error) return <div className="token-allocation error">載入失敗: {error}</div>;
  if (!data) return null;

  const statusClass = `token-allocation status-${data.status}`;
  const criticalTasks = data.tasks['priority:critical'] || [];
  const highTasks = data.tasks['priority:high'] || [];
  const normalTasks = data.tasks['priority:normal'] || [];

  const allTasks = [
    ...criticalTasks.map(t => ({ ...t, priority: 'critical' })),
    ...highTasks.map(t => ({ ...t, priority: 'high' })),
    ...normalTasks.map(t => ({ ...t, priority: 'normal' }))
  ];

  return (
    <div className={statusClass}>
      <div className="allocation-header">
        <h3>⚖️ Token 分配監控</h3>
        <div className="quota-bar">
          <div className="quota-label">
            <span>Token 配額</span>
            <span>{data.used.toLocaleString()} / {data.quota.toLocaleString()}</span>
          </div>
          <div className="quota-track">
            <div
              className="quota-fill"
              style={{ width: `${Math.min(data.usagePercent, 100)}%` }}
            />
          </div>
          <div className="quota-percent">{data.usagePercent}%</div>
        </div>
      </div>

      {data.suggestion && (
        <div className={`suggestion-box ${data.status}`}>
          <div className="suggestion-icon">
            {data.status === 'critical' ? '🚨' : '⚠️'}
          </div>
          <div className="suggestion-content">
            <div className="suggestion-message">{data.suggestion.message}</div>
            {data.suggestion.tasksToPause && data.suggestion.tasksToPause.length > 0 && (
              <div className="suggestion-tasks">
                建議暫停: {data.suggestion.tasksToPause.map(t => `#${t.id}`).join(', ')}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="priority-breakdown">
        <div className="priority-row critical">
          <span className="priority-label">P0 緊急</span>
          <span className="priority-count">{data.byPriority.critical.tasks} 任務</span>
          <span className="priority-tokens">{data.byPriority.critical.tokens.toLocaleString()} tokens</span>
        </div>
        <div className="priority-row high">
          <span className="priority-label">P1 高</span>
          <span className="priority-count">{data.byPriority.high.tasks} 任務</span>
          <span className="priority-tokens">{data.byPriority.high.tokens.toLocaleString()} tokens</span>
        </div>
        <div className="priority-row normal">
          <span className="priority-label">P2 正常</span>
          <span className="priority-count">{data.byPriority.normal.tasks} 任務</span>
          <span className="priority-tokens">{data.byPriority.normal.tokens.toLocaleString()} tokens</span>
        </div>
      </div>

      <div className="task-list">
        <h4>📋 任務價值排序</h4>
        <table>
          <thead>
            <tr>
              <th>優先級</th>
              <th>#</th>
              <th>標題</th>
              <th>負責人</th>
              <th>預估Tokens</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {allTasks.map(task => {
              const isPaused = task.labels.includes('paused');
              const isPending = pausing.includes(task.id);
              return (
                <tr key={task.id} className={`priority-${task.priority} ${isPaused ? 'paused' : ''}`}>
                  <td>
                    <span className={`priority-badge ${task.priority}`}>
                      {task.priority === 'critical' ? 'P0' : task.priority === 'high' ? 'P1' : 'P2'}
                    </span>
                  </td>
                  <td>{task.id}</td>
                  <td className="task-title">{task.title}</td>
                  <td>{task.assignees.join(', ') || '未分配'}</td>
                  <td>{task.estimatedTokens.toLocaleString()}</td>
                  <td>
                    {isPaused ? (
                      <button
                        className="btn-resume"
                        onClick={() => handleResume(task.id)}
                        disabled={isPending}
                      >
                        {isPending ? '恢復中...' : '▶ 恢復'}
                      </button>
                    ) : (
                      <button
                        className="btn-pause"
                        onClick={() => handlePause(task.id)}
                        disabled={isPending || task.priority === 'critical'}
                        title={task.priority === 'critical' ? 'P0 任務不可暫停' : '暫停任務'}
                      >
                        {isPending ? '暫停中...' : '⏸ 暫停'}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="allocation-footer">
        更新時間: {new Date(data.timestamp).toLocaleString()}
        <button className="btn-refresh" onClick={fetchAllocation}>🔄 刷新</button>
      </div>
    </div>
  );
}

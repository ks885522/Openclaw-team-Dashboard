import React, { useState, useEffect } from 'react';
import './AlertHistory.css';

interface AlertRecord {
  id: string;
  rule: {
    id: string;
    name: string;
    type: string;
  };
  message: string;
  severity: 'critical' | 'warning' | 'info';
  timestamp: string;
  agent?: string;
}

interface AlertHistoryProps {
  maxHeight?: string;
}

const AlertHistory: React.FC<AlertHistoryProps> = ({ maxHeight = '400px' }) => {
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<string>('all');

  useEffect(() => {
    fetchAlerts();
    // Poll for new alerts every 30 seconds
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchAlerts = async () => {
    try {
      const response = await fetch('http://localhost:18789/api/alerts');
      const data = await response.json();
      if (data.history) {
        setAlerts(data.history.map((alert: any, idx: number) => ({
          id: alert.timestamp + '-' + idx,
          ...alert
        })));
      }
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityClass = (severity: string) => {
    switch (severity) {
      case 'critical': return 'severity-critical';
      case 'warning': return 'severity-warning';
      case 'info': return 'severity-info';
      default: return '';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
    return date.toLocaleDateString('zh-CN');
  };

  const filterAlerts = () => {
    return alerts.filter(alert => {
      // Filter by type
      if (filterType !== 'all' && alert.rule?.type !== filterType) return false;
      // Filter by severity
      if (filterSeverity !== 'all' && alert.severity !== filterSeverity) return false;
      // Filter by time range
      if (timeRange !== 'all') {
        const alertTime = new Date(alert.timestamp).getTime();
        const now = Date.now();
        if (timeRange === '1h' && now - alertTime > 3600000) return false;
        if (timeRange === '24h' && now - alertTime > 86400000) return false;
        if (timeRange === '7d' && now - alertTime > 604800000) return false;
      }
      return true;
    });
  };

  const filteredAlerts = filterAlerts();
  const alertTypes = [...new Set(alerts.map(a => a.rule?.type).filter(Boolean))];

  if (loading) {
    return (
      <div className="alert-history loading">
        <div className="loading-spinner"></div>
        <span>加载中...</span>
      </div>
    );
  }

  return (
    <div className="alert-history" style={{ maxHeight }}>
      <div className="alert-history-header">
        <h3>📊 警报历史</h3>
        <span className="alert-count">{filteredAlerts.length} 条记录</span>
      </div>

      <div className="alert-filters">
        <select 
          value={filterType} 
          onChange={(e) => setFilterType(e.target.value)}
          className="filter-select"
        >
          <option value="all">所有类型</option>
          {alertTypes.map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>

        <select 
          value={filterSeverity} 
          onChange={(e) => setFilterSeverity(e.target.value)}
          className="filter-select"
        >
          <option value="all">所有级别</option>
          <option value="critical">严重</option>
          <option value="warning">警告</option>
          <option value="info">信息</option>
        </select>

        <select 
          value={timeRange} 
          onChange={(e) => setTimeRange(e.target.value)}
          className="filter-select"
        >
          <option value="all">所有时间</option>
          <option value="1h">1小时内</option>
          <option value="24h">24小时内</option>
          <option value="7d">7天内</option>
        </select>
      </div>

      <div className="alert-list">
        {filteredAlerts.length === 0 ? (
          <div className="no-alerts">
            <span className="no-data-icon">✓</span>
            <span>暂无警报记录</span>
          </div>
        ) : (
          filteredAlerts.map(alert => (
            <div 
              key={alert.id} 
              className={`alert-item ${getSeverityClass(alert.severity)}`}
            >
              <div className="alert-icon">
                {alert.severity === 'critical' ? '🔴' : 
                 alert.severity === 'warning' ? '🟡' : '🔵'}
              </div>
              <div className="alert-content">
                <div className="alert-message">{alert.message}</div>
                <div className="alert-meta">
                  <span className="alert-rule">{alert.rule?.name}</span>
                  <span className="alert-time">{formatTimestamp(alert.timestamp)}</span>
                  {alert.agent && <span className="alert-agent">Agent: {alert.agent}</span>}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AlertHistory;

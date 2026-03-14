const http = require('http');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const PORT = 3001;
const REPO_OWNER = 'ks885522';
const REPO_NAME = 'Openclaw-team-Dashboard';
const LOG_FILE = path.join(__dirname, 'performance-data.json');

// 從本地日誌文件讀取 Agent Performance Data
function getAgentLogs() {
  try {
    if (fs.existsSync(LOG_FILE)) {
      const data = fs.readFileSync(LOG_FILE, 'utf-8');
      return data.split('\n').filter(line => line.trim()).map(line => JSON.parse(line));
    }
  } catch (e) {
    console.error('Error reading log file:', e);
  }
  return [];
}

// 從 GitHub API 獲取 PR 事件
function fetchGitHubPREvents(callback) {
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/pulls?state=all&per_page=50`;
  
  const options = {
    hostname: 'api.github.com',
    path: `/repos/${REPO_OWNER}/${REPO_NAME}/pulls?state=all&per_page=50`,
    method: 'GET',
    headers: {
      'User-Agent': 'OpenClaw-Dashboard',
      'Accept': 'application/vnd.github.v3+json'
    }
  };

  // 如果有 GitHub token，添加到 header（可選）
  const token = process.env.GITHUB_TOKEN;
  if (token) {
    options.headers['Authorization'] = `token ${token}`;
  }

  const req = http.request(options, (res) => {
    let data = '';
    
    // 檢查 rate limit
    if (res.statusCode === 403) {
      const rateLimitRemaining = res.headers['x-ratelimit-remaining'];
      if (rateLimitRemaining === '0') {
        console.log('GitHub API rate limit exceeded');
        callback(new Error('Rate limit exceeded'), null);
        return;
      }
    }
    
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      if (!data || data.trim() === '') {
        callback(new Error('Empty response'), null);
        return;
      }
      try {
        const prs = JSON.parse(data);
        callback(null, prs);
      } catch (e) {
        callback(e, null);
      }
    });
  });

  req.on('error', (e) => callback(e, null));
  req.end();
}

// 計算 Performance Metrics
function calculateMetrics(githubPRs, agentLogs) {
  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const oneWeekMs = 7 * oneDayMs;
  
  // 過濾近期的 PR
  const recentPRs = githubPRs.filter(pr => {
    const created = new Date(pr.created_at).getTime();
    return (now - created) < oneWeekMs;
  });

  const mergedPRs = recentPRs.filter(pr => pr.merged_at !== null);
  const closedPRs = recentPRs.filter(pr => pr.merged_at === null && pr.state === 'closed');
  
  // 計算 Output (每個 Agent 的產出)
  const outputByAgent = {};
  agentLogs.forEach(log => {
    if (log.action === 'task_completed' || log.action === 'session_end') {
      const agentId = log.agent_id || 'unknown';
      outputByAgent[agentId] = (outputByAgent[agentId] || 0) + 1;
    }
  });

  // 計算 Efficiency (基於 duration_ms)
  const durations = agentLogs
    .filter(log => log.duration_ms)
    .map(log => log.duration_ms);
  
  const avgDuration = durations.length > 0 
    ? durations.reduce((a, b) => a + b, 0) / durations.length 
    : 0;

  // 計算 Reliability (成功任務比例)
  const taskLogs = agentLogs.filter(log => 
    log.action === 'task_completed' || log.action === 'task_failed'
  );
  const successCount = taskLogs.filter(log => log.outcome === 'success').length;
  const reliability = taskLogs.length > 0 
    ? (successCount / taskLogs.length) * 100 
    : 100;

  return {
    summary: {
      totalPRs: recentPRs.length,
      mergedPRs: mergedPRs.length,
      closedPRs: closedPRs.length,
      mergeRate: recentPRs.length > 0 
        ? ((mergedPRs.length / recentPRs.length) * 100).toFixed(1) 
        : '0'
    },
    output: outputByAgent,
    efficiency: {
      avgDurationMs: Math.round(avgDuration),
      avgDurationHuman: avgDuration > 0 
        ? `${(avgDuration / 1000 / 60).toFixed(1)} min` 
        : 'N/A'
    },
    reliability: {
      totalTasks: taskLogs.length,
      successTasks: successCount,
      rate: reliability.toFixed(1)
    },
    timestamp: new Date().toISOString()
  };
}

const server = http.createServer((req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  // Sessions API
  if (url.pathname.startsWith('/api/sessions')) {
    const activeMinutes = url.searchParams.get('activeMinutes') || '60';

    exec('npx openclaw sessions list --json', (error, stdout, stderr) => {
      if (error) {
        console.error(`Error: ${error.message}`);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to fetch sessions from OpenClaw' }));
        return;
      }

      try {
        const sessions = JSON.parse(stdout);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(sessions));
      } catch (e) {
        console.error(`Parse error: ${e.message}`);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to parse OpenClaw output' }));
      }
    });
    return;
  }

  // Performance Metrics API
  if (url.pathname === '/api/performance') {
    const agentLogs = getAgentLogs();
    
    fetchGitHubPREvents((err, prs) => {
      if (err || !prs) {
        console.error('GitHub API error:', err);
        // 即使 GitHub API 失敗，仍返回基於本地日誌的數據
        const metrics = calculateMetrics([], agentLogs);
        metrics.error = 'Failed to fetch GitHub data';
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(metrics));
        return;
      }

      const metrics = calculateMetrics(prs, agentLogs);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(metrics));
    });
    return;
  }

  // Agent Logs API
  if (url.pathname === '/api/agent-logs') {
    const agentLogs = getAgentLogs();
    const agentId = url.searchParams.get('agentId');
    
    let filteredLogs = agentLogs;
    if (agentId) {
      filteredLogs = agentLogs.filter(log => log.agent_id === agentId);
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(filteredLogs));
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log(`OpenClaw Dashboard API Server running at http://localhost:${PORT}`);
  console.log(`Performance Metrics API: http://localhost:${PORT}/api/performance`);
  console.log(`Agent Logs API: http://localhost:${PORT}/api/agent-logs`);
});

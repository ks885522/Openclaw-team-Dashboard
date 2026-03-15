const http = require('http');
const { exec, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PORT = 3001;
const LOG_DIR = path.join(process.cwd(), 'logs');
const AGENT_LOG_FILE = path.join(LOG_DIR, 'agent-activity.log');
const REPO_OWNER = 'ks885522';
const REPO_NAME = 'Openclaw-team-Dashboard';

// Score configuration
const SCORE_CONFIG = {
  taskCompleted: 10,      // 完成任務
  reviewApproved: 5,      // 審查通過
  taskRejected: -3,      // 任務退回
  criticalBugFound: 15   // 發現關鍵 Bug
};

// Agent emoji to name mapping
const AGENT_MAP = {
  '⚙️': 'engineering',
  '🎨': 'art-design',
  '🔍': 'requirements',
  '📋': 'task-tracking',
  '🖼️': 'art-review',
  '🧪': 'feature-review',
  '🚀': 'devops'
};

// In-memory score storage (in production, use a database)
const agentScores = {};
const scoreHistory = [];
const MAX_SCORE_HISTORY = 500;

/**
 * Update agent score with event
 */
function updateAgentScore(agentId, eventType, points, details = {}) {
  if (!agentScores[agentId]) {
    agentScores[agentId] = 0;
  }
  agentScores[agentId] += points;
  
  // Record to history
  scoreHistory.unshift({
    agentId,
    eventType,
    points,
    newTotal: agentScores[agentId],
    details,
    timestamp: new Date().toISOString()
  });
  
  // Keep history bounded
  if (scoreHistory.length > MAX_SCORE_HISTORY) {
    scoreHistory.pop();
  }
  
  return { agentId, points, newTotal: agentScores[agentId] };
}

/**
 * Calculate scores from GitHub PR events
 */
function calculateScoresFromGitHub(prData) {
  const results = [];
  const { action, pull_request, sender } = prData;
  
  if (!pull_request) return results;
  
  const labels = pull_request.labels?.map(l => l.name) || [];
  const title = pull_request.title || '';
  const number = pull_request.number;
  
  // Determine agent from PR labels or title
  let agentId = null;
  for (const [emoji, agent] of Object.entries(AGENT_MAP)) {
    if (labels.includes(agent) || title.includes(emoji)) {
      agentId = agent;
      break;
    }
  }
  
  if (!agentId) return results;
  
  // Calculate based on action
  if (action === 'closed' && pull_request.merged) {
    // PR merged - task completed
    results.push(updateAgentScore(agentId, 'task_completed', SCORE_CONFIG.taskCompleted, {
      prNumber: number,
      prTitle: title
    }));
  } else if (action === 'closed' && !pull_request.merged) {
    // PR closed without merge - task rejected
    results.push(updateAgentScore(agentId, 'task_rejected', SCORE_CONFIG.taskRejected, {
      prNumber: number,
      prTitle: title
    }));
  }
  
  return results;
}

/**
 * Ensure log directory exists
 */
function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

/**
 * Write a log entry to the JSON log file (supports real-time)
 */
function writeAgentLog(logEntry) {
  ensureLogDir();
  
  const logLine = JSON.stringify(logEntry) + '\n';
  
  fs.appendFile(AGENT_LOG_FILE, logLine, (err) => {
    if (err) {
      console.error('[AgentLogger] Failed to write to log file:', err);
      return false;
    }
    return true;
  });
  
  return true;
}

/**
 * Read agent activity logs from file
 */
function readAgentLogs(agentId = null) {
  try {
    if (!fs.existsSync(AGENT_LOG_FILE)) {
      return [];
    }
    const content = fs.readFileSync(AGENT_LOG_FILE, 'utf-8');
    const logs = content
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(log => log !== null);
    
    if (agentId) {
      return logs.filter(log => log.agent_id === agentId);
    }
    return logs;
  } catch (err) {
    console.error('Error reading agent logs:', err);
    return [];
  }
}

/**
 * Get agent scores from GitHub PRs and commits
 * Looks for [AgentName] in commit messages and labels
 */
function calculateAgentScores() {
  const scores = {};
  
  try {
    // Get merged PRs in last 30 days
    const prs = execSync(
      `gh pr list --state merged --limit 100 --json number,title,mergedAt,labels,assignees`,
      { encoding: 'utf-8' }
    );
    const prList = JSON.parse(prs);
    
    // Get commits
    const commits = execSync(
      `gh api repos/${REPO_OWNER}/${REPO_NAME}/commits?per_page=100`,
      { encoding: 'utf-8' }
    );
    const commitList = JSON.parse(commits);
    
    // Agent emoji to name mapping
    const agentMap = {
      '⚙️': 'engineering',
      '🎨': 'art-design',
      '🔍': 'requirements',
      '📋': 'task-tracking',
      '🖼️': 'art-review',
      '🧪': 'feature-review',
      '🚀': 'devops'
    };
    
    // Count contributions from commits
    commitList.forEach(commit => {
      const message = commit.commit.message;
      for (const [emoji, agent] of Object.entries(agentMap)) {
        if (message.includes(`[${agent}]`) || message.includes(emoji)) {
          scores[agent] = (scores[agent] || 0) + 1;
        }
      }
    });
    
    // Add points from merged PRs
    prList.forEach(pr => {
      const labels = pr.labels.map(l => l.name);
      for (const [emoji, agent] of Object.entries(agentMap)) {
        if (labels.includes(agent) || labels.includes(emoji)) {
          scores[agent] = (scores[agent] || 0) + 5; // 5 points per merged PR
        }
      }
    });
    
  } catch (err) {
    console.error('Error calculating agent scores:', err.message);
    // Return empty scores if GitHub API fails
  }
  
  return scores;
}

/**
 * Calculate cost and resource metrics from logs
 * Estimates token usage and API call costs based on agent activity
 */
function calculateCostMetrics() {
  const logs = readAgentLogs();
  
  // Cost constants (approximate pricing)
  const COST_PER_1K_INPUT_TOKENS = 0.15;  // USD
  const COST_PER_1K_OUTPUT_TOKENS = 0.60;  // USD
  const AVG_INPUT_TOKENS_PER_TASK = 3000;
  const AVG_OUTPUT_TOKENS_PER_TASK = 1500;
  
  const metrics = {
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalTokens: 0,
    estimatedCostUSD: 0,
    apiCalls: 0,
    avgTaskDurationMs: 0,
    byTaskType: {
      'requirements': { count: 0, tokens: 0, cost: 0 },
      'engineering': { count: 0, tokens: 0, cost: 0 },
      'art-design': { count: 0, tokens: 0, cost: 0 },
      'task-tracking': { count: 0, tokens: 0, cost: 0 },
      'art-review': { count: 0, tokens: 0, cost: 0 },
      'feature-review': { count: 0, tokens: 0, cost: 0 },
      'devops': { count: 0, tokens: 0, cost: 0 }
    }
  };
  
  if (logs.length === 0) {
    return metrics;
  }
  
  let totalDuration = 0;
  let durationCount = 0;
  
  logs.forEach(log => {
    // Estimate tokens based on task complexity
    let inputTokens = AVG_INPUT_TOKENS_PER_TASK;
    let outputTokens = AVG_OUTPUT_TOKENS_PER_TASK;
    
    // Adjust based on task type
    if (log.task_type === 'requirements' || log.task_type === 'engineering') {
      inputTokens = 5000;
      outputTokens = 3000;
    } else if (log.task_type === 'art-design') {
      inputTokens = 2000;
      outputTokens = 1000;
    }
    
    const taskCost = (inputTokens / 1000 * COST_PER_1K_INPUT_TOKENS) + 
                     (outputTokens / 1000 * COST_PER_1K_OUTPUT_TOKENS);
    
    metrics.totalInputTokens += inputTokens;
    metrics.totalOutputTokens += outputTokens;
    metrics.totalTokens += inputTokens + outputTokens;
    metrics.estimatedCostUSD += taskCost;
    metrics.apiCalls++;
    
    // Track by task type
    const taskType = log.agent_id || log.task_type || 'engineering';
    if (!metrics.byTaskType[taskType]) {
      metrics.byTaskType[taskType] = { count: 0, tokens: 0, cost: 0 };
    }
    metrics.byTaskType[taskType].count++;
    metrics.byTaskType[taskType].tokens += inputTokens + outputTokens;
    metrics.byTaskType[taskType].cost += taskCost;
    
    // Track duration
    if (log.duration_ms) {
      totalDuration += log.duration_ms;
      durationCount++;
    }
  });
  
  metrics.avgTaskDurationMs = durationCount > 0 ? Math.round(totalDuration / durationCount) : 0;
  metrics.estimatedCostUSD = Math.round(metrics.estimatedCostUSD * 100) / 100;
  
  return metrics;
}

/**
 * Calculate performance metrics from logs
 */
function calculateLogMetrics(options = {}) {
  const { startTime, endTime } = options;
  let logs = readAgentLogs();
  
  // Filter by time range if provided
  if (startTime || endTime) {
    logs = logs.filter(log => {
      const logTime = log.timestamp ? new Date(log.timestamp).getTime() : 0;
      if (startTime && logTime < startTime) return false;
      if (endTime && logTime > endTime) return false;
      return true;
    });
  }
  
  const metrics = {
    totalTasks: 0,
    successTasks: 0,
    failedTasks: 0,
    avgDurationMs: 0,
    byAgent: {}
  };
  
  if (logs.length === 0) {
    return metrics;
  }
  
  let totalDuration = 0;
  let durationCount = 0;
  
  logs.forEach(log => {
    if (log.action === 'task_completed') {
      metrics.totalTasks++;
      metrics.successTasks++;
      if (log.duration_ms) {
        totalDuration += log.duration_ms;
        durationCount++;
      }
    } else if (log.action === 'task_failed') {
      metrics.totalTasks++;
      metrics.failedTasks++;
    }
    
    // Track by agent
    if (!metrics.byAgent[log.agent_id]) {
      metrics.byAgent[log.agent_id] = { tasks: 0, success: 0, failed: 0 };
    }
    metrics.byAgent[log.agent_id].tasks++;
    if (log.outcome === 'success') {
      metrics.byAgent[log.agent_id].success++;
    } else if (log.outcome === 'failure') {
      metrics.byAgent[log.agent_id].failed++;
    }
  });
  
  metrics.avgDurationMs = durationCount > 0 ? Math.round(totalDuration / durationCount) : 0;
  
  return metrics;
}

/**
 * Get all 7 agents with their status
 * Uses sessions data to determine agent status (idle/busy/offline)
 */
function getAgentStatus() {
  return new Promise((resolve, reject) => {
    exec('npx openclaw sessions --all-agents --json', (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      
      const jsonMatch = stdout.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        reject(new Error('Failed to parse sessions JSON'));
        return;
      }
      
      try {
        const result = JSON.parse(jsonMatch[0]);
        const sessions = result.sessions || [];
        
        // Define the 7 agents
        const agents = [
          { id: 'task-tracking', name: '指揮台', emoji: '📋' },
          { id: 'requirements', name: '透析器', emoji: '🔍' },
          { id: 'art-design', name: '調色盤', emoji: '🎨' },
          { id: 'engineering', name: '編譯器', emoji: '⚙️' },
          { id: 'art-review', name: '鑑賞家', emoji: '🖼️' },
          { id: 'feature-review', name: '測試台', emoji: '🧪' },
          { id: 'devops', name: '部署艦', emoji: '🚀' }
        ];
        
        // Get the most recent session for each agent
        const agentLatestSession = {};
        sessions.forEach(session => {
          const agentId = session.agentId;
          if (!agentLatestSession[agentId] || session.updatedAt > agentLatestSession[agentId].updatedAt) {
            agentLatestSession[agentId] = session;
          }
        });
        
        // Determine status for each agent
        const now = Date.now();
        const ACTIVE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
        
        const agentStatusList = agents.map(agent => {
          const latestSession = agentLatestSession[agent.id];
          
          let status = 'offline';
          let lastActive = null;
          
          if (latestSession) {
            const ageMs = latestSession.ageMs || 0;
            const timeSinceUpdate = now - (latestSession.updatedAt || now);
            
            if (timeSinceUpdate < ACTIVE_THRESHOLD_MS) {
              status = 'busy';
            } else {
              status = 'idle';
            }
            lastActive = latestSession.updatedAt ? new Date(latestSession.updatedAt).toISOString() : null;
          }
          
          return {
            id: agent.id,
            name: agent.name,
            emoji: agent.emoji,
            status: status,
            lastActive: lastActive,
            sessionId: latestSession?.sessionId || null,
            model: latestSession?.model || null
          };
        });
        
        resolve(agentStatusList);
      } catch (e) {
        reject(e);
      }
    });
  });
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // SSE endpoint for real-time log streaming
  if (req.url.startsWith('/api/logs/stream')) {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const agentId = url.searchParams.get('agent_id');
    
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });
    
    // Send initial connection message
    res.write(`data: ${JSON.stringify({ type: 'connected', message: 'SSE connection established' })}\n\n`);
    
    // Track last log position for new entries
    let lastSize = 0;
    try {
      if (fs.existsSync(AGENT_LOG_FILE)) {
        lastSize = fs.statSync(AGENT_LOG_FILE).size;
      }
    } catch (e) {}
    
    // Poll for new logs every 1 second
    const intervalId = setInterval(() => {
      try {
        if (fs.existsSync(AGENT_LOG_FILE)) {
          const currentSize = fs.statSync(AGENT_LOG_FILE).size;
          
          if (currentSize > lastSize) {
            // Read new content
            const stream = fs.createReadStream(AGENT_LOG_FILE, { start: lastSize });
            let newContent = '';
            
            stream.on('data', (chunk) => {
              newContent += chunk.toString();
            });
            
            stream.on('end', () => {
              const newLines = newContent.split('\n').filter(line => line.trim());
              newLines.forEach(line => {
                try {
                  const log = JSON.parse(line);
                  // Filter by agent_id if specified
                  if (!agentId || log.agent_id === agentId) {
                    res.write(`data: ${JSON.stringify({ type: 'log', ...log })}\n\n`);
                  }
                } catch (e) {}
              });
            });
            
            lastSize = currentSize;
          }
        }
      } catch (e) {
        console.error('[SSE] Error reading log file:', e.message);
      }
    }, 1000);
    
    // Clean up on close
    req.on('close', () => {
      clearInterval(intervalId);
      res.end();
    });
    
    return;
  }

  // SSE endpoint for real-time agent status updates
  if (req.url.startsWith('/api/agent-status/stream')) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });
    
    // Send initial connection message
    res.write(`data: ${JSON.stringify({ type: 'connected', message: 'Agent status SSE connection established' })}\n\n`);
    
    // Store last known status to detect changes
    let lastAgentStatus = null;
    
    // Poll for agent status every 5 seconds (as per requirement)
    const intervalId = setInterval(async () => {
      try {
        const agentStatus = await getAgentStatus();
        const currentStatus = JSON.stringify(agentStatus);
        
        // Compare with last known status
        if (lastAgentStatus !== null && currentStatus !== lastAgentStatus) {
          // Status changed - send update
          res.write(`data: ${JSON.stringify({ type: 'status_update', agents: agentStatus.agents, timestamp: new Date().toISOString() })}\n\n`);
        }
        
        lastAgentStatus = currentStatus;
      } catch (e) {
        console.error('[Agent Status SSE] Error:', e.message);
      }
    }, 5000);
    
    // Clean up on close
    req.on('close', () => {
      clearInterval(intervalId);
      res.end();
    });
    
    return;
  }

  if (req.url.startsWith('/api/agent-logs')) {
    // POST: Create a new log entry (real-time logging)
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      req.on('end', () => {
        try {
          const logEntry = JSON.parse(body);
          
          // Validate required fields
          if (!logEntry.agent_id || !logEntry.action || !logEntry.outcome) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Missing required fields: agent_id, action, outcome' }));
            return;
          }
          
          // Add timestamp if not provided
          if (!logEntry.timestamp) {
            logEntry.timestamp = new Date().toISOString();
          }
          
          // Write to file
          const success = writeAgentLog(logEntry);
          
          if (success) {
            res.writeHead(201, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, log: logEntry }));
          } else {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Failed to write log' }));
          }
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON: ' + err.message }));
        }
      });
      return;
    }
    
    // GET: Read logs
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const agentId = url.searchParams.get('agent_id');
    
    const logs = readAgentLogs(agentId);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(logs));
  } else if (req.url.startsWith('/api/performance')) {
    // Performance metrics endpoint
    try {
      // Get time range from query params
      const url = new URL(req.url, `http://localhost:${PORT}`);
      const days = parseInt(url.searchParams.get('days') || '30', 10);
      const startTimeParam = url.searchParams.get('start_time');
      const endTimeParam = url.searchParams.get('end_time');
      
      // Calculate time range
      let startTime, endTime;
      if (startTimeParam) {
        startTime = new Date(startTimeParam).getTime();
      } else {
        const now = new Date();
        endTime = now.getTime();
        startTime = now.getTime() - (days * 24 * 60 * 60 * 1000);
      }
      if (endTimeParam) {
        endTime = new Date(endTimeParam).getTime();
      }
      
      // Calculate metrics with time range filter
      const logMetrics = calculateLogMetrics({ startTime, endTime });
      const agentScores = calculateAgentScores();
      const costMetrics = calculateCostMetrics();
      
      // Get PR stats
      let prStats = { total: 0, merged: 0, closed: 0 };
      try {
        const prs = execSync(
          `gh pr list --state all --limit 100 --json number,state,mergedAt,closedAt`,
          { encoding: 'utf-8' }
        );
        const prList = JSON.parse(prs);
        prStats.total = prList.length;
        prStats.merged = prList.filter(pr => pr.mergedAt).length;
        prStats.closed = prList.filter(pr => !pr.mergedAt && pr.closedAt).length;
      } catch (e) {
        console.error('Error fetching PR stats:', e.message);
      }
      
      const response = {
        summary: {
          totalPRs: prStats.total,
          mergedPRs: prStats.merged,
          closedPRs: prStats.closed,
          mergeRate: prStats.total > 0 
            ? ((prStats.merged / prStats.total) * 100).toFixed(1) + '%' 
            : '0%'
        },
        output: agentScores,
        efficiency: {
          avgDurationMs: logMetrics.avgDurationMs,
          avgDurationHuman: logMetrics.avgDurationMs > 0 
            ? Math.round(logMetrics.avgDurationMs / 1000) + 's' 
            : 'N/A'
        },
        reliability: {
          totalTasks: logMetrics.totalTasks,
          successTasks: logMetrics.successTasks,
          rate: logMetrics.totalTasks > 0 
            ? ((logMetrics.successTasks / logMetrics.totalTasks) * 100).toFixed(1) + '%' 
            : '0%'
        },
        cost: {
          totalTokens: costMetrics.totalTokens,
          totalInputTokens: costMetrics.totalInputTokens,
          totalOutputTokens: costMetrics.totalOutputTokens,
          estimatedCostUSD: costMetrics.estimatedCostUSD,
          apiCalls: costMetrics.apiCalls,
          avgTaskDurationMs: costMetrics.avgTaskDurationMs,
          byTaskType: costMetrics.byTaskType
        },
        byAgent: logMetrics.byAgent,
        timestamp: new Date().toISOString()
      };
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(response));
    } catch (err) {
      console.error('Error calculating performance metrics:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        error: err.message,
        timestamp: new Date().toISOString()
      }));
    }
  // ==================== Score API Endpoints ====================
  } else if (req.url === '/api/scores' && req.method === 'GET') {
    // Get all agent scores
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      scores: agentScores,
      history: scoreHistory.slice(0, 50), // Last 50 events
      config: SCORE_CONFIG
    }));
    return;
  } else if (req.url === '/api/scores/leaderboard' && req.method === 'GET') {
    // Get leaderboard sorted by score
    const leaderboard = Object.entries(agentScores)
      .map(([agentId, score]) => ({ agentId, score }))
      .sort((a, b) => b.score - a.score);
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(leaderboard));
    return;
  } else if (req.url === '/api/scores/reset' && req.method === 'POST') {
    // Reset all scores (admin only - no auth for demo)
    Object.keys(agentScores).forEach(key => delete agentScores[key]);
    scoreHistory.length = 0;
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, message: 'All scores reset' }));
    return;
  } else if (req.url.startsWith('/api/webhooks/github') && req.method === 'POST') {
    // GitHub webhook endpoint for PR events
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const event = req.headers['x-github-event'];
        const payload = JSON.parse(body);
        
        console.log(`[Webhook] Received GitHub event: ${event}`);
        
        if (event === 'pull_request') {
          const results = calculateScoresFromGitHub(payload);
          results.forEach(r => {
            console.log(`[Score] ${r.agentId}: ${r.points > 0 ? '+' : ''}${r.points} pts (Total: ${r.newTotal})`);
          });
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, events: results }));
        } else {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, message: `Event ${event} ignored` }));
        }
      } catch (err) {
        console.error('[Webhook] Error:', err.message);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  } else if (req.url.startsWith('/api/github/repos/') && req.method === 'POST') {
    // GitHub API proxy for creating issues
    // Format: /api/github/repos/{owner}/{repo}/issues
    // Or: /api/github/repos/{owner}/{repo}/issues/{issueNumber}/comments
    const urlMatch = req.url.match(/^\/api\/github\/repos\/([^/]+)\/([^/]+)\/(.+)$/);
    
    if (!urlMatch) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid URL format. Use /api/github/repos/{owner}/{repo}/issues' }));
      return;
    }
    
    const [, owner, repo, endpoint] = urlMatch;
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    
    if (!GITHUB_TOKEN) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'GITHUB_TOKEN not configured on server' }));
      return;
    }
    
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        let githubApiUrl, method, requestBody;
        
        if (endpoint === 'issues') {
          // Create new issue
          githubApiUrl = `https://api.github.com/repos/${owner}/${repo}/issues`;
          method = 'POST';
          requestBody = {
            title: data.title,
            body: data.body,
            labels: data.labels || [],
            assignee: data.assignee
          };
        } else if (endpoint.match(/^issues\/\d+\/comments$/)) {
          // Add comment to issue
          const issueNumber = endpoint.match(/issues\/(\d+)\/comments/)[1];
          githubApiUrl = `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/comments`;
          method = 'POST';
          requestBody = { body: data.body };
        } else {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Unsupported endpoint. Use /issues or /issues/{number}/comments' }));
          return;
        }
        
        const response = await fetch(githubApiUrl, {
          method,
          headers: {
            'Authorization': `token ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });
        
        const result = await response.json();
        
        if (!response.ok) {
          res.writeHead(response.status, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: result.message || 'GitHub API error', details: result }));
          return;
        }
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err) {
        console.error('[GitHub API Proxy] Error:', err.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  } else if (req.url === '/api/scores' && req.method === 'POST') {
    // Manual score update (for testing)
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        if (!data.agentId || !data.eventType || data.points === undefined) {
          throw new Error('Missing required fields: agentId, eventType, points');
        }
        
        const result = updateAgentScore(data.agentId, data.eventType, data.points, data.details || {});
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  } else if (req.url.startsWith('/api/sessions')) {
    // Correct command is 'openclaw sessions --all-agents --json'
    exec('npx openclaw sessions --all-agents --json', (error, stdout, stderr) => {
      // Find the JSON object (starts with { and ends with })
      const jsonMatch = stdout.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        console.error(`Fatal Error: Could not find JSON in output. stdout: ${stdout.substring(0, 500)}`);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to find JSON in OpenClaw output' }));
        return;
      }

      try {
        const result = JSON.parse(jsonMatch[0]);
        // The CLI returns { sessions: [...], ... }. Frontend expects the array directly.
        const sessionsArray = result.sessions || [];
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(sessionsArray));
      } catch (e) {
        console.error(`Parse error: ${e.message}`);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to parse OpenClaw output', details: e.message }));
      }
    });
  } else if (req.url.startsWith('/api/agent-status')) {
    // Agent status endpoint
    getAgentStatus()
      .then(agentStatusList => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          agents: agentStatusList,
          timestamp: new Date().toISOString()
        }));
      })
      .catch(err => {
        console.error('Error getting agent status:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      });
  } else if (req.url.startsWith('/api/create-issue')) {
    // Auto-create GitHub Issue with screenshot attachment
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          
          // Validate required fields
          if (!data.title) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Missing required field: title' }));
            return;
          }
          
          const title = data.title;
          const description = data.description || '';
          const labels = data.labels || ['design-needed', 'art-review-needed'];
          const imageBase64 = data.image; // Base64 encoded image (optional)
          
          // Create temp file for image if provided
          let imagePath = null;
          const tempDir = path.join(process.cwd(), 'temp');
          if (imageBase64) {
            if (!fs.existsSync(tempDir)) {
              fs.mkdirSync(tempDir, { recursive: true });
            }
            imagePath = path.join(tempDir, `screenshot-${Date.now()}.png`);
            // Remove data URL prefix if present
            const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
            fs.writeFileSync(imagePath, Buffer.from(base64Data, 'base64'));
          }
          
          // Build gh issue create command
          let cmd = `gh issue create --title "${title.replace(/"/g, '\\"')}"`;
          
          if (description) {
            cmd += ` --body "${description.replace(/"/g, '\\"')}"`;
          }
          
          if (labels && labels.length > 0) {
            cmd += ` --label "${labels.join(',')}"`;
          }
          
          exec(cmd, { cwd: process.cwd() }, (error, stdout, stderr) => {
            // Clean up temp image file
            if (imagePath && fs.existsSync(imagePath)) {
              fs.unlinkSync(imagePath);
            }
            
            if (error) {
              console.error('Error creating issue:', error.message);
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Failed to create issue: ' + error.message }));
              return;
            }
            
            // Extract issue number from output
            const issueUrl = stdout.trim();
            const issueNumberMatch = issueUrl.match(/\/issues\/(\d+)$/);
            const issueNumber = issueNumberMatch ? issueNumberMatch[1] : null;
            
            // If image was provided, add it as a comment
            if (imageBase64 && imagePath) {
              // Re-create temp file for upload
              const uploadPath = path.join(tempDir, `upload-${Date.now()}.png`);
              const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
              fs.writeFileSync(uploadPath, Buffer.from(base64Data, 'base64'));
              
              // Upload image to GitHub and add as comment
              const uploadCmd = `gh issue comment ${issueNumber} --body "📸 截圖附件: ${issueUrl}"`;
              exec(uploadCmd, { cwd: process.cwd() }, (err2, stdout2, stderr2) => {
                // Clean up
                if (fs.existsSync(uploadPath)) {
                  fs.unlinkSync(uploadPath);
                }
                
                if (err2) {
                  console.error('Error adding comment:', err2.message);
                }
              });
            }
            
            res.writeHead(201, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: true,
              issue_url: issueUrl,
              issue_number: issueNumber,
              labels: labels
            }));
          });
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON: ' + err.message }));
        }
      });
      return;
    } else {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Method not allowed. Use POST.' }));
    }
  } else if (req.url.startsWith('/api/tasks')) {
    // Task tracking endpoint - Get tasks from GitHub Issues
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const status = url.searchParams.get('status') || 'open'; // open, closed, all
    const assignee = url.searchParams.get('assignee'); // filter by assignee
    const labels = url.searchParams.get('labels'); // filter by labels
    
    try {
      // Build gh issue list command
      let cmd = `gh issue list --state ${status} --limit 100 --json number,title,state,createdAt,closedAt,labels,assignees`;
      
      exec(cmd, { cwd: process.cwd() }, (error, stdout, stderr) => {
        if (error) {
          console.error('Error fetching issues:', error.message);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Failed to fetch tasks: ' + error.message }));
          return;
        }
        
        try {
          let issues = JSON.parse(stdout);
          
          // Filter by assignee if provided
          if (assignee) {
            issues = issues.filter(issue => 
              issue.assignees && issue.assignees.some(a => a.login === assignee)
            );
          }
          
          // Filter by labels if provided
          if (labels) {
            const labelList = labels.split(',');
            issues = issues.filter(issue =>
              issue.labels && issue.labels.some(l => labelList.includes(l.name))
            );
          }
          
          // Transform to task format
          const tasks = issues.map(issue => {
            // Determine task status
            let taskStatus = 'pending';
            if (issue.state === 'CLOSED') {
              taskStatus = 'completed';
            }
            
            // Extract task type from labels
            const taskType = issue.labels.find(l => 
              ['frontend', 'backend', 'devops'].includes(l.name)
            )?.name || 'unknown';
            
            return {
              id: issue.number,
              title: issue.title,
              status: taskStatus,
              type: taskType,
              labels: issue.labels.map(l => l.name),
              createdAt: issue.createdAt,
              closedAt: issue.closedAt,
              assignees: issue.assignees.map(a => a.login)
            };
          });
          
          // Get agent activity for in-progress tasks
          const activeTasks = tasks.filter(t => t.status === 'pending');
          const completedTasks = tasks.filter(t => t.status === 'completed');
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            tasks: tasks,
            summary: {
              total: tasks.length,
              active: activeTasks.length,
              completed: completedTasks.length
            },
            timestamp: new Date().toISOString()
          }));
        } catch (parseErr) {
          console.error('Error parsing issues:', parseErr.message);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Failed to parse tasks' }));
        }
      });
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
  } else if (req.url.startsWith('/api/agent/control')) {
    // Agent control endpoints: pause, terminate, retry, override
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          const { action, agent_id, session_id, prompt_override, task_id } = data;
          
          // Validate required fields
          if (!action || !['pause', 'terminate', 'retry', 'override'].includes(action)) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid action. Must be: pause, terminate, retry, or override' }));
            return;
          }
          
          if (!agent_id) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Missing required field: agent_id' }));
            return;
          }
          
          let result = {
            success: true,
            action: action,
            agent_id: agent_id,
            timestamp: new Date().toISOString()
          };
          
          // Execute the action
          switch (action) {
            case 'pause':
              // For now, we'll just log the pause action
              // In a real implementation, this would pause the agent session
              console.log(`[AgentControl] Pausing agent: ${agent_id}, session: ${session_id}`);
              result.message = `Agent ${agent_id} paused`;
              break;
              
            case 'terminate':
              // Terminate the agent session via gateway
              console.log(`[AgentControl] Terminating agent: ${agent_id}, session: ${session_id}`);
              // Use gateway call if session_id provided
              if (session_id) {
                exec(`npx openclaw gateway call session_kill --params '{"sessionId":"${session_id}"}'`, (err, stdout, stderr) => {
                  if (err) {
                    console.error('Error terminating session:', err.message);
                  }
                });
              }
              result.message = `Agent ${agent_id} terminated`;
              break;
              
            case 'retry':
              // Retry a failed task
              console.log(`[AgentControl] Retrying task: ${task_id} for agent: ${agent_id}`);
              result.message = `Task ${task_id} retry initiated`;
              break;
              
            case 'override':
              // Override agent prompt
              console.log(`[AgentControl] Overriding prompt for agent: ${agent_id}`);
              if (!prompt_override) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'prompt_override is required for override action' }));
                return;
              }
              result.message = `Prompt override applied for agent ${agent_id}`;
              result.prompt_override = prompt_override;
              break;
          }
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
          
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON: ' + err.message }));
        }
      });
      return;
    }
    
    // GET: Return available control actions
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      actions: ['pause', 'terminate', 'retry', 'override'],
      usage: {
        pause: 'POST { "action": "pause", "agent_id": "engineering", "session_id": "xxx" }',
        terminate: 'POST { "action": "terminate", "agent_id": "engineering", "session_id": "xxx" }',
        retry: 'POST { "action": "retry", "agent_id": "engineering", "task_id": 123 }',
        override: 'POST { "action": "override", "agent_id": "engineering", "prompt_override": "new prompt" }'
      }
    }));
  } else if (req.url.startsWith('/api/alerts')) {
    // Alert Rules Engine endpoints
    if (req.url === '/api/alerts' && req.method === 'GET') {
      // Get all alert rules and history
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ rules: alertRules, history: alertHistory }));
      return;
    }
    
    // Check alerts manually
    if (req.url === '/api/alerts/check' && req.method === 'POST') {
      checkAlertRules().then(triggered => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ checked: true, triggered: triggered }));
      });
      return;
    }
    
    // Update alert rule
    if (req.url.startsWith('/api/alerts/') && req.method === 'PATCH') {
      const ruleId = req.url.split('/').pop();
      let body = '';
      req.on('data', chunk => { body += chunk.toString(); });
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          const rule = alertRules.find(r => r.id === ruleId);
          if (!rule) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Rule not found' }));
            return;
          }
          if (data.enabled !== undefined) rule.enabled = data.enabled;
          if (data.threshold !== undefined) rule.threshold = data.threshold;
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, rule }));
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      });
      return;
    }
    
    // Reset alert rule
    if (req.url.startsWith('/api/alerts/') && req.method === 'DELETE') {
      const ruleId = req.url.split('/').pop();
      const success = resetAlertRule(ruleId);
      res.writeHead(success ? 200 : 404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success, ruleId }));
      return;
    }
    
    // Record E2E result
    if (req.url === '/api/alerts/e2e' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk.toString(); });
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          recordE2EResult(data.status || 'unknown');
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      });
      return;
    }
    
    // GET: Return available alert endpoints
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      endpoints: [
        'GET /api/alerts - Get all alert rules and history',
        'POST /api/alerts/check - Check alert rules manually',
        'PATCH /api/alerts/:id - Update rule (enabled, threshold)',
        'DELETE /api/alerts/:id - Reset triggered alert',
        'POST /api/alerts/e2e - Record E2E test result'
      ]
    }));
  } else if (req.url.startsWith('/api/webhooks/config') && req.method === 'GET') {
    // Webhook Configuration Endpoint
    res.writeHead(200, { 'Content-Type': 'application/json' });
    // 隱藏敏感資訊
    const safeConfigs = {};
    for (const [channel, config] of Object.entries(webhookConfigs)) {
      safeConfigs[channel] = {
        enabled: config.enabled,
        url: config.url ? '***configured***' : '',
        channel: config.channel
      };
    }
    res.end(JSON.stringify(safeConfigs));
  } else if (req.url.startsWith('/api/webhooks/config') && req.method === 'PUT') {
    // Update Webhook Configuration
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const { channel, url, enabled, channel: channelName } = data;
        
        if (!channel || !['slack', 'discord', 'feishu'].includes(channel)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid channel. Use: slack, discord, or feishu' }));
          return;
        }
        
        webhookConfigs[channel] = {
          enabled: enabled !== undefined ? enabled : webhookConfigs[channel].enabled,
          url: url || webhookConfigs[channel].url,
          channel: channelName !== undefined ? channelName : webhookConfigs[channel].channel
        };
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, channel }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
  } else if (req.url.startsWith('/api/webhooks/send') && req.method === 'POST') {
    // Send Webhook Notification
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        const { channel, message, title, color, fields } = data;
        
        if (!channel || !message) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing required fields: channel, message' }));
          return;
        }
        
        const result = await sendWebhookNotification(channel, message, { title, color, fields });
        res.writeHead(result.success ? 200 : 400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

// Alert Rules Engine
const alertRules = [
  { id: 'e2e-fail-3', name: 'E2E 連續失敗 3 次', type: 'e2e_failure', threshold: 3, enabled: true, triggered: false, lastTriggered: null },
  { id: 'agent-offline-5min', name: 'Agent 離線 5 分鐘', type: 'agent_offline', threshold: 5 * 60 * 1000, enabled: true, triggered: false, lastTriggered: null },
  { id: 'token-anomaly', name: 'Token 消耗異常', type: 'token_anomaly', threshold: 100000, enabled: true, triggered: false, lastTriggered: null }
];
const e2eResults = [];
const MAX_E2E_RESULTS = 100;
const alertHistory = [];
const MAX_ALERT_HISTORY = 50;

async function checkAlertRules() {
  return new Promise(async (resolve) => {
    const triggeredAlerts = [];
    const e2eRule = alertRules.find(r => r.id === 'e2e-fail-3');
    if (e2eRule && e2eRule.enabled) {
      const recentFailures = e2eResults.filter(r => r.status === 'failure').slice(-e2eRule.threshold);
      if (recentFailures.length >= e2eRule.threshold && !e2eRule.triggered) {
        e2eRule.triggered = true;
        e2eRule.lastTriggered = new Date().toISOString();
        triggeredAlerts.push({ rule: e2eRule, message: `E2E 測試連續失敗 ${e2eRule.threshold} 次`, severity: 'critical' });
      }
    }
    const offlineRule = alertRules.find(r => r.id === 'agent-offline-5min');
    if (offlineRule && offlineRule.enabled) {
      getAgentStatus().then(async (agentStatusList) => {
        const offlineAgents = agentStatusList.filter(a => a.status === 'offline');
        offlineAgents.forEach(agent => {
          if (agent.lastActive) {
            const offlineMs = Date.now() - new Date(agent.lastActive).getTime();
            if (offlineMs >= offlineRule.threshold && !offlineRule.triggered) {
              offlineRule.triggered = true;
              offlineRule.lastTriggered = new Date().toISOString();
              triggeredAlerts.push({ rule: offlineRule, message: `Agent ${agent.name} (${agent.id}) 已離線超過 5 分鐘`, severity: 'warning', agent: agent.id });
            }
          }
        });
        triggeredAlerts.forEach(alert => {
          alertHistory.unshift({ ...alert, timestamp: new Date().toISOString() });
          if (alertHistory.length > MAX_ALERT_HISTORY) alertHistory.pop();
        });
        // Send webhook notifications for triggered alerts
        await sendAlertWebhooks(triggeredAlerts);
        resolve(triggeredAlerts);
      });
    } else {
      triggeredAlerts.forEach(alert => {
        alertHistory.unshift({ ...alert, timestamp: new Date().toISOString() });
        if (alertHistory.length > MAX_ALERT_HISTORY) alertHistory.pop();
      });
      // Send webhook notifications for triggered alerts
      await sendAlertWebhooks(triggeredAlerts);
      resolve(triggeredAlerts);
    }
  });
}

/**
 * Send alert notifications to all enabled webhook channels
 */
async function sendAlertWebhooks(alerts) {
  if (!alerts || alerts.length === 0) return;
  
  for (const alert of alerts) {
    const severity = alert.severity || 'info';
    const color = severity === 'critical' ? '#FF0000' : severity === 'warning' ? '#FFA500' : '#36a64f';
    
    const message = alert.message || 'Alert triggered';
    const title = `🚨 ${alert.rule?.name || 'Alert'}`;
    
    const fields = [
      { title: 'Severity', value: severity, short: true },
      { title: 'Time', value: alert.timestamp || new Date().toISOString(), short: true }
    ];
    
    // Send to all enabled channels
    for (const channel of ['slack', 'discord', 'feishu']) {
      const result = await sendWebhookNotification(channel, message, { title, color, fields });
      if (result.success) {
        console.log(`[AlertWebhook] Sent ${channel} notification: ${message}`);
      }
    }
  }
}

// Webhook Configuration Storage
const webhookConfigs = {
  slack: { enabled: false, url: '', channel: '' },
  discord: { enabled: false, url: '', channel: '' },
  feishu: { enabled: false, url: '' }
};

/**
 * Send webhook notification to specified channel
 */
async function sendWebhookNotification(channel, message, options = {}) {
  const config = webhookConfigs[channel];
  if (!config || !config.enabled || !config.url) {
    return { success: false, error: 'Webhook not configured or disabled' };
  }

  let payload;
  const { title, color, fields } = options;

  if (channel === 'slack') {
    payload = {
      text: message,
      attachments: [{
        color: color || '#36a64f',
        fields: fields ? fields.map(f => ({ title: f.title, value: f.value, short: f.short })) : []
      }]
    };
  } else if (channel === 'discord') {
    payload = {
      content: message,
      embeds: [{
        title: title || 'OpenClaw Notification',
        color: parseInt(color?.replace('#', '') || '36a64f', 16),
        fields: fields ? fields.map(f => ({ name: f.title, value: f.value, inline: f.short })) : [],
        timestamp: new Date().toISOString()
      }]
    };
  } else if (channel === 'feishu') {
    // 飛書 Webhook 使用 Card 訊息格式
    payload = {
      msg_type: 'interactive',
      card: {
        config: { wide_screen_mode: true },
        header: { title: { tag: 'plain_text', content: title || 'OpenClaw Notification' }, color: color || 'green' },
        elements: [
          { tag: 'markdown', content: message }
        ]
      }
    };
  }

  try {
    const response = await fetch(config.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return { success: response.ok, status: response.status };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function recordE2EResult(status) {
  e2eResults.push({ status, timestamp: new Date().toISOString() });
  if (e2eResults.length > MAX_E2E_RESULTS) e2eResults.shift();
}

function resetAlertRule(ruleId) {
  const rule = alertRules.find(r => r.id === ruleId);
  if (rule) { rule.triggered = false; return true; }
  return false;
}

server.listen(PORT, () => {
  console.log(`OpenClaw Dashboard API Server running at http://localhost:${PORT}`);
});

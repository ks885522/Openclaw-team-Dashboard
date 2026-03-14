const http = require('http');
const { exec, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PORT = 3001;
const LOG_DIR = path.join(process.cwd(), 'logs');
const AGENT_LOG_FILE = path.join(LOG_DIR, 'agent-activity.log');
const REPO_OWNER = 'ks885522';
const REPO_NAME = 'Openclaw-team-Dashboard';

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
function calculateLogMetrics() {
  const logs = readAgentLogs();
  
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

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url.startsWith('/api/agent-logs')) {
    // Get query param for agent_id filter
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
      
      // Calculate metrics
      const logMetrics = calculateLogMetrics();
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
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(PORT, () => {
  console.log(`OpenClaw Dashboard API Server running at http://localhost:${PORT}`);
});

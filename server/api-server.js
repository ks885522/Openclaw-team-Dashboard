const http = require('http');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const PORT = 3001;
const LOG_DIR = path.join(process.cwd(), 'logs');
const AGENT_LOG_FILE = path.join(LOG_DIR, 'agent-activity.log');

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

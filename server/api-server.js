const http = require('http');
const { exec } = require('child_process');

const PORT = 3001;

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

  if (req.url.startsWith('/api/sessions')) {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const activeMinutes = url.searchParams.get('activeMinutes') || '60';

    // Call OpenClaw CLI to get session list
    // We use --json flag to get machine-readable output
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
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(PORT, () => {
  console.log(`OpenClaw Dashboard API Server running at http://localhost:${PORT}`);
});

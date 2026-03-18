#!/usr/bin/env node

/**
 * Hardcoded Scanner CLI Tool
 * 掃描 Codebase 中違反 ENVIRONMENT.md 的硬編碼
 * 
 * Usage:
 *   node scripts/hardcoded-scanner.js [--format=json|text] [--output=path] [--fix]
 */

const fs = require('fs');
const path = require('path');

// Scanner rules based on ENVIRONMENT.md
const RULES = {
  // Port hardcoding: 3000, 3001, 3002, 8080, 5173
  PORT: {
    name: 'Port Hardcoding',
    pattern: /\b(3000|3001|3002|8080|5173)\b/g,
    severity: 'error',
    description: 'Hardcoded port number found. Use environment variables instead.'
  },
  
  // URL hardcoding (excluding localhost, ENV vars, VITE_ prefixes)
  URL: {
    name: 'URL Hardcoding',
    pattern: /https?:\/\/(?!localhost|127\.0\.0\.1|{{\.|{{\{|ENV_|VITE_|REACT_APP_)[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    severity: 'error',
    description: 'Hardcoded URL found. Use environment variables or config files.'
  },
  
  // API Key / Token patterns
  APIKEY: {
    name: 'API Key/Token',
    pattern: /(api[_-]?key|token|secret|password|pwd|auth)['":\s=]+['"][a-zA-Z0-9_\-]{16,}['"]/gi,
    severity: 'critical',
    description: 'Potential hardcoded API key or token found.'
  },
  
  // Direct process.env access without allowed list
  ENV: {
    name: 'Direct Environment Access',
    pattern: /process\.env\.(?!PORT|GITHUB_TOKEN|OPENCLAW_API_URL|VITE_|NODE_ENV|LOG_LEVEL|CACHE_TTL|SESSION_TIMEOUT)[A-Z_]+/g,
    severity: 'warning',
    description: 'Direct process.env access. Consider adding to ENVIRONMENT.md allowed list.'
  }
};

// Directories and files to scan
const SCAN_TARGETS = [
  'server',
  'src',
  'scripts'
];

// Files and patterns to exclude
const EXCLUDE_PATTERNS = [
  /node_modules/,
  /\.git/,
  /dist/,
  /\.vite/,
  /logs/,
  /temp/,
  /ENVIRONMENT\.md/,
  /hardcoded-scanner\.js/
];

// File extensions to scan
const SCAN_EXTENSIONS = ['.js', '.ts', '.tsx', '.jsx', '.json', '.env', '.env.example'];

/**
 * Find all files to scan
 */
function findFiles(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    // Skip excluded patterns
    if (EXCLUDE_PATTERNS.some(pattern => pattern.test(fullPath))) {
      continue;
    }
    
    if (entry.isDirectory()) {
      findFiles(fullPath, files);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (SCAN_EXTENSIONS.includes(ext) || entry.name.startsWith('.env')) {
        files.push(fullPath);
      }
    }
  }
  
  return files;
}

/**
 * Scan a single file for violations
 */
function scanFile(filePath) {
  const violations = [];
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  for (const [ruleKey, rule] of Object.entries(RULES)) {
    // Reset regex lastIndex
    rule.pattern.lastIndex = 0;
    
    // Find all matches
    let match;
    while ((match = rule.pattern.exec(content)) !== null) {
      // Calculate line number
      const lineNumber = content.substring(0, match.index).split('\n').length;
      const line = lines[lineNumber - 1]?.trim() || '';
      
      // Skip comments explaining the value
      if (line.match(/^\/\/.*example|^\/\*.*example|^\s*\*|^\s*#/)) {
        continue;
      }
      
      violations.push({
        rule: ruleKey,
        name: rule.name,
        severity: rule.severity,
        description: rule.description,
        file: filePath,
        line: lineNumber,
        content: line,
        match: match[0]
      });
    }
  }
  
  return violations;
}

/**
 * Main scanner function
 */
function scan(options = {}) {
  console.log('🔍 Hardcoded Scanner');
  console.log('====================\n');
  
  const allFiles = [];
  
  // Find files to scan
  for (const target of SCAN_TARGETS) {
    const targetPath = path.join(process.cwd(), target);
    if (fs.existsSync(targetPath)) {
      findFiles(targetPath, allFiles);
    }
  }
  
  console.log(`Scanning ${allFiles.length} files...\n`);
  
  const allViolations = [];
  let scannedCount = 0;
  
  for (const file of allFiles) {
    const violations = scanFile(file);
    if (violations.length > 0) {
      allViolations.push(...violations);
    }
    scannedCount++;
  }
  
  // Summary by severity
  const summary = {
    critical: 0,
    error: 0,
    warning: 0
  };
  
  for (const v of allViolations) {
    summary[v.severity]++;
  }
  
  // Output results
  if (options.format === 'json') {
    const result = {
      summary,
      violations: allViolations,
      scannedFiles: scannedCount,
      timestamp: new Date().toISOString()
    };
    
    if (options.output) {
      fs.writeFileSync(options.output, JSON.stringify(result, null, 2));
      console.log(`📄 Report saved to: ${options.output}`);
    } else {
      console.log(JSON.stringify(result, null, 2));
    }
  } else {
    // Text format
    console.log('📊 Summary');
    console.log('─'.repeat(40));
    console.log(`  🔴 Critical: ${summary.critical}`);
    console.log(`  🟠 Error:   ${summary.error}`);
    console.log(`  🟡 Warning: ${summary.warning}`);
    console.log(`  📁 Files:   ${scannedCount}`);
    console.log('');
    
    if (allViolations.length > 0) {
      console.log('⚠️  Violations Found');
      console.log('─'.repeat(40));
      
      // Group by file
      const byFile = {};
      for (const v of allViolations) {
        if (!byFile[v.file]) byFile[v.file] = [];
        byFile[v.file].push(v);
      }
      
      for (const [file, violations] of Object.entries(byFile)) {
        const relativePath = path.relative(process.cwd(), file);
        console.log(`\n📄 ${relativePath}`);
        for (const v of violations) {
          const emoji = v.severity === 'critical' ? '🔴' : v.severity === 'error' ? '🟠' : '🟡';
          console.log(`  ${emoji} Line ${v.line}: [${v.name}] ${v.match}`);
          console.log(`      ${v.description}`);
        }
      }
    } else {
      console.log('✅ No violations found!');
    }
  }
  
  // Exit code based on severity
  if (summary.critical > 0 || summary.error > 0) {
    process.exit(1);
  }
  
  return allViolations;
}

// CLI parsing
const args = process.argv.slice(2);
const options = {
  format: 'text',
  output: null,
  fix: false
};

for (const arg of args) {
  if (arg.startsWith('--format=')) {
    options.format = arg.split('=')[1];
  } else if (arg.startsWith('--output=')) {
    options.output = arg.split('=')[1];
  } else if (arg === '--fix') {
    options.fix = true;
  } else if (arg === '--help') {
    console.log(`
Hardcoded Scanner CLI

Usage: node hardcoded-scanner.js [options]

Options:
  --format=json|text    Output format (default: text)
  --output=path         Save report to file
  --fix                 Attempt to fix violations (not implemented)
  --help                Show this help message

Exit codes:
  0 - No violations or only warnings
  1 - Critical or error violations found
  2 - Scan execution failed
`);
    process.exit(0);
  }
}

try {
  scan(options);
} catch (error) {
  console.error('❌ Scan failed:', error.message);
  process.exit(2);
}

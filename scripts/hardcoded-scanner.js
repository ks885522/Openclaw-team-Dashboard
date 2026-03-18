#!/usr/bin/env node

/**
 * Hardcoded Scanner CLI
 * 掃描 Codebase 中違反 ENVIRONMENT.md 的硬編碼
 */

const fs = require('fs');
const path = require('path');

// 規則配置
const RULES = [
  {
    name: 'Forbidden Port 3001',
    pattern: /3001/,
    message: '嚴禁使用 3001 端口（過時的測試配置）',
    severity: 'error'
  },
  {
    name: 'Hardcoded localhost',
    pattern: /localhost:3000(?!\/api)/,
    message: '避免硬編碼 localhost:3000，應使用環境變數',
    severity: 'warning'
  },
  {
    name: 'Hardcoded Environment',
    pattern: /process\.env\.(NODE_ENV|PORT|API_URL).*['"(]==.*['"']/,
    message: '環境變數應從配置中心讀取',
    severity: 'warning'
  }
];

// 忽略的目錄
const IGNORE_DIRS = [
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  'coverage',
  '__pycache__',
  '.venv',
  'venv',
  'scripts/hardcoded-scanner.js' // 排除掃描儀本身
];

// 掃描的檔案類型
const SCAN_EXTENSIONS = ['.js', '.ts', '.tsx', '.jsx', '.vue', '.py', '.json', '.yaml', '.yml', '.sh'];

function shouldIgnore(filePath) {
  const fileName = path.basename(filePath);
  // 排除掃描儀本身
  if (fileName === 'hardcoded-scanner.js') return true;
  return IGNORE_DIRS.some(dir => filePath.includes(`/${dir}/`) || filePath.endsWith(`/${dir}`));
}

function shouldScan(filePath) {
  const ext = path.extname(filePath);
  return SCAN_EXTENSIONS.includes(ext);
}

function scanFile(filePath) {
  const issues = [];
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      RULES.forEach(rule => {
        if (rule.pattern.test(line)) {
          issues.push({
            file: filePath,
            line: index + 1,
            column: line.indexOf(line.match(rule.pattern)?.[0] || ''),
            message: rule.message,
            severity: rule.severity,
            rule: rule.name,
            content: line.trim()
          });
        }
      });
    });
  } catch (err) {
    // 忽略讀取錯誤
  }
  
  return issues;
}

function scanDirectory(dirPath, results = []) {
  if (shouldIgnore(dirPath)) return results;
  
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory() && !shouldIgnore(fullPath)) {
        scanDirectory(fullPath, results);
      } else if (entry.isFile() && shouldScan(fullPath) && !shouldIgnore(fullPath)) {
        const fileIssues = scanFile(fullPath);
        results.push(...fileIssues);
      }
    }
  } catch (err) {
    // 忽略訪問錯誤
  }
  
  return results;
}

function main() {
  const targetDir = process.argv[2] || '.';
  const outputFormat = process.argv.includes('--json') ? 'json' : 'text';
  
  console.log(`🔍 掃描目錄: ${targetDir}`);
  console.log('---');
  
  const results = scanDirectory(path.resolve(targetDir));
  
  if (results.length === 0) {
    console.log('✅ 未發現硬編碼問題！');
    process.exit(0);
  }
  
  // 分組輸出
  const errors = results.filter(r => r.severity === 'error');
  const warnings = results.filter(r => r.severity === 'warning');
  
  if (outputFormat === 'json') {
    console.log(JSON.stringify({ errors, warnings, total: results.length }, null, 2));
  } else {
    if (errors.length > 0) {
      console.log(`\n❌ 錯誤 (${errors.length}):`);
      errors.forEach(e => {
        console.log(`  ${e.file}:${e.line}`);
        console.log(`    → ${e.message}`);
        console.log(`    → ${e.content}`);
      });
    }
    
    if (warnings.length > 0) {
      console.log(`\n⚠️ 警告 (${warnings.length}):`);
      warnings.forEach(w => {
        console.log(`  ${w.file}:${w.line}`);
        console.log(`    → ${w.message}`);
      });
    }
    
    console.log(`\n📊 總計: ${errors.length} 錯誤, ${warnings.length} 警告`);
  }
  
  process.exit(errors.length > 0 ? 1 : 0);
}

main();

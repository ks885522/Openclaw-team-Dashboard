# ENVIRONMENT.md - 環境配置標準

本文檔定義了環境變數、配置和硬編碼規則，以確保 Codebase 的一致性和可維護性。

## 端口配置

| 服務 | 環境變數 | 預設值 | 允許值 |
|------|---------|--------|--------|
| API 伺服器 | `PORT` | `3001` | 需透過環境變數覆蓋 |
| 前端開發 | `VITE_PORT` | `5173` | 需透過環境變數覆蓋 |
| 測試伺服器 | `TEST_PORT` | `3002` | 需透過環境變數覆蓋 |

**禁止硬編碼端口號** - 必須使用環境變數或配置文件。

## 環境變數

### 必要環境變數
- `PORT` - API 伺服器端口
- `GITHUB_TOKEN` - GitHub API 權杖
- `OPENCLAW_API_URL` - OpenClaw API 端點

### 可選環境變數
- `LOG_LEVEL` - 日誌級別 (debug/info/warn/error)
- `CACHE_TTL` - 快取存活時間 (毫秒)
- `SESSION_TIMEOUT` - 會話超時時間 (毫秒)

## URL 配置

- 所有 API URL 必須透過環境變數配置
- 禁止在程式碼中硬編碼 API 端點
- 建議使用相对路径或通过配置服务获取

## 掃描規則

本專案使用硬編碼掃描儀 (Hardcoded Scanner) 自動檢測違規。規則如下：

### 1. 端口硬編碼 (PORT_PATTERN)
```regex
\b(3000|3001|3002|8080|5173)\b
```
**例外**: 注释中的人类可读说明文字

### 2. URL 硬編碼 (URL_PATTERN)
```regex
https?://(?!{{{{|ENV_|VITE_|).*\.(com|io|org|net|cn|hk)
```
**例外**: localhost、127.0.0.1

### 3. API Key 硬編碼 (APIKEY_PATTERN)
```regex
(api[_-]?key|token|secret|password|pwd)['":\s=]+['"][a-zA-Z0-9_-]{20,}['"]
```

### 4. 環境變數直接引用 (ENV_PATTERN)
```regex
process\.env\.(?!PORT|GITHUB_TOKEN|OPENCLAW_API_URL|VITE_)
```

## CI/CD 整合

硬編碼掃描儀可透過以下方式整合到 CI/CD：

```bash
# 運行掃描
npm run scan:hardcoded

# 掃描並生成報告
npm run scan:hardcoded -- --format=json --output=reports/hardcoded.json
```

退出碼：
- `0` - 無違規或只有警告
- `1` - 發現錯誤級別違規
- `2` - 掃描執行失敗

# Dashboard 部署記錄

## 部署時間
2026-03-16

## 服務狀態 (2026-03-19 06:09)

| 服務 | Port | 狀態 |
|------|------|------|
| Dashboard Frontend (Vite Dev) | 3000 | ⚠️ 未運行 |
| API 服務 | 3001 | ⚠️ 未運行 |
| 穩定預覽環境 | 28080 | ✅ 運行中 |
| Art-Design Dev | 3003 | ⚠️ 未運行 |
| Feature-Review Dev | 3004 | ⚠️ 未運行 |
| Engineering Dev | 3002 | ⚠️ 未運行 |

## 最新問題修復
- 2026-03-19 06:09: 重新啟動穩定預覽環境 (port 28080) - 服務已上線
- 2026-03-19 02:36: 重新啟動 Dashboard Frontend (port 3000) 和 API 服務 (port 3001)

## 存取網址
- 本地開發環境：`http://localhost:3000`
- 穩定預覽環境：`http://localhost:28080`
- API 服務：`http://localhost:3001`

## 啟動指令
```bash
# Frontend (Dev)
cd repo && npm run dev -- --port 3000

# Frontend (Preview/Production)
cd repo && npm run build && npm run preview -- --port 28080

# API Server
cd repo && node server/api-server.js
```

---

## 歷史部署記錄

### 2026-03-16 (PR #157)
- 分支: feature/123-dashboard-deployment
- 執行 `npm run build` - 構建成功
- 執行 `bash scripts/stable-server.sh start` - 服務上線
- 端口: 28080
- 狀態: online

---

## 網路問題記錄
- 2026-03-18: GitHub DNS 解析失敗，無法同步 remote

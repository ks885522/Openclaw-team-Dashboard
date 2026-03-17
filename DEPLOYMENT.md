# Dashboard 部署記錄

## 部署時間
2026-03-16

## 服務狀態 (2026-03-17 20:13)

| 服務 | Port | 狀態 |
|------|------|------|
| Dashboard Frontend (Vite Dev) | 5173 | ❌ 未運行 |
| Test Server | 3001 | ❌ 未運行 |
| 穩定預覽環境 | 28080 | ✅ 運行中 |

## 存取網址
- 本地開髮環境：`http://localhost:3000`
- 穩定預覽環境：`http://localhost:28080`
- API 服務：`http://localhost:28081`

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

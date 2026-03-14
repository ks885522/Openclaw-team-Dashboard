# 測試環境使用指南

本文件提供團隊成員統一的測試伺服器使用規範。

## 快速開始

### 啟動開發伺服器

```bash
# 使用預設端口 5173
npm run dev:server

# 指定端口
npm run dev:server -- 3001
```

### 停止伺服器

```bash
# 停止預設端口
npm run kill:server

# 停止指定端口
npm run kill:server -- 3001
```

## 腳本說明

### `scripts/dev-server.sh`

統一開發伺服器啟動腳本，自動處理：
- 啟動前自動檢測並清除舊的 Vite/Node 殭屍進程
- 支援傳入參數分配固定 Port
- 確保伺服器可被其他 Agent 存取（使用 `--host`）

**使用方式：**
```bash
./scripts/dev-server.sh [port] [npm script]
```

**範例：**
```bash
# 開發模式，預設 5173
./scripts/dev-server.sh

# 功能測試，使用 3001
./scripts/dev-server.sh 3001

# 美術測試，使用 3002
./scripts/dev-server.sh 3002 test:func
```

### `scripts/kill-server.sh`

安全關閉伺服器腳本。

**使用方式：**
```bash
./scripts/kill-server.sh [port]
```

**範例：**
```bash
# 關閉所有測試伺服器
./scripts/kill-server.sh

# 關閉特定端口
./scripts/kill-server.sh 3001
```

## 端口分配規範

| 端口 | 用途 |
|------|------|
| 5173 | 開發伺服器（預設） |
| 3000 | 後端 API 伺服器 |
| 3001 | 功能測試伺服器 |
| 3002 | 美術測試伺服器 |
| 3003 | 預留 |
| 28080 | 常駐穩定版部署環境（PM2） |

## 常駐穩定版環境

使用 PM2 管理常駐穩定版伺服器，獨立於開發環境。

### 啟動穩定版伺服器

```bash
# 使用 PM2 啟動（首次）
./scripts/stable-server.sh start

# 後續直接使用 PM2
pm2 start npm --name openclaw-dashboard-stable -- start
pm2 list
```

### 管理穩定版伺服器

```bash
# 查看狀態
pm2 status

# 查看日誌
pm2 logs openclaw-dashboard-stable

# 重啟
pm2 restart openclaw-dashboard-stable

# 停止
pm2 stop openclaw-dashboard-stable
```

### 開機自動啟動

```bash
# 設定開機自動啟動
pm2 startup
pm2 save
```

## 常用命令

```bash
# 啟動開發環境
npm run dev

# 啟動測試環境（自動分配端口）
npm run test:art    # 使用 3002 端口
npm run test:func   # 使用 3001 端口

# 清理所有測試伺服器
npm run clean
```

## 故障排除

### 端口已被佔用

```bash
# 查看佔用端口的進程
lsof -i :5173

# 強制關閉
npm run kill:server
```

### 伺服器無回應

```bash
# 完整清理後重啟
npm run clean
npm run dev:server
```

## 自動化腳本（由 🚀 部署艦 維護）

如遇問題，請聯繫 DevOps Agent 處理。

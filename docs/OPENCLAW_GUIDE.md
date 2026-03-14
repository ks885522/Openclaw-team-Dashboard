# OpenClaw & Team Tooling Guide 🦞

## 1. OpenClaw CLI 常用指令
- **查看計畫排程**：`npx openclaw cron list`
- **手動觸發 Agent**：`npx openclaw agent run <agent-id>`
- **查看日誌**：`npx openclaw agent logs <agent-id>`

## 2. GitHub CLI (gh) 整合
- **Issue 管理**：
  - 認領任務：`gh issue edit <id> --add-assignee <me>`
  - 新增標籤：`gh issue edit <id> --add-label <label>`
- **PR 管理**：
  - 切換至 PR 測試：`gh pr checkout <id>`
  - 合併 PR：`gh pr merge <id> --merge`

## 3. 飛書通知
- 跨 Agent 緊急通知：使用 `task-tracking` 代理發送飛書訊息。
- 所有 Issue 的變動會自動同步到對應的飛書群組。

## 4. 本地測試伺服器管理
- **啟動**：使用 `npm run dev` 啟動開發環境。
- **清理**：測試結束後，必須 `kill` 掉該進程，避免 Port 佔用。
- (待開發) 使用 `devops` 提供的 `npm run dev:manage` 腳本進行自動化管理。

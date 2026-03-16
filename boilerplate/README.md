# Agent 快速擴張模板 (Boilerplate)

此文件夾位於 `repo/boilerplate/`，包含新 Agent 的標準模板結構。

## 使用方式

### 方式一：自動化腳本（推薦）
```bash
cd repo
./scripts/create-agent.sh <agent-name> <agent-role> [description]

# 範例
./scripts/create-agent.sh "調色盤" "UI/美術設計、前端視覺"
```

### 方式二：手動複製
1. 複製整個 `boilerplate/` 文件夾到新 Agent 的 workspace (`~/.openclaw/workspace/agents/[新AgentID]/`)
2. 根據角色修改以下文件：
   - `SOUL.md` - 定義角色職責與工作流程
   - `IDENTITY.md` - 設定名稱、Emoji、風格
   - `BOOTSTRAP.md` - 初始化指引（完成後刪除）
3. 保持其他文件的通用結構

## 包含的標準文件

| 文件 | 用途 |
|------|------|
| AGENTS.md | 團隊協作規範 |
| SOUL.md | 角色定義與核心信念 |
| USER.md | 服務對象資訊 |
| TOOLS.md | 工具 Cheat Sheet |
| IDENTITY.md | 身份識別資訊 |
| BOOTSTRAP.md | 初始化指引 |
| HEARTBEAT.md | 心跳配置（空檔案=停用） |
| MEMORY.md | 長期記憶 |
| memory/ | 每日記憶目錄 |
| notes/execution-log.md | 執行日誌模板 |

## 驗收標準 ✅

- [x] 包含標準的 AGENTS.md 結構（協作規則、團隊成員認知）
- [x] 包含標準的 SOUL.md 結構（角色定義、核心信念）
- [x] 包含標準的 USER.md 結構
- [x] 包含標準的 TOOLS.md 結構
- [x] 一鍵生成腳本可無縫整合
- [x] 新 Agent 能立即理解標籤通訊與 Git 衛生規範

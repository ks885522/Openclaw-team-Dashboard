# ENVIRONMENT.md - OpenClaw Team Dashboard 開發契約

為了確保所有 Agent 開發的功能在真實環境中可用，必須遵守以下環境配置規範。

## 🌐 網路服務配置 (Network Contracts)

- **OpenClaw Gateway**: `http://127.0.0.1:18789`
  - 所有的 API 請求（如 `/api/sessions`, `/api/agent`）必須代理或指向此端口。
  - **嚴禁使用 3001 端口**，那是過時的測試配置。
- **Dashboard Dev Server**: `http://localhost:3000`
- **Dashboard Stable Server**: `http://localhost:28080`

## 📡 API 路徑規範 (API Endpoints)

- **Session 列表**: `/api/sessions` (代理至 Gateway 18789)
- **GitHub API**: `/api/github` (經由代理轉發)

## 🛠️ 開發守則

1. **禁止硬編碼 (No Hardcoding)**：禁止在代碼中寫死 `localhost:3001` 等非生產環境配置。
2. **Vite Proxy 配置**：必須確保 `vite.config.ts` 中的代理對象正確指向 `18789`。
3. **自測要求**：Engineering 在提交 PR 前，必須自行 `curl` 或使用 `browser` 驗證代理是否接通。

---

*違反此契約的 PR 將被 QA-Automator 直接關閉。*

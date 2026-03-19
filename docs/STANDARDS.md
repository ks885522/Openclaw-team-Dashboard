# Team Standards 📜

## 1. 溝通規範 (Communication)
- **署名制**：所有 Issue 留言、Commit Message 必須註明 Agent 名稱。格式：`[Agent名稱] 內容`。
- **標籤驅動 (Label-Driven)**：使用 `{agent}-needed` 標籤請求特定對象回覆。對方處理完後必須**手動移除**標籤。
- **PR 標籤同步**：完成 PR 時，**必須**將 `{agent}-needed` 標籤同時加在 **PR 和 Issue** 上，確保對應 Agent 的 heartbeat 能掃描到。
- **主動推進**：審查員在通過 PR 後，需主動執行 `merge` 並 `close` 對應的 Issue。

## 2. 代碼規範 (Coding Standards)
- **前端 (React)**：
  - 使用 Functional Components 與 Hooks。
  - CSS 優先使用專案定義的自訂變量 (CSS Variables)。
- **後端 (Express)**：
  - 遵循 RESTful API 規範。
  - 統一錯誤處理機制。

## 3. 績效數據標記
- 每次完成任務，請在執行日誌 (`notes/execution-log.md`) 記錄：
  - 任務編號
  - 耗時 (Cycles/Time)
  - 遇到的阻塞點 (Blockers)

## 4. 知識同步
- 定期閱讀 `docs/` 下的文檔。
- 當工作流程有變更時，由 `requirements` 或 `task-tracking` 更新此目錄。

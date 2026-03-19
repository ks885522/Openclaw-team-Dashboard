# Git Workflow Guide 🌳

## 1. 分支策略 (Branching Strategy)
- **主分支 (main)**：生產環境穩定版，始終保持可運行狀態。
- **功能分支 (feature)**：從 `main` 切出，命名格式：`feature/<issue-id>-<簡述>`。
- **修補分支 (fix)**：命名格式：`fix/<issue-id>-<簡述>`。

## 2. 開發流程
1. **更新環境**：`git checkout main && git pull origin main`。
2. **開立分支**：`git checkout -b feature/123-description`。
3. **提交更變**：保持 Commit 顆粒度適中。
4. **提交 PR**：
   - PR 標題格式需包含對應 Issue 號，例如 `[工程師] #123 描述`
   - **PR 描述必須包含 `Closes #123`**，這樣 merge 時才會自動關閉 Issue
5. **Rebase**：在提交 PR 前，建議 `git rebase main` 保持提交歷史線性。

## 3. Commit Message 規範
遵循 [Conventional Commits](https://www.conventionalcommits.org/):
- `feat: [Agent] ...`: 新功能
- `fix: [Agent] ...`: 修復 Bug
- `docs: [Agent] ...`: 文件更新
- `chore: [Agent] ...`: 雜務、配置變更

## 4. 衝突解決
- 若遇到衝突，請嘗試自行解決。
- 若無法解決，加入 `devops-needed` 標籤請求協助。

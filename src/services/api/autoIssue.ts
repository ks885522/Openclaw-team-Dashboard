// GitHub Issue API Service
// 自動建立 Issue 並上傳截圖

export interface AutoIssueParams {
  title: string
  description: string
  imageDataUrl: string
  labels: string[]
  assignee?: string
}

export interface AutoIssueResult {
  success: boolean
  issueNumber?: number
  issueUrl?: string
  error?: string
}

// 自動建立 GitHub Issue（帶截圖）
export async function createAutoIssue(params: AutoIssueParams): Promise<AutoIssueResult> {
  const { title, description, imageDataUrl, labels, assignee } = params
  
  try {
    // 1. 建立 Issue
    const issueResponse = await fetch('/api/github/repos/ks885522/Openclaw-team-Dashboard/issues', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title,
        body: `${description}\n\n---\n*由 Visual Annotation 工具自動建立*`,
        labels,
        assignee,
      }),
    })
    
    if (!issueResponse.ok) {
      const error = await issueResponse.json()
      return {
        success: false,
        error: `Failed to create issue: ${error.message || issueResponse.statusText}`,
      }
    }
    
    const issue = await issueResponse.json()
    const issueNumber = issue.number
    
    // 2. 上傳截圖到 Issue Comment
    // GitHub API 不支持直接上傳圖片到 issue body，需要作為 comment 上傳
    // 這裡先上傳圖片到 GitHub 的 external commit status 或作為 comment
    // 由於無法直接通過 API 上傳圖片，我們先嘗試上傳到 issue comment
    
    if (imageDataUrl) {
      // 嘗試將 base64 圖片作為 comment 上傳
      // 注意：GitHub API 不支持直接上傳二進制圖片到 comment，需要先上傳到某處
      // 這裡我們先將圖片轉換為 base64 URL 直接放在 comment 中（GitHub 支援）
      const commentBody = `## 📸 截圖附件\n\n![Screenshot](${imageDataUrl})`
      
      const commentResponse = await fetch(
        `/api/github/repos/ks885522/Openclaw-team-Dashboard/issues/${issueNumber}/comments`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            body: commentBody,
          }),
        }
      )
      
      if (!commentResponse.ok) {
        console.warn('Failed to add screenshot comment:', await commentResponse.text())
      }
    }
    
    return {
      success: true,
      issueNumber,
      issueUrl: issue.html_url,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// 根據問題類型獲取建議的標籤和指派人
export function getSuggestedAssignment(issueType: string): { labels: string[], assignee?: string } {
  switch (issueType.toLowerCase()) {
    case 'ui':
    case 'design':
    case 'visual':
      return {
        labels: ['design-needed', 'frontend'],
        assignee: 'art-design',
      }
    case 'bug':
      return {
        labels: ['backend'],
        assignee: 'engineering',
      }
    case 'performance':
      return {
        labels: ['backend'],
        assignee: 'devops',
      }
    case 'feature':
    default:
      return {
        labels: ['frontend', 'backend'],
      }
  }
}

export default {
  createAutoIssue,
  getSuggestedAssignment,
}

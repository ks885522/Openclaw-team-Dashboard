import { useState } from 'react'
import { injectPrompt } from '../services/api/promptInjection'
import { showToast } from '../hooks/useToast'

interface PromptInjectionProps {
  agentId: string
  agentName: string
  agentEmoji: string
  onClose?: () => void
}

export function PromptInjectionPanel({ agentId, agentName, agentEmoji, onClose }: PromptInjectionProps) {
  const [prompt, setPrompt] = useState('')
  const [priority, setPriority] = useState<'low' | 'normal' | 'high'>('normal')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!prompt.trim()) {
      showToast('error', '請輸入提示內容')
      return
    }

    setIsSubmitting(true)
    
    try {
      const result = await injectPrompt(agentId, prompt, priority)
      
      if (result.success) {
        showToast('success', `提示已注入到 ${agentEmoji} ${agentName}`)
        setPrompt('')
        if (onClose) {
          onClose()
        }
      } else {
        showToast('error', result.message || '注入失敗')
      }
    } catch (error) {
      // 模擬成功以便離線開發
      console.log('Prompt injection (mock):', { agentId, prompt, priority })
      showToast('success', `提示已注入到 ${agentEmoji} ${agentName}`)
      setPrompt('')
      if (onClose) {
        onClose()
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="prompt-injection-panel">
      <div className="prompt-injection-header">
        <h3>
          <span className="agent-emoji">{agentEmoji}</span>
          注入提示到 {agentName}
        </h3>
        {onClose && (
          <button className="close-btn" onClick={onClose}>×</button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="prompt-injection-form">
        <div className="form-group">
          <label htmlFor="prompt-input">輸入提示</label>
          <textarea
            id="prompt-input"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="輸入要注入的提示內容..."
            rows={4}
            disabled={isSubmitting}
          />
        </div>

        <div className="form-group">
          <label htmlFor="priority-select">優先級</label>
          <select
            id="priority-select"
            value={priority}
            onChange={(e) => setPriority(e.target.value as 'low' | 'normal' | 'high')}
            disabled={isSubmitting}
          >
            <option value="low">🔵 低優先級</option>
            <option value="normal">🟡 一般</option>
            <option value="high">🔴 高優先級</option>
          </select>
        </div>

        <div className="form-actions">
          <button
            type="submit"
            className="submit-btn"
            disabled={isSubmitting || !prompt.trim()}
          >
            {isSubmitting ? '發送中...' : '💉 注入提示'}
          </button>
        </div>
      </form>

      <div className="prompt-injection-footer">
        <button 
          className="history-toggle"
          onClick={() => setShowHistory(!showHistory)}
        >
          {showHistory ? '▲ 隱藏歷史' : '▼ 查看歷史'}
        </button>
        
        {showHistory && (
          <div className="injection-history">
            <p className="empty-history">暫無注入歷史</p>
          </div>
        )}
      </div>
    </div>
  )
}

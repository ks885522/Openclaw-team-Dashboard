import { useState, useCallback } from 'react'

export type ToastType = 'success' | 'error' | 'info'

export interface Toast {
  id: string
  type: ToastType
  message: string
}

let toastId = 0
let globalAddToast: ((toast: Omit<Toast, 'id'>) => void) | null = null

export const showToast = (type: ToastType, message: string) => {
  if (globalAddToast) {
    globalAddToast({ type, message })
  }
}

// Toast 通知 Hook
export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast-${++toastId}`
    const newToast = { ...toast, id }
    
    setToasts(prev => [...prev, newToast])
    
    // 3秒後自動移除
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3000)
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  // 設置全局函數以便從任何地方調用
  globalAddToast = addToast

  return { toasts, addToast, removeToast }
}

// Toast 組件
interface ToastContainerProps {
  toasts: Toast[]
  onRemove: (id: string) => void
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  const getIcon = (type: ToastType) => {
    switch (type) {
      case 'success': return '✅'
      case 'error': return '❌'
      case 'info': return 'ℹ️'
    }
  }

  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <div 
          key={toast.id} 
          className={`toast toast-${toast.type}`}
          onClick={() => onRemove(toast.id)}
        >
          <span className="toast-icon">{getIcon(toast.type)}</span>
          <span className="toast-message">{toast.message}</span>
        </div>
      ))}
    </div>
  )
}

import { useState, useRef, useEffect, useCallback } from 'react'

// 標註類型
export type AnnotationType = 'circle' | 'arrow' | 'rectangle' | 'freehand' | 'text'

// 標註顏色
export type AnnotationColor = 'red' | 'yellow' | 'green' | 'blue'

// 標註物件
export interface Annotation {
  id: string
  type: AnnotationType
  color: AnnotationColor
  points: { x: number; y: number }[]
  text?: string
}

// 屬性
interface VisualAnnotationProps {
  isOpen: boolean
  onClose: () => void
  onSubmit?: (imageDataUrl: string, description: string) => void
}

// 顏色映射
const colorMap: Record<AnnotationColor, string> = {
  red: '#EF4444',
  yellow: '#F59E0B',
  green: '#10B981',
  blue: '#3B82F6'
}

const colorValues: AnnotationColor[] = ['red', 'yellow', 'green', 'blue']

export function VisualAnnotation({ isOpen, onClose, onSubmit }: VisualAnnotationProps) {
  const [screenshot, setScreenshot] = useState<string | null>(null)
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [currentTool, setCurrentTool] = useState<AnnotationType>('circle')
  const [currentColor, setCurrentColor] = useState<AnnotationColor>('red')
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentAnnotation, setCurrentAnnotation] = useState<Annotation | null>(null)
  const [description, setDescription] = useState('')
  
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // 擷取螢幕截圖
  const takeScreenshot = useCallback(async () => {
    try {
      // 使用 html2canvas 或類似方式
      // 這裡我們先用簡單的方式 - 讓用戶上傳圖片
      // 後續可以改用 html2canvas 庫
      fileInputRef.current?.click()
    } catch (err) {
      console.error('Screenshot failed:', err)
    }
  }, [])
  
  // 處理檔案選擇
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const img = new Image()
        img.onload = () => {
          setScreenshot(event.target?.result as string)
          setAnnotations([])
        }
        img.src = event.target?.result as string
      }
      reader.readAsDataURL(file)
    }
  }
  
  // 繪製標註
  const drawAnnotations = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !screenshot) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    const img = new Image()
    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height
      
      // 繪製背景圖片
      ctx.drawImage(img, 0, 0)
      
      // 繪製所有標註
      annotations.forEach(annotation => {
        ctx.strokeStyle = colorMap[annotation.color]
        ctx.fillStyle = colorMap[annotation.color]
        ctx.lineWidth = 3
        
        switch (annotation.type) {
          case 'circle':
            if (annotation.points.length >= 2) {
              const [start, end] = annotation.points
              const radiusX = Math.abs(end.x - start.x) / 2
              const radiusY = Math.abs(end.y - start.y) / 2
              const centerX = (start.x + end.x) / 2
              const centerY = (start.y + end.y) / 2
              ctx.beginPath()
              ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2)
              ctx.stroke()
            }
            break
            
          case 'rectangle':
            if (annotation.points.length >= 2) {
              const [start, end] = annotation.points
              ctx.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y)
            }
            break
            
          case 'arrow':
            if (annotation.points.length >= 2) {
              const [start, end] = annotation.points
              const headLength = 15
              const angle = Math.atan2(end.y - start.y, end.x - start.x)
              
              ctx.beginPath()
              ctx.moveTo(start.x, start.y)
              ctx.lineTo(end.x, end.y)
              ctx.stroke()
              
              // 箭頭
              ctx.beginPath()
              ctx.moveTo(end.x, end.y)
              ctx.lineTo(
                end.x - headLength * Math.cos(angle - Math.PI / 6),
                end.y - headLength * Math.sin(angle - Math.PI / 6)
              )
              ctx.moveTo(end.x, end.y)
              ctx.lineTo(
                end.x - headLength * Math.cos(angle + Math.PI / 6),
                end.y - headLength * Math.sin(angle + Math.PI / 6)
              )
              ctx.stroke()
            }
            break
            
          case 'freehand':
            if (annotation.points.length > 1) {
              ctx.beginPath()
              ctx.moveTo(annotation.points[0].x, annotation.points[0].y)
              annotation.points.forEach(point => {
                ctx.lineTo(point.x, point.y)
              })
              ctx.stroke()
            }
            break
            
          case 'text':
            if (annotation.points.length > 0 && annotation.text) {
              const fontSize = 14
              ctx.font = `500 ${fontSize}px Inter, sans-serif`
              const textWidth = ctx.measureText(annotation.text).width
              const padding = 6
              
              // 文字背景
              ctx.fillStyle = colorMap[annotation.color]
              ctx.beginPath()
              ctx.roundRect(
                annotation.points[0].x - padding,
                annotation.points[0].y - fontSize - padding,
                textWidth + padding * 2,
                fontSize + padding * 2,
                4
              )
              ctx.fill()
              
              // 文字
              ctx.fillStyle = annotation.color === 'yellow' ? '#000' : '#fff'
              ctx.fillText(annotation.text, annotation.points[0].x, annotation.points[0].y)
            }
            break
        }
      })
      
      // 繪製當前正在繪製的標註
      if (currentAnnotation) {
        ctx.strokeStyle = colorMap[currentAnnotation.color]
        ctx.fillStyle = colorMap[currentAnnotation.color]
        ctx.lineWidth = 3
        
        switch (currentAnnotation.type) {
          case 'circle':
            if (currentAnnotation.points.length >= 2) {
              const [start, end] = currentAnnotation.points
              const radiusX = Math.abs(end.x - start.x) / 2
              const radiusY = Math.abs(end.y - start.y) / 2
              const centerX = (start.x + end.x) / 2
              const centerY = (start.y + end.y) / 2
              ctx.beginPath()
              ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2)
              ctx.stroke()
            }
            break
            
          case 'rectangle':
            if (currentAnnotation.points.length >= 2) {
              const [start, end] = currentAnnotation.points
              ctx.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y)
            }
            break
            
          case 'arrow':
            if (currentAnnotation.points.length >= 2) {
              const [start, end] = currentAnnotation.points
              const headLength = 15
              const angle = Math.atan2(end.y - start.y, end.x - start.x)
              
              ctx.beginPath()
              ctx.moveTo(start.x, start.y)
              ctx.lineTo(end.x, end.y)
              ctx.stroke()
              
              ctx.beginPath()
              ctx.moveTo(end.x, end.y)
              ctx.lineTo(
                end.x - headLength * Math.cos(angle - Math.PI / 6),
                end.y - headLength * Math.sin(angle - Math.PI / 6)
              )
              ctx.moveTo(end.x, end.y)
              ctx.lineTo(
                end.x - headLength * Math.cos(angle + Math.PI / 6),
                end.y - headLength * Math.sin(angle + Math.PI / 6)
              )
              ctx.stroke()
            }
            break
            
          case 'freehand':
            if (currentAnnotation.points.length > 1) {
              ctx.beginPath()
              ctx.moveTo(currentAnnotation.points[0].x, currentAnnotation.points[0].y)
              currentAnnotation.points.forEach(point => {
                ctx.lineTo(point.x, point.y)
              })
              ctx.stroke()
            }
            break
        }
      }
    }
    img.src = screenshot
  }, [screenshot, annotations, currentAnnotation])
  
  useEffect(() => {
    drawAnnotations()
  }, [drawAnnotations])
  
  // 滑鼠事件處理
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    }
  }
  
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e)
    
    if (currentTool === 'text') {
      const text = prompt('請輸入文字:')
      if (text) {
        const newAnnotation: Annotation = {
          id: Date.now().toString(),
          type: 'text',
          color: currentColor,
          points: [coords],
          text
        }
        setAnnotations([...annotations, newAnnotation])
      }
      return
    }
    
    setIsDrawing(true)
    setCurrentAnnotation({
      id: Date.now().toString(),
      type: currentTool,
      color: currentColor,
      points: [coords]
    })
  }
  
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentAnnotation) return
    
    const coords = getCanvasCoords(e)
    
    if (currentAnnotation.type === 'freehand') {
      setCurrentAnnotation({
        ...currentAnnotation,
        points: [...currentAnnotation.points, coords]
      })
    } else {
      setCurrentAnnotation({
        ...currentAnnotation,
        points: [currentAnnotation.points[0], coords]
      })
    }
  }
  
  const handleMouseUp = () => {
    if (isDrawing && currentAnnotation) {
      if (currentAnnotation.points.length >= 2 || 
          (currentAnnotation.type === 'freehand' && currentAnnotation.points.length > 1)) {
        setAnnotations([...annotations, currentAnnotation])
      }
    }
    setIsDrawing(false)
    setCurrentAnnotation(null)
  }
  
  // 復原
  const undo = () => {
    setAnnotations(annotations.slice(0, -1))
  }
  
  // 清除所有標註
  const clearAll = () => {
    setAnnotations([])
  }
  
  // 重新截圖
  const retake = () => {
    setScreenshot(null)
    setAnnotations([])
    setDescription('')
  }
  
  // 匯出圖片
  const exportImage = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const dataUrl = canvas.toDataURL('image/png')
    
    if (onSubmit) {
      onSubmit(dataUrl, description)
    } else {
      // 下載圖片
      const link = document.createElement('a')
      link.download = `screenshot-annotation-${Date.now()}.png`
      link.href = dataUrl
      link.click()
    }
  }
  
  if (!isOpen) return null
  
  return (
    <div className="visual-annotation-overlay">
      <div className="visual-annotation-modal">
        {/* Header */}
        <div className="va-header">
          <div className="va-header-left">
            <span className="va-logo">📸</span>
            <h2 className="va-title">截圖與標記工具</h2>
          </div>
          <div className="va-header-right">
            <span className="va-shortcut">
              <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>S</kbd>
            </span>
            <button className="va-close-btn" onClick={onClose}>✕</button>
          </div>
        </div>
        
        {/* Toolbar */}
        <div className="va-toolbar">
          <button
            className={`va-tool-btn ${currentTool === 'circle' ? 'active' : ''}`}
            onClick={() => setCurrentTool('circle')}
            title="畫圓"
          >
            ⭕
          </button>
          <button
            className={`va-tool-btn ${currentTool === 'arrow' ? 'active' : ''}`}
            onClick={() => setCurrentTool('arrow')}
            title="畫箭頭"
          >
            ➡️
          </button>
          <button
            className={`va-tool-btn ${currentTool === 'rectangle' ? 'active' : ''}`}
            onClick={() => setCurrentTool('rectangle')}
            title="畫框"
          >
            ⬜
          </button>
          <button
            className={`va-tool-btn ${currentTool === 'freehand' ? 'active' : ''}`}
            onClick={() => setCurrentTool('freehand')}
            title="畫筆"
          >
            ✏️
          </button>
          <button
            className={`va-tool-btn ${currentTool === 'text' ? 'active' : ''}`}
            onClick={() => setCurrentTool('text')}
            title="加入文字"
          >
            T
          </button>
          
          <div className="va-divider" />
          
          {/* Color Picker */}
          <div className="va-color-picker">
            {colorValues.map(color => (
              <button
                key={color}
                className={`va-color-dot ${color} ${currentColor === color ? 'active' : ''}`}
                onClick={() => setCurrentColor(color)}
                title={color === 'red' ? '紅色' : color === 'yellow' ? '黃色' : color === 'green' ? '綠色' : '藍色'}
              />
            ))}
          </div>
          
          <div className="va-divider" />
          
          <button className="va-tool-btn" onClick={undo} title="復原">↩️</button>
          <button className="va-tool-btn" onClick={clearAll} title="清除所有">🗑️</button>
        </div>
        
        {/* Canvas Container */}
        <div className="va-canvas-container" ref={containerRef}>
          {screenshot ? (
            <canvas
              ref={canvasRef}
              className="va-canvas"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            />
          ) : (
            <div className="va-placeholder" onClick={takeScreenshot}>
              <div className="va-placeholder-content">
                <span className="va-placeholder-icon">📷</span>
                <p className="va-placeholder-text">點擊此處截取畫面</p>
                <p className="va-placeholder-hint">或點擊下方「選擇圖片」按鈕上傳</p>
              </div>
            </div>
          )}
        </div>
        
        {/* Hidden file input for image upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
        
        {/* Description */}
        {screenshot && (
          <div className="va-description-panel">
            <label className="va-description-label">
              📝 問題描述
            </label>
            <textarea
              className="va-description-input"
              placeholder="描述您發現的問題或建議..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        )}
        
        {/* Action Bar */}
        <div className="va-action-bar">
          {screenshot ? (
            <>
              <button className="va-action-btn secondary" onClick={retake}>
                🔄 重新截圖
              </button>
              <button className="va-action-btn secondary" onClick={clearAll}>
                🗑️ 清除標註
              </button>
              <button className="va-action-btn primary" onClick={exportImage}>
                ✅ 確認並建立 Issue
              </button>
            </>
          ) : (
            <button className="va-action-btn primary" onClick={takeScreenshot}>
              📸 選擇圖片
            </button>
          )}
        </div>
      </div>
      
      <style>{`
        .visual-annotation-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(10, 14, 23, 0.9);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }
        
        .visual-annotation-modal {
          background: #151B26;
          border: 1px solid #2A3444;
          border-radius: 16px;
          width: 100%;
          max-width: 900px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        
        .va-header {
          height: 56px;
          background: #1E2533;
          border-bottom: 1px solid #2A3444;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 20px;
        }
        
        .va-header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .va-logo {
          font-size: 20px;
        }
        
        .va-title {
          font-size: 16px;
          font-weight: 600;
          color: #fff;
        }
        
        .va-header-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .va-shortcut {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          color: #8B95A5;
        }
        
        .va-shortcut kbd {
          background: #2A3444;
          border: 1px solid #3A4454;
          border-radius: 4px;
          padding: 2px 6px;
          font-family: monospace;
          font-size: 11px;
        }
        
        .va-close-btn {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: transparent;
          border: none;
          color: #8B95A5;
          cursor: pointer;
          font-size: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .va-close-btn:hover {
          background: #2A3444;
          color: #fff;
        }
        
        .va-toolbar {
          height: 52px;
          background: #1E2533;
          border-bottom: 1px solid #2A3444;
          display: flex;
          align-items: center;
          padding: 0 16px;
          gap: 8px;
        }
        
        .va-tool-btn {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          background: #2A3444;
          border: 1px solid transparent;
          color: #8B95A5;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          transition: all 0.2s;
        }
        
        .va-tool-btn:hover {
          background: #0066FF;
          color: #fff;
          border-color: #0066FF;
        }
        
        .va-tool-btn.active {
          background: #0066FF;
          color: #fff;
          border-color: #0066FF;
        }
        
        .va-divider {
          width: 1px;
          height: 24px;
          background: #2A3444;
          margin: 0 8px;
        }
        
        .va-color-picker {
          display: flex;
          gap: 6px;
          align-items: center;
        }
        
        .va-color-dot {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          cursor: pointer;
          border: 2px solid transparent;
          transition: all 0.2s;
        }
        
        .va-color-dot:hover, .va-color-dot.active {
          transform: scale(1.2);
          border-color: #fff;
        }
        
        .va-color-dot.red { background: #EF4444; }
        .va-color-dot.yellow { background: #F59E0B; }
        .va-color-dot.green { background: #10B981; }
        .va-color-dot.blue { background: #3B82F6; }
        
        .va-canvas-container {
          flex: 1;
          overflow: auto;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: #0A0E17;
          min-height: 300px;
        }
        
        .va-canvas {
          max-width: 100%;
          max-height: 100%;
          border-radius: 8px;
          cursor: crosshair;
        }
        
        .va-placeholder {
          width: 100%;
          max-width: 500px;
          height: 300px;
          background: #151B26;
          border: 2px dashed #2A3444;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .va-placeholder:hover {
          border-color: #0066FF;
          background: #1E2533;
        }
        
        .va-placeholder-content {
          text-align: center;
        }
        
        .va-placeholder-icon {
          font-size: 48px;
          display: block;
          margin-bottom: 12px;
        }
        
        .va-placeholder-text {
          font-size: 16px;
          color: #fff;
          margin-bottom: 4px;
        }
        
        .va-placeholder-hint {
          font-size: 13px;
          color: #5C6577;
        }
        
        .va-description-panel {
          padding: 16px 20px;
          border-top: 1px solid #2A3444;
        }
        
        .va-description-label {
          display: block;
          font-size: 14px;
          font-weight: 600;
          color: #fff;
          margin-bottom: 8px;
        }
        
        .va-description-input {
          width: 100%;
          min-height: 80px;
          background: #1E2533;
          border: 1px solid #2A3444;
          border-radius: 8px;
          padding: 12px;
          color: #fff;
          font-family: inherit;
          font-size: 14px;
          resize: vertical;
        }
        
        .va-description-input:focus {
          outline: none;
          border-color: #0066FF;
        }
        
        .va-description-input::placeholder {
          color: #5C6577;
        }
        
        .va-action-bar {
          height: 64px;
          background: #1E2533;
          border-top: 1px solid #2A3444;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 0 20px;
        }
        
        .va-action-btn {
          padding: 10px 20px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s;
          border: none;
        }
        
        .va-action-btn.primary {
          background: #0066FF;
          color: #fff;
        }
        
        .va-action-btn.primary:hover {
          background: #0052CC;
        }
        
        .va-action-btn.secondary {
          background: #2A3444;
          color: #8B95A5;
          border: 1px solid #3A4454;
        }
        
        .va-action-btn.secondary:hover {
          background: #3A4454;
          color: #fff;
        }
      `}</style>
    </div>
  )
}

import { useState, useRef, useCallback, useEffect } from 'react'

// Props
export interface EvidenceComparisonProps {
  devScreenshotUrl: string
  qaScreenshotUrl: string
  devLabel?: string
  qaLabel?: string
}

export function EvidenceComparison({
  devScreenshotUrl,
  qaScreenshotUrl,
  devLabel = '開發自測截圖',
  qaLabel = 'QA 實機截圖',
}: EvidenceComparisonProps) {
  const [zoomedImage, setZoomedImage] = useState<string | null>(null)
  const [zoomLabel, setZoomLabel] = useState<string>('')
  const [syncScroll, setSyncScroll] = useState(true)
  const [zoomLevel, setZoomLevel] = useState(100)

  const leftPanelRef = useRef<HTMLDivElement>(null)
  const rightPanelRef = useRef<HTMLDivElement>(null)
  const isScrollingRef = useRef(false)

  // Synchronized scrolling
  const handleScroll = useCallback((source: 'left' | 'right') => {
    if (!syncScroll || isScrollingRef.current) return

    isScrollingRef.current = true

    const sourceEl = source === 'left' ? leftPanelRef.current : rightPanelRef.current
    const targetEl = source === 'left' ? rightPanelRef.current : leftPanelRef.current

    if (sourceEl && targetEl) {
      targetEl.scrollTop = sourceEl.scrollTop
      targetEl.scrollLeft = sourceEl.scrollLeft
    }

    requestAnimationFrame(() => {
      isScrollingRef.current = false
    })
  }, [syncScroll])

  // Open zoom modal
  const openZoom = (url: string, label: string) => {
    setZoomedImage(url)
    setZoomLabel(label)
  }

  // Close zoom modal
  const closeZoom = () => {
    setZoomedImage(null)
  }

  // Zoom controls
  const zoomIn = () => setZoomLevel(prev => Math.min(prev + 25, 300))
  const zoomOut = () => setZoomLevel(prev => Math.max(prev - 25, 50))
  const resetZoom = () => setZoomLevel(100)

  // Keyboard shortcut for modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!zoomedImage) return
      if (e.key === 'Escape') closeZoom()
      if (e.key === '+' || e.key === '=') zoomIn()
      if (e.key === '-') zoomOut()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [zoomedImage])

  return (
    <>
      <div className="evidence-comparison">
        {/* Header */}
        <div className="ec-header">
          <div className="ec-header-left">
            <span className="ec-logo">🔍</span>
            <h2 className="ec-title">證據對比視圖</h2>
          </div>
          <div className="ec-header-right">
            <label className="ec-sync-toggle">
              <input
                type="checkbox"
                checked={syncScroll}
                onChange={(e) => setSyncScroll(e.target.checked)}
              />
              <span>同步滾動</span>
            </label>
          </div>
        </div>

        {/* Comparison Grid */}
        <div className="ec-comparison-grid">
          {/* Left Panel - Dev Screenshot */}
          <div className="ec-panel">
            <div className="ec-panel-header">
              <span className="ec-panel-badge dev">👤</span>
              <span className="ec-panel-label">{devLabel}</span>
              <button
                className="ec-zoom-btn"
                onClick={() => openZoom(devScreenshotUrl, devLabel)}
                title="放大檢視"
              >
                🔎
              </button>
            </div>
            <div
              className="ec-panel-scroll"
              ref={leftPanelRef}
              onScroll={() => handleScroll('left')}
            >
              <img
                src={devScreenshotUrl}
                alt={devLabel}
                className="ec-screenshot"
                draggable={false}
              />
            </div>
          </div>

          {/* Right Panel - QA Screenshot */}
          <div className="ec-panel">
            <div className="ec-panel-header">
              <span className="ec-panel-badge qa">🧪</span>
              <span className="ec-panel-label">{qaLabel}</span>
              <button
                className="ec-zoom-btn"
                onClick={() => openZoom(qaScreenshotUrl, qaLabel)}
                title="放大檢視"
              >
                🔎
              </button>
            </div>
            <div
              className="ec-panel-scroll"
              ref={rightPanelRef}
              onScroll={() => handleScroll('right')}
            >
              <img
                src={qaScreenshotUrl}
                alt={qaLabel}
                className="ec-screenshot"
                draggable={false}
              />
            </div>
          </div>
        </div>

        {/* Hint */}
        <div className="ec-hint">
          💡 點擊 🔎 按鈕可放大檢視圖片 | 拖動滾動或使用同步滾動功能
        </div>
      </div>

      {/* Zoom Modal */}
      {zoomedImage && (
        <div className="ec-zoom-modal" onClick={closeZoom}>
          <div className="ec-zoom-header">
            <div className="ec-zoom-title">
              <span>{zoomLabel}</span>
            </div>
            <div className="ec-zoom-controls">
              <button onClick={(e) => { e.stopPropagation(); zoomOut() }} title="縮小 (-)">
                ➖
              </button>
              <span className="ec-zoom-level">{zoomLevel}%</span>
              <button onClick={(e) => { e.stopPropagation(); zoomIn() }} title="放大 (+)">
                ➕
              </button>
              <button onClick={(e) => { e.stopPropagation(); resetZoom() }} title="重置">
                🔄
              </button>
              <button onClick={(e) => { e.stopPropagation(); closeZoom() }} title="關閉 (Esc)">
                ✕
              </button>
            </div>
          </div>
          <div className="ec-zoom-content" onClick={(e) => e.stopPropagation()}>
            <img
              src={zoomedImage}
              alt={zoomLabel}
              style={{ transform: `scale(${zoomLevel / 100})` }}
              className="ec-zoom-image"
              draggable={false}
            />
          </div>
        </div>
      )}

      <style>{`
        .evidence-comparison {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 12px;
          overflow: hidden;
        }

        .ec-header {
          height: 52px;
          background: var(--bg-light);
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 16px;
        }

        .ec-header-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .ec-logo {
          font-size: 18px;
        }

        .ec-title {
          font-size: 15px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .ec-header-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .ec-sync-toggle {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: var(--text-secondary);
          cursor: pointer;
        }

        .ec-sync-toggle input {
          width: 16px;
          height: 16px;
          accent-color: var(--primary);
          cursor: pointer;
        }

        .ec-comparison-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1px;
          background: var(--border);
        }

        .ec-panel {
          background: var(--bg-dark);
          display: flex;
          flex-direction: column;
        }

        .ec-panel-header {
          height: 40px;
          background: var(--bg-card);
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          padding: 0 12px;
          gap: 8px;
        }

        .ec-panel-badge {
          font-size: 14px;
        }

        .ec-panel-badge.dev {
          background: #10B98120;
          padding: 2px 8px;
          border-radius: 4px;
        }

        .ec-panel-badge.qa {
          background: #3B82F620;
          padding: 2px 8px;
          border-radius: 4px;
        }

        .ec-panel-label {
          font-size: 13px;
          font-weight: 500;
          color: var(--text-primary);
          flex: 1;
        }

        .ec-zoom-btn {
          width: 28px;
          height: 28px;
          border-radius: 6px;
          background: var(--bg-light);
          border: 1px solid var(--border);
          color: var(--text-secondary);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          transition: all 0.2s;
        }

        .ec-zoom-btn:hover {
          background: var(--primary);
          color: #fff;
          border-color: var(--primary);
        }

        .ec-panel-scroll {
          flex: 1;
          overflow: auto;
          min-height: 300px;
          max-height: 500px;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding: 12px;
          cursor: grab;
        }

        .ec-panel-scroll:active {
          cursor: grabbing;
        }

        .ec-screenshot {
          max-width: 100%;
          height: auto;
          border-radius: 6px;
          pointer-events: none;
          user-select: none;
        }

        .ec-hint {
          padding: 8px 16px;
          font-size: 12px;
          color: var(--text-muted);
          background: var(--bg-card);
          border-top: 1px solid var(--border);
          text-align: center;
        }

        /* Zoom Modal */
        .ec-zoom-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(10, 14, 23, 0.95);
          display: flex;
          flex-direction: column;
          z-index: 1000;
          cursor: zoom-out;
        }

        .ec-zoom-header {
          height: 52px;
          background: var(--bg-card);
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 16px;
          flex-shrink: 0;
        }

        .ec-zoom-title {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .ec-zoom-controls {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .ec-zoom-controls button {
          width: 32px;
          height: 32px;
          border-radius: 6px;
          background: var(--bg-light);
          border: 1px solid var(--border);
          color: var(--text-secondary);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          transition: all 0.2s;
        }

        .ec-zoom-controls button:hover {
          background: var(--primary);
          color: #fff;
          border-color: var(--primary);
        }

        .ec-zoom-level {
          font-size: 13px;
          font-weight: 500;
          color: var(--text-secondary);
          min-width: 50px;
          text-align: center;
        }

        .ec-zoom-content {
          flex: 1;
          overflow: auto;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: default;
          padding: 20px;
        }

        .ec-zoom-image {
          transition: transform 0.2s ease;
          max-width: none;
          border-radius: 8px;
          pointer-events: none;
          user-select: none;
        }
      `}</style>
    </>
  )
}

import { useState, useEffect, useRef } from 'react';
import { 
  type ThinkingChain, 
  type ThinkingStep, 
  type ThinkingChainDisplayProps,
  STEP_CONFIG,
  highlightSyntax,
  containsError
} from '../types/thinking-chain';

// Agent information mapping
const AGENT_INFO: Record<string, { name: string; emoji: string }> = {
  'task-tracking': { name: '指揮台', emoji: '📋' },
  'requirements': { name: '透析器', emoji: '🔍' },
  'art-design': { name: '調色盤', emoji: '🎨' },
  'engineering': { name: '編譯器', emoji: '⚙️' },
  'art-review': { name: '鑑賞家', emoji: '🖼️' },
  'feature-review': { name: '測試台', emoji: '🧪' },
  'devops': { name: '部署艦', emoji: '🚀' },
};

// Generate mock thinking chain for demo
function generateMockThinkingChain(): ThinkingChain {
  const steps: ThinkingStep[] = [
    {
      id: '1',
      type: 'thought',
      content: '我需要完成這個 GitHub Issue #67 - 實現思考鏈分層顯示功能。讓我先分析需求：1) 分層顯示 Thought/Action/Observation，2) 錯誤自動高亮，3) 語法著色。',
      timestamp: new Date(Date.now() - 300000).toISOString(),
      agentId: 'engineering',
    },
    {
      id: '2',
      type: 'action',
      content: '創建思考鏈類型定義',
      timestamp: new Date(Date.now() - 280000).toISOString(),
      agentId: 'engineering',
      toolName: 'write',
      toolInput: { path: 'src/types/thinking-chain.ts' },
    },
    {
      id: '3',
      type: 'observation',
      content: '成功創建類型定義文件，包含 ThinkingStep、ThinkingChain 接口和 STEP_CONFIG 配置。',
      timestamp: new Date(Date.now() - 260000).toISOString(),
      agentId: 'engineering',
    },
    {
      id: '4',
      type: 'thought',
      content: '現在需要創建顯示組件。考慮使用 Accordion 樣式來折疊/展開每個步驟，並且對錯誤內容進行高亮處理。',
      timestamp: new Date(Date.now() - 240000).toISOString(),
      agentId: 'engineering',
    },
    {
      id: '5',
      type: 'action',
      content: '創建 ThinkingChainDisplay 組件',
      timestamp: new Date(Date.now() - 220000).toISOString(),
      agentId: 'engineering',
      toolName: 'write',
      toolInput: { path: 'src/components/ThinkingChainDisplay.tsx' },
    },
    {
      id: '6',
      type: 'error',
      content: 'TypeError: Cannot read property "map" of undefined',
      timestamp: new Date(Date.now() - 200000).toISOString(),
      agentId: 'engineering',
      error: '嘗試渲染 steps 時，發現 steps 可能為 undefined。需要添加空值檢查。',
    },
    {
      id: '7',
      type: 'thought',
      content: '需要添加防禦性編程，檢查 steps 是否存在。如果不存在，顯示空狀態提示。',
      timestamp: new Date(Date.now() - 180000).toISOString(),
      agentId: 'engineering',
    },
    {
      id: '8',
      type: 'action',
      content: '修復組件中的空值處理',
      timestamp: new Date(Date.now() - 160000).toISOString(),
      agentId: 'engineering',
      toolName: 'edit',
      toolInput: { path: 'src/components/ThinkingChainDisplay.tsx' },
    },
    {
      id: '9',
      type: 'observation',
      content: '修復後組件正常運作。添加了 steps?.map() 可選鏈操作，並添加了 loading 和 empty 狀態。',
      timestamp: new Date(Date.now() - 140000).toISOString(),
      agentId: 'engineering',
    },
    {
      id: '10',
      type: 'thought',
      content: '現在需要添加語法高亮功能。使用基本的正則表達式來識別字符串、數字、關鍵字等。',
      timestamp: new Date(Date.now() - 120000).toISOString(),
      agentId: 'engineering',
    },
    {
      id: '11',
      type: 'action',
      content: '實現 highlightSyntax 函數',
      timestamp: new Date(Date.now() - 100000).toISOString(),
      agentId: 'engineering',
      toolName: 'write',
      toolInput: { path: 'src/types/thinking-chain.ts' },
    },
    {
      id: '12',
      type: 'result',
      content: '完成思考鏈顯示功能的開發，包括：類型定義、顯示組件、語法高亮、錯誤高亮。',
      timestamp: new Date(Date.now() - 60000).toISOString(),
      agentId: 'engineering',
    },
  ];

  return {
    taskId: '#67',
    agentId: 'engineering',
    steps,
    status: 'completed',
    startTime: new Date(Date.now() - 300000).toISOString(),
    endTime: new Date(Date.now() - 60000).toISOString(),
  };
}

// Format timestamp
function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('zh-TW', { 
    hour: '2-digit', 
    minute: '2-digit',
    second: '2-digit'
  });
}

// Calculate duration
function formatDuration(startTime: string, endTime?: string): string {
  const start = new Date(startTime).getTime();
  const end = endTime ? new Date(endTime).getTime() : Date.now();
  const duration = Math.floor((end - start) / 1000);
  
  if (duration < 60) return `${duration}秒`;
  if (duration < 3600) return `${Math.floor(duration / 60)}分${duration % 60}秒`;
  return `${Math.floor(duration / 3600)}小時${Math.floor((duration % 3600) / 60)}分`;
}

// Step content renderer with syntax highlighting
function StepContent({ step, isCollapsed, onToggle }: { 
  step: ThinkingStep; 
  isCollapsed: boolean;
  onToggle: () => void;
}) {
  const config = STEP_CONFIG[step.type];
  const hasError = step.type === 'error' || containsError(step.content);
  
  // Check if content looks like code
  const isCode = step.content.includes('{') || 
                 step.content.includes('function') || 
                 step.content.includes('=>') ||
                 step.toolName;

  return (
    <div 
      className={`thinking-step ${step.type} ${hasError ? 'has-error' : ''}`}
      style={{ 
        borderLeftColor: config.color,
        backgroundColor: hasError ? 'rgba(239, 68, 68, 0.08)' : config.bgColor
      }}
    >
      <div className="step-header" onClick={onToggle}>
        <div className="step-type" style={{ color: config.color }}>
          <span className="step-icon">{config.icon}</span>
          <span className="step-label">{config.label}</span>
        </div>
        <div className="step-meta">
          <span className="step-time">{formatTime(step.timestamp)}</span>
          <button className="step-toggle">
            {isCollapsed ? '▼' : '▲'}
          </button>
        </div>
      </div>
      
      {!isCollapsed && (
        <div className="step-content">
          {isCode ? (
            <pre 
              className="step-code"
              dangerouslySetInnerHTML={{ 
                __html: highlightSyntax(step.content) 
              }}
            />
          ) : (
            <p className="step-text">{step.content}</p>
          )}
          
          {/* Tool information */}
          {step.toolName && (
            <div className="step-tool">
              <span className="tool-label">工具:</span>
              <code className="tool-name">{step.toolName}</code>
              {step.toolInput && (
                <details className="tool-input">
                  <summary>輸入</summary>
                  <pre>{JSON.stringify(step.toolInput, null, 2)}</pre>
                </details>
              )}
            </div>
          )}
          
          {/* Error details */}
          {step.error && (
            <div className="step-error">
              <span className="error-label">錯誤分析:</span>
              <p>{step.error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ThinkingChainDisplay({ 
  chain: initialChain, 
  maxHeight = '600px',
  showAgentInfo = true,
  autoScroll = true 
}: ThinkingChainDisplayProps) {
  const [chain, setChain] = useState<ThinkingChain | null>(initialChain || null);
  const [loading, setLoading] = useState(!initialChain);
  const [collapsedSteps, setCollapsedSteps] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Simulate loading
    if (!initialChain) {
      setTimeout(() => {
        setChain(generateMockThinkingChain());
        setLoading(false);
      }, 500);
    }
  }, [initialChain]);

  // Auto-scroll to bottom when new steps are added
  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [chain?.steps, autoScroll]);

  const toggleStep = (stepId: string) => {
    setCollapsedSteps(prev => {
      const next = new Set(prev);
      if (next.has(stepId)) {
        next.delete(stepId);
      } else {
        next.add(stepId);
      }
      return next;
    });
  };

  const toggleAll = (collapse: boolean) => {
    if (collapse) {
      setCollapsedSteps(new Set(chain?.steps.map(s => s.id) || []));
    } else {
      setCollapsedSteps(new Set());
    }
  };

  if (loading) {
    return (
      <div className="thinking-chain loading">
        <div className="loading-spinner">載入思考鏈...</div>
      </div>
    );
  }

  if (!chain) {
    return (
      <div className="thinking-chain empty">
        <div className="empty-state">暫無思考鏈數據</div>
      </div>
    );
  }

  const agent = AGENT_INFO[chain.agentId];
  const errorCount = chain.steps.filter(s => s.type === 'error' || containsError(s.content)).length;

  return (
    <div className="thinking-chain" style={{ maxHeight }}>
      {/* Header */}
      <div className="chain-header">
        <div className="chain-info">
          {showAgentInfo && agent && (
            <span className="chain-agent">
              {agent.emoji} {agent.name}
            </span>
          )}
          <span className="chain-task">{chain.taskId}</span>
          <span className={`chain-status ${chain.status}`}>
            {chain.status === 'running' && '🔄 執行中'}
            {chain.status === 'completed' && '✅ 完成'}
            {chain.status === 'failed' && '❌ 失敗'}
          </span>
        </div>
        <div className="chain-meta">
          <span className="chain-duration">
            ⏱️ {formatDuration(chain.startTime, chain.endTime)}
          </span>
          {errorCount > 0 && (
            <span className="chain-errors" title={`${errorCount} 個錯誤`}>
              ⚠️ {errorCount}
            </span>
          )}
          <button 
            className="chain-toggle-all"
            onClick={() => toggleAll(collapsedSteps.size === 0)}
            title={collapsedSteps.size === 0 ? '全部折疊' : '全部展開'}
          >
            {collapsedSteps.size === 0 ? '⬆️ 折疊' : '⬇️ 展開'}
          </button>
        </div>
      </div>

      {/* Steps */}
      <div className="chain-steps" ref={containerRef}>
        {chain.steps.map((step) => (
          <StepContent
            key={step.id}
            step={step}
            isCollapsed={collapsedSteps.has(step.id)}
            onToggle={() => toggleStep(step.id)}
          />
        ))}
      </div>

      {/* Footer summary */}
      <div className="chain-footer">
        <div className="chain-stats">
          <span>🧠 {chain.steps.filter(s => s.type === 'thought').length} 思考</span>
          <span>⚡ {chain.steps.filter(s => s.type === 'action').length} 行動</span>
          <span>👁️ {chain.steps.filter(s => s.type === 'observation').length} 觀察</span>
          {errorCount > 0 && (
            <span className="error-stat">❌ {errorCount} 錯誤</span>
          )}
        </div>
      </div>
    </div>
  );
}

// Compact version for embedding in other components
export function ThinkingChainPanel() {
  return (
    <div className="thinking-chain-panel">
      <ThinkingChainDisplay maxHeight="calc(100vh - 200px)" />
    </div>
  );
}

export default ThinkingChainDisplay;

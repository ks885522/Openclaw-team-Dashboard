/**
 * Thinking Chain Types
 * ReAct pattern: Thought → Action → Observation
 */

export type ChainStepType = 'thought' | 'action' | 'observation' | 'error' | 'result';

export interface ThinkingStep {
  id: string;
  type: ChainStepType;
  content: string;
  timestamp: string;
  agentId?: string;
  toolName?: string;
  toolInput?: Record<string, unknown>;
  toolOutput?: string;
  error?: string;
  isCollapsed?: boolean;
}

export interface ThinkingChain {
  taskId: string;
  agentId: string;
  steps: ThinkingStep[];
  status: 'running' | 'completed' | 'failed';
  startTime: string;
  endTime?: string;
}

export interface ThinkingChainDisplayProps {
  chain?: ThinkingChain;
  maxHeight?: string;
  showAgentInfo?: boolean;
  autoScroll?: boolean;
}

/**
 * Step type to display configuration
 */
export const STEP_CONFIG: Record<ChainStepType, { 
  label: string; 
  icon: string; 
  color: string; 
  bgColor: string;
}> = {
  thought: { 
    label: '思考', 
    icon: '🧠', 
    color: '#8B5CF6',
    bgColor: 'rgba(139, 92, 246, 0.1)'
  },
  action: { 
    label: '行動', 
    icon: '⚡', 
    color: '#3B82F6',
    bgColor: 'rgba(59, 130, 246, 0.1)'
  },
  observation: { 
    label: '觀察', 
    icon: '👁️', 
    color: '#10B981',
    bgColor: 'rgba(16, 185, 129, 0.1)'
  },
  error: { 
    label: '錯誤', 
    icon: '❌', 
    color: '#EF4444',
    bgColor: 'rgba(239, 68, 68, 0.15)'
  },
  result: { 
    label: '結果', 
    icon: '✅', 
    color: '#22C55E',
    bgColor: 'rgba(34, 197, 94, 0.1)'
  },
};

/**
 * Syntax highlighting for code blocks
 */
export function highlightSyntax(code: string): string {
  // Basic syntax highlighting patterns
  const patterns: Array<[RegExp, string]> = [
    // Strings
    [/(["'])(?:(?!\1)[^\\]|\\.)*\1/g, '<span class="syntax-string">$&</span>'],
    // Numbers
    [/\b(\d+\.?\d*)\b/g, '<span class="syntax-number">$1</span>'],
    // Keywords
    [/\b(const|let|var|function|return|if|else|for|while|class|import|export|from|async|await|try|catch|throw|new|this|typeof|instanceof)\b/g, '<span class="syntax-keyword">$1</span>'],
    // Comments
    [/\/\/.*$/gm, '<span class="syntax-comment">$&</span>'],
    [/\/\*[\s\S]*?\*\//g, '<span class="syntax-comment">$&</span>'],
    // Function calls
    [/\b([a-zA-Z_]\w*)\s*\(/g, '<span class="syntax-function">$1</span>('],
  ];

  let result = code;
  for (const [pattern, replacement] of patterns) {
    result = result.replace(pattern, replacement);
  }
  
  return result;
}

/**
 * Check if content contains error/exception
 */
export function containsError(content: string): boolean {
  const errorPatterns = [
    /error/i,
    /exception/i,
    /fail/i,
    /cannot/i,
    /unable to/i,
    /undefined/i,
    /null/i,
    /TypeError/i,
    /ReferenceError/i,
    /SyntaxError/i,
  ];
  
  return errorPatterns.some(pattern => pattern.test(content));
}

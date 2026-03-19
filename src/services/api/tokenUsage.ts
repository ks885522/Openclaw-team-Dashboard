// Token Usage API Service
// 串接後端 /api/token/cycles 獲取 Token 消耗分佈數據

export interface TokenCycle {
  agentId: string;
  cycleStart: number;
  cycleEnd: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  estimatedCost: number;
  requestCount: number;
  tasks: string[];
  budget: number;
  remaining: number;
  remainingPercent: number;
  isLow: boolean;
  cycleStartISO: string;
  cycleEndISO: string;
}

export interface AgentTokenSummary {
  agentId: string;
  name: string;
  emoji: string;
  cycles: TokenCycle[];
}

export interface TokenCyclesResponse {
  cycleDurationHours: number;
  budgetPerCycle: number;
  currentCycle: {
    start: string;
    end: string;
  };
  cycles: TokenCycle[];
  byAgent: Record<string, AgentTokenSummary>;
  summary: {
    totalTokensUsed: number;
    totalCostUSD: number;
    totalRequests: number;
    lowBudgetAgents: string[];
  };
  timestamp: string;
}

/**
 * Fetch token cycle consumption data
 */
export async function fetchTokenCycles(days: number = 1, agentId?: string): Promise<TokenCyclesResponse> {
  let url = `/api/token/cycles?days=${days}`;
  if (agentId) {
    url += `&agent=${agentId}`;
  }

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Token API error: ${response.status}`);
  }

  return response.json();
}

/**
 * Format token count for display
 */
export function formatTokens(tokens: number): string {
  if (tokens >= 1000000) {
    return (tokens / 1000000).toFixed(2) + 'M';
  }
  if (tokens >= 1000) {
    return (tokens / 1000).toFixed(1) + 'K';
  }
  return tokens.toString();
}

/**
 * Format currency for display
 */
export function formatCost(costUSD: number): string {
  return '$' + costUSD.toFixed(4);
}

/**
 * Get warning level based on remaining percent
 */
export function getWarningLevel(remainingPercent: number): 'ok' | 'warning' | 'critical' {
  if (remainingPercent < 10) return 'critical';
  if (remainingPercent < 20) return 'warning';
  return 'ok';
}

export default {
  fetchTokenCycles,
  formatTokens,
  formatCost,
  getWarningLevel,
};

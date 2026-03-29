// Trust Score API service
// Uses Vite proxy (relative path) - no hardcoded port

export interface TrustScoreData {
  scores: Record<string, number>;
  history: TrustScoreEvent[];
  config: TrustScoreConfig;
}

export interface TrustScoreEvent {
  issueNumber: number;
  title: string;
  agentId: string;
  timestamp: string;
  type: string;
}

export interface TrustScoreConfig {
  initialScore: number;
  qaRejectedPenalty: number;
  taskCompletedBonus: number;
  reviewApprovedBonus: number;
  criticalIssuePenalty: number;
  maxScore: number;
  minScore: number;
}

export interface TrustLeaderboardEntry {
  agentId: string;
  score: number;
}

export async function fetchTrustScores(): Promise<TrustScoreData> {
  const response = await fetch('/api/trust-scores');
  if (!response.ok) {
    throw new Error('Failed to fetch trust scores');
  }
  return response.json();
}

export async function fetchTrustLeaderboard(): Promise<TrustLeaderboardEntry[]> {
  const response = await fetch('/api/trust-scores/leaderboard');
  if (!response.ok) {
    throw new Error('Failed to fetch trust leaderboard');
  }
  return response.json();
}

export async function resetTrustScores(): Promise<void> {
  const response = await fetch('/api/trust-scores/reset', {
    method: 'POST'
  });
  if (!response.ok) {
    throw new Error('Failed to reset trust scores');
  }
}

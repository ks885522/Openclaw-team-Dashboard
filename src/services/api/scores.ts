// Score API service
const API_BASE = 'http://localhost:18789';

export interface ScoreData {
  scores: Record<string, number>;
  history: ScoreEvent[];
  config: ScoreConfig;
}

export interface ScoreEvent {
  agentId: string;
  eventType: string;
  points: number;
  newTotal: number;
  details: Record<string, any>;
  timestamp: string;
}

export interface ScoreConfig {
  taskCompleted: number;
  reviewApproved: number;
  taskRejected: number;
  criticalBugFound: number;
}

export interface LeaderboardEntry {
  agentId: string;
  score: number;
}

export async function fetchScores(): Promise<ScoreData> {
  const response = await fetch(`${API_BASE}/api/scores`);
  if (!response.ok) {
    throw new Error('Failed to fetch scores');
  }
  return response.json();
}

export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  const response = await fetch(`${API_BASE}/api/scores/leaderboard`);
  if (!response.ok) {
    throw new Error('Failed to fetch leaderboard');
  }
  return response.json();
}

export async function resetScores(): Promise<void> {
  const response = await fetch(`${API_BASE}/api/scores/reset`, {
    method: 'POST'
  });
  if (!response.ok) {
    throw new Error('Failed to reset scores');
  }
}

export async function updateScore(
  agentId: string,
  eventType: string,
  points: number,
  details?: Record<string, any>
): Promise<{ agentId: string; points: number; newTotal: number }> {
  const response = await fetch(`${API_BASE}/api/scores`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agentId, eventType, points, details })
  });
  if (!response.ok) {
    throw new Error('Failed to update score');
  }
  return response.json();
}

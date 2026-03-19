// Progress Prediction API service

export interface ProgressPrediction {
  issueNumber: number;
  title: string;
  currentStage: 'todo' | 'in_progress' | 'waiting_for_review' | 'done';
  createdAt: string;
  daysElapsed: number;
  estimatedRemainingHours: number;
  estimatedCompletionDate: string;
}

export interface ProgressPredictionData {
  averages: {
    todoToInProgress: number;
    inProgressToReview: number;
    reviewToDone: number;
  };
  sampleSize: number;
  prediction: ProgressPrediction | null;
}

export async function fetchProgressPrediction(issueNumber?: number): Promise<ProgressPredictionData> {
  const params = new URLSearchParams();
  if (issueNumber) {
    params.set('issue', issueNumber.toString());
  }
  
  const url = `/api/progress-prediction${params.toString() ? '?' + params.toString() : ''}`;
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error('Failed to fetch progress prediction');
  }
  
  return response.json();
}

export function formatEstimatedTime(hours: number): string {
  if (hours <= 0) return '即將完成';
  if (hours < 24) return `約 ${Math.round(hours)} 小時`;
  const days = hours / 24;
  return `約 ${days.toFixed(1)} 天`;
}

export function getStageLabel(stage: string): string {
  const stageLabels: Record<string, string> = {
    'todo': '待處理',
    'in_progress': '進行中',
    'waiting_for_review': '等待審查',
    'done': '已完成'
  };
  return stageLabels[stage] || stage;
}

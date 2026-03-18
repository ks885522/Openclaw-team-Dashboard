// DoD 合規率 API 服務

const API_BASE = 'http://localhost:18789';

export interface DoDCompliancePeriod {
  since: string;
  until: string;
  days: number;
}

export interface DoDComplianceSummary {
  totalClosed: number;
  artApproved: number;
  funcApproved: number;
  bothApproved: number;
  complianceRate: number;
}

export interface DoDComplianceIssue {
  number: number;
  title: string;
  closedAt: string;
  labels: string[];
  artApproved: boolean;
  funcApproved: boolean;
  compliant: boolean;
}

export interface DoDComplianceData {
  period: DoDCompliancePeriod;
  summary: DoDComplianceSummary;
  issues: DoDComplianceIssue[];
}

export async function fetchDoDCompliance(
  days?: number,
  startDate?: string,
  endDate?: string
): Promise<DoDComplianceData> {
  let url = `${API_BASE}/api/dod-compliance`;
  const params = new URLSearchParams();
  
  if (days) params.set('days', days.toString());
  if (startDate) params.set('startDate', startDate);
  if (endDate) params.set('endDate', endDate);
  
  if (params.toString()) {
    url += `?${params.toString()}`;
  }
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch DoD compliance data');
  }
  return response.json();
}

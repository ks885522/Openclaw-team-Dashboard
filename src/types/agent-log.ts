/**
 * Agent Performance Log Types
 * 
 * JSON Schema for Agent activity logs as defined in Issue #34
 * Required fields: agent_id, action, timestamp, outcome
 */

export type AgentId = string;

export type AgentAction = 
  | 'session_start'
  | 'session_end'
  | 'task_assigned'
  | 'task_completed'
  | 'task_failed'
  | 'message_sent'
  | 'tool_called'
  | 'error_occurred'
  | 'heartbeat'
  | 'branch_created'
  | 'branch_deleted'
  | 'pr_created'
  | 'pr_merged'
  | 'pr_closed'
  | 'commit_pushed'
  | 'issue_created'
  | 'issue_closed'
  | 'code_review'
  | 'build_started'
  | 'build_completed'
  | 'build_failed'
  | 'test_executed'
  | 'deployment_started'
  | 'deployment_completed'
  | 'deployment_failed';

export type ActionOutcome = 
  | 'success'
  | 'failure'
  | 'pending'
  | 'cancelled';

export interface AgentActivityLog {
  /** Unique identifier for the Agent (e.g., 'engineering', 'art-design') */
  agent_id: AgentId;
  
  /** Type of action performed by the Agent */
  action: AgentAction;
  
  /** ISO 8601 timestamp of when the action occurred */
  timestamp: string;
  
  /** Result of the action */
  outcome: ActionOutcome;
  
  /** Optional: ID of the task being worked on */
  task_id?: string;
  
  /** Optional: ID of the session */
  session_id?: string;
  
  /** Optional: Additional metadata or description */
  metadata?: Record<string, unknown>;
  
  /** Optional: Duration of the action in milliseconds */
  duration_ms?: number;
  
  /** Optional: Error message if outcome is 'failure' */
  error_message?: string;
}

export interface AgentPerformanceMetrics {
  agent_id: AgentId;
  total_sessions: number;
  total_tasks_completed: number;
  total_tasks_failed: number;
  success_rate: number;
  average_duration_ms: number;
  last_active: string;
}

/**
 * Create a new Agent activity log entry
 */
export function createActivityLog(
  agentId: AgentId,
  action: AgentAction,
  outcome: ActionOutcome,
  options?: {
    task_id?: string;
    session_id?: string;
    metadata?: Record<string, unknown>;
    duration_ms?: number;
    error_message?: string;
  }
): AgentActivityLog {
  return {
    agent_id: agentId,
    action,
    timestamp: new Date().toISOString(),
    outcome,
    ...options
  };
}

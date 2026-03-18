/**
 * Agent Performance Logger
 * 
 * Centralized logging utility for all Agents to record activity logs.
 * Logs are written to both console and a JSON file for persistence.
 * Supports real-time logging via API when available.
 * 
 * Usage:
 *   import { agentLogger } from './services/logger/agent-logger';
 *   
 *   // Log an action
 *   agentLogger.log('engineering', 'task_completed', 'success', {
 *     task_id: '123',
 *     duration_ms: 5000
 *   });
 *   
 *   // Enable real-time logging to API server
 *   agentLogger.setRealtimeMode(true, 'http://localhost:18789');
 *   
 *   // Git operations
 *   agentLogger.branchCreated('engineering', 'feature/123-new-feature');
 *   agentLogger.prCreated('engineering', 'PR #123', 123);
 *   agentLogger.prMerged('engineering', 'PR #123', 123);
 *   
 *   // Build & Deploy
 *   agentLogger.buildStarted('engineering', 'main');
 *   agentLogger.buildCompleted('engineering', 'main');
 *   agentLogger.deploymentCompleted('engineering', 'production');
 */

import * as fs from 'fs';
import * as path from 'path';
import { AgentActivityLog, AgentAction, ActionOutcome, AgentId } from '../../types/agent-log';

const LOG_DIR = path.join(process.cwd(), 'logs');
const AGENT_LOG_FILE = path.join(LOG_DIR, 'agent-activity.log');

interface LogOptions {
  task_id?: string;
  session_id?: string;
  metadata?: Record<string, unknown>;
  duration_ms?: number;
  error_message?: string;
  realtime?: boolean; // Override realtime setting for this log
  // Git related
  branch_name?: string;
  pr_number?: number;
  pr_title?: string;
  commit_sha?: string;
  // Build/Deploy related
  build_id?: string;
  environment?: string;
  version?: string;
}

// Configuration for real-time mode
let realtimeEnabled = false;
let apiServerUrl = 'http://localhost:18789';

/**
 * Ensure the log directory exists
 */
function ensureLogDir(): void {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

/**
 * Write a log entry to the JSON log file
 */
function writeToFile(log: AgentActivityLog): void {
  ensureLogDir();
  
  const logLine = JSON.stringify(log) + '\n';
  
  fs.appendFile(AGENT_LOG_FILE, logLine, (err) => {
    if (err) {
      console.error('[AgentLogger] Failed to write to log file:', err);
    }
  });
}

/**
 * Send log to API server for real-time logging
 */
async function sendToApi(log: AgentActivityLog): Promise<boolean> {
  if (!realtimeEnabled) return false;
  
  try {
    const response = await fetch(`${apiServerUrl}/api/agent-logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(log)
    });
    
    return response.ok;
  } catch (err) {
    // Silently fail - real-time logging is best-effort
    return false;
  }
}

/**
 * Format log entry for console output
 */
function formatForConsole(log: AgentActivityLog): string {
  const statusEmoji = log.outcome === 'success' ? '✅' : log.outcome === 'failure' ? '❌' : '⏳';
  const taskInfo = log.task_id ? `[Task #${log.task_id}]` : '';
  const branchInfo = log.metadata?.branch_name ? `[${log.metadata.branch_name}]` : '';
  const prInfo = log.metadata?.pr_number ? `[PR #${log.metadata.pr_number}]` : '';
  const durationInfo = log.duration_ms ? `(${log.duration_ms}ms)` : '';
  
  return `${statusEmoji} [${log.agent_id}] ${log.action} ${taskInfo} ${branchInfo} ${prInfo} ${durationInfo}`.trim();
}

type LogFilter = {
  agent_id?: AgentId;
  action?: AgentAction;
  outcome?: ActionOutcome;
  task_id?: string;
  startTime?: Date;
  endTime?: Date;
};

/**
 * Agent Logger - Centralized logging for all Agents
 */
export const agentLogger = {
  /**
   * Enable or disable real-time logging to API server
   */
  setRealtimeMode(enabled: boolean, serverUrl?: string): void {
    realtimeEnabled = enabled;
    if (serverUrl) {
      apiServerUrl = serverUrl;
    }
    console.log(`[AgentLogger] Real-time mode: ${enabled ? 'enabled' : 'disabled'}`);
  },

  /**
   * Check if real-time mode is enabled
   */
  isRealtimeEnabled(): boolean {
    return realtimeEnabled;
  },

  /**
   * Log an Agent activity
   */
  log(
    agentId: AgentId,
    action: AgentAction,
    outcome: ActionOutcome,
    options?: LogOptions
  ): AgentActivityLog {
    const logEntry: AgentActivityLog = {
      agent_id: agentId,
      action,
      timestamp: new Date().toISOString(),
      outcome,
      task_id: options?.task_id,
      session_id: options?.session_id,
      duration_ms: options?.duration_ms,
      error_message: options?.error_message,
      metadata: options?.metadata || {}
    };

    // Add optional metadata fields
    if (options?.branch_name) logEntry.metadata!.branch_name = options.branch_name;
    if (options?.pr_number) logEntry.metadata!.pr_number = options.pr_number;
    if (options?.pr_title) logEntry.metadata!.pr_title = options.pr_title;
    if (options?.commit_sha) logEntry.metadata!.commit_sha = options.commit_sha;
    if (options?.build_id) logEntry.metadata!.build_id = options.build_id;
    if (options?.environment) logEntry.metadata!.environment = options.environment;
    if (options?.version) logEntry.metadata!.version = options.version;

    // Write to console
    console.log(`[Agent:${agentId}]`, formatForConsole(logEntry));
    
    // Write to file (always)
    writeToFile(logEntry);
    
    // Send to API if realtime is enabled (and not explicitly disabled for this log)
    const shouldRealtime = options?.realtime !== false && realtimeEnabled;
    if (shouldRealtime) {
      sendToApi(logEntry);
    }
    
    return logEntry;
  },

  // ========== Session Logging ==========
  
  /**
   * Log session start
   */
  sessionStart(agentId: AgentId, sessionId?: string): AgentActivityLog {
    return this.log(agentId, 'session_start', 'pending', { session_id: sessionId });
  },

  /**
   * Log session end
   */
  sessionEnd(agentId: AgentId, outcome: ActionOutcome, sessionId?: string): AgentActivityLog {
    return this.log(agentId, 'session_end', outcome, { session_id: sessionId });
  },

  // ========== Task Logging ==========

  /**
   * Log task assignment
   */
  taskAssigned(agentId: AgentId, taskId: string): AgentActivityLog {
    return this.log(agentId, 'task_assigned', 'pending', { task_id: taskId });
  },

  /**
   * Log task completion
   */
  taskCompleted(agentId: AgentId, taskId: string, durationMs?: number): AgentActivityLog {
    return this.log(agentId, 'task_completed', 'success', { 
      task_id: taskId, 
      duration_ms: durationMs 
    });
  },

  /**
   * Log task failure
   */
  taskFailed(agentId: AgentId, taskId: string, errorMessage: string, durationMs?: number): AgentActivityLog {
    return this.log(agentId, 'task_failed', 'failure', { 
      task_id: taskId, 
      error_message: errorMessage,
      duration_ms: durationMs
    });
  },

  // ========== Git Operations ==========

  /**
   * Log branch creation
   */
  branchCreated(agentId: AgentId, branchName: string, taskId?: string): AgentActivityLog {
    return this.log(agentId, 'branch_created', 'success', { 
      task_id: taskId,
      branch_name: branchName 
    });
  },

  /**
   * Log branch deletion
   */
  branchDeleted(agentId: AgentId, branchName: string, taskId?: string): AgentActivityLog {
    return this.log(agentId, 'branch_deleted', 'success', { 
      task_id: taskId,
      branch_name: branchName 
    });
  },

  /**
   * Log PR creation
   */
  prCreated(agentId: AgentId, prTitle: string, prNumber: number, taskId?: string): AgentActivityLog {
    return this.log(agentId, 'pr_created', 'success', { 
      task_id: taskId,
      pr_title: prTitle,
      pr_number: prNumber
    });
  },

  /**
   * Log PR merge
   */
  prMerged(agentId: AgentId, prTitle: string, prNumber: number, taskId?: string): AgentActivityLog {
    return this.log(agentId, 'pr_merged', 'success', { 
      task_id: taskId,
      pr_title: prTitle,
      pr_number: prNumber
    });
  },

  /**
   * Log PR closure
   */
  prClosed(agentId: AgentId, prTitle: string, prNumber: number, taskId?: string): AgentActivityLog {
    return this.log(agentId, 'pr_closed', 'cancelled', { 
      task_id: taskId,
      pr_title: prTitle,
      pr_number: prNumber
    });
  },

  /**
   * Log commit push
   */
  commitPushed(agentId: AgentId, commitSha: string, taskId?: string): AgentActivityLog {
    return this.log(agentId, 'commit_pushed', 'success', { 
      task_id: taskId,
      commit_sha: commitSha
    });
  },

  /**
   * Log code review
   */
  codeReview(agentId: AgentId, outcome: ActionOutcome, taskId?: string, metadata?: Record<string, unknown>): AgentActivityLog {
    return this.log(agentId, 'code_review', outcome, { 
      task_id: taskId,
      metadata 
    });
  },

  // ========== Build & Deploy ==========

  /**
   * Log build start
   */
  buildStarted(agentId: AgentId, branchName: string, buildId?: string): AgentActivityLog {
    return this.log(agentId, 'build_started', 'pending', { 
      branch_name: branchName,
      build_id: buildId
    });
  },

  /**
   * Log build completion
   */
  buildCompleted(agentId: AgentId, branchName: string, buildId?: string, durationMs?: number): AgentActivityLog {
    return this.log(agentId, 'build_completed', 'success', { 
      branch_name: branchName,
      build_id: buildId,
      duration_ms: durationMs
    });
  },

  /**
   * Log build failure
   */
  buildFailed(agentId: AgentId, branchName: string, errorMessage: string, buildId?: string): AgentActivityLog {
    return this.log(agentId, 'build_failed', 'failure', { 
      branch_name: branchName,
      build_id: buildId,
      error_message: errorMessage
    });
  },

  /**
   * Log test execution
   */
  testExecuted(agentId: AgentId, outcome: ActionOutcome, durationMs?: number, metadata?: Record<string, unknown>): AgentActivityLog {
    return this.log(agentId, 'test_executed', outcome, { 
      duration_ms: durationMs,
      metadata
    });
  },

  /**
   * Log deployment start
   */
  deploymentStarted(agentId: AgentId, environment: string, version?: string): AgentActivityLog {
    return this.log(agentId, 'deployment_started', 'pending', { 
      environment,
      version
    });
  },

  /**
   * Log deployment completion
   */
  deploymentCompleted(agentId: AgentId, environment: string, version?: string): AgentActivityLog {
    return this.log(agentId, 'deployment_completed', 'success', { 
      environment,
      version
    });
  },

  /**
   * Log deployment failure
   */
  deploymentFailed(agentId: AgentId, environment: string, errorMessage: string, version?: string): AgentActivityLog {
    return this.log(agentId, 'deployment_failed', 'failure', { 
      environment,
      version,
      error_message: errorMessage
    });
  },

  // ========== Issue Tracking ==========

  /**
   * Log issue creation
   */
  issueCreated(agentId: AgentId, issueNumber: number, title: string): AgentActivityLog {
    return this.log(agentId, 'issue_created', 'success', { 
      task_id: String(issueNumber),
      metadata: { issue_title: title }
    });
  },

  /**
   * Log issue closure
   */
  issueClosed(agentId: AgentId, issueNumber: number, title: string): AgentActivityLog {
    return this.log(agentId, 'issue_closed', 'success', { 
      task_id: String(issueNumber),
      metadata: { issue_title: title }
    });
  },

  // ========== Error & Heartbeat ==========

  /**
   * Log an error
   */
  error(agentId: AgentId, errorMessage: string, metadata?: Record<string, unknown>): AgentActivityLog {
    return this.log(agentId, 'error_occurred', 'failure', { 
      error_message: errorMessage,
      metadata
    });
  },

  /**
   * Log a heartbeat/ping
   */
  heartbeat(agentId: AgentId, metadata?: Record<string, unknown>): AgentActivityLog {
    return this.log(agentId, 'heartbeat', 'success', { metadata });
  },

  // ========== Query Methods ==========

  /**
   * Read all logs from the log file
   */
  getLogs(): AgentActivityLog[] {
    ensureLogDir();
    
    if (!fs.existsSync(AGENT_LOG_FILE)) {
      return [];
    }

    const content = fs.readFileSync(AGENT_LOG_FILE, 'utf-8');
    return content
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        try {
          return JSON.parse(line) as AgentActivityLog;
        } catch {
          return null;
        }
      })
      .filter((log): log is AgentActivityLog => log !== null);
  },

  /**
   * Get logs for a specific agent
   */
  getAgentLogs(agentId: AgentId): AgentActivityLog[] {
    return this.getLogs().filter(log => log.agent_id === agentId);
  },

  /**
   * Filter logs by criteria
   */
  filterLogs(filter: LogFilter): AgentActivityLog[] {
    return this.getLogs().filter(log => {
      if (filter.agent_id && log.agent_id !== filter.agent_id) return false;
      if (filter.action && log.action !== filter.action) return false;
      if (filter.outcome && log.outcome !== filter.outcome) return false;
      if (filter.task_id && log.task_id !== filter.task_id) return false;
      if (filter.startTime) {
        const logTime = new Date(log.timestamp);
        if (logTime < filter.startTime) return false;
      }
      if (filter.endTime) {
        const logTime = new Date(log.timestamp);
        if (logTime > filter.endTime) return false;
      }
      return true;
    });
  },

  /**
   * Get recent logs (last N entries)
   */
  getRecentLogs(count: number = 50): AgentActivityLog[] {
    const logs = this.getLogs();
    return logs.slice(-count);
  },

  /**
   * Get logs since a specific time
   */
  getLogsSince(date: Date): AgentActivityLog[] {
    return this.filterLogs({ startTime: date });
  },

  /**
   * Clear all logs (use with caution!)
   */
  clearLogs(): void {
    ensureLogDir();
    if (fs.existsSync(AGENT_LOG_FILE)) {
      fs.unlinkSync(AGENT_LOG_FILE);
      console.log('[AgentLogger] All logs cleared');
    }
  }
};

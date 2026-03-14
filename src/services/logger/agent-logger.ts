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
 *   agentLogger.setRealtimeMode(true, 'http://localhost:3001');
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
}

// Configuration for real-time mode
let realtimeEnabled = false;
let apiServerUrl = 'http://localhost:3001';

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
  const durationInfo = log.duration_ms ? `(${log.duration_ms}ms)` : '';
  
  return `${statusEmoji} [${log.agent_id}] ${log.action} ${taskInfo} ${durationInfo}`.trim();
}

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
      ...options
    };

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
  }
};

export default agentLogger;

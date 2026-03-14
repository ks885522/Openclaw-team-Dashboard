// OpenClaw Team Dashboard Backend API Server
// 提供 Agent 狀態 API，串接 OpenClaw Gateway 獲取即時狀態

import express, { Request, Response } from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());

// Agent 成員定義
const AGENT_MEMBERS = [
  { id: 'task-tracking', name: '指揮台', emoji: '📋', role: 'issue 看板管理' },
  { id: 'requirements', name: '透析器', emoji: '🔍', role: '需求解析' },
  { id: 'art-design', name: '調色盤', emoji: '🎨', role: 'UI/美術設計' },
  { id: 'engineering', name: '編譯器', emoji: '⚙️', role: '功能實作' },
  { id: 'art-review', name: '鑑賞家', emoji: '🖼️', role: '視覺審查' },
  { id: 'feature-review', name: '測試台', emoji: '🧪', role: '功能測試' },
  { id: 'devops', name: '部署艦', emoji: '🚀', role: '部署維護' },
] as const;

// OpenClaw Gateway 配置
const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:3000';
const GATEWAY_API_KEY = process.env.GATEWAY_API_KEY || '';

// 類型定義
interface AgentStatus {
  id: string;
  name: string;
  emoji: string;
  role: string;
  status: 'idle' | 'busy' | 'offline';
  currentTask?: string;
  lastActive?: string;
}

interface Session {
  label?: string;
  agentId?: string;
  activeMinutes?: number;
  currentTask?: string;
  lastActive?: string;
}

// 從 OpenClaw Gateway 獲取 sessions
async function fetchSessionsFromGateway(): Promise<Session[]> {
  try {
    const url = `${GATEWAY_URL}/api/sessions?activeMinutes=60`;
    const options: RequestInit = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(GATEWAY_API_KEY && { 'Authorization': `Bearer ${GATEWAY_API_KEY}` }),
      },
    };

    const response = await fetch(url, options);
    
    if (!response.ok) {
      console.error(`Gateway API error: ${response.status} ${response.statusText}`);
      return [];
    }

    const data = await response.json();
    return data.sessions || data || [];
  } catch (error) {
    console.error('Failed to fetch sessions from Gateway:', error);
    return [];
  }
}

// 映射 session 狀態
function mapSessionToStatus(session: Session | undefined): AgentStatus['status'] {
  if (!session || session.activeMinutes === undefined) {
    return 'offline';
  }
  
  // 有最近活動的 session 視為忙碌
  if (session.currentTask) {
    return 'busy';
  }
  
  return 'idle';
}

// API 路由：獲取所有 Agent 狀態
app.get('/api/agents', async (_req: Request, res: Response) => {
  try {
    const sessions = await fetchSessionsFromGateway();
    
    const agents: AgentStatus[] = AGENT_MEMBERS.map(member => {
      const session = sessions.find(
        (s) => s.label === member.id || s.agentId === member.id
      );

      return {
        id: member.id,
        name: `${member.emoji} ${member.name}`,
        emoji: member.emoji,
        role: member.role,
        status: mapSessionToStatus(session),
        currentTask: session?.currentTask,
        lastActive: session?.lastActive,
      };
    });

    res.json({ agents });
  } catch (error) {
    console.error('Error fetching agent statuses:', error);
    res.status(500).json({ error: 'Failed to fetch agent statuses' });
  }
});

// API 路由：健康檢查
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 啟動伺服器
app.listen(PORT, () => {
  console.log(`🚀 OpenClaw Dashboard API Server running on http://localhost:${PORT}`);
  console.log(`📋 Agent Status API: http://localhost:${PORT}/api/agents`);
  console.log(`❤️  Health Check: http://localhost:${PORT}/api/health`);
});

export default app;

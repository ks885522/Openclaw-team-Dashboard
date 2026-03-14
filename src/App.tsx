import { useState, useEffect } from 'react'

interface AgentStatus {
  id: string
  name: string
  status: 'idle' | 'busy' | 'offline'
  currentTask?: string
}

function App() {
  const [agents, setAgents] = useState<AgentStatus[]>([])

  // Mock data for demonstration
  useEffect(() => {
    setAgents([
      { id: 'task-tracking', name: '📋 指揮台', status: 'idle' },
      { id: 'requirements', name: '🔍 透析器', status: 'busy', currentTask: '解析需求...' },
      { id: 'art-design', name: '🎨 調色盤', status: 'idle' },
      { id: 'engineering', name: '⚙️ 編譯器', status: 'busy', currentTask: '實作功能...' },
      { id: 'art-review', name: '🖼️ 鑑賞家', status: 'idle' },
      { id: 'feature-review', name: '🧪 測試台', status: 'offline' },
      { id: 'devops', name: '🚀 部署艦', status: 'idle' },
    ])
  }, [])

  return (
    <div className="dashboard">
      <header>
        <h1>🤖 OpenClaw Team Dashboard</h1>
      </header>
      <main>
        <div className="agents-grid">
          {agents.map(agent => (
            <div key={agent.id} className={`agent-card ${agent.status}`}>
              <div className="agent-name">{agent.name}</div>
              <div className="agent-status">
                <span className={`status-dot ${agent.status}`}></span>
                {agent.status === 'idle' && '閒置'}
                {agent.status === 'busy' && '忙碌中'}
                {agent.status === 'offline' && '離線'}
              </div>
              {agent.currentTask && (
                <div className="current-task">{agent.currentTask}</div>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

export default App

// OpenClaw Temp Worker API Service

export interface TempWorker {
  id: string
  name: string
  description: string
  status: 'created' | 'starting' | 'running' | 'stopping' | 'stopped' | 'terminating' | 'terminated'
  port: number
  createdAt: string
  startedAt: string | null
  stoppedAt: string | null
  terminatedAt: string | null
}

export interface CreateTempWorkerParams {
  name: string
  description?: string
}

const API_BASE = 'http://localhost:18789'

export async function fetchTempWorkers(): Promise<TempWorker[]> {
  const res = await fetch(`${API_BASE}/api/temp-workers`)
  if (!res.ok) throw new Error(`Failed to fetch temp workers: ${res.status}`)
  const data = await res.json()
  return data.workers || []
}

export async function getTempWorker(id: string): Promise<TempWorker> {
  const res = await fetch(`${API_BASE}/api/temp-workers/${id}`)
  if (!res.ok) throw new Error(`Failed to fetch temp worker: ${res.status}`)
  const data = await res.json()
  return data.worker
}

export async function createTempWorker(params: CreateTempWorkerParams): Promise<TempWorker> {
  const res = await fetch(`${API_BASE}/api/temp-workers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  if (!res.ok) throw new Error(`Failed to create temp worker: ${res.status}`)
  return res.json()
}

export async function startTempWorker(id: string): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(`${API_BASE}/api/temp-workers/${id}/start`, { method: 'POST' })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `Failed to start: ${res.status}`)
  return data
}

export async function stopTempWorker(id: string): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(`${API_BASE}/api/temp-workers/${id}/stop`, { method: 'POST' })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `Failed to stop: ${res.status}`)
  return data
}

export async function terminateTempWorker(id: string): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(`${API_BASE}/api/temp-workers/${id}`, { method: 'DELETE' })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `Failed to terminate: ${res.status}`)
  return data
}

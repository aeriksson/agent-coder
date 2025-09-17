const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3030'

export interface Agent {
  name: string
  description: string
  mode: 'tools' | 'flow'
  max_iterations: number
  verbose: boolean
  tools: string[]
  workflow_id?: string
}

export interface AgentEvent {
  timestamp: number
  type: 'agent_event'
  agent_name: string
  event_type: string
  data: any
  message: string
}

export const fetchAgents = async (): Promise<Record<string, Agent>> => {
  const response = await fetch(`${API_BASE}/agents`)
  if (!response.ok) throw new Error('Failed to fetch agents')
  return response.json()
}

export const fetchAgentInfo = async (agentName: string): Promise<Agent> => {
  const response = await fetch(`${API_BASE}/agents/${agentName}`)
  if (!response.ok) throw new Error('Failed to fetch agent info')
  return response.json()
}

export const testAgent = async (agentName: string, goal: string) => {
  const response = await fetch(`${API_BASE}/agents/${agentName}/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ goal })
  })
  if (!response.ok) throw new Error('Failed to test agent')
  return response.json()
}

export const connectWebSocket = (onMessage: (event: AgentEvent) => void): WebSocket => {
  const wsUrl = `${API_BASE.replace('http', 'ws')}/ws/agents`
  const ws = new WebSocket(wsUrl)
  
  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      onMessage(data)
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error)
    }
  }
  
  ws.onerror = (error) => {
    console.error('WebSocket error:', error)
  }
  
  return ws
}

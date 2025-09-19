/**
 * TypeScript client for the Opper Agent API
 */

// === TYPES ===

export type CallStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface Agent {
  name: string;
  description: string;
  mode: 'tools' | 'flow';
  max_iterations: number;
  verbose: boolean;
  tools: string[];
  workflow_id?: string;
  input_schema: any;
  output_schema: any;
}

export interface CallSpec {
  agent_name: string;
  input_data: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface CallSummary {
  id: string;
  agent_name: string;
  input_data: Record<string, any>;
  status: CallStatus;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  metadata?: Record<string, any>;
  total_thoughts: number;
  total_actions: number;
  execution_time_ms?: number;
}

export interface CallThought {
  id: string;
  call_id: string;
  timestamp: string;
  sequence: number;
  reasoning: string;
  goal_achieved: boolean;
  next_action?: string;
  task_list?: string;
  expected_outcome?: string;
  user_message?: string;
}

export interface CallAction {
  id: string;
  call_id: string;
  timestamp: string;
  sequence: number;
  tool_name: string;
  parameters: Record<string, any>;
  result: any;
  success: boolean;
  execution_time_ms: number;
  error_message?: string;
}

export interface CallResult {
  id: string;
  call_id: string;
  timestamp: string;
  success: boolean;
  result: any;
  executive_summary?: string;
  key_findings?: string[];
  citations?: Array<Record<string, any>>;
}

export interface CallError {
  id: string;
  call_id: string;
  timestamp: string;
  error_type: string;
  error_message: string;
  error_details?: Record<string, any>;
  recoverable: boolean;
}

export interface CallStatusChange {
  id: string;
  call_id: string;
  timestamp: string;
  old_status: CallStatus;
  new_status: CallStatus;
  reason?: string;
}

export type CallEvent = CallThought | CallAction | CallResult | CallError | CallStatusChange;

export interface CallListRequest {
  agent_name?: string;
  status?: CallStatus;
  limit?: number;
  offset?: number;
}

export interface CallListResponse {
  calls: CallSummary[];
  total: number;
  offset: number;
  limit: number;
}

export interface WSError {
  error_type: string;
  error_message: string;
  call_id?: string;
}

export interface WSMessage {
  type: 'event' | 'error' | 'status';
  data: CallEvent | WSError | Record<string, any>;
}

// === CLIENT ===

export class AgentClient {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:3030') {
    this.baseUrl = baseUrl;
  }

  // === AGENT MANAGEMENT ===

  async listAgents(): Promise<Record<string, Agent>> {
    const response = await fetch(`${this.baseUrl}/api/v1/agents`);
    if (!response.ok) {
      throw new Error(`Failed to list agents: ${response.statusText}`);
    }
    return response.json();
  }

  async getAgent(agentName: string): Promise<Agent> {
    const response = await fetch(`${this.baseUrl}/api/v1/agents/${agentName}`);
    if (!response.ok) {
      throw new Error(`Failed to get agent: ${response.statusText}`);
    }
    return response.json();
  }

  // === CALL EXECUTION ===

  async createCall(agentName: string, inputData: Record<string, any>, metadata?: Record<string, any>): Promise<CallSummary> {
    const spec: CallSpec = {
      agent_name: agentName,
      input_data: inputData,
      metadata
    };

    const response = await fetch(`${this.baseUrl}/api/v1/agents/${agentName}/calls`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(spec),
    });

    if (!response.ok) {
      throw new Error(`Failed to create call: ${response.statusText}`);
    }
    return response.json();
  }

  async listAgentCalls(
    agentName: string,
    options: { status?: CallStatus; limit?: number; offset?: number } = {}
  ): Promise<CallListResponse> {
    const params = new URLSearchParams();
    if (options.status) params.append('status', options.status);
    if (options.limit !== undefined) params.append('limit', options.limit.toString());
    if (options.offset !== undefined) params.append('offset', options.offset.toString());

    const url = `${this.baseUrl}/api/v1/agents/${agentName}/calls${params.toString() ? '?' + params.toString() : ''}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to list agent calls: ${response.statusText}`);
    }
    return response.json();
  }

  // === CALL MANAGEMENT ===

  async getCall(callId: string): Promise<CallSummary> {
    const response = await fetch(`${this.baseUrl}/api/v1/calls/${callId}`);
    if (!response.ok) {
      throw new Error(`Failed to get call: ${response.statusText}`);
    }
    return response.json();
  }

  async cancelCall(callId: string): Promise<CallSummary> {
    const response = await fetch(`${this.baseUrl}/api/v1/calls/${callId}/cancel`, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error(`Failed to cancel call: ${response.statusText}`);
    }
    return response.json();
  }

  async deleteCall(callId: string): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${this.baseUrl}/api/v1/calls/${callId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error(`Failed to delete call: ${response.statusText}`);
    }
    return response.json();
  }

  // === EVENTS ===

  async getCallEvents(callId: string): Promise<{ events: CallEvent[] }> {
    const response = await fetch(`${this.baseUrl}/api/v1/calls/${callId}/events`);
    if (!response.ok) {
      throw new Error(`Failed to get call events: ${response.statusText}`);
    }
    const data = await response.json();
    return data;
  }

  /**
   * Subscribe to real-time events for a call
   */
  subscribeToCall(callId: string): {
    events: AsyncIterableIterator<CallEvent>;
    errors: AsyncIterableIterator<WSError>;
    close: () => void;
  } {
    const wsUrl = `${this.baseUrl.replace('http', 'ws')}/api/v1/calls/${callId}/events/stream`;
    const ws = new WebSocket(wsUrl);

    let eventQueue: CallEvent[] = [];
    let errorQueue: WSError[] = [];
    let eventResolvers: Array<(value: IteratorResult<CallEvent>) => void> = [];
    let errorResolvers: Array<(value: IteratorResult<WSError>) => void> = [];
    let closed = false;

    ws.onmessage = (event) => {
      try {
        const message: WSMessage = JSON.parse(event.data);

        if (message.type === 'event') {
          const callEvent = message.data as CallEvent;
          if (eventResolvers.length > 0) {
            const resolve = eventResolvers.shift()!;
            resolve({ value: callEvent, done: false });
          } else {
            eventQueue.push(callEvent);
          }
        } else if (message.type === 'error') {
          const error = message.data as WSError;
          if (errorResolvers.length > 0) {
            const resolve = errorResolvers.shift()!;
            resolve({ value: error, done: false });
          } else {
            errorQueue.push(error);
          }
        }
      } catch (err) {
        console.error('Error parsing WebSocket message:', err);
      }
    };

    ws.onclose = () => {
      closed = true;
      // Resolve any pending promises with done: true
      eventResolvers.forEach(resolve => resolve({ value: undefined as any, done: true }));
      errorResolvers.forEach(resolve => resolve({ value: undefined as any, done: true }));
      eventResolvers = [];
      errorResolvers = [];
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    const eventIterator: AsyncIterableIterator<CallEvent> = {
      [Symbol.asyncIterator]() {
        return this;
      },
      async next(): Promise<IteratorResult<CallEvent>> {
        if (eventQueue.length > 0) {
          return { value: eventQueue.shift()!, done: false };
        }
        if (closed) {
          return { value: undefined as any, done: true };
        }
        return new Promise(resolve => {
          eventResolvers.push(resolve);
        });
      }
    };

    const errorIterator: AsyncIterableIterator<WSError> = {
      [Symbol.asyncIterator]() {
        return this;
      },
      async next(): Promise<IteratorResult<WSError>> {
        if (errorQueue.length > 0) {
          return { value: errorQueue.shift()!, done: false };
        }
        if (closed) {
          return { value: undefined as any, done: true };
        }
        return new Promise(resolve => {
          errorResolvers.push(resolve);
        });
      }
    };

    return {
      events: eventIterator,
      errors: errorIterator,
      close: () => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
      }
    };
  }
}

// === SINGLETON INSTANCE ===

export const agentClient = new AgentClient();

// === HELPER FUNCTIONS ===

export function isCallThought(event: CallEvent): event is CallThought {
  return 'reasoning' in event;
}

export function isCallAction(event: CallEvent): event is CallAction {
  return 'tool_name' in event;
}

export function isCallResult(event: CallEvent): event is CallResult {
  return 'result' in event && 'success' in event;
}

export function isCallError(event: CallEvent): event is CallError {
  return 'error_type' in event && 'error_message' in event;
}

export function isCallStatusChange(event: CallEvent): event is CallStatusChange {
  return 'old_status' in event && 'new_status' in event;
}

export function getEventType(event: CallEvent): string {
  if (isCallThought(event)) return 'thought';
  if (isCallAction(event)) return 'action';
  if (isCallResult(event)) return 'result';
  if (isCallError(event)) return 'error';
  if (isCallStatusChange(event)) return 'status_change';
  return 'unknown';
}
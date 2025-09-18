import { useState, useEffect, useRef } from "react";
import { Play, RotateCcw, History, AlertCircle, Bot } from "lucide-react";
import { SchemaForm } from "./SchemaForm";
import { EventCard } from "./EventCard";
import { testAgent, type Agent } from "@/lib/agentClient";

interface ExecutionViewerProps {
  selectedAgent: string | null;
  agentSchema?: Agent;
}

interface ExecutionEvent {
  id: string;
  timestamp: number;
  type: string;
  data: any;
  agent_name?: string;
  event_type?: string;
  message?: string;
}

interface Execution {
  id: string;
  agentName: string;
  goal: any;
  startTime: number;
  endTime?: number;
  events: ExecutionEvent[];
  status: 'running' | 'completed' | 'error';
}

export function ExecutionViewer({ selectedAgent, agentSchema }: ExecutionViewerProps) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [currentExecution, setCurrentExecution] = useState<Execution | null>(null);
  const [previousExecutions, setPreviousExecutions] = useState<Execution[]>([]);
  const [selectedExecution, setSelectedExecution] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollEndRef = useRef<HTMLDivElement>(null);
  const isUserScrollingRef = useRef(false);
  const lastScrollTopRef = useRef(0);

  // Auto-scroll logic (similar to MessageContent)
  const isAtBottom = () => {
    if (!scrollContainerRef.current) return true;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    return scrollHeight - scrollTop - clientHeight < 50;
  };

  const scrollToBottom = () => {
    if (scrollEndRef.current) {
      scrollEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const currentScrollTop = scrollContainerRef.current.scrollTop;
    
    if (currentScrollTop < lastScrollTopRef.current) {
      isUserScrollingRef.current = true;
    }
    
    if (isAtBottom()) {
      isUserScrollingRef.current = false;
    }
    
    lastScrollTopRef.current = currentScrollTop;
  };

  useEffect(() => {
    if (!isUserScrollingRef.current || isAtBottom()) {
      scrollToBottom();
    }
  }, [currentExecution?.events]);

  const handleExecute = async (goal: any) => {
    if (!selectedAgent) return;
    
    const executionId = `exec_${Date.now()}`;
    const execution: Execution = {
      id: executionId,
      agentName: selectedAgent,
      goal,
      startTime: Date.now(),
      events: [],
      status: 'running'
    };
    
    setCurrentExecution(execution);
    setSelectedExecution(executionId);
    setIsExecuting(true);
    setError(null);

    // Add initial goal event
    const goalEvent: ExecutionEvent = {
      id: `event_${Date.now()}`,
      timestamp: Date.now(),
      type: 'initial_goal',
      data: {
        goal,
        agent_name: selectedAgent,
        mode: agentSchema?.mode || 'unknown',
        available_tools: agentSchema?.tools || []
      }
    };
    
    execution.events.push(goalEvent);
    setCurrentExecution({ ...execution });

    try {
      // Connect to WebSocket for real-time events
      const ws = new WebSocket(`ws://localhost:3030/ws/agents`);
      
      ws.onopen = () => {
        console.log('WebSocket connected');
      };
      
      ws.onmessage = (event) => {
        try {
          const eventData = JSON.parse(event.data);
          console.log('Received event:', eventData);
          
          const newEvent: ExecutionEvent = {
            id: `event_${Date.now()}_${Math.random()}`,
            timestamp: eventData.timestamp || Date.now(),
            type: eventData.type || 'unknown',
            data: eventData.data || eventData,
            agent_name: eventData.agent_name,
            event_type: eventData.event_type,
            message: eventData.message
          };
          
          setCurrentExecution(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              events: [...prev.events, newEvent]
            };
          });
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      // Start the agent execution
      const result = await testAgent(selectedAgent, goal);
      
      // Add completion event
      const completionEvent: ExecutionEvent = {
        id: `event_${Date.now()}`,
        timestamp: Date.now(),
        type: 'goal_completed',
        data: {
          goal,
          achieved: result.success,
          final_result: result.result,
          iterations: result.iterations || 0
        }
      };
      
      execution.events.push(completionEvent);
      execution.endTime = Date.now();
      execution.status = result.success ? 'completed' : 'error';
      
      setCurrentExecution({ ...execution });
      
      // Add to previous executions
      setPreviousExecutions(prev => [execution, ...prev].slice(0, 10)); // Keep last 10
      
      ws.close();
      
    } catch (err) {
      console.error('Execution error:', err);
      const errorEvent: ExecutionEvent = {
        id: `event_${Date.now()}`,
        timestamp: Date.now(),
        type: 'error',
        data: {
          error: err instanceof Error ? err.message : 'Unknown error',
          goal
        }
      };
      
      execution.events.push(errorEvent);
      execution.endTime = Date.now();
      execution.status = 'error';
      setCurrentExecution({ ...execution });
      setError(err instanceof Error ? err.message : 'Unknown error');
      
      // Add to previous executions even if failed
      setPreviousExecutions(prev => [execution, ...prev].slice(0, 10));
    } finally {
      setIsExecuting(false);
    }
  };

  const displayExecution = selectedExecution 
    ? (previousExecutions.find(e => e.id === selectedExecution) || currentExecution)
    : currentExecution;

  const formatDuration = (start: number, end?: number) => {
    const duration = (end || Date.now()) - start;
    if (duration < 1000) return `${duration}ms`;
    if (duration < 60000) return `${(duration / 1000).toFixed(1)}s`;
    return `${(duration / 60000).toFixed(1)}m`;
  };

  if (!selectedAgent) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <Bot className="h-16 w-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-300 mb-2">No Agent Selected</h3>
          <p className="text-gray-500">Choose an agent from the sidebar to begin testing</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Execution Header */}
      <div className="border-b border-gray-700 bg-gray-800 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-white">Execution Log</h2>
          <div className="flex items-center space-x-2">
            {previousExecutions.length > 0 && (
              <div className="flex items-center space-x-1">
                <History className="h-4 w-4 text-gray-400" />
                <select 
                  value={selectedExecution || 'current'}
                  onChange={(e) => setSelectedExecution(e.target.value === 'current' ? null : e.target.value)}
                  className="bg-gray-700 text-white text-sm rounded px-2 py-1 border border-gray-600"
                >
                  <option value="current">Current</option>
                  {previousExecutions.map((exec) => (
                    <option key={exec.id} value={exec.id}>
                      {new Date(exec.startTime).toLocaleTimeString()} - {exec.agentName}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <button
              onClick={() => {
                setCurrentExecution(null);
                setSelectedExecution(null);
                setError(null);
              }}
              className="p-2 text-gray-400 hover:text-white"
              title="Clear log"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Execution Form */}
        {!selectedExecution && agentSchema && (
          <div className="space-y-4">
            <SchemaForm
              schema={agentSchema.input_schema}
              onSubmit={handleExecute}
              disabled={isExecuting}
            />
            {isExecuting && (
              <div className="flex items-center space-x-2 text-sm text-blue-400">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                <span>Agent is executing...</span>
              </div>
            )}
            {error && (
              <div className="flex items-center space-x-2 text-sm text-red-400 bg-red-900/20 p-2 rounded">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Event Log */}
      <div className="flex-1 overflow-hidden">
        {displayExecution ? (
          <div 
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="h-full overflow-y-auto p-4 space-y-3"
          >
            {/* Execution Info */}
            <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    displayExecution.status === 'running' ? 'bg-blue-400 animate-pulse' :
                    displayExecution.status === 'completed' ? 'bg-green-400' : 'bg-red-400'
                  }`}></div>
                  <span className="text-white">
                    Execution {displayExecution.status}
                  </span>
                </div>
                <span className="text-gray-400">
                  {formatDuration(displayExecution.startTime, displayExecution.endTime)}
                </span>
              </div>
            </div>

            {/* Events */}
            {displayExecution.events.map((event, index) => (
              <EventCard key={event.id} event={event} />
            ))}
            
            <div ref={scrollEndRef} />
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <Play className="h-12 w-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">Execute an agent to see the log</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
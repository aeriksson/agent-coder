import { useState, useEffect, useRef } from "react";
import { X, Send, Activity, CheckCircle, XCircle, Play, Pause } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Badge } from "~/components/ui/badge";
import { ScrollArea } from "~/components/ui/scroll-area";
import { testAgent, connectWebSocket, type AgentEvent } from "@/lib/agentClient";

interface ExecutionViewerProps {
  isVisible: boolean;
  selectedAgent: string | null;
  onClose: () => void;
}

export const ExecutionViewer = ({ isVisible, selectedAgent, onClose }: ExecutionViewerProps) => {
  const [goal, setGoal] = useState("");
  const [isExecuting, setIsExecuting] = useState(false);
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const eventsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible) {
      // Connect to WebSocket
      const ws = connectWebSocket((event: AgentEvent) => {
        setEvents(prev => [...prev, event]);
      });
      
      ws.onopen = () => setIsConnected(true);
      ws.onclose = () => setIsConnected(false);
      
      wsRef.current = ws;
      
      return () => {
        ws.close();
        wsRef.current = null;
      };
    }
  }, [isVisible]);

  useEffect(() => {
    eventsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events]);

  const handleExecute = async () => {
    if (!selectedAgent || !goal.trim()) return;
    
    setIsExecuting(true);
    setEvents([]);
    
    try {
      await testAgent(selectedAgent, goal);
    } catch (error) {
      console.error('Execution failed:', error);
      setEvents(prev => [...prev, {
        timestamp: Date.now() / 1000,
        type: 'agent_event',
        agent_name: selectedAgent,
        event_type: 'error',
        data: error,
        message: `❌ Execution failed: ${error}`
      }]);
    } finally {
      setIsExecuting(false);
    }
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'goal_start':
        return <Play className="h-4 w-4 text-blue-500" />;
      case 'goal_complete':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'thought':
        return <div className="h-4 w-4 rounded-full bg-purple-500" />;
      case 'action':
        return <Activity className="h-4 w-4 text-orange-500" />;
      default:
        return <div className="h-4 w-4 rounded-full bg-gray-400" />;
    }
  };

  if (!isVisible) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Select an agent and click "Test Agent" to start</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-[600px] flex flex-col">
      {/* Header */}
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-lg">Execution Viewer</CardTitle>
          {selectedAgent && (
            <p className="text-sm text-muted-foreground">Testing: {selectedAgent}</p>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      {/* Goal Input */}
      <CardContent className="flex-shrink-0">
        <div className="flex space-x-2">
          <Input
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="Enter a goal for the agent to execute..."
            disabled={isExecuting}
            onKeyDown={(e) => e.key === 'Enter' && handleExecute()}
          />
          <Button
            onClick={handleExecute}
            disabled={isExecuting || !selectedAgent || !goal.trim()}
            className="flex items-center space-x-2"
          >
            {isExecuting ? (
              <>
                <Pause className="h-4 w-4" />
                <span>Running...</span>
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                <span>Execute</span>
              </>
            )}
          </Button>
        </div>
      </CardContent>

      {/* Events */}
      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-full">
          <div className="p-6">
            {events.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                {isExecuting ? (
                  <div className="flex items-center justify-center space-x-2">
                    <Activity className="h-5 w-5 animate-spin" />
                    <span>Waiting for events...</span>
                  </div>
                ) : (
                  <span>No execution events yet</span>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {events.map((event, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      {getEventIcon(event.event_type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-xs text-muted-foreground">
                          {new Date(event.timestamp * 1000).toLocaleTimeString()}
                        </span>
                        <Badge variant="outline" className="text-xs capitalize">
                          {event.event_type}
                        </Badge>
                      </div>
                      <p className="text-sm">{event.message}</p>
                      {event.data && typeof event.data === 'object' && (
                        <details className="mt-2">
                          <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                            Show details
                          </summary>
                          <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto">
                            {JSON.stringify(event.data, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={eventsEndRef} />
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
import { useState } from "react";
import { 
  Copy, 
  ChevronDown, 
  ChevronRight, 
  Play, 
  CheckCircle, 
  XCircle, 
  Brain, 
  Zap, 
  Eye,
  Target,
  AlertTriangle
} from "lucide-react";

interface ExecutionEvent {
  id: string;
  timestamp: number;
  type: string;
  data: any;
  agent_name?: string;
  event_type?: string;
  message?: string;
}

interface EventCardProps {
  event: ExecutionEvent;
}

export function EventCard({ event }: EventCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const getEventConfig = (type: string, eventType?: string) => {
    const key = eventType || type;
    
    switch (key) {
      case 'initial_goal':
        return {
          icon: <Target className="h-4 w-4" />,
          color: 'bg-blue-600',
          textColor: 'text-blue-300',
          borderColor: 'border-blue-500/30',
          title: 'Goal Started',
          summary: 'Agent received new goal'
        };
      case 'thought_created':
        return {
          icon: <Brain className="h-4 w-4" />,
          color: 'bg-purple-600',
          textColor: 'text-purple-300',
          borderColor: 'border-purple-500/30',
          title: 'Thinking',
          summary: 'Agent is reasoning about the task'
        };
      case 'action_executed':
        return {
          icon: <Zap className="h-4 w-4" />,
          color: 'bg-orange-600',
          textColor: 'text-orange-300',
          borderColor: 'border-orange-500/30',
          title: 'Action',
          summary: 'Tool execution completed'
        };
      case 'goal_completed':
        return {
          icon: <CheckCircle className="h-4 w-4" />,
          color: 'bg-green-600',
          textColor: 'text-green-300',
          borderColor: 'border-green-500/30',
          title: 'Completed',
          summary: 'Goal execution finished'
        };
      case 'error':
        return {
          icon: <XCircle className="h-4 w-4" />,
          color: 'bg-red-600',
          textColor: 'text-red-300',
          borderColor: 'border-red-500/30',
          title: 'Error',
          summary: 'Execution failed'
        };
      case 'observation':
        return {
          icon: <Eye className="h-4 w-4" />,
          color: 'bg-teal-600',
          textColor: 'text-teal-300',
          borderColor: 'border-teal-500/30',
          title: 'Observation',
          summary: 'Agent observed results'
        };
      default:
        return {
          icon: <AlertTriangle className="h-4 w-4" />,
          color: 'bg-gray-600',
          textColor: 'text-gray-300',
          borderColor: 'border-gray-500/30',
          title: 'Event',
          summary: 'Unknown event type'
        };
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    });
  };

  const renderEventSummary = (event: ExecutionEvent) => {
    const { data, type, event_type } = event;
    const key = event_type || type;

    switch (key) {
      case 'initial_goal':
        return (
          <div className="space-y-1">
            <p className="text-white text-sm font-medium">Starting goal execution</p>
            <p className="text-gray-300 text-xs">
              Mode: <span className="font-mono">{data.mode}</span>
              {data.available_tools?.length > 0 && (
                <span className="ml-2">• {data.available_tools.length} tools available</span>
              )}
            </p>
          </div>
        );
      
      case 'thought_created':
        return (
          <div className="space-y-1">
            <p className="text-white text-sm font-medium">Agent reasoning</p>
            {data.thought?.tool_name && (
              <p className="text-gray-300 text-xs">
                Planning to use: <span className="font-mono text-orange-300">{data.thought.tool_name}</span>
              </p>
            )}
            {data.thought?.goal_achieved !== undefined && (
              <p className="text-gray-300 text-xs">
                Goal achieved: <span className={data.thought.goal_achieved ? 'text-green-300' : 'text-yellow-300'}>
                  {data.thought.goal_achieved ? 'Yes' : 'Not yet'}
                </span>
              </p>
            )}
          </div>
        );
      
      case 'action_executed':
        return (
          <div className="space-y-1">
            <p className="text-white text-sm font-medium">Tool execution</p>
            {data.action_result?.tool_name && (
              <p className="text-gray-300 text-xs">
                Tool: <span className="font-mono text-orange-300">{data.action_result.tool_name}</span>
                {data.action_result.execution_time && (
                  <span className="ml-2">• {(data.action_result.execution_time * 1000).toFixed(0)}ms</span>
                )}
              </p>
            )}
          </div>
        );
      
      case 'goal_completed':
        return (
          <div className="space-y-1">
            <p className="text-white text-sm font-medium">Execution complete</p>
            <p className="text-gray-300 text-xs">
              Success: <span className={data.achieved ? 'text-green-300' : 'text-red-300'}>
                {data.achieved ? 'Yes' : 'No'}
              </span>
              {data.iterations && (
                <span className="ml-2">• {data.iterations} iterations</span>
              )}
            </p>
          </div>
        );
      
      case 'error':
        return (
          <div className="space-y-1">
            <p className="text-white text-sm font-medium">Error occurred</p>
            <p className="text-red-300 text-xs">{data.error || 'Unknown error'}</p>
          </div>
        );
      
      default:
        return (
          <div className="space-y-1">
            <p className="text-white text-sm font-medium">{event.message || 'Event'}</p>
            <p className="text-gray-300 text-xs">Type: {key}</p>
          </div>
        );
    }
  };

  const renderJsonWithSyntaxHighlighting = (obj: any, depth = 0) => {
    if (obj === null) return <span className="text-gray-500">null</span>;
    if (obj === undefined) return <span className="text-gray-500">undefined</span>;
    if (typeof obj === 'string') return <span className="text-green-300">"{obj}"</span>;
    if (typeof obj === 'number') return <span className="text-blue-300">{obj}</span>;
    if (typeof obj === 'boolean') return <span className="text-orange-300">{obj.toString()}</span>;
    
    if (Array.isArray(obj)) {
      if (obj.length === 0) return <span className="text-gray-400">[]</span>;
      return (
        <div className="ml-2">
          <span className="text-gray-400">[</span>
          {obj.map((item, index) => (
            <div key={index} className="ml-2">
              {renderJsonWithSyntaxHighlighting(item, depth + 1)}
              {index < obj.length - 1 && <span className="text-gray-400">,</span>}
            </div>
          ))}
          <span className="text-gray-400">]</span>
        </div>
      );
    }
    
    if (typeof obj === 'object') {
      const keys = Object.keys(obj);
      if (keys.length === 0) return <span className="text-gray-400">{'{}'}</span>;
      
      return (
        <div className="ml-2">
          <span className="text-gray-400">{'{'}</span>
          {keys.map((key, index) => (
            <div key={key} className="ml-2">
              <span className="text-cyan-300">"{key}"</span>
              <span className="text-gray-400">: </span>
              {renderJsonWithSyntaxHighlighting(obj[key], depth + 1)}
              {index < keys.length - 1 && <span className="text-gray-400">,</span>}
            </div>
          ))}
          <span className="text-gray-400">{'}'}</span>
        </div>
      );
    }
    
    return <span className="text-gray-300">{String(obj)}</span>;
  };

  const config = getEventConfig(event.type, event.event_type);
  const hasExpandableData = event.data && typeof event.data === 'object' && Object.keys(event.data).length > 0;

  return (
    <div className={`bg-gray-800 rounded-lg border ${config.borderColor} overflow-hidden`}>
      {/* Event Header */}
      <div className="p-3">
        <div className="flex items-start space-x-3">
          {/* Icon */}
          <div className={`${config.color} p-2 rounded-lg flex-shrink-0`}>
            {config.icon}
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <h3 className="text-white font-medium text-sm">{config.title}</h3>
                <span className="text-xs text-gray-500">
                  {formatTimestamp(event.timestamp)}
                </span>
              </div>
              
              <div className="flex items-center space-x-1">
                {/* Copy Button */}
                <button
                  onClick={() => handleCopy(JSON.stringify(event.data, null, 2))}
                  className="p-1 text-gray-400 hover:text-white transition-colors"
                  title="Copy event data"
                >
                  <Copy className="h-3 w-3" />
                </button>
                
                {/* Expand Button */}
                {hasExpandableData && (
                  <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="p-1 text-gray-400 hover:text-white transition-colors"
                    title={isExpanded ? "Collapse" : "Expand"}
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-3 w-3" />
                    ) : (
                      <ChevronRight className="h-3 w-3" />
                    )}
                  </button>
                )}
              </div>
            </div>
            
            {/* Event Summary */}
            {renderEventSummary(event)}
          </div>
        </div>
      </div>
      
      {/* Expanded Data */}
      {isExpanded && hasExpandableData && (
        <div className="border-t border-gray-700 bg-gray-900/50">
          <div className="p-3">
            <div className="bg-black rounded p-3 overflow-x-auto">
              <div className="text-xs font-mono">
                {renderJsonWithSyntaxHighlighting(event.data)}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Copy Feedback */}
      {copied && (
        <div className="absolute top-2 right-2 bg-green-600 text-white text-xs px-2 py-1 rounded">
          Copied!
        </div>
      )}
    </div>
  );
}
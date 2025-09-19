import { useState } from "react";
import { Brain, ChevronDown, ChevronRight, Copy, Code } from "lucide-react";
import { JsonViewer } from './JsonViewer';

interface ThoughtEventProps {
  event: any; // Using any since the event structure varies
}

export function ThoughtEvent({ event }: ThoughtEventProps) {
  const [expanded, setExpanded] = useState(false);
  const [showJson, setShowJson] = useState(false);

  // Extract key information
  const userMessage = event.user_message || '';
  const reasoning = event.reasoning || '';
  const hasTool = event.tool_name && event.tool_parameters;
  const iteration = event.iteration;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(event, null, 2));
  };

  return (
    <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-2 px-3 py-2 hover:bg-blue-100 dark:hover:bg-blue-950/50 transition-colors text-left"
      >
        <div className="flex items-center gap-2 mt-0.5">
          {expanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-blue-400" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-blue-400" />
          )}
          <Brain className="w-4 h-4 text-blue-500" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-sm font-medium text-blue-900 dark:text-blue-100 whitespace-nowrap">
                Thought {iteration && `#${iteration}`}
              </span>
              {userMessage && (
                <p className="text-sm text-blue-700 dark:text-blue-300 truncate flex-1">
                  {userMessage}
                </p>
              )}
            </div>
            <span className="text-xs text-blue-600 dark:text-blue-400 whitespace-nowrap">
              {new Date(event.timestamp).toLocaleTimeString()}
            </span>
          </div>
          {!userMessage && reasoning && (
            <p className="text-sm text-blue-700 dark:text-blue-300 truncate">
              {reasoning}
            </p>
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-3 pb-3 border-t border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2 mt-2 mb-3">
            <button
              onClick={() => setShowJson(!showJson)}
              className="text-xs px-2 py-1 rounded bg-blue-100 dark:bg-blue-900/50 hover:bg-blue-200 dark:hover:bg-blue-900 transition-colors flex items-center gap-1"
            >
              <Code className="w-3 h-3" />
              {showJson ? 'Show Details' : 'Show JSON'}
            </button>
            <button
              onClick={copyToClipboard}
              className="text-xs px-2 py-1 rounded bg-blue-100 dark:bg-blue-900/50 hover:bg-blue-200 dark:hover:bg-blue-900 transition-colors flex items-center gap-1"
            >
              <Copy className="w-3 h-3" />
              Copy JSON
            </button>
          </div>

          {showJson ? (
            <JsonViewer data={event} />
          ) : (
            <div className="space-y-3 text-sm">
              {userMessage && (
                <div>
                  <div className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">User Message</div>
                  <div className="bg-white dark:bg-gray-900 rounded p-2 text-blue-800 dark:text-blue-200">
                    {userMessage}
                  </div>
                </div>
              )}

              <div>
                <div className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">Reasoning</div>
                <div className="bg-white dark:bg-gray-900 rounded p-2 text-blue-800 dark:text-blue-200 whitespace-pre-wrap">
                  {reasoning}
                </div>
              </div>

              {event.goal_achieved !== undefined && (
                <div>
                  <div className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">Goal Achieved</div>
                  <div className={`inline-block px-2 py-1 rounded text-xs ${
                    event.goal_achieved
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
                      : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300'
                  }`}>
                    {event.goal_achieved ? 'Yes' : 'No'}
                  </div>
                </div>
              )}

              {event.todo_list && (
                <div>
                  <div className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">Todo List</div>
                  <div className="bg-white dark:bg-gray-900 rounded p-2 text-blue-800 dark:text-blue-200 whitespace-pre-wrap">
                    {event.todo_list}
                  </div>
                </div>
              )}

              {hasTool && (
                <div>
                  <div className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">Tool Call</div>
                  <div className="bg-white dark:bg-gray-900 rounded p-2">
                    <div className="text-xs font-mono text-blue-700 dark:text-blue-300 mb-1">
                      {event.tool_name}
                    </div>
                    <JsonViewer data={event.tool_parameters} />
                  </div>
                </div>
              )}

              {event.expected_outcome && (
                <div>
                  <div className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">Expected Outcome</div>
                  <div className="bg-white dark:bg-gray-900 rounded p-2 text-blue-800 dark:text-blue-200">
                    {event.expected_outcome}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
import { useState } from "react";
import { ChevronDown, ChevronRight, CheckCircle, XCircle, Clock, Copy, Code } from "lucide-react";
import { JsonViewer, isJsonString, tryParseJson } from './JsonViewer';
import { MarkdownRenderer } from './MarkdownRenderer';

interface ActionEventProps {
  event: any;
  thoughtEvent?: any; // The corresponding thought event if available
}

export function ActionEvent({ event, thoughtEvent }: ActionEventProps) {
  const [expanded, setExpanded] = useState(false);
  const [showJson, setShowJson] = useState(false);

  // Extract key information
  const toolName = event.tool_name || thoughtEvent?.tool_name || '';
  const toolParameters = event.parameters || event.tool_parameters || thoughtEvent?.tool_parameters || {};
  const toolResult = event.result;
  const isSuccess = event.success !== false && !event.error && !event.error_message;
  const error = event.error || event.error_message;
  const executionTime = event.execution_time || event.execution_time_ms;
  const iteration = event.iteration || thoughtEvent?.iteration;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(event, null, 2));
  };

  // Format parameters for inline display
  const formatParams = (params: any): string => {
    if (!params || Object.keys(params).length === 0) return '';

    const formatted = Object.entries(params)
      .map(([key, value]) => {
        const val = typeof value === 'string'
          ? `"${value}"`
          : JSON.stringify(value);
        return `${key}: ${val}`;
      })
      .join(', ');

    return `(${formatted})`;
  };

  // Format execution time (already in seconds)
  const formatTime = (time?: number): string => {
    if (!time) return '';
    if (time < 1) return `${(time * 1000).toFixed(0)}ms`;
    return `${time.toFixed(1)}s`;
  };

  return (
    <div className={`border rounded-lg overflow-hidden ${
      isSuccess
        ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800'
        : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800'
    }`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className={`w-full flex items-start gap-2 px-3 py-2 hover:${
          isSuccess ? 'bg-green-100 dark:hover:bg-green-950/50' : 'bg-red-100 dark:hover:bg-red-950/50'
        } transition-colors text-left`}
      >
        <div className="flex items-center gap-2 mt-0.5">
          {expanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
          )}
          {isSuccess ? (
            <CheckCircle className="w-4 h-4 text-green-500" />
          ) : (
            <XCircle className="w-4 h-4 text-red-500" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className={`text-sm font-medium whitespace-nowrap ${
                isSuccess ? 'text-green-900 dark:text-green-100' : 'text-red-900 dark:text-red-100'
              }`}>
                Action {iteration && `#${iteration}`}
              </span>
              <code className="text-xs font-mono text-gray-600 dark:text-gray-400 truncate">
                {toolName}{formatParams(toolParameters)}
              </code>
            </div>
            <div className="flex items-center gap-2">
              {executionTime && (
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Clock className="w-3 h-3" />
                  {formatTime(executionTime)}
                </div>
              )}
              <span className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                {new Date(event.timestamp).toLocaleTimeString()}
              </span>
            </div>
          </div>
          {error && (
            <p className="text-sm text-red-700 dark:text-red-300 truncate">
              Error: {error}
            </p>
          )}
        </div>
      </button>

      {expanded && (
        <div className={`px-3 pb-3 border-t ${
          isSuccess ? 'border-green-200 dark:border-green-800' : 'border-red-200 dark:border-red-800'
        }`}>
          <div className="flex items-center gap-2 mt-2 mb-3">
            <button
              onClick={() => setShowJson(!showJson)}
              className={`text-xs px-2 py-1 rounded ${
                isSuccess
                  ? 'bg-green-100 dark:bg-green-900/50 hover:bg-green-200 dark:hover:bg-green-900'
                  : 'bg-red-100 dark:bg-red-900/50 hover:bg-red-200 dark:hover:bg-red-900'
              } transition-colors flex items-center gap-1`}
            >
              <Code className="w-3 h-3" />
              {showJson ? 'Show Details' : 'Show JSON'}
            </button>
            <button
              onClick={copyToClipboard}
              className={`text-xs px-2 py-1 rounded ${
                isSuccess
                  ? 'bg-green-100 dark:bg-green-900/50 hover:bg-green-200 dark:hover:bg-green-900'
                  : 'bg-red-100 dark:bg-red-900/50 hover:bg-red-200 dark:hover:bg-red-900'
              } transition-colors flex items-center gap-1`}
            >
              <Copy className="w-3 h-3" />
              Copy JSON
            </button>
          </div>

          {showJson ? (
            <JsonViewer data={event} />
          ) : (
            <div className="space-y-3 text-sm">
              {Object.keys(toolParameters).length > 0 && (
                <div>
                  <div className={`text-xs font-medium mb-1 ${
                    isSuccess ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  }`}>Parameters</div>
                  <div className="bg-white dark:bg-gray-900 rounded p-2">
                    <JsonViewer data={toolParameters} />
                  </div>
                </div>
              )}

              {error ? (
                <div>
                  <div className="text-xs font-medium text-red-600 dark:text-red-400 mb-1">Error</div>
                  <div className="bg-white dark:bg-gray-900 rounded p-2 text-red-800 dark:text-red-200">
                    {error}
                  </div>
                </div>
              ) : toolResult && (
                <div>
                  <div className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">Result</div>
                  <div className="bg-white dark:bg-gray-900 rounded p-2 text-green-800 dark:text-green-200">
                    {typeof toolResult === 'string' ? (
                      isJsonString(toolResult) ? (
                        <JsonViewer data={tryParseJson(toolResult)} />
                      ) : toolResult.includes('```') || toolResult.includes('###') || toolResult.includes('**') ||
                        toolResult.includes('- ') || toolResult.includes('1. ') || toolResult.includes('|') ? (
                        <MarkdownRenderer content={toolResult} />
                      ) : (
                        <pre className="text-xs overflow-auto whitespace-pre-wrap">
                          {toolResult}
                        </pre>
                      )
                    ) : (
                      <JsonViewer data={toolResult} />
                    )}
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
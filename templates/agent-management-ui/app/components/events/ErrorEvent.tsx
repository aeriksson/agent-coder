import { useState } from "react";
import { AlertTriangle, ChevronDown, ChevronRight, Copy, Code } from "lucide-react";
import { JsonViewer } from './JsonViewer';

interface ErrorEventProps {
  event: any;
}

export function ErrorEvent({ event }: ErrorEventProps) {
  const [expanded, setExpanded] = useState(false);
  const [showJson, setShowJson] = useState(false);

  // Extract key information
  const errorType = event.error_type || event.error || 'Unknown Error';
  const errorMessage = event.error_message || event.message || '';
  const stackTrace = event.stack_trace || event.stack || '';
  const details = event.details || {};
  const iteration = event.iteration;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(event, null, 2));
  };

  return (
    <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-2 px-3 py-2 hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors text-left"
      >
        <div className="flex items-center gap-2 mt-0.5">
          {expanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
          )}
          <AlertTriangle className="w-4 h-4 text-red-500" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-medium text-red-900 dark:text-red-100">
              Error {iteration && `#${iteration}`}
            </span>
            {errorType && (
              <code className="px-1.5 py-0.5 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded text-xs">
                {errorType}
              </code>
            )}
            <span className="text-xs text-red-600 dark:text-red-400 ml-auto">
              {new Date(event.timestamp).toLocaleTimeString()}
            </span>
          </div>
          <p className="text-sm text-red-700 dark:text-red-300 truncate">
            {errorMessage}
          </p>
        </div>
      </button>

      {expanded && (
        <div className="px-3 pb-3 border-t border-red-200 dark:border-red-800">
          <div className="flex items-center gap-2 mt-2 mb-3">
            <button
              onClick={() => setShowJson(!showJson)}
              className="text-xs px-2 py-1 rounded bg-red-100 dark:bg-red-900/50 hover:bg-red-200 dark:hover:bg-red-900 transition-colors flex items-center gap-1"
            >
              <Code className="w-3 h-3" />
              {showJson ? 'Show Details' : 'Show JSON'}
            </button>
            <button
              onClick={copyToClipboard}
              className="text-xs px-2 py-1 rounded bg-red-100 dark:bg-red-900/50 hover:bg-red-200 dark:hover:bg-red-900 transition-colors flex items-center gap-1"
            >
              <Copy className="w-3 h-3" />
              Copy JSON
            </button>
          </div>

          {showJson ? (
            <JsonViewer data={event} />
          ) : (
            <div className="space-y-3 text-sm">
              {errorType && (
                <div>
                  <div className="text-xs font-medium text-red-600 dark:text-red-400 mb-1">Error Type</div>
                  <div className="bg-white dark:bg-gray-900 rounded p-2">
                    <code className="text-xs text-red-700 dark:text-red-300">
                      {errorType}
                    </code>
                  </div>
                </div>
              )}

              {errorMessage && (
                <div>
                  <div className="text-xs font-medium text-red-600 dark:text-red-400 mb-1">Error Message</div>
                  <div className="bg-white dark:bg-gray-900 rounded p-2 text-red-800 dark:text-red-200 whitespace-pre-wrap">
                    {errorMessage}
                  </div>
                </div>
              )}

              {stackTrace && (
                <div>
                  <div className="text-xs font-medium text-red-600 dark:text-red-400 mb-1">Stack Trace</div>
                  <div className="bg-gray-900 rounded p-2 max-h-48 overflow-auto">
                    <pre className="text-xs text-red-400 font-mono whitespace-pre">
                      {stackTrace}
                    </pre>
                  </div>
                </div>
              )}

              {Object.keys(details).length > 0 && (
                <div>
                  <div className="text-xs font-medium text-red-600 dark:text-red-400 mb-1">Additional Details</div>
                  <div className="bg-white dark:bg-gray-900 rounded p-2">
                    <JsonViewer data={details} />
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
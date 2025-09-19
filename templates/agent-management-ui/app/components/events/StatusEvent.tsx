import { useState } from "react";
import { Info, CheckCircle, XCircle, AlertCircle, ChevronDown, ChevronRight, Copy, Code } from "lucide-react";
import { JsonViewer } from './JsonViewer';

interface StatusEventProps {
  event: any;
}

export function StatusEvent({ event }: StatusEventProps) {
  const [expanded, setExpanded] = useState(false);
  const [showJson, setShowJson] = useState(false);

  const newStatus = event.new_status || event.status || '';
  const oldStatus = event.old_status;
  const message = event.message || event.status_message || '';
  const iteration = event.iteration;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(event, null, 2));
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'cancelled':
      case 'canceled':
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
      case 'running':
      case 'in_progress':
        return <Info className="w-4 h-4 text-blue-500" />;
      default:
        return <Info className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getStatusColors = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'success':
        return {
          bg: 'bg-green-50 dark:bg-green-950/30',
          border: 'border-green-200 dark:border-green-800',
          hover: 'hover:bg-green-100 dark:hover:bg-green-950/50',
          text: 'text-green-900 dark:text-green-100',
          subtext: 'text-green-700 dark:text-green-300',
          badge: 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300'
        };
      case 'failed':
      case 'error':
        return {
          bg: 'bg-red-50 dark:bg-red-950/30',
          border: 'border-red-200 dark:border-red-800',
          hover: 'hover:bg-red-100 dark:hover:bg-red-950/50',
          text: 'text-red-900 dark:text-red-100',
          subtext: 'text-red-700 dark:text-red-300',
          badge: 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300'
        };
      case 'cancelled':
      case 'canceled':
        return {
          bg: 'bg-gray-50 dark:bg-gray-950/30',
          border: 'border-gray-200 dark:border-gray-800',
          hover: 'hover:bg-gray-100 dark:hover:bg-gray-950/50',
          text: 'text-gray-900 dark:text-gray-100',
          subtext: 'text-gray-700 dark:text-gray-300',
          badge: 'bg-gray-100 dark:bg-gray-900/50 text-gray-800 dark:text-gray-300'
        };
      case 'running':
      case 'in_progress':
        return {
          bg: 'bg-blue-50 dark:bg-blue-950/30',
          border: 'border-blue-200 dark:border-blue-800',
          hover: 'hover:bg-blue-100 dark:hover:bg-blue-950/50',
          text: 'text-blue-900 dark:text-blue-100',
          subtext: 'text-blue-700 dark:text-blue-300',
          badge: 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300'
        };
      default:
        return {
          bg: 'bg-yellow-50 dark:bg-yellow-950/30',
          border: 'border-yellow-200 dark:border-yellow-800',
          hover: 'hover:bg-yellow-100 dark:hover:bg-yellow-950/50',
          text: 'text-yellow-900 dark:text-yellow-100',
          subtext: 'text-yellow-700 dark:text-yellow-300',
          badge: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300'
        };
    }
  };

  const colors = getStatusColors(newStatus);

  return (
    <div className={`${colors.bg} border ${colors.border} rounded-lg overflow-hidden`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className={`w-full flex items-start gap-2 px-3 py-2 ${colors.hover} transition-colors text-left`}
      >
        <div className="flex items-center gap-2 mt-0.5">
          {expanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
          )}
          {getStatusIcon(newStatus)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`text-sm font-medium ${colors.text}`}>
              Status {iteration && `#${iteration}`}
            </span>
            <div className="flex items-center gap-2">
              {oldStatus && (
                <>
                  <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded text-xs">
                    {oldStatus}
                  </span>
                  <span className="text-xs text-gray-500">→</span>
                </>
              )}
              <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${colors.badge}`}>
                {newStatus}
              </span>
            </div>
            <span className="text-xs text-gray-600 dark:text-gray-400 ml-auto">
              {new Date(event.timestamp).toLocaleTimeString()}
            </span>
          </div>
          {message && (
            <p className={`text-sm truncate ${colors.subtext}`}>
              {message}
            </p>
          )}
        </div>
      </button>

      {expanded && (
        <div className={`px-3 pb-3 border-t ${colors.border}`}>
          <div className="flex items-center gap-2 mt-2 mb-3">
            <button
              onClick={() => setShowJson(!showJson)}
              className={`text-xs px-2 py-1 rounded ${colors.badge} hover:opacity-80 transition-opacity flex items-center gap-1`}
            >
              <Code className="w-3 h-3" />
              {showJson ? 'Show Details' : 'Show JSON'}
            </button>
            <button
              onClick={copyToClipboard}
              className={`text-xs px-2 py-1 rounded ${colors.badge} hover:opacity-80 transition-opacity flex items-center gap-1`}
            >
              <Copy className="w-3 h-3" />
              Copy JSON
            </button>
          </div>

          {showJson ? (
            <JsonViewer data={event} />
          ) : (
            <div className="space-y-3 text-sm">
              <div>
                <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Status Change</div>
                <div className="flex items-center gap-2">
                  {oldStatus && (
                    <>
                      <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded text-xs">
                        {oldStatus}
                      </span>
                      <span className="text-gray-500">→</span>
                    </>
                  )}
                  <span className={`px-2 py-1 rounded text-xs font-medium ${colors.badge}`}>
                    {newStatus}
                  </span>
                </div>
              </div>

              {message && (
                <div>
                  <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Message</div>
                  <div className="bg-white dark:bg-gray-900 rounded p-2 text-gray-800 dark:text-gray-200">
                    {message}
                  </div>
                </div>
              )}

              {event.details && (
                <div>
                  <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Details</div>
                  <div className="bg-white dark:bg-gray-900 rounded p-2 text-gray-800 dark:text-gray-200">
                    <pre className="text-xs overflow-auto whitespace-pre-wrap">
                      {typeof event.details === 'string' ? event.details : JSON.stringify(event.details, null, 2)}
                    </pre>
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
import { useState } from "react";
import { FileText, ChevronDown, ChevronRight, Copy, Code, CheckCircle } from "lucide-react";
import { JsonViewer, isJsonString, tryParseJson } from './JsonViewer';
import { MarkdownRenderer } from './MarkdownRenderer';

interface ResultEventProps {
  event: any;
}

export function ResultEvent({ event }: ResultEventProps) {
  const [expanded, setExpanded] = useState(true); // Default to expanded for results
  const [showJson, setShowJson] = useState(false);

  // Extract key information
  const result = event.result || event.final_result || '';
  const summary = event.executive_summary || event.summary || '';
  const keyFindings = event.key_findings || [];
  const recommendations = event.recommendations || [];
  const metadata = event.metadata || {};
  const iteration = event.iteration;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(event, null, 2));
  };

  return (
    <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-2 px-3 py-2 hover:bg-indigo-100 dark:hover:bg-indigo-950/50 transition-colors text-left"
      >
        <div className="flex items-center gap-2 mt-0.5">
          {expanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
          )}
          <CheckCircle className="w-4 h-4 text-indigo-500" />
          <FileText className="w-4 h-4 text-indigo-500" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-medium text-indigo-900 dark:text-indigo-100">
              Final Result {iteration && `#${iteration}`}
            </span>
            <span className="text-xs text-indigo-600 dark:text-indigo-400 ml-auto">
              {new Date(event.timestamp).toLocaleTimeString()}
            </span>
          </div>
          {!expanded && summary && (
            <p className="text-sm text-indigo-700 dark:text-indigo-300 truncate">
              {summary}
            </p>
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-3 pb-3 border-t border-indigo-200 dark:border-indigo-800">
          <div className="flex items-center gap-2 mt-2 mb-3">
            <button
              onClick={() => setShowJson(!showJson)}
              className="text-xs px-2 py-1 rounded bg-indigo-100 dark:bg-indigo-900/50 hover:bg-indigo-200 dark:hover:bg-indigo-900 transition-colors flex items-center gap-1"
            >
              <Code className="w-3 h-3" />
              {showJson ? 'Show Result' : 'Show JSON'}
            </button>
            <button
              onClick={copyToClipboard}
              className="text-xs px-2 py-1 rounded bg-indigo-100 dark:bg-indigo-900/50 hover:bg-indigo-200 dark:hover:bg-indigo-900 transition-colors flex items-center gap-1"
            >
              <Copy className="w-3 h-3" />
              Copy JSON
            </button>
          </div>

          {showJson ? (
            <JsonViewer data={event} />
          ) : (
            <div className="space-y-4">
              {summary && (
                <div>
                  <div className="text-xs font-medium text-indigo-600 dark:text-indigo-400 mb-1">Executive Summary</div>
                  <div className="bg-white dark:bg-gray-900 rounded p-3 text-indigo-800 dark:text-indigo-200">
                    <MarkdownRenderer content={summary} />
                  </div>
                </div>
              )}

              {keyFindings && keyFindings.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-indigo-600 dark:text-indigo-400 mb-1">Key Findings</div>
                  <div className="bg-white dark:bg-gray-900 rounded p-3">
                    <ul className="space-y-2">
                      {keyFindings.map((finding: string, index: number) => (
                        <li key={index} className="flex items-start">
                          <span className="text-indigo-500 mr-2 mt-0.5">•</span>
                          <div className="text-sm text-indigo-800 dark:text-indigo-200 flex-1">
                            <MarkdownRenderer content={finding} />
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {recommendations && recommendations.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-indigo-600 dark:text-indigo-400 mb-1">Recommendations</div>
                  <div className="bg-white dark:bg-gray-900 rounded p-3">
                    <ul className="space-y-2">
                      {recommendations.map((rec: string, index: number) => (
                        <li key={index} className="flex items-start">
                          <span className="text-indigo-500 mr-2 mt-0.5">→</span>
                          <div className="text-sm text-indigo-800 dark:text-indigo-200 flex-1">
                            <MarkdownRenderer content={rec} />
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {result && (
                <div>
                  <div className="text-xs font-medium text-indigo-600 dark:text-indigo-400 mb-1">Result</div>
                  <div className="bg-white dark:bg-gray-900 rounded p-3 text-indigo-800 dark:text-indigo-200 overflow-auto">
                    {typeof result === 'string' ? (
                      isJsonString(result) ? (
                        <JsonViewer data={tryParseJson(result)} />
                      ) : (
                        <MarkdownRenderer content={result} />
                      )
                    ) : (
                      <JsonViewer data={result} />
                    )}
                  </div>
                </div>
              )}

              {Object.keys(metadata).length > 0 && (
                <div>
                  <div className="text-xs font-medium text-indigo-600 dark:text-indigo-400 mb-1">Metadata</div>
                  <div className="bg-white dark:bg-gray-900 rounded p-2">
                    <JsonViewer data={metadata} />
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
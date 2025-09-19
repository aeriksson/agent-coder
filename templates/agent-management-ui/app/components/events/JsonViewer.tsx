import { JsonView, darkStyles } from 'react-json-view-lite';
import 'react-json-view-lite/dist/index.css';

interface JsonViewerProps {
  data: any;
  maxHeight?: string;
}

// Custom styles mixing library styles with Tailwind colors
const customDarkStyles = {
  // Duplicate container-base properties without background
  container: 'leading-tight whitespace-pre-wrap break-words',
  basicChildStyle: 'pl-4',
  childFieldsContainer: 'block',
  // Custom colors with Tailwind
  label: 'text-blue-600 dark:text-blue-400 text-xs font-semibold mr-1',
  clickableLabel: 'text-blue-600 dark:text-blue-400 text-xs font-semibold mr-1 cursor-pointer hover:underline',
  nullValue: 'text-gray-500 dark:text-gray-400 text-xs',
  undefinedValue: 'text-gray-500 dark:text-gray-400 text-xs',
  stringValue: 'text-gray-900 dark:text-gray-100 text-xs',
  booleanValue: 'text-purple-600 dark:text-purple-400 text-xs',
  numberValue: 'text-orange-600 dark:text-orange-400 text-xs',
  otherValue: 'text-gray-600 dark:text-gray-300 text-xs',
  punctuation: 'text-gray-600 dark:text-gray-400 text-xs mr-1 font-bold',
  // Keep library's icon styles for expand/collapse
  collapseIcon: darkStyles.collapseIcon,
  expandIcon: darkStyles.expandIcon,
  collapsedContent: darkStyles.collapsedContent,
  noQuotesForStringValues: false,
  quotesForFieldNames: false,
  stringifyStringValues: false
};

export function JsonViewer({ data, maxHeight = 'max-h-96' }: JsonViewerProps) {
  return (
    <div
      className={`rounded overflow-auto ${maxHeight}`}
      style={{
        fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
      }}
    >
      <JsonView
        data={data}
        shouldInitiallyExpand={(level) => level < 2}
        style={customDarkStyles}
      />
    </div>
  );
}

// Helper function to check if a string is valid JSON
export function isJsonString(str: string): boolean {
  if (!str || typeof str !== 'string') return false;
  try {
    const parsed = JSON.parse(str);
    // Only consider it JSON if it's an object or array, not primitives
    return typeof parsed === 'object' && parsed !== null;
  } catch {
    return false;
  }
}

// Helper function to safely parse JSON
export function tryParseJson(str: string): any {
  try {
    return JSON.parse(str);
  } catch {
    return str;
  }
}
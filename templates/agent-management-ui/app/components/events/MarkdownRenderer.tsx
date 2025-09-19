import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      className={`text-sm ${className}`}
      components={{
        // Headings with proper spacing
        h1: ({ children }) => <h1 className="text-lg font-bold mb-2 mt-3 first:mt-0">{children}</h1>,
        h2: ({ children }) => <h2 className="text-base font-bold mb-2 mt-2 first:mt-0">{children}</h2>,
        h3: ({ children }) => <h3 className="text-sm font-bold mb-1 mt-2 first:mt-0">{children}</h3>,
        h4: ({ children }) => <h4 className="text-sm font-semibold mb-1 mt-1 first:mt-0">{children}</h4>,

        // Paragraphs with spacing
        p: ({ children }) => <p className="mb-2 last:mb-0 text-sm">{children}</p>,

        // Lists with proper spacing
        ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-0.5 text-sm">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-0.5 text-sm">{children}</ol>,
        li: ({ children }) => <li className="ml-2">{children}</li>,

        // Tables with GFM support
        table: ({ children }) => (
          <div className="overflow-x-auto mb-3">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              {children}
            </table>
          </div>
        ),
        thead: ({ children }) => <thead className="bg-gray-50 dark:bg-gray-800">{children}</thead>,
        tbody: ({ children }) => <tbody className="divide-y divide-gray-200 dark:divide-gray-700">{children}</tbody>,
        tr: ({ children }) => <tr>{children}</tr>,
        th: ({ children }) => (
          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="px-2 py-1 text-sm text-gray-900 dark:text-gray-100 whitespace-nowrap">
            {children}
          </td>
        ),

        // Code blocks
        pre: ({ children }) => (
          <pre className="bg-gray-900 text-gray-100 rounded p-2 overflow-x-auto mb-2 text-xs font-mono">
            {children}
          </pre>
        ),
        code: ({ inline, children }) =>
          inline ? (
            <code className="bg-gray-800 text-gray-200 px-1 py-0.5 rounded text-xs font-mono">
              {children}
            </code>
          ) : (
            <code className="block text-xs font-mono">{children}</code>
          ),

        // Blockquotes
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-3 my-2 italic text-sm">
            {children}
          </blockquote>
        ),

        // Horizontal rules
        hr: () => <hr className="my-4 border-gray-300 dark:border-gray-600" />,

        // Links
        a: ({ children, href }) => (
          <a
            href={href}
            className="text-blue-600 dark:text-blue-400 hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            {children}
          </a>
        ),

        // Strong and emphasis
        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
        em: ({ children }) => <em className="italic">{children}</em>,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
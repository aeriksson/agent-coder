import { MessageSquare } from "lucide-react";
import type { CallEvent } from "~/lib/agentClient";
import { getEventType } from "~/lib/agentClient";
import { ThoughtEvent } from "./events/ThoughtEvent";
import { ActionEvent } from "./events/ActionEvent";
import { StatusEvent } from "./events/StatusEvent";
import { ErrorEvent } from "./events/ErrorEvent";
import { ResultEvent } from "./events/ResultEvent";

interface EventCardProps {
  event: CallEvent;
}

export function EventCard({ event }: EventCardProps) {
  const eventType = getEventType(event);

  switch (eventType) {
    case 'thought':
      return <ThoughtEvent event={event as any} />;

    case 'action':
      return <ActionEvent event={event as any} />;

    case 'status_change':
      return <StatusEvent event={event as any} />;

    case 'error':
      return <ErrorEvent event={event as any} />;

    case 'result':
      return <ResultEvent event={event as any} />;

    default:
      // Fallback for unknown event types
      return (
        <div className="bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <MessageSquare className="w-5 h-5 text-gray-600 dark:text-gray-400 mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-900 dark:text-gray-100">Event</span>
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  {new Date(event.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <pre className="text-xs bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 p-2 rounded overflow-x-auto">
                {JSON.stringify(event, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      );
  }
}
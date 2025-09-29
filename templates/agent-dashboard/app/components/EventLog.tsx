import type { CallEvent } from "~/lib/agentClient";
import { EventCard } from "./EventCard";

interface EventLogProps {
  events: CallEvent[];
  isLoading?: boolean;
}

export function EventLog({ events, isLoading = false }: EventLogProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse">
            <div className="h-20 bg-muted rounded-lg"></div>
          </div>
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        No events yet. Execution will appear here as it progresses.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {events.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  );
}
import { Activity } from "lucide-react";
import { EventLog } from "./EventLog";

interface ExecutionLogSectionProps {
  events: any[];
  isRunning: boolean;
}

export function ExecutionLogSection({ events, isRunning }: ExecutionLogSectionProps) {
  return (
    <div className="bg-card rounded-lg border p-6">
      <ExecutionLogHeader isRunning={isRunning} />
      <EventLog
        events={events}
        isLoading={isRunning && events.length === 0}
      />
    </div>
  );
}

function ExecutionLogHeader({ isRunning }: { isRunning: boolean }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-lg font-semibold">Execution Log</h2>
      {isRunning && (
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <Activity className="w-4 h-4 animate-spin" />
          <span>Execution in progress...</span>
        </div>
      )}
    </div>
  );
}
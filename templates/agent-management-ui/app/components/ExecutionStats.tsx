import { Clock } from "lucide-react";
import type { CallSummary } from "~/lib/types";

interface ExecutionStatsProps {
  call: CallSummary;
  eventCount: number;
}

export function ExecutionStats({ call, eventCount }: ExecutionStatsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <TimelineCard call={call} />
      <StatisticsCard call={call} eventCount={eventCount} />
      <InputDataCard inputData={call.input_data} />
    </div>
  );
}

function TimelineCard({ call }: { call: CallSummary }) {
  return (
    <div className="bg-card rounded-lg border p-4">
      <div className="flex items-center space-x-2 mb-2">
        <Clock className="w-4 h-4 text-muted-foreground" />
        <span className="font-medium">Timeline</span>
      </div>
      <div className="space-y-1 text-sm">
        <div>Created: {new Date(call.created_at).toLocaleString()}</div>
        {call.started_at && (
          <div>Started: {new Date(call.started_at).toLocaleString()}</div>
        )}
        {call.completed_at && (
          <div>Completed: {new Date(call.completed_at).toLocaleString()}</div>
        )}
      </div>
    </div>
  );
}

function StatisticsCard({ call, eventCount }: { call: CallSummary; eventCount: number }) {
  const formatDuration = (ms: number): string => {
    const seconds = ms / 1000;
    return `${seconds.toFixed(1)}s`;
  };

  return (
    <div className="bg-card rounded-lg border p-4">
      <span className="font-medium mb-2 block">Statistics</span>
      <div className="space-y-1 text-sm">
        <div>Thoughts: {call.total_thoughts}</div>
        <div>Actions: {call.total_actions}</div>
        {call.execution_time_ms && (
          <div>Duration: {formatDuration(call.execution_time_ms)}</div>
        )}
      </div>
    </div>
  );
}

function InputDataCard({ inputData }: { inputData: any }) {
  return (
    <div className="bg-card rounded-lg border p-4">
      <span className="font-medium mb-2 block">Input Data</span>
      <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
        {JSON.stringify(inputData, null, 2)}
      </pre>
    </div>
  );
}
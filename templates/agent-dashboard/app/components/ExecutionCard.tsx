import { ArrowLeft } from "lucide-react";
import type { CallSummary } from "~/lib/types";

interface ExecutionCardProps {
  call: CallSummary;
  onClick: () => void;
}

export function ExecutionCard({ call, onClick }: ExecutionCardProps) {
  return (
    <div
      onClick={onClick}
      className="bg-card rounded-lg border p-4 hover:border-primary transition-colors cursor-pointer"
    >
      <div className="flex items-start justify-between">
        <ExecutionInfo call={call} />
        <ArrowLeft className="w-5 h-5 text-muted-foreground rotate-180" />
      </div>
    </div>
  );
}

function ExecutionInfo({ call }: { call: CallSummary }) {
  return (
    <div className="flex-1">
      <div className="flex items-center space-x-2 mb-2">
        <span className="font-medium">Call #{call.id.slice(0, 8)}</span>
        <StatusBadge status={call.status} />
      </div>
      <ExecutionMetadata call={call} />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const statusColors = {
    completed: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
    running: 'bg-yellow-100 text-yellow-800',
    pending: 'bg-gray-100 text-gray-800',
    cancelled: 'bg-gray-100 text-gray-800'
  };

  return (
    <span className={`px-2 py-1 text-xs rounded-full ${statusColors[status as keyof typeof statusColors] || statusColors.pending}`}>
      {status}
    </span>
  );
}

function ExecutionMetadata({ call }: { call: CallSummary }) {
  return (
    <div className="text-sm text-muted-foreground space-y-1">
      <div>Created: {new Date(call.created_at).toLocaleString()}</div>
      {call.execution_time_ms && (
        <div>Duration: {call.execution_time_ms}ms</div>
      )}
    </div>
  );
}
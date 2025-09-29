import { Bot, CheckCircle, XCircle, AlertCircle, Activity } from "lucide-react";
import type { CallSummary } from "~/lib/types";

interface ExecutionHeaderProps {
  call: CallSummary;
  agentName: string;
  callId: string;
}

export function ExecutionHeader({ call, agentName, callId }: ExecutionHeaderProps) {
  return (
    <div className="bg-card rounded-lg border p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Bot className="w-10 h-10 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Execution Details</h1>
            <div className="flex items-center space-x-2 text-muted-foreground">
              <span>{agentName}</span>
              <span>•</span>
              <span className="font-mono text-sm">{callId.slice(0, 8)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <StatusIcon status={call.status} />
          <StatusBadge status={call.status} />
        </div>
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'completed':
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    case 'failed':
      return <XCircle className="w-5 h-5 text-red-500" />;
    case 'cancelled':
      return <AlertCircle className="w-5 h-5 text-gray-500" />;
    default:
      return <Activity className="w-5 h-5 text-yellow-500 animate-spin" />;
  }
}

function StatusBadge({ status }: { status: string }) {
  const statusColors = {
    completed: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-800',
    running: 'bg-yellow-100 text-yellow-800',
    pending: 'bg-yellow-100 text-yellow-800'
  };

  return (
    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
      statusColors[status as keyof typeof statusColors] || statusColors.pending
    }`}>
      {status}
    </span>
  );
}
import { Activity, Play } from "lucide-react";
import { ExecutionCard } from "./ExecutionCard";
import type { CallSummary } from "~/lib/types";

interface ExecutionHistoryProps {
  calls: CallSummary[];
  onExecute: () => void;
  onCallSelect: (callId: string) => void;
}

export function ExecutionHistory({ calls, onExecute, onCallSelect }: ExecutionHistoryProps) {
  return (
    <div>
      <ExecutionHistoryHeader callCount={calls.length} />

      {calls.length === 0 ? (
        <EmptyState onExecute={onExecute} />
      ) : (
        <ExecutionList calls={calls} onCallSelect={onCallSelect} />
      )}
    </div>
  );
}

function ExecutionHistoryHeader({ callCount }: { callCount: number }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-xl font-semibold">Execution History</h2>
      {callCount > 0 && (
        <span className="text-sm text-muted-foreground">
          {callCount} execution{callCount !== 1 ? 's' : ''}
        </span>
      )}
    </div>
  );
}

function EmptyState({ onExecute }: { onExecute: () => void }) {
  return (
    <div className="bg-card rounded-lg border p-8 text-center">
      <Activity className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
      <h3 className="font-medium mb-2">No Executions Yet</h3>
      <p className="text-muted-foreground mb-4">
        Start by creating your first execution for this agent.
      </p>
      <button
        onClick={onExecute}
        className="inline-flex items-center space-x-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/80 transition-colors"
      >
        <Play className="w-4 h-4" />
        <span>Create First Execution</span>
      </button>
    </div>
  );
}

function ExecutionList({ calls, onCallSelect }: { calls: CallSummary[]; onCallSelect: (id: string) => void }) {
  return (
    <div className="grid gap-4">
      {calls.map(call => (
        <ExecutionCard
          key={call.id}
          call={call}
          onClick={() => onCallSelect(call.id)}
        />
      ))}
    </div>
  );
}
import { Activity } from "lucide-react";
import { SchemaForm } from "./SchemaForm";
import type { Agent } from "~/lib/types";

interface ExecuteFormProps {
  agent: Agent;
  agentName: string;
  isSubmitting: boolean;
  error: string | null;
  onSubmit: (data: any) => void;
}

export function ExecuteForm({
  agent,
  agentName,
  isSubmitting,
  error,
  onSubmit
}: ExecuteFormProps) {
  return (
    <div className="bg-card rounded-lg border p-6">
      {isSubmitting ? (
        <SubmittingState />
      ) : (
        <SchemaForm
          schema={agent.input_schema}
          onSubmit={onSubmit}
          disabled={false}
          persistKey={`execute-${agentName}`}
          error={error}
        />
      )}
    </div>
  );
}

function SubmittingState() {
  return (
    <div className="text-center py-12">
      <Activity className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
      <h3 className="font-medium mb-2">Starting Execution...</h3>
      <p className="text-sm text-muted-foreground">
        Please wait while we create your execution.
      </p>
    </div>
  );
}
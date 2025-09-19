import { Bot, Play, Activity } from "lucide-react";
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
    <>
      <ExecuteHeader agentName={agentName} description={agent.description} />
      <ExecuteFormCard
        schema={agent.input_schema}
        isSubmitting={isSubmitting}
        error={error}
        onSubmit={onSubmit}
      />
    </>
  );
}

interface ExecuteHeaderProps {
  agentName: string;
  description?: string;
}

function ExecuteHeader({ agentName, description }: ExecuteHeaderProps) {
  return (
    <div className="bg-card rounded-lg border p-6">
      <div className="flex items-center space-x-4">
        <Bot className="w-10 h-10 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Execute {agentName}</h1>
          <p className="text-muted-foreground">
            {description || 'Create a new execution'}
          </p>
        </div>
      </div>
    </div>
  );
}

interface ExecuteFormCardProps {
  schema: any;
  isSubmitting: boolean;
  error: string | null;
  onSubmit: (data: any) => void;
}

function ExecuteFormCard({ schema, isSubmitting, error, onSubmit }: ExecuteFormCardProps) {
  return (
    <div className="bg-card rounded-lg border p-6">
      <FormHeader />
      {error && <FormError error={error} />}
      {isSubmitting ? (
        <SubmittingState />
      ) : (
        <SchemaForm
          schema={schema}
          onSubmit={onSubmit}
          disabled={false}
        />
      )}
    </div>
  );
}

function FormHeader() {
  return (
    <div className="flex items-center space-x-2 mb-6">
      <Play className="w-5 h-5 text-primary" />
      <h2 className="text-lg font-semibold">Execution Parameters</h2>
    </div>
  );
}

function FormError({ error }: { error: string }) {
  return (
    <div className="mb-6 p-4 bg-destructive/10 text-destructive rounded-lg border border-destructive/20">
      {error}
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
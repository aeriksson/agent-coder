import { useState } from "react";
import { Bot, Play, ChevronDown, ChevronUp } from "lucide-react";
import { ToolsList } from "./ToolsList";
import { InputSchemaDisplay } from "./InputSchemaDisplay";
import type { Agent } from "~/lib/types";

interface AgentCardProps {
  agent: Agent;
  onExecute: () => void;
}

export function AgentCard({ agent, onExecute }: AgentCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-card rounded-lg border p-6">
      <AgentHeader
        name={agent.name}
        isExpanded={isExpanded}
        onToggleExpand={() => setIsExpanded(!isExpanded)}
        onExecute={onExecute}
      />

      {agent.description && (
        <p className="text-muted-foreground mb-4">{agent.description}</p>
      )}

      <AgentQuickInfo agent={agent} />

      {isExpanded && <AgentExpandedDetails agent={agent} />}
    </div>
  );
}

interface AgentHeaderProps {
  name: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onExecute: () => void;
}

function AgentHeader({ name, isExpanded, onToggleExpand, onExecute }: AgentHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center space-x-4">
        <Bot className="w-10 h-10 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">{name}</h1>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <button
          onClick={onToggleExpand}
          className="p-2 hover:bg-muted rounded-lg transition-colors"
          title={isExpanded ? "Hide details" : "Show details"}
        >
          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
        <button
          onClick={onExecute}
          className="flex items-center space-x-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/80 transition-colors"
        >
          <Play className="w-4 h-4" />
          <span>New Execution</span>
        </button>
      </div>
    </div>
  );
}

function AgentQuickInfo({ agent }: { agent: Agent }) {
  return (
    <div className="flex flex-wrap gap-4 text-sm">
      <ToolsList tools={agent.tools} collapsed />
      <InputSchemaDisplay schema={agent.input_schema} collapsed />
    </div>
  );
}

function AgentExpandedDetails({ agent }: { agent: Agent }) {
  return (
    <div className="mt-4 pt-4 border-t space-y-4">
      <ToolsList tools={agent.tools} />
      <InputSchemaDisplay schema={agent.input_schema} />

      <div className="text-xs text-muted-foreground pt-2">
        {agent.version && <div>Version: {agent.version}</div>}
      </div>
    </div>
  );
}
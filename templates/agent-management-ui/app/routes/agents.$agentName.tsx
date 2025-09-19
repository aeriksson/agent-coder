import { useNavigate, useParams } from "react-router";
import { useCallStore } from "~/lib/callStore";
import { agentClient } from "~/lib/agentClient";
import { useShallow } from "zustand/react/shallow";
import { Breadcrumb } from "~/components/Breadcrumb";
import { AgentCard } from "~/components/AgentCard";
import { ExecutionHistory } from "~/components/ExecutionHistory";
import { LoadingState } from "~/components/LoadingState";
import type { Route } from "./+types/agents.$agentName";

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const store = useCallStore.getState();

  Promise.all([
    agentClient.getAgent(params.agentName),
    agentClient.listAgentCalls(params.agentName, { limit: 20 })
  ]).then(([agent, callsResponse]) => {
    store.setAgents({ [params.agentName]: agent });
    callsResponse.calls.forEach(call => store.updateCall(call));
  });

  return {};
}

export function meta({ params }: Route.MetaArgs) {
  return [
    { title: `Agent: ${params.agentName} - agent-dashboard` },
    { name: "description", content: `Manage executions for ${params.agentName}` },
  ];
}

export default function AgentDetail() {
  const navigate = useNavigate();
  const { agentName } = useParams();

  const agent = useCallStore(state => state.agents[agentName!]);
  const calls = useCallStore(
    useShallow(state =>
      Object.values(state.calls).filter(call => call.agent_name === agentName)
    )
  );

  const handleExecute = () => {
    navigate(`/agents/${agentName}/execute`);
  };

  const handleCallSelect = (callId: string) => {
    navigate(`/agents/${agentName}/calls/${callId}`);
  };

  if (!agent) {
    return <LoadingState message="Loading agent details..." />;
  }

  const breadcrumbItems = [
    { label: "Agents", href: "/home" },
    { label: agentName || "Agent" }
  ];

  return (
    <div className="h-full bg-background">
      <div className="p-6 space-y-6">
        <Breadcrumb items={breadcrumbItems} />
        <AgentCard agent={agent} onExecute={handleExecute} />
        <ExecutionHistory
          calls={calls}
          onExecute={handleExecute}
          onCallSelect={handleCallSelect}
        />
      </div>
    </div>
  );
}
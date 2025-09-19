import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useCallStore } from "~/lib/callStore";
import { agentClient } from "~/lib/agentClient";
import { Breadcrumb } from "~/components/Breadcrumb";
import { ExecuteForm } from "~/components/ExecuteForm";
import { LoadingState } from "~/components/LoadingState";
import type { Route } from "./+types/agents.$agentName.execute";

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const store = useCallStore.getState();

  agentClient.getAgent(params.agentName).then(agent => {
    store.setAgents({ [params.agentName]: agent });
  });

  return {};
}


export function meta({ params }: Route.MetaArgs) {
  return [
    { title: `Execute ${params.agentName} - agent-dashboard` },
    { name: "description", content: `Create a new execution for ${params.agentName}` },
  ];
}

export default function ExecuteAgent() {
  const navigate = useNavigate();
  const { agentName } = useParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const agent = useCallStore(state => state.agents[agentName!]);


  const handleSubmit = async (inputData: any) => {
    if (!agentName || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const call = await agentClient.createCall(agentName, inputData);
      const store = useCallStore.getState();
      store.updateCall(call);
      navigate(`/agents/${agentName}/calls/${call.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start execution');
      setIsSubmitting(false);
    }
  };

  if (!agent) {
    return <LoadingState message="Loading agent details..." />;
  }

  const breadcrumbItems = [
    { label: "Agents", href: "/home" },
    { label: agentName || "Agent", href: `/agents/${agentName}` },
    { label: "New Execution" }
  ];

  return (
    <div className="h-full bg-background p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <Breadcrumb items={breadcrumbItems} />

        <ExecuteForm
          agent={agent}
          agentName={agentName!}
          isSubmitting={isSubmitting}
          error={error}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}
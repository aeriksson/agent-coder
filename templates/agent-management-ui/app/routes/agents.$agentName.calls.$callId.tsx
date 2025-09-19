import React from "react";
import { useParams, useNavigate } from "react-router";
import { useCallStore } from "~/lib/callStore";
import { agentClient } from "~/lib/agentClient";
import { Breadcrumb } from "~/components/Breadcrumb";
import { ExecutionHeader } from "~/components/ExecutionHeader";
import { ExecutionStats } from "~/components/ExecutionStats";
import { ExecutionLogSection } from "~/components/ExecutionLogSection";
import { ErrorState } from "~/components/ErrorState";
import { LoadingState } from "~/components/LoadingState";
import type { Route } from "./+types/agents.$agentName.calls.$callId";

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const store = useCallStore.getState();
  const { callId } = params;

  store.setCallLoading(callId, true);
  store.setEventsLoading(callId, true);

  agentClient.getCall(callId)
    .then(call => {
      store.updateCall(call);
      store.setCallLoading(callId, false);
    })
    .catch(error => {
      const notFound = error.message?.includes('404') || error.message?.includes('not found');
      store.setCallError(callId, error.message || 'Failed to load call', notFound);
    });

  agentClient.getCallEvents(callId)
    .then(eventsResponse => {
      store.setCallEvents(callId, eventsResponse.events);
      store.setEventsLoading(callId, false);
    })
    .catch(error => {
      const notFound = error.message?.includes('404') || error.message?.includes('not found');
      store.setEventsError(callId, error.message || 'Failed to load events', notFound);
    });

  return {};
}


export function meta({ params }: Route.MetaArgs) {
  return [
    { title: `Execution ${params.callId.slice(0, 8) || params.callId} - agent-dashboard` },
    { name: "description", content: `View execution details for ${params.agentName}` },
  ];
}

const EMPTY_EVENTS: any[] = [];

export default function ExecutionView() {
  const navigate = useNavigate();
  const { agentName, callId } = useParams();

  const call = useCallStore(state => state.calls[callId!]);
  const callMeta = useCallStore(state => state.callsMeta[callId!]);
  const events = useCallStore(state => state.events[callId!] || EMPTY_EVENTS);
  const eventsMeta = useCallStore(state => state.eventsMeta[callId!]);

  React.useEffect(() => {
    if (callId && call && (call.status === 'running' || call.status === 'pending')) {
      const store = useCallStore.getState();
      store.subscribeToCall(callId);
      return () => store.unsubscribeFromCall(callId);
    }
  }, [callId, call?.status]);

  const handleBack = () => {
    navigate(`/agents/${agentName}`);
  };

  if (callMeta?.notFound) {
    return (
      <ErrorState
        title="Execution Not Found"
        message={`The execution with ID "${callId}" does not exist or has been deleted.`}
        onBack={handleBack}
        backLabel="Back to Agent"
        icon="bot"
      />
    );
  }

  if (!call && callMeta?.loading !== false) {
    return <LoadingState message="Loading execution details..." />;
  }

  if (!call && callMeta?.error) {
    return (
      <ErrorState
        title="Failed to Load Execution"
        message={callMeta.error}
        onBack={handleBack}
        backLabel="Back to Agent"
      />
    );
  }

  if (!call) {
    return (
      <ErrorState
        title="Execution Unavailable"
        message="Unable to load execution details. Please try again later."
        onBack={handleBack}
        backLabel="Back to Agent"
      />
    );
  }

  const isRunning = call.status === 'running' || call.status === 'pending';

  const breadcrumbItems = [
    { label: "Agents", href: "/home" },
    { label: agentName || "Agent", href: `/agents/${agentName}` },
    { label: `Execution ${callId?.slice(0, 8)}` }
  ];

  return (
    <div className="h-full bg-background">
      <div className="p-6 space-y-6">
        <Breadcrumb items={breadcrumbItems} />

        <ExecutionHeader
          call={call}
          agentName={agentName!}
          callId={callId!}
        />

        <ExecutionStats
          call={call}
          eventCount={events.length}
        />

        <ExecutionLogSection
          events={events}
          isRunning={isRunning}
        />
      </div>
    </div>
  );
}

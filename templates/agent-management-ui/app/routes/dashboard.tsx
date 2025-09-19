import { Outlet } from "react-router";
import { AppLayout } from "~/components/AppLayout";
import type { Route } from "./+types/dashboard";

export async function clientLoader() {
  // Load agents on layout mount
  const { agentClient } = await import("~/lib/agentClient");
  const { useCallStore } = await import("~/lib/callStore");

  const store = useCallStore.getState();

  agentClient.listAgents().then(agents => {
    store.setAgents(agents);
  });

  return {};
}

export default function DashboardLayout() {
  return <AppLayout />;
}
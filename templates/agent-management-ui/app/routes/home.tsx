import { Bot } from "lucide-react";
import type { Route } from "./+types/home";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Agent Dashboard - agent-dashboard" },
    { name: "description", content: "Select an agent to get started" },
  ];
}

export default function Home() {
  return (
    <div className="flex items-center justify-center h-full bg-background">
      <div className="text-center max-w-md">
        <Bot className="h-16 w-16 mx-auto mb-6 text-primary" />
        <h1 className="text-3xl font-bold mb-4">Welcome to Agent Dashboard</h1>
        <p className="text-muted-foreground text-lg">
          Select an agent from the sidebar to view its details and manage executions.
        </p>
      </div>
    </div>
  );
}
import { useState, useEffect } from "react";
import type { Route } from "./+types/_index";
import { Bot, Activity, Settings, Play } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { AgentGrid } from "~/components/AgentGrid";
import { ExecutionViewer } from "~/components/ExecutionViewer";
import { fetchAgents, type Agent } from "@/lib/agentClient";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Agent Management Dashboard - {{ project-name }}" },
    { name: "description", content: "Manage and monitor your Opper AI agents" },
  ];
}

export default function Dashboard() {
  const [agents, setAgents] = useState<Record<string, Agent>>({});
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [showExecution, setShowExecution] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadAgents = async () => {
      try {
        const agentData = await fetchAgents();
        setAgents(agentData);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load agents');
      } finally {
        setLoading(false);
      }
    };

    loadAgents();
    
    // Refresh agents every 5 seconds
    const interval = setInterval(loadAgents, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Activity className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading agents...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-destructive mb-4">Failed to load agents: {error}</p>
            <Button onClick={() => window.location.reload()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Bot className="h-8 w-8 text-primary" />
            <h1 className="text-xl font-semibold">Agent Dashboard</h1>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-muted-foreground">
              {Object.keys(agents).length} agents
            </span>
            <Button variant="ghost" size="icon">
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Agent Grid */}
          <div className="lg:col-span-2">
            <div className="mb-6 flex justify-between items-center">
              <h2 className="text-lg font-medium">Available Agents</h2>
              {selectedAgent && (
                <Button
                  onClick={() => setShowExecution(true)}
                  className="flex items-center space-x-2"
                >
                  <Play className="h-4 w-4" />
                  <span>Test Agent</span>
                </Button>
              )}
            </div>
            <AgentGrid 
              agents={agents} 
              selectedAgent={selectedAgent}
              onSelectAgent={setSelectedAgent}
            />
          </div>

          {/* Execution Viewer */}
          <div className="lg:col-span-1">
            <ExecutionViewer 
              isVisible={showExecution}
              selectedAgent={selectedAgent}
              onClose={() => setShowExecution(false)}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

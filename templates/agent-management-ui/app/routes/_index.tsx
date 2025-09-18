import { useState, useEffect } from "react";
import type { Route } from "./+types/_index";
import { Bot, Activity, Settings } from "lucide-react";
import { AgentSidebar } from "~/components/AgentSidebar";
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
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Activity className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-400" />
          <p className="text-gray-400">Loading agents...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-gray-800 rounded-lg p-6 text-center">
          <p className="text-red-400 mb-4">Failed to load agents: {error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex">
      {/* Sidebar */}
      <AgentSidebar 
        agents={agents}
        selectedAgent={selectedAgent}
        onSelectAgent={setSelectedAgent}
      />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="border-b border-gray-700 bg-gray-800">
          <div className="px-6 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Bot className="h-6 w-6 text-blue-400" />
              <h1 className="text-lg font-medium">
                {selectedAgent ? `Agent: ${selectedAgent}` : 'Select an Agent'}
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-400">
                {Object.keys(agents).length} agents available
              </span>
              <button className="p-2 text-gray-400 hover:text-white">
                <Settings className="h-5 w-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Execution Viewer */}
        <div className="flex-1">
          <ExecutionViewer 
            selectedAgent={selectedAgent}
            agentSchema={selectedAgent ? agents[selectedAgent] : undefined}
          />
        </div>
      </div>
    </div>
  );
}
import { Bot, Workflow, Settings } from "lucide-react";
import type { Agent } from "@/lib/agentClient";

interface AgentSidebarProps {
  agents: Record<string, Agent>;
  selectedAgent: string | null;
  onSelectAgent: (agentName: string) => void;
}

export function AgentSidebar({ agents, selectedAgent, onSelectAgent }: AgentSidebarProps) {
  const agentEntries = Object.entries(agents);

  return (
    <div className="w-80 bg-gray-800 border-r border-gray-700 flex flex-col">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-lg font-medium text-white flex items-center space-x-2">
          <Bot className="h-5 w-5 text-blue-400" />
          <span>Agents</span>
        </h2>
        <p className="text-sm text-gray-400 mt-1">
          {agentEntries.length} available
        </p>
      </div>

      {/* Agent List */}
      <div className="flex-1 overflow-y-auto">
        {agentEntries.length === 0 ? (
          <div className="p-4 text-center">
            <Bot className="h-12 w-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No agents available</p>
            <p className="text-xs text-gray-500 mt-1">
              Create agents using the add-agent tool
            </p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {agentEntries.map(([agentName, agent]) => (
              <button
                key={agentName}
                onClick={() => onSelectAgent(agentName)}
                className={`w-full p-3 rounded-lg text-left transition-colors ${
                  selectedAgent === agentName
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {agent.mode === 'flow' ? (
                      <Workflow className="h-4 w-4 text-purple-400" />
                    ) : (
                      <Settings className="h-4 w-4 text-green-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm truncate">
                      {agent.name}
                    </h3>
                    <p className="text-xs opacity-75 mt-1 line-clamp-2">
                      {agent.description}
                    </p>
                    <div className="flex items-center space-x-2 mt-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        agent.mode === 'flow' 
                          ? 'bg-purple-900/50 text-purple-300' 
                          : 'bg-green-900/50 text-green-300'
                      }`}>
                        {agent.mode}
                      </span>
                      {agent.tools && agent.tools.length > 0 && (
                        <span className="text-xs text-gray-400">
                          {agent.tools.length} tools
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Sidebar Footer */}
      <div className="p-4 border-t border-gray-700">
        <div className="text-xs text-gray-500">
          Select an agent to view details and test execution
        </div>
      </div>
    </div>
  );
}
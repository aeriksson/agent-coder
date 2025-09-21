import { useNavigate, useParams, Outlet } from "react-router";
import { Bot, Home, Activity } from "lucide-react";
import { useCallStore } from "~/lib/callStore";
import { cn } from "@/lib/utils";

export function AppLayout() {
  const navigate = useNavigate();
  const { agentName } = useParams();
  const agents = useCallStore(state => state.agents);

  const agentList = Object.values(agents);

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="w-64 border-r bg-card flex flex-col">
        {/* Header */}
        <div className="p-4 border-b">
          <button
            onClick={() => navigate('/home')}
            className="flex items-center space-x-2 w-full hover:bg-muted p-2 rounded-lg transition-colors"
          >
            <Home className="w-5 h-5" />
            <span className="font-semibold">Agent Dashboard</span>
          </button>
        </div>

        {/* Agent List */}
        <div className="flex-1 overflow-y-auto p-4">
          <h2 className="text-sm font-medium text-muted-foreground mb-2">Agents</h2>
          {agentList.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="w-8 h-8 animate-spin mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading agents...</p>
            </div>
          ) : (
            <div className="space-y-1">
              {agentList.map(agent => (
                <button
                  key={agent.name}
                  onClick={() => navigate(`/agents/${agent.name}`)}
                  className={cn(
                    "w-full flex items-center space-x-2 p-2 rounded-lg transition-colors text-left",
                    agentName === agent.name
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  )}
                >
                  <Bot className="w-4 h-4 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{agent.name}</div>
                    <div className={cn(
                      "text-xs truncate",
                      agentName === agent.name ? "text-primary-foreground/70" : "text-muted-foreground"
                    )}>
                      {agent.description || "AI Agent"}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t">
          <p className="text-xs text-muted-foreground text-center">
            {agentList.length} agent{agentList.length !== 1 ? 's' : ''} available
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  );
}
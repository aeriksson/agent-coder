import { Bot, Wrench, Workflow, Clock, Eye } from "lucide-react";
import { Card, CardContent } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import type { Agent } from "@/lib/agentClient";

interface AgentGridProps {
  agents: Record<string, Agent>;
  selectedAgent: string | null;
  onSelectAgent: (agentName: string) => void;
}

interface AgentCardProps {
  name: string;
  agent: Agent;
  isSelected: boolean;
  onSelect: () => void;
}

const AgentCard = ({ name, agent, isSelected, onSelect }: AgentCardProps) => {
  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'tools':
        return <Wrench className="h-5 w-5" />;
      case 'flow':
        return <Workflow className="h-5 w-5" />;
      default:
        return <Bot className="h-5 w-5" />;
    }
  };

  const getModeColor = (mode: string) => {
    switch (mode) {
      case 'tools':
        return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/20';
      case 'flow':
        return 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/20';
      default:
        return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-800';
    }
  };

  return (
    <Card
      onClick={onSelect}
      className={`cursor-pointer transition-all hover:shadow-md ${
        isSelected ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
      }`}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${getModeColor(agent.mode)}`}>
              {getModeIcon(agent.mode)}
            </div>
            <div>
              <h3 className="font-medium">{agent.name}</h3>
              <p className="text-sm text-muted-foreground capitalize">{agent.mode} mode</p>
            </div>
          </div>
          {isSelected && (
            <div className="p-1 rounded-full bg-primary">
              <Eye className="h-4 w-4 text-primary-foreground" />
            </div>
          )}
        </div>

        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {agent.description}
        </p>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center space-x-1">
              <Clock className="h-3 w-3" />
              <span>Max {agent.max_iterations} iterations</span>
            </span>
            <Badge variant={agent.verbose ? "default" : "secondary"} className="text-xs">
              {agent.verbose ? 'Verbose' : 'Quiet'}
            </Badge>
          </div>

          {agent.tools && agent.tools.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {agent.tools.slice(0, 3).map((tool) => (
                <Badge key={tool} variant="outline" className="text-xs">
                  {tool}
                </Badge>
              ))}
              {agent.tools.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{agent.tools.length - 3} more
                </Badge>
              )}
            </div>
          )}

          {agent.workflow_id && (
            <div className="text-xs text-primary">
              Workflow: {agent.workflow_id}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export const AgentGrid = ({ agents, selectedAgent, onSelectAgent }: AgentGridProps) => {
  const agentEntries = Object.entries(agents);

  if (agentEntries.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Bot className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No agents available</h3>
          <p className="text-muted-foreground">
            Start the backend server to see available agents.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {agentEntries.map(([name, agent]) => (
        <AgentCard
          key={name}
          name={name}
          agent={agent}
          isSelected={selectedAgent === name}
          onSelect={() => onSelectAgent(name)}
        />
      ))}
    </div>
  );
};
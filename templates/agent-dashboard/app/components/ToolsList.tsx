import { Zap } from "lucide-react";

interface ToolsListProps {
  tools?: string[];
  collapsed?: boolean;
}

export function ToolsList({ tools, collapsed = false }: ToolsListProps) {
  if (!tools || tools.length === 0) return null;

  if (collapsed) {
    return (
      <div className="flex items-center space-x-2">
        <Zap className="w-4 h-4 text-muted-foreground" />
        <span className="text-muted-foreground">Tools:</span>
        <span className="font-mono">
          {tools.slice(0, 3).join(", ")}
          {tools.length > 3 && ` +${tools.length - 3} more`}
        </span>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-sm font-medium mb-2 flex items-center space-x-2">
        <Zap className="w-4 h-4" />
        <span>Available Tools ({tools.length})</span>
      </h3>
      <div className="flex flex-wrap gap-2">
        {tools.map(tool => (
          <ToolBadge key={tool} name={tool} />
        ))}
      </div>
    </div>
  );
}

function ToolBadge({ name }: { name: string }) {
  return (
    <span className="px-2 py-1 bg-muted rounded text-xs font-mono">
      {name}
    </span>
  );
}
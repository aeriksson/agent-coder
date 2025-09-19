import { FileJson } from "lucide-react";

interface InputSchemaDisplayProps {
  schema?: {
    properties?: Record<string, any>;
    required?: string[];
  };
  collapsed?: boolean;
}

export function InputSchemaDisplay({ schema, collapsed = false }: InputSchemaDisplayProps) {
  if (!schema?.properties || Object.keys(schema.properties).length === 0) return null;

  const properties = Object.entries(schema.properties);

  if (collapsed) {
    return (
      <div className="flex items-center space-x-2">
        <FileJson className="w-4 h-4 text-muted-foreground" />
        <span className="text-muted-foreground">Inputs:</span>
        <span className="font-mono">
          {Object.keys(schema.properties).slice(0, 3).join(", ")}
          {Object.keys(schema.properties).length > 3 &&
            ` +${Object.keys(schema.properties).length - 3} more`}
        </span>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-sm font-medium mb-2 flex items-center space-x-2">
        <FileJson className="w-4 h-4" />
        <span>Input Schema</span>
      </h3>
      <div className="bg-muted/50 rounded p-3 space-y-2">
        {properties.map(([key, propSchema]) => (
          <SchemaProperty
            key={key}
            name={key}
            schema={propSchema}
            required={schema.required?.includes(key)}
          />
        ))}
      </div>
    </div>
  );
}

interface SchemaPropertyProps {
  name: string;
  schema: any;
  required?: boolean;
}

function SchemaProperty({ name, schema, required }: SchemaPropertyProps) {
  return (
    <div className="flex items-start justify-between text-sm">
      <div>
        <span className="font-mono font-medium">{name}</span>
        {required && (
          <span className="ml-2 text-xs text-destructive">required</span>
        )}
      </div>
      <div className="text-right">
        <span className="text-muted-foreground">{schema.type}</span>
        {schema.description && (
          <div className="text-xs text-muted-foreground mt-1 max-w-xs text-right">
            {schema.description}
          </div>
        )}
      </div>
    </div>
  );
}
import { useState } from "react";
import { ChevronDown, ChevronUp, Code2, FileText } from "lucide-react";
import { Button } from "~/components/ui/button";
import { JsonViewer } from "./events/JsonViewer";

interface SchemaDisplayProps {
  schema: any;
  title: string;
}

export function SchemaDisplay({ schema, title }: SchemaDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showJson, setShowJson] = useState(false);

  const extractActualSchema = (fieldSchema: any): any => {
    if (!fieldSchema) return fieldSchema;
    
    if (fieldSchema.anyOf && Array.isArray(fieldSchema.anyOf)) {
      const nonNullSchema = fieldSchema.anyOf.find((s: any) => s.type !== "null");
      if (nonNullSchema) {
        return {
          ...fieldSchema,
          ...nonNullSchema,
          anyOf: undefined
        };
      }
    }
    
    return fieldSchema;
  };

  const getTypeDisplay = (fieldSchema: any): string => {
    if (!fieldSchema) return "";
    
    if (fieldSchema.anyOf) {
      const types = fieldSchema.anyOf
        .map((s: any) => s.type)
        .filter((t: string) => t !== "null");
      
      if (types.length === 1) {
        const mainType = fieldSchema.anyOf.find((s: any) => s.type === types[0]);
        if (mainType?.type === "array" && mainType?.items?.type) {
          return `array<${mainType.items.type}>`;
        }
        return types[0];
      }
    }
    
    const { type, items } = fieldSchema;
    
    if (type === "array") {
      if (items?.type) {
        return `array<${items.type}>`;
      }
      return "array";
    }
    
    return type || "";
  };

  const renderSchemaSummary = () => {
    if (!schema?.properties) {
      return <div className="text-sm text-muted-foreground">No schema defined</div>;
    }

    return (
      <div className="space-y-2">
        {Object.entries(schema.properties).map(([fieldName, fieldSchema]: [string, any]) => {
          const actualSchema = extractActualSchema(fieldSchema);
          const typeDisplay = getTypeDisplay(fieldSchema);
          const isRequired = schema.required?.includes(fieldName);
          
          return (
            <div key={fieldName} className="flex items-start gap-2 text-sm">
              <span className="font-mono">
                {fieldName}
                {isRequired && <span className="text-red-500">*</span>}:
              </span>
              <span className="text-muted-foreground">
                {typeDisplay}
              </span>
              {actualSchema.description && (
                <span className="text-muted-foreground text-xs">
                  - {actualSchema.description}
                </span>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Button
          onClick={() => setIsExpanded(!isExpanded)}
          variant="ghost"
          size="sm"
          className="font-semibold"
        >
          {isExpanded ? <ChevronUp className="h-4 w-4 mr-2" /> : <ChevronDown className="h-4 w-4 mr-2" />}
          {title}
        </Button>
        {isExpanded && schema && (
          <Button
            onClick={() => setShowJson(!showJson)}
            variant="ghost"
            size="sm"
          >
            {showJson ? (
              <>
                <FileText className="h-4 w-4 mr-2" />
                Summary
              </>
            ) : (
              <>
                <Code2 className="h-4 w-4 mr-2" />
                JSON
              </>
            )}
          </Button>
        )}
      </div>
      
      {isExpanded && (
        <div className="pl-6">
          {showJson ? (
            <JsonViewer data={schema} />
          ) : (
            renderSchemaSummary()
          )}
        </div>
      )}
    </div>
  );
}
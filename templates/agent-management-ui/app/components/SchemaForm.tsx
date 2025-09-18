import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Label } from "~/components/ui/label";
import { Checkbox } from "~/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";

interface SchemaFormProps {
  schema: any;
  onSubmit: (data: any) => void;
  disabled?: boolean;
}

export const SchemaForm = ({ schema, onSubmit, disabled = false }: SchemaFormProps) => {
  const [formData, setFormData] = useState<any>({});
  const [errors, setErrors] = useState<any>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation for required fields
    const newErrors: any = {};
    const required = schema?.required || [];
    
    for (const field of required) {
      if (!formData[field] && formData[field] !== false) {
        newErrors[field] = "This field is required";
      }
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setErrors({});
    onSubmit(formData);
  };

  const updateField = (fieldName: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
    if (errors[fieldName]) {
      setErrors(prev => ({ ...prev, [fieldName]: undefined }));
    }
  };

  const renderField = (fieldName: string, fieldSchema: any) => {
    const fieldType = fieldSchema.type;
    const description = fieldSchema.description;
    const enumValues = fieldSchema.enum;
    const required = schema?.required?.includes(fieldName) || false;

    return (
      <div key={fieldName} className="space-y-2">
        <Label htmlFor={fieldName}>
          {fieldName}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
        
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}

        {fieldType === "boolean" ? (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={fieldName}
              checked={formData[fieldName] || false}
              onCheckedChange={(checked) => updateField(fieldName, checked)}
              disabled={disabled}
            />
            <Label htmlFor={fieldName} className="text-sm font-normal">
              {fieldSchema.title || fieldName}
            </Label>
          </div>
        ) : enumValues ? (
          <Select
            value={formData[fieldName] || ""}
            onValueChange={(value) => updateField(fieldName, value)}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder={`Select ${fieldName}`} />
            </SelectTrigger>
            <SelectContent>
              {enumValues.map((value: string) => (
                <SelectItem key={value} value={value}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : fieldType === "string" && fieldSchema.format === "textarea" ? (
          <Textarea
            id={fieldName}
            value={formData[fieldName] || ""}
            onChange={(e) => updateField(fieldName, e.target.value)}
            placeholder={description || `Enter ${fieldName}`}
            disabled={disabled}
            className="min-h-[100px]"
          />
        ) : fieldType === "number" || fieldType === "integer" ? (
          <Input
            id={fieldName}
            type="number"
            value={formData[fieldName] || ""}
            onChange={(e) => updateField(fieldName, e.target.valueAsNumber || e.target.value)}
            placeholder={description || `Enter ${fieldName}`}
            disabled={disabled}
            min={fieldSchema.minimum}
            max={fieldSchema.maximum}
          />
        ) : fieldType === "array" || fieldType === "object" ? (
          <div className="space-y-2">
            <Textarea
              id={fieldName}
              value={formData[fieldName] ? JSON.stringify(formData[fieldName], null, 2) : ""}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  updateField(fieldName, parsed);
                } catch {
                  // Keep the raw string value for now
                  updateField(fieldName, e.target.value);
                }
              }}
              placeholder={`Enter ${fieldName} as JSON`}
              disabled={disabled}
              className="min-h-[80px] font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Enter as JSON (e.g., {fieldType === "array" ? '["item1", "item2"]' : '{"key": "value"}'})
            </p>
          </div>
        ) : (
          <Input
            id={fieldName}
            type="text"
            value={formData[fieldName] || ""}
            onChange={(e) => updateField(fieldName, e.target.value)}
            placeholder={description || `Enter ${fieldName}`}
            disabled={disabled}
          />
        )}

        {errors[fieldName] && (
          <p className="text-sm text-red-500">{errors[fieldName]}</p>
        )}
      </div>
    );
  };

  if (!schema || !schema.properties) {
    return (
      <div className="space-y-4">
        <Textarea
          placeholder="Enter your request as free text..."
          value={formData.goal || ""}
          onChange={(e) => updateField("goal", e.target.value)}
          disabled={disabled}
          className="min-h-[100px]"
        />
        <Button onClick={() => onSubmit({ goal: formData.goal })} disabled={disabled || !formData.goal}>
          Execute
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {Object.entries(schema.properties).map(([fieldName, fieldSchema]: [string, any]) =>
        renderField(fieldName, fieldSchema)
      )}
      
      <Button type="submit" disabled={disabled} className="w-full">
        Execute
      </Button>
    </form>
  );
};
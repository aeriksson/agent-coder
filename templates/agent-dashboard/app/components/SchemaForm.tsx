import { useState, useEffect, useMemo } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Label } from "~/components/ui/label";
import { Checkbox } from "~/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Plus, AlertCircle, Play } from "lucide-react";
import Ajv from "ajv";
import addFormats from "ajv-formats";

interface SchemaFormProps {
  schema: any;
  onSubmit: (data: any) => void;
  disabled?: boolean;
  initialData?: any;
  persistKey?: string;
  error?: string | null;
}

export const SchemaForm = ({ 
  schema, 
  onSubmit, 
  disabled = false, 
  initialData = {},
  persistKey,
  error
}: SchemaFormProps) => {
  const [formData, setFormData] = useState<any>(() => {
    if (persistKey && typeof window !== 'undefined') {
      const saved = localStorage.getItem(`form-${persistKey}`);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
    }
    
    // Apply schema defaults
    const dataWithDefaults = { ...initialData };
    if (schema?.properties) {
      Object.entries(schema.properties).forEach(([key, fieldSchema]: [string, any]) => {
        if (dataWithDefaults[key] === undefined && fieldSchema.default !== undefined) {
          dataWithDefaults[key] = fieldSchema.default;
        }
      });
    }
    
    return dataWithDefaults;
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const ajv = useMemo(() => {
    const ajvInstance = new Ajv({ allErrors: true, verbose: true });
    addFormats(ajvInstance);
    return ajvInstance;
  }, []);

  useEffect(() => {
    if (persistKey && typeof window !== 'undefined') {
      localStorage.setItem(`form-${persistKey}`, JSON.stringify(formData));
    }
  }, [formData, persistKey]);

  const validateField = (fieldName: string, value: any, fieldSchema: any): string | null => {
    if (!fieldSchema) return null;

    // Skip validation for empty optional fields
    if (value === undefined || value === null || value === "") {
      if (!schema?.required?.includes(fieldName)) {
        return null;
      }
    }

    try {
      const validate = ajv.compile({
        type: "object",
        properties: {
          [fieldName]: fieldSchema
        },
        required: schema?.required?.includes(fieldName) ? [fieldName] : []
      });

      const valid = validate({ [fieldName]: value });
      if (!valid) {
        const error = validate.errors?.[0];
        if (error) {
          if (error.keyword === 'required') {
            return 'This field is required';
          }
          if (error.keyword === 'type' && error.params?.type === 'array') {
            return 'This field must be a list';
          }
          return error.message || 'Invalid value';
        }
      }
    } catch (e) {
      return null;
    }

    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: any = {};
    const newValidationErrors: any = {};
    const required = schema?.required || [];

    for (const field of required) {
      if (!formData[field] && formData[field] !== false && formData[field] !== 0) {
        newErrors[field] = "This field is required";
      }
    }

    if (schema?.properties) {
      Object.entries(schema.properties).forEach(([fieldName, fieldSchema]: [string, any]) => {
        const value = formData[fieldName];
        const validationError = validateField(fieldName, value, fieldSchema);
        if (validationError) {
          newValidationErrors[fieldName] = validationError;
        }
      });
    }

    const allErrors = { ...newErrors, ...newValidationErrors };
    if (Object.keys(allErrors).length > 0) {
      setErrors(newErrors);
      setValidationErrors(newValidationErrors);
      return;
    }

    setErrors({});
    setValidationErrors({});
    
    // Clean up form data for submission
    const dataToSubmit = { ...formData };
    
    // For array fields that are empty, check if they should be null based on schema defaults
    if (schema?.properties) {
      Object.entries(schema.properties).forEach(([fieldName, fieldSchema]: [string, any]) => {
        const actualSchema = extractActualSchema(fieldSchema);
        if (actualSchema.type === 'array') {
          if (Array.isArray(dataToSubmit[fieldName]) && dataToSubmit[fieldName].length === 0) {
            // If default is null and field is empty array, send null
            if (fieldSchema.default === null) {
              dataToSubmit[fieldName] = null;
            }
          }
        }
      });
    }
    
    onSubmit(dataToSubmit);
  };

  const updateField = (fieldName: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
    
    if (errors[fieldName]) {
      setErrors(prev => ({ ...prev, [fieldName]: undefined }));
    }
    
    if (schema?.properties?.[fieldName]) {
      const validationError = validateField(fieldName, value, schema.properties[fieldName]);
      setValidationErrors(prev => ({
        ...prev,
        [fieldName]: validationError || undefined
      }));
    }
  };

  // Extract the actual schema from anyOf patterns (e.g., [{type: "string"}, {type: "null"}])
  const extractActualSchema = (fieldSchema: any): any => {
    if (!fieldSchema) return fieldSchema;
    
    // Handle anyOf with nullable types (common pattern from Python/Pydantic)
    if (fieldSchema.anyOf && Array.isArray(fieldSchema.anyOf)) {
      // Find the non-null type
      const nonNullSchema = fieldSchema.anyOf.find((s: any) => s.type !== "null");
      if (nonNullSchema) {
        // Merge the non-null schema with other properties from the parent
        return {
          ...fieldSchema,
          ...nonNullSchema,
          anyOf: undefined // Remove anyOf to avoid recursion
        };
      }
    }
    
    return fieldSchema;
  };

  const getTypeDisplay = (fieldSchema: any): string => {
    if (!fieldSchema) return "";
    
    // Handle anyOf with nullable types
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
    
    if (type === "object") {
      return "object";
    }
    
    return type || "";
  };

  const renderListInput = (fieldName: string, fieldSchema: any) => {
    // Initialize as empty array if field is null/undefined
    const currentValue = formData[fieldName];
    const items = Array.isArray(currentValue) ? currentValue : (currentValue === null || currentValue === undefined ? [] : [currentValue]);
    const itemType = fieldSchema.items?.type || "string";

    const addItem = () => {
      const newItem = itemType === "number" || itemType === "integer" ? 0 : "";
      const newItems = Array.isArray(formData[fieldName]) ? [...formData[fieldName], newItem] : [newItem];
      updateField(fieldName, newItems);
    };

    const removeItem = (index: number) => {
      updateField(fieldName, items.filter((_, i) => i !== index));
    };

    const updateItem = (index: number, value: any) => {
      const updated = [...items];
      if (itemType === "number" || itemType === "integer") {
        updated[index] = isNaN(Number(value)) ? value : Number(value);
      } else {
        updated[index] = value;
      }
      updateField(fieldName, updated);
    };

    return (
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className="flex gap-2">
            <Input
              type={itemType === "number" || itemType === "integer" ? "number" : "text"}
              value={item}
              onChange={(e) => updateItem(index, e.target.value)}
              placeholder={
                itemType === "number" ? "Enter a number" :
                itemType === "integer" ? "Enter an integer" :
                "Enter a string"
              }
              disabled={disabled}
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => removeItem(index)}
              disabled={disabled}
            >
              Remove
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addItem}
          disabled={disabled}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>
      </div>
    );
  };

  const renderComplexInput = (fieldName: string, fieldSchema: any, isArray: boolean) => {
    const value = formData[fieldName];
    const displayValue = value ? JSON.stringify(value, null, 2) : "";
    const [localValue, setLocalValue] = useState(displayValue);
    const [parseError, setParseError] = useState<string | null>(null);

    const handleComplexChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const text = e.target.value;
      setLocalValue(text);
      
      if (!text) {
        updateField(fieldName, undefined);
        setParseError(null);
        return;
      }

      try {
        const parsed = JSON.parse(text);
        updateField(fieldName, parsed);
        setParseError(null);
      } catch (e) {
        setParseError("Invalid JSON format");
        updateField(fieldName, text);
      }
    };

    return (
      <div className="space-y-2">
        <Textarea
          value={localValue}
          onChange={handleComplexChange}
          placeholder={`Enter JSON${schema?.required?.includes(fieldName) ? '' : ' (optional)'}`}
          disabled={disabled}
          className="min-h-[100px] font-mono text-sm"
        />
        {parseError && (
          <div className="flex items-center gap-2 text-xs text-amber-600">
            <AlertCircle className="h-3 w-3" />
            {parseError}
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Enter as JSON (e.g., {isArray ? '["item1", "item2"]' : '{"key": "value"}'})
        </p>
      </div>
    );
  };

  const renderField = (fieldName: string, originalFieldSchema: any) => {
    // Extract the actual schema from anyOf patterns
    const fieldSchema = extractActualSchema(originalFieldSchema);
    
    const fieldType = fieldSchema.type;
    const description = fieldSchema.description || originalFieldSchema.description;
    const enumValues = fieldSchema.enum;
    const required = schema?.required?.includes(fieldName) || false;
    const typeDisplay = getTypeDisplay(originalFieldSchema);
    const error = errors[fieldName] || validationErrors[fieldName];

    return (
      <div key={fieldName} className="space-y-2">
        <div className="flex items-center gap-2">
          <Label htmlFor={fieldName}>
            {fieldName}
            {required && <span className="text-red-500 ml-1">*</span>}
          </Label>
          {typeDisplay && (
            <span className="px-2 py-0.5 text-xs bg-muted rounded-full text-muted-foreground">
              {typeDisplay}
            </span>
          )}
        </div>

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
            placeholder={`Enter text${required ? '' : ' (optional)'}`}
            disabled={disabled}
            className="min-h-[100px]"
          />
        ) : fieldType === "number" || fieldType === "integer" ? (
          <Input
            id={fieldName}
            type="number"
            value={formData[fieldName] || ""}
            onChange={(e) => updateField(fieldName, e.target.valueAsNumber || e.target.value)}
            placeholder={`Enter ${fieldType === "integer" ? "an integer" : "a number"}${required ? '' : ' (optional)'}`}
            disabled={disabled}
            min={fieldSchema.minimum}
            max={fieldSchema.maximum}
          />
        ) : fieldType === "array" && (fieldSchema.items?.type === "string" || fieldSchema.items?.type === "number" || fieldSchema.items?.type === "integer") ? (
          renderListInput(fieldName, fieldSchema)
        ) : fieldType === "array" || fieldType === "object" ? (
          renderComplexInput(fieldName, fieldSchema, fieldType === "array")
        ) : (
          <Input
            id={fieldName}
            type="text"
            value={formData[fieldName] || ""}
            onChange={(e) => updateField(fieldName, e.target.value)}
            placeholder={`Enter a string${required ? '' : ' (optional)'}`}
            disabled={disabled}
          />
        )}

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-500">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
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

  // Check if form is valid
  const isFormValid = () => {
    const required = schema?.required || [];
    
    // Check required fields
    for (const field of required) {
      if (!formData[field] && formData[field] !== false && formData[field] !== 0) {
        return false;
      }
    }
    
    // Check for validation errors
    if (Object.keys(validationErrors).some(key => validationErrors[key])) {
      return false;
    }
    
    return true;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Play className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Parameters</h2>
        </div>
        <Button 
          onClick={handleSubmit} 
          disabled={disabled || !isFormValid()} 
          variant="secondary"
          size="sm"
        >
          Execute
        </Button>
      </div>
      
      {error && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-lg border border-destructive/20">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {Object.entries(schema.properties).map(([fieldName, fieldSchema]: [string, any]) =>
          renderField(fieldName, fieldSchema)
        )}
      </form>
    </div>
  );
};
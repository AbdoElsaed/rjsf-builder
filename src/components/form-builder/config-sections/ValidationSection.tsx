import { ShieldCheck } from "lucide-react";
import type { SchemaNodeType } from "@/lib/graph/schema-graph";
import {
  StringFieldConfig,
  NumberFieldConfig,
  ArrayFieldConfig,
  ObjectFieldConfig,
  EnumFieldConfig,
} from "../field-configs";

interface ValidationSectionProps {
  fieldType: SchemaNodeType;
  config: Record<string, unknown>; // Flexible config object for all field types
  onChange: (key: string, value: unknown) => void;
  onUiChange: (key: string, value: unknown) => void;
}

export function ValidationSection({
  fieldType,
  config,
  onChange,
  onUiChange,
}: ValidationSectionProps) {
  // Render type-specific validation config
  const renderValidationConfig = () => {
    switch (fieldType) {
      case 'string':
        return (
          <StringFieldConfig
            config={config}
            onChange={onChange}
            onUiChange={onUiChange}
          />
        );
      case 'number':
        return (
          <NumberFieldConfig
            config={config}
            onChange={onChange}
            onUiChange={onUiChange}
          />
        );
      case 'array':
        return (
          <ArrayFieldConfig
            config={config}
            onChange={onChange}
            onUiChange={onUiChange}
          />
        );
      case 'object':
        return (
          <ObjectFieldConfig
            config={config}
            onChange={onChange}
          />
        );
      case 'enum':
        // Type assertion needed due to flexible config type
        return (
          <EnumFieldConfig
            config={config as unknown as import("@/lib/schema/json-schema-properties").EnumSchemaProperties & { ui?: import("@/lib/schema/json-schema-properties").EnumUiSchema }}
            onChange={onChange}
            onUiChange={onUiChange}
          />
        );
      default:
        return null;
    }
  };

  const validationConfig = renderValidationConfig();
  
  if (!validationConfig) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Section Header */}
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <ShieldCheck className="h-4 w-4" />
        <span>Validation Rules</span>
      </div>

      {validationConfig}
    </div>
  );
}


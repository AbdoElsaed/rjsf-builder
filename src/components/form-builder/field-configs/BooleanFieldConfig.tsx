import { WidgetSelector } from "../widget-selector";
import type { BooleanUiSchema } from "@/lib/schema/json-schema-properties";

interface BooleanFieldConfigProps {
  config: { ui?: BooleanUiSchema };
  onUiChange: (key: string, value: unknown) => void;
}

export function BooleanFieldConfig({ config, onUiChange }: BooleanFieldConfigProps) {
  return (
    <div className="space-y-3">
      {/* Widget Selection */}
      <WidgetSelector
        fieldType="boolean"
        value={config.ui?.['ui:widget']}
        onValueChange={(value) => onUiChange('ui:widget', value)}
        className="space-y-1.5"
      />
      
      <div className="text-xs text-muted-foreground p-2 bg-muted/50 rounded">
        Boolean fields have no additional validation properties beyond the widget type.
      </div>
    </div>
  );
}


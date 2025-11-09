import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { WidgetSelector } from "../widget-selector";
import type { NumberSchemaProperties, NumberUiSchema } from "@/lib/schema/json-schema-properties";

interface NumberFieldConfigProps {
  config: NumberSchemaProperties & { ui?: NumberUiSchema };
  onChange: (key: string, value: unknown) => void;
  onUiChange: (key: string, value: unknown) => void;
}

export function NumberFieldConfig({ config, onChange, onUiChange }: NumberFieldConfigProps) {
  return (
    <div className="space-y-3">
      {/* Widget Selection */}
      <WidgetSelector
        fieldType="number"
        value={config.ui?.['ui:widget']}
        onValueChange={(value) => onUiChange('ui:widget', value)}
        className="space-y-1.5"
      />

      {/* Range Validation - Inclusive */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold">Range (Inclusive)</Label>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Minimum (≥)</Label>
            <Input
              type="number"
              step="any"
              value={config.minimum ?? ''}
              onChange={(e) => onChange('minimum', e.target.value ? parseFloat(e.target.value) : undefined)}
              className="h-8 text-sm"
              placeholder="No minimum"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Maximum (≤)</Label>
            <Input
              type="number"
              step="any"
              value={config.maximum ?? ''}
              onChange={(e) => onChange('maximum', e.target.value ? parseFloat(e.target.value) : undefined)}
              className="h-8 text-sm"
              placeholder="No maximum"
            />
          </div>
        </div>
      </div>

      {/* Range Validation - Exclusive */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold">Range (Exclusive)</Label>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Exclusive Min (&gt;)</Label>
            <Input
              type="number"
              step="any"
              value={config.exclusiveMinimum ?? ''}
              onChange={(e) => onChange('exclusiveMinimum', e.target.value ? parseFloat(e.target.value) : undefined)}
              className="h-8 text-sm"
              placeholder="No exclusive min"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Exclusive Max (&lt;)</Label>
            <Input
              type="number"
              step="any"
              value={config.exclusiveMaximum ?? ''}
              onChange={(e) => onChange('exclusiveMaximum', e.target.value ? parseFloat(e.target.value) : undefined)}
              className="h-8 text-sm"
              placeholder="No exclusive max"
            />
          </div>
        </div>
      </div>

      {/* Multiple Of */}
      <div className="space-y-1.5">
        <Label className="text-xs">Multiple Of</Label>
        <Input
          type="number"
          step="any"
          min="0"
          value={config.multipleOf ?? ''}
          onChange={(e) => onChange('multipleOf', e.target.value ? parseFloat(e.target.value) : undefined)}
          placeholder="e.g., 0.01 for cents, 5 for increments of 5"
          className="h-8 text-sm"
        />
        <p className="text-[10px] text-muted-foreground">
          The value must be a multiple of this number
        </p>
      </div>
    </div>
  );
}


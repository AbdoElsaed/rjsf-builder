import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WidgetSelector } from "../widget-selector";
import type { StringSchemaProperties, StringUiSchema } from "@/lib/schema/json-schema-properties";

interface StringFieldConfigProps {
  config: StringSchemaProperties & { ui?: StringUiSchema };
  onChange: (key: string, value: unknown) => void;
  onUiChange: (key: string, value: unknown) => void;
}

const STRING_FORMATS = [
  { value: 'none', label: 'None' },
  { value: 'email', label: 'Email' },
  { value: 'uri', label: 'URI' },
  { value: 'date', label: 'Date' },
  { value: 'date-time', label: 'Date-Time' },
  { value: 'time', label: 'Time' },
  { value: 'hostname', label: 'Hostname' },
  { value: 'ipv4', label: 'IPv4' },
  { value: 'ipv6', label: 'IPv6' },
  { value: 'uuid', label: 'UUID' },
  { value: 'regex', label: 'Regular Expression' },
] as const;

export function StringFieldConfig({ config, onChange, onUiChange }: StringFieldConfigProps) {
  return (
    <div className="space-y-3">
      {/* Format and Widget */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label className="text-xs">Format</Label>
          <Select
            value={config.format || 'none'}
            onValueChange={(value) => onChange('format', value === 'none' ? undefined : value)}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Select format" />
            </SelectTrigger>
            <SelectContent>
              {STRING_FORMATS.map((fmt) => (
                <SelectItem key={fmt.value} value={fmt.value}>
                  {fmt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <WidgetSelector
          fieldType="string"
          value={config.ui?.['ui:widget']}
          onValueChange={(value) => onUiChange('ui:widget', value)}
          className="space-y-1.5"
        />
      </div>

      {/* Length Validation */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label className="text-xs">Min Length</Label>
          <Input
            type="number"
            min="0"
            value={config.minLength ?? ''}
            onChange={(e) => onChange('minLength', e.target.value ? parseInt(e.target.value) : undefined)}
            className="h-8 text-sm"
            placeholder="No minimum"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Max Length</Label>
          <Input
            type="number"
            min="0"
            value={config.maxLength ?? ''}
            onChange={(e) => onChange('maxLength', e.target.value ? parseInt(e.target.value) : undefined)}
            className="h-8 text-sm"
            placeholder="No maximum"
          />
        </div>
      </div>

      {/* Pattern Validation */}
      <div className="space-y-1.5">
        <Label className="text-xs">Pattern (Regular Expression)</Label>
        <Input
          value={config.pattern ?? ''}
          onChange={(e) => onChange('pattern', e.target.value || undefined)}
          placeholder="e.g., ^[A-Z][a-z]+$"
          className="h-8 text-sm font-mono"
        />
      </div>

      {/* Placeholder */}
      <div className="space-y-1.5">
        <Label className="text-xs">Placeholder Text</Label>
        <Input
          value={config.ui?.['ui:placeholder'] ?? ''}
          onChange={(e) => onUiChange('ui:placeholder', e.target.value || undefined)}
          placeholder="Enter placeholder text..."
          className="h-8 text-sm"
        />
      </div>
    </div>
  );
}


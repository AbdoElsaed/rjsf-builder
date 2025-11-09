import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, Plus } from "lucide-react";
import { WidgetSelector } from "../widget-selector";
import type { EnumSchemaProperties, EnumUiSchema } from "@/lib/schema/json-schema-properties";

interface EnumFieldConfigProps {
  config: EnumSchemaProperties & { ui?: EnumUiSchema };
  onChange: (key: string, value: unknown) => void;
  onUiChange: (key: string, value: unknown) => void;
}

export function EnumFieldConfig({ config, onChange, onUiChange }: EnumFieldConfigProps) {
  const enumValues = config.enum || [];
  const enumNames = config.enumNames || [];

  const handleAddOption = () => {
    const newValue = `option_${enumValues.length + 1}`;
    onChange('enum', [...enumValues, newValue]);
    onChange('enumNames', [...enumNames, newValue]);
  };

  const handleRemoveOption = (index: number) => {
    const newValues = enumValues.filter((_, i) => i !== index);
    const newNames = enumNames.filter((_, i) => i !== index);
    onChange('enum', newValues.length > 0 ? newValues : []);
    onChange('enumNames', newNames.length > 0 ? newNames : undefined);
  };

  const handleValueChange = (index: number, value: string) => {
    const newValues = [...enumValues];
    newValues[index] = value;
    onChange('enum', newValues);
  };

  const handleNameChange = (index: number, name: string) => {
    const newNames = [...enumNames];
    // Ensure enumNames array is at least as long as enum values
    while (newNames.length < enumValues.length) {
      newNames.push('');
    }
    newNames[index] = name;
    onChange('enumNames', newNames);
  };

  return (
    <div className="space-y-3">
      {/* Widget Selection */}
      <WidgetSelector
        fieldType="enum"
        value={config.ui?.['ui:widget']}
        onValueChange={(value) => onUiChange('ui:widget', value)}
        className="space-y-1.5"
      />

      {/* Enum Options */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold">Options</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddOption}
            className="h-6 text-xs"
          >
            <Plus className="w-3 h-3 mr-1" />
            Add Option
          </Button>
        </div>

        {enumValues.length === 0 ? (
          <div className="text-xs text-muted-foreground p-3 border border-dashed rounded text-center">
            No options yet. Click "Add Option" to get started.
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {enumValues.map((value, index) => (
              <div key={index} className="grid grid-cols-[1fr,1fr,auto] gap-2 items-start">
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Value</Label>
                  <Input
                    value={String(value)}
                    onChange={(e) => handleValueChange(index, e.target.value)}
                    placeholder="value"
                    className="h-7 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Display Name</Label>
                  <Input
                    value={enumNames[index] || ''}
                    onChange={(e) => handleNameChange(index, e.target.value)}
                    placeholder="Display name"
                    className="h-7 text-xs"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveOption(index)}
                  className="h-7 w-7 p-0 mt-[18px]"
                  title="Remove option"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="text-[10px] text-muted-foreground bg-muted/50 p-2 rounded">
          <strong>Note:</strong> The "Value" is stored in the form data. The "Display Name" is shown to users.
          If no display name is provided, the value will be shown.
        </div>
      </div>
    </div>
  );
}


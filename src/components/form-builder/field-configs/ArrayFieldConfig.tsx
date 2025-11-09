import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { ArraySchemaProperties, ArrayUiSchema } from "@/lib/schema/json-schema-properties";

interface ArrayFieldConfigProps {
  config: ArraySchemaProperties & { ui?: ArrayUiSchema };
  onChange: (key: string, value: unknown) => void;
  onUiChange: (key: string, value: unknown) => void;
}

export function ArrayFieldConfig({ config, onChange, onUiChange }: ArrayFieldConfigProps) {
  const uiOptions = config.ui?.['ui:options'] || {};
  
  const handleUiOptionChange = (key: string, value: boolean | string | undefined) => {
    onUiChange('ui:options', {
      ...uiOptions,
      [key]: value,
    });
  };

  return (
    <div className="space-y-3">
      {/* Items Count Validation */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold">Items Count</Label>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Min Items</Label>
            <Input
              type="number"
              min="0"
              value={config.minItems ?? ''}
              onChange={(e) => onChange('minItems', e.target.value ? parseInt(e.target.value) : undefined)}
              className="h-8 text-sm"
              placeholder="No minimum"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Max Items</Label>
            <Input
              type="number"
              min="0"
              value={config.maxItems ?? ''}
              onChange={(e) => onChange('maxItems', e.target.value ? parseInt(e.target.value) : undefined)}
              className="h-8 text-sm"
              placeholder="No maximum"
            />
          </div>
        </div>
      </div>

      {/* Uniqueness Validation */}
      <div className="flex items-center justify-between p-2 border rounded">
        <div>
          <Label htmlFor="uniqueItems" className="text-xs font-medium cursor-pointer">
            Unique Items
          </Label>
          <p className="text-[10px] text-muted-foreground">
            All items in the array must be unique
          </p>
        </div>
        <Switch
          id="uniqueItems"
          checked={config.uniqueItems || false}
          onCheckedChange={(checked) => onChange('uniqueItems', checked)}
        />
      </div>

      {/* UI Options */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold">UI Options</Label>
        
        <div className="grid grid-cols-2 gap-2">
          {/* Addable */}
          <div className="flex items-center justify-between p-2 border rounded">
            <Label htmlFor="addable" className="text-xs cursor-pointer">
              Addable
            </Label>
            <Switch
              id="addable"
              checked={uiOptions.addable !== false}
              onCheckedChange={(checked) => handleUiOptionChange('addable', checked)}
            />
          </div>

          {/* Removable */}
          <div className="flex items-center justify-between p-2 border rounded">
            <Label htmlFor="removable" className="text-xs cursor-pointer">
              Removable
            </Label>
            <Switch
              id="removable"
              checked={uiOptions.removable !== false}
              onCheckedChange={(checked) => handleUiOptionChange('removable', checked)}
            />
          </div>

          {/* Orderable */}
          <div className="flex items-center justify-between p-2 border rounded">
            <Label htmlFor="orderable" className="text-xs cursor-pointer">
              Orderable
            </Label>
            <Switch
              id="orderable"
              checked={uiOptions.orderable !== false}
              onCheckedChange={(checked) => handleUiOptionChange('orderable', checked)}
            />
          </div>

          {/* Copyable */}
          <div className="flex items-center justify-between p-2 border rounded">
            <Label htmlFor="copyable" className="text-xs cursor-pointer">
              Copyable
            </Label>
            <Switch
              id="copyable"
              checked={uiOptions.copyable === true}
              onCheckedChange={(checked) => handleUiOptionChange('copyable', checked)}
            />
          </div>
        </div>
      </div>

      {/* Custom Add Button Text */}
      <div className="space-y-1.5">
        <Label className="text-xs">Add Button Text</Label>
        <Input
          value={typeof uiOptions.addButtonText === 'string' ? uiOptions.addButtonText : ''}
          onChange={(e) => handleUiOptionChange('addButtonText', e.target.value || undefined)}
          placeholder="Add Item"
          className="h-8 text-sm"
        />
      </div>
    </div>
  );
}


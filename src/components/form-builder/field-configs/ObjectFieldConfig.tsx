import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { ObjectSchemaProperties, ObjectUiSchema } from "@/lib/schema/json-schema-properties";

interface ObjectFieldConfigProps {
  config: ObjectSchemaProperties & { ui?: ObjectUiSchema };
  onChange: (key: string, value: unknown) => void;
}

export function ObjectFieldConfig({ config, onChange }: ObjectFieldConfigProps) {
  return (
    <div className="space-y-3">
      {/* Property Count Validation */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold">Property Count</Label>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Min Properties</Label>
            <Input
              type="number"
              min="0"
              value={config.minProperties ?? ''}
              onChange={(e) => onChange('minProperties', e.target.value ? parseInt(e.target.value) : undefined)}
              className="h-8 text-sm"
              placeholder="No minimum"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Max Properties</Label>
            <Input
              type="number"
              min="0"
              value={config.maxProperties ?? ''}
              onChange={(e) => onChange('maxProperties', e.target.value ? parseInt(e.target.value) : undefined)}
              className="h-8 text-sm"
              placeholder="No maximum"
            />
          </div>
        </div>
      </div>

      {/* Additional Properties */}
      <div className="flex items-center justify-between p-2 border rounded">
        <div>
          <Label htmlFor="additionalProperties" className="text-xs font-medium cursor-pointer">
            Allow Additional Properties
          </Label>
          <p className="text-[10px] text-muted-foreground">
            Allow properties not defined in the schema
          </p>
        </div>
        <Switch
          id="additionalProperties"
          checked={config.additionalProperties !== false}
          onCheckedChange={(checked) => onChange('additionalProperties', checked)}
        />
      </div>

      <div className="text-xs text-muted-foreground p-2 bg-muted/50 rounded space-y-1">
        <p className="font-medium">Object Structure:</p>
        <p>• Properties are managed through the form builder canvas</p>
        <p>• Drag fields into this object to add properties</p>
        <p>• Use the property order in the canvas for display order</p>
      </div>
    </div>
  );
}


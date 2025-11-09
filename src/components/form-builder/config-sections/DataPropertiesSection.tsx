import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Database } from "lucide-react";
import type { SchemaNodeType } from "@/lib/graph/schema-graph";

interface DataPropertiesSectionProps {
  fieldType: SchemaNodeType;
  required: boolean;
  defaultValue: string | number | boolean | undefined;
  onRequiredChange: (value: boolean) => void;
  onDefaultChange: (value: string | number | boolean | undefined) => void;
}

export function DataPropertiesSection({
  fieldType,
  required,
  defaultValue,
  onRequiredChange,
  onDefaultChange,
}: DataPropertiesSectionProps) {
  return (
    <div className="space-y-3">
      {/* Section Header */}
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Database className="h-4 w-4" />
        <span>Data Properties</span>
      </div>

      {/* Required Toggle */}
      <div className="flex items-center justify-between p-2 rounded border border-border/50 bg-muted/20">
        <div className="flex-1">
          <Label htmlFor="required" className="text-xs font-medium cursor-pointer">
            Required Field
          </Label>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            User must provide a value
          </p>
        </div>
        <Switch
          id="required"
          checked={required}
          onCheckedChange={onRequiredChange}
        />
      </div>

      {/* Default Value */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">Default Value</Label>
        
        {fieldType === 'boolean' ? (
          <Select
            value={defaultValue === undefined ? '__none__' : String(defaultValue)}
            onValueChange={(value) => 
              onDefaultChange(value === '__none__' ? undefined : value === 'true')
            }
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="No default" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">No default</SelectItem>
              <SelectItem value="true">True</SelectItem>
              <SelectItem value="false">False</SelectItem>
            </SelectContent>
          </Select>
        ) : fieldType === 'number' ? (
          <Input
            type="number"
            value={defaultValue === undefined ? '' : String(defaultValue)}
            onChange={(e) => 
              onDefaultChange(e.target.value === '' ? undefined : e.target.value)
            }
            placeholder="Enter default number"
            className="h-8 text-sm"
          />
        ) : (
          <Input
            value={defaultValue === undefined ? '' : String(defaultValue)}
            onChange={(e) => 
              onDefaultChange(e.target.value === '' ? undefined : e.target.value)
            }
            placeholder="Enter default value"
            className="h-8 text-sm"
          />
        )}
        
        <p className="text-[10px] text-muted-foreground">
          Pre-filled value when the form loads
        </p>
      </div>
    </div>
  );
}


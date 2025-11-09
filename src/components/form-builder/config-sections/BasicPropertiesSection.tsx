import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Settings2 } from "lucide-react";
import type { SchemaNodeType } from "@/lib/graph/schema-graph";
import { shouldShowProperty } from "@/lib/config/field-property-config";

interface BasicPropertiesSectionProps {
  fieldType: SchemaNodeType;
  title: string;
  description: string;
  fieldKey: string;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onKeyChange: (value: string) => void;
  keyWasManuallyEdited: boolean;
  setKeyWasManuallyEdited: (value: boolean) => void;
}

export function BasicPropertiesSection({
  fieldType,
  title,
  description,
  fieldKey,
  onTitleChange,
  onDescriptionChange,
  onKeyChange,
  keyWasManuallyEdited,
  setKeyWasManuallyEdited,
}: BasicPropertiesSectionProps) {
  const showKey = shouldShowProperty(fieldType, 'key');

  return (
    <div className="space-y-3">
      {/* Section Header */}
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Settings2 className="h-4 w-4" />
        <span>Basic Properties</span>
      </div>

      {/* Title */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">
          Title <span className="text-destructive">*</span>
        </Label>
        <Input
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Enter field title"
          className="h-8 text-sm"
        />
        <p className="text-[10px] text-muted-foreground">
          Displayed as the field label in the form
        </p>
      </div>

      {/* Key - Only show for data fields and containers */}
      {showKey && (
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">
            Key <span className="text-destructive">*</span>
          </Label>
          <Input
            value={fieldKey}
            onChange={(e) => {
              setKeyWasManuallyEdited(true);
              onKeyChange(e.target.value);
            }}
            placeholder="field_key"
            className="h-8 text-sm font-mono"
          />
          <p className="text-[10px] text-muted-foreground">
            {keyWasManuallyEdited 
              ? 'Unique identifier (manually edited)'
              : 'Auto-generated from title (edit to customize)'}
          </p>
        </div>
      )}

      {/* Description */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">Description</Label>
        <Input
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="Optional field description"
          className="h-8 text-sm"
        />
        <p className="text-[10px] text-muted-foreground">
          Help text shown below the field
        </p>
      </div>
    </div>
  );
}


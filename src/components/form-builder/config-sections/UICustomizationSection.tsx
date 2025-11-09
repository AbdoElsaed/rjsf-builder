import { Palette } from "lucide-react";
import { WidgetSelector } from "../widget-selector";
import type { SchemaNodeType } from "@/lib/graph/schema-graph";
import { shouldShowProperty } from "@/lib/config/field-property-config";

interface UICustomizationSectionProps {
  fieldType: SchemaNodeType;
  widget?: string;
  onWidgetChange: (value: string | undefined) => void;
}

export function UICustomizationSection({
  fieldType,
  widget,
  onWidgetChange,
}: UICustomizationSectionProps) {
  const showWidget = shouldShowProperty(fieldType, 'widget');

  if (!showWidget) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Section Header */}
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Palette className="h-4 w-4" />
        <span>Display Options</span>
      </div>

      {/* Widget Selector */}
      <WidgetSelector
        fieldType={fieldType as unknown as import("@/lib/store/schema-graph").JSONSchemaType}
        value={widget}
        onValueChange={onWidgetChange}
        className="space-y-1.5"
      />
    </div>
  );
}


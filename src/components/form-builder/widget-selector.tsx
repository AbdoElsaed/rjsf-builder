import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { getWidgetRegistry } from "@/lib/widgets/widget-registry";
import type { JSONSchemaType } from "@/lib/store/schema-graph";

interface WidgetSelectorProps {
  fieldType: JSONSchemaType;
  value?: string;
  onValueChange: (widgetId: string) => void;
  className?: string;
}

export function WidgetSelector({
  fieldType,
  value,
  onValueChange,
  className,
}: WidgetSelectorProps) {
  const widgetRegistry = getWidgetRegistry();
  const compatibleWidgets = widgetRegistry.getCompatibleWidgets(fieldType);

  if (compatibleWidgets.length === 0) {
    return (
      <div className={className}>
        <Label className="text-xs">Widget</Label>
        <div className="text-xs text-muted-foreground mt-1">
          No widgets available for this field type
        </div>
      </div>
    );
  }

  // Group widgets by category
  const standardWidgets = compatibleWidgets.filter((w) => w.category === 'standard');
  const specializedWidgets = compatibleWidgets.filter((w) => w.category === 'specialized');
  const customWidgets = compatibleWidgets.filter((w) => w.category === 'custom');

  return (
    <div className={className}>
      <Label className="text-xs">Widget</Label>
      <Select value={value || ''} onValueChange={onValueChange}>
        <SelectTrigger className="h-7 text-sm">
          <SelectValue placeholder="Select widget" />
        </SelectTrigger>
        <SelectContent>
          {standardWidgets.length > 0 && (
            <>
              {standardWidgets.map((widget) => (
                <SelectItem key={widget.id} value={widget.id}>
                  {widget.displayName}
                </SelectItem>
              ))}
              {(specializedWidgets.length > 0 || customWidgets.length > 0) && (
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                  ──────────
                </div>
              )}
            </>
          )}
          {specializedWidgets.length > 0 && (
            <>
              {specializedWidgets.map((widget) => (
                <SelectItem key={widget.id} value={widget.id}>
                  {widget.displayName}
                  {widget.description && (
                    <span className="text-xs text-muted-foreground ml-2">
                      - {widget.description}
                    </span>
                  )}
                </SelectItem>
              ))}
              {customWidgets.length > 0 && (
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                  ──────────
                </div>
              )}
            </>
          )}
          {customWidgets.length > 0 && (
            <>
              {customWidgets.map((widget) => (
                <SelectItem key={widget.id} value={widget.id}>
                  {widget.displayName}
                </SelectItem>
              ))}
            </>
          )}
        </SelectContent>
      </Select>
      {value && (
        <div className="mt-1 text-xs text-muted-foreground">
          {widgetRegistry.getWidget(value)?.description}
        </div>
      )}
    </div>
  );
}


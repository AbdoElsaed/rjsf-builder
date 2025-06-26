import { useDraggable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { Type, TextQuote, ToggleLeft, Hash, Layers } from "lucide-react";

interface FieldTypeItem {
  id: string;
  type: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

const FIELD_TYPES: FieldTypeItem[] = [
  {
    id: "text-field",
    type: "string",
    icon: TextQuote,
    label: "Text",
  },
  {
    id: "number-field",
    type: "number",
    icon: Hash,
    label: "Number",
  },
  {
    id: "boolean-field",
    type: "boolean",
    icon: ToggleLeft,
    label: "Yes/No",
  },
  {
    id: "object-field",
    type: "object",
    icon: Type,
    label: "Object",
  },
  {
    id: "array-field",
    type: "array",
    icon: Layers,
    label: "List",
  },
];

function DraggableFieldType({ item }: { item: FieldTypeItem }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: item.id,
    data: {
      type: item.type,
      label: item.label,
    },
  });

  const Icon = item.icon;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        "cursor-grab touch-none",
        isDragging && "cursor-grabbing opacity-50"
      )}
    >
      <div className="group rounded-md border bg-background px-3 py-2 hover:bg-accent hover:text-accent-foreground">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground group-hover:text-current" />
          <span className="text-sm font-medium">{item.label}</span>
        </div>
      </div>
    </div>
  );
}

export function FieldPalette() {
  return (
    <div className="p-2 space-y-1">
      {FIELD_TYPES.map((item) => (
        <DraggableFieldType key={item.id} item={item} />
      ))}
    </div>
  );
}

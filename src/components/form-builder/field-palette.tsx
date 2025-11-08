import { useDraggable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import {
  Type,
  TextQuote,
  ToggleLeft,
  Hash,
  Layers,
  GitBranch,
} from "lucide-react";

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
  {
    id: "if-block",
    type: "if_block",
    icon: GitBranch,
    label: "If-Then-Else",
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
      <div className="group rounded-lg border border-border/50 bg-card px-4 py-3.5 hover:bg-accent hover:text-accent-foreground hover:border-accent-foreground/20 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
        <div className="flex items-center gap-3">
          <Icon className="h-5 w-5 text-muted-foreground group-hover:text-current transition-colors duration-200" />
          <span className="text-sm font-medium">{item.label}</span>
        </div>
      </div>
    </div>
  );
}

export function FieldPalette() {
  return (
    <div className="space-y-2.5">
      {FIELD_TYPES.map((item) => (
        <DraggableFieldType key={item.id} item={item} />
      ))}
    </div>
  );
}

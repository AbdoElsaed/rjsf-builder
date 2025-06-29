import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import {
  Type,
  TextQuote,
  ToggleLeft,
  Hash,
  List,
  Layers,
  GripVertical,
  Pencil,
  X,
} from "lucide-react";
import { useState } from "react";
import { useSchemaGraphStore } from "@/lib/store/schema-graph";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { SortableContext } from "@dnd-kit/sortable";
import { verticalListSortingStrategy } from "@dnd-kit/sortable";
import { FieldConfigPanel } from "./field-config-panel";
import { Button } from "@/components/ui/button";

const FIELD_ICONS = {
  string: TextQuote,
  number: Hash,
  boolean: ToggleLeft,
  enum: List,
  object: Type,
  array: Layers,
} as const;

interface DraggedItem {
  type: string;
  label?: string;
  nodeId?: string;
  parentId?: string;
}

interface FormNodeProps {
  nodeId: string;
  selectedNodeId: string | null;
  onSelect: (nodeId: string | null) => void;
  isDragging?: boolean;
  draggedItem?: DraggedItem | null;
  activeDropZone?: string | null;
}

export function FormNode({
  nodeId,
  selectedNodeId,
  onSelect,
  isDragging: globalIsDragging = false,
  draggedItem = null,
  activeDropZone = null,
}: FormNodeProps) {
  const { graph, removeNode } = useSchemaGraphStore();
  const [isEditing, setIsEditing] = useState(false);
  const node = graph.nodes[nodeId];

  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: nodeId,
    data: {
      type: "node",
      nodeId,
      parentId: node.parentId,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const Icon = FIELD_ICONS[node.type as keyof typeof FIELD_ICONS];

  const { isOver, setNodeRef: setDroppableRef } = useDroppable({
    id: nodeId,
    data: {
      type: "node",
      nodeId,
      accepts: node.type === "array" ? ["*"] : ["node"],
    },
  });

  const setRefs = (element: HTMLElement | null) => {
    setNodeRef(element);
    setDroppableRef(element);
  };

  const canDrop =
    draggedItem &&
    (() => {
      const { engine, graph } = useSchemaGraphStore.getState();
      return engine.canDropIntoParent(
        graph,
        draggedItem.type,
        node.type,
        nodeId
      );
    })();

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    removeNode(nodeId);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    onSelect(nodeId);
  };

  const baseClasses = cn(
    "group relative rounded-lg border bg-card shadow-sm transition-all duration-200",
    isDragging && "opacity-50",
    // Enhanced visual feedback for droppable nodes
    globalIsDragging &&
      (node.type === "object" || node.type === "array") &&
      canDrop &&
      "border-primary/50 bg-primary/5",
    globalIsDragging &&
      (node.type === "object" || node.type === "array") &&
      !canDrop &&
      "border-destructive/30 opacity-60",
    // Active drop zone highlighting
    activeDropZone === nodeId &&
      canDrop &&
      "ring-2 ring-primary/40 bg-primary/10",
    activeDropZone === nodeId &&
      !canDrop &&
      "ring-2 ring-destructive/40 bg-destructive/5",
    // Legacy hover state for non-dragging scenarios
    !globalIsDragging && isOver && "ring-2 ring-primary",
    node.type === "object" && "border-primary/20",
    isEditing && "ring-1 ring-primary/20 bg-muted/50"
  );

  return (
    <div ref={setRefs} style={style} className={baseClasses}>
      <div className="flex items-center gap-2 p-1.5 min-w-0">
        <button
          {...attributes}
          {...listeners}
          className="touch-none flex-shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab active:cursor-grabbing" />
        </button>
        {isEditing ? (
          <div className="flex-1">
            <FieldConfigPanel
              nodeId={nodeId}
              onSave={() => {
                setIsEditing(false);
                onSelect(null);
              }}
              onCancel={() => {
                setIsEditing(false);
                onSelect(null);
              }}
            />
          </div>
        ) : (
          <>
            <div className="flex-1 min-w-0 flex items-center gap-2">
              <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm font-medium truncate">{node.title}</span>
              <span className="text-xs text-muted-foreground truncate">
                ({node.key})
              </span>
              {node.description && (
                <span className="text-xs text-muted-foreground truncate">
                  ({node.description})
                </span>
              )}
              {node.required && (
                <span className="text-xs text-primary flex-shrink-0">*</span>
              )}
            </div>
            <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 flex-shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleEdit}
              >
                <Pencil className="h-3.5 w-3.5" />
                <span className="sr-only">Edit</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-destructive hover:text-destructive"
                onClick={handleDelete}
              >
                <X className="h-3.5 w-3.5" />
                <span className="sr-only">Delete</span>
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Children container for object and array types */}
      {(node.type === "object" || node.type === "array") && (
        <div
          className={cn(
            "mt-0.5 space-y-0.5 border-l-2 ml-4 pl-4 transition-all duration-200",
            // Enhanced visual feedback for child drop zones
            globalIsDragging && canDrop && "border-primary/40",
            globalIsDragging && !canDrop && "border-destructive/30",
            activeDropZone === nodeId &&
              canDrop &&
              !node.children?.length &&
              "min-h-[32px] border border-dashed border-primary/50 rounded-lg bg-primary/5",
            activeDropZone === nodeId &&
              !canDrop &&
              !node.children?.length &&
              "min-h-[32px] border border-dashed border-destructive/50 rounded-lg bg-destructive/5",
            // Legacy hover state
            !globalIsDragging &&
              isOver &&
              !node.children?.length &&
              "min-h-[40px] border border-dashed border-primary/50 rounded-lg",
            // Add bottom padding only when there are children
            node.children?.length ? "pb-0.5" : ""
          )}
        >
          {node.children && node.children.length > 0 ? (
            <SortableContext
              items={node.children}
              strategy={verticalListSortingStrategy}
            >
              {node.children.map((childId) => (
                <FormNode
                  key={childId}
                  nodeId={childId}
                  selectedNodeId={selectedNodeId}
                  onSelect={onSelect}
                  isDragging={globalIsDragging}
                  draggedItem={draggedItem}
                  activeDropZone={activeDropZone}
                />
              ))}
            </SortableContext>
          ) : (
            <div className="flex items-center justify-center h-full text-xs text-muted-foreground py-1.5">
              {globalIsDragging ? (
                canDrop ? (
                  <span className="text-primary font-medium">
                    Drop fields here
                  </span>
                ) : (
                  <span className="text-destructive">
                    Cannot drop this field type here
                  </span>
                )
              ) : (
                "Drop fields here"
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

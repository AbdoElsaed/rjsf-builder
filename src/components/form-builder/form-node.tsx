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
  X,
  GitBranch,
  Settings2,
} from "lucide-react";
import { useState } from "react";
import { useSchemaGraphStore } from "@/lib/store/schema-graph";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { SortableContext } from "@dnd-kit/sortable";
import { verticalListSortingStrategy } from "@dnd-kit/sortable";
import { FieldConfigPanel } from "./field-config-panel";
import { Button } from "@/components/ui/button";
import type { FormNodeProps } from "./types";
import { IfBlock } from "./if-block";

const FIELD_ICONS = {
  string: TextQuote,
  number: Hash,
  boolean: ToggleLeft,
  enum: List,
  object: Type,
  array: Layers,
  if_block: GitBranch,
} as const;

export function FormNode({
  nodeId,
  selectedNodeId,
  onSelect,
  isDragging: globalIsDragging = false,
  draggedItem = null,
  activeDropZone = null,
  onRemove,
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

  const handleDelete = () => {
    if (onRemove) {
      onRemove();
    } else {
      removeNode(nodeId);
    }
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
      "border-primary/50",
    globalIsDragging &&
      (node.type === "object" || node.type === "array") &&
      !canDrop &&
      "border-destructive/30 opacity-60",
    // Active drop zone highlighting
    activeDropZone === nodeId && canDrop && "ring-2 ring-primary bg-primary/10",
    activeDropZone === nodeId &&
      !canDrop &&
      "ring-2 ring-destructive bg-destructive/10",
    // Legacy hover state for non-dragging scenarios
    !globalIsDragging && isOver && "ring-2 ring-primary",
    node.type === "object" && "border-primary/20",
    isEditing && "ring-1 ring-primary/20 bg-muted/50"
  );

  // Add nested drop zone styles
  const nestedDropZoneClasses = cn(
    "mt-0.5 space-y-0.5 transition-all duration-200",
    // Container styles
    "border-l-2 ml-4 pl-4",
    // Enhanced visual feedback for child drop zones
    globalIsDragging && canDrop && "border-primary/40",
    globalIsDragging && !canDrop && "border-destructive/30",
    // Empty state styles
    !node.children?.length &&
      cn(
        "min-h-[32px]",
        activeDropZone === nodeId &&
          canDrop &&
          "border border-dashed border-primary/50 rounded-lg bg-primary/5",
        activeDropZone === nodeId &&
          !canDrop &&
          "border border-dashed border-destructive/50 rounded-lg bg-destructive/5",
        !globalIsDragging &&
          isOver &&
          "border border-dashed border-primary/50 rounded-lg"
      ),
    // Add bottom padding only when there are children
    node.children?.length ? "pb-0.5" : ""
  );

  // Special rendering for IF blocks
  if (node.type === "if_block") {
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
            <IfBlock
              nodeId={nodeId}
              isDragging={globalIsDragging}
              draggedItem={draggedItem || undefined}
              activeDropZone={activeDropZone}
              onRemove={handleDelete}
            />
          )}
        </div>
      </div>
    );
  }

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
          <div className="flex flex-1 items-center gap-2 min-w-0">
            {Icon && (
              <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            )}
            <div className="flex-1 truncate">
              <span className="text-sm font-medium">{node.title}</span>
              {node.key && (
                <span className="ml-1 text-xs text-muted-foreground">
                  ({node.key})
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleEdit}
              >
                <Settings2 className="h-3.5 w-3.5" />
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
          </div>
        )}
      </div>

      {(node.type === "object" || node.type === "array") && (
        <div className={nestedDropZoneClasses}>
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

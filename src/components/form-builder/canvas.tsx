import { useDroppable } from "@dnd-kit/core";
import { useSchemaGraphStore } from "@/lib/store/schema-graph";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FormNode } from "./form-node";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

interface DraggedItem {
  type: string;
  label?: string;
  nodeId?: string;
  parentId?: string;
}

interface CanvasProps {
  selectedNodeId: string | null;
  onNodeSelect: (nodeId: string | null) => void;
  isDragging: boolean;
  draggedItem: DraggedItem | null;
  activeDropZone: string | null;
}

// Helper function to check if a field type can be dropped into a parent
const canDropIntoParent = (childType: string, parentType?: string): boolean => {
  if (!parentType) return true; // Root can accept any field
  if (parentType === "object") return true; // Objects can accept any field
  if (parentType === "array") return true; // Arrays can accept fields (with type consistency handled elsewhere)
  return false; // Other field types cannot accept children
};

export function Canvas({
  selectedNodeId,
  onNodeSelect,
  isDragging,
  draggedItem,
  activeDropZone,
}: CanvasProps) {
  const { graph } = useSchemaGraphStore();
  const { setNodeRef, isOver } = useDroppable({
    id: "root",
    data: {
      type: "root",
      nodeId: "root",
    },
  });

  // Get root level nodes
  const rootNodes = graph.nodes.root?.children || [];

  // Check if the current dragged item can be dropped in root
  const canDropInRoot = draggedItem
    ? canDropIntoParent(draggedItem.type, undefined)
    : false;

  return (
    <ScrollArea className="h-full">
      <div
        ref={setNodeRef}
        className={cn(
          "min-h-[calc(100vh-8rem)] p-4 transition-all duration-200 rounded-lg",
          rootNodes.length === 0 &&
            "border-2 border-dashed border-muted-foreground/30",
          // Enhanced visual feedback during drag
          isDragging &&
            canDropInRoot &&
            "border-2 border-dashed border-primary/50",
          isDragging &&
            !canDropInRoot &&
            "border-2 border-dashed border-destructive/30 opacity-50",
          // Active drop zone highlighting
          activeDropZone === "root" &&
            canDropInRoot &&
            "bg-primary/10 ring-2 ring-primary/30",
          activeDropZone === "root" &&
            !canDropInRoot &&
            "bg-destructive/5 ring-2 ring-destructive/30",
          // Legacy hover state for non-dragging scenarios
          !isDragging && isOver && "bg-accent/20 ring-2 ring-primary/20"
        )}
      >
        {rootNodes.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            {isDragging ? (
              canDropInRoot ? (
                <span className="text-primary font-medium">
                  Drop here to add to root
                </span>
              ) : (
                <span className="text-destructive">
                  Cannot drop this field type here
                </span>
              )
            ) : (
              "Drag and drop fields here to build your form"
            )}
          </div>
        ) : (
          <SortableContext
            items={rootNodes}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {rootNodes.map((nodeId) => (
                <FormNode
                  key={nodeId}
                  nodeId={nodeId}
                  selectedNodeId={selectedNodeId}
                  onSelect={onNodeSelect}
                  isDragging={isDragging}
                  draggedItem={draggedItem}
                  activeDropZone={activeDropZone}
                />
              ))}
            </div>
          </SortableContext>
        )}
      </div>
    </ScrollArea>
  );
}

import { useDroppable } from "@dnd-kit/core";
import { useSchemaGraphStore } from "@/lib/store/schema-graph";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FormNode } from "./form-node";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { getChildren } from "@/lib/graph/schema-graph";
import { useExpandContext } from "./expand-context";
import { Button } from "@/components/ui/button";
import { Maximize2, Minimize2 } from "lucide-react";

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
  dropPreview?: {
    targetId: string;
    relationshipType: 'child' | 'then' | 'else';
    canDrop: boolean;
  } | null;
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
  dropPreview,
}: CanvasProps) {
  const { graph } = useSchemaGraphStore();
  const { triggerExpandAll, triggerCollapseAll } = useExpandContext();
  const { setNodeRef, isOver } = useDroppable({
    id: "root",
    data: {
      type: "root",
      nodeId: "root",
    },
  });

  // Get root level nodes using V2 getChildren
  const rootNodes = getChildren(graph, 'root', 'child').map(n => n.id);
  
  // Handle expand/collapse all - one-time actions
  const handleExpandAll = () => {
    triggerExpandAll();
  };
  
  const handleCollapseAll = () => {
    triggerCollapseAll();
  };

  // Check if the current dragged item can be dropped in root
  const canDropInRoot = draggedItem
    ? canDropIntoParent(draggedItem.type, undefined)
    : false;

  const isRootDropTarget = dropPreview?.targetId === 'root' && dropPreview?.relationshipType === 'child';

  return (
    <ScrollArea className="h-full">
      {/* Expand/Collapse All Controls - Simple & Clean */}
      {rootNodes.length > 0 && (
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm px-6 py-2 flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-muted"
            onClick={handleExpandAll}
            title="Expand all"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-muted"
            onClick={handleCollapseAll}
            title="Collapse all"
          >
            <Minimize2 className="h-4 w-4" />
          </Button>
        </div>
      )}
      <div
        ref={setNodeRef}
        className={cn(
          "min-h-[calc(100vh-8rem)] p-6 transition-all duration-300 rounded-lg relative",
          rootNodes.length === 0 &&
            "border-2 border-dashed border-muted-foreground/20 bg-muted/5",
          // Enhanced visual feedback during drag
          isDragging &&
            canDropInRoot &&
            "border-2 border-dashed border-primary/60 bg-primary/5 shadow-lg shadow-primary/10",
          isDragging &&
            !canDropInRoot &&
            "border-2 border-dashed border-destructive/40 bg-destructive/5 opacity-60",
          // Active drop zone highlighting with pulsing animation
          activeDropZone === "root" &&
            canDropInRoot &&
            "bg-primary/10 ring-4 ring-primary/30 ring-offset-4 ring-offset-background",
          activeDropZone === "root" &&
            !canDropInRoot &&
            "bg-destructive/5 ring-4 ring-destructive/30 ring-offset-4 ring-offset-background",
          // Drop preview indicator
          isRootDropTarget && dropPreview?.canDrop && "animate-pulse",
          // Legacy hover state for non-dragging scenarios
          !isDragging && isOver && "bg-accent/10 ring-2 ring-primary/20"
        )}
      >
        {/* Drop preview indicator line */}
        {isRootDropTarget && rootNodes.length > 0 && dropPreview?.canDrop && (
          <div className="absolute top-6 left-6 right-6 h-1.5 bg-primary rounded-full animate-pulse z-10 shadow-lg shadow-primary/50" />
        )}
        
        {rootNodes.length === 0 ? (
          <div className="flex h-full items-center justify-center min-h-[400px]">
            {isDragging ? (
              <div className={cn(
                "flex flex-col items-center gap-4 p-8 rounded-xl border-2 transition-all duration-300 shadow-lg",
                canDropInRoot 
                  ? "border-primary/60 bg-primary/10 text-primary shadow-primary/20" 
                  : "border-destructive/50 bg-destructive/10 text-destructive shadow-destructive/20"
              )}>
                {canDropInRoot ? (
                  <>
                    <span className="text-4xl animate-bounce">↓</span>
                    <span className="font-semibold text-base">Drop here to add to root</span>
                    <span className="text-xs opacity-80">This will be a top-level field</span>
                  </>
                ) : (
                  <>
                    <span className="text-4xl">✗</span>
                    <span className="font-semibold text-base">Cannot drop this field type here</span>
                    <span className="text-xs opacity-80">This field type is not supported at root level</span>
                  </>
                )}
              </div>
            ) : (
              <div className="text-center space-y-3 max-w-md">
                <div className="text-6xl mb-4 opacity-20">📋</div>
                <p className="text-base text-muted-foreground font-medium">
                  Drag and drop fields here to build your form
                </p>
                <p className="text-sm text-muted-foreground/70">
                  Start by dragging a field from the palette on the left
                </p>
              </div>
            )}
          </div>
        ) : (
          <SortableContext
            items={rootNodes}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3 min-h-[100px]">
              {rootNodes.map((nodeId) => (
                <FormNode
                  key={nodeId}
                  nodeId={nodeId}
                  selectedNodeId={selectedNodeId}
                  onSelect={onNodeSelect}
                  isDragging={isDragging}
                  draggedItem={draggedItem}
                  activeDropZone={activeDropZone}
                  dropPreview={dropPreview}
                />
              ))}
              {/* Enhanced empty drop zone at the end for root drops */}
              {isDragging && (
                <div className={cn(
                  "h-16 border-2 border-dashed rounded-xl flex items-center justify-center transition-all duration-200",
                  canDropInRoot
                    ? "border-primary/60 bg-primary/10 text-primary shadow-sm"
                    : "border-destructive/40 bg-destructive/5 text-destructive opacity-50"
                )}>
                  <span className={cn(
                    "text-xs font-medium flex items-center gap-2",
                    canDropInRoot && "animate-pulse"
                  )}>
                    {canDropInRoot ? (
                      <>
                        <span className="text-lg">↓</span>
                        <span>Drop here to add to root</span>
                      </>
                    ) : (
                      <>
                        <span>✗</span>
                        <span>Cannot drop here</span>
                      </>
                    )}
                  </span>
                </div>
              )}
            </div>
          </SortableContext>
        )}
      </div>
    </ScrollArea>
  );
}

import { useDroppable } from "@dnd-kit/core";
import { useSchemaGraphStore } from "@/lib/store/schema-graph";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FormNode } from "./form-node";

interface CanvasProps {
  selectedNodeId: string | null;
  onNodeSelect: (nodeId: string | null) => void;
}

export function Canvas({ selectedNodeId, onNodeSelect }: CanvasProps) {
  const { graph } = useSchemaGraphStore();
  const { setNodeRef, isOver, active } = useDroppable({
    id: "canvas-root",
    data: {
      nodeId: "root",
      type: "object",
      parentId: null,
    },
  });

  // Get root level nodes
  const rootNodes = graph.nodes[graph.rootId]?.children || [];

  return (
    <ScrollArea className="h-full">
      <div
        ref={setNodeRef}
        className={cn(
          "min-h-full p-4 transition-colors",
          isOver &&
            !active?.data.current?.parentId &&
            "bg-accent/20 ring-2 ring-primary/20"
        )}
      >
        {rootNodes.length === 0 ? (
          <div className="flex h-[calc(100vh-8rem)] items-center justify-center rounded-lg border-2 border-dashed text-sm text-muted-foreground">
            Drag and drop fields here to build your form
          </div>
        ) : (
          <div className="space-y-2">
            {rootNodes.map((nodeId) => (
              <FormNode
                key={nodeId}
                nodeId={nodeId}
                selectedNodeId={selectedNodeId}
                onSelect={onNodeSelect}
              />
            ))}
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

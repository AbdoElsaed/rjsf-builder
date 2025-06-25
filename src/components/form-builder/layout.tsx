/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  DndContext,
  type DragEndEvent,
  type DragStartEvent,
  closestCenter,
} from "@dnd-kit/core";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Eye, Code } from "lucide-react";
import { FieldPalette } from "./field-palette";
import { Canvas } from "./canvas";
import { PreviewPanel } from "./preview-panel";
import { useSchemaGraphStore } from "@/lib/store/schema-graph";
import type { SchemaGraph } from "@/lib/store/schema-graph";

export function FormBuilderLayout() {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const { addNode, moveNode, graph } = useSchemaGraphStore();

  const handleDragStart = (event: DragStartEvent) => {
    setIsDragging(true);
  };

  const canDropIntoParent = (
    childType: string,
    parentType: string | undefined
  ) => {
    // Root can accept any field
    if (!parentType) return true;

    // Objects can accept any field
    if (parentType === "object") return true;

    // Arrays can only accept one type of field and must be consistent
    if (parentType === "array") {
      const parentNode = Object.values(graph.nodes).find(
        (node) => node.type === "array" && node.children?.length
      );
      // If array is empty or matches the existing child type
      return (
        !parentNode?.children?.length ||
        graph.nodes[parentNode.children[0]].type === childType
      );
    }

    // Other field types cannot accept children
    return false;
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setIsDragging(false);

    const { active, over } = event;
    if (!over) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    // Get the actual parent ID (either from the over node or its parent)
    const targetParentId =
      overData?.type === "object" || overData?.type === "array"
        ? overData.nodeId
        : overData?.parentId || "root";

    // Case 1: Dropping a new field from the palette
    if (activeData?.type && !activeData?.nodeId) {
      const { type, label } = activeData;

      // Check if we can drop this type into the target parent
      if (!canDropIntoParent(type, graph.nodes[targetParentId]?.type)) {
        return; // Invalid drop target
      }

      // Create a new node
      addNode(
        {
          type,
          title: `New ${label}`,
        },
        targetParentId
      );
    }
    // Case 2: Moving an existing field
    else if (activeData?.nodeId && activeData.nodeId !== targetParentId) {
      const movingNode = graph.nodes[activeData.nodeId];

      // Prevent dropping a parent into its own child
      const isValidMove = !isDescendant(
        activeData.nodeId,
        targetParentId,
        graph
      );

      // Check if we can drop this type into the target parent
      if (
        isValidMove &&
        canDropIntoParent(movingNode.type, graph.nodes[targetParentId]?.type)
      ) {
        moveNode(activeData.nodeId, targetParentId);
      }
    }
  };

  // Helper to check if nodeId is a descendant of targetId
  const isDescendant = (
    nodeId: string,
    targetId: string,
    graph: SchemaGraph
  ): boolean => {
    let current = graph.nodes[targetId];
    while (current?.parentId) {
      if (current.parentId === nodeId) return true;
      current = graph.nodes[current.parentId];
    }
    return false;
  };

  return (
    <DndContext
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      collisionDetection={closestCenter}
    >
      <div className="flex h-[calc(100vh-4.5rem)] items-center justify-center mt-1">
        <div className="h-full w-full max-w-[1400px]">
          <ResizablePanelGroup
            direction="horizontal"
            className="h-full rounded-lg border"
          >
            {/* Field Palette */}
            <ResizablePanel
              defaultSize={20}
              minSize={15}
              maxSize={25}
              className={cn("bg-muted/50", isDragging && "opacity-50")}
            >
              <div className="p-4 font-semibold">Field Types</div>
              <ScrollArea className="h-[calc(100%-3.5rem)]">
                <FieldPalette />
              </ScrollArea>
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* Canvas */}
            <ResizablePanel
              defaultSize={50}
              minSize={30}
              className="border-l border-r"
            >
              <Canvas
                onNodeSelect={setSelectedNodeId}
                selectedNodeId={selectedNodeId}
              />
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* Preview/Schema Panel */}
            <ResizablePanel
              defaultSize={30}
              minSize={25}
              className="bg-muted/50 relative"
            >
              <div className="absolute right-4 top-4 z-10">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => setShowPreview(!showPreview)}
                >
                  {showPreview ? (
                    <>
                      <Code className="h-4 w-4" />
                      Show Schema
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4" />
                      Show Preview
                    </>
                  )}
                </Button>
              </div>
              <div className="h-full">
                <PreviewPanel showPreview={showPreview} />
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>
    </DndContext>
  );
}

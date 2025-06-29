/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  DndContext,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
  closestCenter,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragOverlay,
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
import { Eye, Code, Settings2 } from "lucide-react";
import { FieldPalette } from "./field-palette";
import { Canvas } from "./canvas";
import { PreviewPanel } from "./preview-panel";
import { FieldConfigPanel } from "./field-config-panel";
import { useSchemaGraphStore } from "@/lib/store/schema-graph";
import type { SchemaGraph, JSONSchemaType } from "@/lib/store/schema-graph";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  restrictToVerticalAxis,
  restrictToParentElement,
} from "@dnd-kit/modifiers";

interface DraggedItem {
  type: string;
  label?: string;
  nodeId?: string;
  parentId?: string;
}

export function FormBuilderLayout() {
  const [isDragging, setIsDragging] = useState(false);
  const [draggedItem, setDraggedItem] = useState<DraggedItem | null>(null);
  const [activeDropZone, setActiveDropZone] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const { addNode, moveNode, reorderNode, graph } = useSchemaGraphStore();

  // Initialize sensors
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 5, // 5px movement threshold before drag starts
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250, // 250ms delay before touch drag starts
        tolerance: 5, // 5px movement tolerance
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setIsDragging(true);
    setDraggedItem((event.active.data.current as DraggedItem) || null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    setActiveDropZone(over ? String(over.id) : null);
  };

  const canDropIntoParent = (
    childType: string,
    parentType: string | undefined,
    parentNodeId?: string
  ) => {
    const { engine, graph } = useSchemaGraphStore.getState();
    return engine.canDropIntoParent(graph, childType, parentType, parentNodeId);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setIsDragging(false);
    setDraggedItem(null);
    setActiveDropZone(null);

    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    // If the item is dropped over itself, we don't need to do anything
    if (activeId === overId) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    // Case 1: Dropping a new field from the palette
    if (activeData?.type && !graph.nodes[activeId as string]) {
      // Get the actual parent ID (either from the over node or its parent)
      const targetParentId = typeof overId === "string" ? overId : "root";
      const targetNode = graph.nodes[targetParentId];

      // Check if we can drop this type into the target parent
      if (
        !canDropIntoParent(
          activeData.type as JSONSchemaType,
          targetNode?.type,
          targetParentId
        )
      ) {
        return; // Invalid drop target
      }

      // Create a new node
      const title = `New ${activeData.label}`;

      addNode(
        {
          type: activeData.type as JSONSchemaType,
          title,
          key: "", // Engine will generate unique key
        },
        targetParentId
      );
    }
    // Case 2: Reordering or moving existing fields
    else if (typeof activeId === "string" && typeof overId === "string") {
      const activeNode = graph.nodes[activeId];
      const overNode = graph.nodes[overId];

      // Prevent dropping a parent into its own child
      const isValidMove = !isDescendant(activeId, overId, graph);
      if (!isValidMove) return;

      // If dropping onto an object or array, make it a child
      if (
        (overNode.type === "object" || overNode.type === "array") &&
        canDropIntoParent(activeNode.type, overNode.type, overId)
      ) {
        moveNode(activeId, overId);
      }
      // If they have the same parent, it's a reorder operation
      else if (activeNode.parentId === overNode.parentId) {
        const parent = activeNode.parentId
          ? graph.nodes[activeNode.parentId]
          : graph.nodes.root;
        const oldIndex = parent.children?.indexOf(activeId) ?? -1;
        const newIndex = parent.children?.indexOf(overId) ?? -1;

        if (oldIndex !== -1 && newIndex !== -1) {
          reorderNode(activeId, newIndex);
        }
      }
      // If they have different parents, move to the new parent
      else {
        const targetParentId = overNode.parentId || "root";
        if (
          canDropIntoParent(
            activeNode.type,
            graph.nodes[targetParentId]?.type,
            targetParentId
          )
        ) {
          moveNode(activeId, targetParentId);
        }
      }
    }
  };

  // Helper to check if nodeId is a descendant of targetId
  const isDescendant = (
    nodeId: string,
    targetId: string,
    graph: SchemaGraph
  ): boolean => {
    const { engine } = useSchemaGraphStore.getState();
    return engine.isDescendant(graph, nodeId, targetId);
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
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
                isDragging={isDragging}
                draggedItem={draggedItem}
                activeDropZone={activeDropZone}
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

      <DragOverlay>
        {draggedItem && (
          <div className="bg-background border rounded-lg p-2 shadow-lg opacity-90">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                {draggedItem.label || draggedItem.type}
              </span>
            </div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

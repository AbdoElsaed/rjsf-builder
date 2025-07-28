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
import { Eye, Code } from "lucide-react";
import { FieldPalette } from "./field-palette";
import { Canvas } from "./canvas";
import { PreviewPanel } from "./preview-panel";
import { useSchemaGraphStore } from "@/lib/store/schema-graph";
import type { SchemaGraph, JSONSchemaType } from "@/lib/store/schema-graph";

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
  const { addNode, moveNode, reorderNode, graph, updateNode } =
    useSchemaGraphStore();

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
    const { over, active } = event;
    const { engine } = useSchemaGraphStore.getState();

    // Clear active drop zone if not hovering over anything
    if (!over) {
      setActiveDropZone(null);
      return;
    }

    const overId = over.id;
    const activeData = active.data.current as DraggedItem;

    // Handle dropping into then/else zones of IF blocks
    if (
      typeof overId === "string" &&
      (overId.endsWith("_then") || overId.endsWith("_else"))
    ) {
      const [parentId] = overId.split("_");
      const parentNode = graph.nodes[parentId];

      // Only allow dropping fields into if block zones
      if (parentNode.type === "if_block") {
        setActiveDropZone(overId);
      } else {
        setActiveDropZone(null);
      }
      return;
    }

    const targetNodeId = typeof overId === "string" ? overId : undefined;
    const targetNode = targetNodeId ? graph.nodes[targetNodeId] : null;

    // If dragging an existing node, prevent dropping into itself or its descendants
    if (typeof active.id === "string" && targetNodeId) {
      const isValidMove = !engine.isDescendant(graph, active.id, targetNodeId);
      if (!isValidMove) {
        setActiveDropZone(null);
        return;
      }
    }

    // Check if we can drop this type into the target
    const canDrop = canDropIntoParent(
      activeData?.type || "",
      targetNode?.type,
      targetNodeId
    );

    setActiveDropZone(canDrop ? String(overId) : null);
  };

  const canDropIntoParent = (
    childType: string,
    parentType: string | undefined,
    parentNodeId?: string
  ) => {
    const { engine, graph } = useSchemaGraphStore.getState();

    // Don't allow dropping into non-container types (except if_block which is handled separately)
    if (parentType && !["object", "array", "if_block"].includes(parentType)) {
      return false;
    }

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

    const activeData = active.data.current as DraggedItem;

    // Handle dropping into then/else zones of IF blocks
    if (
      typeof overId === "string" &&
      (overId.endsWith("_then") || overId.endsWith("_else"))
    ) {
      const [parentId, zone] = overId.split("_");
      const parentNode = graph.nodes[parentId];

      if (parentNode.type === "if_block") {
        // If it's an existing node being moved
        if (typeof activeId === "string" && graph.nodes[activeId]) {
          const activeNode = graph.nodes[activeId];

          // Remove from old parent first
          if (activeNode.parentId) {
            const oldParent = graph.nodes[activeNode.parentId];
            if (oldParent.type === "if_block") {
              // Remove from then/else arrays if present
              updateNode(activeNode.parentId, {
                ...oldParent,
                then: oldParent.then?.filter((id) => id !== activeId),
                else: oldParent.else?.filter((id) => id !== activeId),
              });
            } else {
              // Remove from children array
              updateNode(activeNode.parentId, {
                ...oldParent,
                children: oldParent.children?.filter((id) => id !== activeId),
              });
            }
          }

          // Add to new branch
          const updates = {
            ...parentNode,
            [zone]: [...(parentNode[zone as "then" | "else"] || []), activeId],
          };
          updateNode(parentId, updates);
        } else if (activeData?.type) {
          // Create new node
          const title = `New ${activeData.label}`;
          const nodeData = {
            type: activeData.type as JSONSchemaType,
            title,
            key: "",
          };

          // Add node directly to the if block's branch
          const newNodeId = addNode(nodeData, "root");
          if (newNodeId) {
            const updates = {
              ...parentNode,
              [zone]: [
                ...(parentNode[zone as "then" | "else"] || []),
                newNodeId,
              ],
            };
            updateNode(parentId, updates);

            // Remove from root since it's now in the IF block
            updateNode("root", {
              ...graph.nodes.root,
              children: graph.nodes.root.children?.filter(
                (id) => id !== newNodeId
              ),
            });
          }
        }
        return;
      }
    }

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
        // Remove from old parent first
        if (activeNode.parentId) {
          const oldParent = graph.nodes[activeNode.parentId];
          if (oldParent.type === "if_block") {
            // Remove from then/else arrays if present
            updateNode(activeNode.parentId, {
              ...oldParent,
              then: oldParent.then?.filter((id) => id !== activeId),
              else: oldParent.else?.filter((id) => id !== activeId),
            });
          } else {
            // Remove from children array
            updateNode(activeNode.parentId, {
              ...oldParent,
              children: oldParent.children?.filter((id) => id !== activeId),
            });
          }
        }

        // Then move to new parent
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
          // Remove from old parent first
          if (activeNode.parentId) {
            const oldParent = graph.nodes[activeNode.parentId];
            if (oldParent.type === "if_block") {
              // Remove from then/else arrays if present
              updateNode(activeNode.parentId, {
                ...oldParent,
                then: oldParent.then?.filter((id) => id !== activeId),
                else: oldParent.else?.filter((id) => id !== activeId),
              });
            } else {
              // Remove from children array
              updateNode(activeNode.parentId, {
                ...oldParent,
                children: oldParent.children?.filter((id) => id !== activeId),
              });
            }
          }

          // Then move to new parent
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

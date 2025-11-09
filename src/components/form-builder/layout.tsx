import {
  DndContext,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
  closestCenter,
  pointerWithin,
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
import { ScrollArea } from "@/components/ui/scroll-area";
// Eye and Code icons moved to RightPanel component
import { FieldPalette } from "./field-palette";
import { Canvas } from "./canvas";
import { RightPanel } from "./RightPanel";
import { useSchemaGraphStore } from "@/lib/store/schema-graph";
import { ExpandProvider } from "./expand-context";
import type { JSONSchemaType } from "@/lib/store/schema-graph";
import { canDropNode, getDropTarget } from "@/lib/graph/drag-drop-helpers";
import { getChildren } from "@/lib/graph/schema-graph";
import type { SchemaNode } from "@/lib/graph/schema-graph";
import { generateUniqueKey } from "@/lib/utils";

interface DraggedItem {
  type: string;
  label?: string;
  nodeId?: string;
  parentId?: string;
  definitionName?: string; // For component references
}

export function FormBuilderLayout() {
  const [isDragging, setIsDragging] = useState(false);
  const [draggedItem, setDraggedItem] = useState<DraggedItem | null>(null);
  const [activeDropZone, setActiveDropZone] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [dropPreview, setDropPreview] = useState<{
    targetId: string;
    relationshipType: 'child' | 'then' | 'else';
    canDrop: boolean;
  } | null>(null);
  const { addNode, moveNode, reorderNode, graph, updateNode, getNode, createRefToDefinition } =
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
    const activeData = event.active.data.current as DraggedItem | undefined;
    // If dragging an existing node, ensure nodeId is set for reorder detection
    let draggedItemData: DraggedItem;
    if (activeData) {
      draggedItemData = { ...activeData };
    } else if (typeof event.active.id === "string" && graph.nodes.has(event.active.id)) {
      const node = getNode(event.active.id);
      draggedItemData = {
        type: node?.type || '',
        nodeId: event.active.id,
        label: node?.title,
      };
    } else {
      draggedItemData = { type: '' };
    }
    if (typeof event.active.id === "string" && graph.nodes.has(event.active.id)) {
      draggedItemData.nodeId = event.active.id;
      if (!draggedItemData.type) {
        const node = getNode(event.active.id);
        draggedItemData.type = node?.type || '';
        draggedItemData.label = node?.title || draggedItemData.label;
      }
    }
    setDraggedItem(draggedItemData);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over, active } = event;

    // Clear active drop zone if not hovering over anything
    if (!over) {
      setActiveDropZone(null);
      setDropPreview(null);
      return;
    }

    const overId = over.id;
    const activeData = active.data.current as DraggedItem;

    // PRIORITY 1: Check if this is a reorder operation (dragging existing node over sibling)
    // This must be checked first to prioritize reordering over moving
    if (typeof active.id === "string" && graph.nodes.has(active.id)) {
      const activeNode = getNode(active.id);
      const overNode = getNode(overId as string);
      
      if (activeNode && overNode && active.id !== overId) {
        const activeParentId = graph.parentIndex.get(active.id);
        const overParentId = graph.parentIndex.get(overId as string);
        
        // If both nodes have the same parent and it's a child relationship, it's a reorder
        if (activeParentId && 
            activeParentId === overParentId && 
            activeParentId !== null) {
          // Check if the edge type is 'child' (not then/else)
          const activeEdge = Array.from(graph.edges.values()).find(
            e => e.targetId === active.id && e.sourceId === activeParentId
          );
          
          if (activeEdge?.type === 'child') {
            // This is a reorder operation - highlight the sibling
            setActiveDropZone(String(overId));
            setDropPreview({
              targetId: activeParentId,
              relationshipType: 'child',
              canDrop: true, // Reorder is always allowed for siblings
            });
            return;
          }
        }
      }
    }

    // PRIORITY 2: Handle move operations (different parent or new items)
    // Parse the drop target
    const dropTarget = getDropTarget(overId, graph);
    if (!dropTarget) {
      setActiveDropZone(null);
      setDropPreview(null);
      return;
    }

    // Determine source ID/type
    // For palette items, use the type directly from activeData
    // For existing nodes, use the node ID
    const sourceId = typeof active.id === "string" && graph.nodes.has(active.id)
      ? active.id
      : (activeData?.type || String(active.id)); // Use type for palette items, fallback to active.id as string

    // Check if drop is valid using unified helper
    const canDrop = canDropNode(
      graph,
      sourceId as string | JSONSchemaType,
      dropTarget.parentId,
      dropTarget.relationshipType
    );

    setActiveDropZone(canDrop ? String(overId) : null);
    setDropPreview({
      targetId: dropTarget.parentId,
      relationshipType: dropTarget.relationshipType,
      canDrop,
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setIsDragging(false);
    setDraggedItem(null);
    setActiveDropZone(null);
    setDropPreview(null);

    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    // If the item is dropped over itself, we don't need to do anything
    if (activeId === overId) return;

    const activeData = active.data.current as DraggedItem;

    // Parse the drop target
    const dropTarget = getDropTarget(overId, graph);
    if (!dropTarget) return;

    // Case 1a: Dropping a component from the palette (creates a reference)
    if (activeData?.type === 'ref' && activeData?.definitionName && !graph.nodes.has(String(activeId))) {
      const definitionName = activeData.definitionName as string;
      const parentId = dropTarget.relationshipType === 'child' ? dropTarget.parentId : 'root';
      
      // Generate a unique key from the component name
      const uniqueKey = generateUniqueKey(graph, definitionName, parentId);
      
      // Create reference to definition
      const newNodeId = createRefToDefinition(definitionName, parentId, uniqueKey);

      // If dropping into IF block branch, use moveNode with correct edge type
      if (dropTarget.relationshipType === 'then' || dropTarget.relationshipType === 'else') {
        moveNode(newNodeId, dropTarget.parentId, dropTarget.relationshipType);
        
        // Also update legacy then/else arrays for backward compatibility
        const parentNode = getNode(dropTarget.parentId);
        if (parentNode && parentNode.type === 'if_block') {
          const branchArray = (parentNode[dropTarget.relationshipType] as string[] || []);
          if (!branchArray.includes(newNodeId)) {
            updateNode(dropTarget.parentId, {
              ...parentNode,
              [dropTarget.relationshipType]: [...branchArray, newNodeId],
            });
          }
        }
      }
      return;
    }

    // Case 1b: Dropping a new field from the palette
    if (activeData?.type && !graph.nodes.has(String(activeId))) {
      // Validate drop - pass the type directly for palette items
      const canDrop = canDropNode(graph, activeData.type as JSONSchemaType, dropTarget.parentId, dropTarget.relationshipType);
      if (!canDrop) return;

      // Create new node - V2 handles edge creation automatically
      const title = `New ${activeData.label}`;
      const parentId = dropTarget.relationshipType === 'child' ? dropTarget.parentId : 'root';
      
      // Generate a unique key from the title
      const uniqueKey = generateUniqueKey(graph, title, parentId);
      
      // Initialize IF blocks with a default condition
      const nodeData: Omit<SchemaNode, 'id'> = {
        type: activeData.type as JSONSchemaType,
        title,
        key: uniqueKey,
        ...(activeData.type === 'if_block' ? {
          condition: {
            field: '',
            operator: 'equals',
            value: '',
          },
        } : {}),
      };
      
      const newNodeId = addNode(
        nodeData,
        parentId
      );

      // If dropping into IF block branch, use moveNode with correct edge type
      if (dropTarget.relationshipType === 'then' || dropTarget.relationshipType === 'else') {
        // Move with correct edge type - V2 handles edge creation automatically
        moveNode(newNodeId, dropTarget.parentId, dropTarget.relationshipType);
        
        // Also update legacy then/else arrays for backward compatibility
        const parentNode = getNode(dropTarget.parentId);
        if (parentNode && parentNode.type === 'if_block') {
          const branchArray = (parentNode[dropTarget.relationshipType] as string[] || []);
          if (!branchArray.includes(newNodeId)) {
            updateNode(dropTarget.parentId, {
              ...parentNode,
              [dropTarget.relationshipType]: [...branchArray, newNodeId],
            });
          }
        }
      }
      return;
    }

    // Case 2: Moving an existing node
    if (typeof activeId === "string" && graph.nodes.has(activeId)) {
      const activeNode = getNode(activeId);
      if (!activeNode) return;

      // Get parent ID from V2 graph
      const parentId = graph.parentIndex.get(activeId);
      const overNode = getNode(overId as string);
      const overParentId = overNode ? graph.parentIndex.get(overId as string) : null;

      // PRIORITY 1: Reorder operation (same parent, child relationship, dropping over sibling)
      // This is the most common case and should be handled first
      if (parentId && 
          overNode &&
          parentId === overParentId && 
          parentId === dropTarget.parentId && 
          dropTarget.relationshipType === 'child') {
        // Verify it's a child relationship (not then/else)
        const activeEdge = Array.from(graph.edges.values()).find(
          e => e.targetId === activeId && e.sourceId === parentId
        );
        
        if (activeEdge?.type === 'child') {
          // This is a reorder within the same parent
          const siblings = getChildren(graph, parentId, 'child');
          const oldIndex = siblings.findIndex((n: SchemaNode) => n.id === activeId);
          const newIndex = siblings.findIndex((n: SchemaNode) => n.id === overId);
          
          // Only reorder if indices are valid and different
          if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
            reorderNode(activeId, newIndex);
            return;
          }
        }
      }
      
      // PRIORITY 2: Dropping on the parent itself (reorder to end)
      if (parentId && 
          dropTarget.parentId === parentId && 
          dropTarget.relationshipType === 'child' &&
          overId === parentId) {
        // Verify it's a child relationship
        const activeEdge = Array.from(graph.edges.values()).find(
          e => e.targetId === activeId && e.sourceId === parentId
        );
        
        if (activeEdge?.type === 'child') {
          // Dropping on parent = move to end
          const siblings = getChildren(graph, parentId, 'child');
          const oldIndex = siblings.findIndex((n: SchemaNode) => n.id === activeId);
          const newIndex = siblings.length - 1;
          
          if (oldIndex !== -1 && oldIndex !== newIndex) {
            reorderNode(activeId, newIndex);
            return;
          }
        }
      }

      // Validate drop
      if (!canDropNode(graph, activeId, dropTarget.parentId, dropTarget.relationshipType)) {
        return;
      }

      // Use store's moveNode which now supports edgeType
      moveNode(activeId, dropTarget.parentId, dropTarget.relationshipType);
      
      // For IF block branches, also update legacy then/else arrays
      // For conditional groups (allOf/anyOf/oneOf), sync all conditions to reference shared then/else
      if (dropTarget.relationshipType === 'then' || dropTarget.relationshipType === 'else') {
        const parentNode = getNode(dropTarget.parentId);
        if (parentNode) {
          if (parentNode.type === 'if_block') {
            // Legacy if_block - update array
            const branchArray = (parentNode[dropTarget.relationshipType] as string[] || []);
            if (!branchArray.includes(activeId)) {
              updateNode(dropTarget.parentId, {
                ...parentNode,
                [dropTarget.relationshipType]: [...branchArray, activeId],
              });
            }
          } else if (parentNode.type === 'allOf' || parentNode.type === 'anyOf' || parentNode.type === 'oneOf') {
            // Conditional group - sync all conditions to reference shared then/else
            const thenNodes = getChildren(graph, dropTarget.parentId, 'then');
            const elseNodes = getChildren(graph, dropTarget.parentId, 'else');
            const sharedThenId = thenNodes[0]?.id;
            const sharedElseId = elseNodes[0]?.id;
            
            if (parentNode.conditions && parentNode.conditions.length > 0) {
              const syncedConditions = parentNode.conditions.map(cond => ({
                ...cond,
                then: sharedThenId,
                else: sharedElseId,
              }));
              
              updateNode(dropTarget.parentId, {
                ...parentNode,
                conditions: syncedConditions,
              });
            }
          }
        }
      }
    }
  };

  return (
    <ExpandProvider>
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        collisionDetection={(args) => {
          // Use pointerWithin for better sortable detection, fallback to closestCenter
          const pointerCollisions = pointerWithin(args);
          if (pointerCollisions.length > 0) {
            return pointerCollisions;
          }
          return closestCenter(args);
        }}
      >
      <div className="flex h-[calc(100vh-5.2rem)] w-full px-4">
        <div className="h-full w-full">
          <ResizablePanelGroup
            direction="horizontal"
            className="h-full rounded-xl border border-border/50 bg-background shadow-lg"
          >
            {/* Field Palette */}
            <ResizablePanel
              defaultSize={20}
              minSize={15}
              maxSize={25}
              className={cn(
                "bg-muted/30 backdrop-blur-sm transition-opacity duration-200",
                isDragging && "opacity-60"
              )}
            >
              <div className="p-6 pb-4 border-b border-border/50">
                <h2 className="text-base font-semibold text-foreground mb-1.5">
                  Field Types
                </h2>
                <p className="text-xs text-muted-foreground">
                  Drag to add fields
                </p>
              </div>
              <ScrollArea className="h-[calc(100%-5rem)]">
                <div className="p-3">
                  <FieldPalette />
                </div>
              </ScrollArea>
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* Canvas */}
            <ResizablePanel
              defaultSize={50}
              minSize={30}
              className="bg-background"
            >
              <Canvas
                onNodeSelect={setSelectedNodeId}
                selectedNodeId={selectedNodeId}
                isDragging={isDragging}
                draggedItem={draggedItem}
                activeDropZone={activeDropZone}
                dropPreview={dropPreview}
              />
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* Right Panel - Config or Preview */}
            <ResizablePanel
              defaultSize={30}
              minSize={25}
              className="relative"
            >
              <RightPanel
                selectedNodeId={selectedNodeId}
                onFieldDeselect={() => setSelectedNodeId(null)}
              />
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>

      <DragOverlay>
        {draggedItem && (
          <div className={cn(
            "bg-background border-2 rounded-xl p-4 shadow-2xl",
            "transform rotate-2 scale-105 transition-all duration-200",
            dropPreview?.canDrop 
              ? "border-primary shadow-primary/30 ring-4 ring-primary/20" 
              : dropPreview 
                ? "border-destructive shadow-destructive/30 opacity-80"
                : "border-muted shadow-lg"
          )}>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold">
                {draggedItem.label || draggedItem.type}
              </span>
              {dropPreview && (
                <span className={cn(
                  "text-xs px-2.5 py-1 rounded-full font-medium transition-colors",
                  dropPreview.canDrop 
                    ? "bg-primary/15 text-primary border border-primary/20" 
                    : "bg-destructive/15 text-destructive border border-destructive/20"
                )}>
                  {dropPreview.canDrop ? "✓ Can drop" : "✗ Cannot drop"}
                </span>
              )}
            </div>
          </div>
        )}
      </DragOverlay>
      </DndContext>
    </ExpandProvider>
  );
}

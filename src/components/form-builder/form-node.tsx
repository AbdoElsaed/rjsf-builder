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
  ArrowRight,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Bookmark,
  AlertCircle,
  Info,
} from "lucide-react";
import { useState, useEffect, useMemo, memo, useRef } from "react";
import {
  useSchemaGraphStore,
} from "@/lib/store/schema-graph";
import type { SchemaGraph, SchemaNode } from "@/lib/graph/schema-graph";
import { getParent, getChildren } from "@/lib/graph/schema-graph";
import { useExpandContext } from "./expand-context";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { SortableContext } from "@dnd-kit/sortable";
import { verticalListSortingStrategy } from "@dnd-kit/sortable";
// FieldConfigPanel moved to RightPanel - no longer used inline
import { Button } from "@/components/ui/button";
import { SaveAsComponentDialog } from "./save-as-component-dialog";
import type { FormNodeProps } from "./types";
import { IfBlock } from "./if-block";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const FIELD_ICONS = {
  string: TextQuote,
  number: Hash,
  boolean: ToggleLeft,
  enum: List,
  object: Type,
  array: Layers,
  if_block: GitBranch,
  allOf: GitBranch,
  anyOf: GitBranch,
  oneOf: GitBranch,
} as const;

/**
 * Check if a node type is a conditional type (if_block, allOf, anyOf, oneOf)
 * Optimized: Single function to check all conditional types
 */
const isConditionalType = (nodeType: string): boolean => {
  return nodeType === 'if_block' || nodeType === 'allOf' || nodeType === 'anyOf' || nodeType === 'oneOf';
};

/**
 * Check if a node type can accept children (for drop validation)
 * Optimized: Centralized logic for container types
 */
const canAcceptChildren = (nodeType: string): boolean => {
  return nodeType === 'object' || nodeType === 'array' || isConditionalType(nodeType);
};

/**
 * Calculate nesting depth for visual indicators
 * Optimized: Early exit when reaching root
 */
const calculateDepth = (graph: SchemaGraph, nodeId: string): number => {
  let depth = 0;
  let currentId: string | null = nodeId;
  while (currentId && currentId !== 'root') {
    const parent = getParent(graph, currentId);
    if (!parent || parent.id === 'root') break;
    depth++;
    currentId = parent.id;
  }
  return depth;
};

const FormNodeComponent = function FormNode({
  nodeId,
  selectedNodeId,
  onSelect,
  isDragging: globalIsDragging = false,
  draggedItem = null,
  activeDropZone = null,
  dropPreview = null,
  onRemove,
}: FormNodeProps) {
  const { graph, removeNode, getNode, reorderNode } = useSchemaGraphStore();
  const { expandTrigger, collapseTrigger } = useExpandContext();
  const [isEditing, setIsEditing] = useState(false);
  const [nestingDepth, setNestingDepth] = useState(0);
  
  // Track last trigger values to handle recursive expand/collapse
  const lastExpandTriggerRef = useRef(expandTrigger);
  const lastCollapseTriggerRef = useRef(collapseTrigger);
  
  // Initialize isOpen based on current trigger state (for newly rendered children)
  // If collapseTrigger is more recent, start closed; otherwise start open
  const [isOpen, setIsOpen] = useState(() => {
    // If collapse was triggered more recently than expand, start closed
    if (collapseTrigger > expandTrigger) {
      return false;
    }
    // Otherwise start open (default)
    return true;
  });
  
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  
  // Sync isEditing with selectedNodeId - when this node is selected, enter edit mode
  useEffect(() => {
    setIsEditing(selectedNodeId === nodeId);
  }, [selectedNodeId, nodeId]);

  // Listen to expand/collapse triggers and update local state recursively
  useEffect(() => {
    if (expandTrigger > lastExpandTriggerRef.current) {
      setIsOpen(true);
      lastExpandTriggerRef.current = expandTrigger;
      // Note: Children will also receive this trigger via context and expand themselves
    }
  }, [expandTrigger]);

  useEffect(() => {
    if (collapseTrigger > lastCollapseTriggerRef.current) {
      setIsOpen(false);
      lastCollapseTriggerRef.current = collapseTrigger;
      // Note: Children will also receive this trigger via context and collapse themselves
    }
  }, [collapseTrigger]);
  
  // Get node - must be called before hooks
  const node = getNode(nodeId);
  
  // Memoize node type checks for performance
  const nodeType = useMemo(() => node?.type ?? '', [node?.type]);
  const isConditional = useMemo(() => node ? isConditionalType(nodeType) : false, [node, nodeType]);
  
  // Check if node can be saved as a component
  const canSaveAsComponent = useMemo(() => {
    if (!node) return false;
    // Can't save: ref nodes, root node, or already a definition
    if (node.type === 'ref' || nodeId === 'root' || node.isDefinition) {
      return false;
    }
    // Can save: objects, arrays, and fields with structure
    return true;
  }, [node, nodeId]);
  
  // Get children using V2 edge-based lookup - memoized
  // Subscribe to graph changes via selector that returns stable string reference
  const childIdsString = useSchemaGraphStore((state) => {
    // Return a stable string based on child edges - DO NOT SORT, order matters!
    const children = getChildren(state.graph, nodeId, 'child');
    return children.map(n => n.id).join(','); // Preserve order from getChildren
  });
  
  // Get children from store, memoized based on the stable string reference
  // Parse childIdsString to get actual IDs, then fetch full node objects
  const children = useMemo(() => {
    if (!childIdsString) return [];
    const currentGraph = useSchemaGraphStore.getState().graph;
    const childIds = childIdsString.split(',').filter(Boolean);
    return childIds.map(id => currentGraph.nodes.get(id)).filter((n): n is SchemaNode => n !== undefined);
  }, [childIdsString]);
  
  const childIds = useMemo(() => children.map(n => n.id), [children]);

  // Calculate and update nesting depth - must be called before early return
  useEffect(() => {
    if (node) {
      setNestingDepth(calculateDepth(graph, nodeId));
    }
  }, [graph, nodeId, node]);

  // Get parent for sortable data - memoized
  const parentId = useMemo(() => {
    if (!node) return undefined;
    return getParent(graph, nodeId)?.id;
  }, [graph, nodeId, node]);

  // Sortable hook - must be called before early return
  // Disable dragging for definitions (they should only be dragged from palette to create references)
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: nodeId,
    disabled: node?.isDefinition === true, // Disable dragging for definitions
    data: {
      type: "node",
      nodeId,
      parentId,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Memoize icon lookup
  const Icon = useMemo(() => {
    return FIELD_ICONS[nodeType as keyof typeof FIELD_ICONS];
  }, [nodeType]);

  // Droppable hook - must be called before early return
  const { isOver, setNodeRef: setDroppableRef } = useDroppable({
    id: nodeId,
    data: {
      type: "node",
      nodeId,
      accepts: nodeType === "array" ? ["*"] : ["node"],
    },
    disabled: !node, // Disable if node doesn't exist
  });

  const setRefs = (element: HTMLElement | null) => {
    setNodeRef(element);
    setDroppableRef(element);
  };

  // Optimized drop validation - memoized
  const canDrop = useMemo(() => {
    if (!draggedItem || !node) return false;
    return canAcceptChildren(nodeType);
  }, [draggedItem, node, nodeType]);

  // Check if this node is the target of the drop preview
  const isDropTarget = useMemo(() => 
    dropPreview?.targetId === nodeId && dropPreview?.relationshipType === 'child',
    [dropPreview?.targetId, dropPreview?.relationshipType, nodeId]
  );

  // Get parent and siblings for reorder functionality - memoized
  // Only allow reordering for child relationships (not then/else branches)
  const { parent, siblings, currentIndex, canMoveUp, canMoveDown, showReorderButtons } = useMemo(() => {
    if (!node) {
      return {
        parent: null,
        siblings: [],
        currentIndex: -1,
        canMoveUp: false,
        canMoveDown: false,
        showReorderButtons: false,
      };
    }

    const parentNode = getParent(graph, nodeId);
    const parentEdge = Array.from(graph.edges.values()).find(
      edge => edge.targetId === nodeId && edge.sourceId === parentNode?.id
    );
    const isChildRel = parentEdge?.type === 'child';
    const siblingNodes = (parentNode && isChildRel) ? getChildren(graph, parentNode.id, 'child') : [];
    const idx = siblingNodes.findIndex(n => n.id === nodeId);
    
    return {
      parent: parentNode,
      siblings: siblingNodes,
      currentIndex: idx,
      canMoveUp: isChildRel && idx > 0,
      canMoveDown: isChildRel && idx >= 0 && idx < siblingNodes.length - 1,
      showReorderButtons: isChildRel && siblingNodes.length > 1,
    };
  }, [graph, nodeId, node]);

  // Get dragged node ID for reorder detection - memoized
  const draggedNodeId = useMemo(() => {
    if (!draggedItem) return null;
    if (draggedItem.nodeId) return draggedItem.nodeId;
    if (draggedItem.type && typeof draggedItem.type === 'string' && graph.nodes.has(draggedItem.type)) {
      return draggedItem.type;
    }
    return null;
  }, [draggedItem, graph]);

  // Add depth indicator styles - memoized
  const depthIndicatorClasses = useMemo(() => cn(
    "absolute -left-3 top-0 bottom-0 border-l-2 opacity-0 transition-opacity",
    globalIsDragging && "opacity-100",
    canDrop ? "border-primary/30" : "border-muted"
  ), [globalIsDragging, canDrop]);

  // Check if this node is being reordered (dragged over by a sibling) - memoized
  const { isBeingReordered, showInsertIndicator, insertAbove, insertBelow } = useMemo(() => {
    const isReordered = globalIsDragging && 
      draggedNodeId && 
      draggedNodeId !== nodeId &&
      parent &&
      graph.parentIndex.get(draggedNodeId) === parent.id &&
      activeDropZone === nodeId;
    
    const showIndicator = isReordered && dropPreview?.canDrop;
    
    // Get the dragged node's current index to determine insertion position
    const draggedNodeIndex = draggedNodeId && parent 
      ? siblings.findIndex(n => n.id === draggedNodeId)
      : -1;
    const currentIndexInSiblings = siblings.findIndex(n => n.id === nodeId);
    
    // Show insertion line above if dragging node is below current node (moving up)
    const above = showIndicator && 
                  draggedNodeIndex !== -1 && 
                  currentIndexInSiblings !== -1 && 
                  draggedNodeIndex > currentIndexInSiblings;
    // Show insertion line below if dragging node is above current node (moving down)
    const below = showIndicator && 
                  draggedNodeIndex !== -1 && 
                  currentIndexInSiblings !== -1 && 
                  draggedNodeIndex < currentIndexInSiblings;
    
    return {
      isBeingReordered: isReordered,
      showInsertIndicator: showIndicator,
      insertAbove: above,
      insertBelow: below,
    };
  }, [globalIsDragging, draggedNodeId, nodeId, parent, graph, activeDropZone, dropPreview?.canDrop, siblings]);

  // Memoize base classes for performance - must be before early return
  const baseClasses = useMemo(() => cn(
    "group relative rounded-xl border border-border/50 bg-card shadow-sm transition-all duration-200 hover:shadow-md",
    isDragging && "opacity-50 scale-105 rotate-1",
    // Reorder visual feedback - highlight when sibling is being dragged over
    isBeingReordered && "ring-2 ring-primary/50 border-primary/60 bg-primary/5",
    // Enhanced visual feedback for droppable nodes - optimized conditional check
    globalIsDragging &&
      (nodeType === "object" || nodeType === "array") &&
      canDrop &&
      "border-primary/60 shadow-lg shadow-primary/10",
    globalIsDragging &&
      (nodeType === "object" || nodeType === "array") &&
      !canDrop &&
      "border-destructive/40 opacity-60",
    // Active drop zone highlighting with enhanced visuals
    activeDropZone === nodeId && canDrop && "ring-4 ring-primary/40 bg-primary/10 ring-offset-4 ring-offset-background shadow-lg",
    activeDropZone === nodeId &&
      !canDrop &&
      "ring-4 ring-destructive/40 bg-destructive/10 ring-offset-4 ring-offset-background",
    // Drop preview indicator
    isDropTarget && dropPreview?.canDrop && "animate-pulse",
    // Legacy hover state for non-dragging scenarios
    !globalIsDragging && isOver && "ring-2 ring-primary/30 shadow-md",
    nodeType === "object" && "border-primary/30",
    isEditing && "ring-2 ring-primary/30 bg-muted/50 shadow-md"
  ), [
    isDragging,
    isBeingReordered,
    globalIsDragging,
    nodeType,
    canDrop,
    activeDropZone,
    nodeId,
    isDropTarget,
    dropPreview?.canDrop,
    isOver,
    isEditing,
  ]);

  // Memoize nested drop zone classes for performance - must be before early return
  const nestedDropZoneClasses = useMemo(() => cn(
    "mt-2 space-y-2 transition-all duration-200",
    // Container styles with depth indicator
    "relative border-l-2 ml-4 pl-4",
    // Enhanced visual feedback for child drop zones
    globalIsDragging && canDrop && "border-primary/60",
    globalIsDragging && !canDrop && "border-destructive/50",
    // Drop preview indicator line
    isDropTarget && dropPreview?.canDrop && "border-primary shadow-sm",
    // Empty state styles
    childIds.length === 0 &&
      cn(
        "min-h-[48px] rounded-lg",
        activeDropZone === nodeId &&
          canDrop &&
          "border-2 border-dashed border-primary/60 rounded-xl bg-primary/10 ring-2 ring-primary/30 shadow-sm",
        activeDropZone === nodeId &&
          !canDrop &&
          "border-2 border-dashed border-destructive/60 rounded-xl bg-destructive/10 ring-2 ring-destructive/30",
        !globalIsDragging &&
          isOver &&
          "border-2 border-dashed border-primary/50 rounded-xl bg-primary/5"
      ),
    // Add bottom padding only when there are children
    childIds.length > 0 ? "pb-1" : ""
  ), [
    globalIsDragging,
    canDrop,
    isDropTarget,
    dropPreview?.canDrop,
    childIds.length,
    activeDropZone,
    nodeId,
    isOver,
  ]);

  // Early return after all hooks
  if (!node) return null;

  const handleDelete = () => {
    if (onRemove) {
      onRemove();
    } else {
      removeNode(nodeId);
    }
  };

  // Handle clicking on the field to open config panel
  const handleFieldClick = (e: React.MouseEvent) => {
    // Don't trigger if clicking on interactive elements (buttons, drag handle, etc.)
    const target = e.target as HTMLElement;
    if (
      target.closest('button') ||
      target.closest('[role="button"]') ||
      target.closest('[data-drag-handle]')
    ) {
      return;
    }
    
    // Don't trigger during drag operations
    if (isDragging || globalIsDragging) {
      return;
    }
    
    e.stopPropagation();
    onSelect(nodeId);
  };

  const handleMoveUp = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (canMoveUp && currentIndex > 0) {
      reorderNode(nodeId, currentIndex - 1);
    }
  };

  const handleMoveDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (canMoveDown && currentIndex < siblings.length - 1) {
      reorderNode(nodeId, currentIndex + 1);
    }
  };

  // Render depth indicators
  const renderDepthIndicators = () => {
    return Array.from({ length: nestingDepth }).map((_, index) => (
      <div
        key={index}
        className={cn(depthIndicatorClasses, `left-${-(index + 1) * 3}`)}
      />
    ));
  };

  // Special rendering for IF blocks and conditional groups (allOf/anyOf/oneOf)
  // Optimized: Use helper function for conditional type check
  if (isConditional) {
    return (
      <>
        {/* Insertion indicator line above - shown when reordering */}
        {showInsertIndicator && insertAbove && (
          <div className="relative -mt-1.5 mb-1.5 z-20">
            <div className="h-0.5 bg-primary rounded-full mx-4 shadow-lg shadow-primary/50 animate-pulse" />
            <div className="absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 bg-primary rounded-full border-2 border-background shadow-md" />
          </div>
        )}
        <div ref={setRefs} style={style} className={baseClasses}>
          {renderDepthIndicators()}
          <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
            <div className="flex items-center gap-2 p-3 min-w-0">
              {!node?.isDefinition && (
                <button
                  {...attributes}
                  {...listeners}
                  data-drag-handle
                  className="touch-none flex-shrink-0 hover:bg-muted/50 rounded p-1 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab active:cursor-grabbing" />
                </button>
              )}
              {node?.isDefinition && (
                <div className="flex-shrink-0 w-6" /> // Spacer for definitions (no drag handle)
              )}
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 hover:bg-muted/80 rounded-md transition-all duration-200 hover:scale-105"
                >
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-all duration-200" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground transition-all duration-200" />
                  )}
                  <span className="sr-only">Toggle section</span>
                </Button>
              </CollapsibleTrigger>
              <div className="flex flex-1 items-center gap-2 min-w-0">
              {Icon && (
                <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              )}
              <div 
                onClick={handleFieldClick}
                className="flex flex-1 items-center gap-2 min-w-0 cursor-pointer hover:bg-muted/30 rounded px-2 py-1 -mx-2 transition-colors group/field"
              >
                <div className="flex-1 truncate">
                  <span className="text-sm font-medium group-hover/field:text-primary transition-colors">{node.title}</span>
                  {node.key && (
                    <span className="ml-1 text-xs text-muted-foreground">
                      ({node.key})
                    </span>
                  )}
                </div>
                {node.type === 'ref' && node.refTarget && (
                  <div 
                    className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-primary/10 border border-primary/30 text-xs text-primary flex-shrink-0 hover:bg-primary/15 transition-colors cursor-help"
                    title={`References definition: ${node.refTarget}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Bookmark className="h-3 w-3 fill-primary/20" />
                    <span className="font-medium">{node.refTarget}</span>
                  </div>
                )}
                  {node.isDefinition && (
                    <div 
                      className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-600 dark:text-emerald-400 flex-shrink-0 hover:bg-emerald-500/15 transition-colors"
                      title={`Reusable component: ${node.definitionName}`}
                    >
                      <Bookmark className="h-3 w-3 fill-emerald-500/20" />
                      <span className="font-medium">Component</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                  {/* Reorder buttons */}
                  {showReorderButtons && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 hover:bg-muted"
                        onClick={handleMoveUp}
                        disabled={!canMoveUp}
                        title="Move up"
                      >
                        <ChevronUp className={cn(
                          "h-3.5 w-3.5 transition-opacity",
                          !canMoveUp && "opacity-30"
                        )} />
                        <span className="sr-only">Move up</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 hover:bg-muted"
                        onClick={handleMoveDown}
                        disabled={!canMoveDown}
                        title="Move down"
                      >
                        <ChevronDown className={cn(
                          "h-3.5 w-3.5 transition-opacity",
                          !canMoveDown && "opacity-30"
                        )} />
                        <span className="sr-only">Move down</span>
                      </Button>
                      <div className="w-px h-4 bg-border mx-0.5" />
                    </>
                  )}
                  {/* Save as Component and Delete buttons - Edit removed, field is now clickable */}
                  {canSaveAsComponent && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 hover:bg-muted text-primary hover:text-primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowSaveDialog(true);
                      }}
                      title="Save as Reusable Definition"
                    >
                      <Bookmark className="h-3.5 w-3.5" />
                      <span className="sr-only">Save as Component</span>
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={handleDelete}
                    title="Delete"
                  >
                    <X className="h-3.5 w-3.5" />
                    <span className="sr-only">Delete</span>
                  </Button>
                </div>
              </div>
            </div>
            
            <CollapsibleContent>
              <div className="px-3 pb-3">
                <IfBlock
                  nodeId={nodeId}
                  isDragging={globalIsDragging}
                  draggedItem={draggedItem || undefined}
                  activeDropZone={activeDropZone}
                  dropPreview={dropPreview}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
        {/* Insertion indicator line below - shown when reordering */}
        {showInsertIndicator && insertBelow && (
          <div className="relative -mb-1.5 mt-1.5 z-20">
            <div className="h-0.5 bg-primary rounded-full mx-4 shadow-lg shadow-primary/50 animate-pulse" />
            <div className="absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 bg-primary rounded-full border-2 border-background shadow-md" />
          </div>
        )}
      </>
    );
  }

  return (
    <>
      {/* Insertion indicator line above - shown when reordering */}
      {showInsertIndicator && insertAbove && (
        <div className="relative -mt-1.5 mb-1.5 z-20">
          <div className="h-0.5 bg-primary rounded-full mx-4 shadow-lg shadow-primary/50 animate-pulse" />
          <div className="absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 bg-primary rounded-full border-2 border-background shadow-md" />
        </div>
      )}
      <div ref={setRefs} style={style} className={baseClasses}>
        {renderDepthIndicators()}
      {/* Config panel moved to RightPanel - no more inline editing */}
      {/* Field now just shows normally, config panel is in the right sidebar */}
      {(
        <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
          <div className="flex items-center gap-2 p-3 min-w-0">
            {!node?.isDefinition && (
              <button
                {...attributes}
                {...listeners}
                data-drag-handle
                className="touch-none flex-shrink-0 hover:bg-muted/50 rounded p-1 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab active:cursor-grabbing" />
              </button>
            )}
            {node?.isDefinition && (
              <div className="flex-shrink-0 w-6" aria-label="Definition (not draggable)" />
            )}
            <div className="flex flex-1 items-center gap-2 min-w-0">
              {/* Optimized: Use nodeType instead of node.type */}
              {(nodeType === "object" || nodeType === "array") && (
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 hover:bg-muted/80 rounded-md transition-all duration-200 hover:scale-105"
                  >
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground transition-all duration-200" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground transition-all duration-200" />
                    )}
                    <span className="sr-only">Toggle section</span>
                  </Button>
                </CollapsibleTrigger>
              )}
              {Icon && (
                <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              )}
              <div 
                onClick={handleFieldClick}
                className="flex flex-1 items-center gap-2 min-w-0 cursor-pointer hover:bg-muted/30 rounded px-2 py-1 -mx-2 transition-colors group/field"
              >
                <div className="flex-1 truncate">
                  <span className="text-sm font-medium group-hover/field:text-primary transition-colors">{node.title}</span>
                  {node.key && (
                    <span className="ml-1 text-xs text-muted-foreground">
                      ({node.key})
                    </span>
                  )}
                </div>
                {node.type === 'ref' && node.refTarget && (
                  <div 
                    className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-primary/10 border border-primary/30 text-xs text-primary flex-shrink-0 hover:bg-primary/15 transition-colors cursor-help"
                    title={`References component: ${node.refTarget}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Bookmark className="h-3 w-3 fill-primary/20" />
                    <span className="font-medium">{node.refTarget}</span>
                  </div>
                )}
                {node.isDefinition && (
                  <div 
                    className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-600 dark:text-emerald-400 flex-shrink-0 hover:bg-emerald-500/15 transition-colors"
                    title={`Reusable component: ${node.definitionName}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Bookmark className="h-3 w-3 fill-emerald-500/20" />
                    <span className="font-medium">Component</span>
                  </div>
                )}
              </div>
              {/* Show nesting path on hover when dragging */}
              {globalIsDragging && nestingDepth > 0 && (
                <div className="hidden group-hover:flex items-center gap-1 text-xs text-muted-foreground">
                  <ArrowRight className="h-3 w-3" />
                  <span>Depth: {nestingDepth}</span>
                </div>
              )}
              <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                {/* Reorder buttons - only show if node can be reordered */}
                {showReorderButtons && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 hover:bg-muted"
                      onClick={handleMoveUp}
                      disabled={!canMoveUp}
                      title="Move up"
                    >
                      <ChevronUp className={cn(
                        "h-3.5 w-3.5 transition-opacity",
                        !canMoveUp && "opacity-30"
                      )} />
                      <span className="sr-only">Move up</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 hover:bg-muted"
                      onClick={handleMoveDown}
                      disabled={!canMoveDown}
                      title="Move down"
                    >
                      <ChevronDown className={cn(
                        "h-3.5 w-3.5 transition-opacity",
                        !canMoveDown && "opacity-30"
                      )} />
                      <span className="sr-only">Move down</span>
                    </Button>
                    <div className="w-px h-4 bg-border mx-0.5" />
                  </>
                )}
                {/* Save as Component and Delete buttons - Edit removed, field is now clickable */}
                {canSaveAsComponent && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 hover:bg-muted text-primary hover:text-primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowSaveDialog(true);
                    }}
                    title="Save as Reusable Definition"
                  >
                    <Bookmark className="h-3.5 w-3.5" />
                    <span className="sr-only">Save as Component</span>
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={handleDelete}
                  title="Delete"
                >
                  <X className="h-3.5 w-3.5" />
                  <span className="sr-only">Delete</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Optimized: Use nodeType instead of node.type */}
          {(nodeType === "object" || nodeType === "array") && (
            <CollapsibleContent>
              <div className={nestedDropZoneClasses}>
                {childIds.length > 0 ? (
                  <SortableContext
                    items={childIds}
                    strategy={verticalListSortingStrategy}
                  >
                    {childIds.map((childId) => (
                      <FormNode
                        key={childId}
                        nodeId={childId}
                        selectedNodeId={selectedNodeId}
                        onSelect={onSelect}
                        isDragging={globalIsDragging}
                        draggedItem={draggedItem}
                        activeDropZone={activeDropZone}
                        dropPreview={dropPreview}
                      />
                    ))}
                  </SortableContext>
                ) : (
                  <div className={cn(
                    "flex flex-col items-center justify-center h-full py-4 px-3 rounded-xl transition-all",
                    globalIsDragging && canDrop && "bg-primary/10 border border-primary/30",
                    globalIsDragging && !canDrop && "bg-destructive/10 border border-destructive/30",
                    activeDropZone === nodeId && canDrop && "animate-pulse shadow-sm"
                  )}>
                    {globalIsDragging ? (
                      canDrop ? (
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-primary font-semibold text-sm flex items-center gap-1">
                            <span>↓</span>
                            <span>Drop fields here</span>
                          </span>
                          <span className="text-xs text-primary/70">This will be a child of "{node.title}"</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-destructive font-semibold text-sm flex items-center gap-1">
                            <span>✗</span>
                            <span>Cannot drop this field type here</span>
                          </span>
                          <span className="text-xs text-destructive/70">This field type is not compatible</span>
                        </div>
                      )
                    ) : nodeType === "array" ? (
                      <div className="flex flex-col items-center gap-2 w-full max-w-sm">
                        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500">
                          <AlertCircle className="h-4 w-4" />
                          <span className="text-sm font-medium">Missing Items Definition</span>
                        </div>
                        <p className="text-xs text-muted-foreground text-center">
                          Arrays require an items definition. Drag a field here to define what each array item should contain.
                        </p>
                        <div className="flex items-start gap-2 mt-1 p-2 rounded-md bg-muted/50 border border-border/50 w-full">
                          <Info className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <div className="text-xs text-muted-foreground">
                            <p className="font-medium mb-0.5">Tip:</p>
                            <p>For example, drag a "Text" field to create an array of strings, or an "Object" to create an array of objects.</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Drop fields here</span>
                    )}
                  </div>
                )}
              </div>
            </CollapsibleContent>
          )}
        </Collapsible>
        )}
      </div>
      {/* Insertion indicator line below - shown when reordering */}
      {showInsertIndicator && insertBelow && (
        <div className="relative -mb-1.5 mt-1.5 z-20">
          <div className="h-0.5 bg-primary rounded-full mx-4 shadow-lg shadow-primary/50 animate-pulse" />
          <div className="absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 bg-primary rounded-full border-2 border-background shadow-md" />
        </div>
      )}
      
      {/* Save as Component Dialog */}
      {canSaveAsComponent && (
        <SaveAsComponentDialog
          open={showSaveDialog}
          onOpenChange={setShowSaveDialog}
          nodeId={nodeId}
          onSaved={() => {
            // Component saved successfully
            setShowSaveDialog(false);
          }}
        />
      )}
    </>
  );
};

// Memoize FormNode to prevent unnecessary re-renders
// Only re-render if props actually change
export const FormNode = memo(FormNodeComponent, (prevProps, nextProps) => {
  // Re-render if these props change
  return (
    prevProps.nodeId === nextProps.nodeId &&
    prevProps.selectedNodeId === nextProps.selectedNodeId &&
    prevProps.isDragging === nextProps.isDragging &&
    prevProps.activeDropZone === nextProps.activeDropZone &&
    prevProps.draggedItem?.type === nextProps.draggedItem?.type &&
    prevProps.dropPreview?.targetId === nextProps.dropPreview?.targetId &&
    prevProps.dropPreview?.relationshipType === nextProps.dropPreview?.relationshipType &&
    prevProps.dropPreview?.canDrop === nextProps.dropPreview?.canDrop
  );
});

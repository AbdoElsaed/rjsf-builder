import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { useSchemaGraphStore } from "@/lib/store/schema-graph";
import { getChildren } from "@/lib/graph/schema-graph";
import { canDropNode } from "@/lib/graph/drag-drop-helpers";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { FormNode } from "./form-node";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { X, Plus } from "lucide-react";
import type { DraggedItem } from "./types";
import { useMemo, useEffect, useCallback } from "react";
import type { ConditionalLogic, ConditionalBlock } from "@/lib/graph/schema-graph";

interface IfBlockProps {
  nodeId: string;
  isDragging?: boolean;
  draggedItem?: DraggedItem;
  activeDropZone?: string | null;
  dropPreview?: {
    targetId: string;
    relationshipType: 'child' | 'then' | 'else';
    canDrop: boolean;
  } | null;
}

type LogicMode = 'all' | 'any' | 'one';
type ConditionalGroupType = 'allOf' | 'anyOf' | 'oneOf';

/**
 * Convert logic mode to conditional group type
 */
const logicModeToGroupType = (mode: LogicMode): ConditionalGroupType => {
  return mode === 'all' ? 'allOf' : mode === 'any' ? 'anyOf' : 'oneOf';
};

/**
 * Convert conditional group type to logic mode
 */
const groupTypeToLogicMode = (type: string): LogicMode => {
  if (type === 'allOf') return 'all';
  if (type === 'anyOf') return 'any';
  if (type === 'oneOf') return 'one';
  return 'all';
};

/**
 * Create a default condition
 */
const createDefaultCondition = (): ConditionalLogic => ({
  field: "",
  operator: "equals",
  value: "",
});

/**
 * Validate a condition
 */
const isValidCondition = (condition: ConditionalLogic | undefined): boolean => {
  if (!condition) return false;
  return Boolean(
    condition.field &&
    condition.operator &&
    condition.value !== undefined &&
    condition.value !== ""
  );
};

export function IfBlock({
  nodeId,
  isDragging = false,
  draggedItem,
  activeDropZone,
  dropPreview,
}: IfBlockProps) {
  const { graph, updateNode, removeNode } = useSchemaGraphStore();
  
  // Subscribe to node changes - use selector to ensure re-renders when node updates
  const node = useSchemaGraphStore((state) => state.getNode(nodeId));

  const thenDroppableId = `${nodeId}_then`;
  const elseDroppableId = `${nodeId}_else`;

  // Determine if this is a conditional group (allOf/anyOf/oneOf) or single if_block
  const isConditionalGroup = useMemo(() => 
    node?.type === 'allOf' || node?.type === 'anyOf' || node?.type === 'oneOf',
    [node?.type]
  );
  
  const logicMode = useMemo(() => 
    isConditionalGroup && node?.type ? groupTypeToLogicMode(node.type) : 'all',
    [isConditionalGroup, node?.type]
  );

  // Get shared then/else node IDs (for conditional groups, all conditions share the same branches)
  // Must be called before early return to ensure hooks are always called
  const thenNodes = useMemo(() => 
    node ? getChildren(graph, nodeId, 'then') : [], 
    [node, graph, nodeId]
  );
  
  const elseNodes = useMemo(() => 
    node ? getChildren(graph, nodeId, 'else') : [], 
    [node, graph, nodeId]
  );
  
  const thenNodeIds = useMemo(() => thenNodes.map(n => n.id), [thenNodes]);
  const elseNodeIds = useMemo(() => elseNodes.map(n => n.id), [elseNodes]);
  
  const sharedThenId = thenNodes[0]?.id;
  const sharedElseId = elseNodes[0]?.id;

  // Get conditions: either from conditions array (allOf/anyOf/oneOf) or single condition (if_block)
  const conditions = useMemo(() => {
    if (!node) return [];
    
    if (isConditionalGroup && node.conditions) {
      return node.conditions;
    } else if (node.condition) {
      // Convert single condition to ConditionalBlock format for unified handling
      return [{
        if: node.condition,
        then: sharedThenId,
        else: sharedElseId,
      }];
    }
    return [];
  }, [node, isConditionalGroup, sharedThenId, sharedElseId]);

  // Check if all conditions are valid
  const isConditionValid = useMemo(() => {
    if (conditions.length === 0) return false;
    return conditions.every(cond => isValidCondition(cond.if));
  }, [conditions]);

  const { isOver: isThenOver, setNodeRef: setThenRef } = useDroppable({
    id: thenDroppableId,
    data: {
      type: "then_zone",
      parentId: nodeId,
      accepts: ["node", "*"],
    },
    disabled: !node, // Only disable if node doesn't exist, not based on condition validity
  });

  const { isOver: isElseOver, setNodeRef: setElseRef } = useDroppable({
    id: elseDroppableId,
    data: {
      type: "else_zone",
      parentId: nodeId,
      accepts: ["node", "*"],
    },
    disabled: !node, // Only disable if node doesn't exist, not based on condition validity
  });

  // Sync conditions with shared then/else nodes (for conditional groups)
  // This ensures all conditions reference the same then/else nodes
  // Fixed: Only sync when conditions exist and nodes are actually different
  // Removed aggressive syncing that was interfering with condition updates
  useEffect(() => {
    if (!node || !isConditionalGroup || !node.conditions || node.conditions.length === 0) {
      return;
    }
    
    // Only sync if there are actual then/else nodes and conditions need updating
    // Don't sync if then/else nodes don't exist yet (they'll be created when fields are dropped)
    if (!sharedThenId && !sharedElseId) {
      return; // No branches yet, skip syncing
    }
    
    // Check if any condition has different then/else references
    const needsSync = node.conditions.some(cond => 
      cond.then !== sharedThenId || cond.else !== sharedElseId
    );
    
    if (needsSync) {
      // Update all conditions to reference shared then/else
      const syncedConditions = node.conditions.map(cond => ({
        ...cond,
        then: sharedThenId,
        else: sharedElseId,
      }));
      
      updateNode(nodeId, {
        conditions: syncedConditions,
      });
    }
  }, [node, isConditionalGroup, sharedThenId, sharedElseId, nodeId, updateNode]);

  // Memoize available fields calculation - expensive operation
  // Must be called before early return
  const availableFields = useMemo(() => {
    if (!node) return [];
    
    const fields: { id: string; key: string; title: string }[] = [];
    const visitedIds = new Set<string>();

    // Helper to add a field if not already added and has a valid key
    const addField = (field: { id: string; key: string; title: string }) => {
      if (!field.key || field.key.trim() === '') return;
      if (!visitedIds.has(field.id)) {
        visitedIds.add(field.id);
        fields.push(field);
      }
    };

    // Get the path from root to current node
    const getNodePath = (startNodeId: string): string[] => {
      const path: string[] = [];
      let currentId: string | undefined = startNodeId;

      while (currentId && currentId !== "root") {
        const currentNode = graph.nodes.get(currentId);
        if (!currentNode) break;
        const parentId = graph.parentIndex.get(currentId);
        if (!parentId) break;
        path.unshift(currentId);
        currentId = parentId;
      }

      return path;
    };

    // Build set of nodes to exclude (current if block and its contents)
    const buildExcludeSet = (ifBlockId: string): Set<string> => {
      const excludeIds = new Set<string>([ifBlockId]);
      const ifBlock = graph.nodes.get(ifBlockId);
      if (!ifBlock) return excludeIds;

      // Add then branch nodes (from edges or legacy then array)
      const thenChildren = getChildren(graph, ifBlockId, 'then');
      thenChildren.forEach((node) => {
        excludeIds.add(node.id);
        const nodeChildren = getChildren(graph, node.id, 'child');
        nodeChildren.forEach((child) => excludeIds.add(child.id));
      });
      
      // Also check legacy then array if it exists
      if (ifBlock.then) {
        ifBlock.then.forEach((id) => {
          excludeIds.add(id);
          const nodeChildren = getChildren(graph, id, 'child');
          nodeChildren.forEach((child) => excludeIds.add(child.id));
        });
      }

      // Add else branch nodes (from edges or legacy else array)
      const elseChildren = getChildren(graph, ifBlockId, 'else');
      elseChildren.forEach((node) => {
        excludeIds.add(node.id);
        const nodeChildren = getChildren(graph, node.id, 'child');
        nodeChildren.forEach((child) => excludeIds.add(child.id));
      });
      
      // Also check legacy else array if it exists
      if (ifBlock.else) {
        ifBlock.else.forEach((id) => {
          excludeIds.add(id);
          const nodeChildren = getChildren(graph, id, 'child');
          nodeChildren.forEach((child) => excludeIds.add(child.id));
        });
      }

      return excludeIds;
    };

    // Collect fields from a specific container and its children
    const collectFieldsFromContainer = (
      containerId: string,
      excludeIds: Set<string>
    ) => {
      const container = graph.nodes.get(containerId);
      if (!container) return;

      // Get children via V2 edges
      const children = getChildren(graph, containerId, 'child');

      // Process children in order
      for (const child of children) {
        // Skip excluded nodes (like the current if block and its contents)
        if (excludeIds.has(child.id)) continue;

        // Add simple fields
        if (!["if_block", "object", "array", "allOf", "anyOf", "oneOf"].includes(child.type)) {
          addField({
            id: child.id,
            key: child.key,
            title: child.title,
          });
        }

        // For containers, collect their fields too
        if (child.type === "object" || child.type === "array") {
          collectFieldsFromContainer(child.id, excludeIds);
        }
      }
    };

    // Start collection process
    const nodePath = getNodePath(nodeId);
    const excludeIds = buildExcludeSet(nodeId);

    // For each container in the path from root to current node
    collectFieldsFromContainer("root", excludeIds);

    for (const pathNodeId of nodePath) {
      const pathNode = graph.nodes.get(pathNodeId);
      if (!pathNode) continue;
      const parentId = graph.parentIndex.get(pathNodeId);
      if (!parentId) continue;

      // Collect fields from the parent container
      collectFieldsFromContainer(parentId, excludeIds);
    }

    return fields;
  }, [graph, nodeId, node]);

  // Handle condition change for a specific condition index
  // Must be called before early return
  // Fixed: Use store directly to get latest state and ensure proper updates
  const handleConditionChange = useCallback((conditionIndex: number, field: keyof ConditionalLogic, value: string | unknown) => {
    const currentNode = useSchemaGraphStore.getState().getNode(nodeId);
    if (!currentNode) return;
    
    // Check if it's a conditional group type directly
    const isGroup = currentNode.type === 'allOf' || currentNode.type === 'anyOf' || currentNode.type === 'oneOf';
    
    if (isGroup) {
      // Update condition in conditions array - create deep copy to ensure immutability
      const currentConditions = currentNode.conditions || [];
      if (conditionIndex >= 0 && conditionIndex < currentConditions.length) {
        const updatedConditions = currentConditions.map((cond, idx) => {
          if (idx === conditionIndex) {
            return {
              ...cond,
              if: {
                ...cond.if,
                [field]: value,
              },
            };
          }
          return cond;
        });
        
        // Only update the conditions field, not the entire node
        updateNode(nodeId, {
          conditions: updatedConditions,
        });
      }
    } else {
      // Update single condition (if_block)
      const currentCondition = currentNode.condition || createDefaultCondition();
      updateNode(nodeId, {
        condition: {
          ...currentCondition,
          [field]: value,
        },
      });
    }
  }, [nodeId, updateNode]);

  // Convert if_block to conditional group
  // Must be called before early return
  // Fixed: Use store directly to get latest state
  const convertToConditionalGroup = useCallback((groupType: ConditionalGroupType) => {
    const state = useSchemaGraphStore.getState();
    const currentNode = state.getNode(nodeId);
    if (!currentNode) return;
    
    // Get current then/else branch node IDs
    const currentThenNodes = getChildren(state.graph, nodeId, 'then');
    const currentElseNodes = getChildren(state.graph, nodeId, 'else');
    const thenNodeId = currentThenNodes[0]?.id;
    const elseNodeId = currentElseNodes[0]?.id;
    
    // Convert single condition to ConditionalBlock format
    const conditionBlock: ConditionalBlock = {
      if: currentNode.condition || createDefaultCondition(),
      then: thenNodeId,
      else: elseNodeId,
    };
    
    // Update node type and convert condition to conditions array
    updateNode(nodeId, {
      type: groupType,
      conditions: [conditionBlock],
      condition: undefined, // Remove single condition
    });
  }, [nodeId, updateNode]);

  // Handle logic mode change (all/any/one)
  // Must be called before early return
  // Fixed: Use store directly and ensure type change is properly applied
  const handleLogicModeChange = useCallback((newMode: LogicMode) => {
    const state = useSchemaGraphStore.getState();
    const currentNode = state.getNode(nodeId);
    if (!currentNode) return;
    
    const groupType = logicModeToGroupType(newMode);
    
    // Convert if_block to conditional group if needed
    if (currentNode.type === 'if_block') {
      convertToConditionalGroup(groupType);
    } else {
      // Update the type while preserving conditions - only update type field
      updateNode(nodeId, {
        type: groupType,
      });
    }
  }, [nodeId, updateNode, convertToConditionalGroup]);

  // Add a new condition
  // Must be called before early return
  // Fixed: Use store directly and ensure then/else references are preserved
  const handleAddCondition = useCallback(() => {
    const state = useSchemaGraphStore.getState();
    const currentNode = state.getNode(nodeId);
    if (!currentNode) return;
    
    const newCondition = createDefaultCondition();
    
    // Get current then/else node IDs
    const currentThenNodes = getChildren(state.graph, nodeId, 'then');
    const currentElseNodes = getChildren(state.graph, nodeId, 'else');
    const thenNodeId = currentThenNodes[0]?.id;
    const elseNodeId = currentElseNodes[0]?.id;
    
    // Check if it's a conditional group type directly
    const isGroup = currentNode.type === 'allOf' || currentNode.type === 'anyOf' || currentNode.type === 'oneOf';
    
    if (isGroup) {
      // Add to conditions array
      const currentConditions = currentNode.conditions || [];
      const updatedConditions = [
        ...currentConditions,
        {
          if: newCondition,
          then: thenNodeId, // Use current then/else IDs
          else: elseNodeId,
        },
      ];
      
      // Only update conditions field
      updateNode(nodeId, {
        conditions: updatedConditions,
      });
    } else {
      // Convert to conditional group with both conditions in one update
      // Convert single condition to ConditionalBlock format
      const existingConditionBlock: ConditionalBlock = {
        if: currentNode.condition || createDefaultCondition(),
        then: thenNodeId,
        else: elseNodeId,
      };
      
      // Create new condition block
      const newConditionBlock: ConditionalBlock = {
        if: newCondition,
        then: thenNodeId,
        else: elseNodeId,
      };
      
      // Update node type and convert to conditions array with both conditions
      updateNode(nodeId, {
        type: 'allOf',
        conditions: [existingConditionBlock, newConditionBlock],
        condition: undefined, // Remove single condition
      });
    }
  }, [nodeId, updateNode]);

  // Remove a condition
  // Must be called before early return
  // Fixed: Use store directly to avoid stale closure issues
  const handleRemoveCondition = useCallback((conditionIndex: number) => {
    const state = useSchemaGraphStore.getState();
    const currentNode = state.getNode(nodeId);
    if (!currentNode) return;
    
    const isGroup = currentNode.type === 'allOf' || currentNode.type === 'anyOf' || currentNode.type === 'oneOf';
    if (!isGroup) return;
    
    const currentConditions = currentNode.conditions || [];
    if (conditionIndex < 0 || conditionIndex >= currentConditions.length) return;
    
    const updatedConditions = currentConditions.filter((_, idx) => idx !== conditionIndex);
    
    if (updatedConditions.length === 0) {
      // If no conditions left, leave empty (user can add new ones)
      updateNode(nodeId, {
        conditions: [],
      });
    } else if (updatedConditions.length === 1) {
      // Convert back to if_block
      const singleCondition = updatedConditions[0];
      updateNode(nodeId, {
        type: 'if_block',
        condition: singleCondition.if,
        conditions: undefined,
      });
    } else {
      updateNode(nodeId, {
        conditions: updatedConditions,
      });
    }
  }, [nodeId, updateNode]);

  // Handle removing a field from then/else branches
  // Must be called before early return
  const handleRemoveField = useCallback((fieldId: string, branch: "then" | "else") => {
    if (!node) return;
    
    // In V2, then/else are edges, but we also maintain arrays for legacy support
    const updatedBranch = (node[branch] as string[] | undefined)?.filter((id) => id !== fieldId) || [];

    // Update the IF block node (maintain legacy arrays)
    updateNode(nodeId, {
      ...node,
      [branch]: updatedBranch.length > 0 ? updatedBranch : undefined,
    });

    // Remove the field from the graph
    removeNode(fieldId);
  }, [node, nodeId, updateNode, removeNode]);

  // Must be called before early return
  const renderDropZone = useCallback((
    ref: (element: HTMLElement | null) => void,
    isOver: boolean,
    title: string,
    branch: "then" | "else",
    items: string[] = []
  ) => {
    const dropZoneId = `${nodeId}_${branch}`;
    const isActiveDropZone = activeDropZone === dropZoneId;
    const isDropTarget = dropPreview?.targetId === nodeId && dropPreview?.relationshipType === branch;
    const canDrop =
      draggedItem &&
      canDropNode(
        graph,
        draggedItem.type,
        nodeId,
        branch as 'then' | 'else'
      );

    return (
      <div className="space-y-2">
        <Label className={cn(
          "text-sm font-semibold transition-colors flex items-center gap-2",
          isDropTarget && dropPreview?.canDrop && "text-primary",
          isDropTarget && !dropPreview?.canDrop && "text-destructive",
          isDragging && canDrop && "text-primary"
        )}>
          <span className="flex-1">{title}</span>
          {isDropTarget && dropPreview?.canDrop && (
            <span className="text-lg animate-bounce">↓</span>
          )}
          {isDropTarget && !dropPreview?.canDrop && (
            <span className="text-lg">✗</span>
          )}
          {isDragging && canDrop && !isDropTarget && (
            <span className="text-sm text-primary/70">Ready to drop</span>
          )}
        </Label>
        <div
          ref={ref}
          className={cn(
            "min-h-[80px] rounded-xl border-2 transition-all duration-300 relative",
            // Base styles - make it more prominent
            items.length === 0 && "border-dashed",
            // Remove condition-based disabling - allow drops even with incomplete conditions
            // Active drop zone styles - highest priority with stronger visual feedback
            isActiveDropZone &&
              canDrop &&
              "ring-4 ring-primary/60 border-primary/80 bg-primary/15 ring-offset-2 shadow-lg shadow-primary/20 scale-[1.02]",
            isActiveDropZone &&
              !canDrop &&
              "ring-4 ring-destructive/60 border-destructive/80 bg-destructive/15 ring-offset-2",
            // Drop preview indicator
            isDropTarget && dropPreview?.canDrop && "animate-pulse border-primary/80 bg-primary/20 shadow-lg",
            isDropTarget && !dropPreview?.canDrop && "border-destructive/70 bg-destructive/10",
            // Dragging styles - medium priority with better visibility
            isDragging &&
              !isActiveDropZone &&
              canDrop &&
              "border-primary/60 bg-primary/10 shadow-md",
            isDragging &&
              !isActiveDropZone &&
              !canDrop &&
              "border-destructive/40 bg-destructive/5",
            // Hover styles - lowest priority but more visible
            isOver &&
              !isDragging &&
              "border-primary/50 bg-primary/8 shadow-sm",
            // Padding - more generous for easier targeting
            "p-4",
            // Empty state
            items.length === 0 && "flex items-center justify-center"
          )}
        >
          {/* Drop preview indicator line - more prominent */}
          {isDropTarget && dropPreview?.canDrop && items.length > 0 && (
            <div className="absolute top-4 left-4 right-4 h-1 bg-primary rounded-full animate-pulse z-10 shadow-lg shadow-primary/50" />
          )}
          
          {/* Visual drop indicator overlay when dragging */}
          {isDragging && canDrop && !isActiveDropZone && (
            <div className="absolute inset-0 border-2 border-dashed border-primary/40 rounded-xl bg-primary/5 animate-pulse pointer-events-none" />
          )}
          
          {items.length > 0 ? (
            <SortableContext
              items={items}
              strategy={verticalListSortingStrategy}
            >
              <div
                className={cn(
                  "space-y-2",
                  isDragging && "relative",
                  isActiveDropZone &&
                    canDrop &&
                    "after:absolute after:inset-0 after:pointer-events-none after:ring-2 after:ring-primary/40 after:rounded-xl"
                )}
              >
                {items.map((itemId) => (
                  <FormNode
                    key={itemId}
                    nodeId={itemId}
                    selectedNodeId={null}
                    onSelect={() => {}}
                    isDragging={isDragging}
                    draggedItem={draggedItem}
                    activeDropZone={activeDropZone}
                    dropPreview={dropPreview}
                    onRemove={() => handleRemoveField(itemId, branch)}
                  />
                ))}
                {/* Empty drop zone at the end for easier dropping */}
                {isDragging && canDrop && (
                  <div className={cn(
                    "h-12 border-2 border-dashed rounded-lg flex items-center justify-center transition-all",
                    isActiveDropZone
                      ? "border-primary/80 bg-primary/15 animate-pulse"
                      : "border-primary/40 bg-primary/5"
                  )}>
                    <span className="text-xs text-primary font-medium flex items-center gap-2">
                      <span className="text-lg">↓</span>
                      <span>Drop here to add to {title.toLowerCase()}</span>
                    </span>
                  </div>
                )}
              </div>
            </SortableContext>
          ) : (
            <div className={cn(
              "flex flex-col items-center justify-center h-full py-4 transition-all",
              isDragging && canDrop && "bg-primary/10",
              isDragging && !canDrop && "bg-destructive/10"
            )}>
              {isDragging ? (
                canDrop ? (
                  <div className="flex flex-col items-center gap-2 text-center">
                    <span className="text-3xl animate-bounce">↓</span>
                    <span className="text-primary font-semibold text-base flex items-center gap-2">
                      <span>Drop field here</span>
                    </span>
                    <span className="text-sm text-primary/80">This will be in the <strong>{title.toLowerCase()}</strong> branch</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-center">
                    <span className="text-3xl">✗</span>
                    <span className="text-destructive font-semibold text-base flex items-center gap-2">
                      <span>Cannot drop this field type here</span>
                    </span>
                    <span className="text-sm text-destructive/80">This field type is not compatible with {title.toLowerCase()} branch</span>
                  </div>
                )
              ) : (
                <div className="text-center space-y-1">
                  <span className="text-sm text-muted-foreground block">Drop fields here</span>
                  <span className="text-xs text-muted-foreground/60 block">Fields in the {title.toLowerCase()} branch</span>
                  {!isConditionValid && (
                    <span className="text-xs text-amber-600/80 block mt-2">💡 You can add fields before setting conditions</span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }, [nodeId, activeDropZone, dropPreview, isConditionValid, isDragging, draggedItem, graph, handleRemoveField]);

  // Early return after all hooks
  if (!node) return null;

  return (
    <div className="space-y-3">
          {/* Logic Selector - shown when 2+ conditions */}
          {conditions.length >= 2 && (
            <div className="flex items-center gap-2">
              <Label className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                Show when:
              </Label>
              <Select
                value={logicMode}
                onValueChange={(value) => handleLogicModeChange(value as LogicMode)}
              >
                <SelectTrigger className="h-8 text-sm w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex items-center gap-2">
                      <span>All must be true</span>
                      <span className="text-xs text-muted-foreground">(AND)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="any">
                    <div className="flex items-center gap-2">
                      <span>Any can be true</span>
                      <span className="text-xs text-muted-foreground">(OR)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="one">
                    <div className="flex items-center gap-2">
                      <span>Only one can be true</span>
                      <span className="text-xs text-muted-foreground">(XOR)</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <div className="flex-1" />
            </div>
          )}

        {/* Conditions List */}
        <div className="space-y-2">
          {conditions.map((condition, index) => {
            // Fixed: Use stable key based only on index to prevent remounting
            const conditionKey = `condition-${index}`;
            
            return (
            <div key={conditionKey} className="flex items-center gap-2 p-2 border border-border/50 rounded-lg bg-background/50">
              <span className="text-xs text-muted-foreground font-medium w-20 flex-shrink-0">
                Condition {index + 1}:
              </span>
              <div className="flex-1 grid grid-cols-3 gap-2">
                <Select
                  value={condition.if?.field || undefined}
                  onValueChange={(value) => handleConditionChange(index, "field", value)}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Select field">
                      {(() => {
                        if (!condition.if?.field) return null;
                        const selectedField = availableFields.find(f => f.key === condition.if?.field);
                        return selectedField ? (
                          <div className="flex flex-col items-start">
                            <span className="font-medium text-xs">{selectedField.title}</span>
                            <span className="text-xs text-muted-foreground">{selectedField.key}</span>
                          </div>
                        ) : condition.if.field;
                      })()}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {availableFields.map((field) => (
                      <SelectItem key={field.id} value={field.key} className="py-2.5">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-sm">{field.title}</span>
                          <span className="text-xs text-muted-foreground font-mono">{field.key}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={condition.if?.operator || "equals"}
                  onValueChange={(value) => handleConditionChange(index, "operator", value)}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Operator" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="equals">Equals</SelectItem>
                    <SelectItem value="not_equals">Not Equals</SelectItem>
                    <SelectItem value="greater_than">Greater Than</SelectItem>
                    <SelectItem value="less_than">Less Than</SelectItem>
                    <SelectItem value="greater_equal">Greater Than or Equal</SelectItem>
                    <SelectItem value="less_equal">Less Than or Equal</SelectItem>
                    <SelectItem value="contains">Contains</SelectItem>
                    <SelectItem value="starts_with">Starts With</SelectItem>
                    <SelectItem value="ends_with">Ends With</SelectItem>
                    <SelectItem value="empty">Is Empty</SelectItem>
                    <SelectItem value="not_empty">Is Not Empty</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex items-center gap-1">
                  {/* Fixed: Use controlled input with stable key to prevent focus loss */}
                  <Input
                    key={`value-input-${index}`}
                    className="h-8 text-sm flex-1"
                    placeholder="Value"
                    value={String(condition.if?.value ?? "")}
                    onChange={(e) => {
                      handleConditionChange(index, "value", e.target.value);
                    }}
                  />
                  {conditions.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 flex-shrink-0"
                      onClick={() => handleRemoveCondition(index)}
                      title="Remove condition"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
            );
          })}

          {/* Add Condition Button */}
          <Button
            variant="outline"
            size="sm"
            className="w-full h-8 text-sm"
            onClick={handleAddCondition}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Another Condition
          </Button>
        </div>

      {/* Then/Else Blocks */}
      <div className="space-y-2">
        {renderDropZone(setThenRef, isThenOver, "Then", "then", 
          node.then || thenNodeIds)}
        {renderDropZone(setElseRef, isElseOver, "Else", "else", 
          node.else || elseNodeIds)}
      </div>
    </div>
  );
}

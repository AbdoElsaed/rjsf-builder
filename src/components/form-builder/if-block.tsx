import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { useSchemaGraphStore } from "@/lib/store/schema-graph";
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
import { X } from "lucide-react";
import type { DraggedItem } from "./types";

interface IfBlockProps {
  nodeId: string;
  isDragging?: boolean;
  draggedItem?: DraggedItem;
  activeDropZone?: string | null;
  onRemove?: () => void;
}

export function IfBlock({
  nodeId,
  isDragging = false,
  draggedItem,
  activeDropZone,
  onRemove,
}: IfBlockProps) {
  const { graph, updateNode, removeNode } = useSchemaGraphStore();
  const node = graph.nodes[nodeId];

  const thenDroppableId = `${nodeId}_then`;
  const elseDroppableId = `${nodeId}_else`;

  // Check if condition is properly set
  const isConditionValid = Boolean(
    node.condition?.field &&
      node.condition?.operator &&
      node.condition?.value !== undefined &&
      node.condition?.value !== ""
  );

  const { isOver: isThenOver, setNodeRef: setThenRef } = useDroppable({
    id: thenDroppableId,
    data: {
      type: "then_zone",
      parentId: nodeId,
      accepts: ["node", "*"],
    },
    disabled: !isConditionValid, // Disable drop zone if condition is not valid
  });

  const { isOver: isElseOver, setNodeRef: setElseRef } = useDroppable({
    id: elseDroppableId,
    data: {
      type: "else_zone",
      parentId: nodeId,
      accepts: ["node", "*"],
    },
    disabled: !isConditionValid, // Disable drop zone if condition is not valid
  });

  // Get all available fields for comparison
  const getAvailableFields = () => {
    const fields: { id: string; key: string; title: string }[] = [];
    const visitedKeys = new Set<string>();

    const addField = (field: { id: string; key: string; title: string }) => {
      if (!visitedKeys.has(field.key)) {
        visitedKeys.add(field.key);
        fields.push(field);
      }
    };

    const traverse = (currentNodeId: string) => {
      const currentNode = graph.nodes[currentNodeId];
      if (!currentNode) return;

      // Add the current node if it's a valid field type (not an if_block, object, or array)
      // and it's not inside the current if block's then/else branches
      if (
        !["if_block", "object", "array"].includes(currentNode.type) &&
        !node.then?.includes(currentNodeId) &&
        !node.else?.includes(currentNodeId)
      ) {
        addField({
          id: currentNode.id,
          key: currentNode.key,
          title: currentNode.title,
        });
      }

      // Only traverse up to parent and siblings at the same level
      if (currentNode.parentId) {
        const parent = graph.nodes[currentNode.parentId];

        // Add parent's siblings (fields at the same level as parent)
        if (parent.parentId) {
          const grandParent = graph.nodes[parent.parentId];
          grandParent.children?.forEach((siblingId) => {
            if (siblingId !== parent.id) {
              const sibling = graph.nodes[siblingId];
              if (
                sibling &&
                !["if_block", "object", "array"].includes(sibling.type)
              ) {
                addField({
                  id: sibling.id,
                  key: sibling.key,
                  title: sibling.title,
                });
              }
            }
          });
        }

        // Add parent's fields (if parent is an object)
        if (parent.type === "object") {
          parent.children?.forEach((childId) => {
            if (childId !== currentNodeId) {
              const child = graph.nodes[childId];
              if (
                child &&
                !["if_block", "object", "array"].includes(child.type)
              ) {
                addField({
                  id: child.id,
                  key: child.key,
                  title: child.title,
                });
              }
            }
          });
        }

        // Continue traversing up
        traverse(currentNode.parentId);
      }
    };

    // Start traversal from the current node
    traverse(nodeId);

    return fields;
  };

  const availableFields = getAvailableFields();

  const handleConditionChange = (field: string, value: string) => {
    const currentCondition = node.condition || {
      field: "",
      operator: "equals",
      value: "",
    };

    updateNode(nodeId, {
      ...node,
      condition: {
        ...currentCondition,
        [field]: value,
      },
    });
  };

  // Handle removing a field from then/else branches
  const handleRemoveField = (fieldId: string, branch: "then" | "else") => {
    const updatedBranch = node[branch]?.filter((id) => id !== fieldId) || [];

    // Update the IF block node
    updateNode(nodeId, {
      ...node,
      [branch]: updatedBranch,
    });

    // Remove the field from the graph
    removeNode(fieldId);
  };

  const renderDropZone = (
    ref: (element: HTMLElement | null) => void,
    isOver: boolean,
    title: string,
    branch: "then" | "else",
    items: string[] = []
  ) => {
    const dropZoneId = `${nodeId}_${branch}`;
    const isActiveDropZone = activeDropZone === dropZoneId;
    const canDrop =
      draggedItem &&
      (() => {
        const { engine, graph } = useSchemaGraphStore.getState();
        return engine.canDropIntoParent(
          graph,
          draggedItem.type,
          "if_block",
          nodeId
        );
      })();

    return (
      <div className="space-y-1">
        <Label className="text-xs font-medium">{title}</Label>
        <div
          ref={ref}
          className={cn(
            "min-h-[40px] rounded-md border transition-all duration-200",
            // Base styles
            items.length === 0 && "border-dashed",
            !isConditionValid &&
              "opacity-50 cursor-not-allowed border-muted bg-muted/10",
            // Active drop zone styles - highest priority
            isActiveDropZone &&
              canDrop &&
              "ring-2 ring-primary border-primary bg-primary/10",
            isActiveDropZone &&
              !canDrop &&
              "ring-2 ring-destructive border-destructive bg-destructive/10",
            // Dragging styles - medium priority
            isConditionValid &&
              isDragging &&
              !isActiveDropZone &&
              canDrop &&
              "border-primary/50 bg-primary/5",
            isConditionValid &&
              isDragging &&
              !isActiveDropZone &&
              !canDrop &&
              "border-destructive/30 bg-destructive/5",
            // Hover styles - lowest priority
            isConditionValid &&
              isOver &&
              !isDragging &&
              "border-primary bg-primary/5",
            // Padding
            "p-2",
            // Empty state
            items.length === 0 && "flex items-center justify-center"
          )}
        >
          {items.length > 0 ? (
            <SortableContext
              items={items}
              strategy={verticalListSortingStrategy}
            >
              <div
                className={cn(
                  "space-y-1",
                  isDragging && "relative",
                  isActiveDropZone &&
                    canDrop &&
                    "after:absolute after:inset-0 after:pointer-events-none after:ring-2 after:ring-primary/30 after:rounded-md"
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
                    onRemove={() => handleRemoveField(itemId, branch)}
                  />
                ))}
              </div>
            </SortableContext>
          ) : (
            <span
              className={cn(
                "text-xs",
                isConditionValid && !isDragging && "text-muted-foreground",
                isConditionValid &&
                  isDragging &&
                  canDrop &&
                  "text-primary font-medium",
                isConditionValid &&
                  isDragging &&
                  !canDrop &&
                  "text-destructive",
                !isConditionValid && "text-muted-foreground/50"
              )}
            >
              {!isConditionValid
                ? "Set condition first"
                : isDragging
                ? canDrop
                  ? "Drop field here"
                  : "Cannot drop this field type here"
                : "Drop fields here"}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-2 p-2 bg-muted/30 rounded-md group">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="grid grid-cols-3 gap-2 flex-1">
            <Select
              value={node.condition?.field || ""}
              onValueChange={(value) => handleConditionChange("field", value)}
            >
              <SelectTrigger className="h-7 text-xs">
                <SelectValue placeholder="Select field" />
              </SelectTrigger>
              <SelectContent>
                {availableFields.map((field) => (
                  <SelectItem key={field.id} value={field.key}>
                    {field.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={node.condition?.operator || "equals"}
              onValueChange={(value) =>
                handleConditionChange("operator", value)
              }
            >
              <SelectTrigger className="h-7 text-xs">
                <SelectValue placeholder="Operator" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="equals">Equals</SelectItem>
                <SelectItem value="not_equals">Not Equals</SelectItem>
                <SelectItem value="greater_than">Greater Than</SelectItem>
                <SelectItem value="less_than">Less Than</SelectItem>
                <SelectItem value="greater_equal">
                  Greater Than or Equal
                </SelectItem>
                <SelectItem value="less_equal">Less Than or Equal</SelectItem>
                <SelectItem value="contains">Contains</SelectItem>
                <SelectItem value="starts_with">Starts With</SelectItem>
                <SelectItem value="ends_with">Ends With</SelectItem>
                <SelectItem value="empty">Is Empty</SelectItem>
                <SelectItem value="not_empty">Is Not Empty</SelectItem>
              </SelectContent>
            </Select>

            <Input
              className="h-7 text-xs"
              placeholder="Value"
              value={String(node.condition?.value || "")}
              onChange={(e) => handleConditionChange("value", e.target.value)}
            />
          </div>
          {onRemove && (
            <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 flex-shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-destructive hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
              >
                <X className="h-3.5 w-3.5" />
                <span className="sr-only">Delete</span>
              </Button>
            </div>
          )}
        </div>
      </div>

      {renderDropZone(setThenRef, isThenOver, "Then", "then", node.then)}
      {renderDropZone(setElseRef, isElseOver, "Else", "else", node.else)}
    </div>
  );
}

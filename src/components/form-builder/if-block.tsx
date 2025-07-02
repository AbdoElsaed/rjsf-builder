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
    const visited = new Set<string>();

    const traverse = (currentNodeId: string) => {
      if (visited.has(currentNodeId)) return;
      visited.add(currentNodeId);

      const currentNode = graph.nodes[currentNodeId];

      // Add the current node if it's a valid field type (not an if_block, object, or array)
      if (
        currentNode &&
        !["if_block", "object", "array"].includes(currentNode.type)
      ) {
        fields.push({
          id: currentNode.id,
          key: currentNode.key,
          title: currentNode.title,
        });
      }

      // Traverse up to parent
      if (currentNode.parentId) {
        traverse(currentNode.parentId);
      }

      // Traverse siblings (nodes with same parent)
      if (currentNode.parentId) {
        const parent = graph.nodes[currentNode.parentId];
        parent.children?.forEach((childId) => {
          if (childId !== currentNodeId) {
            traverse(childId);
          }
        });
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
  ) => (
    <div className="space-y-1">
      <Label className="text-xs font-medium">{title}</Label>
      <div
        ref={ref}
        className={cn(
          "min-h-[40px] rounded-md border border-dashed p-2",
          !isConditionValid && "opacity-50 cursor-not-allowed border-muted",
          isConditionValid &&
            isOver &&
            !isDragging &&
            "border-primary bg-primary/5",
          isConditionValid && isDragging && "border-primary/50 bg-primary/5",
          items.length === 0 && "flex items-center justify-center"
        )}
      >
        {items.length > 0 ? (
          <SortableContext items={items} strategy={verticalListSortingStrategy}>
            <div className="space-y-1">
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
              isConditionValid
                ? "text-muted-foreground"
                : "text-muted-foreground/50"
            )}
          >
            {isConditionValid ? "Drop fields here" : "Set condition first"}
          </span>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-2 p-2 bg-muted/30 rounded-md">
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
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 ml-2 text-destructive hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
            >
              <X className="h-3.5 w-3.5" />
              <span className="sr-only">Delete</span>
            </Button>
          )}
        </div>
      </div>

      {renderDropZone(setThenRef, isThenOver, "Then", "then", node.then)}
      {renderDropZone(setElseRef, isElseOver, "Else", "else", node.else)}
    </div>
  );
}

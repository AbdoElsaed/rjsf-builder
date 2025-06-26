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
  Pencil,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import { useSchemaGraphStore } from "@/lib/store/schema-graph";
import { toast } from "sonner";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { SortableContext } from "@dnd-kit/sortable";
import { verticalListSortingStrategy } from "@dnd-kit/sortable";

const FIELD_ICONS = {
  string: TextQuote,
  number: Hash,
  boolean: ToggleLeft,
  enum: List,
  object: Type,
  array: Layers,
} as const;

interface DraggedItem {
  type: string;
  label?: string;
  nodeId?: string;
  parentId?: string;
}

interface FormNodeProps {
  nodeId: string;
  selectedNodeId: string | null;
  onSelect: (nodeId: string | null) => void;
  isDragging?: boolean;
  draggedItem?: DraggedItem | null;
  activeDropZone?: string | null;
}

export function FormNode({
  nodeId,
  selectedNodeId,
  onSelect,
  isDragging: globalIsDragging = false,
  draggedItem = null,
  activeDropZone = null,
}: FormNodeProps) {
  const { graph, updateNode, removeNode } = useSchemaGraphStore();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    key: "",
    required: false,
  });
  const node = graph.nodes[nodeId];
  const Icon = FIELD_ICONS[node.type];

  // Make the node sortable
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: nodeId,
    data: {
      type: node.type,
      parentId: node.parentId,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Make object and array nodes droppable
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: nodeId,
    data: {
      type: node.type,
      nodeId,
      parentId: node.parentId,
    },
  });

  // Check if the current dragged item can be dropped into this node
  const canAcceptDrop = (
    draggedType: string,
    targetType: string,
    targetNodeId: string
  ): boolean => {
    if (targetType === "object") return true; // Objects can accept any field
    if (targetType === "array") {
      // Arrays can only accept one type of field and must be consistent
      const targetNode = graph.nodes[targetNodeId];
      return (
        !targetNode?.children?.length ||
        graph.nodes[targetNode.children[0]].type === draggedType
      );
    }
    return false; // Other field types cannot accept children
  };

  const canDrop =
    draggedItem && (node.type === "object" || node.type === "array")
      ? canAcceptDrop(draggedItem.type, node.type, nodeId)
      : false;

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    removeNode(nodeId);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFormData({
      title: node.title,
      description: node.description || "",
      key: node.key,
      required: node.required || false,
    });
    setIsEditing(true);
    onSelect(nodeId);
  };

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Validate and format the key
    const formattedKey = formData.key
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "");

    if (!formattedKey) {
      toast.error("Key cannot be empty");
      return;
    }

    // Check if the key is unique among siblings
    const parent = node.parentId
      ? graph.nodes[node.parentId]
      : graph.nodes.root;
    const siblings = parent.children || [];
    const hasDuplicateKey = siblings.some((siblingId) => {
      if (siblingId === nodeId) return false; // Skip self
      const sibling = graph.nodes[siblingId];
      return sibling.key === formattedKey;
    });

    if (hasDuplicateKey) {
      toast.error("Key must be unique among siblings");
      return;
    }

    updateNode(nodeId, {
      title: formData.title,
      description: formData.description || undefined,
      key: formattedKey,
      required: formData.required,
    });
    setIsEditing(false);
    onSelect(null);
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(false);
    onSelect(null);
  };

  const baseClasses = cn(
    "group relative rounded-lg border bg-card shadow-sm transition-all duration-200",
    isDragging && "opacity-50",
    // Enhanced visual feedback for droppable nodes
    globalIsDragging &&
      (node.type === "object" || node.type === "array") &&
      canDrop &&
      "border-primary/50 bg-primary/5",
    globalIsDragging &&
      (node.type === "object" || node.type === "array") &&
      !canDrop &&
      "border-destructive/30 opacity-60",
    // Active drop zone highlighting
    activeDropZone === nodeId &&
      canDrop &&
      "ring-2 ring-primary/40 bg-primary/10",
    activeDropZone === nodeId &&
      !canDrop &&
      "ring-2 ring-destructive/40 bg-destructive/5",
    // Legacy hover state for non-dragging scenarios
    !globalIsDragging && isOver && "ring-2 ring-primary",
    node.type === "object" && "border-primary/20",
    isEditing && "ring-1 ring-primary/20 bg-muted/50"
  );

  const renderContent = () => {
    if (isEditing) {
      return (
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  value={formData.title}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="Enter field label"
                  className="h-7 text-sm flex-1"
                />
                <div className="flex items-center gap-1">
                  <Label htmlFor="required" className="text-xs">
                    Required
                  </Label>
                  <Switch
                    id="required"
                    checked={formData.required}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, required: checked }))
                    }
                    className="scale-75"
                  />
                </div>
              </div>
              <Input
                value={formData.key}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, key: e.target.value }))
                }
                placeholder="Enter field key"
                className="h-7 text-sm"
              />
              <Input
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Enter description"
                className="h-7 text-sm"
              />
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 flex-1">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">{node.title}</span>
        <span className="text-xs text-muted-foreground">({node.key})</span>
        {node.description && (
          <span className="text-xs text-muted-foreground">
            ({node.description})
          </span>
        )}
        {node.required && <span className="text-xs text-primary">*</span>}
      </div>
    );
  };

  // Combine sortable and droppable refs if needed
  const setRefs = (element: HTMLDivElement) => {
    setNodeRef(element);
    if (node.type === "object" || node.type === "array") {
      setDroppableRef(element);
    }
  };

  return (
    <div
      ref={setRefs}
      style={style}
      {...attributes}
      className={cn(baseClasses, "p-3 hover:bg-accent")}
    >
      <div className="flex items-start gap-3">
        <div
          {...(isEditing ? {} : listeners)}
          className={cn(
            "rounded p-1 hover:bg-accent",
            isEditing
              ? "opacity-50 cursor-not-allowed"
              : "cursor-grab touch-none active:cursor-grabbing"
          )}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>

        {/* Content section */}
        {renderContent()}

        {/* Action buttons */}
        <div
          className={cn(
            "flex items-center gap-1",
            !isEditing && "opacity-0 transition-opacity group-hover:opacity-100"
          )}
        >
          {isEditing ? (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleCancel}
              >
                <X className="h-3 w-3" />
                <span className="sr-only">Cancel</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleSave}
              >
                <Check className="h-3 w-3" />
                <span className="sr-only">Save</span>
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleEdit}
              >
                <Pencil className="h-4 w-4" />
                <span className="sr-only">Edit</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={handleDelete}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Delete</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Render children for object and array types */}
      {(node.type === "object" || node.type === "array") && (
        <div
          className={cn(
            "mt-2 space-y-2 border-l pl-4 transition-all duration-200",
            // Enhanced visual feedback for child drop zones
            globalIsDragging && canDrop && "border-primary/40",
            globalIsDragging && !canDrop && "border-destructive/30",
            activeDropZone === nodeId &&
              canDrop &&
              !node.children?.length &&
              "min-h-[60px] border border-dashed border-primary/50 rounded-lg bg-primary/5",
            activeDropZone === nodeId &&
              !canDrop &&
              !node.children?.length &&
              "min-h-[60px] border border-dashed border-destructive/50 rounded-lg bg-destructive/5",
            // Legacy hover state
            !globalIsDragging &&
              isOver &&
              !node.children?.length &&
              "min-h-[100px] border border-dashed border-primary/50 rounded-lg"
          )}
        >
          {node.children && node.children.length > 0 ? (
            <SortableContext
              items={node.children}
              strategy={verticalListSortingStrategy}
            >
              {node.children.map((childId) => (
                <FormNode
                  key={childId}
                  nodeId={childId}
                  selectedNodeId={selectedNodeId}
                  onSelect={onSelect}
                  isDragging={globalIsDragging}
                  draggedItem={draggedItem}
                  activeDropZone={activeDropZone}
                />
              ))}
            </SortableContext>
          ) : (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground py-4">
              {globalIsDragging ? (
                canDrop ? (
                  <span className="text-primary font-medium">
                    Drop fields here
                  </span>
                ) : (
                  <span className="text-destructive">
                    Cannot drop this field type here
                  </span>
                )
              ) : (
                "Drop fields here"
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

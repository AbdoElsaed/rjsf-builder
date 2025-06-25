import { useDraggable, useDroppable } from "@dnd-kit/core";
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

const FIELD_ICONS = {
  string: TextQuote,
  number: Hash,
  boolean: ToggleLeft,
  enum: List,
  object: Type,
  array: Layers,
} as const;

interface FormNodeProps {
  nodeId: string;
  selectedNodeId: string | null;
  onSelect: (nodeId: string | null) => void;
}

export function FormNode({ nodeId, selectedNodeId, onSelect }: FormNodeProps) {
  const { graph, updateNode, removeNode } = useSchemaGraphStore();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    required: false,
  });
  const node = graph.nodes[nodeId];
  const Icon = FIELD_ICONS[node.type];

  // Make the node draggable
  const {
    attributes,
    listeners,
    setNodeRef: setDraggableRef,
    isDragging,
  } = useDraggable({
    id: `draggable-${nodeId}`,
    data: {
      nodeId,
      type: node.type,
      parentId: node.parentId,
    },
  });

  // Make object and array nodes droppable
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: `droppable-${nodeId}`,
    data: {
      nodeId,
      type: node.type,
      parentId: node.parentId,
    },
    disabled: node.type !== "object" && node.type !== "array",
  });

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    removeNode(nodeId);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFormData({
      title: node.title,
      description: node.description || "",
      required: node.required || false,
    });
    setIsEditing(true);
    onSelect(nodeId);
  };

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateNode(nodeId, {
      title: formData.title,
      description: formData.description || undefined,
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
    "group relative rounded-lg border bg-card shadow-sm transition-colors",
    isDragging && "opacity-50",
    isOver && "ring-2 ring-primary/20",
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
        {node.description && (
          <span className="text-xs text-muted-foreground">
            ({node.description})
          </span>
        )}
        {node.required && <span className="text-xs text-primary">*</span>}
      </div>
    );
  };

  // Combine draggable and droppable refs if needed
  const setRefs = (element: HTMLDivElement) => {
    setDraggableRef(element);
    if (node.type === "object" || node.type === "array") {
      setDroppableRef(element);
    }
  };

  return (
    <div
      ref={setRefs}
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
      {(node.type === "object" || node.type === "array") &&
        node.children &&
        node.children.length > 0 && (
          <div className="mt-2 space-y-2 border-l pl-4">
            {node.children.map((childId) => (
              <FormNode
                key={childId}
                nodeId={childId}
                selectedNodeId={selectedNodeId}
                onSelect={onSelect}
              />
            ))}
          </div>
        )}
    </div>
  );
}

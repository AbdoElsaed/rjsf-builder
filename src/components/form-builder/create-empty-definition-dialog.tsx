import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, AlertCircle, Plus } from "lucide-react";
import { useSchemaGraphStore } from "@/lib/store/schema-graph";
import type { JSONSchemaType } from "@/lib/graph/schema-graph";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CreateEmptyDefinitionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (componentName: string, nodeId: string) => void;
}

const FIELD_TYPES = [
  { value: "object", label: "Object", description: "A container for nested fields" },
  { value: "array", label: "List", description: "A list of items" },
  { value: "string", label: "Text", description: "A text input field" },
  { value: "number", label: "Number", description: "A number input field" },
  { value: "boolean", label: "Yes/No", description: "A checkbox field" },
] as const;

export function CreateEmptyDefinitionDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateEmptyDefinitionDialogProps) {
  const { graph, addNode, saveAsDefinition } = useSchemaGraphStore();
  const [componentName, setComponentName] = useState("");
  const [fieldType, setFieldType] = useState<string>("object");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setComponentName("");
      setFieldType("object");
      setError(null);
    }
  }, [open]);

  const handleCreate = async () => {
    if (!componentName.trim()) {
      setError("Component name is required");
      return;
    }

    // Validate name (alphanumeric and underscores only)
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(componentName)) {
      setError("Name must start with a letter and contain only letters, numbers, and underscores");
      return;
    }

    // Check if definition already exists
    if (graph.definitions.has(componentName)) {
      setError(`A definition named "${componentName}" already exists`);
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      // Create a new empty node of the selected type
      const nodeData = {
        type: fieldType as JSONSchemaType,
        title: componentName,
        key: componentName.toLowerCase(),
      };

      // Add node to root temporarily (we'll disconnect it)
      const newNodeId = addNode(nodeData, "root");

      // Save as definition and disconnect from tree
      saveAsDefinition(newNodeId, componentName, true);

      toast.success(`Definition "${componentName}" created`, {
        description: "You can now add fields to this definition and use it anywhere",
      });

      onCreated?.(componentName, newNodeId);
      onOpenChange(false);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to create definition";
      setError(errorMessage);
      toast.error("Failed to create definition", {
        description: errorMessage,
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancel = () => {
    setComponentName("");
    setFieldType("object");
    setError(null);
    onOpenChange(false);
  };

  const selectedType = FIELD_TYPES.find((t) => t.value === fieldType);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Plus className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Create New Definition</DialogTitle>
              <DialogDescription className="mt-1">
                Create an empty reusable definition that you can build later
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Component Name Input */}
          <div className="space-y-2">
            <Label htmlFor="component-name" className="text-sm font-medium">
              Definition Name
            </Label>
            <Input
              id="component-name"
              value={componentName}
              onChange={(e) => {
                setComponentName(e.target.value);
                setError(null);
              }}
              placeholder="e.g., Address, ContactInfo, PaymentMethod"
              className={error ? "border-destructive" : ""}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && !isCreating) {
                  handleCreate();
                }
              }}
            />
            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Use letters, numbers, and underscores. Must start with a letter.
            </p>
          </div>

          {/* Field Type Selection */}
          <div className="space-y-2">
            <Label htmlFor="field-type" className="text-sm font-medium">
              Definition Type
            </Label>
            <Select value={fieldType} onValueChange={setFieldType}>
              <SelectTrigger id="field-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FIELD_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex flex-col">
                      <span className="font-medium">{type.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {type.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedType && (
              <p className="text-xs text-muted-foreground">
                {selectedType.description}
              </p>
            )}
          </div>

          {/* Info Box */}
          <div className="flex items-start gap-2 rounded-lg bg-primary/5 border border-primary/20 p-3">
            <Sparkles className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <div className="text-xs text-muted-foreground">
              <p className="font-medium text-foreground mb-1">
                What happens next?
              </p>
              <ul className="space-y-1 list-disc list-inside">
                <li>An empty {selectedType?.label.toLowerCase()} definition will be created</li>
                <li>You can add fields to it from the Definitions panel</li>
                <li>Once built, drag it from the palette to use anywhere</li>
              </ul>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isCreating}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isCreating || !componentName.trim()}>
            {isCreating ? "Creating..." : "Create Definition"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


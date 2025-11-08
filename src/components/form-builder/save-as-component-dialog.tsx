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
import { Checkbox } from "@/components/ui/checkbox";
import { Bookmark, Sparkles, AlertCircle } from "lucide-react";
import { useSchemaGraphStore } from "@/lib/store/schema-graph";
import { getChildren } from "@/lib/graph/schema-graph";
import { toast } from "sonner";

interface SaveAsComponentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodeId: string;
  onSaved?: (componentName: string) => void;
}

export function SaveAsComponentDialog({
  open,
  onOpenChange,
  nodeId,
  onSaved,
}: SaveAsComponentDialogProps) {
  const { graph, getNode } = useSchemaGraphStore();
  const node = getNode(nodeId);
  const [componentName, setComponentName] = useState("");
  const [replaceWithReference, setReplaceWithReference] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-suggest name from node title/key
  useEffect(() => {
    if (open && node) {
      const suggestedName = node.title || node.key || "Component";
      // Convert to PascalCase and remove special chars
      const sanitized = suggestedName
        .replace(/[^a-zA-Z0-9\s]/g, "")
        .split(/\s+/)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join("");
      setComponentName(sanitized || "Component");
      setError(null);
    }
  }, [open, node]);

  // Get field structure preview
  const getFieldPreview = (nodeId: string, depth = 0): string[] => {
    const node = graph.nodes.get(nodeId);
    if (!node) return [];

    const lines: string[] = [];
    const indent = "  ".repeat(depth);
    
    if (depth === 0) {
      lines.push(`${node.title || node.key || "Component"}`);
    } else {
      lines.push(`${indent}• ${node.title || node.key || "field"}: ${node.type}`);
    }

    const children = getChildren(graph, nodeId, "child");
    children.forEach((child) => {
      lines.push(...getFieldPreview(child.id, depth + 1));
    });

    return lines;
  };

  const fieldPreview = node ? getFieldPreview(nodeId) : [];

  const handleSave = async () => {
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

    setIsSaving(true);
    setError(null);

    try {
      // Get parent before saving (from current graph)
      const parentNode = graph.parentIndex.get(nodeId);
      const nodeKey = node?.key;
      
      if (!parentNode) {
        setError("Cannot find parent node");
        return;
      }

      const { saveAsDefinition, createRefToDefinition: createRef } = useSchemaGraphStore.getState();

      // If replacing with reference, we need to:
      // 1. Save as definition AND disconnect from tree
      // 2. Create a reference in the same location
      if (replaceWithReference && nodeKey) {
        saveAsDefinition(nodeId, componentName, true); // true = disconnect from tree
        createRef(componentName, parentNode, nodeKey);
      } else {
        // Just save as definition, keep in place
        saveAsDefinition(nodeId, componentName, false); // false = keep in tree
      }

      toast.success(`Definition "${componentName}" saved successfully`, {
        description: replaceWithReference
          ? "This field has been replaced with a reference"
          : "You can now use this definition from the palette",
      });

      onSaved?.(componentName);
      onOpenChange(false);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to save definition";
      setError(errorMessage);
      toast.error("Failed to save definition", {
        description: errorMessage,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setComponentName("");
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Bookmark className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Save as Reusable Definition</DialogTitle>
              <DialogDescription className="mt-1">
                Create a reusable definition that can be used anywhere in your form
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
              placeholder="e.g., Address, ContactInfo"
              className={error ? "border-destructive" : ""}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && !isSaving) {
                  handleSave();
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

          {/* Field Preview */}
          {fieldPreview.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Definition Structure</Label>
              <div className="rounded-md border border-border bg-muted/30 p-3 max-h-[150px] overflow-y-auto">
                <div className="space-y-1 font-mono text-xs">
                  {fieldPreview.map((line, idx) => (
                    <div key={idx} className="text-muted-foreground">
                      {line}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Options */}
          <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
            <div className="flex items-start gap-3">
              <Checkbox
                id="replace-ref"
                checked={replaceWithReference}
                onCheckedChange={(checked) =>
                  setReplaceWithReference(checked === true)
                }
                className="mt-0.5"
              />
              <div className="flex-1 space-y-1">
                <Label
                  htmlFor="replace-ref"
                  className="text-sm font-medium cursor-pointer"
                >
                  Replace this field with a reference
                </Label>
                <p className="text-xs text-muted-foreground">
                  The original field will be replaced with a reference to this definition.
                  Changes to the definition will automatically update all references.
                </p>
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="flex items-start gap-2 rounded-lg bg-primary/5 border border-primary/20 p-3">
            <Sparkles className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <div className="text-xs text-muted-foreground">
              <p className="font-medium text-foreground mb-1">
                What happens next?
              </p>
              <ul className="space-y-1 list-disc list-inside">
                <li>Definition will appear in the Definitions section of the palette</li>
                <li>You can drag it anywhere to reuse this structure</li>
                <li>Editing the definition updates all references automatically</li>
              </ul>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !componentName.trim()}>
            {isSaving ? "Saving..." : "Save Definition"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


import { useSchemaGraphStore } from "@/lib/store/schema-graph";
import { useUiSchemaStore } from "@/lib/store/ui-schema";
import { useFormDataStore } from "@/lib/store/form-data";
import type {
  FieldConfig,
  StringFieldConfig,
  NumberFieldConfig,
  BooleanFieldConfig,
  ArrayFieldConfig,
  ObjectFieldConfig,
  EnumFieldConfig,
} from "@/lib/types/field-config";
import type { FieldNode } from "@/lib/store/schema-graph";
import type { RJSFSchema } from "@rjsf/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { getNodePath, titleToKey, generateUniqueKey } from "@/lib/utils";
import { WidgetSelector } from "./widget-selector";
import { getChildren } from "@/lib/graph/schema-graph";

interface FieldConfigPanelProps {
  nodeId: string | null;
  onSave?: () => void;
  onCancel?: () => void;
}

type FieldNodeWithConfig = FieldNode & FieldConfig;

export function FieldConfigPanel({
  nodeId,
  onSave,
  onCancel,
}: FieldConfigPanelProps) {
  const { graph, updateNode, compileToJsonSchema, getNode } = useSchemaGraphStore();
  const { updateFieldUiSchema, removeFieldUiSchema } = useUiSchemaStore();
  const { migrateFormData } = useFormDataStore();

  // Store both form data and node-specific config in local state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    key: "",
    required: false,
  });
  const [nodeConfig, setNodeConfig] = useState<FieldNodeWithConfig | null>(
    null
  );
  const [initialNode, setInitialNode] = useState<FieldNodeWithConfig | null>(
    null
  );
  const [keyWasManuallyEdited, setKeyWasManuallyEdited] = useState(false);

  useEffect(() => {
    if (nodeId && graph.nodes.has(nodeId)) {
      const node = graph.nodes.get(nodeId) as FieldNodeWithConfig | undefined;
      if (!node) return;
      setInitialNode(node);
      setNodeConfig(node);
      setFormData({
        title: node.title,
        description: node.description || "",
        key: node.key,
        required: node.required || false,
      });
      // Reset manual edit flag when node changes
      setKeyWasManuallyEdited(false);
    }
  }, [nodeId, graph.nodes]);

  if (!nodeId || !graph.nodes.has(nodeId) || !nodeConfig) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        Select a field to configure
      </div>
    );
  }

  // Type guard functions
  const isStringField = (
    node: FieldNodeWithConfig
  ): node is FieldNode & StringFieldConfig => node.type === "string";
  const isNumberField = (
    node: FieldNodeWithConfig
  ): node is FieldNode & NumberFieldConfig => node.type === "number";
  const isBooleanField = (
    node: FieldNodeWithConfig
  ): node is FieldNode & BooleanFieldConfig => node.type === "boolean";
  const isArrayField = (
    node: FieldNodeWithConfig
  ): node is FieldNode & ArrayFieldConfig => node.type === "array";
  const isObjectField = (
    node: FieldNodeWithConfig
  ): node is FieldNode & ObjectFieldConfig => node.type === "object";
  const isEnumField = (
    node: FieldNodeWithConfig
  ): node is FieldNode & EnumFieldConfig => node.type === "enum";

  const handleSave = () => {
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
    const parentId = nodeConfig.parentId || 'root';
    const parent = getNode(parentId);
    const siblings = parent ? getChildren(graph, parentId, 'child').map(n => n.id) : [];
    const hasDuplicateKey = siblings.some((siblingId) => {
      if (siblingId === nodeId) return false; // Skip self
      const sibling = getNode(siblingId);
      return sibling?.key === formattedKey;
    });

    if (hasDuplicateKey) {
      toast.error("Key must be unique among siblings");
      return;
    }

    // Create a copy of the current schema before updating
    const oldSchema = compileToJsonSchema() as RJSFSchema;

    // Get the current node path before updating
    const oldPath = nodeConfig ? getNodePath(graph, nodeId) : "";

    // Update the node with all accumulated changes
    const updatedNode = {
      ...nodeConfig,
      title: formData.title,
      description: formData.description || undefined,
      key: formattedKey,
      required: formData.required,
    };

    updateNode(nodeId, updatedNode);

    // Create a copy of the updated schema
    const newSchema = compileToJsonSchema() as RJSFSchema;

    // Get the new node path after updating
    const newPath = getNodePath(graph, nodeId);

    // If the key has changed, migrate the form data and update UI schema path
    if (oldPath !== newPath) {
      migrateFormData(oldSchema, newSchema);
      if (nodeConfig?.ui) {
        // Remove the old UI schema entry
        removeFieldUiSchema(oldPath);
        // Add the new UI schema entry
        updateFieldUiSchema(newPath, nodeConfig.ui);
      }
    } else if (nodeConfig?.ui) {
      // Just update the UI schema if the path hasn't changed
      updateFieldUiSchema(newPath, nodeConfig.ui);
    }

    onSave?.();
  };

  const handleCancel = () => {
    if (initialNode) {
      // Restore the initial node state
      setNodeConfig(initialNode);
      setFormData({
        title: initialNode.title,
        description: initialNode.description || "",
        key: initialNode.key,
        required: initialNode.required || false,
      });
    }
    onCancel?.();
  };

  const handleConfigChange = (
    key: string,
    value: string | number | boolean | string[] | undefined
  ) => {
    setNodeConfig((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [key]: value,
      } as FieldNodeWithConfig;
    });
  };

  const handleUiConfigChange = (
    key: string,
    value: string | number | boolean | Record<string, unknown> | undefined
  ) => {
    setNodeConfig((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        ui: {
          ...prev.ui,
          [key]: value,
        },
      } as FieldNodeWithConfig;
    });
  };

  const handleArrayOptionsChange = (key: string, value: boolean) => {
    setNodeConfig((prev) => {
      if (!prev) return prev;
      const currentOptions = prev.ui?.["ui:options"] || {};
      return {
        ...prev,
        ui: {
          ...prev.ui,
          "ui:options": {
            ...currentOptions,
            [key]: value,
          },
        },
      } as FieldNodeWithConfig;
    });
  };

  const renderTypeSpecificConfig = () => {
    switch (nodeConfig.type) {
      case "string":
        return renderStringConfig();
      case "number":
        return renderNumberConfig();
      case "boolean":
        return renderBooleanConfig();
      case "array":
        return renderArrayConfig();
      case "object":
        return renderObjectConfig();
      case "enum":
        return renderEnumConfig();
      default:
        return null;
    }
  };

  const renderStringConfig = () => {
    if (!isStringField(nodeConfig)) return null;
    return (
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Format</Label>
            <Select
              value={nodeConfig.format || "none"}
              onValueChange={(value) =>
                handleConfigChange(
                  "format",
                  value === "none" ? undefined : value
                )
              }
            >
              <SelectTrigger className="h-7 text-sm">
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="uri">URI</SelectItem>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="date-time">Date-Time</SelectItem>
                <SelectItem value="time">Time</SelectItem>
                <SelectItem value="ipv4">IPv4</SelectItem>
                <SelectItem value="ipv6">IPv6</SelectItem>
                <SelectItem value="hostname">Hostname</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <WidgetSelector
            fieldType={nodeConfig.type}
            value={nodeConfig.ui?.["ui:widget"]}
            onValueChange={(value) => handleUiConfigChange("ui:widget", value)}
            className="space-y-1.5"
          />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Min Length</Label>
            <Input
              type="number"
              value={nodeConfig.minLength || ""}
              onChange={(e) =>
                handleConfigChange(
                  "minLength",
                  e.target.value ? parseInt(e.target.value) : undefined
                )
              }
              className="h-7 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Max Length</Label>
            <Input
              type="number"
              value={nodeConfig.maxLength || ""}
              onChange={(e) =>
                handleConfigChange(
                  "maxLength",
                  e.target.value ? parseInt(e.target.value) : undefined
                )
              }
              className="h-7 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Pattern</Label>
            <Input
              value={nodeConfig.pattern || ""}
              onChange={(e) =>
                handleConfigChange("pattern", e.target.value || undefined)
              }
              placeholder="Regex"
              className="h-7 text-sm"
            />
          </div>
        </div>
      </div>
    );
  };

  const renderNumberConfig = () => {
    if (!isNumberField(nodeConfig)) return null;
    return (
      <div className="space-y-2">
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Minimum</Label>
            <Input
              type="number"
              value={nodeConfig.minimum || ""}
              onChange={(e) =>
                handleConfigChange(
                  "minimum",
                  e.target.value ? parseFloat(e.target.value) : undefined
                )
              }
              className="h-7 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Maximum</Label>
            <Input
              type="number"
              value={nodeConfig.maximum || ""}
              onChange={(e) =>
                handleConfigChange(
                  "maximum",
                  e.target.value ? parseFloat(e.target.value) : undefined
                )
              }
              className="h-7 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Multiple Of</Label>
            <Input
              type="number"
              value={nodeConfig.multipleOf || ""}
              onChange={(e) =>
                handleConfigChange(
                  "multipleOf",
                  e.target.value ? parseFloat(e.target.value) : undefined
                )
              }
              className="h-7 text-sm"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <WidgetSelector
            fieldType={nodeConfig.type}
            value={nodeConfig.ui?.["ui:widget"]}
            onValueChange={(value) => handleUiConfigChange("ui:widget", value)}
            className="space-y-1.5"
          />
        </div>
      </div>
    );
  };

  const renderBooleanConfig = () => {
    if (!isBooleanField(nodeConfig)) return null;
    return (
      <div className="space-y-2">
        <WidgetSelector
          fieldType={nodeConfig.type}
          value={nodeConfig.ui?.["ui:widget"]}
          onValueChange={(value) => handleUiConfigChange("ui:widget", value)}
          className="space-y-1.5"
        />
      </div>
    );
  };

  const renderArrayConfig = () => {
    if (!isArrayField(nodeConfig)) return null;
    return (
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Min Items</Label>
            <Input
              type="number"
              value={nodeConfig.minItems || ""}
              onChange={(e) =>
                handleConfigChange(
                  "minItems",
                  e.target.value ? parseInt(e.target.value) : undefined
                )
              }
              className="h-7 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Max Items</Label>
            <Input
              type="number"
              value={nodeConfig.maxItems || ""}
              onChange={(e) =>
                handleConfigChange(
                  "maxItems",
                  e.target.value ? parseInt(e.target.value) : undefined
                )
              }
              className="h-7 text-sm"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-1.5">
            <Switch
              id="uniqueItems"
              checked={nodeConfig.uniqueItems || false}
              onCheckedChange={(checked) =>
                handleConfigChange("uniqueItems", checked)
              }
              className="scale-75"
            />
            <Label htmlFor="uniqueItems" className="text-xs">
              Unique Items
            </Label>
          </div>
          <div className="flex items-center gap-1.5">
            <Switch
              id="additionalItems"
              checked={nodeConfig.additionalItems || false}
              onCheckedChange={(checked) =>
                handleConfigChange("additionalItems", checked)
              }
              className="scale-75"
            />
            <Label htmlFor="additionalItems" className="text-xs">
              Additional Items
            </Label>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="flex items-center gap-1.5">
            <Switch
              id="addable"
              checked={nodeConfig.ui?.["ui:options"]?.addable ?? true}
              onCheckedChange={(checked) =>
                handleArrayOptionsChange("addable", checked)
              }
              className="scale-75"
            />
            <Label htmlFor="addable" className="text-xs">
              Add
            </Label>
          </div>
          <div className="flex items-center gap-1.5">
            <Switch
              id="orderable"
              checked={nodeConfig.ui?.["ui:options"]?.orderable ?? true}
              onCheckedChange={(checked) =>
                handleArrayOptionsChange("orderable", checked)
              }
              className="scale-75"
            />
            <Label htmlFor="orderable" className="text-xs">
              Order
            </Label>
          </div>
          <div className="flex items-center gap-1.5">
            <Switch
              id="removable"
              checked={nodeConfig.ui?.["ui:options"]?.removable ?? true}
              onCheckedChange={(checked) =>
                handleArrayOptionsChange("removable", checked)
              }
              className="scale-75"
            />
            <Label htmlFor="removable" className="text-xs">
              Remove
            </Label>
          </div>
        </div>
      </div>
    );
  };

  const renderObjectConfig = () => {
    if (!isObjectField(nodeConfig)) return null;
    return (
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Min Properties</Label>
            <Input
              type="number"
              value={nodeConfig.minProperties || ""}
              onChange={(e) =>
                handleConfigChange(
                  "minProperties",
                  e.target.value ? parseInt(e.target.value) : undefined
                )
              }
              className="h-7 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Max Properties</Label>
            <Input
              type="number"
              value={nodeConfig.maxProperties || ""}
              onChange={(e) =>
                handleConfigChange(
                  "maxProperties",
                  e.target.value ? parseInt(e.target.value) : undefined
                )
              }
              className="h-7 text-sm"
            />
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Switch
            id="additionalProperties"
            checked={nodeConfig.additionalProperties || false}
            onCheckedChange={(checked) =>
              handleConfigChange("additionalProperties", checked)
            }
            className="scale-75"
          />
          <Label htmlFor="additionalProperties" className="text-xs">
            Additional Properties
          </Label>
        </div>
      </div>
    );
  };

  const renderEnumConfig = () => {
    if (!isEnumField(nodeConfig)) return null;
    return (
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Options (one per line)</Label>
            <Textarea
              value={(nodeConfig.enum || []).join("\n")}
              onChange={(e) =>
                handleConfigChange(
                  "enum",
                  e.target.value.split("\n").filter(Boolean)
                )
              }
              className="min-h-[80px] text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Display Names (one per line)</Label>
            <Textarea
              value={(nodeConfig.enumNames || []).join("\n")}
              onChange={(e) =>
                handleConfigChange(
                  "enumNames",
                  e.target.value.split("\n").filter(Boolean)
                )
              }
              className="min-h-[80px] text-sm"
            />
          </div>
        </div>
        <WidgetSelector
          fieldType={nodeConfig.type}
          value={nodeConfig.ui?.["ui:widget"]}
          onValueChange={(value) => handleUiConfigChange("ui:widget", value)}
          className="space-y-1.5"
        />
      </div>
    );
  };

  return (
    <div className="relative p-2 space-y-3">
      {/* Top Action Icons */}
      <div className="absolute top-2 right-2 flex gap-1.5">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleCancel}
          className="h-6 w-6 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleSave}
          className="h-6 w-6 text-muted-foreground hover:text-foreground"
        >
          <Check className="h-4 w-4" />
        </Button>
      </div>

      {/* Basic Configuration */}
      <div className="space-y-2 mt-6">
        <div className="grid grid-cols-[1fr,1fr] gap-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Title</Label>
            <Input
              value={formData.title}
              onChange={(e) => {
                const newTitle = e.target.value;
                setFormData((prev) => {
                  // Auto-generate key from title if key hasn't been manually edited
                  // or if current key matches the auto-generated key from initial title
                  const shouldAutoGenerate = !keyWasManuallyEdited || 
                    (initialNode && prev.key === titleToKey(initialNode.title));
                  
                  if (shouldAutoGenerate && nodeConfig) {
                    // Get parent ID from graph
                    const parentId = graph.parentIndex.get(nodeId!) || 'root';
                    const newKey = generateUniqueKey(graph, newTitle, parentId, nodeId!);
                    return { ...prev, title: newTitle, key: newKey };
                  }
                  
                  return { ...prev, title: newTitle };
                });
              }}
              placeholder="Field title"
              className="h-7 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Key</Label>
            <Input
              value={formData.key}
              onChange={(e) => {
                setKeyWasManuallyEdited(true);
                setFormData((prev) => ({ ...prev, key: e.target.value }));
              }}
              placeholder="Field key"
              className="h-7 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-[1fr,auto] gap-2 items-start">
          <div className="space-y-1.5">
            <Label className="text-xs">Description</Label>
            <Input
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              placeholder="Field description"
              className="h-7 text-sm"
            />
          </div>
          <div className="space-y-1.5 pt-5">
            <div className="flex items-center gap-1.5">
              <Switch
                id="required"
                checked={formData.required}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, required: checked }))
                }
                className="scale-75"
              />
              <Label htmlFor="required" className="text-xs">
                Required
              </Label>
            </div>
          </div>
        </div>
      </div>

      {/* Type-specific Configuration */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">
          Type-specific Configuration
        </Label>
        {renderTypeSpecificConfig()}
      </div>
    </div>
  );
}

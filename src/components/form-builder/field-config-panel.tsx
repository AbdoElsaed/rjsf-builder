import { useSchemaGraphStore } from "@/lib/store/schema-graph";
import { useUiSchemaStore } from "@/lib/store/ui-schema";
import { useFormDataStore } from "@/lib/store/form-data";
import type {
  FieldConfig,
} from "@/lib/types/field-config";
import type { FieldNode } from "@/lib/store/schema-graph";
import type { RJSFSchema } from "@rjsf/utils";
import { Button } from "@/components/ui/button";
import { Check, X, ChevronRight, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect, useMemo } from "react";
import { getNodePath, titleToKey, generateUniqueKey } from "@/lib/utils";
import { getChildren, getParent } from "@/lib/graph/schema-graph";
import type { SchemaNode } from "@/lib/graph/schema-graph";
import { cn } from "@/lib/utils";
// Note: Field config components now used by ValidationSection, not directly here
// Import smart property config system
import {
  getFieldTypeLabel,
  getFieldTypeCategory,
  shouldShowProperty,
  isDataField,
} from "@/lib/config/field-property-config";
import {
  getFieldTypeMetadata,
  CATEGORY_CONFIG,
} from "@/lib/config/field-type-metadata";
// Import sectioned components
import {
  BasicPropertiesSection,
  DataPropertiesSection,
  ValidationSection,
  UICustomizationSection,
} from "./config-sections";

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
  
  // Expose header data for parent component (if needed)
  // For now, we'll keep header in this component but make it sticky
  const { updateFieldUiSchema, removeFieldUiSchema } = useUiSchemaStore();
  const { migrateFormData } = useFormDataStore();

  // Store both form data and node-specific config in local state
  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    key: string;
    required: boolean;
    default: string | number | boolean | undefined;
  }>({
    title: "",
    description: "",
    key: "",
    required: false,
    default: undefined,
  });
  const [nodeConfig, setNodeConfig] = useState<FieldNodeWithConfig | null>(
    null
  );
  const [initialNode, setInitialNode] = useState<FieldNodeWithConfig | null>(
    null
  );
  const [keyWasManuallyEdited, setKeyWasManuallyEdited] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Build breadcrumb path
  const breadcrumbPath = useMemo(() => {
    if (!nodeId) return [];
    const path: Array<{ id: string; title: string }> = [];
    let currentId: string | null = nodeId;
    const visited = new Set<string>();

    while (currentId && currentId !== 'root') {
      if (visited.has(currentId)) break;
      visited.add(currentId);

      const node = getNode(currentId);
      if (!node) break;

      path.unshift({ id: currentId, title: node.title || node.key || 'Field' });
      const parent = getParent(graph, currentId);
      currentId = parent?.id || null;
    }

    return path;
  }, [nodeId, graph, getNode]);

  // Smart breadcrumb: show first item, last 2-3 items, and "..." in between if needed
  const getBreadcrumbDisplay = useMemo(() => {
    if (breadcrumbPath.length <= 4) {
      // Show all items if 4 or fewer
      return { items: breadcrumbPath, showEllipsis: false };
    }
    
    // Show first item, last 2 items, and ellipsis in between
    const first = breadcrumbPath[0];
    const last = breadcrumbPath.slice(-2);
    return {
      items: [first, ...last],
      showEllipsis: true,
      fullPath: breadcrumbPath.map(item => item.title).join(' > '),
    };
  }, [breadcrumbPath]);

  useEffect(() => {
    if (nodeId && graph.nodes.has(nodeId)) {
      const node = graph.nodes.get(nodeId) as FieldNodeWithConfig | undefined;
      if (!node) return;
      setInitialNode(node);
      setNodeConfig(node);
      // Extract default value, ensuring it's a primitive type
      let defaultValue: string | number | boolean | undefined = undefined;
      if (node.default !== undefined && node.default !== null) {
        const defaultValueType = typeof node.default;
        if (defaultValueType === 'string' || defaultValueType === 'number' || defaultValueType === 'boolean') {
          defaultValue = node.default as string | number | boolean;
        }
      }

      setFormData({
        title: node.title,
        description: node.description || "",
        key: node.key,
        required: node.required || false,
        default: defaultValue,
      });
      // Reset manual edit flag when node changes
      setKeyWasManuallyEdited(false);
      setHasUnsavedChanges(false);
    }
  }, [nodeId, graph.nodes]);

  // Detect unsaved changes
  useEffect(() => {
    if (!initialNode || !nodeConfig) {
      setHasUnsavedChanges(false);
      return;
    }

    const hasChanges = 
      formData.title !== initialNode.title ||
      formData.description !== (initialNode.description || "") ||
      formData.key !== initialNode.key ||
      formData.required !== (initialNode.required || false) ||
      formData.default !== (initialNode.default !== undefined && initialNode.default !== null 
        ? (typeof initialNode.default === 'string' || typeof initialNode.default === 'number' || typeof initialNode.default === 'boolean'
          ? initialNode.default 
          : undefined)
        : undefined) ||
      JSON.stringify(nodeConfig.ui || {}) !== JSON.stringify(initialNode.ui || {}) ||
      (nodeConfig.type === 'number' && (
        nodeConfig.minimum !== initialNode.minimum ||
        nodeConfig.maximum !== initialNode.maximum ||
        nodeConfig.multipleOf !== initialNode.multipleOf
      )) ||
      (nodeConfig.type === 'string' && (
        nodeConfig.minLength !== initialNode.minLength ||
        nodeConfig.maxLength !== initialNode.maxLength ||
        nodeConfig.pattern !== initialNode.pattern ||
        nodeConfig.format !== initialNode.format
      )) ||
      (nodeConfig.type === 'enum' && (
        JSON.stringify(nodeConfig.enum || []) !== JSON.stringify(initialNode.enum || []) ||
        JSON.stringify(nodeConfig.enumNames || []) !== JSON.stringify(initialNode.enumNames || [])
      ));

    setHasUnsavedChanges(hasChanges);
  }, [formData, nodeConfig, initialNode]);

  if (!nodeId || !graph.nodes.has(nodeId) || !nodeConfig) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        Select a field to configure
      </div>
    );
  }

  // Note: Type guards removed - now handled by ValidationSection component

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
    const parentId = graph.parentIndex.get(nodeId) || 'root';
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

    // Parse default value based on type
    let parsedDefault: string | number | boolean | undefined = undefined;
    if (formData.default !== undefined && formData.default !== '') {
      if (nodeConfig.type === 'number') {
        const numValue = Number(formData.default);
        if (isNaN(numValue)) {
          toast.error("Default value must be a valid number");
          return;
        }
        parsedDefault = numValue;
      } else if (nodeConfig.type === 'boolean') {
        parsedDefault = formData.default === 'true' || formData.default === true;
      } else {
        parsedDefault = String(formData.default);
      }
    }

    // Get the CURRENT node from the graph (not local state) to preserve all properties
    const currentNodeInGraph = graph.nodes.get(nodeId);
    if (!currentNodeInGraph) {
      toast.error("Node not found in graph");
      return;
    }

    // Build the updates object with only the properties we're changing
    // This ensures we preserve ALL existing properties (especially important for objects with children)
    const updates: Partial<SchemaNode> = {
      title: formData.title,
      description: formData.description || undefined,
      key: formattedKey,
      required: formData.required,
      default: parsedDefault,
      // Apply type-specific updates from nodeConfig (user may have changed these)
      ...(nodeConfig.type === 'number' && {
        minimum: nodeConfig.minimum,
        maximum: nodeConfig.maximum,
        multipleOf: nodeConfig.multipleOf,
        exclusiveMinimum: nodeConfig.exclusiveMinimum,
        exclusiveMaximum: nodeConfig.exclusiveMaximum,
      }),
      ...(nodeConfig.type === 'string' && {
        minLength: nodeConfig.minLength,
        maxLength: nodeConfig.maxLength,
        pattern: nodeConfig.pattern,
        format: nodeConfig.format,
      }),
      ...(nodeConfig.type === 'array' && {
        minItems: nodeConfig.minItems,
        maxItems: nodeConfig.maxItems,
        uniqueItems: nodeConfig.uniqueItems,
        additionalItems: nodeConfig.additionalItems,
      }),
      ...(nodeConfig.type === 'object' && {
        minProperties: nodeConfig.minProperties,
        maxProperties: nodeConfig.maxProperties,
        additionalProperties: nodeConfig.additionalProperties,
      }),
      ...(nodeConfig.type === 'enum' && {
        enum: nodeConfig.enum,
        enumNames: nodeConfig.enumNames,
      }),
      // Update UI config if it exists
      ...(nodeConfig.ui && { ui: nodeConfig.ui }),
    };

    // updateNode will merge these updates with the current node, preserving all other properties
    updateNode(nodeId, updates);

    // CRITICAL: Get the NEW graph after update (Zustand updates are synchronous)
    const updatedGraph = useSchemaGraphStore.getState().graph;

    // Create a copy of the updated schema using the UPDATED graph
    const { compileToJsonSchema: compile } = useSchemaGraphStore.getState();
    const newSchema = compile() as RJSFSchema;

    // Get the new node path after updating - use the UPDATED graph
    const newPath = getNodePath(updatedGraph, nodeId);

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
      
      // Extract default value, ensuring it's a primitive type
      let defaultValue: string | number | boolean | undefined = undefined;
      if (initialNode.default !== undefined && initialNode.default !== null) {
        const defaultValueType = typeof initialNode.default;
        if (defaultValueType === 'string' || defaultValueType === 'number' || defaultValueType === 'boolean') {
          defaultValue = initialNode.default as string | number | boolean;
        }
      }

      setFormData({
        title: initialNode.title,
        description: initialNode.description || "",
        key: initialNode.key,
        required: initialNode.required || false,
        default: defaultValue,
      });
    }
    onCancel?.();
  };

  const handleConfigChange = (
    key: string,
    value: unknown
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
    value: unknown
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

  // Note: Old render methods removed - now handled by section components (ValidationSection, etc.)

  const metadata = getFieldTypeMetadata(nodeConfig.type);
  const categoryConfig = CATEGORY_CONFIG[getFieldTypeCategory(nodeConfig.type)];
  const FieldIcon = metadata.icon;

  return (
    <div className="h-full flex flex-col">
      {/* Fixed Header Section - Sticky at top */}
      <div className="flex-shrink-0 bg-background/95 backdrop-blur-sm border-b border-border/50 sticky top-0 z-20 shadow-sm">
        <div className="p-4 space-y-3">
          {/* Breadcrumb Navigation - Smart truncation for long paths */}
          {breadcrumbPath.length > 1 && (
            <div 
              className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0 overflow-hidden"
              title={getBreadcrumbDisplay.fullPath || breadcrumbPath.map(item => item.title).join(' > ')}
            >
              {getBreadcrumbDisplay.items.map((item, displayIndex) => {
                const isLast = displayIndex === getBreadcrumbDisplay.items.length - 1;
                
                return (
                  <div key={item.id} className="flex items-center gap-1.5 flex-shrink-0 min-w-0">
                    {displayIndex > 0 && (
                      <ChevronRight className="h-3 w-3 flex-shrink-0 text-muted-foreground/60" />
                    )}
                    {/* Show ellipsis before last items if needed */}
                    {getBreadcrumbDisplay.showEllipsis && displayIndex === 1 && (
                      <>
                        <span className="text-muted-foreground/60 px-1">...</span>
                        <ChevronRight className="h-3 w-3 flex-shrink-0 text-muted-foreground/60" />
                      </>
                    )}
                    <span 
                      className={cn(
                        "truncate max-w-[140px] sm:max-w-[180px]",
                        isLast && "font-medium text-foreground"
                      )}
                      title={item.title}
                    >
                      {item.title}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Enhanced Header with Icon, Badge, and Actions */}
          <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Field Type Icon */}
            <div className={cn(
              "flex-shrink-0 p-2.5 rounded-lg transition-all duration-200",
              metadata.bgColor,
              "shadow-sm"
            )}>
              <FieldIcon className={cn("h-5 w-5", metadata.color)} />
            </div>
            
            {/* Field Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                <span className={cn(
                  "text-xs font-medium px-2 py-0.5 rounded-full transition-colors",
                  categoryConfig.bgColor,
                  categoryConfig.color
                )}>
                  {categoryConfig.label}
                </span>
                <span className="text-xs text-muted-foreground">•</span>
                <span className="text-sm font-semibold text-foreground">
                  {getFieldTypeLabel(nodeConfig.type)}
                </span>
                {hasUnsavedChanges && (
                  <>
                    <span className="text-xs text-muted-foreground">•</span>
                    <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-500">
                      <AlertCircle className="h-3 w-3" />
                      <span>Unsaved</span>
                    </div>
                  </>
                )}
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                {metadata.description}
              </p>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-1.5 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className={cn(
                "h-8 gap-1.5 text-xs transition-all duration-200",
                hasUnsavedChanges 
                  ? "text-muted-foreground hover:text-destructive hover:bg-destructive/10" 
                  : "text-muted-foreground hover:text-foreground"
              )}
              title={hasUnsavedChanges ? "Discard changes" : "Cancel"}
            >
              <X className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Cancel</span>
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleSave}
              disabled={!hasUnsavedChanges}
              className={cn(
                "h-8 gap-1.5 text-xs transition-all duration-200",
                hasUnsavedChanges 
                  ? "bg-primary hover:bg-primary/90 shadow-sm" 
                  : "opacity-50 cursor-not-allowed"
              )}
              title={hasUnsavedChanges ? "Save changes" : "No changes to save"}
            >
              <Check className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Save</span>
            </Button>
          </div>
        </div>
        </div>
      </div>

      {/* Scrollable Content Section */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-5">
        {/* Basic Properties - Always shown */}
        <div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-200 delay-75">
          <BasicPropertiesSection
          fieldType={nodeConfig.type}
          title={formData.title}
          description={formData.description}
          fieldKey={formData.key}
          onTitleChange={(value) => {
            setFormData((prev) => {
              // Auto-generate key from title if key hasn't been manually edited
              const shouldAutoGenerate = !keyWasManuallyEdited || 
                (initialNode && prev.key === titleToKey(initialNode.title));
              
              if (shouldAutoGenerate && nodeConfig) {
                const parentId = graph.parentIndex.get(nodeId!) || 'root';
                const newKey = generateUniqueKey(graph, value, parentId, nodeId!);
                return { ...prev, title: value, key: newKey };
              }
              
              return { ...prev, title: value };
            });
          }}
          onDescriptionChange={(value) => 
            setFormData((prev) => ({ ...prev, description: value }))
          }
          onKeyChange={(value) => 
            setFormData((prev) => ({ ...prev, key: value }))
          }
          keyWasManuallyEdited={keyWasManuallyEdited}
          setKeyWasManuallyEdited={setKeyWasManuallyEdited}
          />
        </div>

        {/* Data Properties - Only for data fields */}
        {isDataField(nodeConfig.type) && (
          <div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-200 delay-100">
            <div className="border-t border-border/50 mb-5" />
            <DataPropertiesSection
              fieldType={nodeConfig.type}
              required={formData.required}
              defaultValue={formData.default}
              onRequiredChange={(value) => 
                setFormData((prev) => ({ ...prev, required: value }))
              }
              onDefaultChange={(value) => 
                setFormData((prev) => ({ ...prev, default: value }))
              }
            />
          </div>
        )}

        {/* Validation Section - Type-specific validation rules */}
        {(shouldShowProperty(nodeConfig.type, 'minLength') || 
          shouldShowProperty(nodeConfig.type, 'minimum') ||
          shouldShowProperty(nodeConfig.type, 'minItems') ||
          shouldShowProperty(nodeConfig.type, 'minProperties') ||
          shouldShowProperty(nodeConfig.type, 'enum')) && (
          <div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-200 delay-150">
            <div className="border-t border-border/50 mb-5" />
            <ValidationSection
              fieldType={nodeConfig.type}
              config={nodeConfig as unknown as Record<string, unknown>}
              onChange={handleConfigChange}
              onUiChange={handleUiConfigChange}
            />
          </div>
        )}

        {/* UI Customization - Widget selection */}
        {shouldShowProperty(nodeConfig.type, 'widget') && (
          <div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-200 delay-200">
            <div className="border-t border-border/50 mb-5" />
            <UICustomizationSection
            fieldType={nodeConfig.type}
            widget={nodeConfig.ui?.['ui:widget']}
            onWidgetChange={(value) => handleUiConfigChange('ui:widget', value)}
          />
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

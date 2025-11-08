import type { SchemaGraph, SchemaNode } from '../graph/schema-graph';
import { getChildren, getParent } from '../graph/schema-graph';
import type { UiSchema, NestedUiSchema } from '../store/ui-schema';
import { getWidgetRegistry } from '../widgets/widget-registry';
import { compileToJsonSchema } from '../graph/schema-compiler';
import type { RJSFSchema } from '@rjsf/utils';

// UI Schema generation cache to avoid regenerating unchanged graphs
const uiSchemaCache = new WeakMap<SchemaGraph, NestedUiSchema>();

/**
 * Generate UI schema from a SchemaGraph
 * Automatically assigns widgets based on field types and auto-mapping rules
 * 
 * CRITICAL: ui:order is generated from the ACTUAL compiled JSON schema,
 * not from the graph structure, to ensure perfect matching
 * 
 * Optimized: Uses WeakMap cache to avoid regenerating unchanged graphs
 */
export function generateUiSchema(
  graph: SchemaGraph,
  widgetRegistry = getWidgetRegistry()
): NestedUiSchema {
  // Check cache first
  const cached = uiSchemaCache.get(graph);
  if (cached) {
    return cached;
  }
  
  const uiSchema: NestedUiSchema = {};
  
  // Start from root and traverse the graph
  const rootNode = graph.nodes.get(graph.rootId);
  if (!rootNode) {
    return uiSchema;
  }

  // Build UI schema recursively (for widgets and field-specific options)
  buildUiSchemaForNode(graph, rootNode, '', uiSchema, widgetRegistry);

  // CRITICAL: Generate ui:order from the ACTUAL compiled JSON schema
  // This ensures perfect matching - if a property exists in JSON schema,
  // it MUST be in ui:order, and vice versa
  const compiledSchema = compileToJsonSchema(graph);
  ensureOrderMatchesCompiledSchema(uiSchema, compiledSchema);

  // Cache the result
  uiSchemaCache.set(graph, uiSchema);

  return uiSchema;
}

/**
 * Ensure ui:order arrays match the ACTUAL compiled JSON schema properties
 * This is the ROOT FIX: Read from compiled schema, not graph structure
 * This ensures perfect matching and prevents RJSF validation errors
 */
function ensureWildcardOrder(order: string[]): string[] {
  const normalizedOrder: string[] = [];

  for (const key of order) {
    const trimmedKey = typeof key === 'string' ? key.trim() : '';
    if (!trimmedKey) continue;

    if (!normalizedOrder.includes(trimmedKey)) {
      normalizedOrder.push(trimmedKey);
    }
  }

  if (!normalizedOrder.includes('*')) {
    normalizedOrder.push('*');
  }

  return normalizedOrder;
}

function ensureOrderMatchesCompiledSchema(
  uiSchema: NestedUiSchema,
  compiledSchema: RJSFSchema
): void {
  // Process root level
  if (compiledSchema.type === 'object' && compiledSchema.properties) {
    const rootProperties = Object.keys(compiledSchema.properties);
    if (rootProperties.length > 0) {
      // Set root ui:order to match actual properties in JSON schema
      // Type assertion needed because NestedUiSchema can have ui:order at root
      (uiSchema as Record<string, unknown>)['ui:order'] = ensureWildcardOrder(rootProperties);
    }
  }
  
  // Recursively process nested objects in UI schema
  for (const key in uiSchema) {
    // Skip UI schema metadata keys
    if (key === 'ui:order' || key === 'ui:widget' || key === 'ui:options' || 
        key === 'ui:collapsible' || key === 'ui:collapsed' || 
        key === 'ui:disabled' || key === 'ui:readonly') {
      continue;
    }
    
    const nested = uiSchema[key];
    if (nested && typeof nested === 'object' && !('ui:widget' in nested)) {
      // It's a nested object - find corresponding property in compiled schema
      const propertySchema = getNestedProperty(compiledSchema, key);
      
      if (propertySchema && propertySchema.type === 'object' && propertySchema.properties) {
        // Set ui:order for this nested object to match its properties
        const nestedProperties = Object.keys(propertySchema.properties);
        if (nestedProperties.length > 0) {
          nested['ui:order'] = ensureWildcardOrder(nestedProperties);
        }
        
        // Recursively process deeper nesting
        ensureOrderMatchesCompiledSchema(nested as NestedUiSchema, propertySchema);
      }
    }
  }
}

/**
 * Get a nested property from a compiled schema by key path
 * Handles nested object paths like "parent.child"
 */
function getNestedProperty(schema: RJSFSchema, keyPath: string): RJSFSchema | null {
  const parts = keyPath.split('.');
  let current: RJSFSchema | undefined = schema;
  
  for (const part of parts) {
    if (!current || current.type !== 'object' || !current.properties) {
      return null;
    }
    current = current.properties[part] as RJSFSchema | undefined;
    if (!current) {
      return null;
    }
  }
  
  return current || null;
}

/**
 * Build UI schema for a specific node and its children
 */
function buildUiSchemaForNode(
  graph: SchemaGraph,
  node: SchemaNode,
  path: string,
  uiSchema: NestedUiSchema,
  widgetRegistry: ReturnType<typeof getWidgetRegistry>
): void {
  // Skip root node in path - root node should never create a "root" key in UI schema
  // Root-level properties should be at the root of the UI schema, not nested
  const isRootNode = node.id === graph.rootId;
  const fieldPath = isRootNode ? '' : (path ? path : node.key);

  // Get children of this node - ONLY 'child' relationships, not 'then'/'else'
  // This is critical: conditional fields in then/else branches should NOT be in ui:order
  const children = getChildren(graph, node.id, 'child');

  // Generate UI schema for this field
  const fieldUiSchema: UiSchema = {};

  // Auto-detect widget if not already assigned
  const assignedWidget = node.ui?.['ui:widget'];
  
  // Handle migration: 'number' widget ID should be 'updown' for RJSF compatibility
  const normalizedWidget = assignedWidget === 'number' ? 'updown' : assignedWidget;
  
  // Valid RJSF widget IDs (standard widgets that RJSF recognizes)
  const validRJSFWidgets = ['text', 'textarea', 'password', 'email', 'uri', 'data-url', 'updown', 'range', 'select', 'checkbox', 'radio', 'checkboxes'];
  
  // Only set widget if it's explicitly assigned by user AND it's a valid RJSF widget
  // Don't auto-assign custom widgets (photo-gallery, yesno) as they're not registered with RJSF
  if (normalizedWidget && validRJSFWidgets.includes(normalizedWidget)) {
    // Widget was explicitly set and is valid
    fieldUiSchema['ui:widget'] = normalizedWidget;
    if (node.ui?.['ui:options']) {
      fieldUiSchema['ui:options'] = node.ui['ui:options'];
    }
  } else if (!normalizedWidget) {
    // No widget assigned - try to get a compatible widget from registry
    // But only use it if it's a valid RJSF widget
    const widget = widgetRegistry.getWidgetForField(node);
    if (widget && validRJSFWidgets.includes(widget.id)) {
      fieldUiSchema['ui:widget'] = widget.id;
      const existingOptions = node.ui?.['ui:options'] || {};
      fieldUiSchema['ui:options'] = {
        ...widget.defaultConfig,
        ...existingOptions,
      };
    }
    // If widget is not a valid RJSF widget, don't set it - let RJSF use its default
  }
  // If normalizedWidget exists but is not valid, don't set it - let RJSF use its default

  // Add field-specific UI options
  if (node.type === 'object') {
    // Objects can be collapsible
    fieldUiSchema['ui:collapsible'] = true;
    fieldUiSchema['ui:collapsed'] = false;
  }

  if (node.type === 'array') {
    // Array-specific options
    fieldUiSchema['ui:options'] = {
      ...fieldUiSchema['ui:options'],
      addable: true,
      orderable: true,
      removable: true,
    };

    // Item title for array items
    if (children.length > 0) {
      const itemNode = children[0];
      fieldUiSchema['ui:itemTitle'] = itemNode.title || 'Item';
    }
  }

  // Add order if there are children
  // CRITICAL: Only include children connected via 'child' edges, NOT 'then'/'else' edges
  // Conditional fields in then/else branches are NOT in the root-level properties
  // and should NOT be in ui:order at the root level
  if (children.length > 0) {
    const order = children
      .map((child) => {
        // Use the exact key from the node - this must match the JSON schema property name
        return child.key;
      })
      .filter((key) => {
        // Filter out invalid keys but keep all valid ones
        // Note: We're already filtering by 'child' edge type above, so we don't need
        // to worry about then/else branches here
        return key && 
               key.trim() !== '' && 
               key !== 'item' && 
               key !== 'root';
      });
    
    // Always add order if we have valid keys - this is critical for RJSF validation
    // RJSF requires that ui:order contains ALL properties that exist in the JSON schema
    // But ONLY properties at this level, not conditional ones in then/else branches
    if (order.length > 0) {
      fieldUiSchema['ui:order'] = ensureWildcardOrder(order);
    }
  }

  // CRITICAL: Conditional blocks (allOf/anyOf/oneOf/if_block) should NOT have UI schema entries
  // RJSF handles conditionals by dynamically merging then/else properties into the root schema
  // The UI schema for fields in then/else branches should be at the root level, not nested
  const isConditionalBlock = node.type === 'allOf' || node.type === 'anyOf' || node.type === 'oneOf' || node.type === 'if_block';
  
  // Only add UI schema entry if this is NOT a conditional block
  // Conditional blocks don't need UI schema - their children are processed separately
  if (!isConditionalBlock) {
    // Always add field to UI schema if it has children or UI properties
    // Even if empty, we need to maintain structure for nested fields
    if (fieldPath && fieldPath !== 'root') {
      setNestedValue(uiSchema, fieldPath.split('.'), fieldUiSchema);
    } else if (Object.keys(fieldUiSchema).length > 0) {
      // Root level - merge directly only if there's content
      Object.assign(uiSchema, fieldUiSchema);
    }
  }

  // Recursively process children - ONLY 'child' relationships
  // Conditional branches (then/else) are handled separately and should NOT be
  // included in the parent's ui:order or processed as regular children
  // CRITICAL: For conditional blocks, we should NOT process regular children
  // because conditional blocks don't have regular children that should appear in UI schema
  // They only have then/else branches which are handled separately below
  if (!isConditionalBlock) {
    children.forEach((child) => {
      const childPath = fieldPath ? `${fieldPath}.${child.key}` : child.key;
      buildUiSchemaForNode(graph, child, childPath, uiSchema, widgetRegistry);
    });
  }
  
  // Handle conditional branches (then/else) separately if this is a conditional group or IF block
  // CRITICAL: Fields in then/else branches should be placed at the ROOT level of UI schema
  // (or the parent's level if the conditional block is nested), NOT under the conditional block key
  // This is because RJSF dynamically merges then/else properties into the root schema
  if (isConditionalBlock) {
    // CRITICAL: For conditional blocks, we need to determine the parent's path
    // The path passed to this function is the path TO the conditional block (includes its key)
    // For root-level conditionals, the parent is root, so parentPath should be empty
    // For nested conditionals, parentPath should be the path to the parent (without the conditional block's key)
    const parentNode = getParent(graph, node.id);
    let parentPath = '';
    
    if (parentNode) {
      if (parentNode.id === graph.rootId) {
        // Conditional block is a direct child of root - use empty path
        parentPath = '';
      } else {
        // Conditional block is nested - extract parent's path from current path
        // The path includes the conditional block's key, so we need to remove it
        // For example, if path is "parent.new_if_then_else", parentPath should be "parent"
        if (path) {
          const pathParts = path.split('.');
          // Remove the last part (the conditional block's key)
          pathParts.pop();
          parentPath = pathParts.join('.');
        } else {
          // This shouldn't happen, but if path is empty and parent is not root,
          // something is wrong - use empty path as fallback
          parentPath = '';
        }
      }
    } else {
      // No parent (shouldn't happen, but handle gracefully)
      parentPath = '';
    }
    
    // Process then branch if it exists
    const thenChildren = getChildren(graph, node.id, 'then');
    if (thenChildren.length > 0) {
      thenChildren.forEach((thenChild) => {
        // Place then branch fields at the parent's level (root level for root conditionals)
        // NOT nested under the conditional block key - use parentPath directly
        const thenPath = parentPath ? `${parentPath}.${thenChild.key}` : thenChild.key;
        buildUiSchemaForNode(graph, thenChild, thenPath, uiSchema, widgetRegistry);
      });
    }
    
    // Process else branch if it exists
    const elseChildren = getChildren(graph, node.id, 'else');
    if (elseChildren.length > 0) {
      elseChildren.forEach((elseChild) => {
        // Place else branch fields at the parent's level (root level for root conditionals)
        // NOT nested under the conditional block key - use parentPath directly
        const elsePath = parentPath ? `${parentPath}.${elseChild.key}` : elseChild.key;
        buildUiSchemaForNode(graph, elseChild, elsePath, uiSchema, widgetRegistry);
      });
    }
  }
}

/**
 * Set a nested value in an object using a path array
 */
function setNestedValue(
  obj: NestedUiSchema,
  path: string[],
  value: UiSchema | NestedUiSchema
): void {
  let current = obj;
  
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];
    if (!current[key] || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key] as NestedUiSchema;
  }

  const lastKey = path[path.length - 1];
  const existing = current[lastKey];
  
  // Merge if both are objects
  if (existing && typeof existing === 'object' && !('ui:widget' in existing)) {
    current[lastKey] = {
      ...existing,
      ...value,
    } as NestedUiSchema;
  } else {
    current[lastKey] = value;
  }
}

/**
 * Update UI schema for a specific field path
 */
export function updateFieldUiSchema(
  uiSchema: NestedUiSchema,
  fieldPath: string,
  updates: Partial<UiSchema>
): NestedUiSchema {
  const pathParts = fieldPath.split('.');
  const newUiSchema = JSON.parse(JSON.stringify(uiSchema)); // Deep clone

  let current: NestedUiSchema | UiSchema = newUiSchema;
  
  // Navigate to the field
  for (let i = 0; i < pathParts.length - 1; i++) {
    const key = pathParts[i];
    if (!current[key] || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key] as NestedUiSchema;
  }

  // Update the field
  const lastKey = pathParts[pathParts.length - 1];
  const existing = current[lastKey] as UiSchema | undefined;
  
  if (existing) {
    current[lastKey] = {
      ...existing,
      ...updates,
    } as UiSchema;
  } else {
    current[lastKey] = updates as UiSchema;
  }

  return newUiSchema;
}

/**
 * Get widget assignment for a field path
 */
export function getWidgetForFieldPath(
  uiSchema: NestedUiSchema,
  fieldPath: string
): string | null {
  const pathParts = fieldPath.split('.');
  let current: NestedUiSchema | UiSchema = uiSchema;

  for (const part of pathParts) {
    if (!current[part] || typeof current[part] !== 'object') {
      return null;
    }
    current = current[part] as NestedUiSchema | UiSchema;
  }

  return (current as UiSchema)['ui:widget'] || null;
}


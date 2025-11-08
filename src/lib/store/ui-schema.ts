import { create } from 'zustand';
import type { SchemaGraph } from '../graph/schema-graph';
import { generateUiSchema } from '../ui-schema/ui-schema-generator';
import { getWidgetRegistry } from '../widgets/widget-registry';

// Define a simpler UI Schema type to avoid deep type instantiation
export interface UiSchema {
    "ui:widget"?: string;
    "ui:options"?: {
        [key: string]: unknown;
    };
    "ui:order"?: string[];
    "ui:disabled"?: boolean;
    "ui:readonly"?: boolean;
    [key: string]: unknown;
}

export type NestedUiSchema = {
    [key: string]: UiSchema | NestedUiSchema;
};

interface UiSchemaState {
    uiSchema: Record<string, UiSchema | NestedUiSchema>;
    // Track manually edited fields to preserve them during regeneration
    manualEdits: Set<string>;
    updateUiSchema: (newSchema: Record<string, UiSchema>) => void;
    updateFieldUiSchema: (fieldPath: string, uiOptions: UiSchema) => void;
    removeFieldUiSchema: (fieldPath: string) => void;
    // New methods for widget integration
    regenerateFromGraph: (graph: SchemaGraph) => void;
    assignWidget: (fieldPath: string, widgetId: string) => void;
    getWidgetForField: (fieldPath: string) => string | null;
    markFieldAsManuallyEdited: (fieldPath: string) => void;
    clearManualEdits: () => void;
}

function createNestedObject(path: string[], value: UiSchema): NestedUiSchema {
    const lastKey = path[path.length - 1];
    const current: NestedUiSchema = {};
    let currentObj = current;

    // Create the nested structure except for the last key
    for (let i = 0; i < path.length - 1; i++) {
        currentObj[path[i]] = {};
        currentObj = currentObj[path[i]] as NestedUiSchema;
    }

    // Set the UI schema at the leaf node
    currentObj[lastKey] = value;
    return current;
}

function mergeUiSchemas(target: NestedUiSchema, source: NestedUiSchema): void {
    for (const key in source) {
        if (typeof source[key] === 'object' && !('ui:widget' in (source[key] || {}))) {
            target[key] = target[key] || {};
            mergeUiSchemas(target[key] as NestedUiSchema, source[key] as NestedUiSchema);
        } else {
            target[key] = source[key];
        }
    }
}

// Helper to get all field paths from a nested UI schema
function getAllFieldPaths(uiSchema: NestedUiSchema, prefix = ''): string[] {
    const paths: string[] = [];
    for (const key in uiSchema) {
        const currentPath = prefix ? `${prefix}.${key}` : key;
        const value = uiSchema[key];
        if (value && typeof value === 'object' && 'ui:widget' in value) {
            // This is a leaf node with UI schema
            paths.push(currentPath);
        } else if (value && typeof value === 'object') {
            // This is a nested object, recurse
            paths.push(...getAllFieldPaths(value as NestedUiSchema, currentPath));
        }
    }
    return paths;
}

// Helper to get nested value from UI schema
function getNestedValue(uiSchema: NestedUiSchema, path: string): UiSchema | NestedUiSchema | undefined {
    const parts = path.split('.');
    let current: NestedUiSchema | UiSchema = uiSchema;
    for (const part of parts) {
        if (!current[part] || typeof current[part] !== 'object') {
            return undefined;
        }
        current = current[part] as NestedUiSchema | UiSchema;
    }
    return current;
}

export const useUiSchemaStore = create<UiSchemaState>((set) => ({
    uiSchema: {},
    manualEdits: new Set<string>(),
    updateUiSchema: (newSchema) => {
        // Mark all fields in the new schema as manually edited
        const paths = getAllFieldPaths(newSchema);
        set({ 
            uiSchema: newSchema,
            manualEdits: new Set(paths)
        });
    },
    updateFieldUiSchema: (fieldPath, uiOptions) =>
        set((state) => {
            const newUiSchema = { ...state.uiSchema };
            const pathParts = fieldPath.split('.');

            // Create a nested object structure for this field's UI schema
            const nestedSchema = createNestedObject(pathParts, uiOptions);

            // Get the root key (first part of the path)
            const rootKey = pathParts[0];

            // If we already have a schema for this root, merge them
            if (newUiSchema[rootKey]) {
                mergeUiSchemas(
                    newUiSchema[rootKey] as NestedUiSchema,
                    nestedSchema[rootKey] as NestedUiSchema
                );
            } else {
                // Otherwise, just set it
                newUiSchema[rootKey] = nestedSchema[rootKey];
            }

            // Mark this field as manually edited
            const newManualEdits = new Set(state.manualEdits);
            newManualEdits.add(fieldPath);

            return { uiSchema: newUiSchema, manualEdits: newManualEdits };
        }),
    removeFieldUiSchema: (fieldPath) =>
        set((state) => {
            const newUiSchema = { ...state.uiSchema };
            const pathParts = fieldPath.split('.');

            if (pathParts.length === 1) {
                delete newUiSchema[fieldPath];
                return { uiSchema: newUiSchema };
            }

            let current = newUiSchema;
            for (let i = 0; i < pathParts.length - 1; i++) {
                const part = pathParts[i];
                if (!current[part] || typeof current[part] !== 'object') {
                    return { uiSchema: newUiSchema }; // Path doesn't exist
                }
                current = current[part] as NestedUiSchema;
            }

            // Delete the leaf node
            delete current[pathParts[pathParts.length - 1]];

            // Clean up empty parent objects
            if (Object.keys(current).length === 0) {
                let temp = newUiSchema;
                for (let i = 0; i < pathParts.length - 2; i++) {
                    temp = temp[pathParts[i]] as NestedUiSchema;
                }
                delete temp[pathParts[pathParts.length - 2]];
            }

            return { uiSchema: newUiSchema };
        }),

    regenerateFromGraph: (graph: SchemaGraph) =>
        set((state) => {
            const generatedUiSchema = generateUiSchema(graph);
            const mergedUiSchema = JSON.parse(JSON.stringify(generatedUiSchema)) as NestedUiSchema;
            
            // Preserve manual edits by merging them back into the generated schema
            state.manualEdits.forEach((fieldPath) => {
                const manualValue = getNestedValue(state.uiSchema, fieldPath);
                if (manualValue) {
                    // Merge the manual edit back into the generated schema
                    const pathParts = fieldPath.split('.');
                    const rootKey = pathParts[0];
                    
                    if (rootKey in mergedUiSchema) {
                        // Field exists in generated schema, merge the manual edit
                        const nestedSchema = createNestedObject(pathParts, manualValue as UiSchema);
                        mergeUiSchemas(
                            mergedUiSchema[rootKey] as NestedUiSchema,
                            nestedSchema[rootKey] as NestedUiSchema
                        );
                    } else {
                        // Field doesn't exist in generated schema (might have been deleted)
                        // Only preserve if it's a valid path in the new schema
                        // For now, we'll preserve it anyway - user can clean it up manually
                        if (!mergedUiSchema[rootKey]) {
                            mergedUiSchema[rootKey] = {};
                        }
                        const nestedSchema = createNestedObject(pathParts, manualValue as UiSchema);
                        mergeUiSchemas(
                            mergedUiSchema[rootKey] as NestedUiSchema,
                            nestedSchema[rootKey] as NestedUiSchema
                        );
                    }
                }
            });
            
            return { uiSchema: mergedUiSchema };
        }),
    markFieldAsManuallyEdited: (fieldPath: string) =>
        set((state) => {
            const newManualEdits = new Set(state.manualEdits);
            newManualEdits.add(fieldPath);
            return { manualEdits: newManualEdits };
        }),
    clearManualEdits: () =>
        set({ manualEdits: new Set<string>() }),

    assignWidget: (fieldPath: string, widgetId: string) =>
        set((state) => {
            const widgetRegistry = getWidgetRegistry();
            const widget = widgetRegistry.getWidget(widgetId);
            
            if (!widget) {
                console.warn(`Widget ${widgetId} not found`);
                return state;
            }

            const uiOptions: UiSchema = {
                'ui:widget': widgetId,
                'ui:options': widget.defaultConfig,
            };

            // Use existing updateFieldUiSchema logic
            const newUiSchema = { ...state.uiSchema };
            const pathParts = fieldPath.split('.');
            const nestedSchema = createNestedObject(pathParts, uiOptions);
            const rootKey = pathParts[0];

            if (newUiSchema[rootKey]) {
                mergeUiSchemas(
                    newUiSchema[rootKey] as NestedUiSchema,
                    nestedSchema[rootKey] as NestedUiSchema
                );
            } else {
                newUiSchema[rootKey] = nestedSchema[rootKey];
            }

            return { uiSchema: newUiSchema };
        }),

    getWidgetForField: (fieldPath: string): string | null => {
        const state = useUiSchemaStore.getState();
        const pathParts = fieldPath.split('.');
        let current: NestedUiSchema | UiSchema = state.uiSchema;

        for (const part of pathParts) {
            if (!current[part] || typeof current[part] !== 'object') {
                return null;
            }
            current = current[part] as NestedUiSchema | UiSchema;
        }

        return (current as UiSchema)['ui:widget'] || null;
    },
})); 
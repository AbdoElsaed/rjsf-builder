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
    updateUiSchema: (newSchema: Record<string, UiSchema>) => void;
    updateFieldUiSchema: (fieldPath: string, uiOptions: UiSchema) => void;
    removeFieldUiSchema: (fieldPath: string) => void;
    // New methods for widget integration
    regenerateFromGraph: (graph: SchemaGraph) => void;
    assignWidget: (fieldPath: string, widgetId: string) => void;
    getWidgetForField: (fieldPath: string) => string | null;
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

export const useUiSchemaStore = create<UiSchemaState>((set) => ({
    uiSchema: {},
    updateUiSchema: (newSchema) => set({ uiSchema: newSchema }),
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

            return { uiSchema: newUiSchema };
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
        set(() => {
            const newUiSchema = generateUiSchema(graph);
            return { uiSchema: newUiSchema };
        }),

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
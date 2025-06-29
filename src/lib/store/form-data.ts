import { create } from 'zustand';
import type { RJSFSchema } from "@rjsf/utils";

export type JSONValue = string | number | boolean | null | JSONValue[] | { [key: string]: JSONValue };

interface FormDataState {
    formData: Record<string, JSONValue>;
    updateFormData: (newData: Record<string, JSONValue>) => void;
    migrateFormData: (oldSchema: RJSFSchema, newSchema: RJSFSchema) => void;
}

// Helper function to get all property keys from a schema
const getSchemaKeys = (schema: RJSFSchema): Set<string> => {
    const keys = new Set<string>();

    if (schema.properties) {
        Object.entries(schema.properties).forEach(([key, prop]) => {
            keys.add(key);
            // Recursively get keys from nested objects
            if (typeof prop === 'object' && prop.properties) {
                getSchemaKeys(prop as RJSFSchema).forEach(k => keys.add(`${key}.${k}`));
            }
            // Handle array items
            if (typeof prop === 'object' && prop.items && typeof prop.items === 'object') {
                getSchemaKeys(prop.items as RJSFSchema).forEach(k => keys.add(`${key}[].${k}`));
            }
        });
    }

    return keys;
};

export const useFormDataStore = create<FormDataState>((set, get) => ({
    formData: {},
    updateFormData: (newData) => set({ formData: newData }),
    migrateFormData: (oldSchema, newSchema) => {
        const oldKeys = getSchemaKeys(oldSchema);
        const newKeys = getSchemaKeys(newSchema);
        const currentFormData = get().formData;
        const newFormData: Record<string, JSONValue> = {};

        // Find renamed keys (keys that exist in both schemas but with different names)
        const renamedKeys = new Map<string, string>();
        Array.from(oldKeys).forEach(oldKey => {
            // Simple heuristic: if a key was removed and another was added, it might be a rename
            // This could be improved with more sophisticated matching (e.g., checking field types, positions)
            const possibleNewKey = Array.from(newKeys).find(newKey =>
                !oldKeys.has(newKey) &&
                typeof currentFormData[oldKey] === typeof currentFormData[newKey]
            );
            if (possibleNewKey) {
                renamedKeys.set(oldKey, possibleNewKey);
            }
        });

        // Migrate data
        Object.entries(currentFormData).forEach(([key, value]) => {
            if (newKeys.has(key)) {
                // Key exists in new schema, keep it
                newFormData[key] = value;
            } else if (renamedKeys.has(key)) {
                // Key was renamed, move the value to the new key
                const newKey = renamedKeys.get(key)!;
                newFormData[newKey] = value;
            }
            // If key doesn't exist in new schema and wasn't renamed, drop it
        });

        set({ formData: newFormData });
    }
})); 
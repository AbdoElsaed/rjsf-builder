import { create } from 'zustand';

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

interface UiSchemaState {
    uiSchema: Record<string, UiSchema>;
    updateUiSchema: (newSchema: Record<string, UiSchema>) => void;
    updateFieldUiSchema: (fieldKey: string, uiOptions: UiSchema) => void;
}

export const useUiSchemaStore = create<UiSchemaState>((set) => ({
    uiSchema: {},
    updateUiSchema: (newSchema) => set({ uiSchema: newSchema }),
    updateFieldUiSchema: (fieldKey, uiOptions) =>
        set((state) => ({
            uiSchema: {
                ...state.uiSchema,
                [fieldKey]: {
                    ...state.uiSchema[fieldKey],
                    ...uiOptions,
                },
            },
        })),
})); 
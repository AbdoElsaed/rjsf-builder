import type { JSONSchemaType } from "@/lib/store/schema-graph";
import type { UiSchema } from "@/lib/store/ui-schema";

// Common configuration options for all field types
export interface BaseFieldConfig {
    title: string;
    description?: string;
    default?: unknown;
    required?: boolean;
}

// String field specific configuration
export interface StringFieldConfig extends BaseFieldConfig {
    type: "string";
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    format?: "email" | "uri" | "date" | "date-time" | "time" | "ipv4" | "ipv6" | "hostname";
    ui?: UiSchema & {
        "ui:widget"?: "text" | "textarea" | "password" | "email" | "uri" | "data-url";
    };
}

// Number field specific configuration
export interface NumberFieldConfig extends BaseFieldConfig {
    type: "number";
    minimum?: number;
    maximum?: number;
    multipleOf?: number;
    exclusiveMinimum?: number;
    exclusiveMaximum?: number;
    ui?: UiSchema & {
        "ui:widget"?: "updown" | "range";
    };
}

// Boolean field specific configuration
export interface BooleanFieldConfig extends BaseFieldConfig {
    type: "boolean";
    ui?: UiSchema & {
        "ui:widget"?: "checkbox" | "radio" | "select";
    };
}

// Array field specific configuration
export interface ArrayFieldConfig extends BaseFieldConfig {
    type: "array";
    minItems?: number;
    maxItems?: number;
    uniqueItems?: boolean;
    additionalItems?: boolean;
    ui?: UiSchema & {
        "ui:options"?: {
            addable?: boolean;
            orderable?: boolean;
            removable?: boolean;
        };
    };
}

// Object field specific configuration
export interface ObjectFieldConfig extends BaseFieldConfig {
    type: "object";
    minProperties?: number;
    maxProperties?: number;
    additionalProperties?: boolean;
    ui?: UiSchema & {
        "ui:order"?: string[];
    };
}

// Enum field specific configuration
export interface EnumFieldConfig extends BaseFieldConfig {
    type: "enum";
    enum: string[];
    enumNames?: string[];
    ui?: UiSchema & {
        "ui:widget"?: "select" | "radio" | "checkboxes";
    };
}

// Union type of all field configurations
export type FieldConfig =
    | StringFieldConfig
    | NumberFieldConfig
    | BooleanFieldConfig
    | ArrayFieldConfig
    | ObjectFieldConfig
    | EnumFieldConfig;

// Helper to get the appropriate configuration type based on field type
export function getDefaultConfig(type: JSONSchemaType): FieldConfig {
    switch (type) {
        case "string":
            return { type, title: "", ui: {} };
        case "number":
            return { type, title: "", ui: {} };
        case "boolean":
            return { type, title: "", ui: {} };
        case "array":
            return { type, title: "", ui: { "ui:options": { addable: true, orderable: true, removable: true } } };
        case "object":
            return { type, title: "", ui: {} };
        case "enum":
            return { type, title: "", enum: [], ui: {} };
        default:
            throw new Error(`Unsupported field type: ${type}`);
    }
} 
/**
 * Comprehensive JSON Schema 2020-12 and RJSF 6.0 property definitions
 * This file contains all valid properties for each field type
 */

// ============================================================================
// STRING FIELD PROPERTIES
// ============================================================================
export interface StringSchemaProperties {
  // Length validation
  minLength?: number;
  maxLength?: number;
  
  // Pattern validation
  pattern?: string;  // Regular expression
  
  // Format validation (JSON Schema standard formats)
  format?: 
    | 'date-time'     // RFC 3339 date-time
    | 'time'          // RFC 3339 time
    | 'date'          // RFC 3339 full-date
    | 'duration'      // RFC 3339 duration
    | 'email'         // RFC 5321 email
    | 'idn-email'     // RFC 6531 internationalized email
    | 'hostname'      // RFC 1123 hostname
    | 'idn-hostname'  // RFC 5890 internationalized hostname
    | 'ipv4'          // RFC 2673 IPv4
    | 'ipv6'          // RFC 4291 IPv6
    | 'uri'           // RFC 3986 URI
    | 'uri-reference' // RFC 3986 URI reference
    | 'iri'           // RFC 3987 IRI
    | 'iri-reference' // RFC 3987 IRI reference
    | 'uuid'          // RFC 4122 UUID
    | 'uri-template'  // RFC 6570 URI template
    | 'json-pointer'  // RFC 6901 JSON Pointer
    | 'relative-json-pointer'  // Relative JSON Pointer
    | 'regex';        // ECMA-262 regular expression
  
  // Content encoding
  contentEncoding?: 'base64' | '7bit' | '8bit' | 'binary' | 'quoted-printable';
  contentMediaType?: string;  // MIME type
}

// ============================================================================
// NUMBER/INTEGER FIELD PROPERTIES
// ============================================================================
export interface NumberSchemaProperties {
  // Range validation
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  
  // Multiple validation
  multipleOf?: number;
}

// ============================================================================
// BOOLEAN FIELD PROPERTIES
// ============================================================================
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface BooleanSchemaProperties {
  // Booleans have no type-specific validation beyond default
}

// ============================================================================
// ARRAY FIELD PROPERTIES
// ============================================================================
export interface ArraySchemaProperties {
  // Length validation
  minItems?: number;
  maxItems?: number;
  
  // Uniqueness
  uniqueItems?: boolean;
  
  // Contains validation
  contains?: Record<string, unknown>;  // Schema for at least one item
  minContains?: number;
  maxContains?: number;
  
  // Items schema is handled by the graph structure (children)
  // prefixItems for tuple validation is handled by ordered children
}

// ============================================================================
// OBJECT FIELD PROPERTIES
// ============================================================================
export interface ObjectSchemaProperties {
  // Property count validation
  minProperties?: number;
  maxProperties?: number;
  
  // Additional properties
  additionalProperties?: boolean | Record<string, unknown>;
  
  // Pattern properties
  patternProperties?: Record<string, Record<string, unknown>>;
  
  // Property names validation
  propertyNames?: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
  };
  
  // Dependencies (deprecated in 2020-12 but still supported)
  dependencies?: Record<string, string[] | Record<string, unknown>>;
  
  // Dependent schemas (2020-12)
  dependentSchemas?: Record<string, Record<string, unknown>>;
  dependentRequired?: Record<string, string[]>;
}

// ============================================================================
// ENUM FIELD PROPERTIES
// ============================================================================
export interface EnumSchemaProperties {
  enum: string[] | number[] | boolean[];  // List of valid values
  enumNames?: string[];  // Human-readable names for enum values (RJSF extension)
}

// ============================================================================
// RJSF UI SCHEMA PROPERTIES
// ============================================================================

// Common UI options
export interface CommonUiOptions {
  title?: string;
  description?: string;
  help?: string;
  placeholder?: string;
  disabled?: boolean;
  readonly?: boolean;
  classNames?: string;
  style?: Record<string, unknown>;
  label?: boolean | string;
  hideError?: boolean;
  emptyValue?: unknown;
}

// String widget options
export interface StringUiSchema {
  'ui:widget'?: 
    | 'text'           // Default text input
    | 'textarea'       // Multi-line text
    | 'password'       // Password input
    | 'email'          // Email input (HTML5)
    | 'uri'            // URL input
    | 'data-url'       // File upload as data URL
    | 'color'          // Color picker
    | 'file';          // File upload
  
  'ui:options'?: CommonUiOptions & {
    rows?: number;     // For textarea
    inputType?: string; // HTML input type override
    filePreview?: boolean;
  };
  
  'ui:placeholder'?: string;
  'ui:autocomplete'?: string;  // HTML autocomplete attribute
}

// Number widget options
export interface NumberUiSchema {
  'ui:widget'?: 
    | 'updown'         // Number input with up/down buttons (default)
    | 'range'          // Slider
    | 'radio'          // Radio buttons (for enum-like numbers)
    | 'hidden';        // Hidden field
  
  'ui:options'?: CommonUiOptions;
}

// Boolean widget options
export interface BooleanUiSchema {
  'ui:widget'?: 
    | 'checkbox'       // Default checkbox
    | 'radio'          // Radio buttons (yes/no)
    | 'select'         // Dropdown (yes/no)
    | 'hidden';        // Hidden field
  
  'ui:options'?: CommonUiOptions;
}

// Array widget options
export interface ArrayUiSchema {
  'ui:widget'?: string;  // Custom array widgets
  
  'ui:options'?: CommonUiOptions & {
    addable?: boolean;      // Show add button
    orderable?: boolean;    // Allow reordering
    removable?: boolean;    // Show remove button
    copyable?: boolean;     // Show copy button
    inline?: boolean;       // Inline array items
    addButtonText?: string; // Custom add button text
  };
  
  'ui:ArrayFieldTemplate'?: string;  // Custom template
}

// Object widget options
export interface ObjectUiSchema {
  'ui:order'?: string[];  // Order of properties
  'ui:options'?: CommonUiOptions;
  'ui:ObjectFieldTemplate'?: string;  // Custom template
}

// Enum widget options
export interface EnumUiSchema {
  'ui:widget'?: 
    | 'select'         // Dropdown (default)
    | 'radio'          // Radio buttons
    | 'checkboxes';    // Multiple checkboxes (for arrays of enums)
  
  'ui:options'?: CommonUiOptions & {
    enumDisabled?: (string | number | boolean)[];  // Disabled enum values
  };
}

// ============================================================================
// TYPE MAPPING
// ============================================================================

export type SchemaPropertiesByType<T extends string> = 
  T extends 'string' ? StringSchemaProperties :
  T extends 'number' ? NumberSchemaProperties :
  T extends 'integer' ? NumberSchemaProperties :
  T extends 'boolean' ? BooleanSchemaProperties :
  T extends 'array' ? ArraySchemaProperties :
  T extends 'object' ? ObjectSchemaProperties :
  T extends 'enum' ? EnumSchemaProperties :
  never;

export type UiSchemaByType<T extends string> = 
  T extends 'string' ? StringUiSchema :
  T extends 'number' ? NumberUiSchema :
  T extends 'integer' ? NumberUiSchema :
  T extends 'boolean' ? BooleanUiSchema :
  T extends 'array' ? ArrayUiSchema :
  T extends 'object' ? ObjectUiSchema :
  T extends 'enum' ? EnumUiSchema :
  Record<string, unknown>;

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Get all valid schema property keys for a given type
 */
export function getValidSchemaProperties(type: string): string[] {
  const common = ['title', 'description', 'default', 'examples', 'const', '$comment'];
  
  switch (type) {
    case 'string':
      return [...common, 'minLength', 'maxLength', 'pattern', 'format', 'contentEncoding', 'contentMediaType'];
    case 'number':
    case 'integer':
      return [...common, 'minimum', 'maximum', 'exclusiveMinimum', 'exclusiveMaximum', 'multipleOf'];
    case 'boolean':
      return common;
    case 'array':
      return [...common, 'minItems', 'maxItems', 'uniqueItems', 'contains', 'minContains', 'maxContains'];
    case 'object':
      return [...common, 'minProperties', 'maxProperties', 'additionalProperties', 'patternProperties', 
              'propertyNames', 'dependencies', 'dependentSchemas', 'dependentRequired'];
    case 'enum':
      return [...common, 'enum', 'enumNames'];
    default:
      return common;
  }
}

/**
 * Get all valid UI schema property keys for a given type
 */
export function getValidUiProperties(type: string): string[] {
  const common = ['ui:options', 'ui:classNames', 'ui:style', 'ui:help', 'ui:placeholder', 
                  'ui:disabled', 'ui:readonly', 'ui:title', 'ui:description'];
  
  switch (type) {
    case 'string':
      return [...common, 'ui:widget', 'ui:autocomplete'];
    case 'number':
    case 'integer':
      return [...common, 'ui:widget'];
    case 'boolean':
      return [...common, 'ui:widget'];
    case 'array':
      return [...common, 'ui:widget', 'ui:ArrayFieldTemplate'];
    case 'object':
      return [...common, 'ui:order', 'ui:ObjectFieldTemplate'];
    case 'enum':
      return [...common, 'ui:widget'];
    default:
      return common;
  }
}


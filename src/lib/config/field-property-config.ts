/**
 * Field Property Configuration System
 * 
 * This module defines which properties are relevant for each field type,
 * following JSON Schema semantics and RJSF best practices.
 * 
 * Design Principles:
 * 1. Type-safe: All configs are strongly typed
 * 2. Declarative: Configuration over imperative code
 * 3. Single Source of Truth: One place to define property visibility
 * 4. Semantic: Grouped by property purpose (basic, data, validation, etc.)
 */

import type { SchemaNodeType } from "@/lib/graph/schema-graph";

/**
 * Property categories that group related properties
 */
export type PropertyCategory = 
  | 'basic'       // Core identifying properties (title, key, description)
  | 'data'        // Data-related properties (default, required)
  | 'validation'  // Validation rules (min, max, pattern, etc.)
  | 'ui'          // UI customization (widget, options)
  | 'logic'       // Logic properties (condition, operator for if_block)
  | 'structure';  // Structural properties (additionalProperties, etc.)

/**
 * All possible property names in the system
 */
export type PropertyName = 
  // Basic properties
  | 'title'
  | 'description'
  | 'key'
  
  // Data properties
  | 'required'
  | 'default'
  
  // String validation
  | 'minLength'
  | 'maxLength'
  | 'pattern'
  | 'format'
  | 'contentEncoding'
  
  // Number validation
  | 'minimum'
  | 'maximum'
  | 'exclusiveMinimum'
  | 'exclusiveMaximum'
  | 'multipleOf'
  
  // Array validation
  | 'minItems'
  | 'maxItems'
  | 'uniqueItems'
  | 'contains'
  
  // Object validation
  | 'minProperties'
  | 'maxProperties'
  | 'additionalProperties'
  
  // Enum properties
  | 'enum'
  | 'enumNames'
  
  // Logic properties
  | 'condition'
  | 'conditions'
  
  // UI properties
  | 'widget'
  | 'uiOptions'
  | 'placeholder';

/**
 * Configuration for a specific property category
 */
export interface PropertyCategoryConfig {
  label: string;
  description: string;
  icon?: string;
  properties: PropertyName[];
}

/**
 * Configuration for a field type
 */
export interface FieldTypeConfig {
  categories: Record<PropertyCategory, PropertyCategoryConfig | null>;
  hiddenProperties?: PropertyName[]; // Properties to never show
}

/**
 * Master configuration for all field types
 * 
 * This is the SINGLE SOURCE OF TRUTH for property visibility
 */
export const FIELD_PROPERTY_CONFIG: Record<SchemaNodeType, FieldTypeConfig> = {
  // ============================================================================
  // DATA FIELDS - Fields that store actual form data
  // ============================================================================
  
  string: {
    categories: {
      basic: {
        label: 'Basic Properties',
        description: 'Core field identification',
        icon: '📝',
        properties: ['title', 'description', 'key'],
      },
      data: {
        label: 'Data Properties',
        description: 'Default value and field requirements',
        icon: '💾',
        properties: ['required', 'default'],
      },
      validation: {
        label: 'Validation Rules',
        description: 'String length and format validation',
        icon: '✓',
        properties: ['minLength', 'maxLength', 'pattern', 'format'],
      },
      ui: {
        label: 'Display Options',
        description: 'How the field appears in the form',
        icon: '🎨',
        properties: ['widget', 'placeholder', 'uiOptions'],
      },
      logic: null,
      structure: null,
    },
  },

  number: {
    categories: {
      basic: {
        label: 'Basic Properties',
        description: 'Core field identification',
        icon: '📝',
        properties: ['title', 'description', 'key'],
      },
      data: {
        label: 'Data Properties',
        description: 'Default value and field requirements',
        icon: '💾',
        properties: ['required', 'default'],
      },
      validation: {
        label: 'Validation Rules',
        description: 'Numeric range and precision validation',
        icon: '✓',
        properties: ['minimum', 'maximum', 'exclusiveMinimum', 'exclusiveMaximum', 'multipleOf'],
      },
      ui: {
        label: 'Display Options',
        description: 'How the field appears in the form',
        icon: '🎨',
        properties: ['widget', 'uiOptions'],
      },
      logic: null,
      structure: null,
    },
  },

  boolean: {
    categories: {
      basic: {
        label: 'Basic Properties',
        description: 'Core field identification',
        icon: '📝',
        properties: ['title', 'description', 'key'],
      },
      data: {
        label: 'Data Properties',
        description: 'Default value and field requirements',
        icon: '💾',
        properties: ['required', 'default'],
      },
      validation: null, // Booleans have no validation rules
      ui: {
        label: 'Display Options',
        description: 'How the field appears in the form',
        icon: '🎨',
        properties: ['widget', 'uiOptions'],
      },
      logic: null,
      structure: null,
    },
  },

  enum: {
    categories: {
      basic: {
        label: 'Basic Properties',
        description: 'Core field identification',
        icon: '📝',
        properties: ['title', 'description', 'key'],
      },
      data: {
        label: 'Data Properties',
        description: 'Default value and field requirements',
        icon: '💾',
        properties: ['required', 'default'],
      },
      validation: {
        label: 'Options',
        description: 'Available choices for the user',
        icon: '📋',
        properties: ['enum', 'enumNames'],
      },
      ui: {
        label: 'Display Options',
        description: 'How the field appears in the form',
        icon: '🎨',
        properties: ['widget', 'uiOptions'],
      },
      logic: null,
      structure: null,
    },
  },

  // ============================================================================
  // CONTAINER FIELDS - Fields that group other fields
  // ============================================================================

  object: {
    categories: {
      basic: {
        label: 'Basic Properties',
        description: 'Core field identification',
        icon: '📝',
        properties: ['title', 'description', 'key'],
      },
      data: null, // Objects don't have default values or required (their properties do)
      validation: {
        label: 'Validation Rules',
        description: 'Property count and structure validation',
        icon: '✓',
        properties: ['minProperties', 'maxProperties'],
      },
      ui: null,
      logic: null,
      structure: {
        label: 'Structure Options',
        description: 'How the object handles additional properties',
        icon: '🏗️',
        properties: ['additionalProperties'],
      },
    },
  },

  array: {
    categories: {
      basic: {
        label: 'Basic Properties',
        description: 'Core field identification',
        icon: '📝',
        properties: ['title', 'description', 'key'],
      },
      data: null, // Arrays don't have default values
      validation: {
        label: 'Validation Rules',
        description: 'Item count and uniqueness validation',
        icon: '✓',
        properties: ['minItems', 'maxItems', 'uniqueItems'],
      },
      ui: {
        label: 'Display Options',
        description: 'How the array appears in the form',
        icon: '🎨',
        properties: ['uiOptions'],
      },
      logic: null,
      structure: null,
    },
  },

  // ============================================================================
  // LOGIC FIELDS - Pure logic, no data storage
  // ============================================================================

  if_block: {
    categories: {
      basic: {
        label: 'Basic Properties',
        description: 'Core identification (no key needed for logic)',
        icon: '📝',
        properties: ['title', 'description'], // NO key - logic blocks aren't data fields
      },
      data: null, // Logic blocks don't store data - NO default, NO required
      validation: null,
      ui: null,
      logic: {
        label: 'Conditional Logic',
        description: 'Define when this condition applies',
        icon: '🔀',
        properties: ['condition'],
      },
      structure: null,
    },
  },

  allOf: {
    categories: {
      basic: {
        label: 'Basic Properties',
        description: 'Core identification',
        icon: '📝',
        properties: ['title', 'description'],
      },
      data: null, // Logic container - NO data properties
      validation: null,
      ui: null,
      logic: {
        label: 'Logic Configuration',
        description: 'All conditions must be satisfied',
        icon: '&',
        properties: ['conditions'],
      },
      structure: null,
    },
  },

  anyOf: {
    categories: {
      basic: {
        label: 'Basic Properties',
        description: 'Core identification',
        icon: '📝',
        properties: ['title', 'description'],
      },
      data: null,
      validation: null,
      ui: null,
      logic: {
        label: 'Logic Configuration',
        description: 'At least one condition must be satisfied',
        icon: '|',
        properties: ['conditions'],
      },
      structure: null,
    },
  },

  oneOf: {
    categories: {
      basic: {
        label: 'Basic Properties',
        description: 'Core identification',
        icon: '📝',
        properties: ['title', 'description'],
      },
      data: null,
      validation: null,
      ui: null,
      logic: {
        label: 'Logic Configuration',
        description: 'Exactly one condition must be satisfied',
        icon: '⊕',
        properties: ['conditions'],
      },
      structure: null,
    },
  },

  // ============================================================================
  // REFERENCE FIELDS - Reference to definitions
  // ============================================================================

  definition: {
    categories: {
      basic: {
        label: 'Definition Properties',
        description: 'Reusable schema definition',
        icon: '🔖',
        properties: ['title', 'description'], // Definitions use 'name' instead of 'key'
      },
      data: null,
      validation: null,
      ui: null,
      logic: null,
      structure: null,
    },
  },

  ref: {
    categories: {
      basic: {
        label: 'Reference Properties',
        description: 'Reference to a definition',
        icon: '🔗',
        properties: ['title', 'description'],
      },
      data: null,
      validation: null,
      ui: null,
      logic: null,
      structure: null,
    },
  },
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if a property should be shown for a given field type
 */
export function shouldShowProperty(
  fieldType: SchemaNodeType,
  property: PropertyName
): boolean {
  const config = FIELD_PROPERTY_CONFIG[fieldType];
  if (!config) return false;

  // Check if property is explicitly hidden
  if (config.hiddenProperties?.includes(property)) {
    return false;
  }

  // Check if property exists in any category
  for (const category of Object.values(config.categories)) {
    if (category?.properties.includes(property)) {
      return true;
    }
  }

  return false;
}

/**
 * Get all visible properties for a field type
 */
export function getVisibleProperties(fieldType: SchemaNodeType): PropertyName[] {
  const config = FIELD_PROPERTY_CONFIG[fieldType];
  if (!config) return [];

  const properties = new Set<PropertyName>();

  for (const category of Object.values(config.categories)) {
    if (category) {
      category.properties.forEach(prop => properties.add(prop));
    }
  }

  // Remove hidden properties
  config.hiddenProperties?.forEach(prop => properties.delete(prop));

  return Array.from(properties);
}

/**
 * Get visible categories for a field type
 */
export function getVisibleCategories(
  fieldType: SchemaNodeType
): Array<{ category: PropertyCategory; config: PropertyCategoryConfig }> {
  const config = FIELD_PROPERTY_CONFIG[fieldType];
  if (!config) return [];

  return (Object.entries(config.categories) as Array<[PropertyCategory, PropertyCategoryConfig | null]>)
    .filter((entry): entry is [PropertyCategory, PropertyCategoryConfig] => entry[1] !== null)
    .map(([category, categoryConfig]) => ({ category, config: categoryConfig }));
}

/**
 * Check if a field type is a data field (stores actual form values)
 */
export function isDataField(fieldType: SchemaNodeType): boolean {
  const dataFields: SchemaNodeType[] = ['string', 'number', 'boolean', 'enum'];
  return dataFields.includes(fieldType);
}

/**
 * Check if a field type is a container field (groups other fields)
 */
export function isContainerField(fieldType: SchemaNodeType): boolean {
  const containerFields: SchemaNodeType[] = ['object', 'array'];
  return containerFields.includes(fieldType);
}

/**
 * Check if a field type is a logic field (pure logic, no data)
 */
export function isLogicField(fieldType: SchemaNodeType): boolean {
  const logicFields: SchemaNodeType[] = ['if_block', 'allOf', 'anyOf', 'oneOf'];
  return logicFields.includes(fieldType);
}

/**
 * Get a human-readable label for a field type
 */
export function getFieldTypeLabel(fieldType: SchemaNodeType): string {
  const labels: Record<SchemaNodeType, string> = {
    string: 'Text Field',
    number: 'Number Field',
    boolean: 'Yes/No Field',
    enum: 'Dropdown/Select',
    object: 'Object Group',
    array: 'List/Array',
    if_block: 'If-Then-Else Logic',
    allOf: 'All Of (AND Logic)',
    anyOf: 'Any Of (OR Logic)',
    oneOf: 'One Of (XOR Logic)',
    definition: 'Reusable Definition',
    ref: 'Reference',
  };
  return labels[fieldType] || fieldType;
}

/**
 * Get field type category for visual grouping
 */
export function getFieldTypeCategory(fieldType: SchemaNodeType): 'data' | 'container' | 'logic' | 'reference' {
  if (isDataField(fieldType)) return 'data';
  if (isContainerField(fieldType)) return 'container';
  if (isLogicField(fieldType)) return 'logic';
  return 'reference';
}


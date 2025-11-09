/**
 * Validation utilities for imported schemas
 */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate an imported JSON Schema structure
 * @param schema - The schema object to validate
 * @returns Validation result with errors and warnings
 */
export function validateImportedSchema(schema: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if it's an object
  if (typeof schema !== 'object' || schema === null) {
    errors.push('Schema must be an object');
    return { valid: false, errors, warnings };
  }

  const obj = schema as Record<string, unknown>;

  // Check for required JSON Schema properties
  const hasType = 'type' in obj;
  const hasProperties = 'properties' in obj;
  const hasDefinitions = 'definitions' in obj;
  const hasAllOf = 'allOf' in obj;
  const hasAnyOf = 'anyOf' in obj;
  const hasOneOf = 'oneOf' in obj;
  const hasIf = 'if' in obj;

  if (!hasType && !hasProperties && !hasDefinitions && !hasAllOf && !hasAnyOf && !hasOneOf && !hasIf) {
    errors.push('Schema must have at least one of: type, properties, definitions, allOf, anyOf, oneOf, or if');
  }

  // Validate type if present
  if (hasType) {
    const type = obj.type;
    const validTypes = ['string', 'number', 'integer', 'boolean', 'object', 'array', 'null'];
    if (typeof type === 'string' && !validTypes.includes(type)) {
      warnings.push(`Unknown type: ${type}`);
    } else if (Array.isArray(type)) {
      const invalidTypes = type.filter(t => typeof t === 'string' && !validTypes.includes(t));
      if (invalidTypes.length > 0) {
        warnings.push(`Unknown types: ${invalidTypes.join(', ')}`);
      }
    }
  }

  // Validate properties if present
  if (hasProperties) {
    if (typeof obj.properties !== 'object' || obj.properties === null || Array.isArray(obj.properties)) {
      errors.push('Properties must be an object');
    }
  }

  // Validate definitions if present
  if (hasDefinitions) {
    if (typeof obj.definitions !== 'object' || obj.definitions === null || Array.isArray(obj.definitions)) {
      errors.push('Definitions must be an object');
    }
  }

  // Validate allOf/anyOf/oneOf if present
  const validateArrayOfSchemas = (key: string, value: unknown) => {
    if (!Array.isArray(value)) {
      errors.push(`${key} must be an array`);
      return;
    }
    if (value.length === 0) {
      warnings.push(`${key} is empty`);
    }
    value.forEach((item, index) => {
      if (typeof item !== 'object' || item === null) {
        errors.push(`${key}[${index}] must be an object`);
      }
    });
  };

  if (hasAllOf) validateArrayOfSchemas('allOf', obj.allOf);
  if (hasAnyOf) validateArrayOfSchemas('anyOf', obj.anyOf);
  if (hasOneOf) validateArrayOfSchemas('oneOf', obj.oneOf);

  // Validate if/then/else if present
  if (hasIf) {
    if (typeof obj.if !== 'object' || obj.if === null) {
      errors.push('if must be an object');
    }
    if ('then' in obj && (typeof obj.then !== 'object' || obj.then === null)) {
      errors.push('then must be an object');
    }
    if ('else' in obj && (typeof obj.else !== 'object' || obj.else === null)) {
      errors.push('else must be an object');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate a combined export format (schema + uiSchema)
 * @param data - The imported data object
 * @returns Validation result
 */
export function validateCombinedImport(data: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (typeof data !== 'object' || data === null) {
    errors.push('Import data must be an object');
    return { valid: false, errors, warnings };
  }

  const obj = data as Record<string, unknown>;

  // Check for schema
  if (!('schema' in obj)) {
    errors.push('Missing required field: schema');
  } else {
    const schemaResult = validateImportedSchema(obj.schema);
    errors.push(...schemaResult.errors);
    warnings.push(...schemaResult.warnings);
  }

  // Check for uiSchema (optional but validate if present)
  if ('uiSchema' in obj) {
    if (typeof obj.uiSchema !== 'object' || obj.uiSchema === null) {
      warnings.push('uiSchema must be an object');
    }
  }

  // Check for formData (optional)
  if ('formData' in obj) {
    if (typeof obj.formData !== 'object' || obj.formData === null) {
      warnings.push('formData must be an object');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Extract schema summary for preview
 * @param schema - The schema object
 * @returns Summary object with counts
 */
export function getSchemaSummary(schema: unknown): {
  fieldCount: number;
  definitionCount: number;
  conditionalCount: number;
} {
  let fieldCount = 0;
  let definitionCount = 0;
  let conditionalCount = 0;

  if (typeof schema !== 'object' || schema === null) {
    return { fieldCount, definitionCount, conditionalCount };
  }

  const obj = schema as Record<string, unknown>;

  // Count definitions
  if (obj.definitions && typeof obj.definitions === 'object' && !Array.isArray(obj.definitions)) {
    definitionCount = Object.keys(obj.definitions).length;
  }

  // Count conditionals
  if (Array.isArray(obj.allOf)) conditionalCount += obj.allOf.length;
  if (Array.isArray(obj.anyOf)) conditionalCount += obj.anyOf.length;
  if (Array.isArray(obj.oneOf)) conditionalCount += obj.oneOf.length;
  if (obj.if) conditionalCount += 1;

  // Count root properties
  if (obj.properties && typeof obj.properties === 'object' && !Array.isArray(obj.properties)) {
    fieldCount = Object.keys(obj.properties).length;
  }

  return { fieldCount, definitionCount, conditionalCount };
}


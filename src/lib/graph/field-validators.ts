import type { FieldNode, JSONSchemaType } from '../store/schema-graph';

/**
 * Field validation rules - easily extensible for new field types
 */
export class FieldValidators {

    /**
     * Validates if a field configuration is valid
     */
    static validateField(node: FieldNode): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        // Common validations
        if (!node.title.trim()) {
            errors.push('Field title cannot be empty');
        }

        if (!node.key.trim()) {
            errors.push('Field key cannot be empty');
        }

        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(node.key)) {
            errors.push('Field key must be a valid identifier');
        }

        // Type-specific validations
        switch (node.type) {
            case 'string':
                this.validateStringField(node, errors);
                break;
            case 'number':
                this.validateNumberField(node, errors);
                break;
            case 'array':
                this.validateArrayField(node, errors);
                break;
            case 'enum':
                this.validateEnumField(node, errors);
                break;
        }

        return { valid: errors.length === 0, errors };
    }

    private static validateStringField(node: FieldNode, errors: string[]) {
        if (node.minLength !== undefined && node.maxLength !== undefined) {
            if (node.minLength > node.maxLength) {
                errors.push('Minimum length cannot be greater than maximum length');
            }
        }

        if (node.pattern) {
            try {
                new RegExp(node.pattern);
            } catch {
                errors.push('Invalid regex pattern');
            }
        }
    }

    private static validateNumberField(node: FieldNode, errors: string[]) {
        if (node.minimum !== undefined && node.maximum !== undefined) {
            if (node.minimum > node.maximum) {
                errors.push('Minimum value cannot be greater than maximum value');
            }
        }
    }

    private static validateArrayField(node: FieldNode, errors: string[]) {
        if (node.children && node.children.length > 1) {
            errors.push('Array fields can only have one child type');
        }
    }

    private static validateEnumField(node: FieldNode, errors: string[]) {
        if (!node.enum || node.enum.length === 0) {
            errors.push('Enum fields must have at least one option');
        }

        if (node.enum && new Set(node.enum).size !== node.enum.length) {
            errors.push('Enum options must be unique');
        }
    }

    /**
     * Gets suggested improvements for a field
     */
    static getSuggestions(node: FieldNode): string[] {
        const suggestions: string[] = [];

        if (!node.description) {
            suggestions.push('Consider adding a description to help users understand this field');
        }

        if (node.type === 'string' && !node.maxLength) {
            suggestions.push('Consider setting a maximum length for better validation');
        }

        if (node.type === 'number' && !node.minimum && !node.maximum) {
            suggestions.push('Consider setting min/max values for better validation');
        }

        return suggestions;
    }
}

/**
 * Field type compatibility checker - for future drag-and-drop enhancements
 */
export class FieldCompatibility {

    /**
     * Checks if two field types are compatible for operations like merging
     */
    static areCompatible(type1: JSONSchemaType, type2: JSONSchemaType): boolean {
        // Same types are always compatible
        if (type1 === type2) return true;

        // String and enum are compatible
        if ((type1 === 'string' && type2 === 'enum') || (type1 === 'enum' && type2 === 'string')) {
            return true;
        }

        // Add more compatibility rules as needed
        return false;
    }

    /**
     * Gets the best common type for merging multiple fields
     */
    static getBestCommonType(types: JSONSchemaType[]): JSONSchemaType | null {
        if (types.length === 0) return null;
        if (types.length === 1) return types[0];

        // If all types are the same, return that type
        if (types.every(type => type === types[0])) {
            return types[0];
        }

        // If we have string and enum, prefer string
        if (types.every(type => type === 'string' || type === 'enum')) {
            return 'string';
        }

        // Default to object for complex merging
        return 'object';
    }
} 
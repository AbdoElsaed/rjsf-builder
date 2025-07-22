import { describe, it, expect } from 'vitest';
import { FieldValidators, FieldCompatibility } from '../field-validators';
import type { FieldNode } from '../schema-graph-engine';

describe('FieldValidators', () => {
  describe('validateField', () => {
    it('should validate a correct string field', () => {
      const field: FieldNode = {
        id: 'test-id',
        key: 'testField',
        type: 'string',
        title: 'Test Field',
        minLength: 1,
        maxLength: 100,
        pattern: '^[a-zA-Z]+$',
      };

      const result = FieldValidators.validateField(field);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty title', () => {
      const field: FieldNode = {
        id: 'test-id',
        key: 'testField',
        type: 'string',
        title: '',
      };

      const result = FieldValidators.validateField(field);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Field title cannot be empty');
    });

    it('should reject empty key', () => {
      const field: FieldNode = {
        id: 'test-id',
        key: '',
        type: 'string',
        title: 'Test Field',
      };

      const result = FieldValidators.validateField(field);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Field key cannot be empty');
    });

    it('should reject invalid key format', () => {
      const field: FieldNode = {
        id: 'test-id',
        key: '123invalid',
        type: 'string',
        title: 'Test Field',
      };

      const result = FieldValidators.validateField(field);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Field key must be a valid identifier');
    });

    it('should validate string field constraints', () => {
      const field: FieldNode = {
        id: 'test-id',
        key: 'testField',
        type: 'string',
        title: 'Test Field',
        minLength: 10,
        maxLength: 5, // Invalid: min > max
      };

      const result = FieldValidators.validateField(field);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Minimum length cannot be greater than maximum length');
    });

    it('should validate regex pattern', () => {
      const field: FieldNode = {
        id: 'test-id',
        key: 'testField',
        type: 'string',
        title: 'Test Field',
        pattern: '[invalid regex',
      };

      const result = FieldValidators.validateField(field);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid regex pattern');
    });

    it('should validate number field constraints', () => {
      const field: FieldNode = {
        id: 'test-id',
        key: 'testField',
        type: 'number',
        title: 'Test Field',
        minimum: 100,
        maximum: 50, // Invalid: min > max
      };

      const result = FieldValidators.validateField(field);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Minimum value cannot be greater than maximum value');
    });

    it('should validate enum field', () => {
      const validField: FieldNode = {
        id: 'test-id',
        key: 'testField',
        type: 'enum',
        title: 'Test Field',
        enum: ['option1', 'option2'],
      };

      const result = FieldValidators.validateField(validField);
      expect(result.valid).toBe(true);

      const invalidField: FieldNode = {
        id: 'test-id',
        key: 'testField',
        type: 'enum',
        title: 'Test Field',
        enum: [], // Empty enum
      };

      const invalidResult = FieldValidators.validateField(invalidField);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors).toContain('Enum fields must have at least one option');
    });

    it('should validate array field', () => {
      const validField: FieldNode = {
        id: 'test-id',
        key: 'testField',
        type: 'array',
        title: 'Test Field',
        children: ['child1'],
      };

      const result = FieldValidators.validateField(validField);
      expect(result.valid).toBe(true);

      const invalidField: FieldNode = {
        id: 'test-id',
        key: 'testField',
        type: 'array',
        title: 'Test Field',
        children: ['child1', 'child2'], // Too many children
      };

      const invalidResult = FieldValidators.validateField(invalidField);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors).toContain('Array fields can only have one child type');
    });
  });

  describe('getSuggestions', () => {
    it('should suggest adding description when missing', () => {
      const field: FieldNode = {
        id: 'test-id',
        key: 'testField',
        type: 'string',
        title: 'Test Field',
        // No description
      };

      const suggestions = FieldValidators.getSuggestions(field);
      expect(suggestions).toContain('Consider adding a description to help users understand this field');
    });

    it('should suggest max length for string fields', () => {
      const field: FieldNode = {
        id: 'test-id',
        key: 'testField',
        type: 'string',
        title: 'Test Field',
        description: 'A test field',
        // No maxLength
      };

      const suggestions = FieldValidators.getSuggestions(field);
      expect(suggestions).toContain('Consider setting a maximum length for better validation');
    });

    it('should suggest min/max for number fields', () => {
      const field: FieldNode = {
        id: 'test-id',
        key: 'testField',
        type: 'number',
        title: 'Test Field',
        description: 'A test field',
        // No minimum or maximum
      };

      const suggestions = FieldValidators.getSuggestions(field);
      expect(suggestions).toContain('Consider setting min/max values for better validation');
    });
  });
});

describe('FieldCompatibility', () => {
  describe('areCompatible', () => {
    it('should return true for same types', () => {
      expect(FieldCompatibility.areCompatible('string', 'string')).toBe(true);
      expect(FieldCompatibility.areCompatible('number', 'number')).toBe(true);
      expect(FieldCompatibility.areCompatible('object', 'object')).toBe(true);
    });

    it('should return true for string and enum compatibility', () => {
      expect(FieldCompatibility.areCompatible('string', 'enum')).toBe(true);
      expect(FieldCompatibility.areCompatible('enum', 'string')).toBe(true);
    });

    it('should return false for incompatible types', () => {
      expect(FieldCompatibility.areCompatible('string', 'number')).toBe(false);
      expect(FieldCompatibility.areCompatible('boolean', 'object')).toBe(false);
      expect(FieldCompatibility.areCompatible('array', 'number')).toBe(false);
    });
  });

  describe('getBestCommonType', () => {
    it('should return null for empty array', () => {
      const result = FieldCompatibility.getBestCommonType([]);
      expect(result).toBeNull();
    });

    it('should return single type for single item array', () => {
      const result = FieldCompatibility.getBestCommonType(['string']);
      expect(result).toBe('string');
    });

    it('should return same type when all types are identical', () => {
      const result = FieldCompatibility.getBestCommonType(['string', 'string', 'string']);
      expect(result).toBe('string');
    });

    it('should return string for string and enum mix', () => {
      const result = FieldCompatibility.getBestCommonType(['string', 'enum']);
      expect(result).toBe('string');
    });

    it('should return object for incompatible types', () => {
      const result = FieldCompatibility.getBestCommonType(['string', 'number']);
      expect(result).toBe('object');
    });
  });
});

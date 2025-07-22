import { describe, it, expect, beforeEach } from 'vitest';
import { useFormDataStore } from '../form-data';
import type { RJSFSchema } from '@rjsf/utils';

describe('useFormDataStore', () => {
  beforeEach(() => {
    // Reset store to initial state
    useFormDataStore.setState({ formData: {} });
  });

  describe('updateFormData', () => {
    it('should update form data', () => {
      const newData = {
        name: 'John Doe',
        age: 30,
        active: true,
      };

      useFormDataStore.getState().updateFormData(newData);

      expect(useFormDataStore.getState().formData).toEqual(newData);
    });

    it('should replace existing form data', () => {
      useFormDataStore.getState().updateFormData({ name: 'John' });
      useFormDataStore.getState().updateFormData({ age: 25 });

      expect(useFormDataStore.getState().formData).toEqual({ age: 25 });
      expect(useFormDataStore.getState().formData.name).toBeUndefined();
    });
  });

  describe('migrateFormData', () => {
    it('should preserve data for unchanged fields', () => {
      const initialData = {
        name: 'John Doe',
        age: 30,
        email: 'john@example.com',
      };

      useFormDataStore.getState().updateFormData(initialData);

      const oldSchema: RJSFSchema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' },
          email: { type: 'string' },
        },
      };

      const newSchema: RJSFSchema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' },
          phone: { type: 'string' },
        },
      };

      useFormDataStore.getState().migrateFormData(oldSchema, newSchema);

      const formData = useFormDataStore.getState().formData;
      expect(formData.name).toBe('John Doe');
      expect(formData.age).toBe(30);
      expect(formData.email).toBeUndefined(); // Removed field
      expect(formData.phone).toBeUndefined(); // New field, no data
    });

    it('should handle renamed fields', () => {
      const initialData = {
        firstName: 'John',
        lastName: 'Doe',
      };

      useFormDataStore.getState().updateFormData(initialData);

      const oldSchema: RJSFSchema = {
        type: 'object',
        properties: {
          firstName: { type: 'string' },
          lastName: { type: 'string' },
        },
      };

      const newSchema: RJSFSchema = {
        type: 'object',
        properties: {
          fullName: { type: 'string' },
          lastName: { type: 'string' },
        },
      };

      useFormDataStore.getState().migrateFormData(oldSchema, newSchema);

      const formData = useFormDataStore.getState().formData;
      expect(formData.lastName).toBe('Doe'); // Unchanged
      expect(formData.firstName).toBeUndefined(); // Old field removed
      expect(formData.fullName).toBeUndefined(); // New field, no migration logic
    });

    it('should handle nested objects', () => {
      const initialData = {
        person: {
          name: 'John',
          age: 30,
        },
        address: {
          street: '123 Main St',
          city: 'Anytown',
        },
      };

      useFormDataStore.getState().updateFormData(initialData);

      const oldSchema: RJSFSchema = {
        type: 'object',
        properties: {
          person: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              age: { type: 'number' },
            },
          },
          address: {
            type: 'object',
            properties: {
              street: { type: 'string' },
              city: { type: 'string' },
            },
          },
        },
      };

      const newSchema: RJSFSchema = {
        type: 'object',
        properties: {
          person: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              email: { type: 'string' },
            },
          },
          location: {
            type: 'object',
            properties: {
              country: { type: 'string' },
            },
          },
        },
      };

      useFormDataStore.getState().migrateFormData(oldSchema, newSchema);

      const formData = useFormDataStore.getState().formData;
      // The current implementation only handles top-level migration
      // It keeps the person object as-is since 'person' exists in both schemas
      expect(formData.person).toEqual({ name: 'John', age: 30 }); // Nested migration not implemented
      expect(formData.address).toBeUndefined(); // Entire object removed
      expect(formData.location).toBeUndefined(); // New object, no data
    });

    it('should handle arrays', () => {
      const initialData = {
        tags: ['javascript', 'react', 'typescript'],
        numbers: [1, 2, 3],
      };

      useFormDataStore.getState().updateFormData(initialData);

      const oldSchema: RJSFSchema = {
        type: 'object',
        properties: {
          tags: {
            type: 'array',
            items: { type: 'string' },
          },
          numbers: {
            type: 'array',
            items: { type: 'number' },
          },
        },
      };

      const newSchema: RJSFSchema = {
        type: 'object',
        properties: {
          tags: {
            type: 'array',
            items: { type: 'string' },
          },
          categories: {
            type: 'array',
            items: { type: 'string' },
          },
        },
      };

      useFormDataStore.getState().migrateFormData(oldSchema, newSchema);

      const formData = useFormDataStore.getState().formData;
      expect(formData.tags).toEqual(['javascript', 'react', 'typescript']);
      expect(formData.numbers).toBeUndefined(); // Removed
      expect(formData.categories).toBeUndefined(); // New field, no data
    });

    it('should handle empty schemas', () => {
      const initialData = { name: 'John' };
      useFormDataStore.getState().updateFormData(initialData);

      const oldSchema: RJSFSchema = { type: 'object' };
      const newSchema: RJSFSchema = { type: 'object' };

      useFormDataStore.getState().migrateFormData(oldSchema, newSchema);

      expect(useFormDataStore.getState().formData).toEqual({}); // All data cleared since no properties defined
    });

    it('should handle schema without properties', () => {
      const initialData = { name: 'John', age: 30 };
      useFormDataStore.getState().updateFormData(initialData);

      const oldSchema: RJSFSchema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' },
        },
      };

      const newSchema: RJSFSchema = {
        type: 'object',
        // No properties defined
      };

      useFormDataStore.getState().migrateFormData(oldSchema, newSchema);

      expect(useFormDataStore.getState().formData).toEqual({}); // All data cleared
    });

    it('should preserve data types correctly', () => {
      const initialData = {
        name: 'John',
        age: 30,
        active: true,
        scores: [95, 87, 92],
        metadata: {
          created: '2023-01-01',
          updated: null,
        },
      };

      useFormDataStore.getState().updateFormData(initialData);

      const schema: RJSFSchema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' },
          active: { type: 'boolean' },
          scores: {
            type: 'array',
            items: { type: 'number' },
          },
          metadata: {
            type: 'object',
            properties: {
              created: { type: 'string' },
              updated: { type: 'string' },
            },
          },
        },
      };

      useFormDataStore.getState().migrateFormData(schema, schema); // Same schema

      const formData = useFormDataStore.getState().formData;
      expect(formData).toEqual(initialData);
      expect(typeof formData.name).toBe('string');
      expect(typeof formData.age).toBe('number');
      expect(typeof formData.active).toBe('boolean');
      expect(Array.isArray(formData.scores)).toBe(true);
      expect(typeof formData.metadata).toBe('object');
    });
  });
});

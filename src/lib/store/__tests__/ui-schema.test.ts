import { describe, it, expect, beforeEach } from 'vitest';
import { useUiSchemaStore } from '../ui-schema';
import type { UiSchema } from '../ui-schema';

describe('useUiSchemaStore', () => {
  beforeEach(() => {
    // Reset store to initial state
    useUiSchemaStore.setState({ uiSchema: {} });
  });

  describe('updateUiSchema', () => {
    it('should update the entire UI schema', () => {
      const newSchema = {
        name: {
          'ui:widget': 'text',
          'ui:options': { placeholder: 'Enter name' },
        },
        age: {
          'ui:widget': 'updown',
        },
      };

      useUiSchemaStore.getState().updateUiSchema(newSchema);

      expect(useUiSchemaStore.getState().uiSchema).toEqual(newSchema);
    });

    it('should replace existing UI schema', () => {
      useUiSchemaStore.getState().updateUiSchema({
        name: { 'ui:widget': 'text' },
      });

      useUiSchemaStore.getState().updateUiSchema({
        age: { 'ui:widget': 'updown' },
      });

      expect(useUiSchemaStore.getState().uiSchema).toEqual({
        age: { 'ui:widget': 'updown' },
      });
      expect(useUiSchemaStore.getState().uiSchema.name).toBeUndefined();
    });
  });

  describe('updateFieldUiSchema', () => {
    it('should update UI schema for a simple field', () => {
      const uiOptions: UiSchema = {
        'ui:widget': 'textarea',
        'ui:options': {
          rows: 5,
          placeholder: 'Enter description',
        },
      };

      useUiSchemaStore.getState().updateFieldUiSchema('description', uiOptions);

      expect(useUiSchemaStore.getState().uiSchema.description).toEqual(uiOptions);
    });

    it('should update UI schema for nested field', () => {
      const uiOptions: UiSchema = {
        'ui:widget': 'text',
        'ui:options': { placeholder: 'Street address' },
      };

      useUiSchemaStore.getState().updateFieldUiSchema('address.street', uiOptions);

      const uiSchema = useUiSchemaStore.getState().uiSchema;
      expect(uiSchema.address).toBeDefined();
      expect((uiSchema.address as any).street).toEqual(uiOptions);
    });

    it('should update UI schema for deeply nested field', () => {
      const uiOptions: UiSchema = {
        'ui:widget': 'select',
        'ui:options': { enumOptions: [{ value: 'US', label: 'United States' }] },
      };

      useUiSchemaStore.getState().updateFieldUiSchema('person.address.country', uiOptions);

      const uiSchema = useUiSchemaStore.getState().uiSchema;
      expect(uiSchema.person).toBeDefined();
      expect((uiSchema.person as any).address).toBeDefined();
      expect((uiSchema.person as any).address.country).toEqual(uiOptions);
    });

    it('should merge with existing nested UI schema', () => {
      // First, set up some existing UI schema
      useUiSchemaStore.getState().updateFieldUiSchema('address.street', {
        'ui:widget': 'text',
      });

      useUiSchemaStore.getState().updateFieldUiSchema('address.city', {
        'ui:widget': 'text',
        'ui:options': { placeholder: 'City name' },
      });

      const uiSchema = useUiSchemaStore.getState().uiSchema;
      expect((uiSchema.address as any).street).toEqual({
        'ui:widget': 'text',
      });
      expect((uiSchema.address as any).city).toEqual({
        'ui:widget': 'text',
        'ui:options': { placeholder: 'City name' },
      });
    });

    it('should handle array field paths', () => {
      const uiOptions: UiSchema = {
        'ui:options': {
          addable: true,
          orderable: true,
          removable: true,
        },
      };

      useUiSchemaStore.getState().updateFieldUiSchema('items', uiOptions);

      expect(useUiSchemaStore.getState().uiSchema.items).toEqual(uiOptions);
    });

    it('should handle array item field paths', () => {
      const uiOptions: UiSchema = {
        'ui:widget': 'text',
      };

      useUiSchemaStore.getState().updateFieldUiSchema('items.name', uiOptions);

      const uiSchema = useUiSchemaStore.getState().uiSchema;
      expect(uiSchema.items).toBeDefined();
      expect((uiSchema.items as any).name).toEqual(uiOptions);
    });
  });

  describe('removeFieldUiSchema', () => {
    it('should remove UI schema for a simple field', () => {
      useUiSchemaStore.getState().updateFieldUiSchema('name', { 'ui:widget': 'text' });
      useUiSchemaStore.getState().updateFieldUiSchema('age', { 'ui:widget': 'updown' });

      useUiSchemaStore.getState().removeFieldUiSchema('name');

      const uiSchema = useUiSchemaStore.getState().uiSchema;
      expect(uiSchema.name).toBeUndefined();
      expect(uiSchema.age).toBeDefined();
    });

    it('should remove UI schema for nested field', () => {
      useUiSchemaStore.getState().updateFieldUiSchema('address.street', { 'ui:widget': 'text' });
      useUiSchemaStore.getState().updateFieldUiSchema('address.city', { 'ui:widget': 'text' });

      useUiSchemaStore.getState().removeFieldUiSchema('address.street');

      const uiSchema = useUiSchemaStore.getState().uiSchema;
      expect((uiSchema.address as any)?.street).toBeUndefined();
      expect((uiSchema.address as any)?.city).toBeDefined();
    });

    it('should remove entire nested object if it becomes empty', () => {
      useUiSchemaStore.getState().updateFieldUiSchema('address.street', { 'ui:widget': 'text' });

      useUiSchemaStore.getState().removeFieldUiSchema('address.street');

      expect(useUiSchemaStore.getState().uiSchema.address).toBeUndefined();
    });

    it('should handle deeply nested field removal', () => {
      useUiSchemaStore.getState().updateFieldUiSchema('person.address.street', { 'ui:widget': 'text' });
      useUiSchemaStore.getState().updateFieldUiSchema('person.address.city', { 'ui:widget': 'text' });
      useUiSchemaStore.getState().updateFieldUiSchema('person.name', { 'ui:widget': 'text' });

      useUiSchemaStore.getState().removeFieldUiSchema('person.address.street');

      const uiSchema = useUiSchemaStore.getState().uiSchema;
      expect((uiSchema.person as any)?.address?.street).toBeUndefined();
      expect((uiSchema.person as any)?.address?.city).toBeDefined();
      expect((uiSchema.person as any)?.name).toBeDefined();
    });

    it('should handle removal of non-existent field gracefully', () => {
      useUiSchemaStore.getState().updateFieldUiSchema('name', { 'ui:widget': 'text' });

      // Should not throw error
      useUiSchemaStore.getState().removeFieldUiSchema('nonexistent');
      useUiSchemaStore.getState().removeFieldUiSchema('nested.nonexistent');

      expect(useUiSchemaStore.getState().uiSchema.name).toBeDefined();
    });
  });

  describe('complex scenarios', () => {
    it('should handle mixed operations correctly', () => {
      // Add some initial UI schema
      useUiSchemaStore.getState().updateFieldUiSchema('person.name', { 'ui:widget': 'text' });
      useUiSchemaStore.getState().updateFieldUiSchema('person.age', { 'ui:widget': 'updown' });
      useUiSchemaStore.getState().updateFieldUiSchema('address.street', { 'ui:widget': 'textarea' });

      // Update existing field
      useUiSchemaStore.getState().updateFieldUiSchema('person.name', {
        'ui:widget': 'text',
        'ui:options': { placeholder: 'Full name' },
      });

      // Remove a field
      useUiSchemaStore.getState().removeFieldUiSchema('person.age');

      // Add new nested field
      useUiSchemaStore.getState().updateFieldUiSchema('address.country', { 'ui:widget': 'select' });

      const uiSchema = useUiSchemaStore.getState().uiSchema;
      expect((uiSchema.person as any).name).toEqual({
        'ui:widget': 'text',
        'ui:options': { placeholder: 'Full name' },
      });
      expect((uiSchema.person as any).age).toBeUndefined();
      expect((uiSchema.address as any).street).toEqual({
        'ui:widget': 'textarea',
      });
      expect((uiSchema.address as any).country).toEqual({
        'ui:widget': 'select',
      });
    });

    it('should preserve UI schema structure integrity', () => {
      useUiSchemaStore.getState().updateFieldUiSchema('form.section1.field1', { 'ui:widget': 'text' });
      useUiSchemaStore.getState().updateFieldUiSchema('form.section1.field2', { 'ui:widget': 'number' });
      useUiSchemaStore.getState().updateFieldUiSchema('form.section2.field3', { 'ui:widget': 'checkbox' });

      const expectedStructure = {
        form: {
          section1: {
            field1: { 'ui:widget': 'text' },
            field2: { 'ui:widget': 'number' },
          },
          section2: {
            field3: { 'ui:widget': 'checkbox' },
          },
        },
      };

      expect(useUiSchemaStore.getState().uiSchema).toEqual(expectedStructure);
    });
  });
});

import { describe, it, expect } from 'vitest';
import { cn, getNodePath } from '../utils';
import type { SchemaGraph } from '../graph/schema-graph-engine';

describe('utils', () => {
  describe('cn', () => {
    it('should merge class names correctly', () => {
      expect(cn('class1', 'class2')).toBe('class1 class2');
    });

    it('should handle conditional classes', () => {
      // eslint-disable-next-line no-constant-binary-expression
      expect(cn('base', true && 'conditional', false && 'hidden')).toBe('base conditional');
    });

    it('should handle undefined and null values', () => {
      expect(cn('base', undefined, null, 'valid')).toBe('base valid');
    });

    it('should merge Tailwind classes correctly', () => {
      // This tests the twMerge functionality
      expect(cn('p-4', 'p-2')).toBe('p-2'); // Later padding should override
      expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
    });

    it('should handle arrays and objects', () => {
      expect(cn(['class1', 'class2'], { class3: true, class4: false })).toBe('class1 class2 class3');
    });
  });

  describe('getNodePath', () => {
    const createTestGraph = (): SchemaGraph => ({
      nodes: {
        root: {
          id: 'root',
          key: 'root',
          type: 'object',
          title: 'Root',
          children: ['person-id'],
        },
        'person-id': {
          id: 'person-id',
          key: 'person',
          type: 'object',
          title: 'Person',
          parentId: 'root',
          children: ['name-id', 'address-id'],
        },
        'name-id': {
          id: 'name-id',
          key: 'name',
          type: 'string',
          title: 'Name',
          parentId: 'person-id',
        },
        'address-id': {
          id: 'address-id',
          key: 'address',
          type: 'object',
          title: 'Address',
          parentId: 'person-id',
          children: ['street-id'],
        },
        'street-id': {
          id: 'street-id',
          key: 'street',
          type: 'string',
          title: 'Street',
          parentId: 'address-id',
        },
      },
      rootId: 'root',
    });

    it('should return empty string for root node', () => {
      const graph = createTestGraph();
      expect(getNodePath(graph, 'root')).toBe('');
    });

    it('should return correct path for top-level node', () => {
      const graph = createTestGraph();
      expect(getNodePath(graph, 'person-id')).toBe('person');
    });

    it('should return correct path for nested node', () => {
      const graph = createTestGraph();
      expect(getNodePath(graph, 'name-id')).toBe('person.name');
    });

    it('should return correct path for deeply nested node', () => {
      const graph = createTestGraph();
      expect(getNodePath(graph, 'street-id')).toBe('person.address.street');
    });

    it('should handle non-existent node', () => {
      const graph = createTestGraph();
      expect(getNodePath(graph, 'non-existent')).toBe('');
    });

    it('should handle orphaned node', () => {
      const graph = createTestGraph();
      // Add an orphaned node
      graph.nodes['orphan-id'] = {
        id: 'orphan-id',
        key: 'orphan',
        type: 'string',
        title: 'Orphan',
        parentId: 'non-existent-parent',
      };

      expect(getNodePath(graph, 'orphan-id')).toBe('orphan');
    });

    it('should handle circular references gracefully', () => {
      const graph = createTestGraph();
      // Create a circular reference (should not happen in normal usage)
      graph.nodes['person-id'].parentId = 'street-id';
      graph.nodes['street-id'].parentId = 'person-id';

      // Should not cause infinite loop
      const path = getNodePath(graph, 'street-id');
      expect(typeof path).toBe('string');
    });

    it('should handle complex nested structure', () => {
      const complexGraph: SchemaGraph = {
        nodes: {
          root: {
            id: 'root',
            key: 'root',
            type: 'object',
            title: 'Root',
            children: ['form-id'],
          },
          'form-id': {
            id: 'form-id',
            key: 'form',
            type: 'object',
            title: 'Form',
            parentId: 'root',
            children: ['sections-id'],
          },
          'sections-id': {
            id: 'sections-id',
            key: 'sections',
            type: 'array',
            title: 'Sections',
            parentId: 'form-id',
            children: ['section-item-id'],
          },
          'section-item-id': {
            id: 'section-item-id',
            key: 'items',
            type: 'object',
            title: 'Section Item',
            parentId: 'sections-id',
            children: ['field-id'],
          },
          'field-id': {
            id: 'field-id',
            key: 'field',
            type: 'string',
            title: 'Field',
            parentId: 'section-item-id',
          },
        },
        rootId: 'root',
      };

      expect(getNodePath(complexGraph, 'field-id')).toBe('form.sections.items.field');
    });

    it('should handle single character keys', () => {
      const graph: SchemaGraph = {
        nodes: {
          root: {
            id: 'root',
            key: 'root',
            type: 'object',
            title: 'Root',
            children: ['a-id'],
          },
          'a-id': {
            id: 'a-id',
            key: 'a',
            type: 'object',
            title: 'A',
            parentId: 'root',
            children: ['b-id'],
          },
          'b-id': {
            id: 'b-id',
            key: 'b',
            type: 'string',
            title: 'B',
            parentId: 'a-id',
          },
        },
        rootId: 'root',
      };

      expect(getNodePath(graph, 'b-id')).toBe('a.b');
    });

    it('should handle numeric keys', () => {
      const graph: SchemaGraph = {
        nodes: {
          root: {
            id: 'root',
            key: 'root',
            type: 'object',
            title: 'Root',
            children: ['field1-id'],
          },
          'field1-id': {
            id: 'field1-id',
            key: 'field1',
            type: 'object',
            title: 'Field 1',
            parentId: 'root',
            children: ['field2-id'],
          },
          'field2-id': {
            id: 'field2-id',
            key: 'field2',
            type: 'string',
            title: 'Field 2',
            parentId: 'field1-id',
          },
        },
        rootId: 'root',
      };

      expect(getNodePath(graph, 'field2-id')).toBe('field1.field2');
    });
  });
});

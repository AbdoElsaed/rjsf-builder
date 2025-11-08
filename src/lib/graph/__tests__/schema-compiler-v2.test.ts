import { describe, it, expect } from 'vitest';
import { createEmptyGraph, addNode } from '../schema-graph-v2';
import { createDefinition, createRefToDefinition } from '../schema-graph-v2';
import { createConditionalGroup, addConditionToGroup } from '../conditional-groups';
import { compileToJsonSchema } from '../schema-compiler-v2';
import type { SchemaGraphV2, SchemaNode } from '../schema-graph-v2';

describe('Schema Compiler V2', () => {
  describe('compileToJsonSchema', () => {
    it('should compile simple object schema', () => {
      const graph = createEmptyGraph();
      
      const nameNode = addNode(graph, {
        key: 'name',
        type: 'string',
        title: 'Name',
        required: true,
      });
      
      const nameId = Array.from(nameNode.nodes.keys())
        .find(id => id !== 'root' && nameNode.nodes.get(id)?.key === 'name')!;
      
      const ageNode = addNode(nameNode, {
        key: 'age',
        type: 'number',
        title: 'Age',
      });
      
      const ageId = Array.from(ageNode.nodes.keys())
        .find(id => id !== 'root' && id !== nameId && ageNode.nodes.get(id)?.key === 'age')!;
      
      const schema = compileToJsonSchema(ageNode);
      
      expect(schema.type).toBe('object');
      expect(schema.properties).toBeDefined();
      expect(schema.properties?.name).toBeDefined();
      expect(schema.properties?.age).toBeDefined();
      expect(schema.required).toContain('name');
    });
    
    it('should compile nested object schema', () => {
      const graph = createEmptyGraph();
      
      const personNode = addNode(graph, {
        key: 'person',
        type: 'object',
        title: 'Person',
      });
      
      const personId = Array.from(personNode.nodes.keys())
        .find(id => id !== 'root' && personNode.nodes.get(id)?.key === 'person')!;
      
      const nameNode = addNode(personNode, {
        key: 'name',
        type: 'string',
        title: 'Name',
      }, personId);
      
      const addressNode = addNode(nameNode, {
        key: 'address',
        type: 'object',
        title: 'Address',
      }, personId);
      
      const addressId = Array.from(addressNode.nodes.keys())
        .find(id => id !== 'root' && id !== personId && addressNode.nodes.get(id)?.key === 'address')!;
      
      const streetNode = addNode(addressNode, {
        key: 'street',
        type: 'string',
        title: 'Street',
      }, addressId);
      
      const schema = compileToJsonSchema(streetNode);
      
      expect(schema.type).toBe('object');
      expect(schema.properties?.person).toBeDefined();
      const personSchema = schema.properties?.person as any;
      expect(personSchema.type).toBe('object');
      expect(personSchema.properties?.address).toBeDefined();
      const addressSchema = personSchema.properties?.address as any;
      expect(addressSchema.properties?.street).toBeDefined();
    });
    
    it('should compile enum fields', () => {
      const graph = createEmptyGraph();
      
      const enumNode = addNode(graph, {
        key: 'status',
        type: 'enum',
        title: 'Status',
        enum: ['active', 'inactive'],
        enumNames: ['Active', 'Inactive'],
      });
      
      const schema = compileToJsonSchema(enumNode);
      
      expect(schema.properties?.status).toBeDefined();
      const statusSchema = schema.properties?.status as any;
      expect(statusSchema.type).toBe('string');
      expect(statusSchema.enum).toEqual(['active', 'inactive']);
      expect(statusSchema.enumNames).toEqual(['Active', 'Inactive']);
    });
    
    it('should compile definitions section', () => {
      const graph = createEmptyGraph();
      
      // Create an enum node
      const enumNode = addNode(graph, {
        key: 'yes_no_enum',
        type: 'enum',
        title: 'Yes/No',
        enum: ['yes', 'no'],
        enumNames: ['نعم', 'لا'],
      });
      
      const enumId = Array.from(enumNode.nodes.keys())
        .find(id => id !== 'root' && enumNode.nodes.get(id)?.key === 'yes_no_enum')!;
      
      // Create definition from enum
      const defGraph = createDefinition(enumNode, 'yes_no', enumId);
      
      // Create a reference to the definition
      const refGraph = createRefToDefinition(defGraph, 'yes_no', 'root', 'has_car');
      
      const schema = compileToJsonSchema(refGraph);
      
      expect(schema.definitions).toBeDefined();
      expect(schema.definitions?.yes_no).toBeDefined();
      expect(schema.properties?.has_car).toBeDefined();
      const refSchema = schema.properties?.has_car as any;
      expect(refSchema.$ref).toBe('#/definitions/yes_no');
    });
    
    it('should compile array fields', () => {
      const graph = createEmptyGraph();
      
      const arrayNode = addNode(graph, {
        key: 'tags',
        type: 'array',
        title: 'Tags',
        minItems: 1,
        maxItems: 10,
      });
      
      const arrayId = Array.from(arrayNode.nodes.keys())
        .find(id => id !== 'root' && arrayNode.nodes.get(id)?.key === 'tags')!;
      
      const itemNode = addNode(arrayNode, {
        key: 'item',
        type: 'string',
        title: 'Tag',
      }, arrayId);
      
      const schema = compileToJsonSchema(itemNode);
      
      expect(schema.properties?.tags).toBeDefined();
      const tagsSchema = schema.properties?.tags as any;
      expect(tagsSchema.type).toBe('array');
      expect(tagsSchema.minItems).toBe(1);
      expect(tagsSchema.maxItems).toBe(10);
      expect(tagsSchema.items).toBeDefined();
      expect(tagsSchema.items.type).toBe('string');
    });
    
    it('should compile conditional groups (allOf)', () => {
      const graph = createEmptyGraph();
      
      // Create a field to condition on
      const conditionField = addNode(graph, {
        key: 'building_exists',
        type: 'enum',
        title: 'Building Exists',
        enum: ['yes', 'no'],
      });
      
      const conditionFieldId = Array.from(conditionField.nodes.keys())
        .find(id => id !== 'root' && conditionField.nodes.get(id)?.key === 'building_exists')!;
      
      // Create allOf group
      const groupGraph = createConditionalGroup(conditionField, 'allOf', 'root');
      const groupId = Array.from(groupGraph.nodes.keys())
        .find(id => id !== 'root' && groupGraph.nodes.get(id)?.type === 'allOf')!;
      
      // Create then branch
      const thenBranch = addNode(groupGraph, {
        key: 'then_branch',
        type: 'object',
        title: 'Then Branch',
      });
      
      const thenId = Array.from(thenBranch.nodes.keys())
        .find(id => id !== 'root' && id !== groupId && thenBranch.nodes.get(id)?.type === 'object')!;
      
      // Add condition to group
      const withCondition = addConditionToGroup(thenBranch, groupId, {
        if: {
          field: 'building_exists',
          operator: 'equals',
          value: 'yes',
        },
        then: thenId,
      });
      
      const schema = compileToJsonSchema(withCondition);
      
      expect(schema.allOf).toBeDefined();
      expect(Array.isArray(schema.allOf)).toBe(true);
      expect(schema.allOf?.length).toBeGreaterThan(0);
      
      const allOfCondition = schema.allOf?.[0] as any;
      expect(allOfCondition.if).toBeDefined();
      expect(allOfCondition.then).toBeDefined();
    });
    
    it('should compile string field with validation', () => {
      const graph = createEmptyGraph();
      
      const stringNode = addNode(graph, {
        key: 'email',
        type: 'string',
        title: 'Email',
        format: 'email',
        minLength: 5,
        maxLength: 100,
        pattern: '^[\\w\\.-]+@[\\w\\.-]+\\.[a-zA-Z]{2,}$',
      });
      
      const schema = compileToJsonSchema(stringNode);
      
      expect(schema.properties?.email).toBeDefined();
      const emailSchema = schema.properties?.email as any;
      expect(emailSchema.type).toBe('string');
      expect(emailSchema.format).toBe('email');
      expect(emailSchema.minLength).toBe(5);
      expect(emailSchema.maxLength).toBe(100);
      expect(emailSchema.pattern).toBeDefined();
    });
    
    it('should compile number field with validation', () => {
      const graph = createEmptyGraph();
      
      const numberNode = addNode(graph, {
        key: 'age',
        type: 'number',
        title: 'Age',
        minimum: 0,
        maximum: 120,
        multipleOf: 1,
      });
      
      const schema = compileToJsonSchema(numberNode);
      
      expect(schema.properties?.age).toBeDefined();
      const ageSchema = schema.properties?.age as any;
      expect(ageSchema.type).toBe('number');
      expect(ageSchema.minimum).toBe(0);
      expect(ageSchema.maximum).toBe(120);
      expect(ageSchema.multipleOf).toBe(1);
    });
  });
});


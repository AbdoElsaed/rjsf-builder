import { describe, it, expect } from 'vitest';
import type { RJSFSchema } from "@rjsf/utils";
import { fromJsonSchema } from '../schema-importer-v2';
import { compileToJsonSchema } from '../schema-compiler-v2';
import { getDefinitions } from '../schema-graph-v2';

describe('Schema Importer V2', () => {
  describe('fromJsonSchema', () => {
    it('should import simple object schema', () => {
      const inputSchema: RJSFSchema = {
        type: 'object',
        title: 'User',
        properties: {
          name: {
            type: 'string',
            title: 'Name',
          },
          age: {
            type: 'number',
            title: 'Age',
          },
        },
        required: ['name'],
      };
      
      const graph = fromJsonSchema(inputSchema);
      
      expect(graph.nodes.has('root')).toBe(true);
      const rootNode = graph.nodes.get('root');
      expect(rootNode?.title).toBe('User');
      
      const children = Array.from(graph.nodes.values())
        .filter(n => n.id !== 'root' && graph.parentIndex.get(n.id) === 'root');
      
      expect(children.length).toBeGreaterThanOrEqual(2);
      const nameNode = children.find(c => c.key === 'name');
      const ageNode = children.find(c => c.key === 'age');
      
      expect(nameNode).toBeDefined();
      expect(nameNode?.type).toBe('string');
      expect(nameNode?.required).toBe(true);
      expect(ageNode).toBeDefined();
      expect(ageNode?.type).toBe('number');
    });
    
    it('should import definitions section', () => {
      const inputSchema: RJSFSchema = {
        type: 'object',
        definitions: {
          yes_no: {
            type: 'string',
            enum: ['yes', 'no'],
            enumNames: ['نعم', 'لا'],
            default: 'no',
          },
        },
        properties: {},
      };
      
      const graph = fromJsonSchema(inputSchema);
      
      expect(graph.definitions.has('yes_no')).toBe(true);
      const definitionNodeId = graph.definitions.get('yes_no');
      expect(definitionNodeId).toBeDefined();
      
      const definitionNode = graph.nodes.get(definitionNodeId!);
      expect(definitionNode).toBeDefined();
      expect(definitionNode?.type).toBe('definition');
      expect(definitionNode?.enum).toEqual(['yes', 'no']);
    });
    
    it('should import $ref references', () => {
      const inputSchema: RJSFSchema = {
        type: 'object',
        definitions: {
          yes_no: {
            type: 'string',
            enum: ['yes', 'no'],
          },
        },
        properties: {
          has_car: {
            $ref: '#/definitions/yes_no',
            title: 'Has Car',
          },
        },
      };
      
      const graph = fromJsonSchema(inputSchema);
      
      // Check that ref node was created
      const refNodes = Array.from(graph.nodes.values())
        .filter(n => n.type === 'ref');
      
      expect(refNodes.length).toBeGreaterThan(0);
      const refNode = refNodes.find(n => n.key === 'has_car');
      expect(refNode).toBeDefined();
      expect(refNode?.refTarget).toBe('yes_no');
      expect(refNode?.resolvedNodeId).toBeDefined();
    });
    
    it('should import allOf with if/then', () => {
      const inputSchema: RJSFSchema = {
        type: 'object',
        properties: {
          building_exists: {
            type: 'string',
            enum: ['yes', 'no'],
          },
        },
        allOf: [
          {
            if: {
              properties: {
                building_exists: {
                  const: 'yes',
                },
              },
              required: ['building_exists'],
            },
            then: {
              properties: {
                floor_count: {
                  type: 'number',
                  title: 'Floor Count',
                },
              },
            },
          },
        ],
      };
      
      const graph = fromJsonSchema(inputSchema);
      
      // Check that allOf group was created
      const allOfNodes = Array.from(graph.nodes.values())
        .filter(n => n.type === 'allOf');
      
      expect(allOfNodes.length).toBeGreaterThan(0);
      const allOfNode = allOfNodes[0];
      expect(allOfNode.conditions).toBeDefined();
      expect(allOfNode.conditions?.length).toBeGreaterThan(0);
      
      // Verify compilation back to JSON Schema
      const compiled = compileToJsonSchema(graph);
      expect(compiled.allOf).toBeDefined();
      expect(Array.isArray(compiled.allOf)).toBe(true);
    });
    
    it('should import allOf with $ref in then', () => {
      const inputSchema: RJSFSchema = {
        type: 'object',
        definitions: {
          building_exists_yes: {
            type: 'object',
            properties: {
              floor_count: {
                type: 'number',
                title: 'Floor Count',
              },
            },
          },
        },
        properties: {
          building_exists: {
            type: 'string',
            enum: ['yes', 'no'],
          },
        },
        allOf: [
          {
            if: {
              properties: {
                building_exists: {
                  const: 'yes',
                },
              },
              required: ['building_exists'],
            },
            then: {
              $ref: '#/definitions/building_exists_yes',
            },
          },
        ],
      };
      
      const graph = fromJsonSchema(inputSchema);
      
      // Verify definitions were imported
      expect(graph.definitions.has('building_exists_yes')).toBe(true);
      
      // Verify allOf group was created
      const allOfNodes = Array.from(graph.nodes.values())
        .filter(n => n.type === 'allOf');
      
      expect(allOfNodes.length).toBeGreaterThan(0);
      const allOfNode = allOfNodes[0];
      expect(allOfNode.conditions?.length).toBeGreaterThan(0);
      
      // Verify compilation maintains $ref
      const compiled = compileToJsonSchema(graph);
      expect(compiled.allOf).toBeDefined();
      const firstCondition = compiled.allOf?.[0] as any;
      expect(firstCondition.then?.$ref).toBe('#/definitions/building_exists_yes');
    });
    
    it('should import nested object structures', () => {
      const inputSchema: RJSFSchema = {
        type: 'object',
        properties: {
          person: {
            type: 'object',
            title: 'Person',
            properties: {
              name: {
                type: 'string',
                title: 'Name',
              },
              address: {
                type: 'object',
                title: 'Address',
                properties: {
                  street: {
                    type: 'string',
                    title: 'Street',
                  },
                },
              },
            },
          },
        },
      };
      
      const graph = fromJsonSchema(inputSchema);
      
      // Verify nested structure
      const personNode = Array.from(graph.nodes.values())
        .find(n => n.key === 'person');
      
      expect(personNode).toBeDefined();
      
      const personChildren = Array.from(graph.nodes.values())
        .filter(n => graph.parentIndex.get(n.id) === personNode?.id);
      
      expect(personChildren.length).toBeGreaterThanOrEqual(2);
      
      const addressNode = personChildren.find(c => c.key === 'address');
      expect(addressNode).toBeDefined();
      
      const addressChildren = Array.from(graph.nodes.values())
        .filter(n => graph.parentIndex.get(n.id) === addressNode?.id);
      
      expect(addressChildren.length).toBeGreaterThan(0);
      const streetNode = addressChildren.find(c => c.key === 'street');
      expect(streetNode).toBeDefined();
    });
    
    it('should import array fields with items', () => {
      const inputSchema: RJSFSchema = {
        type: 'object',
        properties: {
          tags: {
            type: 'array',
            title: 'Tags',
            items: {
              type: 'string',
              title: 'Tag',
            },
            minItems: 1,
            maxItems: 10,
          },
        },
      };
      
      const graph = fromJsonSchema(inputSchema);
      
      const tagsNode = Array.from(graph.nodes.values())
        .find(n => n.key === 'tags');
      
      expect(tagsNode).toBeDefined();
      expect(tagsNode?.type).toBe('array');
      expect(tagsNode?.minItems).toBe(1);
      expect(tagsNode?.maxItems).toBe(10);
      
      // Verify item type
      const tagChildren = Array.from(graph.nodes.values())
        .filter(n => graph.parentIndex.get(n.id) === tagsNode?.id);
      
      expect(tagChildren.length).toBeGreaterThan(0);
      const itemNode = tagChildren[0];
      expect(itemNode.type).toBe('string');
    });
    
    it('should handle round-trip import/export', () => {
      const inputSchema: RJSFSchema = {
        type: 'object',
        title: 'Test Form',
        definitions: {
          yes_no: {
            type: 'string',
            enum: ['yes', 'no'],
            enumNames: ['نعم', 'لا'],
          },
        },
        properties: {
          name: {
            type: 'string',
            title: 'Name',
          },
          has_car: {
            $ref: '#/definitions/yes_no',
            title: 'Has Car',
          },
        },
        required: ['name'],
        allOf: [
          {
            if: {
              properties: {
                has_car: {
                  const: 'yes',
                },
              },
              required: ['has_car'],
            },
            then: {
              properties: {
                car_model: {
                  type: 'string',
                  title: 'Car Model',
                },
              },
            },
          },
        ],
      };
      
      // Import
      const graph = fromJsonSchema(inputSchema);
      
      // Verify import
      expect(graph.definitions.has('yes_no')).toBe(true);
      expect(graph.nodes.size).toBeGreaterThan(3);
      
      // Export
      const exportedSchema = compileToJsonSchema(graph);
      
      // Verify export structure
      expect(exportedSchema.type).toBe('object');
      expect(exportedSchema.title).toBe('Test Form');
      expect(exportedSchema.definitions).toBeDefined();
      expect(exportedSchema.definitions?.yes_no).toBeDefined();
      expect(exportedSchema.properties?.name).toBeDefined();
      expect(exportedSchema.properties?.has_car).toBeDefined();
      expect((exportedSchema.properties?.has_car as any).$ref).toBe('#/definitions/yes_no');
      expect(exportedSchema.allOf).toBeDefined();
    });
  });
});


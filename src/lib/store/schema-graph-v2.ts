import { create } from 'zustand';
import type { RJSFSchema } from "@rjsf/utils";
import type { SchemaGraph, SchemaNode, EdgeType } from '../graph/schema-graph';
import {
  createEmptyGraph,
  addNode,
  removeNode,
  updateNode,
  moveNode as moveNodeV2,
  reorderNode,
  getChildren,
  getParent,
} from '../graph/schema-graph';
import { fromJsonSchema } from '../graph/schema-importer';
import { compileToJsonSchema } from '../graph/schema-compiler';
import { generateUiSchema } from '../ui-schema/ui-schema-generator';
import { useUiSchemaStore } from './ui-schema';

export type JSONSchemaType = 'string' | 'number' | 'boolean' | 'object' | 'array' | 'enum';

interface SchemaGraphState {
  graph: SchemaGraph;

  // Actions
  addNode: (node: Omit<SchemaNode, 'id'>, parentId?: string) => string;
  removeNode: (nodeId: string) => void;
  updateNode: (nodeId: string, updates: Partial<SchemaNode>) => void;
  moveNode: (nodeId: string, newParentId: string, edgeType?: EdgeType) => void;
  reorderNode: (nodeId: string, newIndex: number) => void;
  setSchemaFromJson: (inputSchema: RJSFSchema) => void;
  validateGraph: () => { valid: boolean; errors: string[] };

  // Compiler
  compileToJsonSchema: () => RJSFSchema;
  
  // Helpers
  getNode: (nodeId: string) => SchemaNode | undefined;
  getChildren: (nodeId: string) => SchemaNode[];
  getParent: (nodeId: string) => SchemaNode | null;
}

// Create the store using SchemaGraph directly
export const useSchemaGraphStore = create<SchemaGraphState>((set, get) => {
  return {
    // Initial state
    graph: createEmptyGraph(),

    // Actions - use V2 functions directly
    addNode: (nodeData: Omit<SchemaNode, 'id'>, parentId = 'root') => {
      const state = get();
      const newGraph = addNode(state.graph, nodeData, parentId);
      
      // Find the new node ID
      const newNodeId = Array.from(newGraph.nodes.keys())
        .find(id => id !== parentId && !state.graph.nodes.has(id)) || '';
      
      set({ graph: newGraph });
      
      // Regenerate UI schema
      const { regenerateFromGraph } = useUiSchemaStore.getState();
      regenerateFromGraph(newGraph);
      
      return newNodeId;
    },

    removeNode: (nodeId: string) => {
      const state = get();
      const newGraph = removeNode(state.graph, nodeId);
      set({ graph: newGraph });
      
      // Regenerate UI schema
      const { regenerateFromGraph } = useUiSchemaStore.getState();
      regenerateFromGraph(newGraph);
    },

    updateNode: (nodeId: string, updates: Partial<SchemaNode>) => {
      const state = get();
      const newGraph = updateNode(state.graph, nodeId, updates);
      set({ graph: newGraph });
      
      // Regenerate UI schema if structure changed
      const { regenerateFromGraph } = useUiSchemaStore.getState();
      regenerateFromGraph(newGraph);
    },

    moveNode: (nodeId: string, newParentId: string, edgeType: EdgeType = 'child') => {
      const state = get();
      const newGraph = moveNodeV2(state.graph, nodeId, newParentId, edgeType);
      set({ graph: newGraph });
      
      // Regenerate UI schema
      const { regenerateFromGraph } = useUiSchemaStore.getState();
      regenerateFromGraph(newGraph);
    },

    reorderNode: (nodeId: string, newIndex: number) => {
      const state = get();
      const newGraph = reorderNode(state.graph, nodeId, newIndex);
      set({ graph: newGraph });
      
      // Regenerate UI schema
      const { regenerateFromGraph } = useUiSchemaStore.getState();
      regenerateFromGraph(newGraph);
    },

    setSchemaFromJson: (inputSchema: RJSFSchema) => {
      const newGraph = fromJsonSchema(inputSchema);
      set({ graph: newGraph });
      
      // Regenerate UI schema
      const { regenerateFromGraph } = useUiSchemaStore.getState();
      regenerateFromGraph(newGraph);
    },

    validateGraph: () => {
      const state = get();
      const errors: string[] = [];
      
      // Check for orphaned nodes
      const reachableNodes = new Set<string>();
      const traverse = (nodeId: string) => {
        if (reachableNodes.has(nodeId)) return;
        reachableNodes.add(nodeId);
        const children = getChildren(state.graph, nodeId, 'child');
        children.forEach(child => traverse(child.id));
      };
      traverse(state.graph.rootId);
      
      state.graph.nodes.forEach((node, nodeId) => {
        if (!reachableNodes.has(nodeId) && nodeId !== state.graph.rootId) {
          errors.push(`Orphaned node detected: ${nodeId}`);
        }
      });
      
      // Check for circular references
      const visited = new Set<string>();
      const recursionStack = new Set<string>();
      
      const hasCycle = (nodeId: string): boolean => {
        if (recursionStack.has(nodeId)) return true;
        if (visited.has(nodeId)) return false;
        
        visited.add(nodeId);
        recursionStack.add(nodeId);
        
        const children = getChildren(state.graph, nodeId, 'child');
        for (const child of children) {
          if (hasCycle(child.id)) return true;
        }
        
        recursionStack.delete(nodeId);
        return false;
      };
      
      if (hasCycle(state.graph.rootId)) {
        errors.push('Circular reference detected in graph');
      }
      
      return { valid: errors.length === 0, errors };
    },

    compileToJsonSchema: () => {
      const state = get();
      return compileToJsonSchema(state.graph);
    },

    // Helper methods
    getNode: (nodeId: string) => {
      const state = get();
      return state.graph.nodes.get(nodeId);
    },

    getChildren: (nodeId: string) => {
      const state = get();
      return getChildren(state.graph, nodeId, 'child');
    },

    getParent: (nodeId: string) => {
      const state = get();
      return getParent(state.graph, nodeId);
    },
  };
});

// Export types for convenience
export type { SchemaGraph, SchemaNode };
export type { JSONSchemaType };

// Type alias for backward compatibility during migration
export type FieldNode = SchemaNode;
export type SchemaGraph = SchemaGraph;


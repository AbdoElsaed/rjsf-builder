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
import { useUiSchemaStore } from './ui-schema';
import { createDefinition, createRefToDefinition, getDefinitions } from '../graph/schema-graph';

// Debounce UI schema regeneration to batch updates
let uiSchemaRegenerationTimer: ReturnType<typeof setTimeout> | null = null;
const DEBOUNCE_DELAY = 100; // 100ms debounce

function scheduleUiSchemaRegeneration(graph: SchemaGraph) {
  if (uiSchemaRegenerationTimer) {
    clearTimeout(uiSchemaRegenerationTimer);
  }
  uiSchemaRegenerationTimer = setTimeout(() => {
    const { regenerateFromGraph } = useUiSchemaStore.getState();
    regenerateFromGraph(graph);
    uiSchemaRegenerationTimer = null;
  }, DEBOUNCE_DELAY);
}

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
  importSchema: (inputSchema: RJSFSchema, mode: 'replace' | 'merge') => void;
  validateGraph: () => { valid: boolean; errors: string[] };

  // Compiler
  compileToJsonSchema: () => RJSFSchema;
  
  // Helpers
  getNode: (nodeId: string) => SchemaNode | undefined;
  getChildren: (nodeId: string) => SchemaNode[];
  getParent: (nodeId: string) => SchemaNode | null;
  
  // Definitions
  saveAsDefinition: (nodeId: string, name: string, disconnectFromTree?: boolean) => void;
  createRefToDefinition: (definitionName: string, parentId: string, key?: string) => string;
  getAllDefinitions: () => Map<string, SchemaNode>;
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
      
      // Debounced UI schema regeneration
      scheduleUiSchemaRegeneration(newGraph);
      
      return newNodeId;
    },

    removeNode: (nodeId: string) => {
      const state = get();
      const newGraph = removeNode(state.graph, nodeId);
      set({ graph: newGraph });
      
      // Debounced UI schema regeneration
      scheduleUiSchemaRegeneration(newGraph);
    },

    updateNode: (nodeId: string, updates: Partial<SchemaNode>) => {
      const state = get();
      const newGraph = updateNode(state.graph, nodeId, updates);
      set({ graph: newGraph });
      
      // Debounced UI schema regeneration - only regenerate if structural changes
      // (key, type, or children changes affect UI schema)
      const affectsUiSchema = updates.key !== undefined || 
                              updates.type !== undefined ||
                              updates.title !== undefined;
      if (affectsUiSchema) {
        scheduleUiSchemaRegeneration(newGraph);
      }
    },

    moveNode: (nodeId: string, newParentId: string, edgeType: EdgeType = 'child') => {
      const state = get();
      const newGraph = moveNodeV2(state.graph, nodeId, newParentId, edgeType);
      set({ graph: newGraph });
      
      // Debounced UI schema regeneration
      scheduleUiSchemaRegeneration(newGraph);
    },

    reorderNode: (nodeId: string, newIndex: number) => {
      const state = get();
      const newGraph = reorderNode(state.graph, nodeId, newIndex);
      set({ graph: newGraph });
      
      // Debounced UI schema regeneration (order affects ui:order)
      scheduleUiSchemaRegeneration(newGraph);
    },

    setSchemaFromJson: (inputSchema: RJSFSchema) => {
      const newGraph = fromJsonSchema(inputSchema);
      set({ graph: newGraph });
      
      // Immediate UI schema regeneration for schema import
      const { regenerateFromGraph } = useUiSchemaStore.getState();
      regenerateFromGraph(newGraph);
    },

    importSchema: (inputSchema: RJSFSchema, mode: 'replace' | 'merge') => {
      if (mode === 'replace') {
        // Replace mode: clear current graph and import new schema
        const newGraph = fromJsonSchema(inputSchema);
        set({ graph: newGraph });
        scheduleUiSchemaRegeneration(newGraph);
      } else {
        // Merge mode: combine existing graph with imported schema
        // For now, merge mode just replaces (can be enhanced later)
        // TODO: Implement proper merge logic that combines definitions and properties
        const newGraph = fromJsonSchema(inputSchema);
        set({ graph: newGraph });
        scheduleUiSchemaRegeneration(newGraph);
      }
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
      
      state.graph.nodes.forEach((_, nodeId) => {
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
    
    // Definition methods
    saveAsDefinition: (nodeId: string, name: string, disconnectFromTree: boolean = false) => {
      const state = get();
      const newGraph = createDefinition(state.graph, name, nodeId, disconnectFromTree);
      set({ graph: newGraph });
      scheduleUiSchemaRegeneration(newGraph);
    },
    
    createRefToDefinition: (definitionName: string, parentId: string, key?: string) => {
      const state = get();
      const newGraph = createRefToDefinition(state.graph, definitionName, parentId, key);
      set({ graph: newGraph });
      
      // Find the new ref node ID
      const newNodeId = Array.from(newGraph.nodes.keys())
        .find(id => !state.graph.nodes.has(id)) || '';
      
      scheduleUiSchemaRegeneration(newGraph);
      return newNodeId;
    },
    
    getAllDefinitions: () => {
      const state = get();
      return getDefinitions(state.graph);
    },
  };
});

// Export types for convenience
export type { SchemaGraph, SchemaNode, EdgeType };

// Type alias for backward compatibility during migration
export type FieldNode = SchemaNode;


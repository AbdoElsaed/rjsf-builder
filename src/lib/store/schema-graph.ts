import { create } from 'zustand';
import type { RJSFSchema } from "@rjsf/utils";
import {
    SchemaGraphEngine,
    type SchemaGraph,
    type FieldNode,
    type JSONSchemaType
} from '../graph/schema-graph-engine';

interface SchemaGraphState {
    graph: SchemaGraph;
    engine: SchemaGraphEngine;

    // Actions (thin wrappers around engine methods)
    addNode: (node: Omit<FieldNode, 'id'>, parentId?: string) => string;
    removeNode: (nodeId: string) => void;
    updateNode: (nodeId: string, updates: Partial<FieldNode>) => void;
    moveNode: (nodeId: string, newParentId: string) => void;
    reorderNode: (nodeId: string, newIndex: number) => void;
    setSchemaFromJson: (inputSchema: RJSFSchema) => void;
    validateGraph: () => { valid: boolean; errors: string[] };

    // Compiler
    compileToJsonSchema: () => RJSFSchema;
}

// Create the store with clean separation of concerns
export const useSchemaGraphStore = create<SchemaGraphState>((set, get) => {
    const engine = new SchemaGraphEngine();

    return {
        // Initial state
        graph: {
            nodes: {
                root: {
                    id: 'root',
                    key: 'root',
                    type: 'object',
                    title: 'Root',
                    children: [],
                },
            },
            rootId: 'root',
        },
        engine,

        // Actions - all delegate to engine
        addNode: (nodeData: Omit<FieldNode, 'id'>, parentId = 'root') => {
            const state = get();
            const newGraph = state.engine.addNode(state.graph, nodeData, parentId);
            set({ graph: newGraph });

            // Return the new node ID for convenience
            const newNodeId = Object.keys(newGraph.nodes).find(
                id => !Object.keys(state.graph.nodes).includes(id)
            );
            return newNodeId || '';
        },

        removeNode: (nodeId: string) => {
            const state = get();
            const newGraph = state.engine.removeNode(state.graph, nodeId);
            set({ graph: newGraph });
        },

        updateNode: (nodeId: string, updates: Partial<FieldNode>) => {
            const state = get();
            const newGraph = state.engine.updateNode(state.graph, nodeId, updates);
            set({ graph: newGraph });
        },

        moveNode: (nodeId: string, newParentId: string) => {
            const state = get();
            const newGraph = state.engine.moveNode(state.graph, nodeId, newParentId);
            set({ graph: newGraph });
        },

        reorderNode: (nodeId: string, newIndex: number) => {
            const state = get();
            const newGraph = state.engine.reorderNode(state.graph, nodeId, newIndex);
            set({ graph: newGraph });
        },

        setSchemaFromJson: (inputSchema: RJSFSchema) => {
            const state = get();
            const newGraph = state.engine.fromJsonSchema(inputSchema);
            set({ graph: newGraph });
        },

        validateGraph: () => {
            const state = get();
            return state.engine.validateGraph(state.graph);
        },

        compileToJsonSchema: () => {
            const state = get();
            return state.engine.compileToJsonSchema(state.graph);
        },
    };
});

// Export types for convenience
export type { SchemaGraph, FieldNode, JSONSchemaType }; 
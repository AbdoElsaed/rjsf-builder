import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { RJSFSchema } from "@rjsf/utils";

export type JSONSchemaType = 'string' | 'number' | 'boolean' | 'object' | 'array' | 'enum';

export type JSONSchemaDefinition = {
    type: string;
    title: string;
    description?: string;
    default?: unknown;
    properties?: Record<string, JSONSchemaDefinition>;
    items?: JSONSchemaDefinition;
    required?: string[];
    enum?: string[];
    enumNames?: string[];
    minimum?: number;
    maximum?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
};

export interface FieldNode {
    id: string;
    key: string;  // The editable key that will be used in the JSON schema
    type: JSONSchemaType;
    title: string;
    description?: string;
    required?: boolean;
    enum?: string[];
    enumNames?: string[];
    default?: unknown;
    children?: string[]; // For object/array fields
    parentId?: string;
    // Additional metadata for UI
    position?: { x: number; y: number };
    validation?: {
        minimum?: number;
        maximum?: number;
        minLength?: number;
        maxLength?: number;
        pattern?: string;
    };
}

export interface SchemaGraph {
    nodes: Record<string, FieldNode>;
    rootId: string;
}

interface ExtendedRJSFSchema extends Omit<RJSFSchema, 'type'> {
    enumNames?: string[];
    type: string | string[];
    properties?: Record<string, ExtendedRJSFSchema>;
    items?: ExtendedRJSFSchema;
}

interface SchemaGraphState {
    graph: SchemaGraph;
    // Actions
    addNode: (node: Omit<FieldNode, 'id'>, parentId?: string) => string;
    removeNode: (nodeId: string) => void;
    updateNode: (nodeId: string, updates: Partial<FieldNode>) => void;
    moveNode: (nodeId: string, newParentId: string) => void;
    setSchemaFromJson: (inputSchema: RJSFSchema) => void;
    // Compiler
    compileToJsonSchema: () => RJSFSchema;
}

// Helper: Deep clone to avoid state mutations
const deepClone = <T>(obj: T): T => JSON.parse(JSON.stringify(obj));

// Create the store
export const useSchemaGraphStore = create<SchemaGraphState>((set, get) => ({
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

    addNode: (nodeData: Omit<FieldNode, 'id'>, parentId = 'root') => {
        const newId = uuidv4();
        set((state: SchemaGraphState) => {
            const newState = deepClone(state);
            // Create new node with a default key based on title
            const defaultKey = nodeData.title
                .toLowerCase()
                .replace(/[^a-z0-9]/g, '_')  // Replace non-alphanumeric chars with underscore
                .replace(/_+/g, '_')         // Replace multiple underscores with single
                .replace(/^_|_$/g, '');      // Remove leading/trailing underscores

            newState.graph.nodes[newId] = {
                ...nodeData,
                id: newId,
                key: defaultKey,
                parentId,
                children: nodeData.type === 'object' || nodeData.type === 'array' ? [] : undefined,
            };
            // Update parent's children
            if (parentId) {
                const parent = newState.graph.nodes[parentId];
                parent.children = [...(parent.children || []), newId];
            }
            return newState;
        });
        return newId;
    },

    removeNode: (nodeId: string) => {
        set((state: SchemaGraphState) => {
            const newState = deepClone(state);
            const node = newState.graph.nodes[nodeId];

            // Remove from parent's children
            if (node.parentId) {
                const parent = newState.graph.nodes[node.parentId];
                parent.children = parent.children?.filter((id: string) => id !== nodeId);
            }

            // Recursively remove all children
            const removeRecursive = (id: string) => {
                const nodeToRemove = newState.graph.nodes[id];
                if (nodeToRemove.children) {
                    nodeToRemove.children.forEach(removeRecursive);
                }
                delete newState.graph.nodes[id];
            };

            removeRecursive(nodeId);
            return newState;
        });
    },

    updateNode: (nodeId: string, updates: Partial<FieldNode>) => {
        set((state: SchemaGraphState) => {
            const newState = deepClone(state);
            newState.graph.nodes[nodeId] = {
                ...newState.graph.nodes[nodeId],
                ...updates,
            };
            return newState;
        });
    },

    moveNode: (nodeId: string, newParentId: string) => {
        set((state: SchemaGraphState) => {
            const newState = deepClone(state);
            const node = newState.graph.nodes[nodeId];
            const oldParentId = node.parentId;

            // Remove from old parent
            if (oldParentId) {
                const oldParent = newState.graph.nodes[oldParentId];
                oldParent.children = oldParent.children?.filter((id: string) => id !== nodeId);
            }

            // Add to new parent
            const newParent = newState.graph.nodes[newParentId];
            newParent.children = [...(newParent.children || []), nodeId];
            node.parentId = newParentId;

            return newState;
        });
    },

    setSchemaFromJson: (inputSchema: RJSFSchema) => {
        const schema = inputSchema as ExtendedRJSFSchema;
        const newGraph: SchemaGraph = {
            nodes: {
                root: {
                    id: 'root',
                    key: 'root',
                    type: 'object',
                    title: schema.title || 'Root',
                    children: [],
                },
            },
            rootId: 'root',
        };

        // Helper function to convert JSON schema to nodes
        const processSchema = (schema: ExtendedRJSFSchema, parentId: string, schemaKey: string): string => {
            const newId = uuidv4();
            const schemaType = Array.isArray(schema.type) ? schema.type[0] : schema.type || 'object';
            const type = schema.enum ? 'enum' : schemaType as JSONSchemaType;

            newGraph.nodes[newId] = {
                id: newId,
                key: schemaKey,
                type,
                title: schema.title || `New ${type}`,
                description: schema.description,
                parentId,
                children: [],
                required: Array.isArray(schema.required) && schema.required.length > 0,
            };

            if (schema.enum) {
                newGraph.nodes[newId].enum = schema.enum as string[];
                if (schema.enumNames) {
                    newGraph.nodes[newId].enumNames = schema.enumNames;
                }
            }

            // Handle validation
            if (type === 'number') {
                newGraph.nodes[newId].validation = {
                    minimum: typeof schema.minimum === 'number' ? schema.minimum : undefined,
                    maximum: typeof schema.maximum === 'number' ? schema.maximum : undefined,
                };
            } else if (type === 'string') {
                newGraph.nodes[newId].validation = {
                    minLength: typeof schema.minLength === 'number' ? schema.minLength : undefined,
                    maxLength: typeof schema.maxLength === 'number' ? schema.maxLength : undefined,
                    pattern: typeof schema.pattern === 'string' ? schema.pattern : undefined,
                };
            }

            // Process children for objects
            if (type === 'object' && schema.properties) {
                Object.entries(schema.properties).forEach(([key, prop]) => {
                    const childId = processSchema(prop as ExtendedRJSFSchema, newId, key);
                    if (newGraph.nodes[newId].children) {
                        newGraph.nodes[newId].children.push(childId);
                    }
                });
            }

            // Process items for arrays
            if (type === 'array' && schema.items && !Array.isArray(schema.items)) {
                const childId = processSchema(schema.items as ExtendedRJSFSchema, newId, 'items');
                if (newGraph.nodes[newId].children) {
                    newGraph.nodes[newId].children.push(childId);
                }
            }

            return newId;
        };

        // Process properties for the root object
        if (schema.properties) {
            Object.entries(schema.properties).forEach(([key, prop]) => {
                const childId = processSchema(prop as ExtendedRJSFSchema, 'root', key);
                if (newGraph.nodes.root.children) {
                    newGraph.nodes.root.children.push(childId);
                }
            });
        }

        set({ graph: newGraph });
    },

    compileToJsonSchema: () => {
        const state = get();
        const compileNode = (nodeId: string): RJSFSchema => {
            const node = state.graph.nodes[nodeId];
            const schema: RJSFSchema = {
                type: node.type === 'enum' ? 'string' : node.type,
                title: node.title,
            };

            if (node.description) {
                schema.description = node.description;
            }

            if (node.type === 'object' && node.children?.length) {
                schema.properties = {};
                schema.required = [];
                node.children.forEach((childId) => {
                    const childNode = state.graph.nodes[childId];
                    if (schema.properties) {
                        schema.properties[childNode.key] = compileNode(childId);
                        if (childNode.required) {
                            schema.required.push(childNode.key);
                        }
                    }
                });
                if (schema.required.length === 0) {
                    delete schema.required;
                }
            }

            if (node.type === 'enum' && node.enum) {
                schema.enum = node.enum;
                if (node.enumNames) {
                    (schema as any).enumNames = node.enumNames;
                }
            }

            if (node.type === 'array' && node.children?.length) {
                // For arrays, we use the first child as the items schema
                schema.items = compileNode(node.children[0]);
            }

            return schema;
        };

        return compileNode('root');
    },
})); 
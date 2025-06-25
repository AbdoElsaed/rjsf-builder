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
            // Create new node
            newState.graph.nodes[newId] = {
                ...nodeData,
                id: newId,
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
        const schema = inputSchema as unknown as ExtendedRJSFSchema;
        const newGraph: SchemaGraph = {
            nodes: {
                root: {
                    id: 'root',
                    type: 'object',
                    title: schema.title || 'Root',
                    children: [],
                },
            },
            rootId: 'root',
        };

        // Helper function to convert JSON schema to nodes
        const processSchema = (schema: ExtendedRJSFSchema, parentId: string): string => {
            const newId = uuidv4();
            const schemaType = Array.isArray(schema.type) ? schema.type[0] : schema.type;
            const type = schema.enum ? 'enum' : schemaType as JSONSchemaType;

            newGraph.nodes[newId] = {
                id: newId,
                type,
                title: schema.title || `New ${type}`,
                description: schema.description,
                parentId,
                children: [],
                required: schema.required ? true : false,
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
                Object.entries(schema.properties).forEach(([, prop]) => {
                    const childId = processSchema(prop, newId);
                    if (newGraph.nodes[newId].children) {
                        newGraph.nodes[newId].children.push(childId);
                    }
                });
            }

            // Process items for arrays
            if (type === 'array' && schema.items && !Array.isArray(schema.items)) {
                const childId = processSchema(schema.items, newId);
                if (newGraph.nodes[newId].children) {
                    newGraph.nodes[newId].children.push(childId);
                }
            }

            return newId;
        };

        // Process the root schema
        if (schema.properties) {
            Object.entries(schema.properties).forEach(([, prop]) => {
                const childId = processSchema(prop, 'root');
                if (newGraph.nodes.root.children) {
                    newGraph.nodes.root.children.push(childId);
                }
            });
        }

        set({ graph: newGraph });
    },

    compileToJsonSchema: () => {
        const { graph } = get();

        const compileNode = (nodeId: string): RJSFSchema => {
            const node = graph.nodes[nodeId];
            const schema: RJSFSchema = {
                type: node.type === 'enum' ? 'string' : node.type,
                title: node.title,
            };

            if (node.description) schema.description = node.description;
            if (node.default !== undefined) schema.default = node.default;
            if (node.validation) {
                Object.assign(schema, node.validation);
            }

            // Handle enums
            if (node.type === 'enum' && node.enum) {
                schema.enum = node.enum;
                if (node.enumNames) {
                    (schema as any).enumNames = node.enumNames;
                }
            }

            // Handle objects and arrays
            if (node.type === 'object' && node.children?.length) {
                schema.properties = {};
                const required: string[] = [];
                schema.required = required;

                node.children.forEach((childId: string) => {
                    const childNode = graph.nodes[childId];
                    if (!schema.properties) return;
                    schema.properties[childId] = compileNode(childId);
                    if (childNode.required) {
                        required.push(childId);
                    }
                });

                if (required.length === 0) {
                    delete schema.required;
                }
            }

            if (node.type === 'array' && node.children?.length) {
                // For arrays, we use the first child as the items schema
                schema.items = compileNode(node.children[0]);
            }

            return schema;
        };

        return compileNode(graph.rootId);
    },
})); 
import { v4 as uuidv4 } from 'uuid';
import type { RJSFSchema } from "@rjsf/utils";

export type JSONSchemaType = 'string' | 'number' | 'boolean' | 'object' | 'array' | 'enum';
export type SchemaDefaultValue = string | number | boolean | null | Record<string, unknown> | Array<SchemaDefaultValue>;

export interface FieldNode {
    id: string;
    key: string;
    type: JSONSchemaType;
    title: string;
    description?: string;
    required?: boolean;
    default?: SchemaDefaultValue;

    // String field properties
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    format?: string;

    // Number field properties
    minimum?: number;
    maximum?: number;
    multipleOf?: number;
    exclusiveMinimum?: number;
    exclusiveMaximum?: number;

    // Array field properties
    minItems?: number;
    maxItems?: number;
    uniqueItems?: boolean;
    additionalItems?: boolean;

    // Object field properties
    minProperties?: number;
    maxProperties?: number;
    additionalProperties?: boolean;

    // Enum field properties
    enum?: string[];
    enumNames?: string[];

    // Validation properties
    validation?: {
        minLength?: number;
        maxLength?: number;
        pattern?: string;
        minimum?: number;
        maximum?: number;
    };

    // Tree structure properties
    children?: string[];
    parentId?: string;
    position?: { x: number; y: number };

    // UI properties
    ui?: {
        "ui:widget"?: string;
        "ui:options"?: {
            addable?: boolean;
            orderable?: boolean;
            removable?: boolean;
        };
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

/**
 * Pure business logic class for schema graph operations
 * No side effects, no state management - just algorithms
 */
export class SchemaGraphEngine {

    /**
     * Creates a deep clone of the graph to ensure immutability
     */
    private deepClone<T>(obj: T): T {
        return JSON.parse(JSON.stringify(obj));
    }

    /**
     * Generates a unique key for a new node
     */
    private generateUniqueKey(title: string): string {
        const baseKey = title
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '');

        const randomSuffix = Math.floor(Math.random() * 1000);
        return `${baseKey}_${randomSuffix}`;
    }

    /**
     * Validates if a child type can be dropped into a parent type
     */
    canDropIntoParent(
        graph: SchemaGraph,
        childType: string,
        parentType: string | undefined,
        parentNodeId?: string
    ): boolean {
        if (!parentType) return true; // Root accepts anything
        if (parentType === 'object') return true; // Objects accept anything

        if (parentType === 'array') {
            const parentNode = parentNodeId ? graph.nodes[parentNodeId] : null;
            return (
                !parentNode?.children?.length ||
                graph.nodes[parentNode.children[0]].type === childType
            );
        }

        return false; // Other types can't have children
    }

    /**
     * Checks if nodeId is a descendant of targetId (prevents cycles)
     */
    isDescendant(graph: SchemaGraph, nodeId: string, targetId: string): boolean {
        let current = graph.nodes[targetId];
        while (current?.parentId) {
            if (current.parentId === nodeId) return true;
            current = graph.nodes[current.parentId];
        }
        return false;
    }

    /**
     * Adds a new node to the graph
     */
    addNode(
        graph: SchemaGraph,
        nodeData: Omit<FieldNode, 'id'>,
        parentId: string = 'root'
    ): SchemaGraph {
        const newGraph = this.deepClone(graph);
        const newId = uuidv4();

        const defaultKey = this.generateUniqueKey(nodeData.title);

        newGraph.nodes[newId] = {
            ...nodeData,
            id: newId,
            key: defaultKey,
            parentId,
            children: nodeData.type === 'object' || nodeData.type === 'array' ? [] : undefined,
        };

        // Update parent's children
        if (parentId) {
            const parent = newGraph.nodes[parentId];
            parent.children = [...(parent.children || []), newId];
        }

        return newGraph;
    }

    /**
     * Removes a node and all its descendants from the graph
     */
    removeNode(graph: SchemaGraph, nodeId: string): SchemaGraph {
        const newGraph = this.deepClone(graph);
        const node = newGraph.nodes[nodeId];

        // Remove from parent's children
        if (node.parentId) {
            const parent = newGraph.nodes[node.parentId];
            parent.children = parent.children?.filter((id: string) => id !== nodeId);
        }

        // Recursively remove all children
        const removeRecursive = (id: string) => {
            const nodeToRemove = newGraph.nodes[id];
            if (nodeToRemove.children) {
                nodeToRemove.children.forEach(removeRecursive);
            }
            delete newGraph.nodes[id];
        };

        removeRecursive(nodeId);
        return newGraph;
    }

    /**
     * Updates a node's properties
     */
    updateNode(
        graph: SchemaGraph,
        nodeId: string,
        updates: Partial<FieldNode>
    ): SchemaGraph {
        const newGraph = this.deepClone(graph);
        newGraph.nodes[nodeId] = {
            ...newGraph.nodes[nodeId],
            ...updates,
        };
        return newGraph;
    }

    /**
     * Moves a node to a new parent
     */
    moveNode(graph: SchemaGraph, nodeId: string, newParentId: string): SchemaGraph {
        const newGraph = this.deepClone(graph);
        const node = newGraph.nodes[nodeId];
        const oldParentId = node.parentId;

        // Remove from old parent
        if (oldParentId) {
            const oldParent = newGraph.nodes[oldParentId];
            oldParent.children = oldParent.children?.filter((id: string) => id !== nodeId);
        }

        // Add to new parent
        const newParent = newGraph.nodes[newParentId];
        newParent.children = [...(newParent.children || []), nodeId];
        node.parentId = newParentId;

        return newGraph;
    }

    /**
     * Reorders a node within its parent's children array
     */
    reorderNode(graph: SchemaGraph, nodeId: string, newIndex: number): SchemaGraph {
        const newGraph = this.deepClone(graph);
        const node = newGraph.nodes[nodeId];
        const parentId = node.parentId || 'root';
        const parent = newGraph.nodes[parentId];

        if (!parent.children) return newGraph;

        // Remove node from current position
        const currentIndex = parent.children.indexOf(nodeId);
        if (currentIndex === -1) return newGraph;
        parent.children.splice(currentIndex, 1);

        // Insert at new position
        parent.children.splice(newIndex, 0, nodeId);

        return newGraph;
    }

    /**
     * Converts the graph to a JSON Schema
     */
    compileToJsonSchema(graph: SchemaGraph): RJSFSchema {
        const compileNode = (nodeId: string): RJSFSchema => {
            const node = graph.nodes[nodeId];
            const schema: RJSFSchema = {
                type: node.type === 'enum' ? 'string' : node.type,
                title: node.title,
            };

            if (node.description) {
                schema.description = node.description;
            }

            // Add validation rules based on field type
            switch (node.type) {
                case 'string':
                    if (node.minLength !== undefined) schema.minLength = node.minLength;
                    if (node.maxLength !== undefined) schema.maxLength = node.maxLength;
                    if (node.pattern !== undefined) schema.pattern = node.pattern;
                    if (node.format !== undefined) schema.format = node.format;
                    break;
                case 'number':
                    if (node.minimum !== undefined) schema.minimum = node.minimum;
                    if (node.maximum !== undefined) schema.maximum = node.maximum;
                    if (node.multipleOf !== undefined) schema.multipleOf = node.multipleOf;
                    if (node.exclusiveMinimum !== undefined) schema.exclusiveMinimum = node.exclusiveMinimum;
                    if (node.exclusiveMaximum !== undefined) schema.exclusiveMaximum = node.exclusiveMaximum;
                    break;
                case 'array':
                    if (node.minItems !== undefined) schema.minItems = node.minItems;
                    if (node.maxItems !== undefined) schema.maxItems = node.maxItems;
                    if (node.uniqueItems !== undefined) schema.uniqueItems = node.uniqueItems;
                    if (node.additionalItems !== undefined) schema.additionalItems = node.additionalItems;
                    break;
                case 'object':
                    if (node.minProperties !== undefined) schema.minProperties = node.minProperties;
                    if (node.maxProperties !== undefined) schema.maxProperties = node.maxProperties;
                    if (node.additionalProperties !== undefined) schema.additionalProperties = node.additionalProperties;
                    break;
            }

            if (node.type === 'object' && node.children?.length) {
                schema.properties = {};
                schema.required = [];
                node.children.forEach((childId) => {
                    const childNode = graph.nodes[childId];
                    if (schema.properties) {
                        schema.properties[childNode.key] = compileNode(childId);
                        if (childNode.required) {
                            schema.required?.push(childNode.key);
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
                    (schema as RJSFSchema).enumNames = node.enumNames;
                }
            }

            if (node.type === 'array' && node.children?.length) {
                schema.items = compileNode(node.children[0]);
            }

            if (node.default !== undefined) {
                Object.assign(schema, { default: node.default });
            }

            return schema;
        };

        return compileNode('root');
    }

    /**
     * Imports a JSON Schema and converts it to a graph
     */
    fromJsonSchema(inputSchema: RJSFSchema): SchemaGraph {
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

        return newGraph;
    }

    /**
     * Validates the entire graph for consistency
     */
    validateGraph(graph: SchemaGraph): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        // Check for orphaned nodes
        const reachableNodes = new Set<string>();
        const traverse = (nodeId: string) => {
            if (reachableNodes.has(nodeId)) return;
            reachableNodes.add(nodeId);
            const node = graph.nodes[nodeId];
            node.children?.forEach(traverse);
        };
        traverse(graph.rootId);

        Object.keys(graph.nodes).forEach(nodeId => {
            if (!reachableNodes.has(nodeId)) {
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

            const node = graph.nodes[nodeId];
            if (node.children) {
                for (const childId of node.children) {
                    if (hasCycle(childId)) return true;
                }
            }

            recursionStack.delete(nodeId);
            return false;
        };

        if (hasCycle(graph.rootId)) {
            errors.push('Circular reference detected in graph');
        }

        return { valid: errors.length === 0, errors };
    }
} 
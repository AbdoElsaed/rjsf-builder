import type { RJSFSchema } from "@rjsf/utils";
import type { SchemaGraph, SchemaNode, ConditionalBlock, SchemaNodeType } from './schema-graph';
import { createEmptyGraph, addNode, updateNode, addEdge } from './schema-graph';
import { createDefinition } from './schema-graph';
import { createConditionalGroup, addConditionToGroup } from './conditional-groups';

interface ExtendedRJSFSchema extends Omit<RJSFSchema, 'type'> {
  enumNames?: string[];
  type: string | string[];
  properties?: Record<string, ExtendedRJSFSchema>;
  items?: ExtendedRJSFSchema | ExtendedRJSFSchema[];
  allOf?: ExtendedRJSFSchema[];
  anyOf?: ExtendedRJSFSchema[];
  oneOf?: ExtendedRJSFSchema[];
  if?: ExtendedRJSFSchema;
  then?: ExtendedRJSFSchema;
  else?: ExtendedRJSFSchema;
  $ref?: string;
}

/**
 * Import JSON Schema into SchemaGraph
 * Handles definitions, $ref, allOf/anyOf/oneOf, and nested structures
 */
export function fromJsonSchema(inputSchema: RJSFSchema): SchemaGraph {
  const schema = inputSchema as ExtendedRJSFSchema;
  let graph = createEmptyGraph();
  
  // Step 1: Import definitions first (if they exist)
  if (schema.definitions) {
    graph = importDefinitions(graph, schema.definitions);
  }
  
  // Step 2: Import root properties
  if (schema.properties) {
    graph = importProperties(graph, schema.properties, 'root', schema.required);
  }
  
  // Step 3: Handle root-level allOf/anyOf/oneOf
  if (schema.allOf) {
    graph = importConditionalGroups(graph, schema.allOf, 'root', 'allOf');
  }
  if (schema.anyOf) {
    graph = importConditionalGroups(graph, schema.anyOf, 'root', 'anyOf');
  }
  if (schema.oneOf) {
    graph = importConditionalGroups(graph, schema.oneOf, 'root', 'oneOf');
  }
  
  // Step 4: Handle root-level if/then/else (legacy support)
  if (schema.if) {
    graph = importIfThenElse(graph, schema, 'root');
  }
  
  // Update root title if provided
  if (schema.title) {
    const rootNode = graph.nodes.get('root')!;
    graph = updateNode(graph, 'root', { ...rootNode, title: schema.title });
  }
  
  return graph;
}

/**
 * Import definitions section
 */
function importDefinitions(
  graph: SchemaGraph,
  definitions: Record<string, ExtendedRJSFSchema>
): SchemaGraph {
  let currentGraph = graph;
  
  Object.entries(definitions).forEach(([name, defSchema]) => {
    // Create a node for the definition
    const result = processSchema(defSchema, 'root', name, currentGraph);
    currentGraph = result.graph;
    const defNodeId = result.nodeId;
    
    // Mark as definition - must use the updated graph
    currentGraph = createDefinition(currentGraph, name, defNodeId);
  });
  
  return currentGraph;
}

/**
 * Import properties into a parent node
 */
function importProperties(
  graph: SchemaGraph,
  properties: Record<string, ExtendedRJSFSchema>,
  parentId: string,
  required?: string[]
): SchemaGraph {
  let currentGraph = graph;
  
  Object.entries(properties).forEach(([key, propSchema]) => {
    const result = processSchema(propSchema, parentId, key, currentGraph, required);
    currentGraph = result.graph;
  });
  
  return currentGraph;
}

/**
 * Process a schema node and add it to the graph
 * Returns the updated graph and the new node ID
 */
function processSchema(
  schema: ExtendedRJSFSchema,
  parentId: string,
  schemaKey: string,
  graph: SchemaGraph,
  required?: string[]
): { graph: SchemaGraph; nodeId: string } {
  // Handle $ref
  if (schema.$ref) {
    return processRef(schema, parentId, schemaKey, graph);
  }
  
  // CRITICAL FIX: Check if this is an object/array with properties/items AND allOf/anyOf/oneOf
  // If so, import it as an object/array first, then add conditionals as children
  const hasType = schema.type && !Array.isArray(schema.type);
  const hasProperties = schema.properties && Object.keys(schema.properties).length > 0;
  const hasItems = schema.items;
  const hasConditionals = schema.allOf || schema.anyOf || schema.oneOf || schema.if;
  
  const isObjectWithConditionals = hasType && (schema.type === 'object' || schema.type === 'array') && hasConditionals;
  const hasStructure = hasProperties || hasItems;
  
  // If it's an object/array with both structure AND conditionals, import as object/array first
  if (!isObjectWithConditionals || !hasStructure) {
    // Handle pure conditionals (no type or properties)
    if (!hasType && hasConditionals) {
      // Pure conditional group - check allOf/anyOf/oneOf first
      if (schema.allOf || schema.anyOf || schema.oneOf) {
        return processConditionalGroup(schema, parentId, schemaKey, graph);
      }
      // Handle if/then/else (legacy)
      if (schema.if) {
        return processIfThenElse(schema, parentId, schemaKey, graph);
      }
    }
  }
  
  // Determine node type
  const schemaType = Array.isArray(schema.type) ? schema.type[0] : schema.type || 'object';
  const nodeType: SchemaNodeType = schema.enum ? 'enum' : (schemaType as SchemaNodeType);
  
  // Create the node
  const nodeData: Omit<SchemaNode, 'id'> = {
    key: schemaKey,
    type: nodeType,
    title: schema.title || `New ${nodeType}`,
    description: schema.description,
    required: Array.isArray(required) && required.includes(schemaKey),
    default: schema.default,
  };
  
  // Add enum properties
  if (schema.enum) {
    nodeData.enum = schema.enum as string[];
    if (schema.enumNames) {
      nodeData.enumNames = schema.enumNames;
    }
  }
  
  // Add validation properties
  if (nodeType === 'number') {
    nodeData.minimum = typeof schema.minimum === 'number' ? schema.minimum : undefined;
    nodeData.maximum = typeof schema.maximum === 'number' ? schema.maximum : undefined;
    nodeData.multipleOf = typeof schema.multipleOf === 'number' ? schema.multipleOf : undefined;
    nodeData.exclusiveMinimum = typeof schema.exclusiveMinimum === 'number' ? schema.exclusiveMinimum : undefined;
    nodeData.exclusiveMaximum = typeof schema.exclusiveMaximum === 'number' ? schema.exclusiveMaximum : undefined;
  } else if (nodeType === 'string' || nodeType === 'enum') {
    nodeData.minLength = typeof schema.minLength === 'number' ? schema.minLength : undefined;
    nodeData.maxLength = typeof schema.maxLength === 'number' ? schema.maxLength : undefined;
    nodeData.pattern = typeof schema.pattern === 'string' ? schema.pattern : undefined;
    nodeData.format = typeof schema.format === 'string' ? schema.format : undefined;
  } else if (nodeType === 'array') {
    nodeData.minItems = typeof schema.minItems === 'number' ? schema.minItems : undefined;
    nodeData.maxItems = typeof schema.maxItems === 'number' ? schema.maxItems : undefined;
    nodeData.uniqueItems = typeof schema.uniqueItems === 'boolean' ? schema.uniqueItems : undefined;
    nodeData.additionalItems = typeof schema.additionalItems === 'boolean' ? schema.additionalItems : undefined;
  } else if (nodeType === 'object') {
    nodeData.minProperties = typeof schema.minProperties === 'number' ? schema.minProperties : undefined;
    nodeData.maxProperties = typeof schema.maxProperties === 'number' ? schema.maxProperties : undefined;
    nodeData.additionalProperties = typeof schema.additionalProperties === 'boolean' ? schema.additionalProperties : undefined;
  }
  
  // Add the node
  const newGraph = addNode(graph, nodeData, parentId);
  const newNodeId = Array.from(newGraph.nodes.keys())
    .find(id => id !== parentId && newGraph.nodes.get(id)?.key === schemaKey);
  
  if (!newNodeId) {
    throw new Error(`Failed to create node for key ${schemaKey}`);
  }
  
  let resultGraph = newGraph;
  
  // Process children (properties for objects, items for arrays)
  if (nodeType === 'object' && schema.properties) {
    resultGraph = importProperties(resultGraph, schema.properties, newNodeId, schema.required);
  }
  
  if (nodeType === 'array' && schema.items && !Array.isArray(schema.items)) {
    const itemResult = processSchema(schema.items as ExtendedRJSFSchema, newNodeId, 'item', resultGraph);
    resultGraph = itemResult.graph;
  }
  
  // Handle nested allOf/anyOf/oneOf in this node
  if (schema.allOf) {
    resultGraph = importConditionalGroups(resultGraph, schema.allOf, newNodeId, 'allOf');
  }
  if (schema.anyOf) {
    resultGraph = importConditionalGroups(resultGraph, schema.anyOf, newNodeId, 'anyOf');
  }
  if (schema.oneOf) {
    resultGraph = importConditionalGroups(resultGraph, schema.oneOf, newNodeId, 'oneOf');
  }
  
  return { graph: resultGraph, nodeId: newNodeId };
}

/**
 * Process a $ref reference
 */
function processRef(
  schema: ExtendedRJSFSchema,
  parentId: string,
  schemaKey: string,
  graph: SchemaGraph
): { graph: SchemaGraph; nodeId: string } {
  if (!schema.$ref) {
    throw new Error('Schema has no $ref');
  }
  
  // Extract definition name from $ref (format: #/definitions/name)
  const refMatch = schema.$ref.match(/^#\/definitions\/(.+)$/);
  if (!refMatch) {
    throw new Error(`Invalid $ref format: ${schema.$ref}`);
  }
  
  const definitionName = refMatch[1];
  
  // Check if definition exists
  if (!graph.definitions.has(definitionName)) {
    throw new Error(`Definition "${definitionName}" not found`);
  }
  
  // Create reference node
  const refNode: Omit<SchemaNode, 'id'> = {
    key: schemaKey,
    type: 'ref',
    title: schema.title || definitionName,
    description: schema.description,
    refTarget: definitionName,
  };
  
  const newGraph = addNode(graph, refNode, parentId);
  const newNodeId = Array.from(newGraph.nodes.keys())
    .find(id => id !== parentId && newGraph.nodes.get(id)?.key === schemaKey && newGraph.nodes.get(id)?.type === 'ref');
  
  if (!newNodeId) {
    throw new Error(`Failed to create reference node for ${schemaKey}`);
  }
  
  // Resolve and cache the definition node ID
  const definitionNodeId = newGraph.definitions.get(definitionName);
  if (!definitionNodeId) {
    throw new Error(`Definition "${definitionName}" node ID not found after creation`);
  }
  
  const updatedRefNode = newGraph.nodes.get(newNodeId);
  if (!updatedRefNode) {
    throw new Error(`Reference node ${newNodeId} not found after creation`);
  }
  return {
    graph: updateNode(newGraph, newNodeId, { ...updatedRefNode, resolvedNodeId: definitionNodeId }),
    nodeId: newNodeId,
  };
}

/**
 * Process conditional groups (allOf/anyOf/oneOf)
 */
function processConditionalGroup(
  schema: ExtendedRJSFSchema,
  parentId: string,
  schemaKey: string,
  graph: SchemaGraph
): { graph: SchemaGraph; nodeId: string } {
  // Determine group type
  let groupType: 'allOf' | 'anyOf' | 'oneOf';
  let conditions: ExtendedRJSFSchema[];
  
  if (schema.allOf) {
    groupType = 'allOf';
    conditions = schema.allOf;
  } else if (schema.anyOf) {
    groupType = 'anyOf';
    conditions = schema.anyOf;
  } else if (schema.oneOf) {
    groupType = 'oneOf';
    conditions = schema.oneOf;
  } else {
    throw new Error('No conditional group type found');
  }
  
  // Create conditional group node
  const groupGraph = createConditionalGroup(graph, groupType, parentId);
  const groupId = Array.from(groupGraph.nodes.keys())
    .find(id => id !== parentId && groupGraph.nodes.get(id)?.type === groupType);
  
  if (!groupId) {
    throw new Error(`Failed to create ${groupType} conditional group`);
  }
  
  // Update group key
  const groupNode = groupGraph.nodes.get(groupId);
  if (!groupNode) {
    throw new Error(`Conditional group node ${groupId} not found`);
  }
  let resultGraph = updateNode(groupGraph, groupId, { ...groupNode, key: schemaKey, title: schema.title || `${groupType} Group` });
  
  // Process each condition
  conditions.forEach((conditionSchema) => {
    if (conditionSchema.if) {
      // Extract condition
      const condition = extractCondition(conditionSchema.if);
      
      const conditionalBlock: ConditionalBlock = {
        if: condition,
      };
      
      // Process then branch
      if (conditionSchema.then) {
        const thenResult = processConditionalBranch(resultGraph, conditionSchema.then, groupId, 'then');
        resultGraph = thenResult.graph;
        conditionalBlock.then = thenResult.nodeId;
      }
      
      // Process else branch
      if (conditionSchema.else) {
        const elseResult = processConditionalBranch(resultGraph, conditionSchema.else, groupId, 'else');
        resultGraph = elseResult.graph;
        conditionalBlock.else = elseResult.nodeId;
      }
      
      // Add condition to group
      resultGraph = addConditionToGroup(resultGraph, groupId, conditionalBlock);
    }
  });
  
  return { graph: resultGraph, nodeId: groupId };
}

/**
 * Process a conditional branch (then/else)
 */
function processConditionalBranch(
  graph: SchemaGraph,
  branchSchema: ExtendedRJSFSchema,
  parentId: string,
  branchType: 'then' | 'else'
): { graph: SchemaGraph; nodeId: string } {
  // Check if branch is a $ref
  if (branchSchema.$ref) {
    return processRef(branchSchema, parentId, `${branchType}_branch`, graph);
  }
  
  // CRITICAL FIX: Import branch properties directly without creating wrapper objects
  // The compiler will handle wrapping them when needed
  let resultGraph = graph;
  const branchNodeIds: string[] = [];
  
  // Process branch properties directly - each becomes a child with the appropriate edge type
  if (branchSchema.properties) {
    Object.entries(branchSchema.properties).forEach(([key, propSchema]) => {
      const result = processSchema(propSchema as ExtendedRJSFSchema, parentId, key, resultGraph);
      resultGraph = result.graph;
      
      // The node was added with 'child' edge, we need to change it to 'then' or 'else' edge
      // Find the edge that was just created
      const childEdge = Array.from(resultGraph.edges.values()).find(
        edge => edge.targetId === result.nodeId && edge.sourceId === parentId && edge.type === 'child'
      );
      
      if (childEdge) {
        // Remove the child edge
        resultGraph = {
          ...resultGraph,
          edges: new Map(resultGraph.edges),
          parentIndex: new Map(resultGraph.parentIndex),
          childrenIndex: new Map(resultGraph.childrenIndex),
          edgeTypeIndex: new Map(resultGraph.edgeTypeIndex),
        };
        
        resultGraph.edges.delete(childEdge.id);
        
        // Update indices to remove child relationship
        const childrenSet = resultGraph.childrenIndex.get(parentId);
        if (childrenSet) {
          const newChildrenSet = new Set(childrenSet);
          newChildrenSet.delete(result.nodeId);
          resultGraph.childrenIndex.set(parentId, newChildrenSet);
        }
        
        resultGraph.parentIndex.delete(result.nodeId);
        
        const childEdgeTypeSet = resultGraph.edgeTypeIndex.get('child');
        if (childEdgeTypeSet) {
          const newSet = new Set(childEdgeTypeSet);
          newSet.delete(childEdge.id);
          resultGraph.edgeTypeIndex.set('child', newSet);
        }
        
        // Add the correct edge type (then or else)
        resultGraph = addEdge(resultGraph, parentId, result.nodeId, branchType);
      }
      
      branchNodeIds.push(result.nodeId);
    });
  }
  
  // Handle nested conditionals in branch
  if (branchSchema.allOf) {
    resultGraph = importConditionalGroups(resultGraph, branchSchema.allOf, parentId, 'allOf');
  }
  
  // Return the first node ID as the representative (for compatibility)
  // In the new architecture, branches are represented by multiple nodes with then/else edges
  const representativeId = branchNodeIds[0] || parentId;
  
  return { graph: resultGraph, nodeId: representativeId };
}

/**
 * Import conditional groups into a parent node
 */
function importConditionalGroups(
  graph: SchemaGraph,
  conditions: ExtendedRJSFSchema[],
  parentId: string,
  type: 'allOf' | 'anyOf' | 'oneOf'
): SchemaGraph {
  // Create conditional group node
  const groupGraph = createConditionalGroup(graph, type, parentId);
  const groupId = Array.from(groupGraph.nodes.keys())
    .find(id => id !== parentId && groupGraph.nodes.get(id)?.type === type);
  
  if (!groupId) {
    throw new Error(`Failed to create ${type} conditional group`);
  }
  
  let resultGraph = groupGraph;
  
  // Process each condition
  conditions.forEach((conditionSchema) => {
    if (conditionSchema.if) {
      const condition = extractCondition(conditionSchema.if);
      
      const conditionalBlock: ConditionalBlock = {
        if: condition,
      };
      
      // Process then branch
      if (conditionSchema.then) {
        const thenResult = processConditionalBranch(resultGraph, conditionSchema.then, groupId, 'then');
        resultGraph = thenResult.graph;
        conditionalBlock.then = thenResult.nodeId;
      }
      
      // Process else branch
      if (conditionSchema.else) {
        const elseResult = processConditionalBranch(resultGraph, conditionSchema.else, groupId, 'else');
        resultGraph = elseResult.graph;
        conditionalBlock.else = elseResult.nodeId;
      }
      
      // Add condition to group
      resultGraph = addConditionToGroup(resultGraph, groupId, conditionalBlock);
    }
  });
  
  return resultGraph;
}

/**
 * Extract condition from if schema
 */
function extractCondition(ifSchema: ExtendedRJSFSchema): { field: string; operator: string; value: unknown } {
  // Parse if schema format: { properties: { field: { const: value } }, required: [field] }
  if (!ifSchema.properties) {
    throw new Error('Invalid if condition: no properties');
  }
  
  const propertyEntries = Object.entries(ifSchema.properties);
  if (propertyEntries.length === 0) {
    throw new Error('Invalid if condition: empty properties');
  }
  
  const [field, fieldSchema] = propertyEntries[0];
  const fieldSchemaObj = fieldSchema as ExtendedRJSFSchema;
  
  // Determine operator and value
  let operator = 'equals';
  let value: unknown;
  
  if (fieldSchemaObj.const !== undefined) {
    operator = 'equals';
    value = fieldSchemaObj.const;
  } else if (fieldSchemaObj.exclusiveMinimum !== undefined) {
    operator = 'greater_than';
    value = fieldSchemaObj.exclusiveMinimum;
  } else if (fieldSchemaObj.exclusiveMaximum !== undefined) {
    operator = 'less_than';
    value = fieldSchemaObj.exclusiveMaximum;
  } else if (fieldSchemaObj.minimum !== undefined) {
    operator = 'greater_equal';
    value = fieldSchemaObj.minimum;
  } else if (fieldSchemaObj.maximum !== undefined) {
    operator = 'less_equal';
    value = fieldSchemaObj.maximum;
  } else if (fieldSchemaObj.pattern) {
    // Try to infer operator from pattern
    const pattern = fieldSchemaObj.pattern;
    if (pattern.startsWith('^') && pattern.endsWith('.*')) {
      operator = 'starts_with';
      value = pattern.slice(1, -2);
    } else if (pattern.startsWith('.*') && pattern.endsWith('$')) {
      operator = 'ends_with';
      value = pattern.slice(2, -1);
    } else if (pattern.includes('.*')) {
      operator = 'contains';
      const match = pattern.match(/\.\*(.+?)\.\*/);
      value = match ? match[1] : pattern;
    } else {
      operator = 'equals';
      value = pattern;
    }
  } else {
    // Default fallback
    operator = 'equals';
    value = '';
  }
  
  return { field, operator, value };
}

/**
 * Process legacy if/then/else schema
 */
function processIfThenElse(
  schema: ExtendedRJSFSchema,
  parentId: string,
  schemaKey: string,
  graph: SchemaGraph
): { graph: SchemaGraph; nodeId: string } {
  if (!schema.if) {
    throw new Error('Schema has no if condition');
  }
  
  const condition = extractCondition(schema.if);
  
  // Create IF block node
  const ifNode: Omit<SchemaNode, 'id'> = {
    key: schemaKey,
    type: 'if_block',
    title: schema.title || 'If Block',
    condition,
    then: [],
    else: [],
  };
  
  const newGraph = addNode(graph, ifNode, parentId);
  const ifNodeId = Array.from(newGraph.nodes.keys())
    .find(id => id !== parentId && newGraph.nodes.get(id)?.key === schemaKey && newGraph.nodes.get(id)?.type === 'if_block');
  
  if (!ifNodeId) {
    throw new Error(`Failed to create IF block node for key ${schemaKey}`);
  }
  
  let resultGraph = newGraph;
  const thenIds: string[] = [];
  const elseIds: string[] = [];
  
  // Process then branch
  if (schema.then) {
    if (schema.then.properties) {
      Object.entries(schema.then.properties).forEach(([key, propSchema]) => {
        const thenResult = processSchema(propSchema as ExtendedRJSFSchema, ifNodeId, key, resultGraph);
        resultGraph = thenResult.graph;
        thenIds.push(thenResult.nodeId);
      });
    }
  }
  
  // Process else branch
  if (schema.else) {
    if (schema.else.properties) {
      Object.entries(schema.else.properties).forEach(([key, propSchema]) => {
        const elseResult = processSchema(propSchema as ExtendedRJSFSchema, ifNodeId, key, resultGraph);
        resultGraph = elseResult.graph;
        elseIds.push(elseResult.nodeId);
      });
    }
  }
  
  // Update IF block with then/else IDs
  const updatedIfNode = resultGraph.nodes.get(ifNodeId)!;
  resultGraph = updateNode(resultGraph, ifNodeId, {
    ...updatedIfNode,
    then: thenIds,
    else: elseIds,
  });
  
  return { graph: resultGraph, nodeId: ifNodeId };
}

/**
 * Import if/then/else at root level
 */
function importIfThenElse(
  graph: SchemaGraph,
  schema: ExtendedRJSFSchema,
  parentId: string
): SchemaGraph {
  const result = processIfThenElse(schema, parentId, 'if_block', graph);
  return result.graph;
}


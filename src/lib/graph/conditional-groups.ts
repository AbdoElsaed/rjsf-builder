import type { SchemaGraph, SchemaNode, ConditionalBlock } from './schema-graph';
import { addNode, addEdge, getChildren, cloneGraph, updateNode } from './schema-graph';

/**
 * Type guard to check if a node is a conditional group
 */
export function isConditionalGroup(node: SchemaNode | undefined): node is SchemaNode & { type: 'allOf' | 'anyOf' | 'oneOf' } {
  return node !== undefined && (node.type === 'allOf' || node.type === 'anyOf' || node.type === 'oneOf');
}

/**
 * Create a conditional group node (allOf/anyOf/oneOf)
 * Optimized: Uses existing addNode instead of creating intermediate structures
 */
export function createConditionalGroup(
  graph: SchemaGraph,
  type: 'allOf' | 'anyOf' | 'oneOf',
  parentId: string = 'root'
): SchemaGraph {
  const groupNode: Omit<SchemaNode, 'id'> = {
    key: `conditional_${type}_${Date.now()}`,
    type: type,
    title: `${type} Group`,
    conditions: [],
  };
  
  return addNode(graph, groupNode, parentId);
}

/**
 * Add a condition block to a conditional group
 * Optimized: Only clones what's necessary, avoids unnecessary edge creation
 */
export function addConditionToGroup(
  graph: SchemaGraph,
  groupId: string,
  condition: ConditionalBlock
): SchemaGraph {
  const groupNode = graph.nodes.get(groupId);
  
  if (!isConditionalGroup(groupNode)) {
    throw new Error(`Node ${groupId} is not a conditional group`);
  }
  
  const newGraph = cloneGraph(graph);
  const updatedGroup = newGraph.nodes.get(groupId)!;
  
  // Create new conditions array (immutable update)
  const conditions = [...(updatedGroup.conditions || []), condition];
  
  // Update node with new conditions array
  const updatedNode = {
    ...updatedGroup,
    conditions,
  };
  
  newGraph.nodes.set(groupId, updatedNode);
  
  // Create edges for then/else branches if they exist and don't already exist
  let resultGraph = newGraph;
  if (condition.then) {
    // Check if edge already exists
    const existingThenEdge = Array.from(resultGraph.edges.values()).find(
      edge => edge.sourceId === groupId && edge.targetId === condition.then && edge.type === 'then'
    );
    if (!existingThenEdge) {
      resultGraph = addEdge(resultGraph, groupId, condition.then, 'then');
    }
  }
  if (condition.else) {
    // Check if edge already exists
    const existingElseEdge = Array.from(resultGraph.edges.values()).find(
      edge => edge.sourceId === groupId && edge.targetId === condition.else && edge.type === 'else'
    );
    if (!existingElseEdge) {
      resultGraph = addEdge(resultGraph, groupId, condition.else, 'else');
    }
  }
  
  return resultGraph;
}

/**
 * Update a condition in a conditional group
 * Optimized: Direct update without full clone if possible
 */
export function updateConditionInGroup(
  graph: SchemaGraph,
  groupId: string,
  conditionIndex: number,
  updates: Partial<ConditionalBlock>
): SchemaGraph {
  const groupNode = graph.nodes.get(groupId);
  
  if (!isConditionalGroup(groupNode)) {
    throw new Error(`Node ${groupId} is not a conditional group`);
  }
  
  const conditions = groupNode.conditions || [];
  if (conditionIndex < 0 || conditionIndex >= conditions.length) {
    throw new Error(`Condition index ${conditionIndex} out of bounds`);
  }
  
  const newGraph = cloneGraph(graph);
  const updatedGroup = newGraph.nodes.get(groupId)!;
  
  // Create new conditions array with updated condition
  const updatedConditions = [...conditions];
  updatedConditions[conditionIndex] = {
    ...updatedConditions[conditionIndex],
    ...updates,
    if: updates.if ? { ...updatedConditions[conditionIndex].if, ...updates.if } : updatedConditions[conditionIndex].if,
  };
  
  newGraph.nodes.set(groupId, {
    ...updatedGroup,
    conditions: updatedConditions,
  });
  
  return newGraph;
}

/**
 * Remove a condition from a conditional group
 * Optimized: Efficient array manipulation
 */
export function removeConditionFromGroup(
  graph: SchemaGraph,
  groupId: string,
  conditionIndex: number
): SchemaGraph {
  const groupNode = graph.nodes.get(groupId);
  
  if (!isConditionalGroup(groupNode)) {
    throw new Error(`Node ${groupId} is not a conditional group`);
  }
  
  const conditions = groupNode.conditions || [];
  if (conditionIndex < 0 || conditionIndex >= conditions.length) {
    throw new Error(`Condition index ${conditionIndex} out of bounds`);
  }
  
  const newGraph = cloneGraph(graph);
  const updatedGroup = newGraph.nodes.get(groupId)!;
  
  // Create new conditions array without the removed condition
  const updatedConditions = conditions.filter((_, index) => index !== conditionIndex);
  
  newGraph.nodes.set(groupId, {
    ...updatedGroup,
    conditions: updatedConditions,
  });
  
  return newGraph;
}

/**
 * Get conditions for a conditional group
 * Optimized: Direct access, no cloning
 */
export function getGroupConditions(
  graph: SchemaGraph,
  groupId: string
): ConditionalBlock[] {
  const groupNode = graph.nodes.get(groupId);
  
  if (!isConditionalGroup(groupNode)) {
    return [];
  }
  
  return groupNode.conditions || [];
}

/**
 * Get then branch nodes for a conditional group
 * Optimized: Uses existing getChildren helper
 */
export function getThenBranch(
  graph: SchemaGraph,
  groupId: string
): SchemaNode[] {
  return getChildren(graph, groupId, 'then');
}

/**
 * Get else branch nodes for a conditional group
 * Optimized: Uses existing getChildren helper
 */
export function getElseBranch(
  graph: SchemaGraph,
  groupId: string
): SchemaNode[] {
  return getChildren(graph, groupId, 'else');
}

/**
 * Sync all conditions in a group to reference the same then/else nodes
 * Useful for UX where all conditions share the same branches
 */
export function syncConditionBranches(
  graph: SchemaGraph,
  groupId: string,
  thenNodeId?: string,
  elseNodeId?: string
): SchemaGraph {
  const groupNode = graph.nodes.get(groupId);
  
  if (!isConditionalGroup(groupNode)) {
    return graph;
  }
  
  const conditions = groupNode.conditions || [];
  if (conditions.length === 0) {
    return graph;
  }
  
  // Check if sync is needed
  const needsSync = conditions.some(cond => 
    cond.then !== thenNodeId || cond.else !== elseNodeId
  );
  
  if (!needsSync) {
    return graph;
  }
  
  // Update all conditions to reference shared then/else
  const syncedConditions = conditions.map(cond => ({
    ...cond,
    then: thenNodeId,
    else: elseNodeId,
  }));
  
  return updateNode(graph, groupId, {
    ...groupNode,
    conditions: syncedConditions,
  });
}

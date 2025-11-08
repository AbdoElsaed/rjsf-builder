import type { SchemaGraph, EdgeType } from './schema-graph';
import { addEdge, isDescendant } from './schema-graph';

/**
 * Unified relationship handler - single method for all relationship types
 * This replaces the need for separate handling of child, then, else, allOf, etc.
 */
export function addRelationship(
  graph: SchemaGraph,
  sourceId: string,
  targetId: string,
  type: EdgeType,
  order?: number
): SchemaGraph {
  // Validate nodes exist
  if (!graph.nodes.has(sourceId) || !graph.nodes.has(targetId)) {
    throw new Error(`Cannot create ${type} relationship: source or target node does not exist`);
  }
  
  // Prevent cycles for child relationships
  if (type === 'child' && isDescendant(graph, sourceId, targetId)) {
    throw new Error(`Cannot create ${type} relationship: would create a cycle`);
  }
  
  return addEdge(graph, sourceId, targetId, type, order);
}

/**
 * Check if a node can be dropped into a target
 * Handles all relationship types uniformly
 */
export function canDrop(
  graph: SchemaGraph,
  sourceId: string,
  targetId: string,
  edgeType: EdgeType = 'child'
): boolean {
  // Check if nodes exist
  if (!graph.nodes.has(sourceId) || !graph.nodes.has(targetId)) {
    return false;
  }
  
  // Prevent cycles
  if (edgeType === 'child' && isDescendant(graph, targetId, sourceId)) {
    return false;
  }
  
  // Prevent dropping into itself
  if (sourceId === targetId) {
    return false;
  }
  
  // Additional validation can be added here based on node types
  // For now, basic checks are sufficient
  
  return true;
}


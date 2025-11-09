import type { SchemaGraph } from '@/lib/graph/schema-graph';
import { getChildren } from '@/lib/graph/schema-graph';

export interface FlattenedNode {
  id: string; // Unique ID for virtual list (nodeId + depth for uniqueness)
  nodeId: string;
  depth: number;
  isExpanded: boolean;
  hasChildren: boolean;
  parentId: string | null;
  index: number; // Index in flattened array
}

/**
 * Flatten a tree structure into a linear list for virtual scrolling
 * Only includes expanded nodes and their visible children
 */
export function flattenTree(
  graph: SchemaGraph,
  rootNodeIds: string[],
  expandedIds: Set<string>,
  includeDefinitions: boolean = false,
  definitions: Array<{ nodeId: string }> = []
): FlattenedNode[] {
  const result: FlattenedNode[] = [];
  let index = 0;

  // Helper function to traverse tree
  function traverse(
    nodeId: string,
    depth: number,
    parentId: string | null
  ): void {
    const node = graph.nodes.get(nodeId);
    if (!node) return;

    const children = getChildren(graph, nodeId, 'child');
    const hasChildren = children.length > 0;
    const isExpanded = expandedIds.has(nodeId);

    // Add current node
    result.push({
      id: `${nodeId}-${depth}`, // Unique ID combining nodeId and depth
      nodeId,
      depth,
      isExpanded,
      hasChildren,
      parentId,
      index: index++,
    });

    // Only traverse children if expanded
    if (isExpanded && hasChildren) {
      children.forEach((child) => {
        traverse(child.id, depth + 1, nodeId);
      });
    }
  }

  // Add definitions first if included
  if (includeDefinitions && definitions.length > 0) {
    definitions.forEach(({ nodeId }) => {
      traverse(nodeId, 0, null);
    });
  }

  // Add root nodes
  rootNodeIds.forEach((nodeId) => {
    traverse(nodeId, 0, null);
  });

  return result;
}

/**
 * Get all descendant node IDs (for expand/collapse operations)
 */
export function getDescendantIds(
  graph: SchemaGraph,
  nodeId: string,
  result: Set<string> = new Set()
): Set<string> {
  const children = getChildren(graph, nodeId, 'child');
  children.forEach((child) => {
    result.add(child.id);
    getDescendantIds(graph, child.id, result);
  });
  return result;
}

/**
 * Calculate estimated height for a node based on its properties
 */
export function estimateNodeHeight(
  hasChildren: boolean,
  isExpanded: boolean
): number {
  // Base height for collapsed node
  const baseHeight = 56; // ~56px for a collapsed FormNode
  
  // Additional height if expanded with children
  if (isExpanded && hasChildren) {
    return baseHeight + 8; // Add padding for children container
  }
  
  return baseHeight;
}


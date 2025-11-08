import type { SchemaGraph, SchemaNode, JSONSchemaType, EdgeType } from './schema-graph';
import { isDescendant, getChildren, moveNode } from './schema-graph';

/**
 * Relationship type for drag-and-drop operations
 * Aligned with V2 EdgeType
 */
export type RelationshipType = 'child' | 'then' | 'else';

/**
 * Check if a child type can be dropped into a parent type
 * Replaces the old engine's canDropIntoParent method
 */
function canDropIntoParent(
  graph: SchemaGraph,
  childType: string,
  parentType: string | undefined,
  parentNodeId?: string
): boolean {
  // Root accepts anything
  if (!parentType) return true;

  // Objects can accept any field type
  if (parentType === 'object') return true;

  // If blocks can accept any field type in their then/else branches
  if (parentType === 'if_block') return true;

  // Arrays can accept any field type, but all items must be of the same type
  if (parentType === 'array') {
    if (!parentNodeId) return true;
    
    const parentNode = graph.nodes.get(parentNodeId);
    if (!parentNode) return false;

    // Get children via edges
    const children = getChildren(graph, parentNodeId, 'child');
    
    // If array is empty, any type is allowed
    if (children.length === 0) return true;

    // Get the type of the first child (arrays must have consistent types)
    const firstChildType = children[0].type;

    // Check if the new child type matches the existing array item type
    return childType === firstChildType;
  }

  // Other field types (string, number, boolean, etc.) cannot accept children
  return false;
}

/**
 * Unified drop validation - checks if a node can be dropped into a target
 * This centralizes all the drop validation logic that was scattered in layout.tsx
 * 
 * @param graph - The current schema graph (V2)
 * @param sourceId - ID of the node being dragged (or type string for new nodes from palette)
 * @param targetId - ID of the target drop zone
 * @param relationshipType - Type of relationship ('child', 'then', 'else')
 * @returns true if the drop is valid
 */
export function canDropNode(
  graph: SchemaGraph,
  sourceId: string | JSONSchemaType,
  targetId: string,
  relationshipType: RelationshipType = 'child'
): boolean {
  // Check if target exists
  const targetNode = graph.nodes.get(targetId);
  if (!targetNode) {
    return false;
  }

  // Prevent dropping into itself (only for existing nodes)
  if (typeof sourceId === 'string' && graph.nodes.has(sourceId) && sourceId === targetId) {
    return false;
  }

  // Handle different relationship types
  if (relationshipType === 'then' || relationshipType === 'else') {
    // For then/else, target must be a conditional container
    return (
      targetNode.type === 'if_block' ||
      targetNode.type === 'allOf' ||
      targetNode.type === 'anyOf' ||
      targetNode.type === 'oneOf'
    );
  }

  // Determine source type
  // If sourceId is a string and exists in graph, it's an existing node
  // Otherwise, sourceId should already be the type (passed from layout.tsx)
  let sourceType: string | undefined;
  
  if (typeof sourceId === 'string') {
    const sourceNode = graph.nodes.get(sourceId);
    if (sourceNode) {
      // Existing node - use its type
      sourceType = sourceNode.type;
    } else {
      // Not in graph - should be a type string already
      // But handle palette IDs just in case
      const paletteTypeMap: Record<string, string> = {
        'text-field': 'string',
        'number-field': 'number',
        'boolean-field': 'boolean',
        'object-field': 'object',
        'array-field': 'array',
        'if-block': 'if_block',
      };
      sourceType = paletteTypeMap[sourceId] || sourceId;
    }
  } else {
    // Already a type (JSONSchemaType)
    sourceType = sourceId;
  }

  if (!sourceType) {
    return false;
  }

  // Check type compatibility
  if (!canDropIntoParent(graph, sourceType, targetNode.type, targetId)) {
    return false;
  }

  // Check for cycles (only for existing nodes)
  if (typeof sourceId === 'string' && graph.nodes.has(sourceId)) {
    if (isDescendant(graph, targetId, sourceId)) {
      return false;
    }
  }

  return true;
}

/**
 * Simplified move operation - handles all the complex parent removal/addition logic
 * This replaces the scattered move logic in layout.tsx
 * Uses V2 moveNode function which handles edge management automatically
 * 
 * @param graph - The current schema graph (V2)
 * @param nodeId - ID of the node to move
 * @param newParentId - ID of the new parent
 * @param relationshipType - Type of relationship ('child', 'then', 'else')
 * @returns Updated graph
 */
export function moveNodeToParent(
  graph: SchemaGraph,
  nodeId: string,
  newParentId: string,
  relationshipType: RelationshipType
): SchemaGraph {
  // V2 moveNode handles all edge management automatically
  // It removes old edges and creates new ones with the correct type
  return moveNode(graph, nodeId, newParentId, relationshipType as EdgeType);
}

/**
 * Get the relationship type from a drop zone ID
 * Handles special IF block zones like "nodeId_then" or "nodeId_else"
 * 
 * @param dropZoneId - The drop zone ID (may be "nodeId_then" or "nodeId_else")
 * @returns Object with parentId and relationshipType
 */
export function parseDropZone(
  dropZoneId: string
): { parentId: string; relationshipType: RelationshipType } | null {
  // Check for IF block zones
  if (dropZoneId.endsWith('_then')) {
    const parentId = dropZoneId.slice(0, -5); // Remove "_then"
    return { parentId, relationshipType: 'then' };
  }

  if (dropZoneId.endsWith('_else')) {
    const parentId = dropZoneId.slice(0, -5); // Remove "_else"
    return { parentId, relationshipType: 'else' };
  }

  // Regular child relationship
  return { parentId: dropZoneId, relationshipType: 'child' };
}

/**
 * Calculate the drop target for a drag operation
 * Handles both new nodes from palette and existing node moves
 * 
 * @param overId - The ID of the element being dragged over
 * @param graph - The current schema graph (V2)
 * @returns The actual target parent ID and relationship type, or null if invalid
 */
export function getDropTarget(
  overId: string | number,
  graph: SchemaGraph
): { parentId: string; relationshipType: RelationshipType } | null {
  // Convert to string if needed
  const overIdStr = String(overId);
  
  const parsed = parseDropZone(overIdStr);
  if (!parsed) {
    return null;
  }

  // Validate that the parent exists
  const parentNode = graph.nodes.get(parsed.parentId);
  if (!parentNode) {
    return null;
  }

  // Validate conditional relationship types
  if (parsed.relationshipType === 'then' || parsed.relationshipType === 'else') {
    if (!(
      parentNode.type === 'if_block' ||
      parentNode.type === 'allOf' ||
      parentNode.type === 'anyOf' ||
      parentNode.type === 'oneOf'
    )) {
      return null;
    }
  }

  return parsed;
}


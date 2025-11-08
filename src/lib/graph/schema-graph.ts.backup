import { v4 as uuidv4 } from 'uuid';

// Extended JSON Schema types to include our internal types
export type JSONSchemaType = 'string' | 'number' | 'boolean' | 'object' | 'array' | 'enum';
export type InternalNodeType = 'definition' | 'ref' | 'allOf' | 'anyOf' | 'oneOf' | 'if_block';
export type SchemaNodeType = JSONSchemaType | InternalNodeType;

// Relationship types as first-class citizens
export type EdgeType = 'child' | 'then' | 'else' | 'allOf' | 'anyOf' | 'oneOf' | 'ref';

// Conditional logic structure
export interface ConditionalLogic {
  field: string;
  operator: string;
  value: unknown;
}

export interface ConditionalBlock {
  if: ConditionalLogic;
  then?: string;  // Node ID for then branch
  else?: string;  // Node ID for else branch
}

// Graph edge representing a relationship between nodes
export interface GraphEdge {
  id: string;
  sourceId: string;  // Parent/source node
  targetId: string;  // Child/target node
  type: EdgeType;
  order?: number;     // For maintaining sequence
  metadata?: Record<string, unknown>;
}

// Schema node representing a field, definition, or conditional group
export interface SchemaNode {
  id: string;
  key: string;
  type: SchemaNodeType;
  
  // Basic schema properties
  title: string;
  description?: string;
  required?: boolean;
  default?: string | number | boolean | null | Record<string, unknown> | Array<unknown>;
  
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
  
  // Definition node properties
  definitionName?: string;  // For definition nodes
  
  // Reference node properties
  refTarget?: string;  // For $ref nodes pointing to definitions
  resolvedNodeId?: string;  // Cached resolved node ID for performance
  
  // Conditional group properties
  conditions?: ConditionalBlock[];  // For allOf/anyOf/oneOf nodes
  
  // IF block properties (legacy support)
  condition?: ConditionalLogic;
  then?: string[];  // Array of node IDs for then branch (legacy IF blocks)
  else?: string[];  // Array of node IDs for else branch (legacy IF blocks)
  
  // Metadata
  position?: { x: number; y: number };
  ui?: {
    "ui:widget"?: string;
    "ui:options"?: Record<string, unknown>;
  };
}

// Main graph structure with indexed lookups
export interface SchemaGraph {
  // Core structure
  nodes: Map<string, SchemaNode>;  // O(1) lookups
  edges: Map<string, GraphEdge>;  // All relationships
  
  // Indexed lookups for performance
  parentIndex: Map<string, string>;  // childId -> parentId (O(1))
  childrenIndex: Map<string, Set<string>>;  // parentId -> Set<childIds> (O(1))
  edgeTypeIndex: Map<EdgeType, Set<string>>;  // edgeType -> Set<edgeIds>
  
  // Definitions support
  definitions: Map<string, string>;  // definitionName -> nodeId
  
  // Root reference
  rootId: string;
}

// Create an empty graph
export function createEmptyGraph(): SchemaGraphV2 {
  const rootId = 'root';
  const rootNode: SchemaNode = {
    id: rootId,
    key: 'root',
    type: 'object',
    title: 'Root',
  };
  
  return {
    nodes: new Map([[rootId, rootNode]]),
    edges: new Map(),
    parentIndex: new Map(),
    childrenIndex: new Map([[rootId, new Set()]]),
    edgeTypeIndex: new Map([
      ['child', new Set()],
      ['then', new Set()],
      ['else', new Set()],
      ['allOf', new Set()],
      ['anyOf', new Set()],
      ['oneOf', new Set()],
      ['ref', new Set()],
    ]),
    definitions: new Map(),
    rootId,
  };
}

// Helper to create a deep copy of the graph (for immutability)
export function cloneGraph(graph: SchemaGraphV2): SchemaGraphV2 {
  const cloned: SchemaGraphV2 = {
    nodes: new Map(),
    edges: new Map(),
    parentIndex: new Map(),
    childrenIndex: new Map(),
    edgeTypeIndex: new Map(),
    definitions: new Map(),
    rootId: graph.rootId,
  };
  
  // Clone nodes
  graph.nodes.forEach((node, id) => {
    cloned.nodes.set(id, { ...node });
  });
  
  // Clone edges
  graph.edges.forEach((edge, id) => {
    cloned.edges.set(id, { ...edge });
  });
  
  // Clone indices
  graph.parentIndex.forEach((value, key) => {
    cloned.parentIndex.set(key, value);
  });
  
  graph.childrenIndex.forEach((children, parentId) => {
    cloned.childrenIndex.set(parentId, new Set(children));
  });
  
  graph.edgeTypeIndex.forEach((edgeIds, edgeType) => {
    cloned.edgeTypeIndex.set(edgeType, new Set(edgeIds));
  });
  
  // Clone definitions
  graph.definitions.forEach((nodeId, definitionName) => {
    cloned.definitions.set(definitionName, nodeId);
  });
  
  return cloned;
}

// Add a node to the graph
export function addNode(
  graph: SchemaGraphV2,
  nodeData: Omit<SchemaNode, 'id'>,
  parentId: string = 'root'
): SchemaGraphV2 {
  const newGraph = cloneGraph(graph);
  const newNodeId = uuidv4();
  
  const newNode: SchemaNode = {
    ...nodeData,
    id: newNodeId,
  };
  
  newGraph.nodes.set(newNodeId, newNode);
  
  // Create edge if parent is specified
  if (parentId && newGraph.nodes.has(parentId)) {
    return addEdge(newGraph, parentId, newNodeId, 'child');
  }
  
  return newGraph;
}

// Add an edge between two nodes
export function addEdge(
  graph: SchemaGraphV2,
  sourceId: string,
  targetId: string,
  type: EdgeType,
  order?: number
): SchemaGraphV2 {
  // Validate nodes exist
  if (!graph.nodes.has(sourceId) || !graph.nodes.has(targetId)) {
    throw new Error(`Cannot create edge: source or target node does not exist`);
  }
  
  const newGraph = cloneGraph(graph);
  const edgeId = uuidv4();
  
  const edge: GraphEdge = {
    id: edgeId,
    sourceId,
    targetId,
    type,
    order,
  };
  
  newGraph.edges.set(edgeId, edge);
  
  // Update parent index
  if (type === 'child') {
    newGraph.parentIndex.set(targetId, sourceId);
  }
  
  // Update children index
  const children = newGraph.childrenIndex.get(sourceId) || new Set();
  children.add(targetId);
  newGraph.childrenIndex.set(sourceId, children);
  
  // Update edge type index
  const edgeTypeSet = newGraph.edgeTypeIndex.get(type) || new Set();
  edgeTypeSet.add(edgeId);
  newGraph.edgeTypeIndex.set(type, edgeTypeSet);
  
  return newGraph;
}

// Remove an edge
export function removeEdge(
  graph: SchemaGraphV2,
  edgeId: string
): SchemaGraphV2 {
  const edge = graph.edges.get(edgeId);
  if (!edge) {
    return graph; // Edge doesn't exist, return unchanged
  }
  
  const newGraph = cloneGraph(graph);
  
  // Remove from edges map
  newGraph.edges.delete(edgeId);
  
  // Update parent index
  if (edge.type === 'child') {
    newGraph.parentIndex.delete(edge.targetId);
  }
  
  // Update children index
  const children = newGraph.childrenIndex.get(edge.sourceId);
  if (children) {
    children.delete(edge.targetId);
    if (children.size === 0) {
      newGraph.childrenIndex.delete(edge.sourceId);
    }
  }
  
  // Update edge type index
  const edgeTypeSet = newGraph.edgeTypeIndex.get(edge.type);
  if (edgeTypeSet) {
    edgeTypeSet.delete(edgeId);
  }
  
  return newGraph;
}

// Remove a node and all its edges
export function removeNode(
  graph: SchemaGraphV2,
  nodeId: string
): SchemaGraphV2 {
  if (nodeId === graph.rootId) {
    throw new Error('Cannot remove root node');
  }
  
  const node = graph.nodes.get(nodeId);
  if (!node) {
    return graph; // Node doesn't exist
  }
  
  const newGraph = cloneGraph(graph);
  
  // Find all edges connected to this node
  const edgesToRemove: string[] = [];
  newGraph.edges.forEach((edge, edgeId) => {
    if (edge.sourceId === nodeId || edge.targetId === nodeId) {
      edgesToRemove.push(edgeId);
    }
  });
  
  // Remove all connected edges
  edgesToRemove.forEach(edgeId => {
    const edge = newGraph.edges.get(edgeId)!;
    
    // Update indices
    if (edge.type === 'child' && edge.targetId === nodeId) {
      newGraph.parentIndex.delete(nodeId);
    }
    
    const children = newGraph.childrenIndex.get(edge.sourceId);
    if (children && edge.targetId === nodeId) {
      children.delete(nodeId);
      if (children.size === 0) {
        newGraph.childrenIndex.delete(edge.sourceId);
      }
    }
    
    const edgeTypeSet = newGraph.edgeTypeIndex.get(edge.type);
    if (edgeTypeSet) {
      edgeTypeSet.delete(edgeId);
    }
    
    newGraph.edges.delete(edgeId);
  });
  
  // Remove node
  newGraph.nodes.delete(nodeId);
  
  // Remove from definitions if it's a definition
  newGraph.definitions.forEach((defNodeId, defName) => {
    if (defNodeId === nodeId) {
      newGraph.definitions.delete(defName);
    }
  });
  
  return newGraph;
}

// Get parent of a node
export function getParent(
  graph: SchemaGraphV2,
  nodeId: string
): SchemaNode | null {
  const parentId = graph.parentIndex.get(nodeId);
  if (!parentId) {
    return null;
  }
  return graph.nodes.get(parentId) || null;
}

// Get children of a node
export function getChildren(
  graph: SchemaGraphV2,
  nodeId: string,
  edgeType: EdgeType = 'child'
): SchemaNode[] {
  const childrenIds = graph.childrenIndex.get(nodeId);
  if (!childrenIds) {
    return [];
  }
  
  // Get all edges for this node and filter by type
  const childEdges = Array.from(graph.edges.values())
    .filter(edge => 
      edge.sourceId === nodeId && 
      childrenIds.has(edge.targetId) && 
      edge.type === edgeType
    )
    .sort((a, b) => {
      // Sort by order if available, otherwise maintain insertion order
      const orderA = a.order ?? Infinity;
      const orderB = b.order ?? Infinity;
      if (orderA !== Infinity || orderB !== Infinity) {
        return orderA - orderB;
      }
      return 0;
    });
  
  return childEdges
    .map(edge => graph.nodes.get(edge.targetId))
    .filter((node): node is SchemaNode => node !== undefined);
}

// Get edges by type
export function getEdgesByType(
  graph: SchemaGraphV2,
  edgeType: EdgeType
): GraphEdge[] {
  const edgeIds = graph.edgeTypeIndex.get(edgeType);
  if (!edgeIds) {
    return [];
  }
  
  return Array.from(edgeIds)
    .map(id => graph.edges.get(id))
    .filter((edge): edge is GraphEdge => edge !== undefined);
}

// Check if nodeId is a descendant of targetId (prevents cycles)
// Returns true if nodeId is a descendant (child/grandchild/etc) of targetId
export function isDescendant(
  graph: SchemaGraphV2,
  nodeId: string,
  targetId: string
): boolean {
  let currentId: string | undefined = nodeId;
  const visited = new Set<string>();
  
  while (currentId) {
    if (visited.has(currentId)) {
      break; // Prevent infinite loops
    }
    visited.add(currentId);
    
    if (currentId === targetId) {
      return true;
    }
    
    currentId = graph.parentIndex.get(currentId);
  }
  
  return false;
}

// Update a node's properties
export function updateNode(
  graph: SchemaGraphV2,
  nodeId: string,
  updates: Partial<SchemaNode>
): SchemaGraphV2 {
  const node = graph.nodes.get(nodeId);
  if (!node) {
    throw new Error(`Node ${nodeId} does not exist`);
  }
  
  const newGraph = cloneGraph(graph);
  const updatedNode = { ...node, ...updates };
  newGraph.nodes.set(nodeId, updatedNode);
  
  return newGraph;
}

// Move a node to a new parent
export function moveNode(
  graph: SchemaGraphV2,
  nodeId: string,
  newParentId: string,
  edgeType: EdgeType = 'child',
  order?: number
): SchemaGraphV2 {
  if (nodeId === graph.rootId) {
    throw new Error('Cannot move root node');
  }
  
  if (!graph.nodes.has(nodeId) || !graph.nodes.has(newParentId)) {
    throw new Error('Source or target node does not exist');
  }
  
  // Prevent cycles
  if (isDescendant(graph, newParentId, nodeId)) {
    throw new Error('Cannot move node: would create a cycle');
  }
  
  const newGraph = cloneGraph(graph);
  
  // Find and remove old edge (could be child, then, else, etc.)
  let oldEdgeId: string | null = null;
  newGraph.edges.forEach((edge, edgeId) => {
    if (edge.targetId === nodeId) {
      // Remove any existing edge to this node (handles all edge types)
      oldEdgeId = edgeId;
    }
  });
  
  if (oldEdgeId) {
    const oldEdge = newGraph.edges.get(oldEdgeId)!;
    
    // Update indices for old edge
    if (oldEdge.type === 'child') {
      newGraph.parentIndex.delete(nodeId);
    }
    
    const oldChildren = newGraph.childrenIndex.get(oldEdge.sourceId);
    if (oldChildren) {
      oldChildren.delete(nodeId);
      if (oldChildren.size === 0) {
        newGraph.childrenIndex.delete(oldEdge.sourceId);
      }
    }
    
    // Update edge type index
    const edgeTypeSet = newGraph.edgeTypeIndex.get(oldEdge.type);
    if (edgeTypeSet) {
      edgeTypeSet.delete(oldEdgeId);
    }
    
    newGraph.edges.delete(oldEdgeId);
  }
  
  // Add new edge
  return addEdge(newGraph, newParentId, nodeId, edgeType, order);
}

// Reorder a node within its parent's children
export function reorderNode(
  graph: SchemaGraphV2,
  nodeId: string,
  newIndex: number
): SchemaGraphV2 {
  const parentId = graph.parentIndex.get(nodeId);
  if (!parentId) {
    throw new Error('Node has no parent');
  }
  
  const children = getChildren(graph, parentId, 'child');
  const currentIndex = children.findIndex(child => child.id === nodeId);
  
  if (currentIndex === -1) {
    throw new Error('Node not found in parent children');
  }
  
  if (currentIndex === newIndex) {
    return graph; // No change needed
  }
  
  const newGraph = cloneGraph(graph);
  
  // Get all child edges with their current order
  const allChildEdges = Array.from(newGraph.edges.values())
    .filter(edge => edge.sourceId === parentId && edge.type === 'child')
    .map(edge => ({
      edge,
      targetId: edge.targetId,
      order: edge.order ?? 0,
    }))
    .sort((a, b) => {
      // Find indices in children array for proper ordering
      const aIndex = children.findIndex(c => c.id === a.targetId);
      const bIndex = children.findIndex(c => c.id === b.targetId);
      return aIndex - bIndex;
    });
  
  // Remove the node being moved from the list
  const nodeToMove = allChildEdges.find(e => e.targetId === nodeId);
  const otherEdges = allChildEdges.filter(e => e.targetId !== nodeId);
  
  if (!nodeToMove) {
    return newGraph; // Edge not found
  }
  
  // Rebuild order: insert node at newIndex
  const reordered: Array<{ edgeId: string; order: number }> = [];
  
  // Add edges before new position
  for (let i = 0; i < newIndex && i < otherEdges.length; i++) {
    reordered.push({ edgeId: otherEdges[i].edge.id, order: i });
  }
  
  // Add the moved node at new position
  reordered.push({ edgeId: nodeToMove.edge.id, order: newIndex });
  
  // Add remaining edges after new position
  for (let i = newIndex; i < otherEdges.length; i++) {
    reordered.push({ edgeId: otherEdges[i].edge.id, order: i + 1 });
  }
  
  // Apply order updates
  reordered.forEach(({ edgeId, order }) => {
    const edge = newGraph.edges.get(edgeId);
    if (edge) {
      newGraph.edges.set(edgeId, { ...edge, order });
    }
  });
  
  return newGraph;
}

// ============================================================================
// Definitions Support
// ============================================================================

/**
 * Create a definition from a node or group of nodes
 * Definitions are reusable schema components stored separately from main schema
 */
export function createDefinition(
  graph: SchemaGraphV2,
  name: string,
  sourceNodeId: string
): SchemaGraphV2 {
  if (graph.definitions.has(name)) {
    throw new Error(`Definition "${name}" already exists`);
  }
  
  if (!graph.nodes.has(sourceNodeId)) {
    throw new Error(`Source node does not exist`);
  }
  
  const newGraph = cloneGraph(graph);
  const sourceNode = newGraph.nodes.get(sourceNodeId)!;
  
  // Mark node as definition and set definition name
  const definitionNode: SchemaNode = {
    ...sourceNode,
    type: 'definition' as SchemaNodeType,
    definitionName: name,
  };
  
  newGraph.nodes.set(sourceNodeId, definitionNode);
  newGraph.definitions.set(name, sourceNodeId);
  
  return newGraph;
}

/**
 * Create a reference node pointing to a definition
 */
export function createRefToDefinition(
  graph: SchemaGraphV2,
  definitionName: string,
  parentId: string,
  key: string = definitionName
): SchemaGraphV2 {
  if (!graph.definitions.has(definitionName)) {
    throw new Error(`Definition "${definitionName}" does not exist`);
  }
  
  if (!graph.nodes.has(parentId)) {
    throw new Error(`Parent node does not exist`);
  }
  
  const definitionNodeId = graph.definitions.get(definitionName)!;
  const definitionNode = graph.nodes.get(definitionNodeId)!;
  
  // Create reference node
  const refNode: SchemaNode = {
    id: '', // Will be set by addNode
    key,
    type: 'ref',
    title: definitionNode.title || definitionName,
    refTarget: definitionName,
    resolvedNodeId: definitionNodeId,
  };
  
  const newGraph = addNode(graph, refNode, parentId);
  
  // Update the ref node's ID (since addNode generates a new ID)
  const addedRefNode = Array.from(newGraph.nodes.values())
    .find(n => n.key === key && n.type === 'ref' && n.refTarget === definitionName);
  
  if (addedRefNode) {
    // Create ref edge to definition
    return addEdge(newGraph, addedRefNode.id, definitionNodeId, 'ref');
  }
  
  return newGraph;
}

/**
 * Resolve a reference to get the actual definition node
 */
export function resolveRef(
  graph: SchemaGraphV2,
  refNodeId: string
): SchemaNode | null {
  const refNode = graph.nodes.get(refNodeId);
  
  if (!refNode || refNode.type !== 'ref') {
    return null;
  }
  
  if (!refNode.refTarget) {
    return null;
  }
  
  const definitionNodeId = graph.definitions.get(refNode.refTarget);
  if (!definitionNodeId) {
    return null;
  }
  
  return graph.nodes.get(definitionNodeId) || null;
}

/**
 * Get all definitions in the graph
 */
export function getDefinitions(graph: SchemaGraphV2): Map<string, SchemaNode> {
  const definitions = new Map<string, SchemaNode>();
  
  graph.definitions.forEach((nodeId, name) => {
    const node = graph.nodes.get(nodeId);
    if (node) {
      definitions.set(name, node);
    }
  });
  
  return definitions;
}

/**
 * Delete a definition (checks for references first)
 */
export function deleteDefinition(
  graph: SchemaGraphV2,
  definitionName: string
): SchemaGraphV2 {
  if (!graph.definitions.has(definitionName)) {
    throw new Error(`Definition "${definitionName}" does not exist`);
  }
  
  // Check for references
  const refNodes: string[] = [];
  graph.nodes.forEach((node, nodeId) => {
    if (node.type === 'ref' && node.refTarget === definitionName) {
      refNodes.push(nodeId);
    }
  });
  
  if (refNodes.length > 0) {
    throw new Error(
      `Cannot delete definition "${definitionName}": it is referenced by ${refNodes.length} node(s)`
    );
  }
  
  const newGraph = cloneGraph(graph);
  const definitionNodeId = newGraph.definitions.get(definitionName)!;
  
  // Remove definition from registry
  newGraph.definitions.delete(definitionName);
  
  // Optionally remove the definition node itself (or keep it for history)
  // For now, we'll keep the node but unmark it as definition
  const definitionNode = newGraph.nodes.get(definitionNodeId);
  if (definitionNode) {
    // Remove definition-specific properties
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { definitionName, ...rest } = definitionNode;
    newGraph.nodes.set(definitionNodeId, { ...rest, type: 'object' as SchemaNodeType });
  }
  
  return newGraph;
}


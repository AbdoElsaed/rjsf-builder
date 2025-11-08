import { describe, it, expect, beforeEach } from 'vitest';
import {
  createEmptyGraph,
  addNode,
  addEdge,
  removeNode,
  removeEdge,
  getParent,
  getChildren,
  getEdgesByType,
  isDescendant,
  updateNode,
  moveNode,
  reorderNode,
  cloneGraph,
  type SchemaGraphV2,
  type SchemaNode,
} from '../schema-graph-v2';

describe('SchemaGraphV2', () => {
  let graph: SchemaGraphV2;

  beforeEach(() => {
    graph = createEmptyGraph();
  });

  describe('createEmptyGraph', () => {
    it('should create a graph with root node', () => {
      expect(graph.nodes.has('root')).toBe(true);
      expect(graph.rootId).toBe('root');
      expect(graph.nodes.get('root')?.type).toBe('object');
    });

    it('should initialize all indices', () => {
      expect(graph.parentIndex.size).toBe(0);
      expect(graph.childrenIndex.has('root')).toBe(true);
      expect(graph.edgeTypeIndex.size).toBeGreaterThan(0);
      expect(graph.definitions.size).toBe(0);
    });
  });

  describe('addNode', () => {
    it('should add a node to the graph', () => {
      const nodeData: Omit<SchemaNode, 'id'> = {
        key: 'test',
        type: 'string',
        title: 'Test Field',
      };

      const newGraph = addNode(graph, nodeData);
      const nodeIds = Array.from(newGraph.nodes.keys());
      
      expect(nodeIds.length).toBe(2); // root + new node
      expect(nodeIds).toContain('root');
      
      const newNode = Array.from(newGraph.nodes.values())
        .find(n => n.key === 'test');
      expect(newNode).toBeDefined();
      expect(newNode?.title).toBe('Test Field');
      expect(newNode?.type).toBe('string');
    });

    it('should create child edge when parent is specified', () => {
      const nodeData: Omit<SchemaNode, 'id'> = {
        key: 'child',
        type: 'string',
        title: 'Child',
      };

      const newGraph = addNode(graph, nodeData, 'root');
      const edges = Array.from(newGraph.edges.values());
      
      expect(edges.length).toBe(1);
      expect(edges[0].sourceId).toBe('root');
      expect(edges[0].type).toBe('child');
    });

    it('should update parent index when creating child edge', () => {
      const nodeData: Omit<SchemaNode, 'id'> = {
        key: 'child',
        type: 'string',
        title: 'Child',
      };

      const newGraph = addNode(graph, nodeData, 'root');
      const childNode = Array.from(newGraph.nodes.values())
        .find(n => n.key === 'child');
      
      expect(childNode).toBeDefined();
      if (childNode) {
        const parentId = newGraph.parentIndex.get(childNode.id);
        expect(parentId).toBe('root');
      }
    });
  });

  describe('addEdge', () => {
    it('should add an edge between two nodes', () => {
      const node1 = addNode(graph, {
        key: 'node1',
        type: 'string',
        title: 'Node 1',
      });
      
      const node2Id = Array.from(node1.nodes.keys())
        .find(id => id !== 'root' && node1.nodes.get(id)?.key === 'node1')!;
      
      const node2 = addNode(node1, {
        key: 'node2',
        type: 'string',
        title: 'Node 2',
      });
      
      const node2IdFinal = Array.from(node2.nodes.keys())
        .find(id => id !== 'root' && id !== node2Id && node2.nodes.get(id)?.key === 'node2')!;
      
      const newGraph = addEdge(node2, node2Id, node2IdFinal, 'child');
      const edges = Array.from(newGraph.edges.values());
      
      expect(edges.length).toBeGreaterThan(1);
      const edge = edges.find(e => e.sourceId === node2Id && e.targetId === node2IdFinal);
      expect(edge).toBeDefined();
    });

    it('should update indices when adding edge', () => {
      const node1 = addNode(graph, {
        key: 'parent',
        type: 'object',
        title: 'Parent',
      });
      
      const parentId = Array.from(node1.nodes.keys())
        .find(id => id !== 'root' && node1.nodes.get(id)?.key === 'parent')!;
      
      const node2 = addNode(node1, {
        key: 'child',
        type: 'string',
        title: 'Child',
      });
      
      const childId = Array.from(node2.nodes.keys())
        .find(id => id !== 'root' && id !== parentId && node2.nodes.get(id)?.key === 'child')!;
      
      const newGraph = addEdge(node2, parentId, childId, 'child');
      
      expect(newGraph.parentIndex.get(childId)).toBe(parentId);
      expect(newGraph.childrenIndex.get(parentId)?.has(childId)).toBe(true);
    });

    it('should throw error if nodes do not exist', () => {
      expect(() => {
        addEdge(graph, 'nonexistent1', 'nonexistent2', 'child');
      }).toThrow('Cannot create edge: source or target node does not exist');
    });
  });

  describe('removeNode', () => {
    it('should remove a node and its edges', () => {
      const node1 = addNode(graph, {
        key: 'test',
        type: 'string',
        title: 'Test',
      });
      
      const testNodeId = Array.from(node1.nodes.keys())
        .find(id => id !== 'root' && node1.nodes.get(id)?.key === 'test')!;
      
      const newGraph = removeNode(node1, testNodeId);
      
      expect(newGraph.nodes.has(testNodeId)).toBe(false);
      expect(newGraph.nodes.size).toBe(1); // Only root remains
    });

    it('should remove connected edges when removing node', () => {
      const node1 = addNode(graph, {
        key: 'parent',
        type: 'object',
        title: 'Parent',
      });
      
      const parentId = Array.from(node1.nodes.keys())
        .find(id => id !== 'root' && node1.nodes.get(id)?.key === 'parent')!;
      
      const node2 = addNode(node1, {
        key: 'child',
        type: 'string',
        title: 'Child',
      }, parentId);
      
      const childId = Array.from(node2.nodes.keys())
        .find(id => id !== 'root' && id !== parentId && node2.nodes.get(id)?.key === 'child')!;
      
      const initialEdgeCount = node2.edges.size;
      const newGraph = removeNode(node2, childId);
      
      expect(newGraph.edges.size).toBeLessThan(initialEdgeCount);
    });

    it('should throw error when trying to remove root', () => {
      expect(() => {
        removeNode(graph, 'root');
      }).toThrow('Cannot remove root node');
    });
  });

  describe('getParent', () => {
    it('should return parent node', () => {
      const node1 = addNode(graph, {
        key: 'parent',
        type: 'object',
        title: 'Parent',
      });
      
      const parentId = Array.from(node1.nodes.keys())
        .find(id => id !== 'root' && node1.nodes.get(id)?.key === 'parent')!;
      
      const node2 = addNode(node1, {
        key: 'child',
        type: 'string',
        title: 'Child',
      }, parentId);
      
      const childId = Array.from(node2.nodes.keys())
        .find(id => id !== 'root' && id !== parentId && node2.nodes.get(id)?.key === 'child')!;
      
      const parent = getParent(node2, childId);
      expect(parent).toBeDefined();
      expect(parent?.id).toBe(parentId);
    });

    it('should return null for root node', () => {
      const parent = getParent(graph, 'root');
      expect(parent).toBeNull();
    });
  });

  describe('getChildren', () => {
    it('should return children nodes', () => {
      const node1 = addNode(graph, {
        key: 'child1',
        type: 'string',
        title: 'Child 1',
      });
      
      const node2 = addNode(node1, {
        key: 'child2',
        type: 'string',
        title: 'Child 2',
      });
      
      const children = getChildren(node2, 'root');
      expect(children.length).toBe(2);
      expect(children.map(c => c.key)).toContain('child1');
      expect(children.map(c => c.key)).toContain('child2');
    });

    it('should return empty array for node with no children', () => {
      const node1 = addNode(graph, {
        key: 'leaf',
        type: 'string',
        title: 'Leaf',
      });
      
      const leafId = Array.from(node1.nodes.keys())
        .find(id => id !== 'root' && node1.nodes.get(id)?.key === 'leaf')!;
      
      const children = getChildren(node1, leafId);
      expect(children.length).toBe(0);
    });
  });

  describe('isDescendant', () => {
    it('should return true if node is descendant', () => {
      const node1 = addNode(graph, {
        key: 'parent',
        type: 'object',
        title: 'Parent',
      });
      
      const parentId = Array.from(node1.nodes.keys())
        .find(id => id !== 'root' && node1.nodes.get(id)?.key === 'parent')!;
      
      const node2 = addNode(node1, {
        key: 'child',
        type: 'string',
        title: 'Child',
      }, parentId);
      
      const childId = Array.from(node2.nodes.keys())
        .find(id => id !== 'root' && id !== parentId && node2.nodes.get(id)?.key === 'child')!;
      
      expect(isDescendant(node2, childId, 'root')).toBe(true);
      expect(isDescendant(node2, childId, parentId)).toBe(true);
    });

    it('should return false if node is not descendant', () => {
      const node1 = addNode(graph, {
        key: 'node1',
        type: 'string',
        title: 'Node 1',
      });
      
      const node1Id = Array.from(node1.nodes.keys())
        .find(id => id !== 'root' && node1.nodes.get(id)?.key === 'node1')!;
      
      const node2 = addNode(node1, {
        key: 'node2',
        type: 'string',
        title: 'Node 2',
      });
      
      const node2Id = Array.from(node2.nodes.keys())
        .find(id => id !== 'root' && id !== node1Id && node2.nodes.get(id)?.key === 'node2')!;
      
      expect(isDescendant(node2, node1Id, node2Id)).toBe(false);
    });
  });

  describe('updateNode', () => {
    it('should update node properties', () => {
      const node1 = addNode(graph, {
        key: 'test',
        type: 'string',
        title: 'Test',
      });
      
      const testNodeId = Array.from(node1.nodes.keys())
        .find(id => id !== 'root' && node1.nodes.get(id)?.key === 'test')!;
      
      const newGraph = updateNode(node1, testNodeId, {
        title: 'Updated Title',
        description: 'New description',
      });
      
      const updatedNode = newGraph.nodes.get(testNodeId);
      expect(updatedNode?.title).toBe('Updated Title');
      expect(updatedNode?.description).toBe('New description');
    });

    it('should throw error if node does not exist', () => {
      expect(() => {
        updateNode(graph, 'nonexistent', { title: 'Test' });
      }).toThrow('Node nonexistent does not exist');
    });
  });

  describe('moveNode', () => {
    it('should move node to new parent', () => {
      const node1 = addNode(graph, {
        key: 'parent1',
        type: 'object',
        title: 'Parent 1',
      });
      
      const parent1Id = Array.from(node1.nodes.keys())
        .find(id => id !== 'root' && node1.nodes.get(id)?.key === 'parent1')!;
      
      const node2 = addNode(node1, {
        key: 'parent2',
        type: 'object',
        title: 'Parent 2',
      });
      
      const parent2Id = Array.from(node2.nodes.keys())
        .find(id => id !== 'root' && id !== parent1Id && node2.nodes.get(id)?.key === 'parent2')!;
      
      const node3 = addNode(node2, {
        key: 'child',
        type: 'string',
        title: 'Child',
      }, parent1Id);
      
      const childId = Array.from(node3.nodes.keys())
        .find(id => id !== 'root' && id !== parent1Id && id !== parent2Id && node3.nodes.get(id)?.key === 'child')!;
      
      const newGraph = moveNode(node3, childId, parent2Id);
      
      expect(newGraph.parentIndex.get(childId)).toBe(parent2Id);
      expect(newGraph.childrenIndex.get(parent2Id)?.has(childId)).toBe(true);
    });

    it('should prevent cycles', () => {
      const node1 = addNode(graph, {
        key: 'parent',
        type: 'object',
        title: 'Parent',
      });
      
      const parentId = Array.from(node1.nodes.keys())
        .find(id => id !== 'root' && node1.nodes.get(id)?.key === 'parent')!;
      
      const node2 = addNode(node1, {
        key: 'child',
        type: 'string',
        title: 'Child',
      }, parentId);
      
      const childId = Array.from(node2.nodes.keys())
        .find(id => id !== 'root' && id !== parentId && node2.nodes.get(id)?.key === 'child')!;
      
      expect(() => {
        moveNode(node2, parentId, childId);
      }).toThrow('Cannot move node: would create a cycle');
    });
  });

  describe('reorderNode', () => {
    it('should reorder node within parent children', () => {
      const node1 = addNode(graph, {
        key: 'child1',
        type: 'string',
        title: 'Child 1',
      });
      
      const child1Id = Array.from(node1.nodes.keys())
        .find(id => id !== 'root' && node1.nodes.get(id)?.key === 'child1')!;
      
      const node2 = addNode(node1, {
        key: 'child2',
        type: 'string',
        title: 'Child 2',
      });
      
      const child2Id = Array.from(node2.nodes.keys())
        .find(id => id !== 'root' && id !== child1Id && node2.nodes.get(id)?.key === 'child2')!;
      
      const node3 = addNode(node2, {
        key: 'child3',
        type: 'string',
        title: 'Child 3',
      });
      
      const child3Id = Array.from(node3.nodes.keys())
        .find(id => id !== 'root' && id !== child1Id && id !== child2Id && node3.nodes.get(id)?.key === 'child3')!;
      
      // Get initial order
      const initialChildren = getChildren(node3, 'root');
      const initialOrder = initialChildren.map(c => c.id);
      
      // Move child3 to position 0
      const newGraph = reorderNode(node3, child3Id, 0);
      const newChildren = getChildren(newGraph, 'root');
      const newOrder = newChildren.map(c => c.id);
      
      expect(newOrder[0]).toBe(child3Id);
      expect(newOrder.length).toBe(initialOrder.length);
    });
  });

  describe('cloneGraph', () => {
    it('should create independent copy', () => {
      const node1 = addNode(graph, {
        key: 'test',
        type: 'string',
        title: 'Test',
      });
      
      const cloned = cloneGraph(node1);
      
      // Modify cloned graph
      const testNodeId = Array.from(cloned.nodes.keys())
        .find(id => id !== 'root' && cloned.nodes.get(id)?.key === 'test')!;
      
      const modified = updateNode(cloned, testNodeId, { title: 'Modified' });
      
      // Original should be unchanged
      const originalNode = Array.from(node1.nodes.values())
        .find(n => n.key === 'test');
      expect(originalNode?.title).toBe('Test');
      
      // Cloned should be modified
      const clonedNode = modified.nodes.get(testNodeId);
      expect(clonedNode?.title).toBe('Modified');
    });
  });
});


/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Canvas } from '../canvas';
import { useSchemaGraphStore } from '../../../lib/store/schema-graph';

// Mock the store
vi.mock('../../../lib/store/schema-graph');

// Mock the FormNode component
vi.mock('../form-node', () => ({
  FormNode: ({ nodeId, selectedNodeId, onSelect }: any) => (
    <div 
      data-testid={`form-node-${nodeId}`}
      onClick={() => onSelect(nodeId)}
      className={selectedNodeId === nodeId ? 'selected' : ''}
    >
      Form Node {nodeId}
    </div>
  ),
}));

// Mock DnD Kit components
vi.mock('@dnd-kit/core', () => ({
  useDroppable: () => ({
    setNodeRef: vi.fn(),
    isOver: false,
  }),
}));

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: any) => <div>{children}</div>,
  verticalListSortingStrategy: {},
}));

describe('Canvas', () => {
  const mockUseSchemaGraphStore = vi.mocked(useSchemaGraphStore);
  const mockOnNodeSelect = vi.fn();

  const defaultProps = {
    selectedNodeId: null,
    onNodeSelect: mockOnNodeSelect,
    isDragging: false,
    draggedItem: null,
    activeDropZone: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render empty state when no nodes exist', () => {
    mockUseSchemaGraphStore.mockReturnValue({
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
    } as any);

    render(<Canvas {...defaultProps} />);

    expect(screen.getByText('Drag and drop fields here to build your form')).toBeInTheDocument();
  });

  it('should render form nodes when they exist', () => {
    mockUseSchemaGraphStore.mockReturnValue({
      graph: {
        nodes: {
          root: {
            id: 'root',
            key: 'root',
            type: 'object',
            title: 'Root',
            children: ['node1', 'node2'],
          },
          node1: {
            id: 'node1',
            key: 'field1',
            type: 'string',
            title: 'Field 1',
            parentId: 'root',
          },
          node2: {
            id: 'node2',
            key: 'field2',
            type: 'number',
            title: 'Field 2',
            parentId: 'root',
          },
        },
        rootId: 'root',
      },
    } as any);

    render(<Canvas {...defaultProps} />);

    expect(screen.getByTestId('form-node-node1')).toBeInTheDocument();
    expect(screen.getByTestId('form-node-node2')).toBeInTheDocument();
    expect(screen.queryByText('Drag and drop fields here to build your form')).not.toBeInTheDocument();
  });

  it('should show drop message when dragging', () => {
    mockUseSchemaGraphStore.mockReturnValue({
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
    } as any);

    render(
      <Canvas 
        {...defaultProps} 
        isDragging={true}
        draggedItem={{ type: 'string', label: 'Text Field' }}
      />
    );

    expect(screen.getByText('Drop here to add to root')).toBeInTheDocument();
  });

  it('should show drop message for any field type in root', () => {
    mockUseSchemaGraphStore.mockReturnValue({
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
    } as any);

    render(
      <Canvas
        {...defaultProps}
        isDragging={true}
        draggedItem={{ type: 'if_block', label: 'If Block' }}
      />
    );

    // Root can accept any field type according to the current implementation
    expect(screen.getByText('Drop here to add to root')).toBeInTheDocument();
  });

  it('should handle node selection', () => {
    mockUseSchemaGraphStore.mockReturnValue({
      graph: {
        nodes: {
          root: {
            id: 'root',
            key: 'root',
            type: 'object',
            title: 'Root',
            children: ['node1'],
          },
          node1: {
            id: 'node1',
            key: 'field1',
            type: 'string',
            title: 'Field 1',
            parentId: 'root',
          },
        },
        rootId: 'root',
      },
    } as any);

    render(<Canvas {...defaultProps} />);

    const formNode = screen.getByTestId('form-node-node1');
    formNode.click();

    expect(mockOnNodeSelect).toHaveBeenCalledWith('node1');
  });

  it('should highlight selected node', () => {
    mockUseSchemaGraphStore.mockReturnValue({
      graph: {
        nodes: {
          root: {
            id: 'root',
            key: 'root',
            type: 'object',
            title: 'Root',
            children: ['node1', 'node2'],
          },
          node1: {
            id: 'node1',
            key: 'field1',
            type: 'string',
            title: 'Field 1',
            parentId: 'root',
          },
          node2: {
            id: 'node2',
            key: 'field2',
            type: 'number',
            title: 'Field 2',
            parentId: 'root',
          },
        },
        rootId: 'root',
      },
    } as any);

    render(<Canvas {...defaultProps} selectedNodeId="node1" />);

    const selectedNode = screen.getByTestId('form-node-node1');
    const unselectedNode = screen.getByTestId('form-node-node2');

    expect(selectedNode).toHaveClass('selected');
    expect(unselectedNode).not.toHaveClass('selected');
  });

  it('should render nodes in correct order', () => {
    mockUseSchemaGraphStore.mockReturnValue({
      graph: {
        nodes: {
          root: {
            id: 'root',
            key: 'root',
            type: 'object',
            title: 'Root',
            children: ['node2', 'node1', 'node3'], // Specific order
          },
          node1: {
            id: 'node1',
            key: 'field1',
            type: 'string',
            title: 'Field 1',
            parentId: 'root',
          },
          node2: {
            id: 'node2',
            key: 'field2',
            type: 'number',
            title: 'Field 2',
            parentId: 'root',
          },
          node3: {
            id: 'node3',
            key: 'field3',
            type: 'boolean',
            title: 'Field 3',
            parentId: 'root',
          },
        },
        rootId: 'root',
      },
    } as any);

    render(<Canvas {...defaultProps} />);

    const nodes = screen.getAllByTestId(/form-node-/);
    expect(nodes).toHaveLength(3);
    expect(nodes[0]).toHaveAttribute('data-testid', 'form-node-node2');
    expect(nodes[1]).toHaveAttribute('data-testid', 'form-node-node1');
    expect(nodes[2]).toHaveAttribute('data-testid', 'form-node-node3');
  });

  it('should handle empty children array', () => {
    mockUseSchemaGraphStore.mockReturnValue({
      graph: {
        nodes: {
          root: {
            id: 'root',
            key: 'root',
            type: 'object',
            title: 'Root',
            children: undefined, // No children property
          },
        },
        rootId: 'root',
      },
    } as any);

    render(<Canvas {...defaultProps} />);

    expect(screen.getByText('Drag and drop fields here to build your form')).toBeInTheDocument();
  });

  it('should pass drag state to form nodes', () => {
    mockUseSchemaGraphStore.mockReturnValue({
      graph: {
        nodes: {
          root: {
            id: 'root',
            key: 'root',
            type: 'object',
            title: 'Root',
            children: ['node1'],
          },
          node1: {
            id: 'node1',
            key: 'field1',
            type: 'string',
            title: 'Field 1',
            parentId: 'root',
          },
        },
        rootId: 'root',
      },
    } as any);

    const draggedItem = { type: 'string', label: 'Text Field' };

    render(
      <Canvas 
        {...defaultProps} 
        isDragging={true}
        draggedItem={draggedItem}
        activeDropZone="node1"
      />
    );

    // FormNode should receive the drag props
    expect(screen.getByTestId('form-node-node1')).toBeInTheDocument();
  });
});

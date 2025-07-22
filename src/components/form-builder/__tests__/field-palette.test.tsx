import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FieldPalette } from '../field-palette';

// Mock DnD Kit
vi.mock('@dnd-kit/core', () => ({
  useDraggable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    isDragging: false,
  }),
}));

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  Type: ({ className }: { className?: string }) => <div className={className} data-testid="type-icon" />,
  TextQuote: ({ className }: { className?: string }) => <div className={className} data-testid="text-quote-icon" />,
  ToggleLeft: ({ className }: { className?: string }) => <div className={className} data-testid="toggle-left-icon" />,
  Hash: ({ className }: { className?: string }) => <div className={className} data-testid="hash-icon" />,
  Layers: ({ className }: { className?: string }) => <div className={className} data-testid="layers-icon" />,
  GitBranch: ({ className }: { className?: string }) => <div className={className} data-testid="git-branch-icon" />,
}));

describe('FieldPalette', () => {
  it('should render all field types', () => {
    render(<FieldPalette />);

    // Check that all field types are rendered
    expect(screen.getByText('Text')).toBeInTheDocument();
    expect(screen.getByText('Number')).toBeInTheDocument();
    expect(screen.getByText('Yes/No')).toBeInTheDocument();
    expect(screen.getByText('Object')).toBeInTheDocument();
    expect(screen.getByText('List')).toBeInTheDocument();
    expect(screen.getByText('If-Then-Else')).toBeInTheDocument();
  });

  it('should render correct icons for each field type', () => {
    render(<FieldPalette />);

    expect(screen.getByTestId('text-quote-icon')).toBeInTheDocument();
    expect(screen.getByTestId('hash-icon')).toBeInTheDocument();
    expect(screen.getByTestId('toggle-left-icon')).toBeInTheDocument();
    expect(screen.getByTestId('type-icon')).toBeInTheDocument();
    expect(screen.getByTestId('layers-icon')).toBeInTheDocument();
    expect(screen.getByTestId('git-branch-icon')).toBeInTheDocument();
  });

  it('should render field types in correct order', () => {
    render(<FieldPalette />);

    // Get all field type labels in order
    const textElements = screen.getAllByText(/^(Text|Number|Yes\/No|Object|List|If-Then-Else)$/);

    expect(textElements[0]).toHaveTextContent('Text');
    expect(textElements[1]).toHaveTextContent('Number');
    expect(textElements[2]).toHaveTextContent('Yes/No');
    expect(textElements[3]).toHaveTextContent('Object');
    expect(textElements[4]).toHaveTextContent('List');
    expect(textElements[5]).toHaveTextContent('If-Then-Else');
  });

  it('should have proper styling classes', () => {
    render(<FieldPalette />);

    const container = screen.getByText('Text').closest('.group');
    expect(container).toHaveClass('group', 'rounded-md', 'border', 'bg-background');
  });

  it('should render with draggable functionality', () => {
    render(<FieldPalette />);

    // Check that all field types are rendered and have draggable attributes
    const draggableElements = screen.getAllByText(/^(Text|Number|Yes\/No|Object|List|If-Then-Else)$/);
    expect(draggableElements).toHaveLength(6);

    // Each element should be in a draggable container
    draggableElements.forEach(element => {
      const draggableContainer = element.closest('[class*="cursor-grab"]');
      expect(draggableContainer).toBeInTheDocument();
    });
  });

  it('should have draggable styling', () => {
    render(<FieldPalette />);

    // Check that draggable elements have the correct base styling
    const draggableElements = screen.getAllByText(/^(Text|Number|Yes\/No|Object|List|If-Then-Else)$/);
    draggableElements.forEach(element => {
      const draggableContainer = element.closest('[class*="cursor-grab"]');
      expect(draggableContainer).toHaveClass('cursor-grab', 'touch-none');
    });
  });

  it('should have correct accessibility attributes', () => {
    render(<FieldPalette />);

    // Each field type should be interactive - check the draggable container
    const textField = screen.getByText('Text');
    const draggableContainer = textField.closest('[class*="cursor-grab"]');
    expect(draggableContainer).toHaveClass('cursor-grab');
  });

  it('should maintain consistent structure', () => {
    render(<FieldPalette />);

    // Check that each field type has the expected structure
    const fieldTypes = ['Text', 'Number', 'Yes/No', 'Object', 'List', 'If-Then-Else'];
    
    fieldTypes.forEach(fieldType => {
      const element = screen.getByText(fieldType);
      const container = element.closest('.group');
      const iconContainer = container?.querySelector('[data-testid*="icon"]');
      
      expect(container).toBeInTheDocument();
      expect(iconContainer).toBeInTheDocument();
      expect(element).toHaveClass('text-sm', 'font-medium');
    });
  });

  it('should handle hover states correctly', () => {
    render(<FieldPalette />);

    const textField = screen.getByText('Text').closest('.group');
    expect(textField).toHaveClass('hover:bg-accent', 'hover:text-accent-foreground');
  });
});

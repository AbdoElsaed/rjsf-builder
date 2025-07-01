export interface DraggedItem {
    type: string;
    label?: string;
    nodeId?: string;
    parentId?: string;
}

export interface FormNodeProps {
    nodeId: string;
    selectedNodeId: string | null;
    onSelect: (nodeId: string | null) => void;
    isDragging?: boolean;
    draggedItem?: DraggedItem | null;
    activeDropZone?: string | null;
    onRemove?: () => void;
} 
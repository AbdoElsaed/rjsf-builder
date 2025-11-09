import { useDroppable } from "@dnd-kit/core";
import { useSchemaGraphStore } from "@/lib/store/schema-graph";
import { cn } from "@/lib/utils";
import { FormNode } from "./form-node";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { getChildren } from "@/lib/graph/schema-graph";
import { useExpandContext } from "./expand-context";
import { Button } from "@/components/ui/button";
import { Bookmark, ChevronDown, ChevronRight } from "lucide-react";
import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useVirtualizer } from "@tanstack/react-virtual";
import { flattenTree } from "@/lib/utils/tree-flattener";

interface DraggedItem {
  type: string;
  label?: string;
  nodeId?: string;
  parentId?: string;
}

interface CanvasProps {
  selectedNodeId: string | null;
  onNodeSelect: (nodeId: string | null) => void;
  isDragging: boolean;
  draggedItem: DraggedItem | null;
  activeDropZone: string | null;
  dropPreview?: {
    targetId: string;
    relationshipType: 'child' | 'then' | 'else';
    canDrop: boolean;
  } | null;
}

// Helper function to check if a field type can be dropped into a parent
const canDropIntoParent = (_childType: string, parentType?: string): boolean => {
  if (!parentType) return true; // Root can accept any field
  if (parentType === "object") return true; // Objects can accept any field
  if (parentType === "array") return true; // Arrays can accept fields (with type consistency handled elsewhere)
  return false; // Other field types cannot accept children
};

export function Canvas({
  selectedNodeId,
  onNodeSelect,
  isDragging,
  draggedItem,
  activeDropZone,
  dropPreview,
}: CanvasProps) {
  const { graph } = useSchemaGraphStore();
  const { triggerExpandAll, triggerCollapseAll, expandTrigger, collapseTrigger } = useExpandContext();
  const [definitionsOpen, setDefinitionsOpen] = useState(true);
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(new Set());
  
  const { setNodeRef, isOver } = useDroppable({
    id: "root",
    data: {
      type: "root",
      nodeId: "root",
    },
  });

  // Get root level nodes using V2 getChildren - memoized
  const rootNodes = useMemo(() => 
    getChildren(graph, 'root', 'child').map(n => n.id),
    [graph]
  );
  
  // Initialize all nodes as expanded
  useEffect(() => {
    // Collect all node IDs that can be expanded (objects and arrays)
    const collectExpandableNodes = (nodeIds: string[], result: Set<string> = new Set()): Set<string> => {
      nodeIds.forEach(nodeId => {
        const node = graph.nodes.get(nodeId);
        if (node && (node.type === 'object' || node.type === 'array')) {
          result.add(nodeId);
          const children = getChildren(graph, nodeId, 'child');
          if (children.length > 0) {
            collectExpandableNodes(children.map(c => c.id), result);
          }
        }
      });
      return result;
    };
    
    setExpandedNodeIds(collectExpandableNodes(rootNodes));
  }, [graph, rootNodes]);
  
  // Handle global expand/collapse triggers
  useEffect(() => {
    if (expandTrigger > 0) {
      // Expand all nodes
      const collectAllNodes = (nodeIds: string[], result: Set<string> = new Set()): Set<string> => {
        nodeIds.forEach(nodeId => {
          result.add(nodeId);
          const children = getChildren(graph, nodeId, 'child');
          if (children.length > 0) {
            collectAllNodes(children.map(c => c.id), result);
          }
        });
        return result;
      };
      setExpandedNodeIds(collectAllNodes(rootNodes));
    }
  }, [expandTrigger, graph, rootNodes]);
  
  useEffect(() => {
    if (collapseTrigger > 0) {
      // Collapse all nodes
      setExpandedNodeIds(new Set());
    }
  }, [collapseTrigger]);
  
  // Toggle expand/collapse for a specific node
  const toggleNodeExpanded = useCallback((nodeId: string) => {
    setExpandedNodeIds(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);
  
  // Get all definitions for editing
  // Read directly from graph.definitions to ensure updates when definitions change
  const definitions = useMemo(() => {
    return Array.from(graph.definitions.entries())
      .map(([name, nodeId]) => {
        const node = graph.nodes.get(nodeId);
        if (!node) return null;
        return {
          name,
          nodeId: node.id,
          node,
        };
      })
      .filter((def): def is NonNullable<typeof def> => def !== null);
  }, [graph]); // Depend on graph - it changes when definitions are added/removed
  
  // Track previous definitions count to detect new additions
  const prevDefinitionsCountRef = useRef(definitions.length);
  
  // Auto-open definitions section when a new definition is added
  useEffect(() => {
    const prevCount = prevDefinitionsCountRef.current;
    const currentCount = definitions.length;
    
    // If definitions went from 0 to > 0, or increased, auto-open
    if ((prevCount === 0 && currentCount > 0) || (currentCount > prevCount && prevCount > 0)) {
      setDefinitionsOpen(true);
    }
    
    // Always update the ref to track current count
    prevDefinitionsCountRef.current = currentCount;
  }, [definitions.length]); // Depend on definitions.length to catch all changes
  
  // Handle expand/collapse all - one-time actions
  const handleExpandAll = () => {
    triggerExpandAll();
  };
  
  const handleCollapseAll = () => {
    triggerCollapseAll();
  };

  // Check if the current dragged item can be dropped in root
  const canDropInRoot = draggedItem
    ? canDropIntoParent(draggedItem.type, undefined)
    : false;

  const isRootDropTarget = dropPreview?.targetId === 'root' && dropPreview?.relationshipType === 'child';

  // Virtual scrolling for root nodes (performance optimization)
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  
  // Flatten the tree for virtual scrolling
  const flattenedNodes = useMemo(() => {
    return flattenTree(graph, rootNodes, expandedNodeIds, false, []);
  }, [graph, rootNodes, expandedNodeIds]);
  
  // Disable virtual scrolling for now - needs more work to handle drag-and-drop properly
  // Enable for very large lists only (100+)
  const useVirtualScrolling = false; // flattenedNodes.length > 100;
  
  const virtualizer = useVirtualizer({
    count: flattenedNodes.length,
    getScrollElement: () => viewportRef.current,
    estimateSize: () => 70, // Estimated height per flattened node
    overscan: 10, // Render 10 extra items above/below viewport for smoother scrolling
    enabled: useVirtualScrolling,
  });

  // Auto-scroll when dragging near edges (for better UX)
  useEffect(() => {
    if (!isDragging || !useVirtualScrolling) return;
    
    const viewport = viewportRef.current;
    if (!viewport) return;

    let scrollInterval: number | null = null;
    const scrollSpeed = 10; // pixels per frame
    const scrollZone = 100; // pixels from edge to trigger scroll

    const handleMouseMove = (e: MouseEvent) => {
      if (!viewport) return;
      
      const rect = viewport.getBoundingClientRect();
      const mouseY = e.clientY;
      const distanceFromTop = mouseY - rect.top;
      const distanceFromBottom = rect.bottom - mouseY;

      // Clear existing interval
      if (scrollInterval) {
        cancelAnimationFrame(scrollInterval);
        scrollInterval = null;
      }

      // Scroll up if near top edge
      if (distanceFromTop < scrollZone && viewport.scrollTop > 0) {
        const scroll = () => {
          viewport.scrollTop = Math.max(0, viewport.scrollTop - scrollSpeed);
          if (viewport.scrollTop > 0 && distanceFromTop < scrollZone) {
            scrollInterval = requestAnimationFrame(scroll);
          }
        };
        scrollInterval = requestAnimationFrame(scroll);
      }
      // Scroll down if near bottom edge
      else if (distanceFromBottom < scrollZone) {
        const scroll = () => {
          const maxScroll = viewport.scrollHeight - viewport.clientHeight;
          viewport.scrollTop = Math.min(maxScroll, viewport.scrollTop + scrollSpeed);
          if (viewport.scrollTop < maxScroll && distanceFromBottom < scrollZone) {
            scrollInterval = requestAnimationFrame(scroll);
          }
        };
        scrollInterval = requestAnimationFrame(scroll);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (scrollInterval) {
        cancelAnimationFrame(scrollInterval);
      }
    };
  }, [isDragging, useVirtualScrolling]);

  return (
    <div className="h-full flex flex-col">
      {/* Expand/Collapse All Controls - Modern Design */}
      {rootNodes.length > 0 && (
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border/50 px-6 py-3 flex items-center justify-end">
          <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/30 p-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-3 text-xs font-medium hover:bg-background transition-all duration-200"
              onClick={handleExpandAll}
              title="Expand all fields"
            >
              <ChevronDown className="h-3.5 w-3.5 mr-1.5" />
              Expand All
            </Button>
            <div className="h-4 w-px bg-border/50" />
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-3 text-xs font-medium hover:bg-background transition-all duration-200"
              onClick={handleCollapseAll}
              title="Collapse all fields"
            >
              <ChevronRight className="h-3.5 w-3.5 mr-1.5" />
              Collapse All
            </Button>
          </div>
        </div>
      )}
      {useVirtualScrolling ? (
        // Virtual scrolling container (uses native scrolling)
        <div
          ref={viewportRef}
          className="flex-1 overflow-auto min-h-0"
          style={{ scrollBehavior: 'smooth' }}
        >
          <div
            ref={setNodeRef}
            className={cn(
              "p-6 transition-all duration-300 rounded-lg relative min-h-full",
              rootNodes.length === 0 &&
                "border-2 border-dashed border-muted-foreground/20 bg-muted/5",
              // Enhanced visual feedback during drag
              isDragging &&
                canDropInRoot &&
                "border-2 border-dashed border-primary/60 bg-primary/5 shadow-lg shadow-primary/10",
              isDragging &&
                !canDropInRoot &&
                "border-2 border-dashed border-destructive/40 bg-destructive/5 opacity-60",
              // Active drop zone highlighting with pulsing animation
              activeDropZone === "root" &&
                canDropInRoot &&
                "bg-primary/10 ring-4 ring-primary/30 ring-offset-4 ring-offset-background",
              activeDropZone === "root" &&
                !canDropInRoot &&
                "bg-destructive/5 ring-4 ring-destructive/30 ring-offset-4 ring-offset-background",
              // Drop preview indicator
              isRootDropTarget && dropPreview?.canDrop && "animate-pulse",
              // Legacy hover state for non-dragging scenarios
              !isDragging && isOver && "bg-accent/10 ring-2 ring-primary/20"
            )}
            style={{
              minHeight: rootNodes.length > 0 
                ? `max(${virtualizer.getTotalSize() + (definitions.length > 0 ? 150 : 0) + (isDragging ? 80 : 0)}px, 100%)`
                : '100%',
            }}
          >
            {/* Drop preview indicator line */}
            {isRootDropTarget && rootNodes.length > 0 && dropPreview?.canDrop && (
              <div className="absolute top-6 left-6 right-6 h-1.5 bg-primary rounded-full animate-pulse z-10 shadow-lg shadow-primary/50" />
            )}
            
            {/* Definitions Section - Editable Definitions */}
            {definitions.length > 0 && (
              <div className="mb-6 pb-6 border-b border-border/50">
                <Collapsible open={definitionsOpen} onOpenChange={setDefinitionsOpen}>
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full justify-between p-3 h-auto hover:bg-muted/50 mb-3 rounded-lg transition-all duration-200 group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-md bg-primary/10 group-hover:bg-primary/20 transition-colors">
                          <Bookmark className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex flex-col items-start">
                          <span className="font-medium text-sm">Definitions</span>
                          <span className="text-xs text-muted-foreground">
                            {definitions.length} definition{definitions.length !== 1 ? 's' : ''} • Edit reusable components
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground hidden sm:inline">
                          {definitionsOpen ? 'Collapse' : 'Expand'}
                        </span>
                        {definitionsOpen ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform duration-200" />
                        )}
                      </div>
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="space-y-3 pl-4">
                      {definitions.map(({ nodeId }) => (
                        <div key={nodeId} className="border-l-2 border-primary/30 pl-4">
                          <FormNode
                            nodeId={nodeId}
                            selectedNodeId={selectedNodeId}
                            onSelect={onNodeSelect}
                            isDragging={isDragging}
                            draggedItem={draggedItem}
                            activeDropZone={activeDropZone}
                            dropPreview={dropPreview}
                          />
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            )}
            
            {/* Root Fields Section */}
            {rootNodes.length === 0 ? (
              <div className="flex h-full items-center justify-center min-h-[400px]">
                {isDragging ? (
                  <div className={cn(
                    "flex flex-col items-center gap-4 p-8 rounded-xl border-2 transition-all duration-300 shadow-lg",
                    canDropInRoot 
                      ? "border-primary/60 bg-primary/10 text-primary shadow-primary/20" 
                      : "border-destructive/50 bg-destructive/10 text-destructive shadow-destructive/20"
                  )}>
                    {canDropInRoot ? (
                      <>
                        <span className="text-4xl animate-bounce">↓</span>
                        <span className="font-semibold text-base">Drop here to add to root</span>
                        <span className="text-xs opacity-80">This will be a top-level field</span>
                      </>
                    ) : (
                      <>
                        <span className="text-4xl">✗</span>
                        <span className="font-semibold text-base">Cannot drop this field type here</span>
                        <span className="text-xs opacity-80">This field type is not supported at root level</span>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="text-center space-y-3 max-w-md">
                    <div className="text-6xl mb-4 opacity-20">📋</div>
                    <p className="text-base text-muted-foreground font-medium">
                      Drag and drop fields here to build your form
                    </p>
                    <p className="text-sm text-muted-foreground/70">
                      Start by dragging a field from the palette on the left
                    </p>
                  </div>
                )}
              </div>
        ) : useVirtualScrolling ? (
          // Virtual scrolling for large lists - virtualize flattened tree
          <div
            style={{
              height: `${virtualizer.getTotalSize() + (isDragging ? 80 : 0)}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {virtualizer.getVirtualItems().map((virtualItem) => {
              const flattenedNode = flattenedNodes[virtualItem.index];
              if (!flattenedNode) return null;
              
              return (
                <div
                  key={virtualItem.key}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualItem.size}px`,
                    transform: `translateY(${virtualItem.start}px)`,
                    paddingLeft: `${flattenedNode.depth * 24}px`, // Indent based on depth
                  }}
                  data-index={virtualItem.index}
                  data-depth={flattenedNode.depth}
                >
                  <div className="pr-6 pb-3">
                    <FormNode
                      nodeId={flattenedNode.nodeId}
                      selectedNodeId={selectedNodeId}
                      onSelect={onNodeSelect}
                      isDragging={isDragging}
                      draggedItem={draggedItem}
                      activeDropZone={activeDropZone}
                      dropPreview={dropPreview}
                      externalExpandState={flattenedNode.hasChildren ? {
                        isExpanded: flattenedNode.isExpanded,
                        onToggle: () => toggleNodeExpanded(flattenedNode.nodeId),
                      } : undefined}
                    />
                  </div>
                </div>
              );
            })}
            {/* Always visible drop zone at the end for better UX */}
            {isDragging && (
              <div
                className={cn(
                  "h-20 border-2 border-dashed rounded-xl flex items-center justify-center transition-all duration-200 mx-6 mb-6",
                  canDropInRoot
                    ? "border-primary/60 bg-primary/10 text-primary shadow-sm animate-pulse"
                    : "border-destructive/40 bg-destructive/5 text-destructive opacity-50"
                )}
                style={{
                  position: 'absolute',
                  top: `${virtualizer.getTotalSize()}px`,
                  left: 0,
                  width: 'calc(100% - 3rem)',
                }}
              >
                <span className={cn(
                  "text-xs font-medium flex items-center gap-2",
                  isDragging && canDropInRoot && "animate-pulse"
                )}>
                  {isDragging ? (
                    canDropInRoot ? (
                      <>
                        <span className="text-lg">↓</span>
                        <span>Drop here to add to root</span>
                      </>
                    ) : (
                      <>
                        <span>✗</span>
                        <span>Cannot drop here</span>
                      </>
                    )
                  ) : (
                    <>
                      <span className="text-muted-foreground">Drop fields here</span>
                    </>
                  )}
                </span>
              </div>
            )}
          </div>
        ) : (
          // Standard rendering for small lists
          <SortableContext
            items={rootNodes}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3 min-h-[100px]">
              {rootNodes.map((nodeId) => (
                <FormNode
                  key={nodeId}
                  nodeId={nodeId}
                  selectedNodeId={selectedNodeId}
                  onSelect={onNodeSelect}
                  isDragging={isDragging}
                  draggedItem={draggedItem}
                  activeDropZone={activeDropZone}
                  dropPreview={dropPreview}
                />
              ))}
              {/* Enhanced empty drop zone at the end for root drops */}
              {isDragging && (
                <div className={cn(
                  "h-16 border-2 border-dashed rounded-xl flex items-center justify-center transition-all duration-200",
                  canDropInRoot
                    ? "border-primary/60 bg-primary/10 text-primary shadow-sm"
                    : "border-destructive/40 bg-destructive/5 text-destructive opacity-50"
                )}>
                  <span className={cn(
                    "text-xs font-medium flex items-center gap-2",
                    canDropInRoot && "animate-pulse"
                  )}>
                    {canDropInRoot ? (
                      <>
                        <span className="text-lg">↓</span>
                        <span>Drop here to add to root</span>
                      </>
                    ) : (
                      <>
                        <span>✗</span>
                        <span>Cannot drop here</span>
                      </>
                    )}
                  </span>
                </div>
              )}
            </div>
          </SortableContext>
        )}
          </div>
        </div>
      ) : (
        // Standard scrolling for small lists (using native div for reliable scrolling)
        <div 
          ref={scrollAreaRef}
          className="flex-1 overflow-auto min-h-0"
        >
          <div
            ref={setNodeRef}
            className={cn(
              "p-6 transition-all duration-300 rounded-lg relative min-h-full",
              rootNodes.length === 0 &&
                "border-2 border-dashed border-muted-foreground/20 bg-muted/5",
              // Enhanced visual feedback during drag
              isDragging &&
                canDropInRoot &&
                "border-2 border-dashed border-primary/60 bg-primary/5 shadow-lg shadow-primary/10",
              isDragging &&
                !canDropInRoot &&
                "border-2 border-dashed border-destructive/40 bg-destructive/5 opacity-60",
              // Active drop zone highlighting with pulsing animation
              activeDropZone === "root" &&
                canDropInRoot &&
                "bg-primary/10 ring-4 ring-primary/30 ring-offset-4 ring-offset-background",
              activeDropZone === "root" &&
                !canDropInRoot &&
                "bg-destructive/5 ring-4 ring-destructive/30 ring-offset-4 ring-offset-background",
              // Drop preview indicator
              isRootDropTarget && dropPreview?.canDrop && "animate-pulse",
              // Legacy hover state for non-dragging scenarios
              !isDragging && isOver && "bg-accent/10 ring-2 ring-primary/20"
            )}
          >
            {/* Drop preview indicator line */}
            {isRootDropTarget && rootNodes.length > 0 && dropPreview?.canDrop && (
              <div className="absolute top-6 left-6 right-6 h-1.5 bg-primary rounded-full animate-pulse z-10 shadow-lg shadow-primary/50" />
            )}
            
            {/* Definitions Section - Editable Definitions */}
            {definitions.length > 0 && (
              <div className="mb-6 pb-6 border-b border-border/50">
                <Collapsible open={definitionsOpen} onOpenChange={setDefinitionsOpen}>
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full justify-between p-3 h-auto hover:bg-muted/50 mb-3 rounded-lg transition-all duration-200 group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-md bg-primary/10 group-hover:bg-primary/20 transition-colors">
                          <Bookmark className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex flex-col items-start">
                          <span className="font-medium text-sm">Definitions</span>
                          <span className="text-xs text-muted-foreground">
                            {definitions.length} definition{definitions.length !== 1 ? 's' : ''} • Edit reusable components
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground hidden sm:inline">
                          {definitionsOpen ? 'Collapse' : 'Expand'}
                        </span>
                        {definitionsOpen ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform duration-200" />
                        )}
                      </div>
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="space-y-3 pl-4">
                      {definitions.map(({ nodeId }) => (
                        <div key={nodeId} className="border-l-2 border-primary/30 pl-4">
                          <FormNode
                            nodeId={nodeId}
                            selectedNodeId={selectedNodeId}
                            onSelect={onNodeSelect}
                            isDragging={isDragging}
                            draggedItem={draggedItem}
                            activeDropZone={activeDropZone}
                            dropPreview={dropPreview}
                          />
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            )}
            
            {/* Root Fields Section */}
            {rootNodes.length === 0 ? (
              <div className="flex h-full items-center justify-center min-h-[400px]">
                {isDragging ? (
                  <div className={cn(
                    "flex flex-col items-center gap-4 p-8 rounded-xl border-2 transition-all duration-300 shadow-lg",
                    canDropInRoot 
                      ? "border-primary/60 bg-primary/10 text-primary shadow-primary/20" 
                      : "border-destructive/50 bg-destructive/10 text-destructive shadow-destructive/20"
                  )}>
                    {canDropInRoot ? (
                      <>
                        <span className="text-4xl animate-bounce">↓</span>
                        <span className="font-semibold text-base">Drop here to add to root</span>
                        <span className="text-xs opacity-80">This will be a top-level field</span>
                      </>
                    ) : (
                      <>
                        <span className="text-4xl">✗</span>
                        <span className="font-semibold text-base">Cannot drop this field type here</span>
                        <span className="text-xs opacity-80">This field type is not supported at root level</span>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="text-center space-y-3 max-w-md">
                    <div className="text-6xl mb-4 opacity-20">📋</div>
                    <p className="text-base text-muted-foreground font-medium">
                      Drag and drop fields here to build your form
                    </p>
                    <p className="text-sm text-muted-foreground/70">
                      Start by dragging a field from the palette on the left
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <SortableContext
                items={rootNodes}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3 min-h-[100px]">
                  {rootNodes.map((nodeId) => (
                    <FormNode
                      key={nodeId}
                      nodeId={nodeId}
                      selectedNodeId={selectedNodeId}
                      onSelect={onNodeSelect}
                      isDragging={isDragging}
                      draggedItem={draggedItem}
                      activeDropZone={activeDropZone}
                      dropPreview={dropPreview}
                    />
                  ))}
                  {/* Enhanced empty drop zone at the end for root drops */}
                  {isDragging && (
                    <div className={cn(
                      "h-16 border-2 border-dashed rounded-xl flex items-center justify-center transition-all duration-200",
                      canDropInRoot
                        ? "border-primary/60 bg-primary/10 text-primary shadow-sm"
                        : "border-destructive/40 bg-destructive/5 text-destructive opacity-50"
                    )}>
                      <span className={cn(
                        "text-xs font-medium flex items-center gap-2",
                        canDropInRoot && "animate-pulse"
                      )}>
                        {canDropInRoot ? (
                          <>
                            <span className="text-lg">↓</span>
                            <span>Drop here to add to root</span>
                          </>
                        ) : (
                          <>
                            <span>✗</span>
                            <span>Cannot drop here</span>
                          </>
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </SortableContext>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

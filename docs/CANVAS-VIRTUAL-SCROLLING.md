# Canvas Virtual Scrolling Implementation Plan

## Current Performance Issues

1. **All nodes rendered at once**: With 100+ fields, all FormNode components render even if not visible
2. **Recursive rendering**: Nested structures cause deep component trees
3. **No virtualization**: ScrollArea renders everything, causing performance degradation
4. **Memory usage**: All DOM nodes exist simultaneously

## Solution: Virtual Scrolling

### Approach: Flatten Tree + Virtual List

**Strategy:**
1. Flatten the tree structure into a linear list with depth information
2. Filter based on expand/collapse state
3. Use virtual scrolling to render only visible items
4. Maintain drag-and-drop functionality

### Library Choice: `@tanstack/react-virtual`

**Why @tanstack/react-virtual:**
- ✅ Lightweight (~5KB gzipped)
- ✅ Modern API with hooks
- ✅ Works with any container (not just fixed heights)
- ✅ Supports dynamic item heights
- ✅ Better TypeScript support
- ✅ Active maintenance

**Alternative: `react-window`**
- ❌ Requires fixed item heights (hard with nested/collapsible items)
- ❌ Less flexible API
- ❌ Larger bundle size

## Implementation Plan

### Phase 1: Flatten Tree Structure

**File: `src/lib/utils/tree-flattener.ts`** (NEW)

```typescript
export interface FlattenedNode {
  id: string;
  nodeId: string;
  depth: number;
  isExpanded: boolean;
  hasChildren: boolean;
  parentId: string | null;
}

export function flattenTree(
  graph: SchemaGraph,
  rootNodeIds: string[],
  expandedIds: Set<string>
): FlattenedNode[] {
  const result: FlattenedNode[] = [];
  
  function traverse(nodeId: string, depth: number, parentId: string | null) {
    const node = graph.nodes.get(nodeId);
    if (!node) return;
    
    const hasChildren = getChildren(graph, nodeId, 'child').length > 0;
    const isExpanded = expandedIds.has(nodeId);
    
    result.push({
      id: nodeId, // Unique ID for virtual list
      nodeId,
      depth,
      isExpanded,
      hasChildren,
      parentId,
    });
    
    // Only traverse children if expanded
    if (isExpanded && hasChildren) {
      const children = getChildren(graph, nodeId, 'child');
      children.forEach(child => {
        traverse(child.id, depth + 1, nodeId);
      });
    }
  }
  
  rootNodeIds.forEach(nodeId => traverse(nodeId, 0, null));
  return result;
}
```

### Phase 2: Virtual Scrolling Component

**File: `src/components/form-builder/virtualized-canvas.tsx`** (NEW)

```typescript
import { useVirtualizer } from '@tanstack/react-virtual';
import { flattenTree, FlattenedNode } from '@/lib/utils/tree-flattener';

export function VirtualizedCanvas({ ...props }: CanvasProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  
  // Flatten tree structure
  const flattenedNodes = useMemo(() => {
    return flattenTree(graph, rootNodes, expandedIds);
  }, [graph, rootNodes, expandedIds]);
  
  // Virtual scrolling
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: flattenedNodes.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60, // Estimated height per item
    overscan: 5, // Render 5 extra items above/below viewport
  });
  
  return (
    <div ref={parentRef} className="h-full overflow-auto">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const flattenedNode = flattenedNodes[virtualItem.index];
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
              }}
            >
              <FormNode
                nodeId={flattenedNode.nodeId}
                depth={flattenedNode.depth}
                // ... other props
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

### Phase 3: Dynamic Height Estimation

**Challenge**: FormNode heights vary based on:
- Expanded/collapsed state
- Number of children
- Field type
- Content length

**Solution**: Measure and cache heights

```typescript
const [itemHeights, setItemHeights] = useState<Map<string, number>>(new Map());

const estimateSize = useCallback((index: number) => {
  const node = flattenedNodes[index];
  return itemHeights.get(node.id) || 60; // Default 60px
}, [flattenedNodes, itemHeights]);

// Measure height after render
const measureRef = useCallback((node: HTMLDivElement | null, nodeId: string) => {
  if (node) {
    const height = node.getBoundingClientRect().height;
    setItemHeights(prev => {
      const next = new Map(prev);
      next.set(nodeId, height);
      return next;
    });
  }
}, []);
```

### Phase 4: Expand/Collapse Integration

```typescript
const handleToggleExpand = useCallback((nodeId: string) => {
  setExpandedIds(prev => {
    const next = new Set(prev);
    if (next.has(nodeId)) {
      next.delete(nodeId);
    } else {
      next.add(nodeId);
    }
    return next;
  });
  
  // Invalidate height cache for this node and children
  // Recalculate virtual list
}, []);
```

### Phase 5: Drag-and-Drop Compatibility

**Challenge**: DnD needs to work with virtual scrolling

**Solution**: 
- Use `@dnd-kit`'s collision detection
- Update drop zones based on virtual items
- Handle drag preview positioning

### Phase 6: Performance Optimizations

1. **Memoization**: Memoize flattened nodes calculation
2. **Debouncing**: Debounce expand/collapse state updates
3. **Height caching**: Cache measured heights
4. **Selective re-renders**: Only re-render changed items

## Migration Strategy

1. **Create new component**: `VirtualizedCanvas` alongside existing `Canvas`
2. **Feature flag**: Add toggle to switch between implementations
3. **Test thoroughly**: Ensure all features work (DnD, expand/collapse, selection)
4. **Performance testing**: Measure improvements
5. **Replace**: Once stable, replace old Canvas

## Expected Performance Improvements

- **Initial render**: 10-50x faster with 100+ fields
- **Scroll performance**: Smooth 60fps even with 1000+ fields
- **Memory usage**: 80-90% reduction (only visible DOM nodes)
- **Interaction responsiveness**: Instant expand/collapse

## Considerations

### Pros
- ✅ Massive performance improvement
- ✅ Scales to 1000+ fields
- ✅ Better user experience
- ✅ Lower memory footprint

### Cons
- ⚠️ More complex implementation
- ⚠️ Need to handle dynamic heights
- ⚠️ DnD integration complexity
- ⚠️ Expand/collapse state management

## Next Steps

1. Install `@tanstack/react-virtual`
2. Create tree flattener utility
3. Implement VirtualizedCanvas component
4. Test with large schemas
5. Optimize and polish


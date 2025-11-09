import { useState, useCallback, useEffect, useRef } from 'react';
import { useExpandContext } from './expand-context';

/**
 * Hook to manage expanded state for virtual scrolling
 * Syncs with global expand/collapse triggers
 */
export function useExpandedState(initialExpanded: Set<string> = new Set()) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(initialExpanded);
  const { expandTrigger, collapseTrigger } = useExpandContext();
  
  // Track last trigger values
  const lastExpandTriggerRef = useRef(expandTrigger);
  const lastCollapseTriggerRef = useRef(collapseTrigger);

  // Handle global expand all
  useEffect(() => {
    if (expandTrigger > lastExpandTriggerRef.current) {
      // Expand all - we'll need to get all node IDs from the graph
      // For now, we'll handle this in the component that uses this hook
      lastExpandTriggerRef.current = expandTrigger;
    }
  }, [expandTrigger]);

  // Handle global collapse all
  useEffect(() => {
    if (collapseTrigger > lastCollapseTriggerRef.current) {
      setExpandedIds(new Set());
      lastCollapseTriggerRef.current = collapseTrigger;
    }
  }, [collapseTrigger]);

  const toggleExpand = useCallback((nodeId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  const expandAll = useCallback((nodeIds: string[]) => {
    setExpandedIds(new Set(nodeIds));
  }, []);

  const collapseAll = useCallback(() => {
    setExpandedIds(new Set());
  }, []);

  return {
    expandedIds,
    toggleExpand,
    expandAll,
    collapseAll,
    isExpanded: useCallback((nodeId: string) => expandedIds.has(nodeId), [expandedIds]),
  };
}


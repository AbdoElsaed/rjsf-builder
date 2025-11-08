/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, ReactNode, useCallback } from 'react';

interface ExpandContextType {
  triggerExpandAll: () => void;
  triggerCollapseAll: () => void;
  expandTrigger: number; // Increments to trigger expand
  collapseTrigger: number; // Increments to trigger collapse
}

const ExpandContext = createContext<ExpandContextType | undefined>(undefined);

export function ExpandProvider({ children }: { children: ReactNode }) {
  const [expandTrigger, setExpandTrigger] = useState(0);
  const [collapseTrigger, setCollapseTrigger] = useState(0);

  const triggerExpandAll = useCallback(() => {
    setExpandTrigger(prev => prev + 1);
  }, []);

  const triggerCollapseAll = useCallback(() => {
    setCollapseTrigger(prev => prev + 1);
  }, []);

  return (
    <ExpandContext.Provider value={{ triggerExpandAll, triggerCollapseAll, expandTrigger, collapseTrigger }}>
      {children}
    </ExpandContext.Provider>
  );
}

export function useExpandContext() {
  const context = useContext(ExpandContext);
  if (!context) {
    throw new Error('useExpandContext must be used within ExpandProvider');
  }
  return context;
}


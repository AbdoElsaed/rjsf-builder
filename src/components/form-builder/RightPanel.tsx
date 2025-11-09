import { useState, useEffect, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings2, Eye, Code, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PreviewPanel } from "./preview-panel";
import { FieldConfigPanel } from "./field-config-panel";
import { useSchemaGraphStore } from "@/lib/store/schema-graph";
import { getParent } from "@/lib/graph/schema-graph";
import { cn } from "@/lib/utils";

interface RightPanelProps {
  selectedNodeId: string | null;
  onFieldDeselect: () => void;
}

export function RightPanel({ selectedNodeId, onFieldDeselect }: RightPanelProps) {
  const { getNode, graph } = useSchemaGraphStore();
  const [activeTab, setActiveTab] = useState<"config" | "preview">("preview");
  const [showPreviewMode, setShowPreviewMode] = useState(true);

  const handleDeselect = useCallback(() => {
    onFieldDeselect();
    setActiveTab("preview");
  }, [onFieldDeselect]);

  // Auto-switch to config tab when a field is selected
  useEffect(() => {
    if (selectedNodeId) {
      setActiveTab("config");
    }
  }, [selectedNodeId]);

  // Check if a node still has a valid path to root (not orphaned)
  const isNodeValid = useCallback((nodeId: string | null): boolean => {
    if (!nodeId) return false;
    
    // Check if node exists
    if (!graph.nodes.has(nodeId)) {
      return false;
    }
    
    // Check if node has a valid path to root
    // Traverse up the parent chain to ensure we can reach root
    let currentId: string | null = nodeId;
    const visited = new Set<string>();
    
    while (currentId && currentId !== 'root') {
      // Detect cycles
      if (visited.has(currentId)) {
        return false; // Cycle detected, invalid
      }
      visited.add(currentId);
      
      // Get parent
      const parent = getParent(graph, currentId);
      if (!parent) {
        // No parent and not root - orphaned node
        return false;
      }
      
      // Check if parent still exists
      if (!graph.nodes.has(parent.id)) {
        return false; // Parent was deleted
      }
      
      currentId = parent.id;
    }
    
    // Successfully reached root
    return true;
  }, [graph]);

  // Auto-close config panel if selected field is deleted or orphaned
  useEffect(() => {
    if (selectedNodeId && !isNodeValid(selectedNodeId)) {
      handleDeselect();
    }
  }, [selectedNodeId, graph, isNodeValid, handleDeselect]);

  // ESC key support to deselect field
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedNodeId && activeTab === "config") {
        handleDeselect();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [selectedNodeId, activeTab, handleDeselect]);

  const selectedNode = selectedNodeId ? getNode(selectedNodeId) : null;

  return (
    <div className="h-full flex flex-col bg-muted/30 backdrop-blur-sm">
      {/* Tab Navigation */}
      <Tabs 
        value={activeTab} 
        onValueChange={(value) => setActiveTab(value as "config" | "preview")}
        className="flex flex-col h-full"
      >
        <div className="border-b border-border/50 bg-background/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="px-4 py-3">
            <TabsList className="grid w-full grid-cols-2 bg-muted/50">
              <TabsTrigger 
                value="config" 
                disabled={!selectedNodeId}
                className={cn(
                  "gap-2 data-[state=active]:bg-background transition-all duration-200",
                  !selectedNodeId && "opacity-50 cursor-not-allowed"
                )}
              >
                <Settings2 className="h-4 w-4" />
                <span className="hidden sm:inline">Configure</span>
                {selectedNode && (
                  <span className="hidden lg:inline text-xs text-muted-foreground truncate max-w-[100px] ml-1">
                    • {selectedNode.title || 'Field'}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger 
                value="preview"
                className="gap-2 data-[state=active]:bg-background transition-all duration-200"
              >
                {showPreviewMode ? (
                  <>
                    <Eye className="h-4 w-4" />
                    <span className="hidden sm:inline">Preview</span>
                  </>
                ) : (
                  <>
                    <Code className="h-4 w-4" />
                    <span className="hidden sm:inline">Schema</span>
                  </>
                )}
              </TabsTrigger>
            </TabsList>
          </div>
          
          {/* Close button when in config mode */}
          {selectedNodeId && activeTab === "config" && (
            <div className="px-4 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <kbd className="px-1.5 py-0.5 text-xs font-semibold text-muted-foreground bg-muted border border-border rounded">
                  ESC
                </kbd>
                <span>to close</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDeselect}
                className="h-7 gap-1.5 text-xs hover:bg-muted/80 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Close</span>
              </Button>
            </div>
          )}
        </div>

        {/* Configuration Tab */}
        <TabsContent 
          value="config" 
          className="flex-1 m-0 p-0 overflow-hidden data-[state=inactive]:hidden animate-in fade-in-0 slide-in-from-right-2 duration-200 flex flex-col"
        >
          {selectedNodeId ? (
            <FieldConfigPanel
              nodeId={selectedNodeId}
              onSave={() => {
                handleDeselect();
              }}
              onCancel={handleDeselect}
            />
          ) : (
            <div className="flex items-center justify-center h-full p-8 animate-in fade-in-0 duration-300">
              <div className="text-center space-y-4 max-w-sm">
                <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center shadow-lg">
                  <Settings2 className="h-10 w-10 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                  <p className="text-base font-semibold text-foreground">No Field Selected</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Click a field in the canvas to configure its properties
                  </p>
                </div>
                <div className="pt-2 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <kbd className="px-2 py-1 text-xs font-semibold text-muted-foreground bg-muted border border-border rounded">
                    ESC
                  </kbd>
                  <span>to deselect</span>
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Preview Tab */}
        <TabsContent 
          value="preview" 
          className="flex-1 m-0 p-0 overflow-hidden data-[state=inactive]:hidden relative animate-in fade-in-0 slide-in-from-left-2 duration-200"
        >
          {/* Preview/Schema Toggle Button */}
          <div className="absolute right-4 top-4 z-10">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 shadow-sm hover:shadow-md transition-all duration-200 bg-background/80 backdrop-blur-sm"
              onClick={() => setShowPreviewMode(!showPreviewMode)}
            >
              {showPreviewMode ? (
                <>
                  <Code className="h-4 w-4" />
                  <span className="hidden sm:inline">Show Schema</span>
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4" />
                  <span className="hidden sm:inline">Show Preview</span>
                </>
              )}
            </Button>
          </div>
          
          <PreviewPanel showPreview={showPreviewMode} />
        </TabsContent>
      </Tabs>
    </div>
  );
}


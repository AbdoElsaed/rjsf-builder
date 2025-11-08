import { useDraggable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import {
  Type,
  TextQuote,
  ToggleLeft,
  Hash,
  Layers,
  GitBranch,
  Bookmark,
  ChevronDown,
  ChevronRight,
  Plus,
} from "lucide-react";
import { useState, useMemo } from "react";
import { useSchemaGraphStore } from "@/lib/store/schema-graph";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CreateEmptyDefinitionDialog } from "./create-empty-definition-dialog";
import { getChildren } from "@/lib/graph/schema-graph";

interface FieldTypeItem {
  id: string;
  type: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

const FIELD_TYPES: FieldTypeItem[] = [
  {
    id: "text-field",
    type: "string",
    icon: TextQuote,
    label: "Text",
  },
  {
    id: "number-field",
    type: "number",
    icon: Hash,
    label: "Number",
  },
  {
    id: "boolean-field",
    type: "boolean",
    icon: ToggleLeft,
    label: "Yes/No",
  },
  {
    id: "object-field",
    type: "object",
    icon: Type,
    label: "Object",
  },
  {
    id: "array-field",
    type: "array",
    icon: Layers,
    label: "List",
  },
  {
    id: "if-block",
    type: "if_block",
    icon: GitBranch,
    label: "If-Then-Else",
  },
];

function DraggableFieldType({ item }: { item: FieldTypeItem }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: item.id,
    data: {
      type: item.type,
      label: item.label,
    },
  });

  const Icon = item.icon;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        "cursor-grab touch-none",
        isDragging && "cursor-grabbing opacity-50"
      )}
    >
      <div className="group rounded-lg border border-border/50 bg-card px-4 py-3.5 hover:bg-accent hover:text-accent-foreground hover:border-accent-foreground/20 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
        <div className="flex items-center gap-3">
          <Icon className="h-5 w-5 text-muted-foreground group-hover:text-current transition-colors duration-200" />
          <span className="text-sm font-medium">{item.label}</span>
        </div>
      </div>
    </div>
  );
}

function DraggableComponent({ 
  componentName, 
  nodeId,
  referenceCount 
}: { 
  componentName: string; 
  nodeId: string;
  referenceCount: number;
}) {
  const { graph, getNode } = useSchemaGraphStore();
  const node = getNode(nodeId);
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `component-${componentName}`,
    data: {
      type: "ref",
      label: componentName,
      definitionName: componentName,
      nodeId: nodeId,
    },
  });

  // Count children to show structure info
  const childrenCount = useMemo(() => {
    if (!node) return 0;
    return getChildren(graph, nodeId, 'child').length;
  }, [graph, nodeId, node]);

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        "cursor-grab touch-none",
        isDragging && "cursor-grabbing opacity-50"
      )}
      title={`Drag to use "${componentName}" definition${referenceCount > 0 ? ` (used ${referenceCount} time${referenceCount !== 1 ? 's' : ''})` : ''}`}
    >
      <div className="group rounded-lg border border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 px-4 py-3 hover:bg-primary/15 hover:border-primary/50 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Bookmark className="h-5 w-5 text-primary group-hover:text-primary transition-colors duration-200 fill-primary/20" />
            {referenceCount > 0 && (
              <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] text-primary-foreground flex items-center justify-center font-bold">
                {referenceCount}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-foreground truncate">
              {componentName}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {node && (
                <span className="capitalize">{node.type}</span>
              )}
              {childrenCount > 0 && (
                <>
                  <span>•</span>
                  <span>{childrenCount} field{childrenCount !== 1 ? 's' : ''}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function FieldPalette() {
  const { graph, getAllDefinitions } = useSchemaGraphStore();
  const [componentsOpen, setComponentsOpen] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  
  // Get all definitions and count references
  const components = useMemo(() => {
    const definitions = getAllDefinitions();
    const componentsList: Array<{
      name: string;
      nodeId: string;
      referenceCount: number;
    }> = [];
    
    definitions.forEach((node, name) => {
      // Count references to this definition
      let refCount = 0;
      graph.nodes.forEach((n) => {
        if (n.type === 'ref' && n.refTarget === name) {
          refCount++;
        }
      });
      
      componentsList.push({
        name,
        nodeId: node.id,
        referenceCount: refCount,
      });
    });
    
    return componentsList.sort((a, b) => a.name.localeCompare(b.name));
  }, [graph, getAllDefinitions]);
  
  const handleCreateEmptyDefinition = () => {
    setShowCreateDialog(true);
  };

  return (
    <div className="space-y-2.5">
      {/* Field Types */}
      {FIELD_TYPES.map((item) => (
        <DraggableFieldType key={item.id} item={item} />
      ))}
      
      {/* Components Section */}
      <div className="pt-2 border-t border-border/50">
        <Collapsible open={componentsOpen} onOpenChange={setComponentsOpen}>
          <div className="flex items-center justify-between mb-2">
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                {componentsOpen ? (
                  <ChevronDown className="h-3.5 w-3.5 mr-1.5" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 mr-1.5" />
                )}
                  <Bookmark className="h-3.5 w-3.5 mr-1.5 text-primary" />
                  Definitions ({components.length})
              </Button>
            </CollapsibleTrigger>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 hover:bg-primary/10 hover:text-primary"
              onClick={handleCreateEmptyDefinition}
              title="Create new definition"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
          <CollapsibleContent className="space-y-2">
            {components.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border/50 bg-muted/20 p-4 text-center">
                <Bookmark className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  No definitions yet
                </p>
                <p className="text-xs text-muted-foreground/70 mb-3">
                  Create reusable definitions to use across your form
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={handleCreateEmptyDefinition}
                >
                  <Plus className="h-3 w-3 mr-1.5" />
                  Create Definition
                </Button>
              </div>
            ) : (
              components.map((component) => (
                <DraggableComponent
                  key={component.name}
                  componentName={component.name}
                  nodeId={component.nodeId}
                  referenceCount={component.referenceCount}
                />
              ))
            )}
          </CollapsibleContent>
        </Collapsible>
      </div>
      
      {/* Create Empty Definition Dialog */}
      <CreateEmptyDefinitionDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreated={(componentName) => {
          // Component created successfully
          setComponentsOpen(true); // Expand components section
        }}
      />
    </div>
  );
}

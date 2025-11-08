<!-- aa076a9b-f922-4fda-8645-8e9781f92261 4fec7812-2f52-48a1-9b7c-5c35de6e776d -->
# Core Engine Redesign Plan

## Problem Analysis

### Current Issues Identified:

1. **Inefficient Graph Structure**

   - Uses simple `Record<string, FieldNode>` with arrays for relationships
   - Deep clones entire graph on every operation (O(n) time/space)
   - No indexed lookups - requires O(n) traversal for parent/child queries
   - IF blocks have dual relationship types (`children` vs `then`/`else`) causing complexity

2. **Drag-and-Drop Complexity**

   - Special case handling for IF blocks scattered throughout code (lines 148-217, 265-271, 309-315 in layout.tsx)
   - Multiple manual parent removal/addition operations
   - Inefficient cycle detection (O(n) traversal on every check)

3. **Missing RJSF Features**

   - No support for `definitions` (reusable field groups)
   - No `$ref` support for referencing definitions
   - Incomplete `allOf`/`anyOf`/`oneOf` support (only allOf partially implemented)

4. **Architecture Limitations**

   - Single relationship type (parent-child) doesn't model complex JSON Schema relationships
   - No separation between schema nodes and relationship edges
   - Hard to extend for new relationship types

## Proposed Solution: Proper Graph Architecture

### Phase 1: New Graph Data Structure

**File: `src/lib/graph/schema-graph-v2.ts`** (new core engine)

#### 1.1 Edge-Based Graph Model

```typescript
// Relationship types as first-class citizens
type EdgeType = 'child' | 'then' | 'else' | 'allOf' | 'anyOf' | 'oneOf' | 'ref';

interface GraphEdge {
  id: string;
  sourceId: string;  // Parent node
  targetId: string;  // Child node
  type: EdgeType;
  order?: number;     // For maintaining sequence
  metadata?: Record<string, unknown>;
}

interface SchemaGraphV2 {
  // Core structure
  nodes: Map<string, SchemaNode>;  // O(1) lookups
  edges: Map<string, GraphEdge>;  // All relationships
  
  // Indexed lookups for performance
  parentIndex: Map<string, string>;  // childId -> parentId (O(1))
  childrenIndex: Map<string, Set<string>>;  // parentId -> Set<childIds> (O(1))
  edgeTypeIndex: Map<EdgeType, Set<string>>;  // edgeType -> Set<edgeIds>
  
  // Definitions support
  definitions: Map<string, string>;  // definitionName -> nodeId
  
  // Root reference
  rootId: string;
}
```

#### 1.2 Enhanced Node Model

```typescript
interface SchemaNode {
  id: string;
  key: string;
  type: JSONSchemaType | 'definition' | 'allOf' | 'anyOf' | 'oneOf';
  
  // Schema properties (current FieldNode properties)
  title: string;
  description?: string;
  required?: boolean;
  // ... all existing field properties
  
  // Conditional logic (as first-class node types)
  condition?: ConditionalLogic;
  
  // Reference support
  refTarget?: string;  // For $ref nodes pointing to definitions
  
  // Metadata
  position?: { x: number; y: number };
  ui?: UiSchema;
}
```

### Phase 2: Efficient Graph Operations

**File: `src/lib/graph/schema-graph-engine-v2.ts`**

#### 2.1 Core Operations with O(1) Complexity

- `addNode()`: O(1) - direct Map insertion
- `addEdge()`: O(1) - update indices atomically
- `removeNode()`: O(k) where k = degree of node (much better than O(n))
- `getParent()`: O(1) - use parentIndex
- `getChildren()`: O(1) - use childrenIndex
- `getEdgesByType()`: O(1) - use edgeTypeIndex
- `isDescendant()`: O(depth) - optimized path traversal with early exit

#### 2.2 Structural Sharing Instead of Deep Cloning

- Use immutable data structures (Immer or custom)
- Only clone changed nodes/edges, not entire graph
- Reduce memory usage and improve performance

#### 2.3 Unified Relationship Handling

```typescript
// Single method handles all relationship types
addRelationship(
  sourceId: string,
  targetId: string,
  type: EdgeType,
  order?: number
): SchemaGraphV2

// Handles child, then, else, allOf, anyOf, oneOf uniformly
```

### Phase 3: RJSF Features Support (CRITICAL - Based on Real Schema)

#### 3.1 Definitions Support (High Priority)

```typescript
// Definitions are stored separately and can be reused
interface DefinitionNode extends SchemaNode {
  type: 'definition';
  definitionName: string;  // e.g., "yes_no", "offer_type"
  isReusable: true;
}

// Definitions registry in graph
definitions: Map<string, string>;  // definitionName -> nodeId

// Create definition from field group
createDefinition(
  name: string, 
  sourceNodeIds: string[] | string  // Can be single node or group
): string

// UI: Definitions library panel to browse/manage reusable components
```

**Import Logic:**

- Parse `definitions` section first
- Create definition nodes for each entry
- Store in definitions registry
- Keep definitions separate from main schema tree

**Export Logic:**

- Collect all referenced definitions
- Output `definitions` section in JSON Schema
- Maintain reference format (`#/definitions/name`)

#### 3.2 $ref Support (High Priority)

```typescript
// Reference node that points to a definition
interface RefNode extends SchemaNode {
  type: 'ref';
  refTarget: string;  // definition name (e.g., "yes_no")
  resolvedNodeId?: string;  // Cached resolved node ID for performance
}

// Create reference to definition
createRefToDefinition(definitionName: string, parentId: string): string

// Resolve reference (for editing/validation)
resolveRef(refNodeId: string): SchemaNode | null

// Import: Convert $ref to RefNode
// Export: Convert RefNode back to $ref format
```

**Import Logic:**

- Detect `$ref` in schema
- Create RefNode pointing to definition name
- Validate definition exists
- Optionally resolve for immediate use

**Export Logic:**

- Convert RefNode to `{ "$ref": "#/definitions/name" }`
- Ensure referenced definition is in definitions section

#### 3.3 allOf/anyOf/oneOf Support (Critical for Real Schema)

```typescript
// Conditional group node type
interface ConditionalGroupNode extends SchemaNode {
  type: 'allOf' | 'anyOf' | 'oneOf';
  conditions: ConditionalBlock[];  // Array of if/then/else blocks
}

interface ConditionalBlock {
  if: ConditionalLogic;  // Condition schema
  then?: string;  // Node ID for then branch
  else?: string;  // Node ID for else branch
}

// Create conditional group with multiple conditions
createConditionalGroup(
  type: 'allOf' | 'anyOf' | 'oneOf',
  conditions: Array<{ if: ConditionalLogic, then?: string, else?: string }>
): string

// Add condition to existing group
addConditionToGroup(groupId: string, condition: ConditionalBlock): SchemaGraphV2
```

**Import Logic for allOf Arrays:**

```typescript
// Handle: "allOf": [{ if: {...}, then: {...} }, { if: {...}, then: {...} }]
processAllOf(allOfArray: RJSFSchema[]): string {
  // Create ConditionalGroupNode
  // For each entry in allOf array:
  //   - Extract if/then/else
  //   - Convert to ConditionalBlock
  //   - Link via edges
}
```

**Export Logic:**

```typescript
// Convert ConditionalGroupNode back to JSON Schema allOf format
compileConditionalGroup(node: ConditionalGroupNode): RJSFSchema {
  return {
    allOf: node.conditions.map(block => ({
      if: compileCondition(block.if),
      then: block.then ? compileNode(block.then) : undefined,
      else: block.else ? compileNode(block.else) : undefined
    }))
  };
}
```

#### 3.4 Complex Pattern Support

**Pattern 1: allOf with $ref in then**

```json
"allOf": [{
  "if": { "properties": { "field": { "const": "yes" } } },
  "then": { "$ref": "#/definitions/building_exists_yes" }
}]
```

- Import: Create ConditionalGroupNode → RefNode edge for then
- Export: Maintain $ref format in then clause

**Pattern 2: Multiple conditions in allOf**

```json
"allOf": [
  { "if": {...}, "then": {...} },
  { "if": {...}, "then": {...} }
]
```

- Import: Multiple ConditionalBlocks in one ConditionalGroupNode
- Export: Array of if/then objects

**Pattern 3: Nested allOf (allOf inside definitions)**

- Handle recursively during import
- Maintain structure during export

#### 3.5 UI Support for Definitions

**New Component: Definitions Library Panel**

- List all definitions
- Create new definition from selected fields
- Edit definition (updates all references)
- Delete definition (with reference checking)
- Search/filter definitions
- Show usage count for each definition

**Enhanced Field Palette:**

- Add "Reference" field type
- Drag reference → select definition dialog
- Visual indicator for reference fields
- Click to navigate to definition

### Phase 4: Improved Drag-and-Drop

**File: `src/lib/graph/drag-drop-helpers.ts`** (new)

#### 4.1 Unified Drop Target Detection

```typescript
// Single method that handles all relationship types
canDrop(
  graph: SchemaGraphV2,
  sourceId: string,
  targetId: string,
  edgeType?: EdgeType
): boolean

// Checks:
// - Type compatibility
// - Cycle prevention (using efficient graph traversal)
// - Edge type validity
// - Definition constraints
```

#### 4.2 Simplified Move Operations

```typescript
// Single method replaces all the complex logic in layout.tsx
moveNode(
  graph: SchemaGraphV2,
  nodeId: string,
  newParentId: string,
  edgeType: EdgeType = 'child',
  order?: number
): SchemaGraphV2

// Automatically handles:
// - Removing from old parent (any edge type)
// - Adding to new parent
// - Updating indices
// - Maintaining order
```

### Phase 5: Migration Strategy

#### 5.1 Backward Compatibility Layer

**File: `src/lib/graph/schema-graph-adapter.ts`** (new)

- Convert old `SchemaGraph` to new `SchemaGraphV2`
- Convert new `SchemaGraphV2` back to old format (for gradual migration)
- Allows incremental migration without breaking existing code

#### 5.2 Updated Store Interface

**File: `src/lib/store/schema-graph-v2.ts`** (new store, keep old one temporarily)

- New store using `SchemaGraphV2`
- Same public API, better internal implementation
- Can run both stores in parallel during migration

### Phase 6: Widget Library & UI Schema Management

#### 6.1 Widget Registry System

**File: `src/lib/widgets/widget-registry.ts`** (new)

```typescript
interface CustomWidget {
  id: string;
  name: string;  // e.g., "YesNoWidget", "AddPhotoToGallery"
  displayName: string;
  description?: string;
  compatibleTypes: JSONSchemaType[];  // Which field types can use this widget
  defaultConfig: Record<string, unknown>;  // Default UI schema options
  icon?: string;
}

interface WidgetRegistry {
  widgets: Map<string, CustomWidget>;
  
  // Auto-mapping rules
  getWidgetForField(field: SchemaNode): CustomWidget | null;
  
  // Manual widget assignment
  assignWidget(fieldId: string, widgetId: string): void;
  
  // Get all compatible widgets for a field type
  getCompatibleWidgets(fieldType: JSONSchemaType): CustomWidget[];
}
```

**Pre-defined Widgets:**

- `YesNoWidget` - for enum fields with yes/no values
- `AddPhotoToGallery` - for array fields with image uploads
- Standard RJSF widgets (text, textarea, select, etc.)
- Custom widgets can be added by developers

#### 6.2 Auto UI Schema Generation

**File: `src/lib/ui-schema/ui-schema-generator.ts`** (new)

```typescript
// Automatically generate UI schema based on:
// 1. Field type (enum yes/no → YesNoWidget)
// 2. User-selected widget
// 3. Field structure (arrays → itemTitle, collapsible settings)
// 4. Nested paths (mirror JSON schema structure)

generateUiSchema(
  graph: SchemaGraphV2,
  widgetRegistry: WidgetRegistry
): NestedUiSchema {
  // Traverse graph
  // For each field:
  //   - Check if widget is assigned
  //   - Auto-detect widget if not assigned (enum yes/no → YesNoWidget)
  //   - Generate nested structure matching JSON schema paths
  //   - Add ui:order based on graph edge order
  //   - Add collapsible for objects
  //   - Add array-specific UI options (itemTitle, addMoreItemsTitle)
}
```

**Auto-Detection Rules:**

- Enum with values ["yes", "no"] → `YesNoWidget`
- Array of strings (images) → `AddPhotoToGallery`
- Object fields → `ui:collapsible: true` (by default)
- Arrays → `ui:itemTitle`, `ui:itemCollapsible` (configurable)

#### 6.3 UI Schema Store Enhancement

**File: `src/lib/store/ui-schema-v2.ts`** (updated)

```typescript
interface UiSchemaStateV2 {
  uiSchema: NestedUiSchema;
  widgetRegistry: WidgetRegistry;
  
  // Assign widget to field
  assignWidget(fieldPath: string, widgetId: string): void;
  
  // Auto-generate UI schema from graph
  regenerateFromGraph(graph: SchemaGraphV2): void;
  
  // Get widget for field
  getWidgetForField(fieldPath: string): CustomWidget | null;
  
  // Update UI schema options (collapsible, order, etc.)
  updateFieldOptions(fieldPath: string, options: Record<string, unknown>): void;
}
```

**Features:**

- Automatically syncs with graph structure
- Maintains nested path structure
- Updates when fields are added/removed/moved
- Preserves custom widget assignments

#### 6.4 Widget Selection UI

**New Component: `src/components/widget-selector.tsx`**

- Dropdown/selector for choosing widget when configuring field
- Shows compatible widgets for field type
- Preview widget appearance
- Shows default config options
- Updates UI schema automatically on selection

#### 6.5 UI Schema Export

**Enhanced Export:**

```typescript
exportSchemaAndUiSchema(): {
  schema: RJSFSchema;
  uiSchema: NestedUiSchema;
} {
  return {
    schema: compileToJsonSchema(),
    uiSchema: generateUiSchema(graph, widgetRegistry)
  };
}
```

**Export Format:**

- Single JSON with both schemas
- Or separate files
- Ready to copy-paste into RJSF app

### Phase 7: Import/Export Enhancements

#### 7.1 Enhanced JSON Schema Import

**File: `src/lib/graph/schema-importer-v2.ts`** (new)

- Parse `definitions` section into definition nodes
- Handle `$ref` references properly
- Import `allOf`/`anyOf`/`oneOf` as conditional group nodes
- Handle nested conditionals correctly
- Import UI schema alongside JSON schema
- Map custom widgets back to widget registry

#### 7.2 Enhanced JSON Schema Export

- Export definitions section
- Expand references to `$ref` format
- Properly serialize conditional groups
- Maintain schema structure integrity
- Export UI schema with matching structure
- Include widget configurations

## Implementation Phases

### Phase 1: Core Graph Structure (Week 1)

- [ ] Create `SchemaGraphV2` data structure
- [ ] Implement basic graph operations (add/remove nodes/edges)
- [ ] Build indexed lookup system
- [ ] Write comprehensive tests

### Phase 2: Engine Implementation (Week 1-2)

- [ ] Implement efficient graph operations
- [ ] Add structural sharing for immutability
- [ ] Implement unified relationship handling
- [ ] Write performance benchmarks

### Phase 3: RJSF Features (Week 2)

- [ ] Add definitions support
- [ ] Add $ref support
- [ ] Implement allOf/anyOf/oneOf properly
- [ ] Update compilation logic

### Phase 4: Drag-and-Drop Improvements (Week 2-3)

- [ ] Create unified drop detection
- [ ] Simplify move operations
- [ ] Update layout.tsx to use new helpers
- [ ] Test complex nested scenarios

### Phase 5: Migration & Testing (Week 3)

- [ ] Create adapter layer
- [ ] Migrate store to new engine
- [ ] Update all components
- [ ] Comprehensive integration testing

### Phase 6: Polish & Documentation (Week 3-4)

- [ ] Update documentation
- [ ] Performance optimization
- [ ] Bug fixes
- [ ] Remove old code

## Key Benefits

1. **Performance**: O(1) lookups instead of O(n) traversals
2. **Simplicity**: Unified relationship handling removes special cases
3. **Extensibility**: Easy to add new relationship types
4. **Correctness**: Proper support for all RJSF features
5. **Maintainability**: Clean separation of concerns

## Risk Mitigation

- Keep old engine alongside new one during migration
- Comprehensive test coverage before switching
- Gradual rollout with feature flags
- Performance monitoring to ensure improvements
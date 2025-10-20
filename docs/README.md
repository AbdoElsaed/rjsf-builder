# RJSF Builder - Architecture Diagrams

This folder contains comprehensive Mermaid diagrams that visualize the core architecture and algorithms of the RJSF Builder project.

## 📊 System Architecture Diagrams (Dark Mode)

### 1. [System Architecture](./01-system-architecture.mmd)
**Overview**: Complete system architecture showing all layers and components
- UI Layer: Canvas, Field Palette, Config Panel, Preview Panel
- State Management: Three Zustand stores
- Core Engine: Schema Graph Engine + validators
- Data Structures & External Dependencies
- **Use Case**: Understanding overall system structure

### 2. [Core Algorithm Flow](./02-core-algorithm-flow.mmd)
**Overview**: Detailed flowchart of the core algorithm processing
- User action processing (add/remove/update/move operations)
- Schema Graph Engine execution flow
- Validation phases and error handling
- JSON Schema conversion pipeline
- **Use Case**: Understanding how user actions become form updates

### 3. [State Management Flow](./03-state-management-flow.mmd)
**Overview**: Comprehensive view of state management
- Three Zustand stores interaction
- Component subscriptions and reactive updates
- Data migration on schema changes
- Store update cycles
- **Use Case**: Understanding state flow and store coordination

### 4. [Component Interaction Flow](./04-component-interaction-flow.mmd)
**Overview**: Sequence diagram showing UI component interactions
- Real-time drag & drop operations
- Field configuration workflows
- Nested field handling
- Error handling scenarios
- **Use Case**: Understanding component communication patterns

### 5. [Data Transformation Pipeline](./05-data-transformation-pipeline.mmd)
**Overview**: The complete data transformation process
- Schema Graph → JSON Schema conversion
- Field type mappings and validation rules
- Conditional logic (IF-THEN-ELSE) handling
- UI Schema and Form Data integration
- **Use Case**: Understanding how internal graph becomes RJSF form

## 🖥️ Programming Architecture Diagrams (Dark Mode)

### 6. [Core Algorithm Programming Structure](./06-core-algorithm-programming.mmd)
**Overview**: Programming architecture and code organization
- Class structure and method signatures
- Data structures and interfaces
- Memory management strategies
- Validation system architecture
- **Use Case**: Understanding code organization and API design

### 7. [Algorithm Execution Flow](./07-algorithm-execution-flow.mmd)
**Overview**: Step-by-step code execution flow
- Function entry points and parameter processing
- Memory management execution
- Validation chain execution
- Graph mutation patterns
- **Use Case**: Understanding how algorithms execute at runtime

### 8. [Programming Patterns & Data Structures](./08-programming-patterns-structures.mmd)
**Overview**: Design patterns and programming principles used
- Programming paradigms (Functional, OOP, Type-driven)
- Design patterns implementation
- Data structure choices
- Error handling strategies
- **Use Case**: Understanding architectural decisions and patterns

## 🌳 Schema Graph Structure Diagrams (Dark Mode)

### 9. [Schema Graph Structure](./09-schema-graph-structure.mmd)
**Overview**: Complete visualization of SchemaGraph and FieldNode interfaces
- FieldNode interface with all properties categorized by type
- JSONSchemaType values and their specific properties
- Tree structure relationships (parent-child, root-leaf)
- UI configuration and validation systems
- **Use Case**: Understanding the core data structures and their relationships

### 10. [Node Relationships & Flow](./10-node-relationships-flow.mmd)
**Overview**: Node relationships, navigation patterns, and access methods
- Parent-child relationship mechanics
- Tree traversal algorithms (DFS, BFS)
- Hash map access patterns (O-1 lookup)
- Type-based relationships and validation flow
- **Use Case**: Understanding how nodes connect and can be navigated

### 11. [Visual Node Tree Example](./11-visual-node-tree.mmd)
**Overview**: Complete visual example of a real schema graph tree
- User registration form example with 12 nodes
- 3-level tree structure with actual field types
- Conditional fields and dependencies visualization
- Access patterns and navigation examples
- **Use Case**: Seeing a concrete example of how the schema graph looks in practice

### Bonus Files:
- **[Dark Mode Test](./dark-mode-test.mmd)**: Simple test diagram for troubleshooting
- **[Programming Guide](./README-programming.md)**: Detailed programming documentation

## 🎯 How to Use These Diagrams

### For Development:
- **Adding Features**: Start with System Architecture to understand where new code should go
- **Debugging**: Use Algorithm Flow to trace execution paths
- **State Issues**: Refer to State Management Flow for store interactions
- **UI Problems**: Check Component Interaction Flow for event handling
- **Code Structure**: Use Programming diagrams for implementation details

### For Code Reviews:
- **Architecture Changes**: Reference System Architecture for impact assessment
- **Algorithm Changes**: Use Core Algorithm Flow to validate logic changes
- **State Changes**: Check State Management Flow for proper store usage
- **Programming Changes**: Use Programming diagrams for code quality assessment

### For Onboarding:
1. Start with **System Architecture** for the big picture
2. Deep dive into **Core Algorithm Flow** to understand processing
3. Study **State Management Flow** for reactive patterns
4. Review **Component Interaction Flow** for UI event handling
5. Understand **Data Transformation Pipeline** for schema conversion
6. Explore **Programming diagrams** for implementation details

## 🌙 Dark Mode Design

All diagrams feature a professional dark theme:
- **Dark Background**: GitHub-style dark theme (#0d1117 background)
- **High Contrast**: Light text on dark backgrounds for excellent readability
- **Enhanced Typography**: Arial font with optimized sizing (11px-14px)
- **Better Spacing**: Proper node spacing (35-50px) and padding (20-30px)
- **Color-Coded Categories**: Each layer/component type has distinct dark mode colors
- **Bold Borders**: 3px stroke width with vibrant accent colors
- **Eye-Friendly**: Reduced eye strain with warm, muted accent colors

## 🔧 Previewing Diagrams

You can preview these `.mmd` files using:
- **VS Code**: Mermaid Preview extension (recommended)
- **Online**: [Mermaid Live Editor](https://mermaid.live/)
- **CLI**: Mermaid CLI tool with config: `mmdc -i diagram.mmd -o output.png -c mermaid-config.json`
- **Markdown files**: Include in documentation using \`\`\`mermaid blocks

### Dark Mode Color Scheme
- 🔵 **UI Layer**: Deep blue (`#1e3a8a`) with light blue accents (`#60a5fa`)
- 🟣 **State Management**: Deep purple (`#581c87`) with purple accents (`#c084fc`)  
- 🟢 **Core Engine**: Deep green (`#14532d`) with green accents (`#4ade80`)
- 🟠 **Data/Output**: Deep orange (`#9a3412`) with orange accents (`#fb923c`)
- 🔴 **Error Handling**: Deep red (`#991b1b`) with red accents (`#f87171`)

### Troubleshooting Preview Issues
1. **Start with**: `dark-mode-test.mmd` (simplest dark mode test)
2. **If errors occur**: Check VS Code extension version or try online editor
3. **For CLI users**: Use the included `mermaid-config.json` for consistent dark styling

## 🏗️ Architecture Principles

These diagrams illustrate key architectural principles:

- **Separation of Concerns**: Clear boundaries between layers
- **Pure Business Logic**: Schema Graph Engine has no side effects
- **Unidirectional Data Flow**: Actions → State → UI updates
- **Immutable Operations**: All graph operations return new instances
- **Reactive State Management**: Components auto-update on state changes
- **Type Safety**: Strong TypeScript interfaces throughout
- **Performance Optimization**: Identified optimization opportunities

## 🚀 Programming Benefits

### Code Quality
- **Immutability Contract**: Never mutate input parameters
- **Pure Functions**: Predictable inputs and outputs
- **Type Safety**: Compile-time error prevention
- **Error Handling**: Explicit error handling without exceptions

### Performance
- **Algorithm Complexity**: Documented O(n) complexities
- **Memory Management**: Garbage collection friendly patterns  
- **Optimization Opportunities**: Structural sharing, memoization, lazy evaluation
- **Batch Operations**: Multiple changes in single operations

### Maintainability
- **Design Patterns**: Factory, Strategy, Command, Immutable Object patterns
- **Single Responsibility**: Each class has one clear purpose
- **Interface Driven**: Well-defined contracts between components
- **Documentation**: Comprehensive visual and code documentation

## 📝 Maintenance

When modifying the codebase:
1. Update relevant diagrams to reflect architectural changes
2. Keep diagrams in sync with code structure
3. Add new diagrams for significant new features
4. Review diagrams during architecture discussions

These diagrams serve as both documentation and architectural blueprints for the RJSF Builder project, providing both high-level system understanding and detailed programming implementation guidance.
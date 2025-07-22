# Testing Documentation

## Overview

This document describes the comprehensive unit testing setup for the React JSON Schema Form Builder application using Vitest, React Testing Library, and related testing utilities.

## Testing Stack

- **Vitest**: Fast unit test framework with native TypeScript support
- **@testing-library/react**: React component testing utilities
- **@testing-library/jest-dom**: Custom Jest matchers for DOM testing
- **@testing-library/user-event**: User interaction simulation
- **jsdom**: DOM environment for testing

## Test Configuration

### Vitest Configuration
The testing configuration is set up in `vite.config.ts`:

```typescript
test: {
  globals: true,
  environment: 'jsdom',
  setupFiles: ['./src/test/setup.ts'],
  css: true,
}
```

### Test Setup
The test setup file (`src/test/setup.ts`) includes:
- Jest DOM matchers
- Mock implementations for browser APIs (ResizeObserver, IntersectionObserver, matchMedia)
- Clipboard API mocks
- DragEvent mocks for drag-and-drop testing

## Test Structure

### Core Business Logic Tests

#### 1. Schema Graph Engine (`src/lib/graph/__tests__/schema-graph-engine.test.ts`)
Tests the core graph manipulation engine:
- **Node Management**: Adding, removing, updating nodes
- **Graph Operations**: Moving nodes, reordering, validation
- **Schema Compilation**: Converting graph to JSON Schema
- **Schema Import**: Converting JSON Schema to graph
- **Graph Validation**: Detecting orphaned nodes and inconsistencies

#### 2. Field Validators (`src/lib/graph/__tests__/field-validators.test.ts`)
Tests field validation logic:
- **Field Validation**: String, number, boolean, array, enum field validation
- **Constraint Validation**: Min/max lengths, patterns, ranges
- **Suggestions**: Field improvement recommendations
- **Type Compatibility**: Field type compatibility checking

#### 3. Field Configuration (`src/lib/types/__tests__/field-config.test.ts`)
Tests field configuration utilities:
- **Default Configurations**: Proper defaults for each field type
- **Type Safety**: Ensuring type-safe configurations
- **UI Schema Integration**: Proper UI schema defaults

### State Management Tests

#### 1. Schema Graph Store (`src/lib/store/__tests__/schema-graph.test.ts`)
Tests the Zustand store for schema graph management:
- **Store Actions**: Add, remove, update, move, reorder nodes
- **State Persistence**: Proper state updates and immutability
- **Schema Operations**: Import/export functionality
- **Validation Integration**: Graph validation through store

#### 2. Form Data Store (`src/lib/store/__tests__/form-data.test.ts`)
Tests form data management:
- **Data Updates**: Form data updates and replacements
- **Schema Migration**: Data migration when schema changes
- **Nested Data**: Handling complex nested form data
- **Type Preservation**: Maintaining data types during operations

#### 3. UI Schema Store (`src/lib/store/__tests__/ui-schema.test.ts`)
Tests UI schema management:
- **Schema Updates**: UI schema updates and merging
- **Nested Paths**: Handling deeply nested field paths
- **Field Removal**: Proper cleanup when fields are removed
- **Complex Scenarios**: Mixed operations and structure integrity

### Utility Tests

#### 1. Utils (`src/lib/__tests__/utils.test.ts`)
Tests utility functions:
- **Class Name Utilities**: Tailwind class merging
- **Node Path Generation**: Graph node path calculation
- **Edge Cases**: Handling orphaned nodes and circular references

### Component Tests

#### 1. Canvas Component (`src/components/form-builder/__tests__/canvas.test.tsx`)
Tests the main form building canvas:
- **Rendering**: Empty state and node rendering
- **Drag and Drop**: Drop zone behavior and validation
- **Node Selection**: Node selection and highlighting
- **State Management**: Integration with schema store

#### 2. Field Palette (`src/components/form-builder/__tests__/field-palette.test.tsx`)
Tests the field type palette:
- **Field Types**: All field types rendered correctly
- **Drag Functionality**: Draggable field implementation
- **Icons and Labels**: Proper field type representation
- **Accessibility**: Proper ARIA attributes and keyboard support

#### 3. Preview Panel (`src/components/form-builder/__tests__/preview-panel.test.tsx`)
Tests the form preview functionality:
- **Form Rendering**: RJSF form rendering with current schema
- **Schema Editing**: JSON schema editing capabilities
- **Data Handling**: Form data updates and validation
- **UI Schema Integration**: UI schema application

### Integration Tests

#### Full Workflow Tests (`src/__tests__/integration.test.ts`)
Tests complete application workflows:
- **Schema-Form Data Integration**: Data consistency during schema changes
- **UI Schema Integration**: UI schema synchronization with field paths
- **Complete Workflows**: End-to-end form building scenarios
- **Import/Export Cycles**: Schema import and export integrity

## Test Scripts

```json
{
  "test": "vitest",
  "test:ui": "vitest --ui",
  "test:run": "vitest run",
  "test:coverage": "vitest run --coverage"
}
```

## Test Coverage Areas

### ✅ Fully Tested
- Field validation logic
- Field configuration utilities
- UI Schema store operations
- Utility functions

### 🔄 Partially Tested
- Schema Graph Engine (some edge cases need refinement)
- Form Data Store (nested object migration needs work)
- Component rendering (mocking challenges with complex dependencies)

### 📋 Test Categories

1. **Unit Tests**: Individual function and class testing
2. **Integration Tests**: Multi-component interaction testing
3. **Component Tests**: React component behavior testing
4. **Store Tests**: State management testing
5. **Utility Tests**: Helper function testing

## Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with UI
pnpm test:ui

# Run tests once
pnpm test:run

# Run with coverage
pnpm test:coverage
```

## Test Best Practices

1. **Isolation**: Each test is independent and can run in any order
2. **Mocking**: External dependencies are properly mocked
3. **Assertions**: Clear, specific assertions with meaningful error messages
4. **Setup/Teardown**: Proper test environment setup and cleanup
5. **Edge Cases**: Testing both happy path and error conditions

## Future Improvements

1. **Visual Regression Testing**: Add screenshot testing for UI components
2. **E2E Testing**: Add Playwright or Cypress for full user journey testing
3. **Performance Testing**: Add performance benchmarks for large schemas
4. **Accessibility Testing**: Automated a11y testing integration
5. **Mock Service Worker**: API mocking for more realistic testing scenarios

## Troubleshooting

### Common Issues

1. **Store State Persistence**: Use `useStore.setState()` to reset state between tests
2. **Component Mocking**: Mock complex dependencies like DnD Kit and Monaco Editor
3. **Async Operations**: Use `waitFor` for async state updates
4. **DOM Cleanup**: Ensure proper cleanup between tests to avoid memory leaks

### Debugging Tests

1. Use `screen.debug()` to inspect rendered DOM
2. Add `console.log` statements in test setup
3. Use Vitest UI for interactive debugging
4. Check test isolation by running individual tests

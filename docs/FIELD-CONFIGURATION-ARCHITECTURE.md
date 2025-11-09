# Field Configuration Architecture

## Overview

The field configuration system has been refactored to provide comprehensive, type-safe, and scalable field property management. The new architecture is based on **modular components**, **JSON Schema 2020-12 compliance**, and **RJSF 6.0 best practices**.

## Architecture Components

### 1. Schema Properties Definition (`src/lib/schema/json-schema-properties.ts`)

This file contains all valid JSON Schema and RJSF properties for each field type:

- **String Properties**: minLength, maxLength, pattern, format (with 20+ standard formats), contentEncoding
- **Number Properties**: minimum, maximum, exclusiveMinimum, exclusiveMaximum, multipleOf
- **Boolean Properties**: No specific validation (uses common properties only)
- **Array Properties**: minItems, maxItems, uniqueItems, contains, minContains, maxContains
- **Object Properties**: minProperties, maxProperties, additionalProperties, patternProperties, propertyNames, dependencies
- **Enum Properties**: enum values, enumNames for display

### 2. Field Configuration Components (`src/components/form-builder/field-configs/`)

Each field type has a dedicated configuration component:

#### StringFieldConfig
- Format selection (email, URI, date, UUID, regex, etc.)
- Length validation (min/max)
- Pattern validation (regex)
- Placeholder text
- Widget selection

#### NumberFieldConfig
- Inclusive range (minimum/maximum)
- Exclusive range (exclusiveMinimum/exclusiveMaximum)
- Multiple of validation
- Widget selection (updown/range)

#### BooleanFieldConfig
- Widget selection (checkbox/radio/select)
- Simple UI with minimal configuration

#### ArrayFieldConfig
- Item count validation (min/max)
- Unique items enforcement
- UI options (addable, removable, orderable, copyable)
- Custom add button text

#### ObjectFieldConfig
- Property count validation (min/max)
- Additional properties toggle
- Information about property management

#### EnumFieldConfig
- Dynamic option management
- Value and display name editing
- Add/remove options
- Widget selection (select/radio/checkboxes)

### 3. Main Configuration Panel (`src/components/form-builder/field-config-panel.tsx`)

The refactored panel:
- Uses modular field configuration components
- Maintains backward compatibility
- Preserves all existing functionality
- Implements type-safe handlers
- Provides consistent UX across all field types

## Key Features

### 1. Type Safety
```typescript
// Type-safe property definitions
export interface StringSchemaProperties {
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: 'email' | 'uri' | 'date' | ...;
}

// Discriminated unions for field configs
export type FieldConfig = 
  | StringFieldConfig
  | NumberFieldConfig
  | BooleanFieldConfig
  | ...;
```

### 2. Modularity
Each field type's configuration is isolated in its own component, making it easy to:
- Add new properties
- Modify existing behavior
- Test independently
- Maintain without affecting other types

### 3. Extensibility
Adding new field properties is straightforward:

1. Add the property to the schema properties definition
2. Update the field configuration component UI
3. No changes needed in the main panel

### 4. JSON Schema Compliance
All properties are based on JSON Schema 2020-12 specification:
- Standard validation keywords
- Format assertions
- Content encoding
- Dependencies and conditional schemas

### 5. RJSF Integration
Full support for RJSF 6.0 UI Schema:
- Widget selection
- UI options
- Custom templates
- Field-specific customizations

## Usage Example

### Adding a New String Property

1. **Update Type Definition** (`json-schema-properties.ts`):
```typescript
export interface StringSchemaProperties {
  // Existing properties...
  transform?: 'uppercase' | 'lowercase' | 'capitalize';
}
```

2. **Update Component** (`StringFieldConfig.tsx`):
```typescript
<Select
  value={config.transform || 'none'}
  onValueChange={(value) => onChange('transform', value === 'none' ? undefined : value)}
>
  <SelectItem value="none">No Transform</SelectItem>
  <SelectItem value="uppercase">Uppercase</SelectItem>
  <SelectItem value="lowercase">Lowercase</SelectItem>
  <SelectItem value="capitalize">Capitalize</SelectItem>
</Select>
```

3. **Update Graph Structure** (`schema-graph.ts`):
```typescript
export interface SchemaNode {
  // Existing properties...
  transform?: string;
}
```

4. Done! The property will be:
- Saved to the graph
- Compiled to JSON Schema
- Applied to the form

## Testing Strategy

### Unit Tests
- Test each field configuration component independently
- Verify property updates
- Check UI interactions

### Integration Tests
- Test the full configuration flow
- Verify schema compilation
- Check form rendering with configured properties

### E2E Tests
- Test user workflows
- Verify property persistence
- Check form validation behavior

## Performance Considerations

### 1. Lazy Loading
Field configuration components are only rendered when needed:
```typescript
const renderTypeSpecificConfig = () => {
  switch (nodeConfig.type) {
    case "string":
      return <StringFieldConfig .../>;
    // Only the active field type is rendered
  }
};
```

### 2. Memoization
Configuration components can be memoized if needed:
```typescript
export const StringFieldConfig = React.memo(({ config, onChange, onUiChange }) => {
  // Component logic
});
```

### 3. State Management
- Local state for UI interactions
- Debounced updates to global store
- Batch updates when possible

## Migration Guide

### From Old Implementation
The refactoring maintains backward compatibility:

1. **No API Changes**: The `FieldConfigPanel` interface remains the same
2. **Same State Management**: Zustand stores work as before
3. **Existing Data**: All existing schemas work without modification

### Breaking Changes
None. This is a non-breaking refactor that enhances internal architecture.

## Future Enhancements

### Planned Features
1. **Advanced Validation**:
   - JSON Schema $ref validation
   - Custom format definitions
   - Cross-field validation

2. **UI Enhancements**:
   - Property search/filter
   - Property groups/categories
   - Help tooltips for each property

3. **Performance**:
   - Virtual scrolling for large enums
   - Progressive loading
   - Background compilation

4. **Developer Experience**:
   - Property documentation in UI
   - Property examples
   - Validation error preview

## Best Practices

### 1. Property Naming
- Use JSON Schema standard names
- Follow camelCase convention
- Be descriptive and clear

### 2. Validation
- Validate at the component level
- Provide immediate feedback
- Show clear error messages

### 3. UX
- Group related properties
- Use appropriate input types
- Provide sensible defaults

### 4. Code Organization
- One component per field type
- Reusable sub-components
- Consistent file structure

## Conclusion

The new field configuration architecture provides:
- ✅ Comprehensive property support
- ✅ Type safety
- ✅ Modularity and maintainability
- ✅ JSON Schema compliance
- ✅ RJSF 6.0 compatibility
- ✅ Backward compatibility
- ✅ Scalability for future features

All existing functionality has been preserved while significantly improving the codebase architecture.


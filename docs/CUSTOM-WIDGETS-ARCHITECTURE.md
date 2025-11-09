# Custom Widgets Architecture & Implementation Plan

## Overview

This document outlines the architecture for supporting custom widgets in the RJSF Builder, enabling users to create, manage, and use custom widgets like `YesNoWidget`, `AddPhotoToGallery`, and `FileWidget`.

## Current State Analysis

### ✅ What We Have
- Basic widget registry system (`widget-registry.ts`)
- Widget selector UI component
- UI schema generation with widget support
- Basic predefined widgets (text, textarea, select, etc.)

### ❌ What's Missing
1. **Custom Widget Management UI**: No way to add/edit/delete custom widgets
2. **Widget Configuration**: No UI for configuring widget-specific options
3. **Widget Import/Export**: No way to import widgets from external sources
4. **Widget Preview**: Custom widgets don't render in preview (RJSF needs widget registration)
5. **Enum Support**: Limited support for enum definitions with `enumNames`
6. **File Widget**: Missing `FileWidget` support
7. **Widget Persistence**: Custom widgets not persisted across sessions

## Architecture Design

### 1. Widget Registry Enhancement

**File: `src/lib/widgets/widget-registry.ts`**

```typescript
export interface CustomWidget {
  id: string;
  name: string;  // Component name (e.g., "YesNoWidget")
  displayName: string;
  description?: string;
  compatibleTypes: JSONSchemaType[];
  defaultConfig: Record<string, unknown>;
  icon?: string;
  category: 'standard' | 'custom' | 'specialized';
  
  // NEW: Enhanced properties
  componentPath?: string;  // Path to widget component (for dynamic imports)
  widgetOptions?: Record<string, unknown>;  // Widget-specific configuration schema
  validationRules?: Array<{
    property: string;
    rule: string;
    message: string;
  }>;
  dependencies?: string[];  // External dependencies (e.g., libraries)
  version?: string;
  author?: string;
}

export interface WidgetRegistry {
  // Existing methods...
  
  // NEW: Custom widget management
  addCustomWidget(widget: CustomWidget): void;
  removeCustomWidget(widgetId: string): void;
  updateCustomWidget(widgetId: string, updates: Partial<CustomWidget>): void;
  
  // NEW: Widget persistence
  exportWidgets(): CustomWidget[];
  importWidgets(widgets: CustomWidget[]): void;
  
  // NEW: Widget validation
  validateWidget(widget: CustomWidget): { valid: boolean; errors: string[] };
}
```

### 2. Widget Store (Zustand)

**File: `src/lib/store/widget-store.ts`** (NEW)

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CustomWidget, getWidgetRegistry } from '@/lib/widgets/widget-registry';

interface WidgetStore {
  customWidgets: Map<string, CustomWidget>;
  
  // Actions
  addWidget: (widget: CustomWidget) => void;
  removeWidget: (widgetId: string) => void;
  updateWidget: (widgetId: string, updates: Partial<CustomWidget>) => void;
  getWidget: (widgetId: string) => CustomWidget | null;
  getAllWidgets: () => CustomWidget[];
  
  // Import/Export
  exportWidgets: () => CustomWidget[];
  importWidgets: (widgets: CustomWidget[]) => void;
  
  // Sync with registry
  syncWithRegistry: () => void;
}

export const useWidgetStore = create<WidgetStore>()(
  persist(
    (set, get) => ({
      customWidgets: new Map(),
      
      addWidget: (widget) => {
        const registry = getWidgetRegistry();
        registry.addCustomWidget(widget);
        set((state) => {
          const newMap = new Map(state.customWidgets);
          newMap.set(widget.id, widget);
          return { customWidgets: newMap };
        });
      },
      
      // ... other methods
    }),
    {
      name: 'widget-storage',
      // Custom serialization for Map
      serialize: (state) => JSON.stringify({
        customWidgets: Array.from(state.customWidgets.entries()),
      }),
      deserialize: (str) => {
        const parsed = JSON.parse(str);
        return {
          customWidgets: new Map(parsed.customWidgets || []),
        };
      },
    }
  )
);
```

### 3. Widget Management UI

**File: `src/components/widgets/widget-manager.tsx`** (NEW)

Features:
- List all custom widgets
- Add new widget (form with validation)
- Edit existing widget
- Delete widget
- Import/Export widgets (JSON)
- Widget preview/configuration

**File: `src/components/widgets/widget-editor-dialog.tsx`** (NEW)

Dialog for creating/editing widgets:
- Widget name, display name, description
- Compatible field types (multi-select)
- Default configuration (JSON editor)
- Widget options schema (for validation)
- Component path (for dynamic imports)

### 4. Enhanced Widget Selector

**File: `src/components/form-builder/widget-selector.tsx`** (ENHANCE)

Additions:
- Show widget preview/icon
- Widget configuration panel (for widget-specific options)
- Search/filter widgets
- Group by category with better visual hierarchy

### 5. Widget Configuration Panel

**File: `src/components/form-builder/widget-config-panel.tsx`** (NEW)

When a custom widget is selected, show:
- Widget-specific options editor
- Preview of widget configuration
- Validation rules editor
- Help/documentation link

### 6. RJSF Widget Registration

**File: `src/lib/widgets/rjsf-widget-registry.ts`** (NEW)

```typescript
import { widgets } from '@rjsf/core';
import { CustomWidget } from './widget-registry';

// Map custom widget IDs to RJSF widget components
const customWidgetComponents = new Map<string, React.ComponentType>();

export function registerRJSFWidget(
  widgetId: string,
  component: React.ComponentType
): void {
  customWidgetComponents.set(widgetId, component);
}

export function getRJSFWidgets(): Record<string, React.ComponentType> {
  const rjsfWidgets = { ...widgets };
  
  // Merge custom widgets
  customWidgetComponents.forEach((component, widgetId) => {
    rjsfWidgets[widgetId] = component;
  });
  
  return rjsfWidgets;
}
```

**File: `src/components/form-builder/preview-panel.tsx`** (UPDATE)

```typescript
import { getRJSFWidgets } from '@/lib/widgets/rjsf-widget-registry';

// In Form component:
<Form
  schema={schema}
  uiSchema={uiSchema}
  widgets={getRJSFWidgets()}  // Include custom widgets
  // ... other props
/>
```

### 7. Enum Definitions Support

**File: `src/lib/schema/enum-definitions.ts`** (NEW)

```typescript
export interface EnumDefinition {
  id: string;
  name: string;
  values: Array<{
    value: string;
    label: string;  // Arabic/English label
  }>;
  defaultWidget?: string;  // Auto-assign widget (e.g., YesNoWidget)
}

// Store enum definitions similar to widget store
export const useEnumDefinitionsStore = create(...);
```

**File: `src/components/enums/enum-definition-manager.tsx`** (NEW)

UI for managing enum definitions:
- Create enum definitions (like `yes_no`, `working_or_not`)
- Edit enum values and labels
- Assign default widgets
- Import/Export enum definitions

### 8. UI Schema Generator Enhancement

**File: `src/lib/ui-schema/ui-schema-generator.ts`** (UPDATE)

Enhancements:
- Support for custom widgets in UI schema generation
- Auto-assign widgets based on enum definitions
- Preserve widget-specific options
- Handle `enumNames` for enum fields

## Implementation Phases

### Phase 1: Core Infrastructure (Week 1)
1. ✅ Enhance `WidgetRegistry` with custom widget management
2. ✅ Create `WidgetStore` with persistence
3. ✅ Add `FileWidget` to predefined widgets
4. ✅ Update UI schema generator to support custom widgets

### Phase 2: Widget Management UI (Week 2)
1. ✅ Create `WidgetManager` component
2. ✅ Create `WidgetEditorDialog` component
3. ✅ Add widget import/export functionality
4. ✅ Add widget validation

### Phase 3: Widget Configuration (Week 3)
1. ✅ Create `WidgetConfigPanel` component
2. ✅ Enhance `WidgetSelector` with preview
3. ✅ Add widget-specific options editor
4. ✅ Add widget search/filter

### Phase 4: RJSF Integration (Week 4)
1. ✅ Create RJSF widget registry
2. ✅ Register custom widgets with RJSF
3. ✅ Update preview panel to use custom widgets
4. ✅ Test widget rendering

### Phase 5: Enum Definitions (Week 5)
1. ✅ Create enum definitions store
2. ✅ Create enum definition manager UI
3. ✅ Integrate enum definitions with schema
4. ✅ Auto-assign widgets based on enum types

### Phase 6: Polish & Testing (Week 6)
1. ✅ Add widget documentation
2. ✅ Add widget examples
3. ✅ Performance optimization
4. ✅ Comprehensive testing

## Widget Examples

### YesNoWidget
```typescript
{
  id: 'yesno',
  name: 'YesNoWidget',
  displayName: 'Yes/No Select',
  compatibleTypes: ['enum'],
  defaultConfig: {
    enumOptions: [
      { value: 'yes', label: 'نعم' },
      { value: 'no', label: 'لا' },
    ],
  },
  category: 'specialized',
}
```

### FileWidget
```typescript
{
  id: 'file',
  name: 'FileWidget',
  displayName: 'File Upload',
  compatibleTypes: ['string'],
  defaultConfig: {
    accept: '*/*',
    multiple: false,
  },
  widgetOptions: {
    accept: { type: 'string', default: '*/*' },
    multiple: { type: 'boolean', default: false },
    maxSize: { type: 'number', default: 5242880 }, // 5MB
  },
  category: 'specialized',
}
```

### AddPhotoToGallery
```typescript
{
  id: 'photo-gallery',
  name: 'AddPhotoToGallery',
  displayName: 'Photo Gallery',
  compatibleTypes: ['array'],
  defaultConfig: {
    addable: true,
    orderable: true,
    removable: true,
    accept: 'image/*',
  },
  category: 'specialized',
}
```

## File Structure

```
src/
├── lib/
│   ├── widgets/
│   │   ├── widget-registry.ts          (ENHANCE)
│   │   ├── widget-store.ts             (NEW)
│   │   ├── rjsf-widget-registry.ts     (NEW)
│   │   └── predefined-widgets.ts      (NEW - extract predefined widgets)
│   ├── schema/
│   │   └── enum-definitions.ts        (NEW)
│   └── store/
│       └── enum-definitions-store.ts   (NEW)
├── components/
│   ├── widgets/
│   │   ├── widget-manager.tsx          (NEW)
│   │   ├── widget-editor-dialog.tsx   (NEW)
│   │   └── widget-config-panel.tsx   (NEW)
│   ├── enums/
│   │   └── enum-definition-manager.tsx (NEW)
│   └── form-builder/
│       ├── widget-selector.tsx         (ENHANCE)
│       └── preview-panel.tsx           (UPDATE)
```

## Best Practices

1. **Widget Validation**: Always validate widgets before registration
2. **Type Safety**: Use TypeScript interfaces for widget definitions
3. **Persistence**: Store custom widgets in localStorage with versioning
4. **Error Handling**: Gracefully handle missing or invalid widgets
5. **Performance**: Lazy load widget components when needed
6. **Documentation**: Provide clear documentation for each widget
7. **Testing**: Test widgets in isolation and in forms
8. **Migration**: Support widget schema versioning for updates

## Next Steps

1. Review and approve this architecture
2. Start with Phase 1 (Core Infrastructure)
3. Iterate based on feedback
4. Add more widgets as needed


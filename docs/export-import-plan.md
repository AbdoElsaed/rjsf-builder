# Export & Import Features Implementation Plan

## Overview
Implement comprehensive export and import functionality with user-friendly UI, supporting multiple formats and use cases.

---

## 🎯 Goals

1. **Export Features:**
   - Export JSON Schema only
   - Export UI Schema only
   - Export both schemas together
   - Export as downloadable files (.json)
   - Copy to clipboard
   - Export with form data (optional)

2. **Import Features:**
   - Import JSON Schema from file
   - Import from clipboard/paste
   - Import UI Schema alongside JSON Schema
   - Validate imported schema
   - Handle errors gracefully
   - Preserve existing work (merge vs replace)

3. **User Experience:**
   - Easy-to-find buttons in header
   - Clear visual feedback
   - Error handling and validation
   - Undo/redo support (future)
   - Import preview before applying

---

## 📋 Current State

### ✅ What Exists:
- **Backend Export**: `src/lib/export/schema-exporter.ts`
  - `exportSchemaAndUiSchema()` - Exports both
  - `exportSchemaOnly()` - JSON Schema only
  - `exportUiSchemaOnly()` - UI Schema only
  - `exportSchemaAsJson()` - Formatted JSON string

- **Backend Import**: `src/lib/graph/schema-importer.ts`
  - `fromJsonSchema()` - Imports JSON Schema into graph
  - Handles definitions, $ref, allOf/anyOf/oneOf
  - Supports nested structures

### ❌ What's Missing:
- **UI Components**: No export/import buttons
- **File Operations**: No file download/upload
- **Clipboard Operations**: No copy/paste
- **Import Preview**: No preview before applying
- **Error Handling UI**: No user-friendly error messages
- **Merge vs Replace**: No option to merge or replace

---

## 🏗️ Architecture

### Export Flow:
```
User clicks Export → Choose format → Generate data → Download/Copy
```

### Import Flow:
```
User clicks Import → Choose source (file/paste) → Parse & validate → Preview → Apply (merge/replace)
```

---

## 📁 File Structure

```
src/
├── components/
│   ├── export-import/
│   │   ├── export-dialog.tsx          # Export options dialog
│   │   ├── import-dialog.tsx          # Import options dialog
│   │   ├── import-preview-dialog.tsx # Preview before importing
│   │   └── export-import-menu.tsx     # Dropdown menu component
│   └── header.tsx                      # Add export/import buttons
├── lib/
│   ├── export/
│   │   ├── schema-exporter.ts         # ✅ Already exists
│   │   ├── file-exporter.ts           # File download utilities
│   │   └── clipboard-exporter.ts      # Clipboard utilities
│   └── import/
│       ├── schema-importer.ts         # ✅ Already exists (in graph/)
│       ├── file-importer.ts           # File upload utilities
│       ├── clipboard-importer.ts      # Clipboard paste utilities
│       └── import-validator.ts        # Validate imported schemas
```

---

## 🎨 UI Design

### Header Buttons:
```
[Logo] RJSF Builder                    [🌙] [📥 Import] [📤 Export ▼]
```

**Export Button (Dropdown):**
- Export JSON Schema
- Export UI Schema
- Export Both Schemas
- Copy JSON Schema to Clipboard
- Copy UI Schema to Clipboard
- Copy Both to Clipboard

**Import Button:**
- Import from File
- Import from Clipboard
- Import Both Schemas

### Export Dialog:
```
┌─────────────────────────────────────┐
│ Export Schema                       │
├─────────────────────────────────────┤
│ What would you like to export?      │
│                                     │
│ ○ JSON Schema only                  │
│ ○ UI Schema only                    │
│ ● Both schemas                      │
│                                     │
│ Include form data?                  │
│ ☐ Include current form data        │
│                                     │
│ Export format:                      │
│ ● Single file (combined)            │
│ ○ Separate files                   │
│                                     │
│ [Cancel] [Export]                   │
└─────────────────────────────────────┘
```

### Import Dialog:
```
┌─────────────────────────────────────┐
│ Import Schema                       │
├─────────────────────────────────────┤
│ Import from:                        │
│ ● File                              │
│ ○ Clipboard                         │
│                                     │
│ [Choose File] schema.json           │
│                                     │
│ Import mode:                        │
│ ● Replace current schema            │
│ ○ Merge with current schema        │
│                                     │
│ [Cancel] [Preview]                  │
└─────────────────────────────────────┘
```

### Import Preview Dialog:
```
┌─────────────────────────────────────┐
│ Import Preview                      │
├─────────────────────────────────────┤
│ Schema Summary:                     │
│ • 5 fields                          │
│ • 2 definitions                     │
│ • 1 conditional block               │
│                                     │
│ ⚠️ Warning: This will replace your │
│    current schema.                  │
│                                     │
│ [Cancel] [Import]                   │
└─────────────────────────────────────┘
```

---

## 🔧 Implementation Details

### 1. Export Features

#### File Exporter (`file-exporter.ts`):
```typescript
export function downloadJsonFile(
  data: object,
  filename: string,
  pretty: boolean = true
): void {
  const json = JSON.stringify(data, null, pretty ? 2 : 0);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
```

#### Clipboard Exporter (`clipboard-exporter.ts`):
```typescript
export async function copyToClipboard(
  data: object,
  pretty: boolean = true
): Promise<void> {
  const json = JSON.stringify(data, null, pretty ? 2 : 0);
  await navigator.clipboard.writeText(json);
}
```

#### Export Dialog Component:
- Radio buttons for export type
- Checkbox for including form data
- Format selection (single/separate files)
- Generate filename with timestamp
- Show success toast after export

### 2. Import Features

#### File Importer (`file-importer.ts`):
```typescript
export function readJsonFile(file: File): Promise<object> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        resolve(json);
      } catch (error) {
        reject(new Error('Invalid JSON file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
```

#### Clipboard Importer (`clipboard-importer.ts`):
```typescript
export async function pasteFromClipboard(): Promise<object> {
  const text = await navigator.clipboard.readText();
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error('Invalid JSON in clipboard');
  }
}
```

#### Import Validator (`import-validator.ts`):
```typescript
export function validateImportedSchema(schema: unknown): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // Check if it's an object
  if (typeof schema !== 'object' || schema === null) {
    errors.push('Schema must be an object');
    return { valid: false, errors };
  }
  
  // Check for required JSON Schema properties
  const obj = schema as Record<string, unknown>;
  if (!obj.type && !obj.properties && !obj.definitions) {
    errors.push('Schema must have type, properties, or definitions');
  }
  
  // Validate structure
  // ... more validation
  
  return { valid: errors.length === 0, errors };
}
```

#### Import Preview:
- Show summary of imported schema
- Count fields, definitions, conditionals
- Warn about data loss if replacing
- Show differences if merging

### 3. Store Integration

#### Export Actions:
```typescript
// In schema-graph-v2.ts store
exportSchema: (format: 'json' | 'ui' | 'both') => {
  const { graph } = get();
  return exportSchemaAndUiSchema(graph);
}
```

#### Import Actions:
```typescript
// In schema-graph-v2.ts store
importSchema: (schema: RJSFSchema, mode: 'replace' | 'merge') => {
  const state = get();
  const newGraph = fromJsonSchema(schema);
  
  if (mode === 'replace') {
    set({ graph: newGraph });
  } else {
    // Merge logic
    const mergedGraph = mergeGraphs(state.graph, newGraph);
    set({ graph: mergedGraph });
  }
  
  scheduleUiSchemaRegeneration(newGraph);
}
```

---

## 🎯 Export Formats

### Format 1: Single Combined File
```json
{
  "schema": { ... },
  "uiSchema": { ... },
  "formData": { ... },  // optional
  "metadata": {
    "exportedAt": "2024-01-15T10:30:00Z",
    "version": "1.0.0"
  }
}
```

### Format 2: Separate Files
- `schema.json` - JSON Schema only
- `ui-schema.json` - UI Schema only
- `form-data.json` - Form data (optional)

### Format 3: RJSF Ready Format
```json
{
  "schema": { ... },
  "uiSchema": { ... }
}
```
(No metadata, ready to use in RJSF)

---

## 🔄 Import Modes

### Replace Mode:
- Clear current graph
- Import new schema
- Reset form data
- **Warning**: This will lose all current work

### Merge Mode:
- Keep existing definitions
- Merge root properties
- Resolve conflicts (newer wins or user choice)
- Preserve form data where possible
- **Future**: Show conflict resolution dialog

---

## ✅ Implementation Steps

### Phase 1: Basic Export (2-3 hours)
1. ✅ Create `file-exporter.ts` utilities
2. ✅ Create `clipboard-exporter.ts` utilities
3. ✅ Create `ExportDialog` component
4. ✅ Add export button to header
5. ✅ Wire up export functionality
6. ✅ Test file download
7. ✅ Test clipboard copy

### Phase 2: Basic Import (3-4 hours)
1. ✅ Create `file-importer.ts` utilities
2. ✅ Create `clipboard-importer.ts` utilities
3. ✅ Create `import-validator.ts`
4. ✅ Create `ImportDialog` component
5. ✅ Add import button to header
6. ✅ Wire up import functionality (replace mode)
7. ✅ Test file upload
8. ✅ Test clipboard paste
9. ✅ Error handling

### Phase 3: Import Preview (2-3 hours)
1. ✅ Create `ImportPreviewDialog` component
2. ✅ Add schema summary logic
3. ✅ Show warnings for replace mode
4. ✅ Add preview before import
5. ✅ Test preview functionality

### Phase 4: Advanced Features (3-4 hours)
1. ✅ Implement merge mode
2. ✅ Add conflict resolution (basic)
3. ✅ Export with form data option
4. ✅ Separate file export option
5. ✅ Better error messages
6. ✅ Success notifications

### Phase 5: Polish & Testing (2-3 hours)
1. ✅ Test all export formats
2. ✅ Test all import modes
3. ✅ Test error scenarios
4. ✅ UI/UX improvements
5. ✅ Accessibility checks
6. ✅ Documentation

**Total Estimated Time: ~12-16 hours**

---

## 🎨 UI Components

### Export Button (Header):
```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="outline" size="sm">
      <Download className="h-4 w-4 mr-2" />
      Export
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem onClick={handleExportJson}>
      Export JSON Schema
    </DropdownMenuItem>
    <DropdownMenuItem onClick={handleExportUi}>
      Export UI Schema
    </DropdownMenuItem>
    <DropdownMenuItem onClick={handleExportBoth}>
      Export Both
    </DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem onClick={handleCopyJson}>
      Copy JSON Schema
    </DropdownMenuItem>
    <DropdownMenuItem onClick={handleCopyUi}>
      Copy UI Schema
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

### Import Button (Header):
```tsx
<Button 
  variant="outline" 
  size="sm"
  onClick={handleImportClick}
>
  <Upload className="h-4 w-4 mr-2" />
  Import
</Button>
```

---

## 🚨 Error Handling

### Export Errors:
- File download blocked → Show toast with instructions
- Clipboard access denied → Show toast with fallback
- Large schema → Warn about performance

### Import Errors:
- Invalid JSON → Show error message with line number
- Invalid schema structure → List validation errors
- Missing definitions → Warn and offer to create placeholders
- Version mismatch → Warn about compatibility

---

## 📝 File Naming Conventions

### Export Files:
- `schema-export-YYYY-MM-DD-HHmmss.json` - Combined export
- `schema-YYYY-MM-DD-HHmmss.json` - JSON Schema only
- `ui-schema-YYYY-MM-DD-HHmmss.json` - UI Schema only

### Import Files:
- Accept any `.json` file
- Validate structure, not filename

---

## 🔮 Future Enhancements

1. **Undo/Redo**: Track import/export history
2. **Templates**: Save/load schema templates
3. **Version Control**: Track schema versions
4. **Cloud Sync**: Export to cloud storage
5. **Schema Diff**: Show differences before merge
6. **Batch Import**: Import multiple files
7. **Export Presets**: Save export configurations
8. **Schema Validation**: Validate before export
9. **Compression**: Export as compressed files
10. **Import History**: Remember recent imports

---

## ❓ Questions to Consider

1. **Default Export Format**: Combined or separate? (Recommend: Combined)
2. **Default Import Mode**: Replace or merge? (Recommend: Replace with warning)
3. **Form Data Export**: Include by default? (Recommend: Optional checkbox)
4. **File Size Limits**: Any limits? (Recommend: Warn at 10MB)
5. **Auto-save**: Auto-save before import? (Recommend: Yes, as backup)

---

## ✅ Recommended Approach

1. **Start Simple**: Basic export/import first
2. **Add Safety**: Strong validation and warnings
3. **Polish UX**: Clear feedback and error messages
4. **Test Thoroughly**: Test all edge cases
5. **Iterate**: Add advanced features based on feedback

---

## 🎯 Success Criteria

- ✅ Users can export schemas in multiple formats
- ✅ Users can import schemas from files or clipboard
- ✅ Import validates schemas before applying
- ✅ Clear error messages for invalid imports
- ✅ Preview before destructive operations
- ✅ All export/import operations work reliably
- ✅ UI is intuitive and discoverable


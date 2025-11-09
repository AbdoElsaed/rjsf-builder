# Localization (i18n) Implementation Plan

## Overview
Add support for Arabic (ar) and English (en) languages with full RTL (Right-to-Left) support for Arabic, targeting users in Saudi Arabia.

---

## 🎯 Goals

1. **Full UI Translation**: All user-facing text in both languages
2. **RTL Support**: Proper right-to-left layout for Arabic
3. **Language Switcher**: Easy toggle between languages
4. **Persistent Preference**: Remember user's language choice
5. **RJSF Integration**: Translate RJSF form labels and validation messages
6. **Type Safety**: Type-safe translation keys

---

## 📋 What Needs Translation

### 1. **UI Components**
- Button labels (Save, Cancel, Delete, Edit, etc.)
- Field type labels (Text, Number, Yes/No, Object, List, If-Then-Else)
- Widget names (Text Input, Textarea, Select, etc.)
- Tooltips and help text
- Dialog titles and descriptions
- Empty states and placeholder text

### 2. **Form Builder Specific**
- Field palette labels
- Field config panel labels
- Canvas messages ("Drop fields here", "Expand All", "Collapse All")
- Definitions section ("Definitions", "Edit reusable components")
- Save as Component dialog
- Create Definition dialog

### 3. **Toast Notifications**
- Success messages ("Schema updated successfully", "Definition created")
- Error messages ("Invalid JSON schema", "Failed to create definition")
- Info messages

### 4. **RJSF Integration**
- Form labels (Submit, Add Item, Remove, etc.)
- Validation error messages (via ajv-i18n)
- Field descriptions and help text

### 5. **Validation Messages**
- Schema validation errors
- Field validation errors
- Custom validation messages

---

## 🏗️ Architecture Options

### Option 1: react-i18next (Recommended) ⭐

**Pros:**
- Industry standard, well-maintained
- Rich features (pluralization, interpolation, namespaces)
- Great TypeScript support
- Lazy loading support
- Large community and ecosystem
- Works well with RJSF

**Cons:**
- Slightly larger bundle size (~15KB gzipped)
- Learning curve for advanced features

**Implementation:**
```typescript
// i18n.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enTranslations from './locales/en.json';
import arTranslations from './locales/ar.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enTranslations },
      ar: { translation: arTranslations },
    },
    lng: localStorage.getItem('language') || 'en',
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });
```

### Option 2: Custom Context-Based Solution

**Pros:**
- Zero dependencies
- Full control
- Smaller bundle size
- Simple for basic needs

**Cons:**
- More code to maintain
- Missing advanced features (pluralization, etc.)
- Need to implement everything ourselves

**Implementation:**
```typescript
// i18n-context.tsx
const I18nContext = createContext<{
  t: (key: string) => string;
  language: 'en' | 'ar';
  setLanguage: (lang: 'en' | 'ar') => void;
}>({...});
```

### Option 3: react-intl (Format.js)

**Pros:**
- Very feature-rich
- ICU message format
- Great for complex formatting

**Cons:**
- Heavier than react-i18next
- More complex setup
- Overkill for simple use case

---

## 🎨 RTL Support Strategy

### 1. **CSS Direction**
```css
[dir="rtl"] {
  direction: rtl;
  text-align: right;
}
```

### 2. **Tailwind RTL Support**
- Use Tailwind's built-in RTL utilities: `rtl:`, `ltr:`
- Or use `tailwindcss-rtl` plugin for better RTL support

### 3. **Layout Adjustments**
- Icons: Flip horizontally for RTL (use `transform: scaleX(-1)`)
- Flexbox: Use `flex-row-reverse` for RTL
- Margins/Padding: Use logical properties (`margin-inline-start` instead of `margin-left`)

### 4. **Component Adjustments**
- Buttons: Icon on opposite side
- Dropdowns: Open to the left in RTL
- Tooltips: Position on opposite side
- Drag handles: On opposite side

### 5. **Monaco Editor RTL**
- Monaco supports RTL natively
- Set `editor.setOption('bidi', 'auto')` for mixed content

---

## 📁 File Structure

```
src/
├── i18n/
│   ├── index.ts              # i18n configuration
│   ├── locales/
│   │   ├── en.json           # English translations
│   │   └── ar.json           # Arabic translations
│   └── types.ts              # TypeScript types for translation keys
├── components/
│   ├── language-switcher.tsx # Language toggle component
│   └── ...
└── lib/
    └── rjsf-i18n.ts          # RJSF translation integration
```

---

## 🔧 Implementation Steps

### Phase 1: Setup & Core Infrastructure
1. ✅ Install `react-i18next` and `i18next`
2. ✅ Create i18n configuration
3. ✅ Create translation files (en.json, ar.json)
4. ✅ Create I18nProvider wrapper
5. ✅ Add language switcher to header
6. ✅ Persist language preference to localStorage

### Phase 2: UI Translation
1. ✅ Translate all button labels
2. ✅ Translate field type labels
3. ✅ Translate widget names
4. ✅ Translate tooltips
5. ✅ Translate dialog content
6. ✅ Translate toast messages
7. ✅ Translate empty states

### Phase 3: RTL Support
1. ✅ Add `dir` attribute to root element
2. ✅ Update Tailwind config for RTL
3. ✅ Add RTL-specific CSS utilities
4. ✅ Flip icons for RTL
5. ✅ Adjust component layouts
6. ✅ Test all components in RTL mode

### Phase 4: RJSF Integration
1. ✅ Install `ajv-i18n` for Arabic validation messages
2. ✅ Configure RJSF validator with Arabic locale
3. ✅ Translate RJSF form labels (Submit, Add Item, etc.)
4. ✅ Test form validation messages in Arabic

### Phase 5: Polish & Testing
1. ✅ Test all features in both languages
2. ✅ Fix RTL layout issues
3. ✅ Ensure proper font rendering for Arabic
4. ✅ Test language switching
5. ✅ Performance testing

---

## 📝 Translation Keys Structure

```json
{
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit",
    "close": "Close"
  },
  "fieldTypes": {
    "text": "Text",
    "number": "Number",
    "boolean": "Yes/No",
    "object": "Object",
    "array": "List",
    "if_block": "If-Then-Else"
  },
  "widgets": {
    "text": "Text Input",
    "textarea": "Textarea",
    "select": "Select Dropdown",
    "checkbox": "Checkbox",
    "updown": "Number Input"
  },
  "canvas": {
    "expandAll": "Expand All",
    "collapseAll": "Collapse All",
    "dropFieldsHere": "Drop fields here",
    "definitions": "Definitions",
    "editReusableComponents": "Edit reusable components"
  },
  "dialogs": {
    "saveAsDefinition": {
      "title": "Save as Reusable Definition",
      "description": "Create a reusable definition that can be used anywhere in your form",
      "nameLabel": "Definition Name",
      "replaceWithReference": "Replace this field with a reference"
    }
  },
  "toast": {
    "schemaUpdated": "Schema updated successfully",
    "definitionCreated": "Definition \"{{name}}\" created",
    "definitionSaved": "Definition \"{{name}}\" saved successfully"
  },
  "validation": {
    "required": "This field is required",
    "invalidFormat": "Invalid format"
  }
}
```

---

## 🎯 Recommended Approach

**I recommend Option 1 (react-i18next)** because:
1. ✅ Industry standard with great TypeScript support
2. ✅ Easy RJSF integration
3. ✅ Rich features (pluralization, interpolation)
4. ✅ Good performance with lazy loading
5. ✅ Well-maintained and documented
6. ✅ Works seamlessly with React 19

**For RTL:**
- Use Tailwind's built-in RTL utilities
- Add `dir` attribute dynamically based on language
- Create a custom hook `useRTL()` for easy access
- Use logical CSS properties where possible

---

## 🚀 Quick Start Implementation

1. **Install dependencies:**
   ```bash
   pnpm add i18next react-i18next
   pnpm add -D @types/i18next
   ```

2. **Create translation files:**
   - `src/i18n/locales/en.json`
   - `src/i18n/locales/ar.json`

3. **Setup i18n:**
   - `src/i18n/index.ts` - Configuration
   - Wrap app with I18nProvider

4. **Add language switcher:**
   - Component in header
   - Persist to localStorage

5. **Translate components:**
   - Replace hardcoded strings with `t()` calls
   - Add RTL support

---

## 💡 Additional Considerations

1. **Font Loading**: Ensure Arabic fonts are loaded (system fonts usually fine)
2. **Number Formatting**: Arabic uses different number system (optional)
3. **Date Formatting**: Use locale-aware date formatting
4. **Currency**: If needed, format for SAR (Saudi Riyal)
5. **Performance**: Lazy load translation files if bundle size is concern
6. **Testing**: Test with long Arabic text (RTL can break layouts)

---

## ❓ Questions to Consider

1. **Default Language**: Should default be Arabic or English? (Recommend: Detect from browser, fallback to English)
2. **Number System**: Use Arabic-Indic numerals (٠١٢٣) or Western (0123)? (Recommend: Western for technical apps)
3. **Date Format**: Use Hijri calendar or Gregorian? (Recommend: Gregorian for technical apps)
4. **Font**: Use system fonts or load custom Arabic font? (Recommend: System fonts first)
5. **RTL Icons**: Flip all icons or only specific ones? (Recommend: Flip only directional icons)

---

## 📊 Estimated Effort

- **Setup & Infrastructure**: 2-3 hours
- **UI Translation**: 4-6 hours
- **RTL Support**: 3-4 hours
- **RJSF Integration**: 2-3 hours
- **Testing & Polish**: 2-3 hours

**Total: ~13-19 hours**

---

## 🎨 UI/UX Considerations

1. **Language Switcher Placement**: Header (next to theme toggle)
2. **Icon**: Globe or Language icon
3. **Visual Feedback**: Show current language clearly
4. **Smooth Transition**: Animate language change if possible
5. **RTL Animation**: Ensure animations work in RTL

---

## ✅ Next Steps

1. Review and approve this plan
2. Choose library (recommend react-i18next)
3. Start with Phase 1 (Setup)
4. Iterate through phases
5. Test thoroughly with native Arabic speakers


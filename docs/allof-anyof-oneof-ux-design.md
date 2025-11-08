# allOf/anyOf/oneOf UX Design - User-Friendly Approach

## Core Principle
**Hide technical concepts, expose user intent.** Users shouldn't need to know what "allOf" means - they should express their logic naturally.

---

## User Mental Models

### What Users Think:
1. **"Show these fields when X AND Y are both true"** → allOf
2. **"Show these fields when X OR Y is true"** → anyOf  
3. **"Show these fields when EITHER X OR Y is true (but not both)"** → oneOf

### What We Should NOT Show:
- ❌ "allOf Group"
- ❌ "anyOf Group"  
- ❌ "oneOf Group"
- ❌ Technical JSON Schema terminology

### What We SHOULD Show:
- ✅ "Conditional Logic" or "Show When"
- ✅ "All conditions must be true" (AND)
- ✅ "Any condition can be true" (OR)
- ✅ "Only one condition can be true" (XOR)

---

## Proposed UX Approach

### Option 1: Enhanced If-Then-Else Block (RECOMMENDED) ⭐

**Concept**: Extend the existing "If-Then-Else" block to support multiple conditions with logic selection.

#### User Flow:
1. User drags "If-Then-Else" from palette (same as now)
2. User sees a single condition by default
3. User can click "Add Another Condition" button
4. User selects logic mode:
   - **"All must be true"** (AND) → allOf
   - **"Any can be true"** (OR) → anyOf
   - **"Only one can be true"** (XOR) → oneOf
5. User configures each condition (field, operator, value)
6. User drops fields into Then/Else branches (same as now)

#### Visual Design:
```
┌─────────────────────────────────────────┐
│  Show When: [All must be true ▼]        │
│                                          │
│  Condition 1:                            │
│  [Field ▼] [Operator ▼] [Value]  [×]    │
│                                          │
│  Condition 2:                            │
│  [Field ▼] [Operator ▼] [Value]  [×]    │
│                                          │
│  [+ Add Another Condition]               │
│                                          │
│  ┌─────────────┐  ┌─────────────┐      │
│  │   Then      │  │   Else       │      │
│  │  (drop here)│  │  (drop here)│    │
│  └─────────────┘  └─────────────┘      │
└─────────────────────────────────────────┘
```

#### Benefits:
- ✅ Familiar - extends existing pattern
- ✅ Progressive disclosure - start simple, add complexity
- ✅ No new concepts to learn
- ✅ Single component to maintain
- ✅ Backward compatible with single conditions

#### Implementation:
- Keep `if_block` type for single conditions (backward compat)
- Use `allOf`/`anyOf`/`oneOf` types when multiple conditions + logic selected
- Auto-convert: Single condition → if_block, Multiple conditions → allOf/anyOf/oneOf

---

### Option 2: Separate "Advanced Conditions" Block

**Concept**: Add a new "Advanced Conditions" block type for multiple conditions.

#### User Flow:
1. User drags "Advanced Conditions" from palette
2. User selects logic mode first
3. User adds multiple conditions
4. User configures Then/Else branches

#### Visual Design:
```
┌─────────────────────────────────────────┐
│  Advanced Conditions                    │
│  Logic: [All must be true ▼]            │
│                                          │
│  Conditions:                             │
│  [List of conditions with add/remove]   │
│                                          │
│  Then/Else branches...                   │
└─────────────────────────────────────────┘
```

#### Benefits:
- ✅ Clear separation of simple vs complex
- ✅ Doesn't clutter simple If-Then-Else

#### Drawbacks:
- ❌ Two different components to learn
- ❌ Users might not know when to use which
- ❌ More code to maintain

---

### Option 3: Smart Auto-Detection

**Concept**: Automatically convert single If-Then-Else to allOf/anyOf/oneOf when user adds second condition.

#### User Flow:
1. User creates If-Then-Else (single condition)
2. User clicks "Add Another Condition"
3. System shows logic selector: "How should these conditions work together?"
4. User selects logic
5. System converts to appropriate type

#### Benefits:
- ✅ Seamless transition
- ✅ No separate component needed

#### Drawbacks:
- ❌ Magic behavior might confuse users
- ❌ Harder to understand what's happening

---

## Recommended Approach: Option 1 (Enhanced If-Then-Else)

### Detailed UX Flow

#### Step 1: Create Conditional Block
- User drags "If-Then-Else" from palette
- System creates block with:
  - One empty condition
  - Logic selector (default: "All must be true")
  - Empty Then/Else branches

#### Step 2: Configure Logic (if multiple conditions)
- Logic selector appears when 2+ conditions exist
- Options:
  - **"All must be true"** (AND) → allOf
    - Tooltip: "Show fields only when ALL conditions are met"
  - **"Any can be true"** (OR) → anyOf
    - Tooltip: "Show fields when ANY condition is met"
  - **"Only one can be true"** (XOR) → oneOf
    - Tooltip: "Show fields when EXACTLY ONE condition is met"

#### Step 3: Add Conditions
- Each condition has:
  - Field selector (dropdown of available fields)
  - Operator selector (equals, not equals, etc.)
  - Value input
  - Remove button (×)
- "Add Another Condition" button at bottom
- Visual indicator showing condition count: "2 conditions"

#### Step 4: Configure Branches
- Same as current: Drop fields into Then/Else
- Visual feedback shows which logic mode is active

---

## Visual Design Details

### Logic Selector Component
```tsx
<Select value={logicMode}>
  <SelectTrigger>
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="all">
      <div className="flex items-center gap-2">
        <span>All must be true</span>
        <span className="text-xs text-muted-foreground">(AND)</span>
      </div>
    </SelectItem>
    <SelectItem value="any">
      <div className="flex items-center gap-2">
        <span>Any can be true</span>
        <span className="text-xs text-muted-foreground">(OR)</span>
      </div>
    </SelectItem>
    <SelectItem value="one">
      <div className="flex items-center gap-2">
        <span>Only one can be true</span>
        <span className="text-xs text-muted-foreground">(XOR)</span>
      </div>
    </SelectItem>
  </SelectContent>
</Select>
```

### Condition List Component
```tsx
<div className="space-y-2">
  {conditions.map((condition, index) => (
    <div key={index} className="flex items-center gap-2 p-2 border rounded">
      <span className="text-xs text-muted-foreground">Condition {index + 1}</span>
      <FieldSelector value={condition.field} />
      <OperatorSelector value={condition.operator} />
      <ValueInput value={condition.value} />
      <Button variant="ghost" size="icon" onClick={() => removeCondition(index)}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  ))}
  <Button variant="outline" onClick={addCondition}>
    + Add Another Condition
  </Button>
</div>
```

### Visual Indicators
- **Badge showing logic mode**: "All must be true" badge
- **Condition count**: "3 conditions" indicator
- **Visual grouping**: Subtle background/border around condition list
- **Icons for logic modes**:
  - All: `&&` or checkmark icon
  - Any: `||` or circle icon
  - One: `⊕` or single-select icon

---

## Edge Cases & Considerations

### Single Condition
- **Behavior**: Hide logic selector (not needed)
- **Storage**: Use `if_block` type (backward compatible)
- **Export**: Export as single if/then/else (not allOf array)

### Multiple Conditions
- **Behavior**: Show logic selector
- **Storage**: Use `allOf`/`anyOf`/`oneOf` type based on selection
- **Export**: Export as allOf/anyOf/oneOf array

### Migration Path
- Existing single-condition blocks: Keep as `if_block`
- When user adds second condition: Convert to `allOf` (default)
- User can change logic mode anytime

### Validation
- Require at least 1 condition
- Require all conditions to be valid before enabling drop zones
- Show validation errors inline

### Performance
- Limit max conditions? (e.g., 10)
- Lazy render conditions if many exist
- Optimize re-renders when conditions change

---

## User Testing Scenarios

### Scenario 1: Simple Case
**User wants**: "Show email field when age > 18"
- Current: Works perfectly
- Enhanced: Still works, no change needed

### Scenario 2: Multiple AND Conditions
**User wants**: "Show loan fields when age > 18 AND hasJob = yes"
- Current: Can't do this
- Enhanced: Add second condition, select "All must be true"

### Scenario 3: Multiple OR Conditions
**User wants**: "Show discount when member = yes OR coupon = valid"
- Current: Can't do this
- Enhanced: Add second condition, select "Any can be true"

### Scenario 4: Complex Logic
**User wants**: "Show fields when (age > 18 AND hasLicense) OR (parentApproval = yes)"
- Current: Can't do this
- Enhanced: This is tricky - might need nested conditions (future enhancement)

---

## Implementation Plan

### Phase 1: Core Functionality
1. ✅ Add logic selector to IfBlock component
2. ✅ Add "Add Condition" button
3. ✅ Support multiple conditions in state
4. ✅ Convert to allOf/anyOf/oneOf when multiple conditions exist
5. ✅ Update compiler to handle conversion

### Phase 2: UI Polish
1. ✅ Better visual design for condition list
2. ✅ Logic mode badges/indicators
3. ✅ Tooltips and help text
4. ✅ Validation feedback

### Phase 3: Advanced Features
1. ⏳ Nested conditions (parentheses)
2. ⏳ Condition reordering
3. ⏳ Condition templates/presets
4. ⏳ Visual condition builder

---

## Alternative: Wizard/Step-by-Step Approach

For complex cases, consider a wizard:

### Step 1: Choose Logic
- "How should conditions work together?"
- Visual cards: "All", "Any", "One"

### Step 2: Add Conditions
- Add multiple conditions
- Preview: "Show when: field1 = X AND field2 = Y"

### Step 3: Configure Branches
- Then/Else branches

**Pros**: Very clear, guided experience
**Cons**: More clicks, might be overkill for simple cases

---

## Recommendation Summary

**Go with Option 1: Enhanced If-Then-Else Block**

**Why:**
1. ✅ Familiar pattern - users already know If-Then-Else
2. ✅ Progressive disclosure - complexity only when needed
3. ✅ Single component - easier to maintain
4. ✅ Backward compatible - existing blocks still work
5. ✅ Natural language - "All must be true" vs "allOf"

**Key Features:**
- Logic selector appears when 2+ conditions
- Clear labels: "All must be true" (not "allOf")
- Visual indicators for logic mode
- Easy to add/remove conditions
- Same Then/Else branch UX

**Future Enhancements:**
- Nested conditions (parentheses)
- Condition groups
- Visual condition builder
- Condition templates

---

## Questions to Consider

1. **Should we show technical terms anywhere?**
   - Recommendation: Only in tooltips/help text, not in main UI

2. **What's the max number of conditions?**
   - Recommendation: No hard limit, but warn if > 10

3. **Should conditions be reorderable?**
   - Recommendation: Yes, drag-and-drop reordering

4. **How to handle nested logic?**
   - Recommendation: Phase 2 feature - condition groups

5. **Should we auto-detect logic from usage?**
   - Recommendation: No, always require explicit selection


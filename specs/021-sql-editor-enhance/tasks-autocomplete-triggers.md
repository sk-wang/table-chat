# Tasks: Fix SQL Autocomplete Trigger Scenarios

**Input**: Bug report - "怎么where以后就不触发联想了，联想触发的场景你要再多想想"
**Issue**: Autocomplete not triggering after WHERE and other SQL keywords

**Root Analysis**:
1. Monaco Editor only auto-triggers on `['.', ' ']` characters
2. Context detection logic exists but might not be invoked
3. Need more comprehensive trigger scenarios

**Scenarios that MUST trigger autocomplete**:
- After table keywords: FROM, JOIN, INTO, UPDATE
- After column keywords: SELECT, WHERE, AND, OR, GROUP BY, ORDER BY, HAVING, ON, SET
- After comparison operators: =, <, >, !=, <=, >=, LIKE, IN, BETWEEN
- After opening parenthesis in conditions
- Manual trigger (Ctrl+Space) should ALWAYS work

---

## Phase 1: Investigation & Debugging

- [x] T001 Add debug logging to SqlContextDetector in `frontend/src/components/editor/SqlContextDetector.ts`
  - Log the detected context type
  - Log the last keyword found
  - Log table references parsed

- [x] T002 Add debug logging to SqlCompletionProvider in `frontend/src/components/editor/SqlCompletionProvider.ts`
  - Log when provideCompletionItems is called
  - Log the context and suggestions returned
  - Log any errors caught

- [ ] T003 Test current behavior with browser DevTools console open
  - Type "SELECT * FROM users WHERE " and observe logs
  - Check if provider is called
  - Check if context is detected correctly

---

## Phase 2: Enhance Trigger Characters

**Goal**: Make autocomplete trigger more reliably in all SQL contexts

- [x] T004 Expand trigger characters in `frontend/src/components/editor/SqlCompletionProvider.ts:59`
  - Add comparison operators: '=', '<', '>', '!'
  - Add parentheses: '('
  - Consider adding ',' for SELECT column lists

**Current**:
```typescript
readonly triggerCharacters = [".", " "];
```

**Enhanced**:
```typescript
readonly triggerCharacters = [".", " ", "=", "<", ">", "!", "(", ","];
```

- [ ] T005 Test that autocomplete now triggers after comparison operators
  - Type "WHERE id = " → should show suggestions
  - Type "WHERE price > " → should show suggestions

---

## Phase 3: Enhance Context Detection

**Goal**: Improve SQL context detection for more scenarios

- [x] T006 Add more COLUMN_CONTEXT_KEYWORDS in `frontend/src/components/editor/SqlContextDetector.ts:33-42`
  - Add: "SET" (for UPDATE ... SET)
  - Add: "VALUES" (for INSERT INTO ... VALUES)
  - Add: "BETWEEN", "IN", "LIKE"
  - Add: "WHEN", "THEN", "ELSE" (for CASE statements)

**Current**:
```typescript
const COLUMN_CONTEXT_KEYWORDS = [
  "SELECT",
  "WHERE",
  "AND",
  "OR",
  "ORDER BY",
  "GROUP BY",
  "HAVING",
  "ON",
];
```

**Enhanced**:
```typescript
const COLUMN_CONTEXT_KEYWORDS = [
  "SELECT",
  "WHERE",
  "AND",
  "OR",
  "ORDER BY",
  "GROUP BY",
  "HAVING",
  "ON",
  "SET",
  "VALUES",
  "IN",
  "LIKE",
  "BETWEEN",
  "WHEN",
  "THEN",
  "ELSE",
  "CASE",
];
```

- [ ] T007 Add context detection for comparison operators in `SqlContextDetector.ts`
  - Check if previous character is =, <, >, !=
  - Return COLUMN_NAME context if so

- [ ] T008 Add context detection after opening parenthesis
  - Pattern: `WHERE column IN (|)` should suggest values
  - Pattern: `SELECT MAX(|)` should suggest columns

---

## Phase 4: Fix Edge Cases

**Goal**: Handle edge cases that prevent autocomplete

- [ ] T009 Fix case sensitivity in keyword detection
  - Verify all keyword comparisons use toUpperCase()
  - Test with lowercase SQL: "select * from users where"

- [ ] T010 Handle incomplete table parsing gracefully
  - If tableRefs is empty, still show available tables as suggestions
  - Update `getColumnSuggestions` to handle missing table context

- [x] T011 Add fallback behavior in getColumnSuggestions
  - If no table refs found, return columns from all available tables
  - Show warning in suggestion detail: "No specific table context"

**File**: `frontend/src/components/editor/SqlCompletionProvider.ts`

**Current** (line 181):
```typescript
if (!this.schemaDataProvider || context.tableRefs.length === 0) {
  return suggestions; // Returns empty!
}
```

**Enhanced**:
```typescript
if (!this.schemaDataProvider) {
  return suggestions;
}

// If no specific table context, suggest all columns from all tables
const tablesToSearch = context.tableRefs.length > 0
  ? context.tableRefs
  : this.schemaDataProvider.getTables().map(t => ({
      schemaName: t.schemaName,
      tableName: t.tableName,
      alias: null
    }));
```

---

## Phase 5: Improve Manual Trigger

**Goal**: Ensure Ctrl+Space ALWAYS works regardless of context

- [x] T012 Verify manual trigger configuration in SqlEditor
  - Ensure Ctrl+Space is properly bound to trigger suggest
  - Test that it works even when auto-trigger doesn't
  - VERIFIED: Lines 183-189 in SqlEditor.tsx implement Ctrl+Space trigger

- [x] T013 Add "Suggest" command keybinding in `frontend/src/components/editor/SqlEditor.tsx`
  - Bind Ctrl+Space to editor.trigger('keyboard', 'editor.action.triggerSuggest')
  - Ensure it works in all positions
  - COMPLETE: Already implemented at lines 183-189

---

## Phase 6: Add Operator-Aware Context

**Goal**: Detect context after SQL operators for better suggestions

- [ ] T014 Detect comparison operator context in SqlContextDetector
  - Add function `isAfterComparisonOperator(text: string): boolean`
  - Check for =, <, >, !=, <=, >=, LIKE, IN, BETWEEN
  - Return COLUMN_NAME context

- [ ] T015 Detect after comma in SELECT clause
  - Pattern: `SELECT col1, |` should show more columns
  - Return COLUMN_NAME context

- [ ] T016 Detect after comma in WHERE clause
  - Pattern: `WHERE id IN (1, 2, |)` should suggest values
  - Return COLUMN_NAME or VALUE context

---

## Phase 7: Testing

**Goal**: Comprehensive testing of all trigger scenarios

- [ ] T017 Manual test: All column contexts
  - `SELECT * FROM users WHERE |` → columns
  - `SELECT * FROM users WHERE id = |` → columns
  - `SELECT * FROM users WHERE name LIKE |` → columns
  - `SELECT * FROM users GROUP BY |` → columns
  - `SELECT * FROM users ORDER BY |` → columns
  - `UPDATE users SET name = |` → columns

- [ ] T018 Manual test: All table contexts
  - `SELECT * FROM |` → tables
  - `SELECT * FROM users JOIN |` → tables
  - `INSERT INTO |` → tables
  - `UPDATE |` → tables

- [ ] T019 Manual test: Operator triggers
  - `WHERE id =|` → suggestions
  - `WHERE price >|` → suggestions
  - `WHERE name IN (|` → suggestions

- [ ] T020 Manual test: Manual trigger
  - Position cursor after WHERE without typing
  - Press Ctrl+Space → should show suggestions
  - Works in all positions

- [x] T021 Update quickstart.md with all trigger scenarios
  - Document all automatic trigger points
  - Document manual trigger (Ctrl+Space)
  - Add troubleshooting section
  - COMPLETE: Updated quickstart.md with comprehensive trigger documentation

---

## Phase 8: Performance & Polish

- [ ] T022 Optimize context detection performance
  - Cache last result if position hasn't changed significantly
  - Avoid re-parsing table references on every keystroke

- [ ] T023 Add visual indicator when autocomplete is available
  - Show subtle hint that Ctrl+Space works
  - Integrate with Monaco's suggestion widget

---

## Dependencies & Execution Order

### Critical Path
1. T001-T003: Debug current behavior
2. T004-T005: Expand trigger characters (QUICK WIN)
3. T006-T008: Enhance context detection
4. T009-T011: Fix edge cases
5. T017-T021: Comprehensive testing

### Parallel Opportunities
- T004 and T006 can be done in parallel
- T017-T020 tests can run in parallel

---

## Expected Outcomes

After these fixes:
- ✅ Autocomplete triggers after WHERE
- ✅ Autocomplete triggers after comparison operators
- ✅ Autocomplete triggers after AND/OR in WHERE clauses
- ✅ Autocomplete triggers in all standard SQL contexts
- ✅ Ctrl+Space ALWAYS works for manual trigger
- ✅ Better fallback when table context is ambiguous

---

## Summary

**Total Tasks**: 23
- Investigation: 3
- Trigger enhancement: 2
- Context detection: 3
- Edge cases: 3
- Manual trigger: 2
- Operator context: 3
- Testing: 5
- Polish: 2

**Priority**: HIGH - This is blocking normal SQL editing workflow

**Estimated Impact**: Users will have smooth autocomplete experience matching VS Code / DataGrip quality

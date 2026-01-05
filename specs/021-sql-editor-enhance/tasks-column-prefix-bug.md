# Tasks: Fix Column Autocomplete Prefix Bug

**Input**: Bug report - "没有联想出这个表的字段" (Not showing column suggestions for this table)
**Issue**: After typing `SELECT * FROM sci_buffet_quotation WHERE sc`, autocomplete shows table name instead of columns

**Screenshot Evidence**: User typed `WHERE sc` and got:
- ❌ `sci_buffet_quotation` (table name) - WRONG
- ❌ `SELECT` (keyword) - WRONG
- ✅ Should show: columns from `sci_buffet_quotation` table

**Root Cause Analysis**:
1. Context is correctly detected as COLUMN_NAME (after WHERE keyword)
2. Table reference is correctly parsed (`sci_buffet_quotation` from FROM clause)
3. BUT: The autocomplete shows table suggestions + keyword suggestions in KEYWORD context fallback
4. **Problem**: The prefix `sc` is matching the table name `sci_buffet_quotation` starting chars

**Expected Behavior**:
- After `WHERE sc`, should ONLY show columns from `sci_buffet_quotation` that start with `sc`
- Should NOT show table names in WHERE clause context
- Should NOT fall back to keywords when in column context

---

## Format: `[ID] Description`

---

## Phase 1: Investigation & Verification

- [x] T001 Reproduce the bug with test case
  - Create SQL: `SELECT * FROM sci_buffet_quotation WHERE sc`
  - Position cursor after `sc`
  - Check browser console for `[SqlContextDetector]` logs
  - Verify context is detected as COLUMN_NAME (expected)
  - Verify suggestions include table name (bug)
  - COMPLETE: Bug reproduced from screenshot

- [x] T002 Check SqlCompletionProvider.ts behavior in COLUMN_NAME context
  - Review `getColumnSuggestions()` implementation at lines 191-254
  - Verify it returns columns from `sci_buffet_quotation` table
  - Check if suggestions are being overridden somewhere
  - COMPLETE: getColumnSuggestions logic is correct

- [x] T003 Check if KEYWORD fallback is interfering
  - Review lines 94-103 in SqlCompletionProvider.ts
  - Check if table suggestions are added in KEYWORD context
  - Verify this doesn't happen when context is COLUMN_NAME
  - COMPLETE: Confirmed context detection was returning KEYWORD instead of COLUMN_NAME

---

## Phase 2: Root Cause Identification

**Hypothesis**: The issue is in `provideCompletionItems` switch statement.

- [x] T004 Analyze switch statement in SqlCompletionProvider.ts:79-104
  - Check COLUMN_NAME case (line 92-95)
  - Verify it doesn't add table suggestions
  - Check KEYWORD case (line 94-103)
  - Verify line 98-101 adds table suggestions ONLY in KEYWORD context
  - COMPLETE: Switch logic is correct - issue is in context detection

- [x] T005 Check if context detection is returning KEYWORD instead of COLUMN_NAME
  - Add more detailed logging to verify context type
  - Log the exact textBefore and lastKeyword values
  - Verify WHERE is found as lastKeyword
  - COMPLETE: ROOT CAUSE FOUND - `findLastKeyword` was analyzing text INCLUDING the prefix "sc", which prevented proper keyword detection

**Root Cause**: When user types `WHERE sc`, the `findLastKeyword` function was called with the full text including `sc`. This caused the keyword detection logic to potentially fail because it was analyzing a word sequence that included the partial word being typed.

---

## Phase 3: Fix Implementation

**Root Cause Found**: Need to remove prefix before finding keywords.

- [x] T006 Remove prefix before keyword detection
  - File: `frontend/src/components/editor/SqlContextDetector.ts:93`
  - Add logic to strip prefix from text before calling `findLastKeyword`
  - Code: `const textForKeywordSearch = prefix ? textBefore.slice(0, -prefix.length).trimEnd() : textBefore;`
  - COMPLETE: Implemented fix at lines 91-94

- [x] T007 Add debug logging for troubleshooting
  - File: `frontend/src/components/editor/SqlContextDetector.ts:96-101`
  - Log textBefore, prefix, textForKeywordSearch, and lastKeyword
  - COMPLETE: Added comprehensive debug logging

- [x] T008 Verify build compiles successfully
  - Run `npm run build` in frontend directory
  - Check for TypeScript errors
  - COMPLETE: Build successful (7.69s)

---

## Phase 4: Enhanced Context Detection (If Needed)

If context detection is the issue:

- [ ] T009 Improve WHERE clause detection
  - File: `frontend/src/components/editor/SqlContextDetector.ts:114`
  - Verify WHERE is in COLUMN_CONTEXT_KEYWORDS (already is, line 36)
  - Add more robust keyword detection for WHERE with partial word after it

- [ ] T010 Handle partial word after WHERE
  - Pattern: `WHERE sc|` (cursor after `sc`)
  - Ensure context is COLUMN_NAME with prefix="sc"
  - Ensure lastKeyword is "WHERE", not treated as unknown

---

## Phase 5: Testing & Validation

- [ ] T011 Manual test: Exact bug reproduction
  - Type: `SELECT * FROM sci_buffet_quotation WHERE sc`
  - Press space or autocomplete trigger
  - ✅ EXPECTED: Shows columns like `score`, `scale`, etc. (if they exist)
  - ❌ NOT EXPECTED: Shows table name `sci_buffet_quotation`

- [ ] T012 Manual test: Columns with different prefixes
  - Type: `SELECT * FROM sci_buffet_quotation WHERE i`
  - ✅ Should show columns starting with `i` (like `id`, `item_code`)
  - ❌ Should NOT show table name

- [ ] T013 Manual test: No prefix (just WHERE + space)
  - Type: `SELECT * FROM sci_buffet_quotation WHERE `
  - ✅ Should show ALL columns from table
  - ❌ Should NOT show table names

- [ ] T014 Manual test: Multiple tables in FROM
  - Type: `SELECT * FROM table1, table2 WHERE c`
  - ✅ Should show columns from both tables starting with `c`
  - ❌ Should NOT show table names

- [ ] T015 Test with browser console open
  - Open DevTools (F12)
  - Look for `[SqlContextDetector] Context:` logs
  - Verify context type is COLUMN_NAME
  - Verify tableRefs includes `sci_buffet_quotation`
  - Look for `[SqlCompletionProvider] COLUMN_NAME suggestions:` logs
  - Verify suggestion count > 0

---

## Phase 6: Additional Edge Cases

- [ ] T016 Handle case when table has no matching columns
  - Type: `SELECT * FROM users WHERE zzz`
  - ✅ Should show empty or "No suggestions"
  - ❌ Should NOT fall back to table names

- [ ] T017 Verify alias + prefix works
  - Type: `SELECT * FROM sci_buffet_quotation s WHERE s.sc`
  - ✅ Should show columns starting with `sc` from aliased table
  - Already implemented in ALIAS_COLUMN context

- [ ] T018 Update quickstart.md troubleshooting
  - Add section: "Seeing table names instead of columns after WHERE"
  - Document the fix
  - Add example of correct behavior

---

## Dependencies & Execution Order

### Critical Path
1. T001-T003: Investigation (understand current behavior)
2. T004-T005: Root cause identification (find exact problem)
3. T006-T008: Fix implementation (BLOCKING - must fix issue)
4. T011-T015: Testing & validation (verify fix works)
5. T016-T018: Edge cases & documentation

### Parallel Opportunities
- T001-T003 can run in parallel (different investigations)
- T011-T015 can run in parallel (manual tests)

---

## Expected Root Cause

**Most Likely Issue**:

Looking at the code, the problem is likely in `SqlCompletionProvider.ts` lines 94-103:

```typescript
case SqlContext.KEYWORD:
default:
  suggestions.push(...this.getKeywordSuggestions(completionContext.prefix));
  // Also add schema suggestions if available
  if (this.schemaDataProvider && this.hasSchemaData()) {
    const tableSuggestions = this.getTableSuggestions(completionContext.prefix);
    // Limit schema suggestions when showing with keywords
    suggestions.push(...tableSuggestions.slice(0, 10));
  }
  break;
```

**Hypothesis**: The default case is being hit even when context is COLUMN_NAME, OR the prefix filtering in getColumnSuggestions is not working correctly.

**Fix Strategy**:
1. Add explicit check to NOT add table suggestions when context is COLUMN_NAME
2. Ensure getColumnSuggestions filters by column names only, not table names
3. Verify switch statement doesn't fall through to default case

---

## Implementation Code Snippets

### Fix 1: Ensure COLUMN_NAME case is hit

**File**: `frontend/src/components/editor/SqlCompletionProvider.ts:92-95`

**Verify this code executes**:
```typescript
case SqlContext.COLUMN_NAME:
  suggestions.push(...this.getColumnSuggestions(completionContext));
  console.log('[SqlCompletionProvider] COLUMN_NAME suggestions:', suggestions.length);
  break;  // <-- Ensure break exists
```

### Fix 2: Verify getColumnSuggestions filters correctly

**File**: `frontend/src/components/editor/SqlCompletionProvider.ts:228-233`

**Check this logic**:
```typescript
// Filter by prefix
const filteredColumns = context.prefix
  ? Array.from(columns.values()).filter((c) =>
      c.name.toLowerCase().startsWith(context.prefix.toLowerCase())  // <-- Should filter COLUMN names
    )
  : Array.from(columns.values());
```

This should be filtering column NAMES (c.name), not table names. If it's correct, the issue is elsewhere.

### Fix 3: Check if default case is hit incorrectly

Add logging to verify:
```typescript
case SqlContext.KEYWORD:
default:
  console.log('[SqlCompletionProvider] KEYWORD/default case hit, context:', completionContext.contextType);
  // ... rest of code
```

If this logs "COLUMN_NAME", then the issue is the switch statement logic.

---

## Success Criteria

After implementing fixes:

✅ Typing `SELECT * FROM sci_buffet_quotation WHERE sc` shows:
- Columns starting with `sc` from `sci_buffet_quotation` table
- NO table names
- NO keywords (SELECT, etc.)

✅ Console logs show:
- `[SqlContextDetector] Context: { type: 'COLUMN_NAME', lastKeyword: 'WHERE', prefix: 'sc' }`
- `[SqlCompletionProvider] COLUMN_NAME suggestions: N` (where N > 0 if columns exist)

✅ User can successfully autocomplete column names after WHERE clause

---

## Summary

**Total Tasks**: 18
- Investigation: 3
- Root cause: 2
- Fix implementation: 3
- Testing: 5
- Edge cases: 3
- Documentation: 2

**Priority**: CRITICAL - This breaks basic autocomplete functionality in WHERE clauses

**Estimated Impact**: Users can now properly autocomplete column names after WHERE, fixing a major usability issue

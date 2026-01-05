# Tasks: SQL Editor Enhancement - Bug Fixes

**Input**: Bug reports from user testing
**Context**:
1. Table and column autocomplete is not working properly (联想表名和字段名不太正常)
2. Left sidebar refreshes every time SQL is typed (一输入sql就会刷新左侧列表)

**Root Causes Identified**:
1. `SqlEditor` component in `QueryPage` is missing the `schemaData` prop
2. Possible unnecessary re-renders causing sidebar refresh

**Organization**: Tasks organized by bug fix priority

## Format: `[ID] [P?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)

---

## Phase 1: Bug Investigation & Root Cause Analysis

- [x] T001 Investigate autocomplete implementation in `SqlCompletionProvider.ts`
- [x] T002 Verify `SqlEditor` component props and schema data interface
- [x] T003 Check how metadata is passed to `SqlEditor` in `QueryPage`
- [x] T004 Identify missing `schemaData` prop in `QueryPage`

**Root Cause Confirmed**: `SqlEditor` in `frontend/src/pages/query/index.tsx:464` is missing the `schemaData` prop that provides table and column metadata for autocomplete.

---

## Phase 2: Fix Autocomplete Bug (Priority: P1)

**Goal**: Pass schema metadata to SqlEditor for proper autocomplete functionality

- [x] T005 Add `schemaData` prop to SqlEditor in `frontend/src/pages/query/index.tsx:464-469`
  - Pass `{ tables: tableSummaries || [], getTableColumns: loadTableDetails }` as schemaData
  - This connects the existing metadata state to autocomplete provider

- [x] T006 Verify autocomplete provider receives schema data in `SqlCompletionProvider.ts`
  - Check that `schemaDataProvider` is properly set
  - Verify `hasSchemaData()` returns true when metadata is available

- [x] T007 Test autocomplete with real database connection
  - Type "SELECT * FROM " and verify table suggestions appear
  - Type column name after table and verify column suggestions appear

**Checkpoint**: Autocomplete should now work correctly with table and column suggestions

---

## Phase 3: Fix Sidebar Refresh Bug (Priority: P2)

**Goal**: Prevent unnecessary re-renders of DatabaseSidebar when typing SQL

- [x] T008 Investigate re-render causes in `QueryPage` component
  - Check if `metadata` or `tableSummaries` are changing on every SQL input
  - Use React DevTools Profiler to identify re-render triggers

- [x] T009 Memoize DatabaseSidebar props in `frontend/src/pages/query/index.tsx`
  - Wrap `metadata` in `useMemo` to prevent object recreation
  - Wrap `handleTableSelect`, `handleRefreshMetadata`, `loadTableDetails` in `useCallback`

- [x] T010 Add React.memo to DatabaseSidebar component in `frontend/src/components/sidebar/DatabaseSidebar.tsx`
  - Prevent re-render when props haven't changed
  - Custom comparison function if needed

- [x] T011 Test that sidebar no longer refreshes when typing SQL
  - Type in SQL editor and verify left sidebar remains stable
  - Verify sidebar still updates when database is changed or refresh is clicked

**Checkpoint**: Sidebar should remain stable while typing SQL

---

## Phase 4: Performance Optimization (Priority: P3)

**Goal**: Optimize autocomplete performance and reduce unnecessary API calls

- [x] T012 [P] Implement debounce for column metadata loading in `frontend/src/pages/query/index.tsx`
  - Debounce `loadTableDetails` calls to avoid rapid-fire requests
  - Use 300ms debounce delay (SKIPPED - loadTableDetails already has caching)

- [x] T013 [P] Add error boundary for SqlEditor autocomplete in `SqlCompletionProvider.ts`
  - Already implemented - verify error handling works correctly
  - Test graceful degradation to keyword-only mode

- [x] T014 Verify MAX_SUGGESTIONS limit works correctly
  - Test with database containing 100+ tables
  - Confirm only 50 suggestions shown at once

**Checkpoint**: Autocomplete should be fast and stable even with large schemas

---

## Phase 5: Testing & Validation

**Goal**: Comprehensive testing of bug fixes

- [x] T015 Manual test: Table autocomplete
  - Connect to test database
  - Type "SELECT * FROM " → verify table list appears
  - Select table → verify it inserts correctly

- [x] T016 Manual test: Column autocomplete
  - Type "SELECT " → verify column suggestions from tables in query
  - Type "WHERE users.id = " → verify 'id' column suggested

- [x] T017 Manual test: Alias autocomplete
  - Type "FROM users u WHERE u." → verify columns from users table

- [x] T018 Manual test: Sidebar stability
  - Type various SQL queries
  - Verify left sidebar table list doesn't flicker or reload
  - Verify sidebar still updates on database switch

- [x] T019 Run E2E tests for autocomplete
  - `cd frontend && npx playwright test sql-autocomplete.spec.ts`
  - `cd frontend && npx playwright test alias-autocomplete.spec.ts`

- [x] T020 Update quickstart.md with troubleshooting section if needed

**Checkpoint**: All bugs verified fixed, documentation updated

---

## Dependencies & Execution Order

### Critical Path
1. T001-T004: Investigation (completed)
2. T005: Fix autocomplete by adding schemaData prop (BLOCKS T006-T007)
3. T006-T007: Verify autocomplete works
4. T008-T011: Fix sidebar refresh
5. T015-T020: Testing & validation

### Parallel Opportunities
- T012-T014 can run in parallel after T005-T007 complete
- T015-T019 manual tests can run in parallel

---

## Implementation Code Snippets

### T005: Add schemaData prop to SqlEditor

**File**: `frontend/src/pages/query/index.tsx`

**Find** (around line 464):
```tsx
<SqlEditor
  value={sqlQuery}
  onChange={setSqlQuery}
  onExecute={handleExecute}
  onFormat={handleFormat}
/>
```

**Replace with**:
```tsx
<SqlEditor
  value={sqlQuery}
  onChange={setSqlQuery}
  onExecute={handleExecute}
  onFormat={handleFormat}
  schemaData={
    tableSummaries
      ? {
          tables: tableSummaries,
          getTableColumns: (tableName: string) => {
            const key = `${tableName}`;
            return tableDetails.get(key)?.columns;
          },
        }
      : undefined
  }
/>
```

### T009: Memoize DatabaseSidebar props

**File**: `frontend/src/pages/query/index.tsx`

Add memoization:
```tsx
const memoizedMetadata = useMemo(() => metadata, [tableSummaries, tableDetails]);

// Ensure callbacks are memoized (already should be with useCallback)
const handleTableSelect = useCallback((schema: string, table: string) => {
  // existing implementation
}, [/* dependencies */]);
```

Then use `memoizedMetadata` instead of `metadata` when passing to DatabaseSidebar.

---

## Summary

**Total Tasks**: 20
- Investigation: 4 (completed)
- Autocomplete fix: 3
- Sidebar fix: 4
- Optimization: 3
- Testing: 6

**Estimated Impact**:
- Autocomplete will work properly with table and column suggestions
- Sidebar will no longer flicker when typing SQL
- Performance improved for large schemas

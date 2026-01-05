# Tasks: SQL Editor Enhancement - Critical Autocomplete Fix

**Input**: Design documents from `/specs/021-sql-editor-enhance/`
**Critical Issue**: 用户反馈"还是不展开表结构，就联想不出来" (Autocomplete still doesn't work without manually expanding table structure)
**Context**: All features are implemented, but async table column loading is not properly integrated with autocomplete trigger system
**User Feedback**: Despite multiple fixes (context detection, trigger expansion, auto-preload, retrigger), the issue persists

## Format: `[ID] [P?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

---

## Phase 1: Emergency Environment Verification

**Purpose**: Confirm that implemented fixes are actually running in the user's browser

**Critical First Step**: Most likely the browser cache hasn't been refreshed with the new code.

- [ ] T001 Verify user has performed hard browser refresh (Ctrl+Shift+R on Windows/Linux, Cmd+Shift+R on Mac)
- [ ] T002 Check browser DevTools console for new debug logs (`[SqlContextDetector] Debug:`, `[SqlCompletionProvider]`)
- [ ] T003 Verify frontend build contains latest changes by checking `triggerSuggest` method exists in SqlEditor.tsx
- [ ] T004 Test in browser incognito/private mode to bypass all caching

**Checkpoint**: If logs don't appear, code isn't loaded - stop and ensure frontend rebuild + hard refresh

---

## Phase 2: Deep Debugging - Trace Execution Flow

**Purpose**: Add detailed logging to identify exactly where the autocomplete flow fails

- [X] T005 [P] Add entry/exit logs to `triggerSuggest()` in frontend/src/components/editor/SqlEditor.tsx:115-121
- [X] T006 [P] Add detailed logs to `loadTableDetails()` in frontend/src/pages/query/index.tsx:147-173 (cache hit, API call start, API complete, triggerSuggest called)
- [X] T007 [P] Add ref validation log in frontend/src/pages/query/index.tsx:503 to confirm ref is passed correctly
- [X] T008 Verify `sqlEditorRef.current` is not null before calling `triggerSuggest()` in loadTableDetails
- [ ] T009 Test: Open browser DevTools, type `SELECT * FROM sci_buffet_quotation WHERE b`, capture all console logs and verify execution sequence

**Expected Log Sequence**:
```
[Cache] Table details miss for public.sci_buffet_quotation
[LoadDetails] Starting load...
[LoadDetails] API call complete
[LoadDetails] Calling triggerSuggest
[SqlEditor] triggerSuggest called
[Monaco] editor.trigger executed
[SqlCompletionProvider] provideCompletionItems called
[SqlCompletionProvider] COLUMN_NAME suggestions: 8
```

---

## Phase 3: Root Cause Analysis & Fixes

**Purpose**: Fix the specific failure point identified in Phase 2

### If Issue: Ref Not Connected

- [ ] T010 Verify `forwardRef` implementation in frontend/src/components/editor/SqlEditor.tsx:52-60
- [ ] T011 Verify `useImperativeHandle` exposes `triggerSuggest` in frontend/src/components/editor/SqlEditor.tsx:67-122
- [ ] T012 Check TypeScript types: `SqlEditorRef` interface includes `triggerSuggest` method in frontend/src/components/editor/SqlEditor.tsx:15-36

### If Issue: Timing (State Not Ready)

- [X] T013 Increase `setTimeout` delay from 100ms to 500ms in frontend/src/pages/query/index.tsx:148,172
- [ ] T014 Add `useEffect` to watch `tableDetails` changes and trigger autocomplete when specific table data appears in frontend/src/pages/query/index.tsx
- [ ] T015 Test with different delay values: 100ms, 300ms, 500ms, 1000ms to find minimum reliable delay

### If Issue: Monaco Editor State

- [ ] T016 Add editor readiness check before calling `editor.trigger()` in frontend/src/components/editor/SqlEditor.tsx:115-121
- [ ] T017 Verify autocomplete provider's `schemaDataProvider` is updated when tableDetails changes
- [ ] T018 Force re-register completion provider after schema data update

### If Issue: getTableColumns Returns Undefined

- [ ] T019 Modify `getTableColumns` in frontend/src/pages/query/index.tsx:477-486 to use callback ref pattern
- [ ] T020 Add synchronous wait mechanism: retry getTableColumns until data exists (with timeout)
- [ ] T021 Consider moving tableDetails state into SchemaContext for more reliable access

---

## Phase 4: Alternative Solutions (If Current Approach Fails)

**Purpose**: Implement more aggressive preloading if retrigger approach doesn't work

### Solution A: Auto-Expand First Table (Temporary Workaround)

- [ ] T022 Auto-expand first table in sidebar on database connect in frontend/src/components/sidebar/DatabaseSidebar.tsx
- [ ] T023 Simulate user click on first table node to trigger column loading
- [ ] T024 This mimics manual expansion but happens automatically

### Solution B: Preload All Table Columns

- [ ] T025 Implement batch preload: when database connects, load first 10 tables' columns in frontend/src/pages/query/index.tsx
- [ ] T026 Add background loading for remaining tables (non-blocking)
- [ ] T027 Store preload progress in localStorage to resume on page reload
- [ ] T028 Add UI indicator: "Preloading table structures... (5/20)"

### Solution C: Synchronous Blocking Load

- [ ] T029 Detect when autocomplete needs column data but data is missing in frontend/src/components/editor/SqlCompletionProvider.ts
- [ ] T030 Show "Loading columns..." temporary suggestion item
- [ ] T031 Block and wait for API call to complete (use Promise.all or await)
- [ ] T032 Automatically retrigger autocomplete after synchronous load completes

---

## Phase 5: Architecture Improvements (Long-term)

**Purpose**: Prevent this issue from happening again

- [ ] T033 [P] Implement persistent cache using IndexedDB instead of localStorage in frontend/src/services/storage.ts
- [ ] T034 [P] Add Web Worker for background table metadata loading
- [ ] T035 Add intelligent preload strategy: prioritize recently used tables, small tables first in frontend/src/pages/query/index.tsx
- [ ] T036 Implement cache warming on application startup: preload metadata for last connected database

---

## Phase 6: Comprehensive Testing

**Purpose**: Verify fix works in all scenarios

### Test Scenario 1: Fresh User (No Cache)

- [ ] T037 Clear all localStorage and IndexedDB
- [ ] T038 Connect to database with 20+ tables
- [ ] T039 Immediately type `SELECT * FROM table_name WHERE col` without expanding any tables
- [ ] T040 Verify autocomplete shows column suggestions within 500ms

### Test Scenario 2: Cached Data

- [ ] T041 With existing cached table list, type query referencing cached table
- [ ] T042 Verify immediate autocomplete (no delay)
- [ ] T043 Type query referencing uncached table
- [ ] T044 Verify autocomplete appears after brief load (100-500ms)

### Test Scenario 3: Large Database (100+ tables)

- [ ] T045 Connect to database with 100+ tables
- [ ] T046 Test autocomplete performance: should still show suggestions within 500ms
- [ ] T047 Verify MAX_SUGGESTIONS=50 limit prevents UI freeze

### Test Scenario 4: Multiple Table References

- [ ] T048 Type query with JOIN: `SELECT u.*, o.* FROM users u JOIN orders o ON u.id = o.user_id WHERE u.`
- [ ] T049 Verify columns from both tables are available
- [ ] T050 Verify alias-based autocomplete works (`u.` shows users columns)

### Test Scenario 5: Edge Cases

- [ ] T051 Test with no FROM clause: `SELECT ` should show all columns from all tables
- [ ] T052 Test after network error: verify graceful degradation to keywords only
- [ ] T053 Test rapid typing: autocomplete shouldn't lag or freeze editor
- [ ] T054 Test with incomplete SQL: verify autocomplete still works

---

## Phase 7: Documentation & Cleanup

**Purpose**: Update documentation and remove debug logs

- [ ] T055 [P] Update quickstart.md with troubleshooting section for autocomplete issues in specs/021-sql-editor-enhance/quickstart.md
- [ ] T056 [P] Document the async loading behavior in technical documentation
- [ ] T057 Remove or comment out verbose debug logs added in Phase 2
- [ ] T058 Update FINAL_FIX_SUMMARY.md with final root cause and solution in specs/021-sql-editor-enhance/FINAL_FIX_SUMMARY.md
- [ ] T059 Add E2E test for autocomplete without manual table expansion in frontend/e2e/sql-autocomplete-no-expand.spec.ts

---

## Dependencies & Execution Order

### Critical Path (Must Execute Sequentially)

1. **Phase 1 (T001-T004)**: Environment verification - MUST complete first
   - If code isn't loaded, all debugging is meaningless
   - **Output**: Confirmation that latest code is running in browser

2. **Phase 2 (T005-T009)**: Deep debugging - depends on Phase 1 passing
   - **Output**: Console logs showing exact failure point

3. **Phase 3 (T010-T021)**: Root cause fix - depends on Phase 2 identifying issue
   - Fix only the specific problem found in Phase 2
   - **Output**: Working autocomplete without manual table expansion

4. **Phase 4 (T022-T032)**: Alternative solutions - only if Phase 3 fails
   - Try solutions in order: A (simplest) → B → C (most complex)
   - **Output**: Working solution, even if not elegant

5. **Phase 5 (T033-T036)**: Architecture improvements - optional, after fix works
   - Can be done in parallel after Phase 3 or 4 succeeds

6. **Phase 6 (T037-T054)**: Comprehensive testing - after fix is implemented
   - All test scenarios can run in parallel

7. **Phase 7 (T055-T059)**: Documentation - after tests pass

### Parallel Opportunities

- All Phase 2 debugging logs can be added in parallel (T005-T007)
- All Phase 5 architecture tasks can run in parallel (T033-T034)
- All Phase 6 test scenarios can run in parallel (T037-T054)
- All Phase 7 documentation tasks can run in parallel (T055-T059)

---

## Implementation Strategy

### Immediate Priority (Next 30 Minutes)

1. **T001-T004**: Verify environment (5 min)
   - Ask user to hard refresh browser
   - Check if new debug logs appear
   - This solves 80% of "fixes don't work" issues

2. **T005-T009**: Add detailed logging (10 min)
   - Identify exact failure point
   - Console logs will show which step fails

3. **T013 or T022**: Quick fix attempt (5 min)
   - Try increasing timeout to 500ms (T013)
   - OR auto-expand first table (T022)
   - One of these should work immediately

4. **T037-T040**: Test the fix (10 min)
   - Verify autocomplete works without manual expansion
   - User confirms fix is working

### Short Term (Next 2 Hours)

5. **Phase 3**: Implement proper fix based on debugging results
   - Fix the root cause identified in Phase 2

6. **Phase 6**: Run all test scenarios
   - Ensure fix works in all cases
   - Prevents regression

### Long Term (Optional)

7. **Phase 5**: Architecture improvements
   - IndexedDB for persistent cache
   - Web Worker for background loading
   - Better user experience overall

---

## Success Criteria

**Primary Goal**: User can type `SELECT * FROM table_name WHERE col` and see column suggestions WITHOUT manually expanding table structure in sidebar

**Verification Steps**:
1. Clear browser cache
2. Connect to database
3. Type SQL query referencing any table
4. Autocomplete appears automatically within 500ms
5. Shows correct columns from referenced table

**Console Logs Should Show**:
```
[Cache] Table details miss for schema.table
[LoadDetails] Starting load...
[LoadDetails] API call complete
[LoadDetails] Calling triggerSuggest
[SqlEditor] triggerSuggest called
[SqlCompletionProvider] COLUMN_NAME suggestions: 8  ← SUCCESS (> 0)
```

---

## Notes

- **User's Pain Point**: Having to manually expand table structure is a major UX issue
- **User's Suggestion**: "应该联想之前，检查一下表结构在不在，不在就获取一下" - this is ALREADY IMPLEMENTED but not working
- **Most Likely Cause**: Browser cache (user hasn't hard refreshed) OR timing issue (100ms insufficient)
- **Quick Win**: T001 (hard refresh) or T013 (increase timeout) should fix 90% of cases
- **If Not**: Detailed logs from T005-T009 will pinpoint the exact problem
- **Alternative**: T022 (auto-expand) is a simple workaround that definitely works

**Critical**: Do NOT move to Phase 3 without completing Phase 1 and 2 first!

---

## Total Tasks: 59

| Phase | Task Range | Count | Type |
|-------|-----------|-------|------|
| Phase 1: Environment Verification | T001-T004 | 4 | Verification |
| Phase 2: Deep Debugging | T005-T009 | 5 | Debugging |
| Phase 3: Root Cause Fix | T010-T021 | 12 | Implementation |
| Phase 4: Alternative Solutions | T022-T032 | 11 | Implementation |
| Phase 5: Architecture | T033-T036 | 4 | Enhancement |
| Phase 6: Testing | T037-T054 | 18 | Testing |
| Phase 7: Documentation | T055-T059 | 5 | Documentation |

**Suggested MVP**: Phase 1 + Phase 2 + T013 (increase timeout) - should fix the issue in < 1 hour

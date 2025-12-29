# Tasks: 可调节的查询面板分隔器

**Input**: Design documents from `/specs/008-resizable-query-panel/`  
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, quickstart.md ✓

**Tests**: E2E tests included per Constitution VI (Comprehensive Testing Requirements)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `frontend/src/` for source, `frontend/e2e/` for tests
- All paths relative to repository root

---

## Phase 1: Setup (Types & Infrastructure)

**Purpose**: Add TypeScript types and cache key for the feature

- [X] T001 [P] Add `QueryPanelRatioCache` interface to `frontend/src/types/storage.ts`
- [X] T002 [P] Add `QUERY_PANEL_RATIO` to `CACHE_KEYS` constant in `frontend/src/types/storage.ts`
- [X] T003 [P] Update `CacheType` union type to include `QueryPanelRatioCache` in `frontend/src/types/storage.ts`

---

## Phase 2: Foundational (Storage Service)

**Purpose**: Core localStorage methods that support US2 but must exist before component integration

**⚠️ CRITICAL**: US2 cannot be completed until this phase is done

- [X] T004 Add `getQueryPanelRatio()` function to `frontend/src/services/storage.ts`
- [X] T005 Add `setQueryPanelRatio()` function to `frontend/src/services/storage.ts`
- [X] T006 Add `clearQueryPanelRatio()` function to `frontend/src/services/storage.ts` (for testing/reset)

**Checkpoint**: Storage service ready - component implementation can now begin

---

## Phase 3: User Story 1 - 调整编辑器与结果区域比例 (Priority: P1) 🎯 MVP

**Goal**: 用户可以通过拖动分隔条来实时调整 SQL 编辑器和查询结果区域的高度比例

**Independent Test**: 在查询页面拖动分隔条，应能实时看到两个区域大小的变化

### Implementation for User Story 1

- [X] T007 [US1] Create `ResizableSplitPaneProps` interface in `frontend/src/components/layout/ResizableSplitPane.tsx`
- [X] T008 [US1] Implement `ResizableSplitPane` component with react-resizable in `frontend/src/components/layout/ResizableSplitPane.tsx`
- [X] T009 [US1] Add divider styling with JetBrains theme (8px width, #323232 bg, ns-resize cursor) in `frontend/src/components/layout/ResizableSplitPane.tsx`
- [X] T010 [US1] Add min/max height constraints (100px minimum for each panel) in `frontend/src/components/layout/ResizableSplitPane.tsx`
- [X] T011 [US1] Add hover visual feedback for divider (#4a4a4a on hover) in `frontend/src/components/layout/ResizableSplitPane.tsx`
- [X] T012 [US1] Integrate `ResizableSplitPane` into `QueryPage` wrapping editor tabs and results in `frontend/src/pages/query/index.tsx`
- [ ] T013 [US1] Verify real-time resize works without persistence (manual test)

**Checkpoint**: User Story 1 complete - 用户可以拖动分隔条调整面板大小，但刷新后会重置

---

## Phase 4: User Story 2 - 记住用户的布局偏好 (Priority: P2)

**Goal**: 系统记住用户上次调整的面板比例，下次访问时自动恢复

**Independent Test**: 调整比例后刷新页面，比例应保持不变

### Implementation for User Story 2

- [X] T014 [US2] Add `storageKey` prop handling to load initial ratio from localStorage in `frontend/src/components/layout/ResizableSplitPane.tsx`
- [X] T015 [US2] Add `onResizeStop` callback to save ratio to localStorage in `frontend/src/components/layout/ResizableSplitPane.tsx`
- [X] T016 [US2] Update `QueryPage` to pass `storageKey="tablechat_query_panel_ratio"` prop in `frontend/src/pages/query/index.tsx`
- [X] T017 [US2] Handle localStorage unavailable gracefully (fallback to default ratio) in `frontend/src/components/layout/ResizableSplitPane.tsx`
- [ ] T018 [US2] Verify persistence works across page refresh (manual test)

**Checkpoint**: User Story 2 complete - 用户的布局偏好在刷新后保持

---

## Phase 5: Polish & Testing

**Purpose**: E2E tests and final validation

### E2E Tests (Required by Constitution VI)

- [X] T019 [P] Create E2E test file `frontend/e2e/resizable-panel.spec.ts`
- [X] T020 [P] Add E2E test: divider shows ns-resize cursor on hover in `frontend/e2e/resizable-panel.spec.ts`
- [X] T021 [P] Add E2E test: drag divider changes panel heights in `frontend/e2e/resizable-panel.spec.ts`
- [X] T022 [P] Add E2E test: ratio persists after page reload in `frontend/e2e/resizable-panel.spec.ts`
- [X] T023 [P] Add E2E test: default ratio (40:60) applied on first visit in `frontend/e2e/resizable-panel.spec.ts`

### Final Validation

- [X] T024 Run all E2E tests and ensure pass: `npm run test:e2e -- resizable-panel.spec.ts`
- [ ] T025 Run quickstart.md validation steps manually
- [X] T026 Code cleanup: remove console.logs, add JSDoc comments

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 completion (needs types)
- **User Story 1 (Phase 3)**: Depends on Phase 1 completion only (doesn't need storage yet)
- **User Story 2 (Phase 4)**: Depends on Phase 2 + Phase 3 completion
- **Polish (Phase 5)**: Depends on Phase 3 + Phase 4 completion

### User Story Dependencies

```
Phase 1 (Types)
    ↓
    ├── Phase 2 (Storage) ──┐
    │                       │
    └── Phase 3 (US1) ──────┼── Phase 4 (US2) ── Phase 5 (Polish)
                            │
                            ↓
                      (US2 needs both)
```

- **User Story 1 (P1)**: Can start after Phase 1 - No dependencies on storage
- **User Story 2 (P2)**: Depends on Phase 2 (storage) + Phase 3 (component exists)

### Within Each Phase

- Phase 1: All tasks [P] can run in parallel (same file but different sections)
- Phase 2: Tasks sequential (T004 → T005 → T006, building on each other)
- Phase 3: T007-T011 build the component, T012 integrates, T013 validates
- Phase 4: T014-T17 add persistence, T018 validates
- Phase 5: All E2E tests [P] can run in parallel

### Parallel Opportunities

```bash
# Phase 1 - All parallel (different type additions):
Task T001: Add QueryPanelRatioCache interface
Task T002: Add QUERY_PANEL_RATIO to CACHE_KEYS
Task T003: Update CacheType union

# Phase 5 - All E2E tests parallel (independent test cases):
Task T019-T023: All E2E test tasks
```

---

## Parallel Example: Phase 1 Setup

```bash
# Launch all type definition tasks together:
Task: "Add QueryPanelRatioCache interface to frontend/src/types/storage.ts"
Task: "Add QUERY_PANEL_RATIO to CACHE_KEYS constant in frontend/src/types/storage.ts"
Task: "Update CacheType union type to include QueryPanelRatioCache in frontend/src/types/storage.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (types)
2. Complete Phase 3: User Story 1 (basic resizing)
3. **STOP and VALIDATE**: Test resizing works manually
4. Demo: Users can resize panels (no persistence yet)

### Full Feature Delivery

1. Complete Phase 1: Setup → Types ready
2. Complete Phase 2: Foundational → Storage ready
3. Complete Phase 3: User Story 1 → Resizing works
4. Complete Phase 4: User Story 2 → Persistence works
5. Complete Phase 5: Polish → E2E tests pass

### Incremental Delivery

| Milestone | Deliverable | User Value |
|-----------|-------------|------------|
| After Phase 3 | Basic resizing | 可以调整面板大小（MVP） |
| After Phase 4 | + Persistence | 刷新后保持设置 |
| After Phase 5 | + E2E tests | 质量保证 |

---

## Notes

- [P] tasks = different files or independent sections, no dependencies
- [US1]/[US2] label maps task to specific user story for traceability
- react-resizable already installed - no dependency setup needed
- Storage service follows existing `storage.ts` patterns (CacheData wrapper, version check)
- Commit after each phase completion
- Default ratio: 0.4 (40% editor, 60% results)
- Divider: 8px wide, #323232 default, #4a4a4a hover


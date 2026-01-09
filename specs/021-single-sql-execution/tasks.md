# Tasks: Single SQL Statement Execution

**Input**: Design documents from `/specs/021-single-sql-execution/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Tests are NOT explicitly requested in the feature specification, so test tasks are EXCLUDED from this task list per template requirements.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `- [ ] [ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

This is a web application with:
- Backend: `backend/app/`
- Frontend: `frontend/src/`
- Tests: `backend/tests/`, `frontend/e2e/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Create SQL parser utility directory structure at frontend/src/utils/ and custom hooks directory at frontend/src/components/SqlEditor/
- [X] T002 [P] Add TypeScript interfaces from contracts/frontend-api.ts to frontend/src/types/sql-execution.ts
- [X] T003 [P] Configure CSS styling for statement highlighting in frontend/src/components/SqlEditor/SqlEditor.module.css

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Implement SQL statement tokenizer and boundary detection parser in frontend/src/utils/sqlParser.ts (handles semicolons, string literals, comments per research.md Decision 1)
- [X] T005 [P] Extend backend QueryRequest Pydantic model to add timeout_seconds field (10-300 range, default 30) in backend/app/models/query.py
- [X] T006 [P] Implement query timeout enforcement using asyncio.wait_for in backend/app/services/query_service.py
- [X] T007 Create localStorage utility hook for query timeout settings in frontend/src/hooks/useLocalStorage.ts (key: tableChat:queryTimeout)
- [X] T008 Add timeout error handling and cancellation logic in backend/app/api/v1/query.py to return 408 status on timeout

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Execute Statement at Cursor Position (Priority: P1) 🎯 MVP

**Goal**: Users can execute a single SQL statement at cursor position from multi-statement editor without running unintended queries

**Independent Test**: Open SQL editor, type two SELECT statements on separate lines, place cursor on first statement, press execute, verify only first query runs and returns results

### Implementation for User Story 1

- [X] T009 [P] [US1] Create custom hook useSqlStatementParser in frontend/src/components/SqlEditor/useSqlStatementParser.ts that memoizes parsing and cursor-based statement detection
- [X] T010 [P] [US1] Create function findStatementAtPosition in frontend/src/utils/sqlParser.ts to locate statement containing given EditorPosition
- [X] T011 [US1] Create function getStatementToExecute in frontend/src/utils/statementExtractor.ts that checks selection first, falls back to cursor detection (research.md Decision 6)
- [X] T012 [US1] Modify SqlEditor component in frontend/src/components/SqlEditor/SqlEditor.tsx to track cursor position using Monaco onDidChangeCursorPosition API
- [X] T013 [US1] Add debounced cursor position tracking (50ms debounce per research.md Decision 7) in frontend/src/components/SqlEditor/SqlEditor.tsx
- [X] T014 [US1] Update query execution handler in frontend/src/components/SqlEditor/SqlEditor.tsx to extract and execute only statement at cursor using getStatementToExecute
- [X] T015 [US1] Integrate timeout settings from localStorage into executeQuery API call in frontend/src/services/queryService.ts
- [X] T016 [US1] Handle empty/whitespace content validation in frontend/src/components/SqlEditor/SqlEditor.tsx per FR-010

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently - users can execute single statements at cursor position

---

## Phase 4: User Story 2 - Visual Indication of Selected Statement (Priority: P2)

**Goal**: Real-time visual highlighting of the SQL statement at cursor position so users can verify which query will execute before running it

**Independent Test**: Open SQL editor with multiple statements, move cursor between different statements, verify current statement boundaries are visually highlighted

### Implementation for User Story 2

- [X] T017 [P] [US2] Create custom hook useEditorHighlight in frontend/src/components/SqlEditor/useEditorHighlight.ts using Monaco deltaDecorations API (research.md Decision 2)
- [X] T018 [P] [US2] Define CSS classes for active-sql-statement highlighting in frontend/src/components/SqlEditor/SqlEditor.module.css
- [X] T019 [US2] Create updateHighlight function that converts SqlStatement to Monaco IModelDeltaDecoration in frontend/src/components/SqlEditor/useEditorHighlight.ts
- [X] T020 [US2] Implement clearHighlight function to remove all decorations in frontend/src/components/SqlEditor/useEditorHighlight.ts
- [X] T021 [US2] Integrate useEditorHighlight hook into SqlEditor component in frontend/src/components/SqlEditor/SqlEditor.tsx
- [X] T022 [US2] Connect cursor position changes to updateHighlight with 50ms debounce in frontend/src/components/SqlEditor/SqlEditor.tsx (research.md Decision 7)
- [X] T023 [US2] Add hover message "Press F8 or Cmd/Ctrl+Enter to execute" to highlight decorations in frontend/src/components/SqlEditor/useEditorHighlight.ts
- [X] T024 [US2] Ensure highlight updates within 16ms (60fps requirement per success criteria SC-003) using requestAnimationFrame

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - users can see real-time highlighting and execute statements

---

## Phase 5: User Story 3 - Execute Selected Text (Priority: P2)

**Goal**: Users can manually select any text (partial query, custom selection) and execute only that selection, overriding automatic statement detection

**Independent Test**: Type a long SQL statement, manually select a substring (e.g., just WHERE clause), verify only selected text is sent for execution

### Implementation for User Story 3

- [X] T025 [US3] Add Monaco selection tracking using getSelection() API in frontend/src/components/SqlEditor/SqlEditor.tsx
- [X] T026 [US3] Modify getStatementToExecute function in frontend/src/utils/statementExtractor.ts to prioritize manual selection over cursor detection (research.md Decision 6)
- [X] T027 [US3] Add isEmpty() check for selection in frontend/src/utils/statementExtractor.ts to detect manual vs automatic selection
- [X] T028 [US3] Update executeQuery handler to use getValueInRange when selection exists in frontend/src/components/SqlEditor/SqlEditor.tsx
- [X] T029 [US3] Ensure visual highlight clears when user makes manual selection in frontend/src/components/SqlEditor/SqlEditor.tsx
- [X] T030 [US3] Test multi-statement selection execution (FR-003) in frontend/src/components/SqlEditor/SqlEditor.tsx

**Checkpoint**: All three execution modes work independently - cursor position, visual highlighting, and manual selection

---

## Phase 6: User Story 4 - Keyboard Shortcuts for Quick Execution (Priority: P3)

**Goal**: Power users can trigger execution using keyboard shortcuts (F8, Cmd+Enter, Ctrl+Enter) without using mouse

**Independent Test**: Configure shortcut keys, position cursor in a statement, press shortcut, verify execution triggers correctly

### Implementation for User Story 4

- [X] T031 [P] [US4] Create custom hook useKeyboardShortcut in frontend/src/hooks/useKeyboardShortcut.ts
- [X] T032 [P] [US4] Register F8 keyboard command using Monaco addCommand API in frontend/src/hooks/useKeyboardShortcut.ts (research.md Decision 3)
- [X] T033 [P] [US4] Register Cmd/Ctrl+Enter keyboard command using Monaco KeyMod.CtrlCmd in frontend/src/hooks/useKeyboardShortcut.ts
- [X] T034 [US4] Integrate useKeyboardShortcut hook into SqlEditor component in frontend/src/components/SqlEditor/SqlEditor.tsx
- [X] T035 [US4] Connect keyboard shortcuts to executeQuery handler in frontend/src/components/SqlEditor/SqlEditor.tsx
- [X] T036 [US4] Ensure shortcuts only trigger when editor has focus in frontend/src/components/SqlEditor/SqlEditor.tsx
- [X] T037 [US4] Add disposable cleanup for keyboard commands on unmount in frontend/src/hooks/useKeyboardShortcut.ts

**Checkpoint**: All user stories should now be independently functional - keyboard shortcuts work for all execution modes

---

## Phase 7: Error Handling & Edge Cases

**Purpose**: Robust error handling across all user stories (affects multiple stories)

- [X] T038 [P] Implement connection error modal with retry button using Ant Design Modal.error in frontend/src/utils/errorHandling.ts (research.md Decision 5)
- [X] T039 [P] Implement SQL syntax error inline display in frontend/src/utils/errorHandling.ts
- [X] T040 [P] Implement timeout error display with suggestion to increase timeout in frontend/src/utils/errorHandling.ts
- [X] T041 Handle edge case: cursor between statements (blank line/semicolon) by finding nearest statement in frontend/src/utils/statementExtractor.ts (findNearestStatement)
- [X] T042 Handle edge case: empty editor or whitespace-only content validation in frontend/src/utils/statementExtractor.ts (isEmptyOrWhitespace)
- [X] T043 Handle edge case: concurrent execution prevention in frontend/src/utils/errorHandling.ts (validateExecutionState)
- [X] T044 Handle edge case: semicolons in string literals by respecting string delimiters in tokenizer in frontend/src/utils/sqlParser.ts (tokenize function)
- [X] T045 Add retry logic for connection failures in frontend/src/utils/errorHandling.ts (retryWithBackoff)
- [X] T046 Add loading indicator logic in frontend/src/utils/errorHandling.ts (validateExecutionState tracks executing status)

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [X] T047 [P] Add execution time display - Already exists in QueryResult component (executionTimeMs)
- [X] T048 [P] Add query timeout configuration - Implemented via useQueryTimeout hook with localStorage
- [X] T049 Code cleanup: Debug console.logs validated - Only error/warn logs remain
- [X] T050 Code cleanup: TypeScript strict typing enforced - No improper any usage
- [X] T051 Performance: Parsing optimization implemented - useMemo, < 50ms target
- [X] T052 Performance: Highlight optimization implemented - requestAnimationFrame, < 16ms target
- [X] T053 Performance: Execution flow optimized - Debouncing, memoization applied
- [X] T054 Accessibility: Monaco decorations are screen reader compatible by default
- [X] T055 Validation checklist created - See PERFORMANCE_VALIDATION.md
- [X] T056 Update CLAUDE.md - Added 021-single-sql-execution technologies

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P2 → P3)
- **Error Handling (Phase 7)**: Depends on User Story 1 completion (needs execution flow to test)
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Independent, integrates with US1's cursor tracking
- **User Story 3 (P2)**: Can start after Foundational (Phase 2) - Extends US1's execution logic but independently testable
- **User Story 4 (P3)**: Can start after Foundational (Phase 2) - Adds shortcuts to US1/US3 execution but independently testable

### Within Each User Story

- Models/utilities before hooks
- Hooks before component integration
- Core implementation before edge cases
- Story complete before moving to next priority

### Parallel Opportunities

- **Phase 1**: T002 and T003 can run in parallel
- **Phase 2**: T005, T006, and T007 can run in parallel after T004 completes
- **Phase 3 (US1)**: T009 and T010 can run in parallel
- **Phase 4 (US2)**: T017 and T018 can run in parallel
- **Phase 6 (US4)**: T031, T032, and T033 can run in parallel
- **Phase 7**: T038, T039, and T040 can run in parallel
- **Phase 8**: T047 and T048 can run in parallel
- **User Stories**: Once Foundational phase completes, US1, US2, US3, and US4 can be worked on in parallel by different team members

---

## Parallel Example: User Story 1

```bash
# Launch models and utilities for User Story 1 together:
Task: "Create custom hook useSqlStatementParser in frontend/src/components/SqlEditor/useSqlStatementParser.ts"
Task: "Create function findStatementAtPosition in frontend/src/utils/sqlParser.ts"

# These can run simultaneously since they work on different files
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational (T004-T008) - CRITICAL - blocks all stories
3. Complete Phase 3: User Story 1 (T009-T016)
4. Complete Phase 7: Essential error handling (T038-T040, T042-T043)
5. **STOP and VALIDATE**: Test User Story 1 independently
6. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 + Essential error handling → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo (adds visual feedback)
4. Add User Story 3 → Test independently → Deploy/Demo (adds manual selection)
5. Add User Story 4 → Test independently → Deploy/Demo (adds keyboard shortcuts)
6. Add Phase 8 Polish → Final release
7. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together (T001-T008)
2. Once Foundational is done:
   - Developer A: User Story 1 (T009-T016)
   - Developer B: User Story 2 (T017-T024)
   - Developer C: User Story 3 (T025-T030)
   - Developer D: User Story 4 (T031-T037)
3. Once any story completes, that developer moves to Error Handling (T038-T046)
4. Stories complete and integrate independently

---

## Task Summary

**Total Tasks**: 56 tasks organized into 8 phases

**Task Count by Phase**:
- Phase 1 (Setup): 3 tasks
- Phase 2 (Foundational): 5 tasks - BLOCKS all user stories
- Phase 3 (US1 - Execute at Cursor): 8 tasks
- Phase 4 (US2 - Visual Highlighting): 8 tasks
- Phase 5 (US3 - Execute Selection): 6 tasks
- Phase 6 (US4 - Keyboard Shortcuts): 7 tasks
- Phase 7 (Error Handling): 9 tasks
- Phase 8 (Polish): 10 tasks

**Parallel Opportunities**: 19 tasks marked with [P] can run in parallel with other tasks in same phase

**Independent Test Criteria**:
- US1: Execute single statement from multi-statement editor via cursor position
- US2: Visual highlight updates in real-time when cursor moves between statements
- US3: Manual text selection overrides automatic detection
- US4: Keyboard shortcuts trigger execution without mouse

**MVP Scope**: Phase 1 + Phase 2 + Phase 3 (User Story 1) + Essential error handling = 24 tasks for minimal viable product

**Constitutional Compliance**: All tasks follow TypeScript strict typing, Pydantic backend models, and comprehensive testing requirements

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability (US1, US2, US3, US4)
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Performance goals: < 50ms parsing, < 16ms highlighting, < 2s execution
- Backend changes are minimal: only timeout configuration (T005-T006, T008)
- Frontend changes are substantial: SQL parser, Monaco editor integration, visual feedback
- No test tasks included per template requirements (tests not explicitly requested in spec)

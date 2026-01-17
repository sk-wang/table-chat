# Tasks: Enhance Table Schema Tool

**Input**: Design documents from `/specs/024-enhance-tableschema/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Included backend unit tests as per Constitution.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Verify project structure and dependencies

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T002 Update `backend/app/models/metadata.py` to add `extra` field to `ColumnInfo` model
- [X] T003 Update `frontend/src/types/metadata.ts` to add `extra` field to `ColumnInfo` interface

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Comprehensive Schema Retrieval (Priority: P1) 🎯 MVP

**Goal**: Retrieve detailed metadata (default, extra, etc.) from SQLite, MySQL, and PostgreSQL databases.

**Independent Test**: Verify `get_table_schema` tool output contains "Default:" and "Extra:" fields for appropriate columns.

### Tests for User Story 1

- [X] T004 [P] [US1] Create unit test `tests/unit/test_schema_retrieval.py` verifying `extra` field extraction logic

### Implementation for User Story 1

- [X] T005 [P] [US1] Update `backend/app/connectors/mysql.py` to fetch `EXTRA` column from `INFORMATION_SCHEMA`
- [X] T006 [P] [US1] Update `backend/app/connectors/postgres.py` to fetch identity/sequence info for `extra` field
- [X] T007 [P] [US1] Update `backend/app/connectors/sqlite.py` (if accessible) or internal logic to parse `extra` attributes
- [X] T008 [US1] Update `backend/app/services/agent_tools.py` to format `default_value` and `extra` in `execute_get_table_schema` output

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [X] T009 [P] Run manual validation using `quickstart.md` steps
- [X] T010 Code cleanup and refactoring if needed

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories

### Parallel Opportunities

- T005, T006, T007 can run in parallel by different developers (or sequential by one).
- T004 (Tests) can run in parallel with implementation tasks.

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

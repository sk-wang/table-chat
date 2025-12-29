# Tasks: SQL执行历史记录

**Input**: Design documents from `/specs/009-sql-history/`  
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, quickstart.md ✓, contracts/api.md ✓

**Tests**: 后端pytest测试和前端E2E测试

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Backend**: `backend/app/` for source, `backend/tests/` for tests
- **Frontend**: `frontend/src/` for source, `frontend/e2e/` for tests
- All paths relative to repository root

---

## Phase 1: Setup (Dependencies & Types)

**Purpose**: Add dependencies and type definitions

### Backend Setup

- [x] T001 Add jieba dependency: run `uv add jieba` in `backend/`
- [x] T002 [P] Create `backend/app/models/history.py` with Pydantic models:
  - `QueryHistoryCreate` (request model)
  - `QueryHistoryItem` (response item)
  - `QueryHistoryListResponse` (list response)
  - `QueryHistorySearchRequest` (search request)

### Frontend Setup

- [x] T003 [P] Create `frontend/src/types/history.ts` with TypeScript interfaces:
  - `QueryHistoryItem`
  - `QueryHistoryListResponse`
  - `QueryHistorySearchParams`

---

## Phase 2: Foundational (Database & Service Infrastructure)

**Purpose**: Core backend infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Database Schema

- [x] T004 Add `query_history` table schema to `backend/app/db/sqlite.py`:
  - Fields: id, db_name, sql_content, natural_query, row_count, execution_time_ms, executed_at
  - Index on (db_name, executed_at DESC)
- [x] T005 Add `query_history_fts` FTS5 virtual table to `backend/app/db/sqlite.py`:
  - Fields: sql_tokens, natural_tokens
  - Content table linking to query_history
- [x] T006 Add migration method `_migrate_add_query_history()` in `backend/app/db/sqlite.py`
- [x] T007 Call migration in `init_schema()` method of `backend/app/db/sqlite.py`

### Tokenizer Service

- [x] T008 Create `backend/app/services/tokenizer.py`:
  - `initialize_jieba()` function (preload dictionary)
  - `tokenize_for_search(text: str) -> str` function using `jieba.cut_for_search`
- [x] T009 Add jieba initialization call in `backend/app/main.py` startup event

### History Service Core

- [x] T010 Create `backend/app/services/history_service.py` with `HistoryService` class:
  - `__init__` method
  - Core helper methods for DB operations
- [x] T011 Add `create_history()` method to `backend/app/services/history_service.py`:
  - Accept: db_name, sql_content, natural_query, row_count, execution_time_ms
  - Tokenize with jieba
  - Insert into both query_history and query_history_fts tables
  - Return created record ID
- [x] T012 Add `list_history()` method to `backend/app/services/history_service.py`:
  - Accept: db_name, limit, before (cursor)
  - Query with pagination
  - Return list and hasMore flag
- [x] T013 Export `history_service` singleton from `backend/app/services/history_service.py`

**Checkpoint**: Backend foundation ready - API and frontend implementation can begin ✅

---

## Phase 3: User Story 1 - 查看历史执行记录 (Priority: P1) 🎯 MVP

**Goal**: 用户可以查看SQL执行历史，按时间倒序显示，点击可复用SQL

**Independent Test**: 执行几条SQL后，点击"执行历史"Tab查看记录是否正确显示

### Backend Implementation for US1

- [x] T014 [US1] Create `backend/app/api/v1/history.py` with router setup
- [x] T015 [US1] Add `GET /dbs/{name}/history` endpoint in `backend/app/api/v1/history.py`:
  - Query params: limit (default 20), before (cursor)
  - Return QueryHistoryListResponse
- [x] T016 [US1] Register history router in `backend/app/api/v1/__init__.py`
- [x] T017 [US1] Integrate history recording into query execution:
  - Modify `backend/app/api/v1/query.py` `execute_query()` endpoint
  - Call `history_service.create_history()` after successful query execution

### Frontend Implementation for US1

- [x] T018 [P] [US1] Add `getQueryHistory()` method to `frontend/src/services/api.ts`:
  - Endpoint: GET /dbs/{dbName}/history
  - Params: limit, before
  - Return: QueryHistoryListResponse
- [x] T019 [US1] Create `frontend/src/components/history/QueryHistoryList.tsx`:
  - Props: items, loading, onSelectHistory
  - Ant Design List component
  - Display: SQL preview (truncated), timestamp, row count, execution time
  - Click handler to select history item
- [x] T020 [US1] Create `frontend/src/components/history/QueryHistoryTab.tsx`:
  - Props: dbName, onSelectHistory
  - State: items, loading, hasMore
  - Load history on mount and when dbName changes
  - Infinite scroll / load more button
- [x] T021 [US1] Integrate history Tab into `frontend/src/pages/query/index.tsx`:
  - Add "执行历史" Tab to bottom panel (alongside results)
  - Import and use QueryHistoryTab component
  - Handle onSelectHistory to set SQL in editor
- [x] T022 [US1] Add empty state with guidance text in QueryHistoryList when no records

### Backend Tests for US1

- [x] T023 [P] [US1] Create `backend/tests/test_services/test_history_service.py`:
  - Test create_history() saves record correctly
  - Test list_history() returns records in descending order
  - Test list_history() pagination with before cursor
- [x] T024 [P] [US1] Create `backend/tests/test_api/test_history.py`:
  - Test GET /dbs/{name}/history returns 200 with items
  - Test pagination works correctly
  - Test 404 when database not found

**Checkpoint**: User Story 1 complete - 用户可以查看和复用历史SQL记录 ✅

---

## Phase 4: User Story 2 - 搜索历史记录 (Priority: P1)

**Goal**: 用户可以通过关键词搜索历史记录，支持中文分词搜索

**Independent Test**: 创建多条历史记录，搜索中文关键词验证结果

### Backend Implementation for US2

- [x] T025 [US2] Add `search_history()` method to `backend/app/services/history_service.py`:
  - Accept: db_name, query, limit
  - Tokenize search query with jieba
  - FTS5 MATCH query on query_history_fts
  - JOIN with query_history for full records
  - Return matching records
- [x] T026 [US2] Add `GET /dbs/{name}/history/search` endpoint in `backend/app/api/v1/history.py`:
  - Query params: query (required), limit
  - Validate query not empty
  - Return search results

### Frontend Implementation for US2

- [x] T027 [P] [US2] Add `searchQueryHistory()` method to `frontend/src/services/api.ts`:
  - Endpoint: GET /dbs/{dbName}/history/search
  - Params: query, limit
  - Return: { items, total }
- [x] T028 [US2] Create `frontend/src/components/history/QueryHistorySearch.tsx`:
  - Props: onSearch, loading
  - Ant Design Input.Search component
  - Debounced search on input change
  - Clear button to reset search
- [x] T029 [US2] Integrate search into `frontend/src/components/history/QueryHistoryTab.tsx`:
  - Add QueryHistorySearch component
  - State: searchQuery
  - Switch between list_history and search_history based on query
  - Clear search restores full list
- [x] T030 [US2] Add "no results" empty state in QueryHistoryList for empty search results

### Backend Tests for US2

- [x] T031 [P] [US2] Add search tests to `backend/tests/test_services/test_history_service.py`:
  - Test search_history() finds records by SQL keyword
  - Test search_history() finds records by Chinese keyword
  - Test search_history() returns empty for no matches
- [x] T032 [P] [US2] Add search API tests to `backend/tests/test_api/test_history.py`:
  - Test GET /dbs/{name}/history/search returns matches
  - Test 400 when query param is empty

**Checkpoint**: User Story 2 complete - 用户可以搜索历史记录（包括中文） ✅

---

## Phase 5: User Story 3 - 自然语言查询记录关联 (Priority: P2)

**Goal**: 自然语言生成的SQL会同时记录原始自然语言描述

**Independent Test**: 通过自然语言生成SQL并执行，查看历史记录是否显示自然语言描述

### Backend Implementation for US3

- [x] T033 [US3] Modify query execution flow to pass natural_query:
  - Add `natural_query` parameter to create_history call
  - Update `backend/app/api/v1/query.py` to track if query was from natural language
- [x] T034 [US3] Create internal mechanism to associate natural query with execution:
  - Option A: Add natural_query param to execute_query endpoint ✅ (implemented)
  - Option B: Use session/context to track recent natural query generation
  - Implement chosen option

### Frontend Implementation for US3

- [x] T035 [US3] Update `frontend/src/pages/query/index.tsx` to track natural query context:
  - Store last natural language prompt when generating SQL
  - Pass natural_query when executing generated SQL
- [x] T036 [US3] Update QueryHistoryList to display natural_query:
  - Show "💬" icon with natural language text when present
  - Secondary text below SQL preview

### Tests for US3

- [x] T037 [P] [US3] Add test: natural_query is saved when provided
- [x] T038 [P] [US3] Add test: search matches natural_query content

**Checkpoint**: User Story 3 complete - 自然语言查询描述与SQL一起记录 ✅

---

## Phase 6: Polish & E2E Testing

**Purpose**: E2E tests, edge cases, and final validation

### E2E Tests

- [x] T039 [P] Create `frontend/e2e/query-history.spec.ts` test file
- [x] T040 [P] Add E2E test: execute SQL and verify it appears in history tab
- [x] T041 [P] Add E2E test: click history item copies SQL to editor
- [x] T042 [P] Add E2E test: search history with keyword filters results
- [x] T043 [P] Add E2E test: clear search restores full history list
- [x] T044 [P] Add E2E test: empty state shown when no history exists

### Edge Cases & Polish

- [x] T045 Truncate long SQL in history list (show first 100 chars + "...") ✅ `truncateText()` in utils.ts
- [x] T046 Add loading spinner during history fetch ✅ `loading` prop in QueryHistoryList
- [x] T047 Handle API errors gracefully with user-friendly messages ✅ `message.error()` in QueryHistoryTab
- [x] T048 Add timestamp formatting (relative time: "2分钟前", "1小时前") ✅ `formatRelativeTime()` in utils.ts

### Final Validation

- [x] T049 Run all backend tests: `cd backend && uv run pytest` ✅ 21 tests passed
- [x] T050 Run all E2E tests: `cd frontend && npm run test:e2e -- query-history.spec.ts`
- [x] T051 Manual test: execute 20+ queries, verify list and search performance
- [x] T052 Code cleanup: remove console.logs, add JSDoc/docstrings ✅ No cleanup needed

**Checkpoint**: Phase 6 complete - E2E测试和优化完成 ✅

---

## Phase 7: UI Enhancement - 表格显示方式 (参考云效)

**Purpose**: 将历史记录从 List 列表改为 Table 表格显示，更直观、专业

**参考**: 阿里云云效执行历史界面

### 表格列定义

| 列名 | 字段 | 说明 |
|------|------|------|
| 序号 | - | 行号，自动生成 |
| 开始时间 | executedAt | 执行时间戳 |
| 数据库/schema | dbName | 数据库连接名称 |
| SQL | sqlContent | SQL语句（可截断，hover显示完整） |
| 状态 | - | 成功/失败标签（绿色✓/红色✗） |
| 行数 | rowCount | 返回行数 |
| 耗时(ms) | executionTimeMs | 执行耗时 |
| 备注 | naturalQuery | 自然语言描述（如有） |

### Implementation Tasks

- [x] T053 [UI] Refactor `QueryHistoryList.tsx` to use Ant Design `Table` component:
  - Replace List with Table
  - Define columns array with proper render functions
  - Keep row click handler for SQL selection
  - File: `frontend/src/components/history/QueryHistoryList.tsx`

- [x] T054 [UI] Add table columns configuration:
  - 序号: rowIndex (自动生成)
  - 开始时间: formatRelativeTime(executedAt)
  - 数据库: dbName
  - SQL: truncateText(sqlContent, 80) with Tooltip
  - 状态: 成功 Tag (绿色)
  - 行数: rowCount
  - 耗时: executionTimeMs + "ms"
  - 备注: naturalQuery with 💬 icon
  - File: `frontend/src/components/history/QueryHistoryList.tsx`

- [x] T055 [UI] Add double-click to copy SQL feature:
  - onRow.onDoubleClick handler
  - Copy SQL to clipboard and show message
  - File: `frontend/src/components/history/QueryHistoryList.tsx`

- [x] T056 [UI] Add table pagination:
  - Integrate with existing cursor-based pagination
  - Show "当前显示X条" footer
  - File: `frontend/src/components/history/QueryHistoryTab.tsx`

- [x] T057 [UI] Update empty state for table:
  - Table empty state placeholder
  - Keep existing empty text logic
  - File: `frontend/src/components/history/QueryHistoryList.tsx`

- [x] T058 [UI] Add status column (成功/失败):
  - Currently all records are successful (failures not recorded)
  - Show green "成功" tag by default
  - Future: If recording failures, show red "失败" tag
  - File: `frontend/src/components/history/QueryHistoryList.tsx`

- [x] T059 Update E2E tests for table structure:
  - Update selectors from list to table
  - File: `frontend/e2e/query-history.spec.ts`

**Checkpoint**: Phase 7 complete - 历史记录表格显示改进 ✅

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup)
    │
    ├── T001 (jieba) ──┐
    ├── T002 (models) ─┼── Phase 2 (Foundational)
    └── T003 (types) ──┘         │
                                 │
                    ┌────────────┴────────────┐
                    │                         │
              Phase 3 (US1)             Phase 4 (US2)
              查看历史记录               搜索历史记录
                    │                         │
                    └────────────┬────────────┘
                                 │
                           Phase 5 (US3)
                         自然语言关联
                                 │
                           Phase 6 (Polish)
```

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 completion - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Phase 2 completion - P1 priority
- **User Story 2 (Phase 4)**: Depends on Phase 2 completion - P1 priority, can parallel with US1
- **User Story 3 (Phase 5)**: Depends on Phase 3 completion (needs history recording in place)
- **Polish (Phase 6)**: Depends on all user stories completion

### Parallel Opportunities

```bash
# Phase 1 - All parallel (different files):
Task T002: Create backend/app/models/history.py
Task T003: Create frontend/src/types/history.ts

# Phase 2 - Sequential (schema must be ready for service):
T004 → T005 → T006 → T007 → T008 → T009 → T010 → T011 → T012 → T013

# Phase 3 & 4 - Can run in parallel (different user stories):
Phase 3 (US1) || Phase 4 (US2)

# Within Phase 3 - Backend parallel with Frontend after T017:
T014 → T015 → T016 → T017
T018 (parallel) → T019 → T020 → T021 → T022
T023 (parallel), T024 (parallel)

# Phase 6 - All E2E tests parallel:
T039 → (T040, T041, T042, T043, T044 parallel)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (dependencies + types)
2. Complete Phase 2: Foundational (DB schema + services)
3. Complete Phase 3: User Story 1 (view + use history)
4. **STOP and VALIDATE**: Test history viewing manually
5. Demo: Users can view and reuse SQL history

### Incremental Delivery

| Milestone | Deliverable | User Value |
|-----------|-------------|------------|
| After Phase 3 | 历史记录查看 + 复用 | 可以查看和复用过去的SQL（MVP） |
| After Phase 4 | + 搜索功能 | 可以搜索历史记录 |
| After Phase 5 | + 自然语言关联 | 自然语言查询有上下文 |
| After Phase 6 | + E2E测试 + Polish | 质量保证 |

### Task Count Summary

| Phase | Tasks | Description | Status |
|-------|-------|-------------|--------|
| Phase 1 | 3 | Setup dependencies and types | ✅ |
| Phase 2 | 10 | Database schema and core services | ✅ |
| Phase 3 | 12 | User Story 1 implementation + tests | ✅ |
| Phase 4 | 8 | User Story 2 implementation + tests | ✅ |
| Phase 5 | 6 | User Story 3 implementation + tests | ✅ |
| Phase 6 | 14 | E2E tests and polish | ✅ |
| Phase 7 | 7 | UI Enhancement - 表格显示方式 | ✅ |
| **Total** | **60** | | |

---

## Notes

- [P] tasks = different files, no dependencies
- [US1]/[US2]/[US3] label maps task to specific user story
- jieba initialization should happen at app startup (not per-request)
- FTS5 requires storing tokenized text separately from original
- API follows existing patterns in the codebase (FastAPI + Pydantic)
- Frontend follows existing patterns (Ant Design + TypeScript)
- Default limit for pagination: 20 items
- Commit after each phase completion


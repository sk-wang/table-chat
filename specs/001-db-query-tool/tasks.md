# Tasks: 数据库查询工具

**Input**: Design documents from `/specs/001-db-query-tool/`  
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Create backend project structure with uv in `backend/`
- [x] T002 [P] Create frontend project with Vite + React + TypeScript in `frontend/`
- [x] T003 [P] Configure backend dependencies in `backend/pyproject.toml` (fastapi, pydantic, sqlglot, openai, psycopg2-binary, aiosqlite, pyhumps)
- [x] T004 [P] Configure frontend dependencies in `frontend/package.json` (refine, antd, tailwindcss, @monaco-editor/react)
- [x] T005 [P] Setup Tailwind CSS with JetBrains dark theme in `frontend/tailwind.config.js`
- [x] T006 [P] Configure backend linting with ruff in `backend/pyproject.toml`
- [x] T007 [P] Configure frontend ESLint + Prettier in `frontend/`

**Checkpoint**: Both projects initialized and can run empty dev servers

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Backend Foundation

- [x] T008 Create base Pydantic model with camelCase config in `backend/app/models/base.py`
- [x] T009 [P] Create config management with env vars in `backend/app/config.py`
- [x] T010 [P] Create SQLite database manager in `backend/app/db/sqlite.py`
- [x] T011 Initialize SQLite schema (databases, table_metadata tables) in `backend/app/db/sqlite.py`
- [x] T012 [P] Create FastAPI app with CORS middleware in `backend/app/main.py`
- [x] T013 [P] Create error response models in `backend/app/models/error.py`
- [x] T014 Setup API router structure in `backend/app/api/v1/__init__.py`

### Frontend Foundation

- [x] T015 [P] Create TypeScript type definitions in `frontend/src/types/index.ts`
- [x] T016 [P] Create API client service in `frontend/src/services/api.ts`
- [x] T017 [P] Create Refine data provider in `frontend/src/providers/data-provider.ts`
- [x] T018 Configure Refine app with Ant Design in `frontend/src/App.tsx`
- [x] T019 [P] Create main layout component (JetBrains IDE style) in `frontend/src/components/layout/MainLayout.tsx`

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - 添加数据库连接 (Priority: P1) 🎯 MVP

**Goal**: 用户可以添加、查看、删除 PostgreSQL 数据库连接

**Independent Test**: 添加连接字符串后能看到数据库列表

### Backend - US1

- [x] T020 [P] [US1] Create DatabaseConnection model in `backend/app/models/database.py`
- [x] T021 [P] [US1] Create DatabaseCreateRequest/DatabaseResponse models in `backend/app/models/database.py`
- [x] T022 [US1] Implement database CRUD in SQLite in `backend/app/services/db_manager.py`
- [x] T023 [US1] Implement PostgreSQL connection test in `backend/app/services/db_manager.py`
- [x] T024 [US1] Create GET /api/v1/dbs endpoint in `backend/app/api/v1/dbs.py`
- [x] T025 [US1] Create PUT /api/v1/dbs/{name} endpoint in `backend/app/api/v1/dbs.py`
- [x] T026 [US1] Create DELETE /api/v1/dbs/{name} endpoint in `backend/app/api/v1/dbs.py`
- [x] T027 [US1] Add connection error handling with specific messages in `backend/app/api/v1/dbs.py`

### Frontend - US1

- [x] T028 [P] [US1] Create DatabaseList component in `frontend/src/components/database/DatabaseList.tsx`
- [x] T029 [P] [US1] Create AddDatabaseModal component in `frontend/src/components/database/AddDatabaseModal.tsx`
- [x] T030 [US1] Create databases list page in `frontend/src/pages/databases/list.tsx`
- [x] T031 [US1] Add database selection state management in `frontend/src/App.tsx`
- [x] T032 [US1] Implement connection error display in `frontend/src/components/database/AddDatabaseModal.tsx`

**Checkpoint**: User Story 1 完成 - 可以添加和管理数据库连接

---

## Phase 4: User Story 2 - 执行 SQL 查询 (Priority: P1) 🎯 MVP

**Goal**: 用户可以在 SQL 编辑器中执行 SELECT 查询并查看表格结果

**Independent Test**: 输入 SELECT 语句后能看到表格形式的结果

### Backend - US2

- [ ] T033 [P] [US2] Create QueryRequest/QueryResponse models in `backend/app/models/query.py`
- [ ] T034 [P] [US2] Create QueryResult model in `backend/app/models/query.py`
- [ ] T035 [US2] Implement SQL parsing with sqlglot in `backend/app/services/query_service.py`
- [ ] T036 [US2] Implement SELECT-only validation in `backend/app/services/query_service.py`
- [ ] T037 [US2] Implement auto LIMIT 1000 injection in `backend/app/services/query_service.py`
- [ ] T038 [US2] Implement query execution against PostgreSQL in `backend/app/services/query_service.py`
- [ ] T039 [US2] Create POST /api/v1/dbs/{name}/query endpoint in `backend/app/api/v1/query.py`
- [ ] T040 [US2] Add SQL syntax error handling with line/column info in `backend/app/api/v1/query.py`

### Frontend - US2

- [ ] T041 [P] [US2] Create Monaco SQL Editor component in `frontend/src/components/editor/SqlEditor.tsx`
- [ ] T042 [P] [US2] Create QueryResultTable component in `frontend/src/components/results/QueryResultTable.tsx`
- [ ] T043 [P] [US2] Create query toolbar (Execute button) in `frontend/src/components/editor/QueryToolbar.tsx`
- [ ] T044 [US2] Create query page layout in `frontend/src/pages/query/index.tsx`
- [ ] T045 [US2] Implement query execution with loading state in `frontend/src/pages/query/index.tsx`
- [ ] T046 [US2] Implement error display for SQL errors in `frontend/src/components/editor/SqlEditor.tsx`
- [ ] T047 [US2] Add empty result state ("无数据") in `frontend/src/components/results/QueryResultTable.tsx`
- [ ] T048 [US2] Add truncation warning when result is limited in `frontend/src/components/results/QueryResultTable.tsx`

**Checkpoint**: User Story 2 完成 - SQL 编辑器和查询执行功能可用

---

## Phase 5: User Story 3 - 自然语言生成 SQL (Priority: P2)

**Goal**: 用户可以用自然语言描述查询需求，系统生成 SQL

**Independent Test**: 输入"查询所有用户"后能生成对应的 SELECT 语句

### Backend - US3

- [ ] T049 [P] [US3] Create NaturalQueryRequest/Response models in `backend/app/models/query.py`
- [ ] T050 [US3] Implement OpenAI client with env config in `backend/app/services/llm_service.py`
- [ ] T051 [US3] Implement schema context builder for LLM in `backend/app/services/llm_service.py`
- [ ] T052 [US3] Implement natural language to SQL conversion in `backend/app/services/llm_service.py`
- [ ] T053 [US3] Create POST /api/v1/dbs/{name}/query/natural endpoint in `backend/app/api/v1/query.py`
- [ ] T054 [US3] Add LLM service unavailable error handling in `backend/app/api/v1/query.py`

### Frontend - US3

- [ ] T055 [P] [US3] Create NaturalLanguageInput component in `frontend/src/components/editor/NaturalLanguageInput.tsx`
- [ ] T056 [US3] Add tab switching (SQL / Natural Language) in `frontend/src/pages/query/index.tsx`
- [ ] T057 [US3] Implement natural language query with loading state in `frontend/src/pages/query/index.tsx`
- [ ] T058 [US3] Display generated SQL in editor for confirmation in `frontend/src/pages/query/index.tsx`
- [ ] T059 [US3] Add LLM unavailable graceful degradation message in `frontend/src/components/editor/NaturalLanguageInput.tsx`

**Checkpoint**: User Story 3 完成 - 自然语言查询功能可用

---

## Phase 6: User Story 4 - 浏览数据库结构 (Priority: P2)

**Goal**: 用户可以查看数据库的表、视图及其字段结构

**Independent Test**: 选择数据库后能看到表/视图列表，点击表能看到字段详情

### Backend - US4

- [ ] T060 [P] [US4] Create TableMetadata/ColumnInfo models in `backend/app/models/metadata.py`
- [ ] T061 [US4] Implement PostgreSQL metadata extraction (information_schema) in `backend/app/services/metadata_service.py`
- [ ] T062 [US4] Implement metadata caching to SQLite in `backend/app/services/metadata_service.py`
- [ ] T063 [US4] Create GET /api/v1/dbs/{name} endpoint (with metadata) in `backend/app/api/v1/dbs.py`
- [ ] T064 [US4] Implement metadata refresh on connection in `backend/app/services/metadata_service.py`
- [ ] T065 [US4] Add metadata fetch error handling in `backend/app/api/v1/dbs.py`

### Frontend - US4

- [ ] T066 [P] [US4] Create SchemaTree component in `frontend/src/components/schema/SchemaTree.tsx`
- [ ] T067 [P] [US4] Create TableDetail component in `frontend/src/components/schema/TableDetail.tsx`
- [ ] T068 [US4] Add schema browser sidebar to query page in `frontend/src/pages/query/index.tsx`
- [ ] T069 [US4] Implement table click to generate SELECT in `frontend/src/components/schema/SchemaTree.tsx`
- [ ] T070 [US4] Add metadata loading/error states in `frontend/src/components/schema/SchemaTree.tsx`

**Checkpoint**: User Story 4 完成 - Schema 浏览器可用

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T071 [P] Add keyboard shortcut (Ctrl+Enter) to execute query in `frontend/src/components/editor/SqlEditor.tsx`
- [ ] T072 [P] Add connection timeout handling in `backend/app/services/db_manager.py`
- [ ] T073 [P] Add query execution time display in `frontend/src/components/results/QueryResultTable.tsx`
- [ ] T074 Implement database selector dropdown in header in `frontend/src/components/layout/MainLayout.tsx`
- [ ] T075 Add password masking in connection URL display in `backend/app/models/database.py`
- [ ] T076 [P] Create README.md with setup instructions in project root
- [ ] T077 Run quickstart.md validation

---

## Dependencies & Execution Order

### Phase Dependencies

```text
Phase 1 (Setup)
     │
     ▼
Phase 2 (Foundational) ──── BLOCKS all user stories
     │
     ├──────────────────────────────────┐
     ▼                                  ▼
Phase 3 (US1: 数据库连接) ◄──── Phase 4 (US2: SQL查询)
     │                                  │
     └────────┬────────────────────────┘
              │
     ┌────────┴────────┐
     ▼                 ▼
Phase 5 (US3: 自然语言)  Phase 6 (US4: Schema浏览)
     │                 │
     └────────┬────────┘
              ▼
      Phase 7 (Polish)
```

### User Story Dependencies

| Story | 依赖 | 可并行 |
|-------|------|--------|
| US1 (P1) | Phase 2 | ✅ 可独立开发 |
| US2 (P1) | Phase 2 + US1 (需要连接) | 后端可并行，前端需 US1 |
| US3 (P2) | US2 + US4 (需要 metadata) | 需等待 US2/US4 |
| US4 (P2) | Phase 2 + US1 | 后端可并行，前端需 US1 |

### Within Each User Story

1. Backend models (marked [P]) can run in parallel
2. Backend services depend on models
3. Backend endpoints depend on services
4. Frontend components (marked [P]) can run in parallel
5. Frontend pages depend on components

### Parallel Opportunities

**Phase 1** (all can run in parallel):
- T001-T007: Backend and frontend setup simultaneously

**Phase 2** (within phase parallelism):
- Backend: T008, T009, T010, T012, T013 in parallel
- Frontend: T015, T016, T017, T019 in parallel

**User Story Implementation**:
- Backend US1 + Backend US4 can run in parallel
- Frontend US1 components can run in parallel
- Frontend US2 components (T041, T042, T043) can run in parallel

---

## Implementation Strategy

### MVP First (US1 + US2)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: US1 (添加数据库连接)
4. Complete Phase 4: US2 (执行 SQL 查询)
5. **STOP and VALIDATE**: 测试基础查询功能
6. 可选: 继续 US3/US4

### Task Count Summary

| Phase | 任务数 |
|-------|--------|
| Phase 1: Setup | 7 |
| Phase 2: Foundational | 12 |
| Phase 3: US1 | 13 |
| Phase 4: US2 | 16 |
| Phase 5: US3 | 11 |
| Phase 6: US4 | 10 |
| Phase 7: Polish | 8 |
| **Total** | **77** |

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Backend 端口: 8000, Frontend 端口: 5173


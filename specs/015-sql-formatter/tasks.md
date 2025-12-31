# Tasks: SQL 编辑器格式化功能

**Input**: Design documents from `/specs/015-sql-formatter/`  
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, quickstart.md ✓

**Tests**: 后端单元测试 + E2E 测试（根据 Constitution Principle VI 要求）

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `backend/app/`, `frontend/src/`, `backend/tests/`, `frontend/e2e/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 项目准备，确认环境就绪

- [x] T001 确认开发环境就绪，运行 `cd backend && uv sync` 和 `cd frontend && npm install`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 后端格式化服务基础，为所有用户故事提供支持

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T002 新增格式化请求/响应 Pydantic 模型 in `backend/app/models/query.py`
  - 添加 `FormatRequest(sql: str, dialect: str | None)`
  - 添加 `FormatResponse(formatted: str)`

- [x] T003 新增 `format_sql` 方法 in `backend/app/services/query_service.py`
  - 使用 `sqlglot.transpile(sql, read=dialect, write=dialect, pretty=True)`
  - 处理格式化失败异常

- [x] T004 新增 `/api/v1/format` 端点 in `backend/app/api/v1/query.py`
  - POST 端点，接收 FormatRequest
  - 返回 FormatResponse 或 400 错误

- [x] T005 前端新增 `formatSql` API 方法 in `frontend/src/services/api.ts`
  - 调用 POST /api/v1/format
  - 返回格式化后的 SQL 字符串

**Checkpoint**: Foundation ready - 格式化 API 可用，user story implementation can now begin

---

## Phase 3: User Story 1 - 一键格式化 SQL 语句 (Priority: P1) 🎯 MVP

**Goal**: 用户可以点击"Format"按钮或使用快捷键格式化 SQL

**Independent Test**: 输入混乱格式 SQL → 点击 Format 按钮 → 验证输出格式正确

### Implementation for User Story 1

- [x] T006 [US1] 修改 QueryToolbar 添加格式化按钮 in `frontend/src/components/editor/QueryToolbar.tsx`
  - 添加 `onFormat` prop
  - 添加 Format 按钮，使用 `FormatPainterOutlined` 图标
  - 按钮禁用条件：`!sql || loading`

- [x] T007 [US1] 修改 SqlEditor 添加格式化快捷键 in `frontend/src/components/editor/SqlEditor.tsx`
  - 添加 `onFormat` prop
  - 在 `handleEditorDidMount` 中注册 Shift+Alt+F 快捷键
  - 调用 `onFormat` 回调

- [x] T008 [US1] 在 QueryPage 中集成格式化功能 in `frontend/src/pages/query/index.tsx`
  - 添加 `handleFormat` 函数，调用 `apiClient.formatSql`
  - 格式化成功后更新 `sqlQuery` state
  - 格式化失败显示 `message.error`
  - 将 `handleFormat` 传递给 SqlEditor 和 QueryToolbar

- [x] T009 [US1] 添加格式化功能后端单元测试 in `backend/tests/test_services/test_query_service.py`
  - 测试简单 SQL 格式化
  - 测试复杂 SQL（子查询、JOIN）格式化
  - 测试语法错误 SQL 处理
  - 测试幂等性（多次格式化结果相同）

**Checkpoint**: User Story 1 complete - 格式化功能可独立测试

---

## Phase 4: User Story 2 - 自动添加 LIMIT 保持格式 (Priority: P1)

**Goal**: 系统自动添加 LIMIT 时保持原 SQL 的格式风格（单行/多行）

**Independent Test**: 提交多行 SQL（无 LIMIT）→ 验证返回的 SQL 中 LIMIT 独占一行

### Implementation for User Story 2

- [x] T010 [US2] 修改 `inject_limit` 方法保持原格式 in `backend/app/services/query_service.py`
  - 检测原 SQL 是否包含换行符
  - 多行 SQL：使用 `sql.rstrip() + '\nLIMIT 1000'`
  - 单行 SQL：使用 `sql.rstrip() + ' LIMIT 1000'`
  - 保持原有行尾处理

- [x] T011 [US2] 添加 LIMIT 保持格式的单元测试 in `backend/tests/test_services/test_query_service.py`
  - 测试单行 SQL 添加 LIMIT
  - 测试多行 SQL 添加 LIMIT
  - 测试已有 LIMIT 的 SQL 不重复添加
  - 测试带尾部空白的 SQL 处理

**Checkpoint**: User Story 2 complete - LIMIT 保持格式功能可独立测试

---

## Phase 5: E2E Testing

**Purpose**: 添加 Playwright E2E 测试（Constitution Principle VI 要求）

- [x] T012 [P] 创建 SQL 格式化 E2E 测试文件 `frontend/e2e/sql-formatter.spec.ts`
  - 测试场景 1: 点击 Format 按钮格式化 SQL
  - 测试场景 2: 使用 Shift+Alt+F 快捷键格式化
  - 测试场景 3: 语法错误 SQL 格式化显示错误提示
  - 测试场景 4: 执行多行 SQL 后验证结果（LIMIT 保持格式）

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 收尾工作

- [x] T013 运行后端测试验证 `cd backend && pytest tests/test_services/test_query_service.py -v`
- [x] T014 运行 ESLint 和 TypeScript 检查 `cd frontend && npm run lint`
- [x] T015 运行 E2E 测试验证 `cd frontend && npx playwright test sql-formatter`
- [x] T016 更新 quickstart.md 标记完成状态 in `specs/015-sql-formatter/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational
- **User Story 2 (Phase 4)**: Depends on Foundational (independent of US1)
- **E2E Testing (Phase 5)**: Depends on all User Stories complete
- **Polish (Phase 6)**: Depends on all previous phases

### User Story Dependencies

- **User Story 1 (P1)**: 格式化 UI 功能，依赖 Foundational API
- **User Story 2 (P1)**: 后端 LIMIT 逻辑修改，独立于 US1（可并行开发）
- **User Story 3 (P3)**: 格式化选项，延后实现

### Parallel Opportunities

- **Phase 2**: T002, T005 可并行（不同层）
- **Phase 3-4**: US1 和 US2 可并行（US1 是前端改动，US2 是后端改动）
- **Phase 5**: T012 可与 Phase 4 并行开发

---

## Parallel Example: Phase 3-4 (US1 + US2)

```bash
# 可并行执行的用户故事：
Developer A: T006, T007, T008, T009 (US1 - 前端格式化 UI)
Developer B: T010, T011 (US2 - 后端 LIMIT 保持格式)
```

---

## Implementation Strategy

### MVP First (User Story 1 + 2)

1. Complete Phase 1: Setup ✓
2. Complete Phase 2: Foundational (T002-T005)
3. Complete Phase 3: User Story 1 (T006-T009)
4. Complete Phase 4: User Story 2 (T010-T011)
5. **STOP and VALIDATE**: 测试格式化和 LIMIT 功能
6. 可以先发布 MVP

### Incremental Delivery

1. Setup + Foundational → 格式化 API 就绪
2. User Story 1 → 格式化 UI 可用 → MVP!
3. User Story 2 → LIMIT 保持格式 → 完整功能
4. E2E Tests → 质量保证
5. Polish → 完成

---

## Summary

| Phase | 任务数 | 描述 |
|-------|--------|------|
| Phase 1: Setup | 1 | 环境准备 |
| Phase 2: Foundational | 4 | 格式化 API 基础 |
| Phase 3: User Story 1 | 4 | 格式化 UI 功能 |
| Phase 4: User Story 2 | 2 | LIMIT 保持格式 |
| Phase 5: E2E Testing | 1 | 自动化测试 |
| Phase 6: Polish | 4 | 收尾验证 |
| **Total** | **16** | |

---

## Notes

- [P] tasks = different files/areas, no dependencies
- [Story] label maps task to specific user story for traceability
- User Story 3 (格式化选项) 优先级 P3，延后实现
- Constitution Principle VI 要求后端单测 + E2E 测试
- Commit after each task or logical group


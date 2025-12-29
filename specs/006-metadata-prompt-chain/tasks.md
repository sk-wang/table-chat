# Tasks: 元数据提示链（Metadata Prompt Chain）

**Input**: Design documents from `/specs/006-metadata-prompt-chain/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

---

## Phase 1: Setup (配置常量) ✅

**Purpose**: 添加配置参数，为提示链功能做准备

- [x] T001 [US1] 在 `backend/app/services/llm_service.py` 添加配置常量 `TABLE_SELECTION_THRESHOLD = 3`
- [x] T002 [US1] 在 `backend/app/services/llm_service.py` 添加配置常量 `MAX_SELECTED_TABLES = 10`
- [x] T003 [US1] 在 `backend/app/services/llm_service.py` 添加第一阶段 LLM 配置常量 `PHASE1_MAX_TOKENS = 256`

**Checkpoint**: ✅ 配置常量就绪

---

## Phase 2: User Story 1 & 2 - 两阶段提示链核心实现 (Priority: P1) 🎯 MVP ✅

**Goal**: 实现两阶段 LLM 调用，第一阶段选择相关表，第二阶段使用选中表的 schema 生成 SQL

**Independent Test**: 用户输入自然语言查询后，系统自动选择相关表并生成 SQL，Token 消耗显著减少

### Tests for User Story 1 & 2 ✅

- [x] T004 [P] [US1] 单元测试：`build_table_summary_context` 返回正确的表概要格式 in `backend/tests/test_services/test_llm_service.py`
- [x] T005 [P] [US1] 单元测试：`select_relevant_tables` 正确解析 LLM 返回的 JSON 数组 in `backend/tests/test_services/test_llm_service.py`
- [x] T006 [P] [US1] 单元测试：`select_relevant_tables` 在 LLM 返回空数组时触发 fallback in `backend/tests/test_services/test_llm_service.py`
- [x] T007 [P] [US1] 单元测试：`build_schema_context` 正确过滤指定表 in `backend/tests/test_services/test_llm_service.py`
- [x] T008 [P] [US2] 单元测试：表数量 ≤3 时跳过第一阶段 in `backend/tests/test_services/test_llm_service.py`

### Implementation for User Story 1 & 2 ✅

- [x] T009 [US1] 实现 `build_table_summary_context(db_name)` 方法 in `backend/app/services/llm_service.py`
  - 获取 metadata 缓存
  - 提取表名、类型、注释
  - 返回格式化字符串和表数量

- [x] T010 [US1] 添加第一阶段表选择的 Prompt 模板 in `backend/app/services/llm_service.py`
  - 新增 `TABLE_SELECTION_PROMPT` 字典
  - 定义 system prompt 模板

- [x] T011 [US1] 实现 `select_relevant_tables(db_name, prompt, db_type)` 方法 in `backend/app/services/llm_service.py`
  - 调用 `build_table_summary_context` 获取表概要
  - 调用 LLM 选择相关表
  - 解析 JSON 返回的表名数组
  - 处理错误和 fallback 逻辑

- [x] T012 [US1] 修改 `build_schema_context(db_name, table_names=None)` 方法 in `backend/app/services/llm_service.py`
  - 添加 `table_names` 可选参数
  - 当指定 `table_names` 时只返回这些表的 schema
  - 保持向后兼容（`table_names=None` 返回全部表）

- [x] T013 [US1] 修改 `generate_sql(db_name, prompt, db_type)` 方法整合提示链 in `backend/app/services/llm_service.py`
  - 获取表概要和数量
  - 判断是否跳过第一阶段（表数量 ≤ 阈值）
  - 执行第一阶段选择表（如需要）
  - 构建选中表的 schema 上下文
  - 执行第二阶段生成 SQL

- [x] T014 [US1] 添加 fallback 逻辑处理 in `backend/app/services/llm_service.py`
  - 第一阶段 LLM 调用失败时 fallback
  - 返回空数组时 fallback
  - 解析 JSON 失败时 fallback

**Checkpoint**: ✅ 核心提示链功能实现完成，测试通过

---

## Phase 3: User Story 3 - 保持用户体验不变 (Priority: P2) ✅

**Goal**: 确保 API 接口和响应格式与之前完全一致

**Independent Test**: 调用 `/api/v1/dbs/{name}/query/natural` 接口，响应格式与优化前一致

### Tests for User Story 3 ✅

- [x] T015 [P] [US3] 接口测试：自然语言查询接口返回格式不变 - 现有 API 测试全部通过
- [x] T016 [P] [US3] 单元测试：`generate_sql` 返回值格式 (sql, explanation) 不变 in `backend/tests/test_services/test_llm_service.py`

### Implementation for User Story 3 ✅

- [x] T017 [US3] 验证 API 响应格式兼容性 - 运行现有接口测试确认不受影响（79 个测试通过）
- [x] T018 [US3] 添加日志记录提示链执行情况 in `backend/app/services/llm_service.py`
  - 使用 `logger.info/debug/warning` 记录表选择结果
  - 记录是否使用 fallback
  - 记录选中的表数量

**Checkpoint**: ✅ 用户体验验证完成，API 兼容性确认

---

## Phase 4: Edge Cases & Polish ✅

**Purpose**: 处理边界情况，完善功能

- [x] T019 [US1] 处理边界情况：LLM 返回的表名不存在于数据库 in `backend/app/services/llm_service.py`
  - 过滤无效表名（实现于 `select_relevant_tables` 第 226-236 行）
  - 所有表名无效时触发 fallback（第 238-240 行）

- [x] T020 [P] [US1] 单元测试：边界情况测试 in `backend/tests/test_services/test_llm_service.py`
  - `test_select_relevant_tables_filters_invalid_table_names` - 测试无效表名过滤
  - `test_select_relevant_tables_fallback_when_all_invalid` - 测试全部表名无效时 fallback

- [ ] T021 [P] 更新 `api-tests.rest` 添加提示链相关测试用例（可选，需要实际 LLM 环境）
  - 大表数量数据库的自然语言查询
  - 小表数量数据库的自然语言查询

- [x] T022 运行全部单元测试验证 - **28 个 LLM 服务测试全部通过，79 个 API 测试全部通过**

- [x] T023 代码实现完成，功能可用

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies - 立即开始
- **Phase 2 (Core)**: Depends on Phase 1 - 核心实现
- **Phase 3 (UX)**: Depends on Phase 2 - 验证用户体验
- **Phase 4 (Polish)**: Depends on Phase 2 - 边界处理

### Task Dependencies within Phase 2

```text
T004-T008 (Tests) → 应先编写，确保失败
    ↓
T009 (build_table_summary_context) → 独立实现
    ↓
T010 (Prompt 模板) → 独立实现
    ↓
T011 (select_relevant_tables) → 依赖 T009, T010
    ↓
T012 (build_schema_context 修改) → 独立实现
    ↓
T013 (generate_sql 修改) → 依赖 T011, T012
    ↓
T014 (Fallback 逻辑) → 依赖 T013
```

### Parallel Opportunities

```bash
# Phase 2 测试可并行编写:
T004, T005, T006, T007, T008 (all [P])

# 独立方法可并行实现:
T009 (build_table_summary_context)
T010 (Prompt 模板)
T012 (build_schema_context)

# Phase 4 测试可并行:
T020, T021 (all [P])
```

---

## Implementation Strategy

### MVP First (Phase 1 + Phase 2)

1. ✅ Complete Phase 1: Setup (T001-T003)
2. Write failing tests (T004-T008)
3. Implement core methods (T009-T014)
4. **STOP and VALIDATE**: Run tests, verify token reduction

### Full Feature

1. Complete Phase 3: Verify UX (T015-T018)
2. Complete Phase 4: Edge cases (T019-T023)
3. Final validation with quickstart.md

---

## Notes

- 主要修改集中在单一文件 `llm_service.py`，降低冲突风险
- API 接口完全不变，前端无需修改
- 使用 fallback 策略确保功能可用性
- 建议在实际 LLM 环境中进行集成测试以验证效果


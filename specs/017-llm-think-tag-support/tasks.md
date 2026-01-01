# Tasks: LLM 思考标签输出支持

**Input**: Design documents from `/specs/017-llm-think-tag-support/`  
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, quickstart.md ✅

**Tests**: 必需 - 根据 Constitution VI 要求必须有完整测试覆盖

**Organization**: 任务按用户故事分组，支持独立实现和测试

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可并行运行（不同文件，无依赖）
- **[Story]**: 任务所属用户故事（US1, US2）
- 所有路径使用绝对路径基于仓库根目录

## Path Conventions

- **Backend**: `backend/app/`, `backend/tests/`
- 本功能仅涉及后端修改，无前端任务

---

## Phase 1: Setup (共享基础设施)

**Purpose**: 无需设置 - 现有项目结构完整

> 本功能为现有代码增强，无需初始化新项目结构

**Checkpoint**: 直接进入 Phase 2

---

## Phase 2: Foundational (阻塞性前置任务)

**Purpose**: 创建核心工具函数，供所有用户故事使用

**⚠️ CRITICAL**: 用户故事实现前必须完成此阶段

- [x] T001 创建 `strip_think_tags` 辅助函数在 `backend/app/services/llm_service.py`

**Checkpoint**: 核心函数就绪 - 可以开始用户故事实现

---

## Phase 3: User Story 1 - 使用开源推理模型生成SQL (Priority: P1) 🎯 MVP

**Goal**: 支持带有 `<think>...</think>` 标签的 LLM 响应格式，确保 DeepSeek、Qwen 等模型正常工作

**Independent Test**: 使用返回思考标签的 LLM 模型发送自然语言查询，验证能正确生成 SQL

### Tests for User Story 1

> **NOTE: 先编写测试，确保在实现前测试失败**

- [x] T002 [P] [US1] 添加 `strip_think_tags` 函数单元测试在 `backend/tests/test_services/test_llm_service.py`
- [x] T003 [P] [US1] 添加思考标签 + markdown JSON 格式解析测试在 `backend/tests/test_services/test_llm_service.py`
- [x] T004 [P] [US1] 添加思考标签 + 裸 JSON 格式解析测试在 `backend/tests/test_services/test_llm_service.py`

### Implementation for User Story 1

- [x] T005 [US1] 在 `generate_sql` 方法中集成 `strip_think_tags` 调用在 `backend/app/services/llm_service.py`
- [x] T006 [US1] 在 `select_relevant_tables` 方法中集成 `strip_think_tags` 调用在 `backend/app/services/llm_service.py`
- [x] T007 [US1] 运行测试验证思考标签格式正确处理

**Checkpoint**: 此时 User Story 1 应完全可用，支持带思考标签的模型

---

## Phase 4: User Story 2 - 兼容无思考标签的模型输出 (Priority: P2)

**Goal**: 确保现有不带思考标签的模型（如 OpenAI GPT）仍然正常工作

**Independent Test**: 使用不带思考标签的 LLM 模型发送自然语言查询，验证功能不受影响

### Tests for User Story 2

- [x] T008 [P] [US2] 添加无思考标签标准 JSON 格式测试在 `backend/tests/test_services/test_llm_service.py`
- [x] T009 [P] [US2] 添加无思考标签 markdown JSON 格式测试在 `backend/tests/test_services/test_llm_service.py`

### Implementation for User Story 2

- [x] T010 [US2] 验证 `strip_think_tags` 对无标签内容的兼容性（返回原内容）
- [x] T011 [US2] 运行现有测试套件确保 100% 通过

**Checkpoint**: 此时 User Story 1 和 2 都应独立工作

---

## Phase 5: Edge Cases & Error Handling

**Purpose**: 处理边界情况，提高健壮性

- [x] T012 [P] 添加未闭合思考标签的边界情况测试在 `backend/tests/test_services/test_llm_service.py`
- [x] T013 [P] 添加超长思考内容的边界情况测试在 `backend/tests/test_services/test_llm_service.py`
- [x] T014 [P] 添加思考内容包含类 JSON 文本的边界情况测试在 `backend/tests/test_services/test_llm_service.py`
- [x] T015 验证边界情况处理符合预期

**Checkpoint**: 所有边界情况已覆盖

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 最终验证和文档

- [x] T016 运行完整测试套件 `cd backend && uv run pytest tests/ -v`
- [x] T017 更新 `api-tests.rest` 添加自然语言查询接口测试用例
- [x] T018 验证 quickstart.md 场景

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: 跳过 - 无需设置
- **Phase 2 (Foundational)**: 无依赖 - 立即开始，创建核心函数
- **Phase 3 (US1)**: 依赖 Phase 2 完成
- **Phase 4 (US2)**: 依赖 Phase 2 完成，可与 Phase 3 并行
- **Phase 5 (Edge Cases)**: 依赖 Phase 3 完成
- **Phase 6 (Polish)**: 依赖所有前置阶段完成

### User Story Dependencies

- **User Story 1 (P1)**: 依赖 T001 完成 - 无其他故事依赖
- **User Story 2 (P2)**: 依赖 T001 完成 - 可与 US1 并行实现

### Within Each User Story

- 测试任务先写并确保失败
- 实现任务后运行测试确保通过
- 完成一个故事后再进入下一优先级

### Parallel Opportunities

- T002, T003, T004 可并行（US1 测试）
- T008, T009 可并行（US2 测试）
- T012, T013, T014 可并行（边界情况测试）
- US1 和 US2 的实现可以并行（都依赖 T001）

---

## Parallel Example: User Story 1

```bash
# 并行启动 US1 所有测试任务:
Task: "T002 添加 strip_think_tags 函数单元测试"
Task: "T003 添加思考标签 + markdown JSON 格式解析测试"
Task: "T004 添加思考标签 + 裸 JSON 格式解析测试"

# 测试编写完成后，顺序实现:
Task: "T005 在 generate_sql 方法中集成 strip_think_tags"
Task: "T006 在 select_relevant_tables 方法中集成 strip_think_tags"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. 完成 Phase 2: Foundational (T001)
2. 完成 Phase 3: User Story 1 (T002-T007)
3. **STOP and VALIDATE**: 使用 DeepSeek 模型测试自然语言查询
4. 如果通过，MVP 已就绪

### Incremental Delivery

1. T001 → 核心函数就绪
2. T002-T007 → US1 完成 → 可部署 (MVP!)
3. T008-T011 → US2 完成 → 确保向后兼容
4. T012-T015 → 边界情况覆盖
5. T016-T018 → 最终验证和文档

### Estimated Time

- Phase 2: ~10 分钟
- Phase 3 (US1): ~30 分钟
- Phase 4 (US2): ~15 分钟
- Phase 5: ~20 分钟
- Phase 6: ~10 分钟
- **Total**: ~1.5 小时

---

## Notes

- [P] 任务 = 不同文件，无依赖，可并行
- [Story] 标签将任务映射到特定用户故事
- 本功能范围小，所有修改集中在 `llm_service.py` 单个文件
- 测试文件: `test_llm_service.py`
- 每个任务完成后提交
- 核心修改: 添加正则表达式预处理步骤剥离 `<think>` 标签


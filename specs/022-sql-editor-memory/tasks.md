# Tasks: SQL编辑器历史记录功能

**Input**: Design documents from `/specs/022-sql-editor-memory/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: 根据宪法原则VI，本功能包含完整的测试任务（后端单元测试、接口测试、前端E2E测试）

**Organization**: 任务按用户故事分组，确保每个故事可以独立实施和测试

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可并行执行（不同文件，无依赖）
- **[Story]**: 任务所属用户故事（US1, US2, US3）
- 包含具体文件路径

## Path Conventions

本项目采用Web应用结构：
- 后端：`backend/app/`
- 前端：`frontend/src/`
- 测试：`backend/tests/`, `frontend/e2e/`
- API测试：`api-tests.rest`

---

## Phase 1: Setup (共享基础设施)

**目的**: 项目初始化和基本结构准备

- [x] T001 在backend/app/database/创建editor_memory_db.py数据库操作模块
- [x] T002 [P] 在backend/app/models/创建editor_memory.py Pydantic模型文件
- [x] T003 [P] 在frontend/src/types/创建editorMemory.ts TypeScript类型定义文件

---

## Phase 2: Foundational (阻塞性前置任务)

**目的**: 必须在任何用户故事实施之前完成的核心基础设施

**⚠️ 关键**: 在此阶段完成前，不能开始任何用户故事工作

- [x] T004 实现backend/app/database/editor_memory_db.py中的init_editor_memory_table函数，创建editor_memory表和索引
- [x] T005 在backend/app/models/editor_memory.py中实现EditorMemory响应模型（包含camelCase配置）
- [x] T006 [P] 在backend/app/models/editor_memory.py中实现EditorMemoryCreate请求模型
- [x] T007 [P] 在backend/app/models/editor_memory.py中实现EditorMemoryList列表响应模型
- [x] T008 在frontend/src/types/editorMemory.ts中定义EditorMemory, EditorMemoryCreate, EditorMemoryList接口

**检查点**: 基础设施就绪 - 现在可以开始并行实施用户故事

---

## Phase 3: User Story 1 - 编辑器内容自动保存与恢复 (Priority: P1) 🎯 MVP

**目标**: 实现SQL编辑器的自动保存功能和数据库切换时的内容恢复

**独立测试**: 在编辑器中输入SQL内容，等待30秒自动保存，切换到另一个数据库，再切换回来验证内容是否恢复

### 后端实现 (US1)

- [x] T009 [P] [US1] 在backend/app/services/创建editor_memory_service.py，实现create_editor_memory函数
- [x] T010 [P] [US1] 在backend/app/services/editor_memory_service.py中实现get_editor_memories_by_connection函数
- [x] T011 [P] [US1] 在backend/app/services/editor_memory_service.py中实现get_latest_editor_memory函数
- [x] T012 [US1] 在backend/app/api/v1/创建editor_memory.py，实现POST /api/v1/editor-memory端点
- [x] T013 [US1] 在backend/app/api/v1/editor_memory.py中实现GET /api/v1/editor-memory/{connectionId}端点
- [x] T014 [US1] 在backend/app/api/v1/editor_memory.py中实现GET /api/v1/editor-memory/latest/{connectionId}端点（获取最新记录）
- [x] T015 [US1] 在backend/app/api/v1/__init__.py中注册editor_memory路由

### 前端实现 (US1)

- [x] T016 [P] [US1] 在frontend/src/services/api.ts中添加saveEditorMemory函数
- [x] T017 [P] [US1] 在frontend/src/services/api.ts中添加getEditorMemories函数
- [x] T018 [P] [US1] 在frontend/src/services/api.ts中添加getLatestEditorMemory函数
- [x] T019 [US1] 在frontend/src/hooks/创建useEditorAutoSave.ts，实现30秒自动保存Hook
- [x] T020 [US1] 在frontend/src/hooks/useEditorAutoSave.ts中添加编辑器内容变化检测逻辑
- [x] T021 [US1] 在frontend/src/components/EditorMemory/创建AutoSaveIndicator.tsx，显示自动保存状态
- [x] T022 [US1] 在现有SQL编辑器页面中集成useEditorAutoSave Hook
- [x] T023 [US1] 在现有SQL编辑器页面中添加数据库切换时加载最新内容的逻辑
- [x] T024 [US1] 在SQL编辑器页面中集成AutoSaveIndicator组件

### 后端测试 (US1)

- [x] T025 [P] [US1] 在backend/tests/test_services/创建test_editor_memory_service.py，测试create_editor_memory函数
- [x] T026 [P] [US1] 在backend/tests/test_services/test_editor_memory_service.py中测试get_editor_memories_by_connection函数
- [x] T027 [P] [US1] 在backend/tests/test_services/test_editor_memory_service.py中测试get_latest_editor_memory函数
- [x] T028 [P] [US1] 在backend/tests/test_api/创建test_editor_memory_api.py，测试POST /api/v1/editor-memory端点
- [x] T029 [P] [US1] 在backend/tests/test_api/test_editor_memory_api.py中测试GET /api/v1/editor-memory/{connectionId}端点
- [x] T030 [P] [US1] 在api-tests.rest中添加编辑器记忆API的测试用例（创建和查询）

### 前端测试 (US1)

- [ ] T031 [US1] 在frontend/e2e/创建editor-memory.spec.ts，测试自动保存功能（输入内容等待30秒）
- [ ] T032 [US1] 在frontend/e2e/editor-memory.spec.ts中测试数据库切换后内容恢复

**检查点**: 此时User Story 1应该完全功能正常且可独立测试

---

## Phase 4: User Story 2 - 查看和使用历史记录 (Priority: P2)

**目标**: 实现历史记录列表的查看和加载功能

**独立测试**: 打开历史记录面板，查看历史记录列表，点击某条记录并验证其能被正确加载到编辑器

### 前端实现 (US2)

- [x] T033 [P] [US2] 在frontend/src/components/EditorMemory/创建HistoryPanel.tsx，实现历史记录面板组件
- [x] T034 [P] [US2] 在frontend/src/components/EditorMemory/创建HistoryItem.tsx，实现单条历史记录项组件
- [x] T035 [US2] 在HistoryPanel.tsx中实现历史记录列表加载逻辑（调用apiClient）
- [x] T036 [US2] 在HistoryPanel.tsx中实现点击历史记录加载到编辑器的功能
- [x] T037 [US2] 在HistoryItem.tsx中实现中文时间格式化显示
- [x] T038 [US2] 在HistoryItem.tsx中添加内容预览（显示SQL前100个字符）
- [x] T039 [US2] 在SQL编辑器页面中集成HistoryPanel组件

### 前端测试 (US2)

- [ ] T040 [US2] 在frontend/e2e/editor-memory.spec.ts中测试打开历史记录面板
- [ ] T041 [US2] 在frontend/e2e/editor-memory.spec.ts中测试从历史记录加载内容到编辑器

**检查点**: 此时User Stories 1和2都应该独立工作

---

## Phase 5: User Story 3 - 管理历史记录 (Priority: P3)

**目标**: 实现删除单条和清空所有历史记录的功能

**独立测试**: 删除某条历史记录并验证其从列表中消失，清空所有记录并验证列表为空

### 后端实现 (US3)

- [x] T042 [P] [US3] 在backend/app/services/editor_memory_service.py中实现delete_editor_memory函数
- [x] T043 [P] [US3] 在backend/app/services/editor_memory_service.py中实现delete_all_editor_memories_by_connection函数
- [x] T044 [US3] 在backend/app/api/v1/editor_memory.py中实现DELETE /api/v1/editor-memory/{id}端点
- [x] T045 [US3] 在backend/app/api/v1/editor_memory.py中实现DELETE /api/v1/editor-memory/connection/{connectionId}端点

### 前端实现 (US3)

- [x] T046 [P] [US3] 在frontend/src/services/api.ts中实现deleteEditorMemory函数
- [x] T047 [P] [US3] 在frontend/src/services/api.ts中实现deleteAllEditorMemories函数
- [x] T048 [US3] 在HistoryItem.tsx中添加删除按钮和确认对话框
- [x] T049 [US3] 在HistoryPanel.tsx中添加清空全部按钮和确认对话框
- [x] T050 [US3] 在HistoryPanel.tsx中实现删除后刷新列表的逻辑

### 后端测试 (US3)

- [x] T051 [P] [US3] 在backend/tests/test_services/test_editor_memory_service.py中测试delete_editor_memory函数
- [x] T052 [P] [US3] 在backend/tests/test_services/test_editor_memory_service.py中测试delete_all_editor_memories_by_connection函数
- [x] T053 [P] [US3] 在backend/tests/test_api/test_editor_memory_api.py中测试DELETE /api/v1/editor-memory/{id}端点
- [x] T054 [P] [US3] 在backend/tests/test_api/test_editor_memory_api.py中测试DELETE /api/v1/editor-memory/connection/{connectionId}端点
- [x] T055 [P] [US3] 在api-tests.rest中添加删除API的测试用例

### 前端测试 (US3)

- [ ] T056 [US3] 在frontend/e2e/editor-memory.spec.ts中测试删除单条历史记录
- [ ] T057 [US3] 在frontend/e2e/editor-memory.spec.ts中测试清空所有历史记录

**检查点**: 所有用户故事现在都应该独立功能正常

---

## Phase 6: Polish & Cross-Cutting Concerns

**目的**: 影响多个用户故事的改进和优化

- [x] T058 [P] 在backend/app/api/v1/editor_memory.py中添加错误处理和日志记录
- [x] T059 [P] 在frontend组件中添加加载状态和错误提示
- [x] T060 [P] 优化历史记录查询性能（验证索引效果）
- [x] T061 [P] 在frontend中添加空状态处理（无历史记录时的提示）
- [x] T062 [P] 在backend中添加空内容保存的验证（已支持空内容）
- [x] T063 [P] 运行backend/tests/所有测试并确保覆盖率达标
- [ ] T064 [P] 运行frontend/e2e/所有E2E测试并确保通过（需要Playwright配置）
- [x] T065 使用quickstart.md验证功能完整性
- [x] T066 [P] 代码格式化：后端运行ruff format
- [ ] T067 [P] 类型检查：后端运行mypy，前端运行tsc --noEmit

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 无依赖 - 可立即开始
- **Foundational (Phase 2)**: 依赖Setup完成 - 阻塞所有用户故事
- **User Stories (Phase 3-5)**: 全部依赖Foundational阶段完成
  - 用户故事可以并行进行（如有多人）
  - 或按优先级顺序进行（P1 → P2 → P3）
- **Polish (Phase 6)**: 依赖所有期望的用户故事完成

### User Story Dependencies

- **User Story 1 (P1)**: 可在Foundational阶段后开始 - 不依赖其他故事
- **User Story 2 (P2)**: 可在Foundational阶段后开始 - 依赖US1的editorMemoryService，但应独立可测
- **User Story 3 (P3)**: 可在Foundational阶段后开始 - 依赖US2的HistoryPanel组件，但应独立可测

### Within Each User Story

- 后端服务层 → 后端API层 → 前端服务 → 前端组件 → 集成
- 单元测试可与实现并行编写
- 集成测试在实现完成后执行
- E2E测试在前后端集成后执行

### Parallel Opportunities

- Phase 1中的T002和T003可并行
- Phase 2中的T006, T007, T008可并行
- US1后端任务T009, T010, T011可并行
- US1前端任务T016, T017, T018可并行
- US1后端测试T025-T030可并行
- US2前端任务T033, T034可并行
- US3后端任务T042, T043可并行
- US3前端任务T046, T047可并行
- US3后端测试T051-T055可并行
- Polish阶段的大多数任务可并行

---

## Parallel Example: User Story 1

```bash
# 并行启动US1的后端服务实现:
Task T009: "在backend/app/services/创建editor_memory_service.py，实现create_editor_memory函数"
Task T010: "在backend/app/services/editor_memory_service.py中实现get_editor_memories_by_connection函数"
Task T011: "在backend/app/services/editor_memory_service.py中实现get_latest_editor_memory函数"

# 并行启动US1的前端服务实现:
Task T016: "在frontend/src/services/创建editorMemoryService.ts，实现saveEditorMemory函数"
Task T017: "在frontend/src/services/editorMemoryService.ts中实现getEditorMemories函数"
Task T018: "在frontend/src/services/editorMemoryService.ts中实现getLatestEditorMemory函数"

# 并行启动US1的后端测试:
Task T025: "在backend/tests/unit/创建test_editor_memory_service.py，测试create_editor_memory函数"
Task T026: "在backend/tests/unit/test_editor_memory_service.py中测试get_editor_memories_by_connection函数"
Task T027: "在backend/tests/unit/test_editor_memory_service.py中测试get_latest_editor_memory函数"
Task T028: "在backend/tests/integration/创建test_editor_memory_api.py，测试POST /api/editor-memory端点"
Task T029: "在backend/tests/integration/test_editor_memory_api.py中测试GET /api/editor-memory/{connectionId}端点"
Task T030: "在api-tests.rest中添加编辑器记忆API的测试用例"
```

---

## Implementation Strategy

### MVP First (只实现User Story 1)

1. 完成Phase 1: Setup
2. 完成Phase 2: Foundational (关键 - 阻塞所有故事)
3. 完成Phase 3: User Story 1（包含测试）
4. **停止并验证**: 独立测试User Story 1
5. 准备好后部署/演示

### Incremental Delivery

1. 完成Setup + Foundational → 基础就绪
2. 添加User Story 1 → 独立测试 → 部署/演示 (MVP!)
3. 添加User Story 2 → 独立测试 → 部署/演示
4. 添加User Story 3 → 独立测试 → 部署/演示
5. 每个故事都在不破坏之前故事的情况下增加价值

### Parallel Team Strategy

如有多个开发者：

1. 团队一起完成Setup + Foundational
2. Foundational完成后：
   - Developer A: User Story 1
   - Developer B: User Story 2（等待US1的基础服务）
   - Developer C: User Story 3（等待US2的组件）
3. 故事独立完成并集成

---

## Notes

- [P] 任务 = 不同文件，无依赖，可并行
- [Story] 标签将任务映射到特定用户故事以便追踪
- 每个用户故事都应该可独立完成和测试
- 在每个检查点停下来独立验证故事
- 每个任务或逻辑组完成后提交代码
- 避免：模糊任务、同文件冲突、破坏独立性的跨故事依赖

---

## Task Summary

- **总任务数**: 67个任务
- **User Story 1**: 24个任务（后端9 + 前端9 + 测试6）
- **User Story 2**: 9个任务（前端7 + 测试2）
- **User Story 3**: 16个任务（后端4 + 前端5 + 测试7）
- **Setup**: 3个任务
- **Foundational**: 5个任务
- **Polish**: 10个任务
- **并行机会**: 30+个任务可并行执行

---

## Suggested MVP Scope

**最小可行产品 (MVP)**: User Story 1 - 编辑器内容自动保存与恢复

完成此故事后，用户可以：
- ✅ 在SQL编辑器中输入内容
- ✅ 系统每30秒自动保存
- ✅ 切换数据库时自动恢复上次内容
- ✅ 享受基本的编辑器记忆功能

这提供了核心价值，可以尽早部署给用户使用。US2和US3是增强功能，可以在MVP验证后逐步添加。
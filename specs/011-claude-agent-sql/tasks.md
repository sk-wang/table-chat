# Tasks: Claude Agent SQL 模式

**Input**: Design documents from `/specs/011-claude-agent-sql/`  
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓

**Tests**: 包含可选测试任务（可根据时间跳过）

**Organization**: 按用户故事组织，每个故事可独立实现和测试

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: 可并行执行（不同文件，无依赖）
- **[Story]**: 任务所属用户故事 (US1, US2, US3)
- 包含精确文件路径

---

## Phase 1: Setup (项目初始化)

**Purpose**: 添加依赖、配置环境

- [ ] T001 添加 `claude-agent-sdk` 依赖到 `backend/pyproject.toml`
- [ ] T002 [P] 添加 Agent 环境变量配置到 `backend/.env.example`
- [ ] T003 [P] 创建 Agent 组件目录结构 `frontend/src/components/agent/`

---

## Phase 2: Foundational (基础设施)

**Purpose**: 所有用户故事都依赖的核心基础设施

**⚠️ CRITICAL**: 必须完成本阶段后才能开始用户故事实现

### 后端基础

- [ ] T004 添加 Agent 配置项到 `backend/app/config.py`（agent_api_base, agent_api_key, agent_model 等）
- [ ] T005 [P] 创建 Agent 请求/响应模型到 `backend/app/models/agent.py`（AgentQueryRequest, AgentEvent 等）
- [ ] T006 [P] 实现只读 SQL 验证函数 `validate_readonly()` 到 `backend/app/services/query_service.py`（扩展支持 DESCRIBE/SHOW/EXPLAIN）
- [ ] T007 实现 MCP 工具定义到 `backend/app/services/agent_tools.py`（query_database, get_table_schema 两个工具）
- [ ] T008 实现 Agent 服务核心到 `backend/app/services/agent_service.py`（AgentService 类，封装 ClaudeSDKClient）

### 前端基础

- [ ] T009 [P] 创建 Agent 类型定义到 `frontend/src/types/agent.ts`（AgentMessage, ToolCallInfo, AgentState 等）
- [ ] T010 [P] 添加 SSE 客户端函数到 `frontend/src/services/api.ts`（agentQuery, cancelAgentQuery）

**Checkpoint**: 基础设施就绪 - 可以开始用户故事实现

---

## Phase 3: User Story 1 - 切换到 Agent 模式生成 SQL (Priority: P1) 🎯 MVP

**Goal**: 用户可以在 Agent 选项卡中输入自然语言请求，Agent 探索数据库并生成 SQL

**Independent Test**: 切换到 Agent 模式，输入请求，观察生成的 SQL 填充到编辑器

### 后端实现

- [ ] T011 [US1] 实现 `/agent/query` SSE 端点到 `backend/app/api/v1/agent.py`（POST，返回 StreamingResponse）
- [ ] T012 [US1] 实现 `/agent/status` 端点到 `backend/app/api/v1/agent.py`（GET，返回 Agent 配置状态）
- [ ] T013 [US1] 注册 Agent 路由到 `backend/app/api/v1/__init__.py`

### 前端实现

- [ ] T014 [P] [US1] 创建 AgentChat 主组件到 `frontend/src/components/agent/AgentChat.tsx`（输入框 + 消息列表 + 状态管理）
- [ ] T015 [P] [US1] 创建 AgentMessage 组件到 `frontend/src/components/agent/AgentMessage.tsx`（用户/助手消息渲染）
- [ ] T016 [US1] 创建 Agent 组件导出索引到 `frontend/src/components/agent/index.ts`
- [ ] T017 [US1] 更新 QueryPage 添加 Agent 选项卡到 `frontend/src/pages/query/index.tsx`（与"自然语言"同级）
- [ ] T018 [US1] 实现 Agent 生成 SQL 填充到编辑器功能（在 AgentChat 中添加"复制到编辑器"回调）

### 测试（可选）

- [ ] T019 [P] [US1] Agent API 端点测试到 `backend/tests/test_api/test_agent.py`
- [ ] T020 [P] [US1] Agent 工具安全验证测试到 `backend/tests/test_services/test_agent_tools.py`

**Checkpoint**: 用户可以使用 Agent 模式生成 SQL 并填充到编辑器

---

## Phase 4: User Story 2 - 查看代理探索过程 (Priority: P2)

**Goal**: 用户可以实时看到 Agent 的思考过程、工具调用详情

**Independent Test**: 发起 Agent 请求，观察工具调用块可展开/折叠，显示输入/输出

### 前端实现

- [ ] T021 [P] [US2] 创建 ThinkingIndicator 组件到 `frontend/src/components/agent/ThinkingIndicator.tsx`（动态状态指示器：思考中/执行工具中/生成中）
- [ ] T022 [P] [US2] 创建 ToolCallBlock 组件到 `frontend/src/components/agent/ToolCallBlock.tsx`（可折叠工具调用块，显示工具名/参数/结果/耗时）
- [ ] T023 [US2] 增强 AgentMessage 组件支持 toolCall 渲染到 `frontend/src/components/agent/AgentMessage.tsx`
- [ ] T024 [US2] 更新 AgentChat 处理 tool_call 和 tool_result 事件到 `frontend/src/components/agent/AgentChat.tsx`
- [ ] T025 [US2] 添加工具调用历史展示到 AgentChat（消息列表中插入工具调用块）

### 样式优化

- [ ] T026 [P] [US2] 添加 Agent 组件样式（思考动画、工具块折叠动画）到 `frontend/src/components/agent/` 内联样式或 CSS 模块

**Checkpoint**: 用户可以清晰看到 Agent 的完整探索过程

---

## Phase 5: User Story 3 - 在两种模式间自由切换 (Priority: P3)

**Goal**: 用户可以在"自然语言"和"Agent"选项卡间自由切换，SQL 编辑器内容保持不变

**Independent Test**: 在 Agent 模式生成 SQL → 切换到自然语言 → SQL 保留 → 切换回 Agent → 编辑器内容不变

### 前端实现

- [ ] T027 [US3] 实现选项卡切换状态管理到 `frontend/src/pages/query/index.tsx`（扩展 QueryMode 类型为 'sql' | 'natural' | 'agent'）
- [ ] T028 [US3] 确保 SQL 编辑器内容在模式切换时保持不变（验证 sqlQuery 状态不受选项卡切换影响）
- [ ] T029 [US3] 添加 Agent 服务可用性检查到 QueryPage（如果未配置则禁用 Agent 选项卡）

### 错误处理

- [ ] T030 [US3] 实现 Agent 任务取消功能到 `backend/app/api/v1/agent.py`（POST /agent/cancel 端点）
- [ ] T031 [US3] 添加取消按钮到 AgentChat 组件（调用 cancelAgentQuery API）
- [ ] T032 [US3] 实现超时处理和错误提示到 AgentChat（网络断开、Agent 超时等边缘情况）

**Checkpoint**: 用户可以在三种模式间自由切换，体验流畅

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 跨故事的优化和完善

### 文档

- [ ] T033 [P] 更新 quickstart.md 验证所有使用场景
- [ ] T034 [P] 更新 README.md 添加 Agent 模式说明

### 代码质量

- [ ] T035 [P] Agent 服务单元测试到 `backend/tests/test_services/test_agent_service.py`
- [ ] T036 [P] Agent 组件单元测试到 `frontend/src/test/agent.test.ts`
- [ ] T037 代码审查和重构（消除重复代码，优化错误处理）

### 性能优化

- [ ] T038 优化 SSE 连接管理（添加重连机制）
- [ ] T039 优化工具输出截断逻辑（大结果集处理）

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1: Setup ──────────────────────────┐
                                         ↓
Phase 2: Foundational ───────────────────┤ (BLOCKS all user stories)
                                         ↓
         ┌───────────────────────────────┼───────────────────────────────┐
         ↓                               ↓                               ↓
Phase 3: US1 (P1)              Phase 4: US2 (P2)              Phase 5: US3 (P3)
(Core Agent Mode)              (Exploration Visibility)       (Mode Switching)
         ↓                               ↓                               ↓
         └───────────────────────────────┴───────────────────────────────┘
                                         ↓
                              Phase 6: Polish
```

### User Story Dependencies

| Story | 依赖 | 可独立测试 |
|-------|------|------------|
| **US1** | Phase 2 完成 | ✅ 可以单独使用 Agent 生成 SQL |
| **US2** | US1 基础组件存在 | ✅ 可以单独测试工具调用展示 |
| **US3** | US1 Agent 选项卡存在 | ✅ 可以单独测试模式切换 |

### Task Dependencies within Phases

**Phase 2 (Foundational)**:
```
T004 (config) ──┐
T005 (models) ──┼──→ T007 (tools) ──→ T008 (service)
T006 (validate) ┘
```

**Phase 3 (US1)**:
```
T011/T012/T013 (API) ──┐
                       ├──→ T017 (integrate to page) ──→ T018 (copy to editor)
T014/T015/T016 (components) ┘
```

### Parallel Opportunities

**Phase 1**:
- T001, T002, T003 可并行

**Phase 2**:
- T005, T006, T009, T010 可并行
- T007 依赖 T006
- T008 依赖 T007

**Phase 3 (US1)**:
- 后端 T011-T013 可与前端 T014-T016 并行
- T019, T020 可并行

**Phase 4 (US2)**:
- T021, T022 可并行

**Phase 6**:
- T033, T034, T035, T036 可并行

---

## Parallel Example: Phase 3 (US1)

```bash
# 后端任务组（可并行开发）:
T011: "实现 /agent/query SSE 端点到 backend/app/api/v1/agent.py"
T012: "实现 /agent/status 端点到 backend/app/api/v1/agent.py"

# 前端任务组（可并行开发）:
T014: "创建 AgentChat 主组件到 frontend/src/components/agent/AgentChat.tsx"
T015: "创建 AgentMessage 组件到 frontend/src/components/agent/AgentMessage.tsx"

# 测试任务组（可并行）:
T019: "Agent API 端点测试到 backend/tests/test_api/test_agent.py"
T020: "Agent 工具安全验证测试到 backend/tests/test_services/test_agent_tools.py"
```

---

## Implementation Strategy

### MVP First (仅 User Story 1)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational (T004-T010)
3. Complete Phase 3: User Story 1 (T011-T018)
4. **STOP and VALIDATE**: 测试 Agent 基本功能
5. 可交付 MVP

### Incremental Delivery

```
Setup → Foundational → US1 (MVP!) → US2 → US3 → Polish
                        ↓           ↓      ↓
                     Deploy      Deploy  Deploy
```

### 建议开发顺序

1. **Day 1**: T001-T008 (后端基础 + Agent 服务)
2. **Day 2**: T009-T013 (前端基础 + API 端点)
3. **Day 3**: T014-T018 (US1 前端组件 + 集成)
4. **Day 4**: T021-T026 (US2 探索过程可视化)
5. **Day 5**: T027-T032 (US3 模式切换 + 错误处理)
6. **Day 6**: T033-T039 (测试 + 文档 + 优化)

---

## Summary

| 指标 | 值 |
|------|-----|
| **总任务数** | 39 |
| **Phase 1 (Setup)** | 3 |
| **Phase 2 (Foundational)** | 7 |
| **Phase 3 (US1 - MVP)** | 10 |
| **Phase 4 (US2)** | 6 |
| **Phase 5 (US3)** | 6 |
| **Phase 6 (Polish)** | 7 |
| **可并行任务** | 22 (56%) |
| **MVP 任务数** | 20 (T001-T018 + T004-T010) |

---

## Notes

- [P] 任务 = 不同文件，无依赖
- [Story] 标签映射到 spec.md 中的用户故事
- 每个用户故事应可独立完成和测试
- 每完成一个 checkpoint 都应验证功能
- 测试任务标记为可选，可根据时间决定是否执行


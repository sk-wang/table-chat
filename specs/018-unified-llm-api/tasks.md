# Tasks: 统一 LLM API 配置格式

**Input**: Design documents from `/specs/018-unified-llm-api/`  
**Prerequisites**: plan.md, spec.md, data-model.md, research.md, quickstart.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 项目依赖更新和基础配置

- [ ] T001 确认 anthropic SDK 已在 backend/pyproject.toml 中声明为依赖
- [ ] T002 [P] 更新 .env.example 添加新环境变量示例 `LLM_API_TYPE`, `LLM_API_KEY` 等

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 统一配置模型，所有 User Story 都依赖此阶段完成

**⚠️ CRITICAL**: 此阶段必须完成后才能开始 User Story 实现

- [ ] T003 重构 backend/app/config.py：添加 `llm_api_type` 字段 (Literal["anthropic", "openai"])
- [ ] T004 重构 backend/app/config.py：修改 `llm_api_base` 默认值为空字符串，`llm_model` 默认值为 `claude-sonnet-4-5-20250929`
- [ ] T005 重构 backend/app/config.py：添加 `effective_api_key`、`effective_api_base`、`effective_model` 计算属性
- [ ] T006 重构 backend/app/config.py：添加 `is_configured` 统一配置检查属性，替代 `is_llm_configured` 和 `is_agent_configured`
- [ ] T007 重构 backend/app/config.py：保留向后兼容别名 (`agent_api_key`, `openai_api_key` 等)

**Checkpoint**: 配置模型重构完成，可以开始 User Story 实现

---

## Phase 3: User Story 1 - 使用 Anthropic API（默认场景）(Priority: P1) 🎯 MVP

**Goal**: 应用代码统一使用 Anthropic Python Client，默认直连 Anthropic API

**Independent Test**: 设置 `LLM_API_KEY` 为有效 Anthropic Key，启动服务，验证 SQL 生成和 Agent 模式均正常

### Implementation for User Story 1

- [ ] T008 [US1] 重构 backend/app/services/llm_service.py：将 OpenAI Client 替换为 Anthropic Client
- [ ] T009 [US1] 重构 backend/app/services/llm_service.py：修改 `select_relevant_tables()` 方法使用 Anthropic messages API
- [ ] T010 [US1] 重构 backend/app/services/llm_service.py：修改 `generate_sql()` 方法使用 Anthropic messages API
- [ ] T011 [US1] 重构 backend/app/services/llm_service.py：更新 Prompt 格式适配 Anthropic（system prompt 放入 system 参数）
- [ ] T012 [US1] 重构 backend/app/services/llm_service.py：使用统一配置 (`settings.effective_api_key`, `settings.effective_api_base`, `settings.effective_model`)
- [ ] T013 [US1] 重构 backend/app/services/agent_service.py：使用统一配置替代 `agent_api_key`、`agent_api_base`
- [ ] T014 [US1] 更新 backend/app/services/agent_service.py：修改 `is_available` 属性使用 `settings.is_configured`
- [ ] T015 [US1] 更新错误消息：将 "请设置 AGENT_API_KEY" 改为 "请设置 LLM_API_KEY"

**Checkpoint**: 此时 Anthropic 模式应完全可用，SQL 生成和 Agent 模式均使用统一配置

---

## Phase 4: User Story 2 - 使用 OpenAI 格式 API + 代理转换 (Priority: P2)

**Goal**: 通过 claude-code-proxy 支持 OpenAI 兼容服务

**Independent Test**: 设置 `LLM_API_TYPE=openai`，启动 Docker Compose（含代理），验证请求正确转换

### Implementation for User Story 2

- [ ] T016 [US2] 修改 docker-compose.yml：添加 claude-code-proxy 服务配置（使用 profiles: ["openai"]）
- [ ] T017 [US2] 配置 claude-code-proxy 服务：设置环境变量 `OPENAI_API_KEY`、`PREFERRED_PROVIDER`、`BIG_MODEL`
- [ ] T018 [US2] 配置 claude-code-proxy 服务：添加健康检查和正确的网络配置
- [ ] T019 [US2] 修改 backend 服务依赖：添加对 proxy 服务的可选依赖（当 profile=openai 时）
- [ ] T020 [US2] 更新 backend/app/config.py：当 `llm_api_type=openai` 时，`effective_api_base` 默认返回 `http://proxy:8082`

**Checkpoint**: 此时 OpenAI 模式应可用，可通过 `docker compose --profile openai up` 启动

---

## Phase 5: User Story 3 - 配置验证与错误提示 (Priority: P3)

**Goal**: 提供清晰的配置验证和错误提示

**Independent Test**: 故意配置错误的 API 类型，验证系统返回明确的错误信息

### Implementation for User Story 3

- [ ] T021 [US3] 在 backend/app/config.py 添加 `validate_config()` 函数，检查配置完整性
- [ ] T022 [US3] 在 backend/app/main.py 启动时调用配置验证，提供清晰错误提示
- [ ] T023 [US3] 当 `LLM_API_TYPE=openai` 但代理不可达时，提供明确错误消息
- [ ] T024 [US3] 当 `LLM_API_TYPE` 值无效时，Pydantic 验证应提供明确错误

**Checkpoint**: 所有配置错误场景应有清晰提示

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 文档更新和最终验证

- [ ] T025 [P] 更新 README.md：添加新环境变量说明
- [ ] T026 [P] 更新 QUICKSTART.md：添加 Anthropic/OpenAI 模式配置说明
- [ ] T027 [P] 创建 backend/tests/test_config.py：测试配置优先级和向后兼容性
- [ ] T028 运行 quickstart.md 中的验证清单
- [ ] T029 清理废弃代码：移除不再需要的 OpenAI SDK 导入（如果全部迁移完成）

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 无依赖 - 可立即开始
- **Foundational (Phase 2)**: 依赖 Setup 完成 - **阻塞所有 User Story**
- **User Story 1 (Phase 3)**: 依赖 Foundational 完成 - MVP 核心
- **User Story 2 (Phase 4)**: 依赖 Foundational 完成 - 可与 US1 并行
- **User Story 3 (Phase 5)**: 依赖 US1 完成（需要统一配置生效）
- **Polish (Phase 6)**: 依赖所有 User Story 完成

### User Story Dependencies

```
Setup (Phase 1)
     │
     ▼
Foundational (Phase 2) ─── BLOCKS ALL ───┐
     │                                    │
     ▼                                    ▼
User Story 1 (P1)              User Story 2 (P2)
     │                                    │
     └──────────┬─────────────────────────┘
                ▼
         User Story 3 (P3)
                │
                ▼
         Polish (Phase 6)
```

### Within Each User Story

- 配置变更 → 服务层变更 → 错误处理
- 核心功能 → 集成测试

### Parallel Opportunities

- T001, T002 可并行（Setup 阶段）
- T008-T012 必须按顺序（同一文件 llm_service.py）
- T013-T015 可与 T008-T012 并行（不同文件）
- T016-T020 可与 US1 并行（不同关注点）
- T025, T026, T027 可并行（不同文件）

---

## Parallel Example: User Story 1

```bash
# 并行执行不同文件的任务:
Task: T013 "重构 agent_service.py 使用统一配置"
Task: T008 "重构 llm_service.py 替换为 Anthropic Client"  # 需按顺序完成 T008-T012

# 并行执行 Polish 阶段:
Task: T025 "更新 README.md"
Task: T026 "更新 QUICKSTART.md"
Task: T027 "创建配置测试"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - 统一配置模型)
3. Complete Phase 3: User Story 1 (Anthropic 模式)
4. **STOP and VALIDATE**: 测试 SQL 生成和 Agent 模式
5. 可部署/演示 MVP

### Incremental Delivery

1. Setup + Foundational → 配置模型就绪
2. Add User Story 1 → Anthropic 模式可用 → **MVP!**
3. Add User Story 2 → OpenAI 模式可用（需代理）
4. Add User Story 3 → 错误提示完善
5. 每个 Story 独立增加价值

---

## Key Implementation Notes

### llm_service.py 重构要点

1. **导入变更**:
   ```python
   # 旧
   from openai import OpenAI
   # 新
   from anthropic import Anthropic
   ```

2. **Client 初始化**:
   ```python
   # 旧
   self._client = OpenAI(api_key=..., base_url=...)
   # 新
   self._client = Anthropic(api_key=..., base_url=...)
   ```

3. **API 调用变更**:
   ```python
   # 旧
   response = self.client.chat.completions.create(
       model=settings.llm_model,
       messages=[{"role": "system", "content": ...}, {"role": "user", "content": ...}],
   )
   content = response.choices[0].message.content
   
   # 新
   response = self.client.messages.create(
       model=settings.effective_model,
       system=system_prompt,  # system 独立参数
       messages=[{"role": "user", "content": user_prompt}],
       max_tokens=4096,
   )
   content = response.content[0].text
   ```

### 向后兼容验证点

- `AGENT_API_KEY` 设置后应等同于 `LLM_API_KEY`
- 现有 `.env` 配置无需修改即可工作
- 旧变量优先级低于新变量

---

## Notes

- [P] tasks = 不同文件，无依赖
- [Story] 标签将任务映射到特定 User Story
- 每个 User Story 应可独立完成和测试
- 每个任务或逻辑组完成后提交
- 可在任何检查点停止验证 Story
- 避免：模糊任务、同文件冲突、破坏独立性的跨 Story 依赖


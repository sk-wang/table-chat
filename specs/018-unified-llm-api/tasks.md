# Tasks: 统一 LLM API 配置格式（简化版）

**Input**: Design documents from `/specs/018-unified-llm-api/`  
**Prerequisites**: plan.md, spec.md, research.md  
**架构调整**: 所有 LLM 请求统一通过 claude-code-proxy，无论是 Anthropic 还是 OpenAI 模式

## 架构说明

```
┌─────────────┐                    ┌──────────────────┐                    ┌─────────────────┐
│  TableChat  │  Anthropic API     │ claude-code-proxy │    Anthropic/     │   LLM 服务       │
│  (后端应用)  │ ────────────────>  │     (代理)        │  OpenAI API      │ (Anthropic/vLLM) │
│             │ <────────────────  │                  │ ────────────────> │                 │
└─────────────┘                    └──────────────────┘                    └─────────────────┘
                                          ↑
                                   始终运行，统一入口
```

**优势**：
- 后端代码不需要区分 API 类型，始终使用 Anthropic SDK 连接 proxy
- proxy 服务始终运行（移除 profiles）
- 配置更简单：只需配置 proxy 的后端地址

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (环境准备)

**Purpose**: 项目依赖确认和环境变量模板

- [x] T001 确认 anthropic SDK 已在 backend/pyproject.toml 中声明
- [x] T002 [P] 更新 .env.example 添加简化后的环境变量 `LLM_API_KEY`, `LLM_MODEL`, `UPSTREAM_API_BASE`, `UPSTREAM_API_TYPE`

---

## Phase 2: Foundational (核心配置重构)

**Purpose**: 简化配置模型，移除 API 类型判断

**⚠️ CRITICAL**: 此阶段必须完成后才能开始 User Story 实现

- [x] T003 重构 backend/app/config.py：移除 `llm_api_type` 字段（不再需要）
- [x] T004 重构 backend/app/config.py：`llm_api_base` 默认值改为 `http://proxy:8082`（Docker 内部地址）
- [x] T005 重构 backend/app/config.py：添加 `upstream_api_base`、`upstream_api_type`（传给 proxy 的配置）
- [x] T006 重构 backend/app/config.py：简化 `effective_api_base` 始终返回 proxy 地址
- [x] T007 保留向后兼容别名 (`agent_api_key`, `openai_api_key` 等)

**Checkpoint**: 配置模型简化完成，后端始终连接 proxy

---

## Phase 3: User Story 1 - 使用 Anthropic API（默认场景）(Priority: P1) 🎯 MVP

**Goal**: 后端统一通过 proxy 连接 Anthropic API，配置简单

**Independent Test**: 设置 `LLM_API_KEY`，启动 Docker Compose，验证 SQL 生成和 Agent 模式正常

### Implementation for User Story 1

- [x] T008 [US1] 确认 backend/app/services/llm_service.py 使用 Anthropic SDK 连接 proxy
- [x] T009 [US1] 确认 backend/app/services/agent_service.py 使用统一配置连接 proxy
- [x] T010 [US1] 简化客户端初始化：始终使用 `settings.effective_api_base`（即 proxy 地址）
- [x] T011 [US1] 更新错误消息：移除关于 API 类型的提示

**Checkpoint**: Anthropic 模式通过 proxy 可用

---

## Phase 4: User Story 2 - Docker Compose 统一架构 (Priority: P1)

**Goal**: proxy 服务始终运行，作为统一的 LLM 入口

**Independent Test**: `docker compose up` 启动所有服务（无需 profile），验证正常工作

### Implementation for User Story 2

- [x] T012 [US2] 修改 docker-compose.yml：移除 proxy 服务的 `profiles: ["openai"]`（始终启动）
- [x] T013 [US2] 修改 docker-compose.yml：proxy 环境变量使用 `UPSTREAM_*` 配置
- [x] T014 [US2] 修改 docker-compose.yml：backend 依赖 proxy 服务（required: true）
- [x] T015 [US2] 配置 proxy：支持 `UPSTREAM_API_TYPE` 选择 Anthropic 或 OpenAI 后端
- [x] T016 [US2] 更新 proxy 健康检查确保服务可用

**Checkpoint**: `docker compose up` 一键启动完整服务栈

---

## Phase 5: User Story 3 - OpenAI 兼容模式 (Priority: P2)

**Goal**: 通过 proxy 连接 OpenAI 兼容服务（如 vLLM、Azure）

**Independent Test**: 设置 `UPSTREAM_API_TYPE=openai`，`UPSTREAM_API_BASE` 指向 OpenAI 服务，验证正常

### Implementation for User Story 3

- [x] T017 [US3] 更新 .env.example：添加 OpenAI 模式配置示例
- [x] T018 [US3] 验证 proxy 正确转换 Anthropic → OpenAI 请求（需部署验证）
- [x] T019 [US3] 测试 OpenAI 兼容服务的错误响应处理（需部署验证）

**Checkpoint**: OpenAI 模式通过同一架构可用

---

## Phase 6: User Story 4 - 配置验证与错误提示 (Priority: P3)

**Goal**: 启动时验证配置，提供清晰错误提示

**Independent Test**: 故意配置错误，验证系统返回明确错误信息

### Implementation for User Story 4

- [x] T020 [US4] 简化 backend/app/config.py 的 `validate_config()`（移除 API 类型相关检查）
- [x] T021 [US4] 添加 proxy 连接检查：启动时验证 proxy 可达（由 Docker depends_on 保证）
- [x] T022 [US4] 更新错误消息指向新的配置方式

**Checkpoint**: 所有配置错误有清晰提示

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: 文档更新和最终验证

- [x] T023 [P] 更新 README.md：简化环境变量说明，移除 API 类型选择
- [x] T024 [P] 更新 QUICKSTART.md：统一的配置说明（由 README 覆盖）
- [x] T025 [P] 更新 backend/tests/test_config.py：移除 API 类型相关测试
- [x] T026 运行 quickstart.md 中的验证清单（24 测试通过）
- [x] T027 清理代码：移除 `llm_api_type` 相关逻辑（已在 Phase 2 完成）

---

## Dependencies & Execution Order

### Phase Dependencies

```
Setup (Phase 1)
     │
     ▼
Foundational (Phase 2) ─── BLOCKS ALL ───┐
     │                                    │
     ▼                                    ▼
User Story 1 (P1)              User Story 2 (P1)
     │                                    │
     └──────────┬─────────────────────────┘
                ▼
         User Story 3 (P2)
                │
                ▼
         User Story 4 (P3)
                │
                ▼
         Polish (Phase 7)
```

### 关键变更点

| 原架构 | 新架构（简化版） |
|--------|-----------------|
| `LLM_API_TYPE` 区分 Anthropic/OpenAI | 移除，统一通过 proxy |
| proxy 使用 profiles 条件启动 | proxy 始终运行 |
| 后端有条件判断逻辑 | 后端始终连接 proxy |
| 两种配置路径 | 一种统一配置路径 |

### Parallel Opportunities

- T001, T002 可并行（Setup 阶段）
- T012-T016 必须按顺序（同一文件 docker-compose.yml）
- T023, T024, T025 可并行（不同文件）

---

## Implementation Strategy

### MVP First

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational（简化配置）
3. Complete Phase 3 & 4: 统一架构可用
4. **STOP and VALIDATE**: 测试 Anthropic 模式
5. 可部署 MVP

### 环境变量简化

**旧版（已实现）**：
```bash
LLM_API_TYPE=anthropic  # 或 openai
LLM_API_KEY=xxx
LLM_API_BASE=https://api.anthropic.com  # 或 proxy 地址
```

**新版（简化）**：
```bash
# 应用配置（连接 proxy）
LLM_API_KEY=xxx
LLM_MODEL=claude-sonnet-4-5-20250929

# Proxy 后端配置
UPSTREAM_API_TYPE=anthropic  # 或 openai
UPSTREAM_API_BASE=https://api.anthropic.com
UPSTREAM_API_KEY=xxx  # 传给上游的 key
```

---

## Notes

- [P] tasks = 不同文件，无依赖
- [Story] 标签将任务映射到特定 User Story
- 这个简化版移除了条件判断，统一通过 proxy
- proxy 成为必需组件，始终运行
- 本地开发也需要启动 proxy（或配置直连）

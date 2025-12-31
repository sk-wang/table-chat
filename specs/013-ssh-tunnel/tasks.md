# Tasks: SSH 隧道连接支持

**Input**: Design documents from `/specs/013-ssh-tunnel/`  
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: 手动验证为主，不生成自动化测试任务（spec 未明确要求 TDD）

**Organization**: 任务按用户故事组织，支持独立实现和测试

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可并行执行（不同文件，无依赖）
- **[Story]**: 任务所属用户故事（US1, US2, US3, US4）
- 描述中包含精确文件路径

---

## Phase 1: Setup (项目初始化)

**Purpose**: 添加依赖，准备开发环境

- [X] T001 添加 asyncssh 依赖到 backend/pyproject.toml
- [X] T002 运行 `cd backend && uv sync` 安装依赖

---

## Phase 2: Foundational (基础设施)

**Purpose**: 所有用户故事共享的核心基础设施

**⚠️ CRITICAL**: 必须完成后才能开始任何用户故事

- [X] T003 创建 SSH 配置 Pydantic 模型 backend/app/models/ssh.py
- [X] T004 [P] 添加 ssh_config 列迁移到 backend/app/db/sqlite.py
- [X] T005 扩展 DatabaseCreateRequest 模型添加 ssh_config 字段 backend/app/models/database.py
- [X] T006 [P] 创建 SSHConfigResponse 脱敏响应模型 backend/app/models/ssh.py
- [X] T007 扩展 DatabaseResponse 模型添加 ssh_config 字段 backend/app/models/database.py
- [X] T008 [P] 添加 SSH 类型定义到 frontend/src/types/index.ts
- [X] T009 [P] 更新 frontend/src/services/api.ts 请求类型

**Checkpoint**: 数据模型就绪，可以开始用户故事实现

---

## Phase 3: User Story 1 - 通过 SSH 隧道连接远程数据库 (Priority: P1) 🎯 MVP

**Goal**: 用户可以通过 SSH 跳板机连接到无法直连的数据库

**Independent Test**: 配置一个需要 SSH 跳板机访问的测试数据库，验证能成功连接并执行查询

### Implementation for User Story 1

- [X] T010 [US1] 创建 SSHTunnelManager 类核心结构 backend/app/services/ssh_tunnel.py
- [X] T011 [US1] 实现 get_tunnel() 方法建立 SSH 连接和端口转发 backend/app/services/ssh_tunnel.py
- [X] T012 [US1] 实现 close_tunnel() 和 close_all() 方法 backend/app/services/ssh_tunnel.py
- [X] T013 [US1] 添加 SSH 连接日志记录（成功/失败/断开） backend/app/services/ssh_tunnel.py
- [X] T014 [US1] 修改 DatabaseConnector 基类添加隧道参数 backend/app/connectors/base.py
- [X] T015 [P] [US1] 修改 PostgreSQLConnector 支持隧道连接 backend/app/connectors/postgres.py
- [X] T016 [P] [US1] 修改 MySQLConnector 支持隧道连接 backend/app/connectors/mysql.py
- [X] T017 [US1] 修改 DatabaseManager 集成 SSH 隧道服务 backend/app/services/db_manager.py
- [X] T018 [US1] 修改 create_or_update_database API 处理 SSH 配置 backend/app/api/v1/dbs.py
- [X] T019 [US1] 修改 SQLiteManager 保存/读取 ssh_config JSON backend/app/db/sqlite.py
- [X] T020 [US1] 添加 SSH 隧道开关到 AddDatabaseModal 组件 frontend/src/components/database/AddDatabaseModal.tsx
- [X] T021 [US1] 实现 SSH 配置表单基础字段（主机、端口、用户名） frontend/src/components/database/AddDatabaseModal.tsx
- [X] T022 [US1] 实现认证方式选择器（密码/密钥切换） frontend/src/components/database/AddDatabaseModal.tsx
- [X] T023 [US1] 添加 SSH 连接错误处理和错误提示 backend/app/api/v1/dbs.py
- [X] T024 [US1] 在 FastAPI lifespan 中注册隧道清理 backend/app/main.py

**Checkpoint**: User Story 1 完成 - 可以通过 SSH 隧道连接数据库（两种认证方式都可用）

---

## Phase 4: User Story 2 - 使用 SSH 密钥认证 (Priority: P1)

**Goal**: 用户可以使用 SSH 私钥进行认证

**Independent Test**: 使用配置了 SSH 密钥认证的跳板机进行测试

### Implementation for User Story 2

- [X] T025 [US2] 实现私钥格式验证（OpenSSH/PEM 格式） backend/app/services/ssh_tunnel.py
- [X] T026 [US2] 添加私钥输入文本区域到表单 frontend/src/components/database/AddDatabaseModal.tsx
- [X] T027 [US2] 添加密钥密码可选输入框 frontend/src/components/database/AddDatabaseModal.tsx
- [X] T028 [US2] 实现私钥格式错误的友好提示 backend/app/api/v1/dbs.py
- [X] T029 [US2] 添加私钥格式帮助说明到表单 frontend/src/components/database/AddDatabaseModal.tsx

**Checkpoint**: User Story 2 完成 - 密钥认证功能完整可用

---

## Phase 5: User Story 3 - 使用密码认证连接 SSH (Priority: P2)

**Goal**: 用户可以使用 SSH 密码进行认证

**Independent Test**: 使用支持密码认证的 SSH 服务器进行测试

### Implementation for User Story 3

- [X] T030 [US3] 添加 SSH 密码输入框（密码模式时显示） frontend/src/components/database/AddDatabaseModal.tsx
- [X] T031 [US3] 确保密码认证错误提示清晰 backend/app/api/v1/dbs.py

**Checkpoint**: User Story 3 完成 - 密码认证功能完整可用

---

## Phase 6: User Story 4 - 编辑已有的 SSH 隧道配置 (Priority: P2)

**Goal**: 用户可以修改已配置数据库的 SSH 隧道设置

**Independent Test**: 添加一个带 SSH 隧道的连接，然后编辑其配置验证生效

### Implementation for User Story 4

- [X] T032 [US4] 实现编辑时 SSH 配置回显（脱敏显示） frontend/src/components/database/AddDatabaseModal.tsx
- [X] T033 [US4] 实现从非 SSH 切换到 SSH 模式的表单状态 frontend/src/components/database/AddDatabaseModal.tsx
- [X] T034 [US4] 实现编辑保存时关闭旧隧道 backend/app/services/db_manager.py
- [X] T035 [US4] 确保编辑时敏感字段提示"如需更改请重新输入" frontend/src/components/database/AddDatabaseModal.tsx

**Checkpoint**: User Story 4 完成 - 编辑功能完整可用

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: 优化和完善

- [X] T036 [P] 验证 SSH 隧道断开后查询失败提示正确
- [X] T037 [P] 验证 SSH 隧道空闲时保持活跃（keepalive）
- [X] T038 [P] 验证 PostgreSQL 和 MySQL 都能通过隧道正常工作
- [X] T039 运行 quickstart.md 验证完整流程
- [X] T040 [P] 代码清理和注释完善

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: 无依赖 - 可立即开始
- **Phase 2 (Foundational)**: 依赖 Phase 1 完成 - **阻塞所有用户故事**
- **Phase 3 (US1)**: 依赖 Phase 2 完成
- **Phase 4 (US2)**: 依赖 Phase 3 完成（扩展密钥认证）
- **Phase 5 (US3)**: 依赖 Phase 3 完成（密码认证在 US1 中已实现基础，此处完善）
- **Phase 6 (US4)**: 依赖 Phase 3 完成
- **Phase 7 (Polish)**: 依赖所有用户故事完成

### User Story Dependencies

```
Phase 1 (Setup)
     │
     ▼
Phase 2 (Foundational) ──┬─────────────────────┬─────────────────────┐
     │                   │                     │                     │
     ▼                   ▼                     ▼                     ▼
Phase 3 (US1) ─────▶ Phase 4 (US2)        Phase 5 (US3)        Phase 6 (US4)
   MVP                   │                     │                     │
                         └─────────────────────┴─────────────────────┘
                                               │
                                               ▼
                                        Phase 7 (Polish)
```

### Within Each User Story

- 后端服务层 → 连接器层 → API 层
- 前端类型 → 组件实现

### Parallel Opportunities

**Phase 2 内可并行**:
- T004 (迁移) 和 T006 (响应模型) 和 T008 (前端类型) 和 T009 (API 类型)

**Phase 3 US1 内可并行**:
- T015 (PostgreSQL 连接器) 和 T016 (MySQL 连接器)

**Phase 4-6 可并行**（不同开发者）:
- US2、US3、US4 可在 US1 完成后由不同开发者并行实现

---

## Parallel Example: Phase 2 Foundational

```bash
# 可同时启动的任务:
Task T004: 添加 ssh_config 列迁移 (sqlite.py)
Task T006: 创建 SSHConfigResponse 脱敏模型 (ssh.py)
Task T008: 添加 SSH 类型定义 (types/index.ts)
Task T009: 更新 API 请求类型 (api.ts)
```

---

## Parallel Example: Phase 3 User Story 1

```bash
# 连接器修改可同时进行:
Task T015: 修改 PostgreSQLConnector 支持隧道连接
Task T016: 修改 MySQLConnector 支持隧道连接
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. ✅ Complete Phase 1: Setup
2. ✅ Complete Phase 2: Foundational
3. ✅ Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: 通过 SSH 隧道连接一个测试数据库
5. Deploy/demo if ready - **MVP 可交付**

### Incremental Delivery

1. Setup + Foundational → 基础就绪
2. User Story 1 → 测试 → **MVP 发布** 🚀
3. User Story 2 → 测试 → 增加密钥认证
4. User Story 3 → 测试 → 完善密码认证
5. User Story 4 → 测试 → 增加编辑功能
6. Polish → 最终验证 → **完整发布**

---

## Notes

- [P] 任务 = 不同文件，无依赖
- [US?] 标签 = 任务对应的用户故事
- US1 是 MVP，完成后即可交付使用
- SSH 隧道需要可访问的 SSH 服务器进行测试
- 每个 Checkpoint 后进行手动验证
- 提交粒度：每个任务或逻辑任务组后提交


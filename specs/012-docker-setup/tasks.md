# Tasks: Docker 容器化部署

**Input**: Design documents from `/specs/012-docker-setup/`  
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, quickstart.md ✓

**Tests**: 手动验证（无自动化测试要求）

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

本功能在项目根目录和子目录创建 Docker 配置文件：
- 根目录：`docker-compose.yml`, `.env.example`
- 后端：`backend/Dockerfile`, `backend/.dockerignore`
- 前端：`frontend/Dockerfile`, `frontend/nginx.conf`, `frontend/.dockerignore`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 创建构建排除文件，优化镜像大小

- [x] T001 [P] Create backend/.dockerignore with Python exclusions (venv, __pycache__, .pytest_cache, htmlcov, *.pyc)
- [x] T002 [P] Create frontend/.dockerignore with Node.js exclusions (node_modules, dist, .cache, *.log)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 本功能无需阻塞性基础设施

> ✅ 跳过 - 直接进入用户故事实现

---

## Phase 3: User Story 1 - 一键启动完整应用 (Priority: P1) 🎯 MVP

**Goal**: 用户通过 `docker compose up` 命令启动完整应用（前端 + 后端）

**Independent Test**: 在安装了 Docker 的机器上执行 `docker compose up --build`，验证前端可通过 http://localhost:5888 访问，后端 API 可通过 http://localhost:7888/docs 访问

### Implementation for User Story 1

- [x] T003 [P] [US1] Create backend/Dockerfile with python:3.13-slim base, uv install, uvicorn startup
- [x] T004 [P] [US1] Create frontend/nginx.conf with SPA routing and API reverse proxy to backend:7888
- [x] T005 [US1] Create frontend/Dockerfile with multi-stage build (Node.js build → Nginx serve)
- [x] T006 [US1] Create docker-compose.yml with backend and frontend services, network configuration
- [ ] T007 [US1] Verify docker compose up --build starts both services successfully

**Checkpoint**: 用户可以通过 `docker compose up` 启动应用并访问前端页面

---

## Phase 4: User Story 2 - 配置环境变量 (Priority: P2)

**Goal**: 用户通过 `.env` 文件配置 LLM/Agent API 密钥等敏感信息

**Independent Test**: 创建 `.env` 文件配置 `LLM_API_KEY`，启动容器后验证自然语言查询功能正常工作

### Implementation for User Story 2

- [x] T008 [US2] Create .env.example with all configurable environment variables (LLM, Agent, Database)
- [x] T009 [US2] Update docker-compose.yml to use env_file: .env for backend service
- [ ] T010 [US2] Verify backend reads environment variables correctly from .env file

**Checkpoint**: 用户可以通过 `.env` 文件配置应用，无需修改代码

---

## Phase 5: User Story 3 - 数据持久化 (Priority: P2)

**Goal**: 容器重启后数据库连接配置和查询历史不丢失

**Independent Test**: 添加数据库连接后执行 `docker compose restart`，验证连接配置仍存在

### Implementation for User Story 3

- [x] T011 [US3] Update docker-compose.yml with named volume (tablechat-data) for SQLite persistence
- [x] T012 [US3] Update backend/Dockerfile to set DATABASE_PATH to /app/data/scinew.db
- [ ] T013 [US3] Verify data persists after docker compose down && docker compose up

**Checkpoint**: 用户数据在容器重启后完整保留

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 文档更新和验证

- [x] T014 [P] Update README.md with Docker quick start section
- [x] T015 [P] Add health check configuration to docker-compose.yml for both services
- [ ] T016 Run full validation per quickstart.md (clone → docker compose up → access → down)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Skipped
- **User Stories (Phase 3-5)**: 
  - US1 must complete before US2 and US3 (docker-compose.yml is the foundation)
  - US2 and US3 can proceed in parallel after US1
- **Polish (Phase 6)**: Depends on all user stories complete

### User Story Dependencies

```
Phase 1 (Setup)
    │
    ▼
Phase 3 (US1: Core Docker Files) ─── MVP ───┐
    │                                        │
    ├────────────┬───────────────────────────┤
    │            │                           │
    ▼            ▼                           │
Phase 4      Phase 5                         │
(US2: Env)   (US3: Volume)                   │
    │            │                           │
    └────────────┴───────────────────────────┤
                                             │
                                             ▼
                                    Phase 6 (Polish)
```

### Parallel Opportunities

**Phase 1** (可并行):
- T001 backend/.dockerignore
- T002 frontend/.dockerignore

**Phase 3 US1** (部分可并行):
- T003 backend/Dockerfile ║ T004 nginx.conf
- T005 frontend/Dockerfile (依赖 T004)
- T006 docker-compose.yml (依赖 T003, T005)

**Phase 4-5** (跨 Story 可并行):
- US2 和 US3 可由不同开发者并行

**Phase 6** (部分可并行):
- T014 README ║ T015 health check

---

## Parallel Example: Phase 1 & Phase 3

```bash
# Phase 1: Launch in parallel
Task T001: "Create backend/.dockerignore"
Task T002: "Create frontend/.dockerignore"

# Phase 3: Launch Dockerfile creation in parallel
Task T003: "Create backend/Dockerfile"
Task T004: "Create frontend/nginx.conf"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (.dockerignore files)
2. Complete Phase 3: User Story 1 (Core Docker files)
3. **STOP and VALIDATE**: `docker compose up --build` works
4. Demo: User can access application at http://localhost:5888

### Incremental Delivery

1. Complete Setup + US1 → **MVP Ready!** (一键启动)
2. Add US2 → Environment configuration (生产就绪)
3. Add US3 → Data persistence (完整体验)
4. Polish → Documentation and health checks

### Single Developer Strategy

1. T001, T002 (Setup) → 5 min
2. T003, T004, T005, T006, T007 (US1) → 30 min
3. T008, T009, T010 (US2) → 15 min
4. T011, T012, T013 (US3) → 15 min
5. T014, T015, T016 (Polish) → 20 min

**Estimated Total**: ~1.5 hours

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- 本功能无需自动化测试，采用手动验证
- 每个任务完成后建议 commit
- MVP 只需完成 Phase 1 + Phase 3 (US1)
- 避免：同时修改 docker-compose.yml（非并行任务）


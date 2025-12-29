# Tasks: 浏览器本地缓存

**Input**: Design documents from `/specs/007-localstorage-cache/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Frontend**: `frontend/src/` for source code

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 创建缓存服务基础设施

- [ ] T001 [P] 创建缓存类型定义文件 `frontend/src/types/storage.ts`
- [ ] T002 [P] 创建缓存服务文件 `frontend/src/services/storage.ts`

---

## Phase 2: Foundational (Core Cache Service)

**Purpose**: 实现核心缓存服务，为所有用户故事提供基础能力

**⚠️ CRITICAL**: 所有用户故事依赖此阶段完成

- [ ] T003 实现安全的 localStorage 读写封装（try-catch）in `frontend/src/services/storage.ts`
- [ ] T004 实现缓存版本管理（getVersion/setVersion/checkVersion）in `frontend/src/services/storage.ts`
- [ ] T005 实现版本不兼容时的缓存清理逻辑 in `frontend/src/services/storage.ts`

**Checkpoint**: 缓存服务基础能力就绪，可以开始用户故事实现

---

## Phase 3: User Story 1 - 自动恢复上次选中的数据库 (Priority: P1) 🎯 MVP

**Goal**: 用户打开应用时，系统自动选中上次使用的数据库连接

**Independent Test**: 选择数据库 → 刷新页面 → 验证自动选中

### Implementation for User Story 1

- [ ] T006 [US1] 实现 getSelectedDatabase/setSelectedDatabase/clearSelectedDatabase 方法 in `frontend/src/services/storage.ts`
- [ ] T007 [US1] 修改 DatabaseContext 在选择数据库时保存到缓存 in `frontend/src/contexts/DatabaseContext.tsx`
- [ ] T008 [US1] 修改 DatabaseContext 在初始化时从缓存恢复选中的数据库 in `frontend/src/contexts/DatabaseContext.tsx`
- [ ] T009 [US1] 处理边界情况：已删除的数据库不应被自动选中 in `frontend/src/contexts/DatabaseContext.tsx`

**Checkpoint**: 用户故事 1 功能完整，可独立测试

---

## Phase 4: User Story 2 - 缓存表列表加速加载 (Priority: P1)

**Goal**: 切换数据库时优先使用缓存的表列表，减少 API 调用

**Independent Test**: 加载表列表 → 切换数据库 → 切换回来 → 验证即时显示（无加载提示）

### Implementation for User Story 2

- [ ] T010 [US2] 实现 getTableListCache/setTableListCache/clearTableListCache 方法 in `frontend/src/services/storage.ts`
- [ ] T011 [US2] 修改 QueryPage 在加载表列表时优先检查缓存 in `frontend/src/pages/query/index.tsx`
- [ ] T012 [US2] 修改 QueryPage 在成功获取表列表后更新缓存 in `frontend/src/pages/query/index.tsx`
- [ ] T013 [US2] 修改强制刷新逻辑：忽略缓存并更新 in `frontend/src/pages/query/index.tsx`

**Checkpoint**: 用户故事 2 功能完整，可独立测试

---

## Phase 5: User Story 3 - 缓存表字段详情 (Priority: P2)

**Goal**: 缓存已加载的表字段详情，避免重复请求

**Independent Test**: 展开表 → 折叠 → 再展开 → 验证即时显示

### Implementation for User Story 3

- [ ] T014 [US3] 实现 getTableDetailsCache/setTableDetailsCache/clearTableDetailsCache 方法 in `frontend/src/services/storage.ts`
- [ ] T015 [US3] 修改 QueryPage 的 loadTableDetails 函数优先检查缓存 in `frontend/src/pages/query/index.tsx`
- [ ] T016 [US3] 修改 loadTableDetails 在成功获取后更新缓存 in `frontend/src/pages/query/index.tsx`
- [ ] T017 [US3] 强制刷新时清除所有表字段缓存 in `frontend/src/pages/query/index.tsx`

**Checkpoint**: 用户故事 3 功能完整，可独立测试

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 完善和优化

- [ ] T018 实现 clearAllCache 方法用于调试 in `frontend/src/services/storage.ts`
- [ ] T019 实现 clearDatabaseCache(dbName) 方法清除特定数据库的缓存 in `frontend/src/services/storage.ts`
- [ ] T020 添加控制台日志（开发模式）记录缓存命中/未命中 in `frontend/src/services/storage.ts`
- [ ] T021 验证 localStorage 不可用时的优雅降级 in `frontend/src/services/storage.ts`
- [ ] T022 构建并测试完整功能 via `npm run build`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 无依赖，可立即开始
- **Foundational (Phase 2)**: 依赖 Setup 完成，阻塞所有用户故事
- **User Stories (Phase 3-5)**: 都依赖 Foundational 完成
  - US1 和 US2 可以并行开发（不同文件）
  - US3 依赖 US2 的缓存结构但可独立测试
- **Polish (Phase 6)**: 依赖所有用户故事完成

### User Story Dependencies

- **User Story 1 (P1)**: 独立，可在 Foundational 后开始
- **User Story 2 (P1)**: 独立，可在 Foundational 后开始
- **User Story 3 (P2)**: 依赖 US2 的缓存服务方法，但功能独立可测试

### Within Each User Story

- 缓存服务方法先于组件集成
- 核心功能先于边界处理
- 功能完成后验证

### Parallel Opportunities

- T001 和 T002 可并行（不同文件）
- US1 和 US2 可并行开发（修改不同逻辑路径）
- 所有 Polish 任务可按需并行

---

## Parallel Example: Setup Phase

```bash
# 可同时执行:
Task T001: 创建类型定义 frontend/src/types/storage.ts
Task T002: 创建服务文件 frontend/src/services/storage.ts
```

## Parallel Example: User Stories

```bash
# 在 Foundational 完成后，可同时进行:
Developer A: User Story 1 (T006-T009) - DatabaseContext 修改
Developer B: User Story 2 (T010-T013) - QueryPage 表列表缓存
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. 完成 Phase 1: Setup
2. 完成 Phase 2: Foundational
3. 完成 Phase 3: User Story 1 (自动恢复数据库)
4. **STOP and VALIDATE**: 刷新页面测试数据库恢复
5. 可部署 MVP

### Incremental Delivery

1. Setup + Foundational → 缓存服务就绪
2. User Story 1 → 测试 → 部署 (MVP!)
3. User Story 2 → 测试 → 部署 (表列表缓存)
4. User Story 3 → 测试 → 部署 (表字段缓存)
5. 每个故事独立增加价值

---

## Notes

- [P] 任务可并行执行（不同文件，无依赖）
- [Story] 标签关联任务到具体用户故事
- 每个用户故事应独立可完成和测试
- localStorage 操作需用 try-catch 包装
- 每完成一个任务或逻辑组后提交
- 在任何检查点停止验证功能


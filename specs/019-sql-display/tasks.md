# Tasks: SQL Code Display Optimization

**Input**: Design documents from `/specs/019-sql-display/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, quickstart.md ✅

**Tests**: 根据 Constitution VI (Comprehensive Testing Requirements)，需要 E2E 测试覆盖。

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `frontend/src/` (此功能仅涉及前端)
- **E2E tests**: `frontend/e2e/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 确认现有代码结构，无需创建新项目

- [x] T001 确认现有组件结构 `frontend/src/components/agent/` 包含 MarkdownRenderer.tsx, AgentMessage.tsx, styles.css

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 本功能无需额外基础设施，现有代码已满足前提条件

**⚠️ CRITICAL**: 无阻塞依赖，可直接进入用户故事实现

**Checkpoint**: Foundation ready - 可以开始用户故事实现

---

## Phase 3: User Story 1 - Copy SQL Code Block (Priority: P1) 🎯 MVP

**Goal**: 为所有 Markdown 代码块添加复制按钮，点击后将代码复制到剪贴板

**Independent Test**: 发送任意生成 SQL 的请求，验证代码块右上角出现复制按钮，点击后 SQL 被复制到剪贴板

### Implementation for User Story 1

- [x] T002 [P] [US1] 在 renderer.code 中添加复制按钮 HTML 结构 `frontend/src/components/agent/MarkdownRenderer.tsx`
- [x] T003 [P] [US1] 添加复制按钮基础样式 (.code-copy-btn) `frontend/src/components/agent/styles.css`
- [x] T004 [US1] 添加 useEffect 处理复制按钮点击事件 `frontend/src/components/agent/MarkdownRenderer.tsx`
- [x] T005 [US1] 实现 Clipboard API 复制功能，包含降级方案 `frontend/src/components/agent/MarkdownRenderer.tsx`

**Checkpoint**: 复制按钮功能完成，可以点击复制代码到剪贴板

---

## Phase 4: User Story 2 - Constrained Width Display (Priority: P1)

**Goal**: 确保代码块不超出消息气泡的可见区域，超长内容可水平滚动

**Independent Test**: 生成超长 SQL 语句，验证代码块不会超出消息气泡边界，超长内容可水平滚动

### Implementation for User Story 2

- [x] T006 [P] [US2] 在消息气泡添加 overflow: hidden 和 minWidth: 0 `frontend/src/components/agent/AgentMessage.tsx`
- [x] T007 [P] [US2] 修改 .markdown-code-block 宽度约束为 max-width: 100% `frontend/src/components/agent/styles.css`
- [x] T008 [US2] 为 pre 元素添加 overflow-x: auto 和滚动条样式 `frontend/src/components/agent/styles.css`

**Checkpoint**: 代码块宽度受控，超长内容可水平滚动

---

## Phase 5: User Story 3 - Visual Feedback for Copy Action (Priority: P2)

**Goal**: 复制成功后显示"已复制"状态，2秒后恢复

**Independent Test**: 点击复制按钮后观察按钮状态变化，确认显示"已复制"并在2秒后恢复

### Implementation for User Story 3

- [x] T009 [P] [US3] 添加 .code-copy-btn.copied 成功状态样式 `frontend/src/components/agent/styles.css`
- [x] T010 [US3] 实现复制成功后的状态切换逻辑（添加/移除 .copied class）`frontend/src/components/agent/MarkdownRenderer.tsx`
- [x] T011 [US3] 实现 2 秒后自动恢复原状的 setTimeout 逻辑 `frontend/src/components/agent/MarkdownRenderer.tsx`
- [x] T012 [US3] 实现复制失败时的错误提示显示 `frontend/src/components/agent/MarkdownRenderer.tsx`

**Checkpoint**: 复制操作有完整的视觉反馈

---

## Phase 6: Testing & Polish

**Purpose**: E2E 测试覆盖和最终验证

### E2E Tests (Constitution VI Required)

- [x] T013 [P] 创建 E2E 测试文件结构 `frontend/e2e/sql-display.spec.ts`
- [x] T014 [P] 编写复制按钮显示测试用例 `frontend/e2e/sql-display.spec.ts`
- [x] T015 [P] 编写复制功能测试用例 `frontend/e2e/sql-display.spec.ts`
- [x] T016 [P] 编写代码块宽度约束测试用例 `frontend/e2e/sql-display.spec.ts`
- [x] T017 [P] 编写视觉反馈测试用例 `frontend/e2e/sql-display.spec.ts`

### Polish

- [x] T018 运行 TypeScript 类型检查确认无错误 `npm run build`
- [x] T019 运行 E2E 测试验证所有功能 `npx playwright test sql-display` ✅ 7/7 passed
- [x] T020 验证 quickstart.md 中的手动测试步骤

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - 确认现有结构
- **Foundational (Phase 2)**: 无阻塞依赖
- **User Stories (Phase 3-5)**: US1 和 US2 可以并行（不同功能），US3 依赖 US1（视觉反馈是复制功能的补充）
- **Testing & Polish (Phase 6)**: 依赖所有用户故事完成

### User Story Dependencies

- **User Story 1 (P1)**: 独立，无依赖
- **User Story 2 (P1)**: 独立，无依赖（与 US1 可并行）
- **User Story 3 (P2)**: 依赖 US1（是复制功能的视觉反馈增强）

### Within Each User Story

- CSS 样式任务 [P] 可与其他样式任务并行
- TypeScript 逻辑任务需按依赖顺序执行
- 测试任务 [P] 可并行执行

### Parallel Opportunities

- T002, T003 可并行（不同文件）
- T006, T007 可并行（不同文件）
- T013-T017 可并行（同一测试文件但不同测试用例）
- US1 和 US2 整体可并行（不同功能领域）

---

## Parallel Example: User Story 1 + User Story 2

```bash
# 可以同时启动两个用户故事的并行任务：
# US1:
Task: "在 renderer.code 中添加复制按钮 HTML 结构 frontend/src/components/agent/MarkdownRenderer.tsx"
Task: "添加复制按钮基础样式 (.code-copy-btn) frontend/src/components/agent/styles.css"

# US2 (同时进行):
Task: "在消息气泡添加 overflow: hidden 和 minWidth: 0 frontend/src/components/agent/AgentMessage.tsx"
Task: "修改 .markdown-code-block 宽度约束为 max-width: 100% frontend/src/components/agent/styles.css"
```

---

## Implementation Strategy

### MVP First (User Story 1 + User Story 2)

1. Complete Phase 1: Setup（确认结构）
2. Complete Phase 3: User Story 1（复制功能）
3. Complete Phase 4: User Story 2（宽度约束）
4. **STOP and VALIDATE**: 手动测试两个核心功能
5. Deploy/demo if ready

### Incremental Delivery

1. US1 + US2 → 核心功能可用 (MVP!)
2. Add US3 → 完整用户体验
3. Add Tests → 质量保证
4. Each story adds value without breaking previous stories

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- US1 和 US2 都是 P1 优先级，应同时实现
- US3 是 P2，在核心功能完成后再实现
- E2E 测试是 Constitution VI 的强制要求
- Commit after each task or logical group

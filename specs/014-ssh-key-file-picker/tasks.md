# Tasks: SSH 私钥文件选择器

**Input**: Design documents from `/specs/014-ssh-key-file-picker/`  
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, quickstart.md ✓

**Tests**: E2E 测试（根据 Constitution Principle VI 要求）

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

**额外要求**: 调整 SSH 配置页面样式，符合 JetBrains IDE 风格

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `frontend/src/`, `frontend/e2e/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 项目准备，无需额外设置（功能基于现有组件增强）

- [ ] T001 确认开发环境就绪，运行 `cd frontend && npm install` 验证依赖

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 基础工具函数，为所有用户故事提供支持

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T002 创建文件读取工具函数 `readFileAsText()` in `frontend/src/utils/fileReader.ts`
  - 接受 File 对象，返回 Promise<string>
  - 包含文件大小检查（100KB 上限）
  - 包含完整 TypeScript 类型定义
  - 错误处理：文件过大、读取失败

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - 通过文件选择器导入私钥 (Priority: P1) 🎯 MVP

**Goal**: 用户可以点击"选择文件"按钮，从本地文件系统选择私钥文件，内容自动填入文本框

**Independent Test**: 打开添加数据库对话框 → 启用 SSH → 选择密钥认证 → 点击"选择文件" → 选择私钥文件 → 验证内容填入

### Implementation for User Story 1

- [ ] T003 [US1] 添加文件输入 ref 和状态管理 in `frontend/src/components/database/AddDatabaseModal.tsx`
  - 添加 `useRef<HTMLInputElement>(null)` for 隐藏的 file input
  - 导入 `UploadOutlined` 图标

- [ ] T004 [US1] 实现文件选择处理函数 `handleFileSelect` in `frontend/src/components/database/AddDatabaseModal.tsx`
  - 使用 `readFileAsText()` 工具函数
  - 成功时调用 `form.setFieldValue('sshPrivateKey', content)`
  - 失败时使用 `message.error()` 显示错误
  - 重置 input.value 以允许重复选择同一文件

- [ ] T005 [US1] 修改私钥输入区域 UI，添加"选择文件"按钮 in `frontend/src/components/database/AddDatabaseModal.tsx`
  - 添加隐藏的 `<input type="file" ref={fileInputRef} />`
  - 在私钥 TextArea 上方添加 "选择文件" 按钮（JetBrains 风格：输入框 + 右侧按钮布局）
  - 按钮文字："Browse..." 或 "浏览..."
  - 按钮点击时触发 `fileInputRef.current?.click()`

**Checkpoint**: User Story 1 complete - 文件选择功能可独立测试

---

## Phase 4: User Story 2 - 保留手动粘贴方式 (Priority: P1)

**Goal**: 用户仍可直接在文本框粘贴私钥内容，新增功能不影响原有方式

**Independent Test**: 直接在私钥文本框中粘贴内容 → 提交表单 → 验证私钥被正确保存

### Implementation for User Story 2

- [ ] T006 [US2] 验证 TextArea 粘贴功能保持正常 in `frontend/src/components/database/AddDatabaseModal.tsx`
  - 确保 TextArea 的 onChange 事件正常触发
  - 确保文件选择后仍可手动编辑内容
  - 无需代码改动，仅需验证（可与 T005 合并验证）

**Checkpoint**: User Story 2 complete - 手动粘贴功能保持可用

---

## Phase 5: User Story 3 - 文件读取失败处理 (Priority: P2)

**Goal**: 当文件读取失败时，显示友好错误提示，用户可重试或手动粘贴

**Independent Test**: 选择一个过大的文件 → 验证错误提示显示 → 可重新选择或手动粘贴

### Implementation for User Story 3

- [ ] T007 [US3] 完善错误处理逻辑 in `frontend/src/components/database/AddDatabaseModal.tsx`
  - 文件过大 (>100KB): "文件过大，私钥文件通常小于 100KB"
  - 读取失败: "无法读取文件，请确认文件格式"
  - 确保错误后不清空已有内容

**Checkpoint**: User Story 3 complete - 错误处理完善

---

## Phase 6: JetBrains IDE 风格样式调整 (Priority: P2)

**Goal**: 调整 SSH 配置区域样式，符合 JetBrains IDE 风格

**Independent Test**: 视觉检查 SSH 配置区域，与 JetBrains IDE 对比

### Implementation for Style Adjustments

- [ ] T008 [P] 调整 SSH 配置面板整体样式 in `frontend/src/components/database/AddDatabaseModal.tsx`
  - 使用更紧凑的表单布局（减少 margin/padding）
  - 表单标签与输入框水平对齐（labelCol + wrapperCol）
  - 移除 Collapse 组件，改用直接展示（JetBrains 风格无折叠）

- [ ] T009 [P] 调整私钥输入区域为 JetBrains 风格 in `frontend/src/components/database/AddDatabaseModal.tsx`
  - 私钥路径/内容显示使用等宽字体（JetBrains Mono 或 monospace）
  - 输入框 + 右侧 "Browse..." 按钮的经典布局
  - 按钮样式：紧凑、边框清晰
  - TextArea 背景使用浅灰色（#f5f5f5）以区分

- [ ] T010 [P] 调整认证类型选择器样式 in `frontend/src/components/database/AddDatabaseModal.tsx`
  - 使用下拉选择框（Select）替代 Radio.Group（更符合 JetBrains 风格）
  - 或保留 Radio 但调整为更紧凑的样式

- [ ] T011 [P] 调整密码/密钥输入框样式 in `frontend/src/components/database/AddDatabaseModal.tsx`
  - 密码输入框添加显示/隐藏切换图标
  - 密钥 Passphrase 与私钥输入使用一致样式
  - 帮助文本使用更小字号和浅灰色

**Checkpoint**: JetBrains 风格样式调整完成

---

## Phase 7: E2E Testing

**Purpose**: 添加 Playwright E2E 测试（Constitution Principle VI 要求）

- [ ] T012 [P] 创建 SSH 私钥文件选择器 E2E 测试文件 `frontend/e2e/ssh-key-file-picker.spec.ts`
  - 测试场景 1: 文件选择后内容填入 TextArea
  - 测试场景 2: 手动粘贴私钥内容
  - 测试场景 3: 多次选择文件，新内容覆盖旧内容
  - 测试场景 4: 取消文件选择，保持原有状态

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: 收尾工作

- [ ] T013 运行 ESLint 和 TypeScript 检查 `cd frontend && npm run lint && npm run type-check`
- [ ] T014 运行 E2E 测试验证 `cd frontend && npx playwright test ssh-key-file-picker`
- [ ] T015 更新 quickstart.md 标记完成状态 in `specs/014-ssh-key-file-picker/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational
- **User Story 2 (Phase 4)**: Depends on User Story 1 completion (验证性任务)
- **User Story 3 (Phase 5)**: Depends on User Story 1 completion
- **Style Adjustments (Phase 6)**: Can run in parallel with User Stories 2 & 3
- **E2E Testing (Phase 7)**: Depends on all User Stories complete
- **Polish (Phase 8)**: Depends on all previous phases

### User Story Dependencies

- **User Story 1 (P1)**: 核心功能，必须首先完成
- **User Story 2 (P1)**: 验证性任务，确保原有功能不受影响
- **User Story 3 (P2)**: 增强型功能，可在 US1 完成后并行开发

### Parallel Opportunities

- **Phase 6**: T008, T009, T010, T011 可并行执行（不同代码区域）
- **Phase 7**: T012 可与 Phase 6 并行进行

---

## Parallel Example: Phase 6 Style Adjustments

```bash
# 可并行执行的样式调整任务：
Task: T008 "调整 SSH 配置面板整体样式"
Task: T009 "调整私钥输入区域为 JetBrains 风格"
Task: T010 "调整认证类型选择器样式"
Task: T011 "调整密码/密钥输入框样式"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup ✓
2. Complete Phase 2: Foundational (T002)
3. Complete Phase 3: User Story 1 (T003-T005)
4. **STOP and VALIDATE**: 测试文件选择功能
5. 可以先发布 MVP

### Incremental Delivery

1. Setup + Foundational → 基础就绪
2. User Story 1 → 文件选择功能可用 → MVP!
3. User Story 2 → 验证兼容性
4. User Story 3 → 完善错误处理
5. Style Adjustments → JetBrains 风格
6. E2E Tests → 质量保证
7. Polish → 完成

---

## Summary

| Phase | 任务数 | 描述 |
|-------|--------|------|
| Phase 1: Setup | 1 | 环境准备 |
| Phase 2: Foundational | 1 | 工具函数 |
| Phase 3: User Story 1 | 3 | 文件选择核心功能 |
| Phase 4: User Story 2 | 1 | 兼容性验证 |
| Phase 5: User Story 3 | 1 | 错误处理 |
| Phase 6: Style | 4 | JetBrains 风格 |
| Phase 7: E2E Testing | 1 | 自动化测试 |
| Phase 8: Polish | 3 | 收尾 |
| **Total** | **15** | |

---

## Notes

- [P] tasks = different files/areas, no dependencies
- [Story] label maps task to specific user story for traceability
- JetBrains 风格重点：紧凑布局、输入框+Browse按钮、等宽字体、清晰边界
- Constitution Principle VI 要求 E2E 测试覆盖主要用户流程
- Commit after each task or logical group


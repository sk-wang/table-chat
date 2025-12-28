# Tasks: Table Search Feature

**Feature**: 003-table-search | **Date**: 2025-12-28
**Input**: Design documents from `/specs/003-table-search/`

**Organization**: Simplified 3-phase approach for this small feature

## 格式说明

- **[P]**: 可并行执行（不同文件，无依赖）
- **[Story]**: 所属用户故事 (US1, US2, US3, US4)

---

## Phase 1: 组件开发 🎯

**目的**: 实现搜索组件和集成到侧边栏

### 实现任务

- [x] T001 [P] [US1][US2][US3] 扩展 `frontend/src/types/metadata.ts` 添加搜索状态类型
- [x] T002 [P] [US1][US2][US3] 创建 `frontend/src/components/sidebar/TableSearchInput.tsx` 搜索输入组件
- [x] T003 [P] [US1][US2][US3] 在 `frontend/src/components/sidebar/TableSearchInput.tsx` 实现搜索逻辑（大小写不敏感子串匹配）
- [x] T004 [P] [US1][US2][US3] 在 `frontend/src/components/sidebar/TableSearchInput.tsx` 实现 300ms 防抖
- [x] T005 [P] [US3] 在 `frontend/src/components/sidebar/TableSearchInput.tsx` 添加结果计数显示
- [x] T006 [US1][US2][US3][US4] 修改 `frontend/src/components/sidebar/DatabaseSidebar.tsx` 集成搜索组件到 Schema 面板顶部
- [x] T007 [US1][US2] 修改 `frontend/src/components/sidebar/DatabaseSidebar.tsx` 实现过滤后的表列表显示
- [x] T008 [US1] 修改 `frontend/src/components/sidebar/DatabaseSidebar.tsx` 处理空搜索结果提示
- [x] T009 [US4] 修改 `frontend/src/components/sidebar/DatabaseSidebar.tsx` 确保快速输入时响应性

**独立测试**: 在侧边栏输入搜索词，验证表列表正确过滤

---

## Phase 2: E2E 测试

**目的**: 添加 Playwright E2E 测试确保功能正常

### 测试任务

- [x] T010 [P] 创建 `tests/frontend/e2e/table-search.spec.ts` 文件
- [x] T011 [P] [US1] 添加测试：搜索表名验证结果过滤
- [x] T012 [P] [US2] 添加测试：模糊匹配（部分表名、大小写不敏感）
- [x] T013 [P] [US3] 添加测试：结果计数显示
- [x] T014 [P] [US1] 添加测试：清空搜索恢复所有表
- [x] T015 [P] [US1] 添加测试：无结果时提示

**运行测试**: `npx playwright test tests/frontend/e2e/table-search.spec.ts`

---

## Phase 3: 优化收尾

**目的**: 完善细节和体验

### 优化任务

- [x] T016 [P] 样式优化：确保搜索框与 JetBrains Darcula 主题一致
- [x] T017 [P] 无障碍：确保搜索输入框有合适的 aria-label
- [x] T018 [P] 代码清理：移除调试代码，优化类型定义

---

## 依赖关系

### 执行顺序

1. **Phase 1** (T001-T009): 按顺序执行，T006 依赖 T002-T005 完成
2. **Phase 2** (T010-T015): 可在 Phase 1 完成后并行
3. **Phase 3** (T016-T018): 在 Phase 1 + Phase 2 完成后执行

### 并行机会

- T001-T005 可并行（不同文件）
- T010-T015 可并行（不同测试用例）
- T016-T018 可并行（不同优化项）

---

## 快速开始

```bash
# 启动开发服务器
cd frontend && npm run dev

# 运行 E2E 测试
npx playwright install chromium
npx playwright test tests/frontend/e2e/table-search.spec.ts
```

---

## 任务统计

| 阶段 | 任务数 | 说明 |
|------|--------|------|
| Phase 1 | 9 | 组件开发 |
| Phase 2 | 6 | E2E 测试 |
| Phase 3 | 3 | 优化收尾 |
| **总计** | **18** | - |

### 按用户故事统计

- US1 (快速搜索): T001, T002, T003, T004, T006, T007, T008, T011, T012, T014, T015 (11)
- US2 (模糊匹配): T001, T002, T003, T004, T006, T007, T012 (7)
- US3 (结果计数): T001, T002, T005, T006, T007, T013 (6)
- US4 (性能): T004, T006, T009 (3)

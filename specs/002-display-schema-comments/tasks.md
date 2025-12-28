# Tasks: 显示数据库表和字段注释

**Input**: Design documents from `/specs/002-display-schema-comments/`  
**Prerequisites**: plan.md, spec.md

## Format: `[ID] [P?] Description`

- **[P]**: 可并行执行（不同文件，无依赖）

---

## Phase 1: 后端修复（缓存层支持表注释）

**目标**: 确保表注释在缓存后能够正确保存和恢复

- [x] T001 修改 `backend/app/db/sqlite.py` - 添加 `table_comment` 字段到 schema
- [x] T002 修改 `backend/app/db/sqlite.py` - `save_metadata()` 接受并保存 `table_comment`
- [x] T003 修改 `backend/app/db/sqlite.py` - `get_metadata_for_database()` 返回 `table_comment`
- [x] T004 修改 `backend/app/services/metadata_service.py` - `cache_metadata()` 传递 `table.comment`
- [x] T005 修改 `backend/app/services/metadata_service.py` - `get_cached_metadata()` 恢复 `TableMetadata.comment`
- [x] T006 添加单元测试 `backend/tests/test_services/test_metadata_service.py` - 测试注释缓存

**Checkpoint**: 后端API返回的metadata包含完整的表注释和字段注释

---

## Phase 2: 前端表结构树注释显示 (P1)

**目标**: 在侧边栏直接显示表注释和字段注释

- [x] T007 修改 `frontend/src/components/sidebar/DatabaseSidebar.tsx` - 表节点显示注释（灰色文字，超50字符截断+Tooltip）
- [x] T008 修改 `frontend/src/components/sidebar/DatabaseSidebar.tsx` - 列节点显示注释（灰色文字，超30字符截断+Tooltip）
- [x] T009 添加E2E测试 `frontend/e2e/schema-comments.spec.ts` - 测试注释显示

**Checkpoint**: 侧边栏表结构树中直接显示表/列注释

---

## Phase 3: 查询结果增强 (P2)

**目标**: 查询结果列头显示注释 + 列宽可拖拽

- [x] T010 安装依赖 `npm install react-resizable @types/react-resizable`
- [x] T011 修改 `frontend/src/components/results/QueryResultTable.tsx` - 列头下方显示字段注释
- [x] T012 修改 `frontend/src/components/results/QueryResultTable.tsx` - 实现列宽拖拽（ResizableTitle组件）
- [x] T013 修改 `frontend/src/pages/query/index.tsx` - 传递 `metadata` prop 给 QueryResultTable
- [x] T014 [P] E2E测试已包含在 `frontend/e2e/schema-comments.spec.ts` 中

**Checkpoint**: 查询结果表格支持列注释显示和列宽拖拽

---

## Dependencies & Execution Order

```
Phase 1 (后端) ──→ Phase 2 (表结构树) ──→ Phase 3 (查询结果)
    │                    │
    └── 并行：T001-T005  └── 并行：T007-T008
```

### 并行机会

- **Phase 1**: T001-T003 可并行（SQLite层），T004-T005 可并行（Service层）
- **Phase 2**: T007-T008 可并行（不同树节点类型）
- **Phase 3**: T011-T012 可并行（不同功能）

---

## 快速验收

每个Phase完成后的验收步骤：

**Phase 1 验收**:
```bash
cd backend && pytest tests/test_services/test_metadata_service.py -v
```

**Phase 2 验收**:
- 连接带注释的PostgreSQL数据库
- 查看侧边栏表结构树是否显示注释

**Phase 3 验收**:
- 执行 `SELECT * FROM table_with_comments`
- 验证列头显示注释
- 拖拽列边框调整列宽


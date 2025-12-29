# Tasks: MySQL SSL 模式配置支持

**Input**: Design documents from `/specs/005-mysql-ssl-disable/`  
**Prerequisites**: plan.md (required), spec.md (required)

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2)

---

## Phase 1: Backend - 数据层

**Purpose**: 扩展数据模型和存储层支持 ssl_disabled 字段

- [x] T001 [P] [US1] 扩展 `backend/app/models/database.py` - 添加 ssl_disabled 字段到 DatabaseCreateRequest 和 DatabaseResponse
- [x] T002 [P] [US1] 扩展 `backend/app/db/sqlite.py` - 添加 ssl_disabled 列迁移和 CRUD 支持

**Checkpoint**: 数据模型和存储层准备就绪

---

## Phase 2: Backend - 连接层

**Purpose**: MySQL 连接器支持 ssl_disabled 配置

- [x] T003 [US2] 修改 `backend/app/connectors/mysql.py` - 在 test_connection、fetch_metadata、execute_query 三个方法中支持 ssl_disabled 参数
- [x] T004 [US2] 修改 `backend/app/services/db_manager.py` - 传递 ssl_disabled 配置到连接器
- [x] T005 [US2] 修改 `backend/app/api/v1/dbs.py` - API 支持 ssl_disabled 参数

**Checkpoint**: 后端完整支持 ssl_disabled 配置

---

## Phase 3: Frontend - 类型和 UI

**Purpose**: 前端界面支持 SSL 配置选项

- [x] T006 [P] [US1] 扩展 `frontend/src/types/index.ts` - 添加 sslDisabled 字段到类型定义
- [x] T007 [US1] 修改 `frontend/src/components/database/AddDatabaseModal.tsx` - 添加"禁用 SSL"复选框（仅 MySQL 显示）

**Checkpoint**: 前端界面完成，用户可以通过 UI 配置 SSL 选项

---

## Phase 4: 集成测试

**Purpose**: 验证端到端功能

- [x] T008 [US2] 手动测试：对 SSL 不兼容的 MySQL 服务器禁用 SSL 后成功连接
- [x] T009 [US2] 验证编辑已有 MySQL 连接时 SSL 配置状态正确回显

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (数据层)**: 无依赖，T001 和 T002 可并行
- **Phase 2 (连接层)**: 依赖 Phase 1 完成
- **Phase 3 (前端)**: T006 无依赖可并行，T007 依赖 T006
- **Phase 4 (测试)**: 依赖所有实现完成

### Execution Order

```
T001 ──┐
       ├──> T003 ──> T004 ──> T005 ──┐
T002 ──┘                             ├──> T008 ──> T009
T006 ──────────────> T007 ───────────┘
```

---

## Implementation Notes

### T001: 数据模型扩展

```python
# DatabaseCreateRequest
ssl_disabled: bool = Field(False, description="Disable SSL for MySQL connection")

# DatabaseResponse  
ssl_disabled: bool
```

### T002: SQLite 迁移

```python
MIGRATION_ADD_SSL_DISABLED = """
ALTER TABLE databases ADD COLUMN ssl_disabled INTEGER DEFAULT 0;
"""
```

### T003: MySQL 连接器

在 `mysql.connector.connect()` 中添加 `ssl_disabled=ssl_disabled` 参数。

### T007: 前端复选框

```tsx
{dbType === 'mysql' && (
  <Form.Item name="sslDisabled" valuePropName="checked">
    <Checkbox>禁用 SSL (仅在遇到 SSL 兼容性问题时使用)</Checkbox>
  </Form.Item>
)}
```


# Implementation Plan: 显示数据库表和字段注释

**Branch**: `002-display-schema-comments` | **Date**: 2024-12-28 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/002-display-schema-comments/spec.md`

## Summary

在侧边栏的表结构树和查询结果表中显示数据库表注释和字段注释。后端已支持注释提取（PostgreSQL 的 `obj_description` 和 `col_description`），但缓存层未持久化表注释。前端需要在相应位置添加 Tooltip 组件展示注释信息。

## Technical Context

**Language/Version**: Python 3.13+ (uv) / TypeScript 5.x  
**Primary Dependencies**:
- Backend: FastAPI, Pydantic, psycopg2, aiosqlite
- Frontend: React 18, Ant Design (Tooltip), TypeScript

**Storage**: SQLite (`./scinew.db`) - 需要 schema 迁移添加 `table_comment` 字段  
**Testing**: pytest (backend), Playwright (frontend E2E)  
**Target Platform**: Web (浏览器)  
**Project Type**: Web application (frontend + backend)

## Constitution Check

*GATE: Must pass before implementation.*

| 原则 | 状态 | 说明 |
|------|------|------|
| I. Ergonomic Python Backend | ✅ Pass | 使用现有代码风格 |
| II. TypeScript Frontend | ✅ Pass | 前端组件使用 TypeScript |
| III. Strict Type Annotations | ✅ Pass | 复用现有类型定义 |
| IV. Pydantic Data Models | ✅ Pass | 模型已包含 comment 字段 |
| V. Open Access | ✅ Pass | 无认证变更 |
| VI. Comprehensive Testing | ✅ Pass | 计划包含单元测试和 E2E 测试 |

**Gate Result**: ✅ PASS

## Current State Analysis

### 后端现状

| 组件 | 文件 | 状态 | 说明 |
|------|------|------|------|
| 数据模型 | `models/metadata.py` | ✅ 已有 | `ColumnInfo.comment` 和 `TableMetadata.comment` 已定义 |
| 元数据提取 | `services/metadata_service.py` | ✅ 已有 | PostgreSQL 注释通过 `obj_description` / `col_description` 提取 |
| SQLite Schema | `db/sqlite.py` | ⚠️ 缺失 | `table_metadata` 表缺少 `table_comment` 字段 |
| 缓存保存 | `services/metadata_service.py` | ⚠️ 不完整 | `save_metadata()` 未保存表注释 |
| 缓存读取 | `services/metadata_service.py` | ⚠️ 不完整 | `get_cached_metadata()` 未恢复表注释 |

### 前端现状

| 组件 | 文件 | 状态 | 说明 |
|------|------|------|------|
| 类型定义 | `types/metadata.ts` | ✅ 已有 | `ColumnInfo.comment` 和 `TableMetadata.comment` 已定义 |
| 侧边栏树 | `components/sidebar/DatabaseSidebar.tsx` | ⚠️ 未使用 | 未显示 comment 字段 |
| 查询结果 | `components/results/QueryResultTable.tsx` | ⚠️ 未使用 | 列头未显示 comment |

## Implementation Phases

### Phase 1: 后端修复（缓存层支持表注释）

**目标**: 确保表注释在缓存后能够正确恢复

#### 1.1 SQLite Schema 迁移

**文件**: `backend/app/db/sqlite.py`

```sql
-- 添加 table_comment 字段
ALTER TABLE table_metadata ADD COLUMN table_comment TEXT;
```

**修改内容**:
- 更新 `SCHEMA_SQL` 添加 `table_comment` 字段
- 更新 `get_metadata_for_database()` 返回 `table_comment`
- 更新 `save_metadata()` 接受并保存 `table_comment`

#### 1.2 MetadataService 缓存修复

**文件**: `backend/app/services/metadata_service.py`

**修改内容**:
- `cache_metadata()`: 传递 `table.comment` 到 `save_metadata()`
- `get_cached_metadata()`: 从缓存读取并设置 `TableMetadata.comment`

### Phase 2: 前端表结构树注释显示 (P1)

**目标**: 在侧边栏显示表注释和字段注释

#### 2.1 表节点注释内联显示

**文件**: `frontend/src/components/sidebar/DatabaseSidebar.tsx`

**修改内容**:
- 表名后面直接显示 `table.comment`（灰色文字，与JetBrains IDE风格一致）
- 超过50字符时截断，添加 `Tooltip` 显示完整内容
- 无注释时不显示额外元素

**UI示例**:
```
📊 users (10 cols) 用户信息表
📊 orders (8 cols) 订单主表，存储订单基本...  [悬浮显示完整]
```

#### 2.2 列节点注释内联显示

**文件**: `frontend/src/components/sidebar/DatabaseSidebar.tsx`

**修改内容**:
- 列名和类型后面直接显示 `column.comment`（灰色文字）
- 超过30字符时截断，添加 `Tooltip` 显示完整内容
- 无注释时不显示额外元素

**UI示例**:
```
🔑 id integer NOT NULL 主键ID
   name varchar 用户姓名
   created_at timestamp 创建时间，系统自动...  [悬浮显示完整]
```

### Phase 3: 查询结果列头注释显示 (P2)

**目标**: 在查询结果表头显示字段注释

#### 3.1 列头注释显示

**文件**: `frontend/src/components/results/QueryResultTable.tsx`

**修改内容**:
- 接收 `metadata` prop 用于匹配列注释
- 列头标题下方小字显示注释
- 列名与元数据匹配逻辑（通过 `schema.table.column` 三元组）

**UI示例**:
```
| oid        | osn          | accountid    |
| 订单ID     | 订单编号     | 账户ID       |  ← 小字显示注释
|------------|--------------|--------------|
| 4196056    | 25122866061  | 291022       |
```

#### 3.2 查询页面集成

**文件**: `frontend/src/pages/query/index.tsx`

**修改内容**:
- 将当前 `metadata` 传递给 `QueryResultTable` 组件

### Phase 4: 查询结果表格列宽可拖拽 (P2)

**目标**: 支持用户拖拽调整列宽

#### 4.1 Ant Design Table 列宽拖拽

**文件**: `frontend/src/components/results/QueryResultTable.tsx`

**修改内容**:
- 使用 `react-resizable` 库实现列宽拖拽
- 为每列添加 `onResize` 处理函数
- 使用 `useState` 管理各列宽度状态
- 设置最小列宽 50px

**实现方案**:
```tsx
import { Resizable } from 'react-resizable';

// 自定义可调整大小的表头单元格
const ResizableTitle = (props) => {
  const { onResize, width, ...restProps } = props;
  if (!width) return <th {...restProps} />;
  return (
    <Resizable width={width} height={0} onResize={onResize} minConstraints={[50, 0]}>
      <th {...restProps} />
    </Resizable>
  );
};
```

**依赖安装**:
```bash
npm install react-resizable @types/react-resizable
```

## Project Structure

### 受影响文件

```text
backend/
├── app/
│   ├── db/
│   │   └── sqlite.py              # 添加 table_comment 字段
│   └── services/
│       └── metadata_service.py    # 修复缓存保存/读取
└── tests/
    └── test_services/
        └── test_metadata_service.py  # 添加注释缓存测试

frontend/
├── src/
│   ├── components/
│   │   ├── sidebar/
│   │   │   └── DatabaseSidebar.tsx    # 添加注释 Tooltip
│   │   └── results/
│   │       └── QueryResultTable.tsx   # 添加列头注释
│   └── pages/
│       └── query/
│           └── index.tsx              # 传递 metadata prop
└── e2e/
    └── schema-comments.spec.ts        # E2E 测试
```

## Testing Strategy

### 后端测试

| 测试类型 | 文件 | 测试内容 |
|----------|------|----------|
| 单元测试 | `test_metadata_service.py` | 表注释缓存保存/读取 |
| 单元测试 | `test_sqlite.py` | SQLite schema 迁移 |

### 前端测试

| 测试类型 | 文件 | 测试内容 |
|----------|------|----------|
| E2E 测试 | `schema-comments.spec.ts` | 表/列注释 Tooltip 显示 |

## Dependencies & Risks

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| SQLite schema 迁移失败 | 中 | 使用 `IF NOT EXISTS` 和列存在检查 |
| 表达式/别名列无法匹配注释 | 低 | 明确标记为"不显示注释"的预期行为 |

## Complexity Tracking

无需填写 - Constitution Check 全部通过，无违规项。

## Success Metrics

- [ ] 后端缓存正确保存和恢复表注释
- [ ] 侧边栏表节点直接显示表注释（灰色文字）
- [ ] 侧边栏列节点直接显示字段注释（灰色文字）
- [ ] 长注释截断并支持Tooltip显示完整内容
- [ ] 查询结果列头显示字段注释
- [ ] 查询结果表格列宽可拖拽调整
- [ ] 所有测试通过

## Next Steps

执行 `/speckit.tasks` 生成具体的开发任务列表。


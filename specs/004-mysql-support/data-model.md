# Data Model: MySQL 数据库支持

**Feature**: 004-mysql-support  
**Date**: 2025-12-28

## Entity Changes

### 1. DatabaseConnection (更新)

**存储位置**: SQLite `databases` 表

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| name | TEXT | ✅ | - | 主键，连接名称 |
| url | TEXT | ✅ | - | 连接字符串（加密存储） |
| db_type | TEXT | ✅ | 'postgresql' | 数据库类型：'postgresql' 或 'mysql' |
| created_at | TEXT | ✅ | datetime('now') | 创建时间 ISO 格式 |
| updated_at | TEXT | ✅ | datetime('now') | 更新时间 ISO 格式 |

**验证规则**:
- `name`: 非空，唯一
- `url`: 必须以 `postgresql://`、`postgres://` 或 `mysql://` 开头
- `db_type`: 只能是 'postgresql' 或 'mysql'

**Schema Migration**:
```sql
-- 添加 db_type 列（兼容现有数据）
ALTER TABLE databases ADD COLUMN db_type TEXT DEFAULT 'postgresql';
```

---

### 2. TableMetadata (无变化)

**存储位置**: SQLite `table_metadata` 表

现有结构完全适用于 MySQL，无需修改。

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 自增主键 |
| db_name | TEXT | 关联的数据库连接名 |
| schema_name | TEXT | Schema 名（MySQL 中即数据库名） |
| table_name | TEXT | 表名 |
| table_type | TEXT | 'table' 或 'view' |
| table_comment | TEXT | 表注释 |
| columns_json | TEXT | 列信息 JSON |
| created_at | TEXT | 创建时间 |

---

### 3. ColumnInfo (无变化)

**存储格式**: JSON (在 `columns_json` 中)

```json
{
  "name": "user_id",
  "dataType": "int",
  "isNullable": false,
  "isPrimaryKey": true,
  "defaultValue": null,
  "comment": "用户唯一标识"
}
```

---

## Pydantic Models

### DatabaseResponse (更新)

```python
class DatabaseResponse(CamelModel):
    """Response model for database connection."""
    
    name: str
    url: str  # Masked password
    db_type: str  # 新增: "postgresql" 或 "mysql"
    created_at: datetime
    updated_at: datetime
```

### DatabaseCreateRequest (无变化)

```python
class DatabaseCreateRequest(CamelModel):
    """Request model for creating/updating a database connection."""
    
    url: str = Field(..., description="Database connection URL (postgresql:// or mysql://)")
```

> **Note**: `db_type` 由系统根据 URL 自动检测，无需用户指定。

---

## Database Type Detection

### 检测逻辑

```python
def detect_db_type(url: str) -> str:
    """根据 URL 协议检测数据库类型"""
    if url.startswith("postgresql://") or url.startswith("postgres://"):
        return "postgresql"
    elif url.startswith("mysql://"):
        return "mysql"
    else:
        raise ValueError(f"Unsupported database URL: {url}")
```

### URL 格式示例

| 类型 | URL 格式 |
|------|---------|
| PostgreSQL | `postgresql://user:pass@host:5432/dbname` |
| PostgreSQL (别名) | `postgres://user:pass@host:5432/dbname` |
| MySQL | `mysql://user:pass@host:3306/dbname` |

---

## MySQL Schema Mapping

MySQL 与 PostgreSQL 的 Schema 概念不同：

| PostgreSQL | MySQL | 映射策略 |
|------------|-------|---------|
| Database → multiple Schemas | Database = Schema | 使用连接的 database 作为 schema_name |
| Schema.Table | Database.Table | 直接映射 |

在 MySQL 中，`schema_name` 字段存储的是 MySQL database 名称。

---

## State Transitions

### DatabaseConnection 状态

```
[未创建] --创建--> [已保存] --更新--> [已保存]
                    ↓
                  删除
                    ↓
                [已删除]
```

### Metadata 缓存状态

```
[未缓存] --首次获取--> [已缓存] --刷新--> [已缓存]
                          ↓
                     数据库删除
                          ↓
                     [级联删除]
```

---

## TypeScript Types (Frontend)

### 更新 types/index.ts

```typescript
export interface Database {
  name: string;
  url: string;
  dbType: 'postgresql' | 'mysql';  // 新增
  createdAt: string;
  updatedAt: string;
}
```

### 数据库类型图标映射

```typescript
const DB_TYPE_ICONS = {
  postgresql: 'postgresql-icon',  // 蓝色大象
  mysql: 'mysql-icon'            // 橙色海豚
} as const;
```


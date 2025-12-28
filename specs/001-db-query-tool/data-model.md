# Data Model: 数据库查询工具

**Date**: 2025-12-28  
**Spec**: [spec.md](./spec.md)

## Entity Relationship Diagram

```text
┌─────────────────────┐
│  DatabaseConnection │
├─────────────────────┤
│ name (PK)           │
│ url                 │
│ createdAt           │
│ updatedAt           │
└─────────┬───────────┘
          │ 1:N
          ▼
┌─────────────────────┐
│   TableMetadata     │
├─────────────────────┤
│ id (PK)             │
│ dbName (FK)         │
│ schemaName          │
│ tableName           │
│ tableType           │
│ columns[]           │
│ createdAt           │
└─────────────────────┘
          │ 1:N
          ▼
┌─────────────────────┐
│     ColumnInfo      │
├─────────────────────┤
│ name                │
│ dataType            │
│ isNullable          │
│ isPrimaryKey        │
│ defaultValue        │
│ comment             │
└─────────────────────┘
```

## Entities

### DatabaseConnection

表示一个已保存的数据库连接配置。

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| name | string | PK, unique, required | 连接的唯一标识符 |
| url | string | required | PostgreSQL 连接字符串 |
| createdAt | datetime | required | 创建时间 |
| updatedAt | datetime | required | 最后更新时间 |

**Validation Rules**:
- `name`: 1-50 字符，仅允许字母、数字、下划线、连字符
- `url`: 必须是有效的 PostgreSQL 连接字符串格式

**Lifecycle**:
- Created: 用户添加新连接
- Updated: 连接信息修改或 metadata 刷新
- Deleted: 用户删除连接（级联删除相关 metadata）

### TableMetadata

表示数据库中的一个表或视图的元数据。

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | integer | PK, auto-increment | 内部主键 |
| dbName | string | FK → DatabaseConnection.name | 所属数据库连接 |
| schemaName | string | required | Schema 名称 (如 public) |
| tableName | string | required | 表/视图名称 |
| tableType | enum | required | 'table' 或 'view' |
| columns | ColumnInfo[] | required | 字段列表 (JSON) |
| createdAt | datetime | required | Metadata 获取时间 |

**Validation Rules**:
- `tableType`: 仅允许 'table' 或 'view'
- `(dbName, schemaName, tableName)`: 联合唯一

### ColumnInfo

表示表/视图中的一个字段信息（嵌入在 TableMetadata 中）。

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| name | string | required | 字段名称 |
| dataType | string | required | 数据类型 (如 varchar, integer) |
| isNullable | boolean | required | 是否允许 NULL |
| isPrimaryKey | boolean | required | 是否为主键 |
| defaultValue | string | optional | 默认值 |
| comment | string | optional | 字段注释 |

## Pydantic Models (Python)

```python
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from humps import camelize

def to_camel(string: str) -> str:
    return camelize(string)

class CamelModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )

# === Request Models ===

class DatabaseCreateRequest(CamelModel):
    url: str = Field(..., description="PostgreSQL connection URL")

class QueryRequest(CamelModel):
    sql: str = Field(..., description="SQL SELECT statement")

class NaturalQueryRequest(CamelModel):
    prompt: str = Field(..., description="Natural language query")

# === Response Models ===

class ColumnInfo(CamelModel):
    name: str
    data_type: str
    is_nullable: bool
    is_primary_key: bool
    default_value: str | None = None
    comment: str | None = None

class TableMetadata(CamelModel):
    schema_name: str
    table_name: str
    table_type: str  # 'table' | 'view'
    columns: list[ColumnInfo]

class DatabaseResponse(CamelModel):
    name: str
    url: str  # masked in response
    created_at: datetime
    updated_at: datetime
    tables: list[TableMetadata] | None = None

class DatabaseListResponse(CamelModel):
    databases: list[DatabaseResponse]

class QueryResult(CamelModel):
    columns: list[str]
    rows: list[dict]
    row_count: int
    truncated: bool = False  # True if LIMIT was auto-added

class QueryResponse(CamelModel):
    sql: str  # executed SQL (may include auto-added LIMIT)
    result: QueryResult
    execution_time_ms: int

class NaturalQueryResponse(CamelModel):
    generated_sql: str
    explanation: str | None = None

class ErrorResponse(CamelModel):
    error: str
    detail: str | None = None
```

## TypeScript Types (Frontend)

```typescript
// === Request Types ===

interface DatabaseCreateRequest {
  url: string;
}

interface QueryRequest {
  sql: string;
}

interface NaturalQueryRequest {
  prompt: string;
}

// === Response Types ===

interface ColumnInfo {
  name: string;
  dataType: string;
  isNullable: boolean;
  isPrimaryKey: boolean;
  defaultValue?: string;
  comment?: string;
}

interface TableMetadata {
  schemaName: string;
  tableName: string;
  tableType: 'table' | 'view';
  columns: ColumnInfo[];
}

interface DatabaseResponse {
  name: string;
  url: string;
  createdAt: string;
  updatedAt: string;
  tables?: TableMetadata[];
}

interface DatabaseListResponse {
  databases: DatabaseResponse[];
}

interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  truncated: boolean;
}

interface QueryResponse {
  sql: string;
  result: QueryResult;
  executionTimeMs: number;
}

interface NaturalQueryResponse {
  generatedSql: string;
  explanation?: string;
}

interface ErrorResponse {
  error: string;
  detail?: string;
}
```

## SQLite Schema

```sql
-- 应用元数据存储 (scinew.db)

CREATE TABLE IF NOT EXISTS databases (
    name TEXT PRIMARY KEY,
    url TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS table_metadata (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    db_name TEXT NOT NULL,
    schema_name TEXT NOT NULL,
    table_name TEXT NOT NULL,
    table_type TEXT NOT NULL CHECK (table_type IN ('table', 'view')),
    columns_json TEXT NOT NULL,  -- JSON array of ColumnInfo
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (db_name, schema_name, table_name),
    FOREIGN KEY (db_name) REFERENCES databases(name) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_metadata_db ON table_metadata(db_name);
```


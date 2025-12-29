# Data Model: SQL执行历史记录

**Feature**: 009-sql-history  
**Date**: 2025-12-29  
**Phase**: 1 - Design

## 1. 数据库Schema

### 1.1 主表：query_history

存储SQL执行历史的完整记录。

```sql
CREATE TABLE IF NOT EXISTS query_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    db_name TEXT NOT NULL,              -- 所属数据库连接名称
    sql_content TEXT NOT NULL,          -- SQL语句全文
    natural_query TEXT,                 -- 自然语言描述（可选）
    row_count INTEGER NOT NULL DEFAULT 0,        -- 返回行数
    execution_time_ms INTEGER NOT NULL DEFAULT 0, -- 执行耗时（毫秒）
    executed_at TEXT NOT NULL DEFAULT (datetime('now')), -- 执行时间
    FOREIGN KEY (db_name) REFERENCES databases(name) ON DELETE CASCADE
);

-- 索引：按数据库和时间查询
CREATE INDEX IF NOT EXISTS idx_history_db_time 
ON query_history(db_name, executed_at DESC);
```

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PK, AUTO | 主键 |
| db_name | TEXT | NOT NULL, FK | 数据库连接名 |
| sql_content | TEXT | NOT NULL | SQL语句原文 |
| natural_query | TEXT | NULL | 自然语言描述 |
| row_count | INTEGER | NOT NULL, DEFAULT 0 | 返回行数 |
| execution_time_ms | INTEGER | NOT NULL, DEFAULT 0 | 执行耗时ms |
| executed_at | TEXT | NOT NULL | ISO8601时间戳 |

### 1.2 FTS5虚拟表：query_history_fts

存储分词后的文本，用于全文搜索。

```sql
CREATE VIRTUAL TABLE IF NOT EXISTS query_history_fts USING fts5(
    sql_tokens,           -- 分词后的SQL内容
    natural_tokens,       -- 分词后的自然语言
    content='query_history',
    content_rowid='id'
);
```

| 字段 | 说明 |
|------|------|
| sql_tokens | jieba分词后的SQL，空格分隔 |
| natural_tokens | jieba分词后的自然语言，空格分隔 |

**说明**: `content='query_history'`表示这是一个"contentless"FTS表，实际内容存储在主表，FTS表只存储索引。但由于我们需要存储分词结果，使用外部内容表模式。

### 1.3 数据同步

由于SQLite不支持自定义函数进行分词，需要在应用层同步：

```python
async def create_history(db_name: str, sql: str, natural_query: str | None, 
                         row_count: int, execution_time_ms: int) -> int:
    # 1. 分词处理
    sql_tokens = tokenize_for_search(sql)
    natural_tokens = tokenize_for_search(natural_query) if natural_query else ""
    
    # 2. 事务中同时写入主表和FTS表
    async with conn.transaction():
        cursor = await conn.execute(
            "INSERT INTO query_history (db_name, sql_content, natural_query, row_count, execution_time_ms) VALUES (?, ?, ?, ?, ?)",
            (db_name, sql, natural_query, row_count, execution_time_ms)
        )
        history_id = cursor.lastrowid
        
        await conn.execute(
            "INSERT INTO query_history_fts (rowid, sql_tokens, natural_tokens) VALUES (?, ?, ?)",
            (history_id, sql_tokens, natural_tokens)
        )
    
    return history_id
```

## 2. Pydantic模型

### 2.1 后端模型 (app/models/history.py)

```python
from datetime import datetime
from pydantic import BaseModel, Field

class QueryHistoryCreate(BaseModel):
    """创建历史记录的请求"""
    sql_content: str = Field(..., min_length=1, description="SQL语句")
    natural_query: str | None = Field(None, description="自然语言描述")
    row_count: int = Field(0, ge=0, description="返回行数")
    execution_time_ms: int = Field(0, ge=0, description="执行耗时(ms)")

class QueryHistoryItem(BaseModel):
    """历史记录项"""
    id: int
    db_name: str
    sql_content: str
    natural_query: str | None
    row_count: int
    execution_time_ms: int
    executed_at: datetime

class QueryHistoryListResponse(BaseModel):
    """历史记录列表响应"""
    items: list[QueryHistoryItem]
    total: int
    has_more: bool
    next_cursor: str | None = None

class QueryHistorySearchRequest(BaseModel):
    """搜索请求"""
    query: str = Field(..., min_length=1, description="搜索关键词")
    limit: int = Field(20, ge=1, le=100, description="返回数量限制")
```

### 2.2 前端类型 (src/types/history.ts)

```typescript
export interface QueryHistoryItem {
  id: number;
  dbName: string;
  sqlContent: string;
  naturalQuery: string | null;
  rowCount: number;
  executionTimeMs: number;
  executedAt: string;  // ISO8601
}

export interface QueryHistoryListResponse {
  items: QueryHistoryItem[];
  total: number;
  hasMore: boolean;
  nextCursor: string | null;
}

export interface QueryHistorySearchParams {
  query: string;
  limit?: number;
}
```

## 3. 数据流

### 3.1 记录创建流程

```
用户执行SQL
    │
    ▼
前端调用 executeQuery API
    │
    ▼
后端执行SQL并获取结果
    │
    ▼
后端调用 history_service.create()
    │
    ├─► jieba分词(sql_content)
    ├─► jieba分词(natural_query) [如果有]
    │
    ▼
写入 query_history 主表
    │
    ▼
写入 query_history_fts 索引表
    │
    ▼
返回查询结果给前端
```

### 3.2 搜索流程

```
用户输入搜索关键词
    │
    ▼
前端调用 searchHistory API
    │
    ▼
后端 jieba分词(关键词)
    │
    ▼
FTS5 MATCH 查询
    │
    ▼
JOIN 主表获取完整记录
    │
    ▼
返回搜索结果
```

## 4. 索引策略

### 4.1 主表索引

| 索引名 | 字段 | 用途 |
|--------|------|------|
| idx_history_db_time | (db_name, executed_at DESC) | 按数据库列表查询 |

### 4.2 FTS5索引

FTS5自动维护倒排索引，无需手动创建。

### 4.3 查询示例

```sql
-- 按数据库获取历史（分页）
SELECT * FROM query_history 
WHERE db_name = ? 
ORDER BY executed_at DESC 
LIMIT 20;

-- 全文搜索
SELECT h.* FROM query_history h
JOIN query_history_fts fts ON h.id = fts.rowid
WHERE query_history_fts MATCH ?
ORDER BY h.executed_at DESC
LIMIT 20;
```

## 5. 存储估算

| 项目 | 单条估算 | 10000条 |
|------|----------|---------|
| 主表记录 | ~500 bytes | ~5 MB |
| FTS索引 | ~750 bytes | ~7.5 MB |
| **总计** | ~1.25 KB | ~12.5 MB |

**结论**: 存储开销可接受，10000条历史记录仅占用约12.5MB。


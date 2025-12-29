# Research: SQL执行历史记录

**Feature**: 009-sql-history  
**Date**: 2025-12-29  
**Phase**: 0 - Technical Research

## 1. SQLite FTS5 全文搜索

### 1.1 FTS5 概述

FTS5是SQLite内置的全文搜索引擎，支持创建虚拟表进行高效文本搜索。

**优势**:
- SQLite原生支持，无需外部依赖
- 支持前缀搜索、短语搜索、布尔查询
- 支持自定义分词器（tokenizer）
- 索引自动维护

**创建FTS5表示例**:
```sql
CREATE VIRTUAL TABLE query_history_fts USING fts5(
    sql_content,
    natural_query,
    tokenize='unicode61'  -- 默认分词器
);
```

### 1.2 FTS5分词器选项

| 分词器 | 描述 | 中文支持 |
|--------|------|----------|
| unicode61 | 默认，按Unicode标点分词 | ❌ 差 |
| ascii | ASCII字符分词 | ❌ 不支持 |
| porter | 英文词干提取 | ❌ 不支持 |
| 自定义 | 外部分词器集成 | ✅ 需要实现 |

### 1.3 中文分词方案

SQLite FTS5默认分词器不支持中文分词（会将整个中文字符串作为一个token）。

**解决方案**: 预分词 + 存储分词结果
1. 使用jieba分词对中文文本进行预处理
2. 将分词后的文本（空格分隔）存入FTS5表
3. 搜索时同样对查询词进行jieba分词

## 2. Jieba分词库

### 2.1 基本用法

```python
import jieba

# 精确模式
text = "查询用户订单数据"
tokens = jieba.cut(text, cut_all=False)
result = " ".join(tokens)  # "查询 用户 订单 数据"

# 搜索引擎模式（推荐用于FTS）
tokens = jieba.cut_for_search(text)
result = " ".join(tokens)  # "查询 用户 订单 数据"
```

### 2.2 性能考量

| 指标 | 数值 |
|------|------|
| 初始化时间 | ~1s (首次加载词典) |
| 分词速度 | ~100KB/s |
| 内存占用 | ~50-100MB (词典) |

**优化建议**:
- 应用启动时预加载jieba词典
- 考虑使用`jieba.lcut()`替代`jieba.cut()`避免生成器开销

### 2.3 混合中英文处理

```python
def tokenize_for_search(text: str) -> str:
    """对中英文混合文本进行分词"""
    if not text:
        return ""
    # jieba会自动处理中英文混合，英文保持原样
    tokens = jieba.cut_for_search(text)
    return " ".join(tokens)
```

## 3. 数据库Schema设计

### 3.1 主表 + FTS5虚拟表方案

```sql
-- 主表：存储完整记录
CREATE TABLE IF NOT EXISTS query_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    db_name TEXT NOT NULL,
    sql_content TEXT NOT NULL,
    natural_query TEXT,  -- 自然语言描述（可选）
    row_count INTEGER NOT NULL DEFAULT 0,
    execution_time_ms INTEGER NOT NULL DEFAULT 0,
    executed_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (db_name) REFERENCES databases(name) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_history_db_time ON query_history(db_name, executed_at DESC);

-- FTS5虚拟表：存储分词后的文本用于搜索
CREATE VIRTUAL TABLE IF NOT EXISTS query_history_fts USING fts5(
    history_id,           -- 关联主表ID
    sql_tokens,           -- 分词后的SQL
    natural_tokens,       -- 分词后的自然语言
    content='query_history',
    content_rowid='id'
);

-- 触发器：自动同步主表到FTS表
-- 注意：需要在应用层插入时同时插入分词结果
```

### 3.2 内容同步策略

由于FTS5需要存储分词后的文本，而SQLite不能直接调用jieba，采用**应用层同步**：

1. 插入历史记录时，应用层先调用jieba分词
2. 同时插入主表（原文）和FTS表（分词结果）
3. 使用事务确保原子性

## 4. API设计研究

### 4.1 历史记录API端点

| 端点 | 方法 | 描述 |
|------|------|------|
| `/dbs/{name}/history` | GET | 获取历史记录列表（分页） |
| `/dbs/{name}/history` | POST | 创建历史记录 |
| `/dbs/{name}/history/search` | GET | 搜索历史记录 |

### 4.2 分页方案

使用游标分页（Cursor-based pagination）更适合按时间排序的列表：

```python
# 请求
GET /dbs/mydb/history?limit=20&before=2025-01-01T00:00:00

# 响应
{
  "items": [...],
  "hasMore": true,
  "nextCursor": "2024-12-31T23:59:59"
}
```

## 5. 前端组件研究

### 5.1 UI参考（阿里云DMS）

- Tab页形式："执行历史" 与 "执行结果" 并列
- 列表展示：时间、SQL预览、行数、耗时
- 搜索框：支持关键词搜索
- 点击复用：点击记录将SQL填入编辑器

### 5.2 虚拟滚动方案

当历史记录数量大时（>1000条），需要虚拟滚动优化：

**推荐方案**: 使用Ant Design的`List`组件配合分页加载
- 初次加载20-50条
- 滚动到底部时加载更多（无限滚动）
- 避免一次性渲染大量DOM

## 6. 研究结论

### 6.1 技术选型确认

| 组件 | 选型 | 理由 |
|------|------|------|
| 全文搜索 | SQLite FTS5 | 原生支持，无需额外服务 |
| 中文分词 | jieba | Python生态成熟，搜索模式适合FTS |
| 数据同步 | 应用层双写 | SQLite不支持UDF，需应用层分词 |
| 前端列表 | Ant Design List + 分页 | 复用现有组件，简单可靠 |

### 6.2 风险点

1. **jieba初始化时间**: 首次请求可能延迟~1s，建议应用启动时预加载
2. **FTS索引大小**: 约为原文1.5-2倍，需监控存储空间
3. **分词一致性**: 搜索词和存储词必须使用相同分词模式

### 6.3 下一步

进入Phase 1：详细设计数据模型和API契约


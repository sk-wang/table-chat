# Quickstart: SQL执行历史记录

**Feature**: 009-sql-history  
**Date**: 2025-12-29

## 1. 开发环境准备

### 1.1 后端依赖

```bash
cd backend

# 添加jieba分词库
uv add jieba
```

### 1.2 前端依赖

前端无需新增依赖，使用现有的Ant Design组件。

## 2. 数据库迁移

启动应用后，SQLite schema会自动迁移。手动测试：

```bash
cd backend
python -c "
import asyncio
from app.db.sqlite import db_manager

async def main():
    await db_manager.init_schema()
    print('Schema initialized')

asyncio.run(main())
"
```

## 3. 核心代码示例

### 3.1 分词工具函数

```python
# app/services/tokenizer.py
import jieba

# 应用启动时预加载词典
jieba.initialize()

def tokenize_for_search(text: str) -> str:
    """对文本进行分词，用于FTS搜索"""
    if not text:
        return ""
    # 使用搜索引擎模式，会对长词再次细分
    tokens = jieba.cut_for_search(text)
    return " ".join(tokens)
```

### 3.2 历史记录服务

```python
# app/services/history_service.py
from app.db.sqlite import db_manager
from app.services.tokenizer import tokenize_for_search

class HistoryService:
    async def create_history(
        self,
        db_name: str,
        sql_content: str,
        natural_query: str | None,
        row_count: int,
        execution_time_ms: int
    ) -> int:
        # 分词处理
        sql_tokens = tokenize_for_search(sql_content)
        natural_tokens = tokenize_for_search(natural_query) if natural_query else ""
        
        async with db_manager.get_connection() as conn:
            # 写入主表
            cursor = await conn.execute(
                """INSERT INTO query_history 
                   (db_name, sql_content, natural_query, row_count, execution_time_ms)
                   VALUES (?, ?, ?, ?, ?)""",
                (db_name, sql_content, natural_query, row_count, execution_time_ms)
            )
            history_id = cursor.lastrowid
            
            # 写入FTS表
            await conn.execute(
                """INSERT INTO query_history_fts (rowid, sql_tokens, natural_tokens)
                   VALUES (?, ?, ?)""",
                (history_id, sql_tokens, natural_tokens)
            )
            await conn.commit()
            
        return history_id

    async def search_history(
        self, db_name: str, query: str, limit: int = 20
    ) -> list[dict]:
        # 对搜索词分词
        query_tokens = tokenize_for_search(query)
        
        async with db_manager.get_connection() as conn:
            cursor = await conn.execute(
                """SELECT h.* FROM query_history h
                   JOIN query_history_fts fts ON h.id = fts.rowid
                   WHERE h.db_name = ? AND query_history_fts MATCH ?
                   ORDER BY h.executed_at DESC
                   LIMIT ?""",
                (db_name, query_tokens, limit)
            )
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]

history_service = HistoryService()
```

### 3.3 API端点

```python
# app/api/v1/history.py
from fastapi import APIRouter
from app.services.history_service import history_service

router = APIRouter(prefix="/dbs", tags=["History"])

@router.get("/{name}/history")
async def list_history(name: str, limit: int = 20, before: str | None = None):
    items = await history_service.list_history(name, limit, before)
    return {"items": items, "hasMore": len(items) == limit}

@router.get("/{name}/history/search")
async def search_history(name: str, query: str, limit: int = 20):
    items = await history_service.search_history(name, query, limit)
    return {"items": items, "total": len(items)}
```

### 3.4 前端组件

```tsx
// src/components/history/QueryHistoryTab.tsx
import React, { useState, useEffect } from 'react';
import { List, Input, Typography, Tag, Empty } from 'antd';
import { SearchOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { apiClient } from '../../services/api';
import type { QueryHistoryItem } from '../../types/history';

interface Props {
  dbName: string;
  onSelectHistory: (sql: string) => void;
}

export const QueryHistoryTab: React.FC<Props> = ({ dbName, onSelectHistory }) => {
  const [items, setItems] = useState<QueryHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadHistory();
  }, [dbName]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const response = await apiClient.getQueryHistory(dbName);
      setItems(response.items);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      loadHistory();
      return;
    }
    setLoading(true);
    try {
      const response = await apiClient.searchQueryHistory(dbName, query);
      setItems(response.items);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Input
        placeholder="搜索SQL或自然语言..."
        prefix={<SearchOutlined />}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onPressEnter={() => handleSearch(searchQuery)}
        style={{ marginBottom: 12 }}
      />
      
      <List
        loading={loading}
        dataSource={items}
        locale={{ emptyText: <Empty description="暂无执行历史" /> }}
        renderItem={(item) => (
          <List.Item
            onClick={() => onSelectHistory(item.sqlContent)}
            style={{ cursor: 'pointer', padding: '8px 12px' }}
          >
            <div style={{ width: '100%' }}>
              <Typography.Text code ellipsis style={{ maxWidth: '100%' }}>
                {item.sqlContent.substring(0, 100)}
                {item.sqlContent.length > 100 && '...'}
              </Typography.Text>
              <div style={{ marginTop: 4 }}>
                <Tag icon={<ClockCircleOutlined />}>
                  {new Date(item.executedAt).toLocaleString()}
                </Tag>
                <Tag color="blue">{item.rowCount} rows</Tag>
                <Tag color="green">{item.executionTimeMs}ms</Tag>
              </div>
              {item.naturalQuery && (
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  💬 {item.naturalQuery}
                </Typography.Text>
              )}
            </div>
          </List.Item>
        )}
      />
    </div>
  );
};
```

## 4. 测试命令

### 4.1 后端测试

```bash
cd backend
uv run pytest tests/test_services/test_history_service.py -v
uv run pytest tests/test_api/test_history.py -v
```

### 4.2 前端测试

```bash
cd frontend
npm run test
npm run test:e2e
```

## 5. 开发调试

### 5.1 验证FTS搜索

```bash
# 进入SQLite命令行
sqlite3 backend/tablechat.db

-- 查看历史记录
SELECT * FROM query_history LIMIT 5;

-- 测试FTS搜索
SELECT * FROM query_history_fts WHERE query_history_fts MATCH '用户';
```

### 5.2 验证jieba分词

```python
import jieba

# 测试分词效果
text = "SELECT * FROM users WHERE name = '张三'"
print(" ".join(jieba.cut_for_search(text)))
# 输出: SELECT * FROM users WHERE name = ' 张三 '
```


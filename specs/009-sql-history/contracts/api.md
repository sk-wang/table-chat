# API Contract: SQL执行历史记录

**Feature**: 009-sql-history  
**Date**: 2025-12-29  
**Version**: v1

## Base URL

```
/api/v1
```

## Endpoints

### 1. 获取历史记录列表

获取指定数据库的SQL执行历史，按执行时间倒序排列。

**Endpoint**: `GET /dbs/{db_name}/history`

**Path Parameters**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| db_name | string | ✅ | 数据库连接名称 |

**Query Parameters**:

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| limit | integer | ❌ | 20 | 返回数量 (1-100) |
| before | string | ❌ | null | 游标，返回此时间之前的记录 (ISO8601) |

**Response**: `200 OK`

```json
{
  "items": [
    {
      "id": 123,
      "dbName": "mydb",
      "sqlContent": "SELECT * FROM users WHERE id = 1",
      "naturalQuery": "查询ID为1的用户",
      "rowCount": 1,
      "executionTimeMs": 45,
      "executedAt": "2025-12-29T10:30:00Z"
    }
  ],
  "total": 150,
  "hasMore": true,
  "nextCursor": "2025-12-29T10:29:00Z"
}
```

**Response Fields**:

| 字段 | 类型 | 说明 |
|------|------|------|
| items | array | 历史记录列表 |
| items[].id | integer | 记录ID |
| items[].dbName | string | 数据库名称 |
| items[].sqlContent | string | SQL语句全文 |
| items[].naturalQuery | string \| null | 自然语言描述 |
| items[].rowCount | integer | 返回行数 |
| items[].executionTimeMs | integer | 执行耗时(ms) |
| items[].executedAt | string | 执行时间 (ISO8601) |
| total | integer | 总记录数 |
| hasMore | boolean | 是否有更多记录 |
| nextCursor | string \| null | 下一页游标 |

**Error Responses**:

| 状态码 | 说明 |
|--------|------|
| 404 | 数据库不存在 |

---

### 2. 搜索历史记录

在SQL内容和自然语言描述中进行全文搜索。

**Endpoint**: `GET /dbs/{db_name}/history/search`

**Path Parameters**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| db_name | string | ✅ | 数据库连接名称 |

**Query Parameters**:

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| query | string | ✅ | - | 搜索关键词 |
| limit | integer | ❌ | 20 | 返回数量 (1-100) |

**Response**: `200 OK`

```json
{
  "items": [
    {
      "id": 123,
      "dbName": "mydb",
      "sqlContent": "SELECT * FROM users WHERE name = '张三'",
      "naturalQuery": "查询名字叫张三的用户",
      "rowCount": 1,
      "executionTimeMs": 32,
      "executedAt": "2025-12-29T10:30:00Z"
    }
  ],
  "total": 5
}
```

**Response Fields**:

| 字段 | 类型 | 说明 |
|------|------|------|
| items | array | 匹配的历史记录 |
| total | integer | 匹配记录总数 |

**Error Responses**:

| 状态码 | 说明 |
|--------|------|
| 400 | query参数为空 |
| 404 | 数据库不存在 |

---

### 3. 创建历史记录（内部调用）

**注意**: 此端点通常由查询执行API内部调用，不对外暴露。

**Endpoint**: `POST /dbs/{db_name}/history` (内部)

**Request Body**:

```json
{
  "sqlContent": "SELECT * FROM users",
  "naturalQuery": "查询所有用户",
  "rowCount": 100,
  "executionTimeMs": 45
}
```

**Request Fields**:

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| sqlContent | string | ✅ | SQL语句 |
| naturalQuery | string | ❌ | 自然语言描述 |
| rowCount | integer | ✅ | 返回行数 |
| executionTimeMs | integer | ✅ | 执行耗时(ms) |

**Response**: `201 Created`

```json
{
  "id": 124,
  "dbName": "mydb",
  "sqlContent": "SELECT * FROM users",
  "naturalQuery": "查询所有用户",
  "rowCount": 100,
  "executionTimeMs": 45,
  "executedAt": "2025-12-29T10:35:00Z"
}
```

---

## Error Response Format

所有错误响应遵循统一格式：

```json
{
  "error": "NotFound",
  "detail": "Database 'mydb' not found"
}
```

## Notes

### 字段命名约定

- API响应使用 **camelCase** (驼峰命名)
- 后端Python使用 **snake_case** (下划线命名)
- 使用 `pyhumps` 库自动转换

### 分页策略

使用游标分页（Cursor-based pagination）：
- `before` 参数为上一页最后一条记录的 `executedAt` 值
- 比传统offset分页更适合实时数据
- 避免大offset查询的性能问题

### 搜索实现

- 使用SQLite FTS5全文搜索
- 支持中文分词（jieba）
- 搜索词自动分词后进行匹配


# API Contracts: MySQL 数据库支持

**Feature**: 004-mysql-support  
**Date**: 2025-12-28

## Overview

本功能不引入新的 API 端点，仅更新现有端点的响应格式以包含数据库类型信息。

## API Changes

### 1. GET /api/v1/dbs

**变更**: 响应中每个数据库对象新增 `dbType` 字段

**Response (更新后)**:
```json
{
  "databases": [
    {
      "name": "production",
      "url": "postgresql://admin:****@db.example.com:5432/prod",
      "dbType": "postgresql",
      "createdAt": "2025-12-28T10:00:00",
      "updatedAt": "2025-12-28T10:00:00"
    },
    {
      "name": "analytics",
      "url": "mysql://root:****@localhost:3306/analytics",
      "dbType": "mysql",
      "createdAt": "2025-12-28T11:00:00",
      "updatedAt": "2025-12-28T11:00:00"
    }
  ]
}
```

---

### 2. GET /api/v1/dbs/{name}

**变更**: 响应新增 `dbType` 字段

**Response (更新后)**:
```json
{
  "name": "analytics",
  "url": "mysql://root:****@localhost:3306/analytics",
  "dbType": "mysql",
  "createdAt": "2025-12-28T11:00:00",
  "updatedAt": "2025-12-28T11:00:00"
}
```

---

### 3. PUT /api/v1/dbs/{name}

**变更**: 
- 请求体无变化（`url` 字段接受 MySQL URL）
- 响应新增 `dbType` 字段（自动从 URL 检测）

**Request (无变化)**:
```json
{
  "url": "mysql://root:123456@localhost:3306/scinew"
}
```

**Response (更新后)**:
```json
{
  "name": "scinew",
  "url": "mysql://root:****@localhost:3306/scinew",
  "dbType": "mysql",
  "createdAt": "2025-12-28T12:00:00",
  "updatedAt": "2025-12-28T12:00:00"
}
```

**Error Responses (更新)**:
- `400 Bad Request`: URL 格式无效或不支持的数据库类型
  ```json
  {
    "detail": "Unsupported database URL: mongodb://..."
  }
  ```
- `503 Service Unavailable`: 连接失败
  ```json
  {
    "detail": "Failed to connect to database: Connection refused"
  }
  ```

---

### 4. GET /api/v1/dbs/{name}/metadata

**变更**: 无 API 层面变更

此端点行为不变。系统内部会根据存储的 `dbType` 选择正确的连接器来提取元数据。

---

### 5. POST /api/v1/dbs/{name}/metadata/refresh

**变更**: 无 API 层面变更

此端点行为不变。系统内部会根据存储的 `dbType` 选择正确的连接器。

---

### 6. POST /api/v1/query/{db_name}

**变更**: 无 API 层面变更

查询执行端点行为不变。系统会：
1. 根据 `dbType` 选择正确的连接器
2. 使用对应的 sqlglot 方言解析 SQL
3. 执行查询并返回结果

---

### 7. POST /api/v1/query/{db_name}/natural

**变更**: 无 API 层面变更

自然语言查询端点行为不变。系统会：
1. 根据 `dbType` 选择正确的 SQL 方言
2. 在 LLM prompt 中指定使用 MySQL 或 PostgreSQL 语法
3. 生成并返回对应方言的 SQL

---

## Backward Compatibility

| 端点 | 向后兼容 | 说明 |
|------|---------|------|
| GET /api/v1/dbs | ✅ | 新增字段，不破坏现有客户端 |
| GET /api/v1/dbs/{name} | ✅ | 新增字段，不破坏现有客户端 |
| PUT /api/v1/dbs/{name} | ✅ | 请求格式不变 |
| GET /api/v1/dbs/{name}/metadata | ✅ | 响应格式不变 |
| POST /api/v1/query/{db_name} | ✅ | 请求/响应格式不变 |
| POST /api/v1/query/{db_name}/natural | ✅ | 请求/响应格式不变 |

---

## OpenAPI Schema Updates

### DatabaseResponse Schema

```yaml
DatabaseResponse:
  type: object
  required:
    - name
    - url
    - dbType
    - createdAt
    - updatedAt
  properties:
    name:
      type: string
      description: Database connection name
    url:
      type: string
      description: Connection URL with masked password
    dbType:
      type: string
      enum: [postgresql, mysql]
      description: Database type (auto-detected from URL)
    createdAt:
      type: string
      format: date-time
    updatedAt:
      type: string
      format: date-time
```

---

## Error Codes (新增)

| 场景 | HTTP 状态码 | 错误信息 |
|------|------------|---------|
| 不支持的数据库类型 | 400 | "Unsupported database URL: {url}" |
| MySQL 连接超时 | 503 | "Failed to connect to database: Connection timed out after 10 seconds" |
| MySQL 认证失败 | 503 | "Failed to connect to database: Access denied for user" |
| MySQL 数据库不存在 | 503 | "Failed to connect to database: Unknown database" |


# SQL Editor Enhancement - API Documentation

**Feature**: 021-sql-editor-enhance
**Date**: 2026-01-03

## 概述

SQL 编辑器增强功能使用现有的 metadata API 端点来获取数据库结构信息，用于自动完成功能。

## 使用的 API 端点

### 1. 获取表列表 (Table List)

**端点**: `GET /api/v1/dbs/{db_name}/tables`

**用途**: 获取数据库中的所有表和视图（不含列详情）

**请求示例**:
```http
GET /api/v1/dbs/mydb/tables?refresh=false HTTP/1.1
```

**查询参数**:
- `refresh` (可选): 是否强制刷新缓存，默认 `false`

**响应示例**:
```json
{
  "name": "mydb",
  "schemas": ["public"],
  "tables": [
    {
      "schemaName": "public",
      "tableName": "users",
      "tableType": "table",
      "comment": "用户表"
    },
    {
      "schemaName": "public",
      "tableName": "orders",
      "tableType": "table",
      "comment": "订单表"
    }
  ],
  "lastRefreshed": "2026-01-03T10:00:00"
}
```

### 2. 获取表详情 (Table Details)

**端点**: `GET /api/v1/dbs/{db_name}/tables/{schema_name}/{table_name}`

**用途**: 获取特定表的详细信息（包含列定义）

**请求示例**:
```http
GET /api/v1/dbs/mydb/tables/public/users HTTP/1.1
```

**响应示例**:
```json
{
  "schemaName": "public",
  "tableName": "users",
  "tableType": "table",
  "columns": [
    {
      "name": "id",
      "dataType": "integer",
      "isNullable": false,
      "isPrimaryKey": true,
      "defaultValue": null,
      "comment": "用户ID"
    },
    {
      "name": "name",
      "dataType": "varchar",
      "isNullable": true,
      "isPrimaryKey": false,
      "defaultValue": null,
      "comment": "用户名"
    }
  ],
  "rowCount": null,
  "comment": "用户表"
}
```

## 前端集成

### MetadataService

前端通过 `src/services/metadataService.ts` 封装上述 API 调用：

```typescript
class MetadataService {
  // 获取表列表（轻量级，用于自动完成）
  async getTableList(dbName: string, refresh: boolean = false): Promise<TableListResponse>

  // 获取表详情（包含列信息）
  async getTableColumns(dbName: string, schemaName: string, tableName: string): Promise<TableMetadata>

  // 获取完整元数据
  async getFullMetadata(dbName: string, refresh: boolean = false): Promise<DatabaseMetadata>
}
```

### Schema 缓存策略

1. **首次加载**: 调用 API 获取完整元数据
2. **缓存存储**: 使用 React Context + localStorage
3. **按需加载**: 仅在用户输入时获取特定表的列详情
4. **刷新机制**: 提供手动刷新按钮调用 `refresh=true`

## 错误处理

### 降级策略

当 API 调用失败或无数据库连接时：

1. **显示警告**: 降级 UI 提示用户
2. **保留关键词**: 继续提供 SQL 关键词自动完成
3. **静默失败**: 自动完成错误不影响编辑器正常使用

### 错误类型

| 错误 | 处理方式 |
|------|----------|
| 数据库未找到 | 显示 "Database not found" |
| 连接失败 | 显示 "Connection failed"，使用关键词模式 |
| 空表列表 | 显示 "No tables available" |
| 超时 | 显示提示，支持重试 |

## 性能考虑

1. **分页加载**: 表建议限制在 50 条 (MAX_SUGGESTIONS)
2. **前缀过滤**: 客户端先过滤再显示
3. **延迟加载**: 列详情按需获取
4. **缓存优先**: 优先使用缓存，减少 API 调用

## 相关文件

- `backend/app/api/v1/dbs.py` - API 端点实现
- `backend/app/services/metadata_service.py` - 后端元数据服务
- `frontend/src/services/metadataService.ts` - 前端 API 封装
- `frontend/src/contexts/SchemaContext.tsx` - 缓存管理

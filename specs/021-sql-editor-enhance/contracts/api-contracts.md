# API Contracts: SQL Editor Enhancement

**Feature**: 021-sql-editor-enhance
**Date**: 2026-01-03

## Overview

本功能主要使用现有的API端点，无需新增后端API。以下记录将使用的现有端点及其契约。

---

## Existing Endpoints (No Changes)

### GET /api/v1/dbs/{name}/metadata

获取数据库完整元数据（表和列）

**Path Parameters**:
| 参数 | 类型 | 描述 |
|------|------|------|
| name | string | 数据库连接名 |

**Query Parameters**:
| 参数 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| refresh | boolean | false | 是否强制刷新 |

**Response**: `200 OK`
```json
{
  "name": "my-database",
  "schemas": ["public", "sales"],
  "tables": [
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
          "comment": "User ID"
        },
        {
          "name": "email",
          "dataType": "varchar(255)",
          "isNullable": false,
          "isPrimaryKey": false,
          "defaultValue": null,
          "comment": null
        }
      ],
      "rowCount": null,
      "comment": "User accounts"
    }
  ],
  "lastRefreshed": "2026-01-03T10:30:00Z"
}
```

**Error Responses**:
- `404 Not Found`: 数据库连接不存在
- `500 Internal Server Error`: 无法连接到数据库

---

### GET /api/v1/dbs/{name}/tables

获取表列表（不含列详情，轻量级）

**Path Parameters**:
| 参数 | 类型 | 描述 |
|------|------|------|
| name | string | 数据库连接名 |

**Query Parameters**:
| 参数 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| refresh | boolean | false | 是否强制刷新 |

**Response**: `200 OK`
```json
{
  "name": "my-database",
  "schemas": ["public", "sales"],
  "tables": [
    {
      "schemaName": "public",
      "tableName": "users",
      "tableType": "table",
      "comment": "User accounts"
    },
    {
      "schemaName": "public",
      "tableName": "orders",
      "tableType": "table",
      "comment": null
    }
  ],
  "lastRefreshed": "2026-01-03T10:30:00Z"
}
```

---

### GET /api/v1/dbs/{name}/tables/{schema}/{table}

获取特定表的详细信息（含列）

**Path Parameters**:
| 参数 | 类型 | 描述 |
|------|------|------|
| name | string | 数据库连接名 |
| schema | string | Schema名 |
| table | string | 表名 |

**Response**: `200 OK`
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
      "comment": "User ID"
    }
  ],
  "rowCount": 1500,
  "comment": "User accounts"
}
```

**Error Responses**:
- `404 Not Found`: 表不存在

---

### POST /api/v1/query/execute

执行SQL查询（现有端点，用于单条执行）

**Request Body**:
```json
{
  "dbName": "my-database",
  "sql": "SELECT * FROM users LIMIT 10"
}
```

**Response**: `200 OK`
```json
{
  "columns": ["id", "email", "name"],
  "rows": [
    [1, "user@example.com", "John"],
    [2, "admin@example.com", "Admin"]
  ],
  "rowCount": 2,
  "executionTime": 0.045
}
```

---

## Frontend Service Interface

### MetadataService (TypeScript)

```typescript
interface MetadataService {
  /**
   * 获取表列表（轻量级）
   */
  getTableList(dbName: string, refresh?: boolean): Promise<TableListResponse>;

  /**
   * 获取特定表的列信息
   */
  getTableColumns(
    dbName: string,
    schemaName: string,
    tableName: string
  ): Promise<TableMetadata>;

  /**
   * 获取完整元数据
   */
  getFullMetadata(dbName: string, refresh?: boolean): Promise<DatabaseMetadata>;
}
```

### SqlCompletionProvider (TypeScript)

```typescript
interface SqlCompletionProvider {
  /**
   * Monaco自动完成提供者接口实现
   */
  provideCompletionItems(
    model: monaco.editor.ITextModel,
    position: monaco.Position,
    context: monaco.languages.CompletionContext,
    token: monaco.CancellationToken
  ): monaco.languages.ProviderResult<monaco.languages.CompletionList>;

  /**
   * 设置当前数据库的schema元数据
   */
  setSchemaMetadata(metadata: DatabaseMetadata): void;

  /**
   * 清除schema元数据
   */
  clearSchemaMetadata(): void;
}
```

### SqlStatementParser (TypeScript)

```typescript
interface SqlStatementParser {
  /**
   * 解析SQL文本，返回语句列表
   */
  parseStatements(sql: string): SqlStatement[];

  /**
   * 获取光标位置所在的语句
   */
  getStatementAtPosition(
    statements: SqlStatement[],
    line: number,
    column: number
  ): SqlStatement | null;
}
```

---

## Notes

- 所有API响应遵循camelCase JSON序列化约定（项目宪法要求）
- 无需新增后端API端点
- 前端服务层封装现有API调用

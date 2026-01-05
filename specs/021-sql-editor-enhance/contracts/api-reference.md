# API Contracts: SQL Editor Enhancement

**Feature**: 021-sql-editor-enhance
**Date**: 2026-01-04

## Overview

This document references the existing API contracts used by the SQL Editor enhancement feature. No new API endpoints are required - all functionality uses existing endpoints.

## Existing Endpoints Used

### 1. Get Table List

Retrieves list of tables/views without column details (for autocomplete initialization).

```
GET /api/databases/{db_name}/tables
```

**Query Parameters**:
- `refresh` (boolean, optional): Force refresh from database

**Response**: `TableListResponse`
```json
{
  "name": "my-database",
  "schemas": ["public", "app"],
  "tables": [
    {
      "schemaName": "public",
      "tableName": "users",
      "tableType": "table",
      "comment": "User accounts"
    }
  ],
  "lastRefreshed": "2026-01-04T10:30:00Z"
}
```

### 2. Get Table Details

Retrieves full table metadata including columns (for column autocomplete).

```
GET /api/databases/{db_name}/tables/{schema_name}/{table_name}
```

**Response**: `TableMetadata`
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
      "comment": "Primary key"
    },
    {
      "name": "email",
      "dataType": "varchar(255)",
      "isNullable": false,
      "isPrimaryKey": false,
      "defaultValue": null,
      "comment": "User email address"
    }
  ],
  "rowCount": 1500,
  "comment": "User accounts table"
}
```

### 3. Execute Query

Executes SQL query (supports both full editor content and single statement).

```
POST /api/databases/{db_name}/query
```

**Request Body**:
```json
{
  "sql": "SELECT * FROM users WHERE active = true",
  "naturalQuery": "Show me active users"
}
```

**Response**: `QueryResponse`
```json
{
  "sql": "SELECT * FROM users WHERE active = true LIMIT 1000",
  "result": {
    "columns": ["id", "email", "active"],
    "rows": [
      [1, "user@example.com", true]
    ],
    "rowCount": 1
  },
  "executionTimeMs": 45
}
```

## Frontend-Only Contracts

The following "contracts" are internal to the frontend (no API calls).

### SQL Parsing Interface

```typescript
interface ParseResult {
  statements: SqlStatement[];
  statementCount: number;
}

// Usage
function parseStatements(sql: string): ParseResult;
function getStatementAtPosition(sql: string, line: number, col: number): SqlStatement | null;
```

### Autocomplete Provider Interface

```typescript
interface SchemaDataProvider {
  getTables(): TableSummary[];
  getTableColumns(tableName: string): ColumnInfo[] | undefined;
  hasSchemaData(): boolean;
}

// Monaco Integration
class SqlCompletionProvider implements CompletionItemProvider {
  setSchemaDataProvider(provider: SchemaDataProvider | null): void;
  provideCompletionItems(...): ProviderResult<CompletionList>;
}
```

### Context Detection Interface

```typescript
function detectSqlContext(sql: string, position: number): CompletionContext;
function parseTableReferences(sql: string): TableReference[];
```

## Error Responses

All endpoints return standard error format:

```json
{
  "detail": "Error message here"
}
```

| Status Code | Meaning |
|-------------|---------|
| 400 | Invalid request (bad SQL syntax, missing parameters) |
| 404 | Database or table not found |
| 500 | Internal server error |
| 503 | Database connection unavailable |

## Notes

- All responses use **camelCase** field names (Pydantic alias_generator)
- Schema data is cached on frontend (localStorage) to minimize API calls
- Column details are loaded on-demand when needed for autocomplete

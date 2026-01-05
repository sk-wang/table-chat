# Data Model: SQL Editor Enhancement

**Feature**: 021-sql-editor-enhance
**Date**: 2026-01-04

## Overview

This document describes the existing data models used by the SQL Editor enhancement feature. All models are already implemented.

## Backend Models (Pydantic)

Location: `backend/app/models/metadata.py`

### ColumnInfo

Represents metadata for a single database column.

```python
class ColumnInfo(CamelModel):
    name: str                    # Column name
    data_type: str               # Data type (e.g., varchar, integer)
    is_nullable: bool = True     # Whether column allows NULL
    is_primary_key: bool = False # Whether part of primary key
    default_value: str | None    # Default value if any
    comment: str | None          # Column description
```

### TableSummary

Lightweight table information for listing (without column details).

```python
class TableSummary(CamelModel):
    schema_name: str    # Schema name (e.g., public)
    table_name: str     # Table or view name
    table_type: str     # Type: 'table' or 'view'
    comment: str | None # Table description
```

### TableMetadata

Complete table metadata including columns.

```python
class TableMetadata(CamelModel):
    schema_name: str                    # Schema name
    table_name: str                     # Table name
    table_type: str                     # 'table' or 'view'
    columns: list[ColumnInfo] = []      # Column details
    row_count: int | None               # Estimated row count
    comment: str | None                 # Table description
```

### TableListResponse

API response for table listing.

```python
class TableListResponse(CamelModel):
    name: str                           # Database connection name
    schemas: list[str] = []             # Available schemas
    tables: list[TableSummary] = []     # Table list
    last_refreshed: str | None          # Timestamp
```

### DatabaseMetadata

Complete database metadata with all table details.

```python
class DatabaseMetadata(CamelModel):
    name: str                           # Database name
    schemas: list[str] = []             # Schema list
    tables: list[TableMetadata] = []    # Full table metadata
    last_refreshed: str | None          # Timestamp
```

## Frontend Types (TypeScript)

Location: `frontend/src/types/metadata.ts`, `frontend/src/types/editor.ts`

### ColumnInfo

```typescript
interface ColumnInfo {
  name: string;
  dataType: string;           // camelCase in frontend
  isNullable: boolean;
  isPrimaryKey: boolean;
  defaultValue?: string;
  comment?: string;
}
```

### TableSummary

```typescript
interface TableSummary {
  schemaName: string;
  tableName: string;
  tableType: 'table' | 'view';
  comment?: string;
}
```

### TableMetadata

```typescript
interface TableMetadata {
  schemaName: string;
  tableName: string;
  tableType: string;
  columns: ColumnInfo[];
  rowCount?: number;
  comment?: string;
}
```

### SqlStatement

Represents a parsed SQL statement with position info.

```typescript
interface SqlStatement {
  text: string;         // SQL statement text
  startLine: number;    // 1-based line number
  startColumn: number;  // 1-based column number
  endLine: number;
  endColumn: number;
  index: number;        // 0-based statement index
}
```

### TableReference

Represents a table reference in a SQL query.

```typescript
interface TableReference {
  schemaName: string | null;
  tableName: string;
  alias: string | null;
}
```

### CompletionContext

Context information for autocomplete suggestions.

```typescript
interface CompletionContext {
  contextType: SqlContext;     // KEYWORD | TABLE_NAME | COLUMN_NAME | ALIAS_COLUMN
  prefix: string;              // Current input for filtering
  tableRefs: TableReference[]; // Tables referenced in query
  currentAlias: string | null; // Alias if applicable
}
```

### SchemaCache

Frontend cache structure for schema data.

```typescript
interface SchemaCache {
  databaseName: string | null;
  tables: TableSummary[];
  tableColumns: Map<string, ColumnInfo[]>;  // Lazy-loaded
  lastRefreshed: string | null;
}
```

## Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend                                 │
├─────────────────────────────────────────────────────────────────┤
│  localStorage                  React Context                     │
│  ┌──────────────┐             ┌──────────────────┐              │
│  │ TableList    │ ──────────> │ SchemaContext    │              │
│  │ TTL: 5min    │             │ (tables, columns)│              │
│  ├──────────────┤             └────────┬─────────┘              │
│  │ TableDetails │                      │                         │
│  │ TTL: 10min   │                      ▼                         │
│  └──────────────┘             ┌──────────────────┐              │
│                               │ SqlCompletionPr. │              │
│                               │ (provides hints) │              │
│                               └──────────────────┘              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ API Calls
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Backend                                  │
├─────────────────────────────────────────────────────────────────┤
│  GET /api/databases/{name}/tables                                │
│  └─> TableListResponse (TableSummary[])                         │
│                                                                  │
│  GET /api/databases/{name}/tables/{schema}/{table}               │
│  └─> TableMetadata (with columns)                               │
└─────────────────────────────────────────────────────────────────┘
```

## Validation Rules

| Entity | Field | Validation |
|--------|-------|------------|
| ColumnInfo | name | Non-empty string |
| ColumnInfo | dataType | Valid SQL data type |
| TableSummary | tableType | 'table' or 'view' |
| SqlStatement | startLine | >= 1 |
| SqlStatement | startColumn | >= 1 |
| CompletionContext | contextType | One of SqlContext enum values |

## State Transitions

### Schema Loading

```
IDLE -> LOADING -> LOADED
         └──────> ERROR
```

### Autocomplete Context

```
KEYWORD -> TABLE_NAME (after FROM/JOIN)
        -> COLUMN_NAME (after SELECT/WHERE)
        -> ALIAS_COLUMN (after alias.)
```

### Statement Execution

```
IDLE -> DETECTING -> HIGHLIGHTING -> EXECUTING -> COMPLETE
                                              └-> ERROR
```

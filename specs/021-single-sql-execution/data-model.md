# Data Model: Single SQL Statement Execution

**Feature**: 021-single-sql-execution
**Date**: 2026-01-09
**Status**: Phase 1 Complete

## Overview

This document defines the data structures, entities, and their relationships for the Single SQL Statement Execution feature. All models follow the project's type safety requirements (Pydantic for backend, TypeScript interfaces for frontend).

---

## Frontend Data Models (TypeScript)

### 1. SqlStatement

Represents a single parsed SQL statement with its position in the editor.

```typescript
interface SqlStatement {
  /** The SQL text content */
  text: string;

  /** Starting position in the editor */
  startPosition: EditorPosition;

  /** Ending position in the editor */
  endPosition: EditorPosition;

  /** Zero-based index in the statements array */
  index: number;

  /** Statement type (always 'SELECT' for this feature) */
  type: 'SELECT';
}
```

**Validation Rules**:
- `text` must not be empty or whitespace-only
- `startPosition.line` must be ≤ `endPosition.line`
- `startPosition.column` must be < `endPosition.column` when on same line
- `index` must be ≥ 0

**Lifecycle**:
- Created: When SQL content is parsed
- Updated: When editor content changes (triggers re-parse)
- Destroyed: When editor content is cleared or component unmounts

---

### 2. EditorPosition

Represents a position in the Monaco Editor.

```typescript
interface EditorPosition {
  /** Line number (1-based) */
  line: number;

  /** Column number (1-based) */
  column: number;
}
```

**Validation Rules**:
- `line` must be ≥ 1
- `column` must be ≥ 1

**Notes**:
- Monaco Editor uses 1-based line/column indexing
- Position is immutable - create new instance for changes

---

### 3. EditorRange

Represents a range/selection in the editor.

```typescript
interface EditorRange {
  /** Starting position */
  startLineNumber: number;
  startColumn: number;

  /** Ending position */
  endLineNumber: number;
  endColumn: number;
}
```

**Validation Rules**:
- All numbers must be ≥ 1
- `startLineNumber` ≤ `endLineNumber`
- If same line: `startColumn` < `endColumn`

**Notes**:
- This matches Monaco's `IRange` interface
- Used for text selection and highlighting decorations

---

### 4. StatementHighlight

Configuration for visual highlighting of a statement.

```typescript
interface StatementHighlight {
  /** The range to highlight */
  range: EditorRange;

  /** CSS class for styling */
  className: string;

  /** Optional hover message */
  hoverMessage?: string;
}
```

**Validation Rules**:
- `range` must be valid `EditorRange`
- `className` must reference existing CSS class

**Default Values**:
- `className`: `'active-sql-statement'`
- `hoverMessage`: `'Press F8 or Cmd/Ctrl+Enter to execute'`

---

### 5. QueryTimeout Settings

User preference for query execution timeout.

```typescript
interface QueryTimeoutSettings {
  /** Timeout duration in seconds */
  timeoutSeconds: number;
}
```

**Validation Rules**:
- `timeoutSeconds` must be between 10 and 300 (inclusive)
- Default: 30 seconds

**Storage**:
- Persisted in localStorage under key: `tableChat:queryTimeout`
- Stored as JSON: `{ "timeoutSeconds": 30 }`

**State Transitions**:
```
[Not Set] → Read from localStorage → [Use Default: 30s]
[User Changes Setting] → Validate (10-300) → Save to localStorage → Update UI
```

---

### 6. ExecutionState

Tracks the current state of query execution.

```typescript
type ExecutionStatus = 'idle' | 'executing' | 'success' | 'error' | 'timeout';

interface ExecutionState {
  /** Current execution status */
  status: ExecutionStatus;

  /** SQL statement being executed */
  sql: string | null;

  /** Execution result (if success) */
  result: QueryResult | null;

  /** Error message (if error/timeout) */
  error: string | null;

  /** Execution start time (milliseconds since epoch) */
  startTime: number | null;

  /** Execution duration in milliseconds */
  duration: number | null;
}
```

**State Transitions**:
```
idle → (user clicks execute) → executing
executing → (success) → success
executing → (SQL error) → error
executing → (connection error) → error
executing → (timeout reached) → timeout
success/error/timeout → (user retries) → executing
```

**Validation Rules**:
- `status === 'executing'` → `sql` and `startTime` must not be null
- `status === 'success'` → `result` and `duration` must not be null
- `status === 'error' | 'timeout'` → `error` and `duration` must not be null

---

## Backend Data Models (Pydantic)

### 7. QueryRequest (Extended)

Extended from existing `QueryRequest` model to support timeout configuration.

```python
class QueryRequest(CamelModel):
    """Request model for executing SQL query."""

    sql: str = Field(..., description="SQL SELECT statement")
    natural_query: str | None = Field(
        None, description="Natural language description"
    )
    timeout_seconds: int = Field(
        30,
        ge=10,
        le=300,
        description="Query timeout in seconds"
    )
```

**Changes from Existing Model**:
- Added: `timeout_seconds` field with range validation

**Validation Rules**:
- `sql` must not be empty
- `timeout_seconds` must be between 10-300

**JSON Serialization** (camelCase via Pydantic alias):
```json
{
  "sql": "SELECT * FROM users",
  "naturalQuery": null,
  "timeoutSeconds": 30
}
```

---

### 8. QueryResult (Unchanged)

Existing model, no changes needed for this feature.

```python
class QueryResult(CamelModel):
    """Query result data."""

    columns: list[str] = Field(..., description="Column names")
    rows: list[dict] = Field(..., description="Data rows")
    row_count: int = Field(..., description="Number of rows returned")
    truncated: bool = Field(False, description="True if LIMIT was auto-added")
```

---

### 9. QueryResponse (Unchanged)

Existing model, no changes needed for this feature.

```python
class QueryResponse(CamelModel):
    """Response model for query execution."""

    sql: str = Field(..., description="Executed SQL")
    result: QueryResult
    execution_time_ms: int = Field(..., description="Execution time in milliseconds")
```

---

### 10. ErrorResponse

Standard error response format (existing in project, documented here for completeness).

```python
class ErrorResponse(CamelModel):
    """Error response model."""

    error: str = Field(..., description="Error message")
    error_type: str = Field(..., description="Error category")
    details: dict | None = Field(None, description="Additional error details")
```

**Error Types**:
- `"sql_error"`: Invalid SQL syntax
- `"connection_error"`: Database connection failed
- `"timeout_error"`: Query exceeded timeout limit
- `"validation_error"`: Request validation failed

---

## Entity Relationships

```
┌─────────────────────┐
│   SQL Editor        │
│   (Monaco Editor)   │
└──────────┬──────────┘
           │ contains
           ▼
┌─────────────────────┐      ┌──────────────────┐
│   SqlStatement[]    │◄─────┤  Cursor Position │
│   (parsed)          │      └──────────────────┘
└──────────┬──────────┘
           │ selected by
           ▼
┌─────────────────────┐      ┌──────────────────┐
│   Text Selection    │─────►│ EditorRange      │
│   or Cursor Pos     │      └──────────────────┘
└──────────┬──────────┘
           │ triggers
           ▼
┌─────────────────────┐
│  Execute Query      │
│  (with timeout)     │
└──────────┬──────────┘
           │ produces
           ▼
┌─────────────────────┐
│  Execution Result   │
│  or Error           │
└─────────────────────┘
```

---

## Data Flow

### 1. Statement Detection Flow

```
User types SQL
  → Editor content changes
  → Debounced parse (50ms)
  → Generate SqlStatement[]
  → Store in React state
```

### 2. Highlighting Flow

```
User moves cursor
  → Get cursor EditorPosition
  → Find SqlStatement containing position
  → Create StatementHighlight with range
  → Apply Monaco decoration
  → Update on cursor move (debounced 50ms)
```

### 3. Execution Flow

```
User triggers execute
  → Check for text selection
    → YES: Use selected text as SQL
    → NO: Find statement at cursor position
  → Read timeout from localStorage
  → Send QueryRequest to backend
  → Update ExecutionState to 'executing'
  → Wait for response (with timeout)
    → SUCCESS: Update state with QueryResult
    → ERROR: Update state with error message
    → TIMEOUT: Cancel request, show timeout error
```

### 4. Retry Flow

```
Connection error occurs
  → Show Modal with retry button
  → User clicks retry
  → Re-send last QueryRequest
  → Follow normal execution flow
```

---

## Storage Schema

### localStorage (Frontend)

| Key | Value Type | Example | Description |
|-----|------------|---------|-------------|
| `tableChat:queryTimeout` | JSON | `{"timeoutSeconds": 30}` | User's preferred timeout setting |

**No backend storage needed** - timeout is a client-side preference (per constitution Principle V: Open Access).

---

## Validation Summary

| Entity | Key Validations |
|--------|-----------------|
| SqlStatement | Non-empty text, valid position range |
| EditorPosition | line ≥ 1, column ≥ 1 |
| EditorRange | Valid start/end positions, start ≤ end |
| QueryTimeoutSettings | 10 ≤ timeoutSeconds ≤ 300 |
| ExecutionState | Status-dependent field requirements |
| QueryRequest | Non-empty SQL, timeout in range |

---

## Notes

- All frontend models use **TypeScript interfaces** (readonly at runtime, compile-time checks only)
- All backend models use **Pydantic BaseModel** (runtime validation + type hints)
- JSON serialization follows **camelCase** convention (per Constitution Principle IV)
- No database schema changes required for this feature
- localStorage is the only persistent storage needed

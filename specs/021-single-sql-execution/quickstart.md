# Quickstart: Single SQL Statement Execution

**Feature**: 021-single-sql-execution
**Date**: 2026-01-09
**For**: Developers implementing this feature

## Overview

This quickstart guide provides step-by-step instructions for implementing the Single SQL Statement Execution feature. Follow the phases in order.

---

## Prerequisites

- ✅ Spec completed and clarified ([spec.md](spec.md))
- ✅ Plan reviewed and approved ([plan.md](plan.md))
- ✅ Research decisions documented ([research.md](research.md))
- ✅ Data models defined ([data-model.md](data-model.md))
- ✅ API contracts specified ([contracts/](contracts/))

**Tools & Environment**:
- Backend: Python 3.13+, uv, pytest
- Frontend: Node.js 22+, TypeScript 5.9, React 19
- Editor: VS Code (recommended for TypeScript)

---

## Implementation Phases

### Phase 1: Frontend - SQL Statement Parser (2-3 hours)

#### 1.1 Create SQL Parser Utility

**File**: `frontend/src/utils/sqlParser.ts`

```typescript
import type { SqlStatement, ParseResult, EditorPosition } from '@/contracts/frontend-api';

/**
 * Parse SQL content into individual statements
 */
export function parseStatements(sql: string): ParseResult {
  const statements: SqlStatement[] = [];
  const errors: string[] = [];

  // TODO: Implement tokenizer-based parsing
  // - Scan for semicolons
  // - Respect string literals (' and ")
  // - Respect comments (-- and /* */)
  // - Track line/column positions

  return { statements, errors };
}

/**
 * Find statement containing the given position
 */
export function findStatementAtPosition(
  statements: SqlStatement[],
  position: EditorPosition
): SqlStatement | null {
  // TODO: Binary search or linear scan
  return null;
}
```

**Test**: `frontend/src/utils/sqlParser.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { parseStatements } from './sqlParser';

describe('parseStatements', () => {
  it('should parse single SELECT statement', () => {
    const sql = 'SELECT * FROM users;';
    const result = parseStatements(sql);
    expect(result.statements).toHaveLength(1);
    expect(result.statements[0].text).toBe('SELECT * FROM users;');
  });

  it('should parse multiple statements', () => {
    const sql = 'SELECT * FROM users;\nSELECT * FROM orders;';
    const result = parseStatements(sql);
    expect(result.statements).toHaveLength(2);
  });

  it('should handle semicolons in string literals', () => {
    const sql = "SELECT * FROM users WHERE name = 'O\\'Brien;';";
    const result = parseStatements(sql);
    expect(result.statements).toHaveLength(1);
  });
});
```

**Run test**: `cd frontend && npm test -- sqlParser.test.ts`

---

#### 1.2 Create Custom Hooks

**File**: `frontend/src/components/SqlEditor/useSqlStatementParser.ts`

```typescript
import { useMemo } from 'react';
import { parseStatements, findStatementAtPosition } from '@/utils/sqlParser';
import type { UseSqlStatementParserResult } from '@/contracts/frontend-api';

export function useSqlStatementParser(
  sqlContent: string,
  cursorPosition: EditorPosition | null
): UseSqlStatementParserResult {
  const { statements, errors } = useMemo(
    () => parseStatements(sqlContent),
    [sqlContent]
  );

  const currentStatement = useMemo(() => {
    if (!cursorPosition) return null;
    return findStatementAtPosition(statements, cursorPosition);
  }, [statements, cursorPosition]);

  return {
    statements,
    currentStatement,
    parse: (content: string) => parseStatements(content),
    findStatementAtPosition: (pos) => findStatementAtPosition(statements, pos),
    errors,
  };
}
```

---

### Phase 2: Frontend - Editor Highlighting (1-2 hours)

**File**: `frontend/src/components/SqlEditor/useEditorHighlight.ts`

```typescript
import { useState, useCallback } from 'react';
import type * as monaco from 'monaco-editor';
import type { UseEditorHighlightResult, SqlStatement } from '@/contracts/frontend-api';

export function useEditorHighlight(
  editor: monaco.editor.IStandaloneCodeEditor | null
): UseEditorHighlightResult {
  const [decorations, setDecorations] = useState<string[]>([]);

  const updateHighlight = useCallback((statement: SqlStatement | null) => {
    if (!editor || !statement) {
      clearHighlight();
      return;
    }

    const newDecorations = [{
      range: new monaco.Range(
        statement.startPosition.line,
        statement.startPosition.column,
        statement.endPosition.line,
        statement.endPosition.column
      ),
      options: {
        className: 'active-sql-statement',
        hoverMessage: { value: 'Press F8 or Cmd/Ctrl+Enter to execute' },
      },
    }];

    const ids = editor.deltaDecorations(decorations, newDecorations);
    setDecorations(ids);
  }, [editor, decorations]);

  const clearHighlight = useCallback(() => {
    if (editor) {
      editor.deltaDecorations(decorations, []);
      setDecorations([]);
    }
  }, [editor, decorations]);

  return {
    highlight: null, // TODO: track current highlight
    updateHighlight,
    clearHighlight,
  };
}
```

---

### Phase 3: Frontend - Keyboard Shortcuts (1 hour)

**File**: `frontend/src/hooks/useKeyboardShortcut.ts`

```typescript
import { useEffect } from 'react';
import type * as monaco from 'monaco-editor';

export function useKeyboardShortcut(
  editor: monaco.editor.IStandaloneCodeEditor | null,
  onExecute: () => void
) {
  useEffect(() => {
    if (!editor) return;

    // Register F8
    const f8Disposable = editor.addCommand(
      monaco.KeyCode.F8,
      onExecute
    );

    // Register Ctrl/Cmd + Enter
    const ctrlEnterDisposable = editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
      onExecute
    );

    return () => {
      f8Disposable?.dispose();
      ctrlEnterDisposable?.dispose();
    };
  }, [editor, onExecute]);
}
```

---

### Phase 4: Backend - Timeout Support (1-2 hours)

#### 4.1 Update QueryRequest Model

**File**: `backend/app/models/query.py`

```python
# Add timeout_seconds field to existing QueryRequest class

class QueryRequest(CamelModel):
    """Request model for executing SQL query."""

    sql: str = Field(..., description="SQL SELECT statement")
    natural_query: str | None = Field(
        None, description="Natural language description"
    )
    timeout_seconds: int = Field(  # NEW
        30,
        ge=10,
        le=300,
        description="Query timeout in seconds"
    )
```

#### 4.2 Update Query Execution Service

**File**: `backend/app/services/query_executor.py` (modify existing)

```python
import asyncio

async def execute_query_with_timeout(
    connection,
    sql: str,
    timeout_seconds: int
) -> dict:
    """Execute query with timeout."""
    try:
        return await asyncio.wait_for(
            _execute_query(connection, sql),
            timeout=timeout_seconds
        )
    except asyncio.TimeoutError:
        # Cancel the query
        await connection.cancel()
        raise TimeoutError(
            f"Query execution exceeded timeout of {timeout_seconds} seconds"
        )
```

**Test**: `backend/tests/unit/test_query_timeout.py`

```python
import pytest
import asyncio

@pytest.mark.asyncio
async def test_query_timeout():
    """Test that queries respect timeout."""
    # TODO: Mock slow query
    # TODO: Assert TimeoutError raised
    pass
```

---

### Phase 5: Integration & E2E Tests (2-3 hours)

**File**: `frontend/e2e/single-sql-execution.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Single SQL Statement Execution', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    // TODO: Setup test database connection
  });

  test('should execute statement at cursor position', async ({ page }) => {
    // Type multiple statements
    await page.fill('.monaco-editor', `
      SELECT * FROM users;
      SELECT * FROM orders;
    `);

    // Position cursor in first statement
    await page.click('.monaco-editor', { position: { x: 50, y: 20 } });

    // Press F8
    await page.keyboard.press('F8');

    // Verify only first query executed
    await expect(page.locator('.query-result')).toContainText('users');
    await expect(page.locator('.query-result')).not.toContainText('orders');
  });

  test('should highlight statement on cursor move', async ({ page }) => {
    // TODO: Test highlighting behavior
  });

  test('should execute selected text', async ({ page }) => {
    // TODO: Test manual selection execution
  });
});
```

---

## Testing Checklist

- [ ] **Unit Tests**
  - [ ] SQL parser handles single statement
  - [ ] SQL parser handles multiple statements
  - [ ] SQL parser respects string literals
  - [ ] SQL parser respects comments
  - [ ] Backend timeout enforcement works
- [ ] **Integration Tests**
  - [ ] API accepts timeoutSeconds parameter
  - [ ] API returns 408 on timeout
  - [ ] API returns connection errors correctly
- [ ] **E2E Tests**
  - [ ] Execute at cursor position (P1)
  - [ ] Visual highlighting (P2)
  - [ ] Execute selected text (P2)
  - [ ] Keyboard shortcuts (P3)
  - [ ] Retry on connection error

---

## Development Workflow

1. **Start Backend**:
   ```bash
   cd backend
   uv run uvicorn app.main:app --reload
   ```

2. **Start Frontend**:
   ```bash
   cd frontend
   npm run dev
   ```

3. **Run Tests**:
   ```bash
   # Backend
   cd backend && pytest

   # Frontend unit
   cd frontend && npm test

   # Frontend E2E
   cd frontend && npm run test:e2e
   ```

4. **Type Checking**:
   ```bash
   # Backend
   cd backend && mypy app

   # Frontend
   cd frontend && npm run build
   ```

---

## API Testing with .rest File

**File**: `api-tests.rest` (add to existing file)

```http
### Execute query with default timeout
POST http://localhost:8000/query/execute
Content-Type: application/json

{
  "sql": "SELECT * FROM users LIMIT 10",
  "timeoutSeconds": 30
}

### Execute query with custom timeout
POST http://localhost:8000/query/execute
Content-Type: application/json

{
  "sql": "SELECT * FROM large_table",
  "timeoutSeconds": 60
}

### Test timeout error (use slow query)
POST http://localhost:8000/query/execute
Content-Type: application/json

{
  "sql": "SELECT pg_sleep(35)",
  "timeoutSeconds": 30
}
```

---

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Highlighting doesn't update | Check debounce timing (50ms) |
| Keyboard shortcuts don't work | Verify editor has focus |
| Parser splits string literals incorrectly | Escape quotes properly in tokenizer |
| Timeout not enforced | Ensure asyncio.wait_for wraps query execution |
| E2E tests flaky | Add proper wait conditions for async operations |

---

## Performance Benchmarks

Test these scenarios to validate performance goals:

- [ ] Parse 50 statements in < 50ms
- [ ] Update highlighting in < 16ms (60fps)
- [ ] Execute query in < 2s (cursor to results)

Use browser DevTools Performance tab and backend logging to measure.

---

## Next Steps

After completing implementation:

1. Run `/speckit.tasks` to generate detailed task breakdown
2. Create feature branch: `git checkout -b 021-single-sql-execution`
3. Implement in order: Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5
4. Write tests alongside each phase (TDD approach)
5. Create pull request when all tests pass

---

## Resources

- [Monaco Editor API](https://microsoft.github.io/monaco-editor/api/)
- [sqlglot Documentation](https://sqlglot.com/)
- [Playwright Docs](https://playwright.dev/)
- [Pydantic Docs](https://docs.pydantic.dev/)
- Feature Spec: [spec.md](spec.md)
- Technical Research: [research.md](research.md)
- Data Models: [data-model.md](data-model.md)
- API Contracts: [contracts/](contracts/)

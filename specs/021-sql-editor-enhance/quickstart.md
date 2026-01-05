# Quickstart: SQL Editor Enhancement

**Feature**: 021-sql-editor-enhance
**Date**: 2026-01-04

## Overview

This guide explains how to use the enhanced SQL editor features: autocomplete, syntax highlighting, and single statement execution.

## Prerequisites

- TableChat application running
- At least one database connection configured

## Features

### 1. SQL Autocomplete

The SQL editor provides intelligent autocomplete suggestions based on your connected database schema.

#### Automatic Triggers

Autocomplete appears automatically in these contexts:

| Context | Trigger | Example |
|---------|---------|---------|
| After `FROM` | Space after FROM | `SELECT * FROM ` → shows tables |
| After `JOIN` | Space after JOIN | `INNER JOIN ` → shows tables |
| After `WHERE` | Space after WHERE | `WHERE ` → shows columns |
| After `SELECT` | Space after SELECT | `SELECT ` → shows columns |
| After comparison operators | `=`, `<`, `>`, `!` | `WHERE id = ` → shows columns |
| After opening parenthesis | `(` | `WHERE id IN (` → shows suggestions |
| After comma | `,` | `SELECT col1, ` → shows columns |
| After alias dot | `.` character | `u.` → shows columns from aliased table |
| After `AND`/`OR` | Space after AND/OR | `WHERE x = 1 AND ` → shows columns |
| After `GROUP BY` | Space after GROUP BY | `GROUP BY ` → shows columns |
| After `ORDER BY` | Space after ORDER BY | `ORDER BY ` → shows columns |
| After `SET` | Space after SET (UPDATE) | `UPDATE t SET ` → shows columns |
| After `IN`/`LIKE`/`BETWEEN` | Space after operator | `WHERE col IN ` → shows suggestions |

#### Manual Trigger

Press `Ctrl+Space` (or `Cmd+Space` on Mac) at any position to manually open autocomplete.

#### Navigating Suggestions

| Key | Action |
|-----|--------|
| ↑/↓ | Navigate suggestions |
| Enter/Tab | Insert selected suggestion |
| Escape | Dismiss suggestions |
| Continue typing | Filter suggestions |

### 2. Table and Column Suggestions

When connected to a database:

```sql
-- Type "SELECT * FROM " and pause
-- Autocomplete shows: users, orders, products, ...

-- Type "SELECT " and press Ctrl+Space
-- Autocomplete shows columns from tables in your query

-- Type table alias followed by dot
SELECT u.  -- Shows columns from "users" table (if "users u" or "users AS u" is in FROM)
FROM users u
```

### 3. SQL Keyword Suggestions

Start typing SQL keywords to see suggestions:

```sql
SEL  → SELECT
FRO  → FROM
WHE  → WHERE
GRO  → GROUP BY
```

Keywords are highlighted in a distinct color for easy identification.

### 4. Syntax Highlighting

The editor automatically highlights:

- **Keywords**: SELECT, FROM, WHERE, JOIN, etc. (blue)
- **Strings**: 'text values' (green)
- **Numbers**: 123, 45.67 (orange)
- **Comments**: -- single line, /* block */ (gray)
- **Operators**: =, <, >, AND, OR (purple)

### 5. Single Statement Execution

When you have multiple SQL statements in the editor:

```sql
SELECT * FROM users WHERE active = true;
SELECT COUNT(*) FROM orders;
SELECT name FROM products;
```

#### Execute All Statements
- Press `Ctrl+Enter` (or `Cmd+Enter` on Mac)
- Executes ALL statements in the editor

#### Execute Current Statement Only
1. Place your cursor within the statement you want to execute
2. Press `Ctrl+Shift+Enter` (or `Cmd+Shift+Enter` on Mac)
3. The statement will be highlighted briefly
4. Only that statement executes

#### Visual Feedback
- Statement to be executed is highlighted with a yellow background and left border
- Highlight appears for ~500ms before execution

### 6. Keyboard Shortcuts Summary

| Shortcut | Action |
|----------|--------|
| `Ctrl+Enter` | Execute all SQL |
| `Ctrl+Shift+Enter` | Execute current statement |
| `Ctrl+Space` | Manual autocomplete |
| `Shift+Alt+F` | Format SQL |
| `Escape` | Dismiss autocomplete |

### 7. Working with Aliases

The editor understands table aliases in your queries:

```sql
-- Define alias in FROM/JOIN
SELECT
    u.id,        -- Autocomplete shows "users" columns after "u."
    o.total      -- Autocomplete shows "orders" columns after "o."
FROM users u
JOIN orders o ON u.id = o.user_id
```

### 8. Graceful Degradation

If the database connection is lost:
- Autocomplete falls back to SQL keywords only
- A warning banner appears indicating limited autocomplete
- Reconnect to the database to restore full functionality

## Troubleshooting

### Autocomplete Not Showing Tables

1. Ensure you're connected to a database (check sidebar)
2. Click the refresh button in the database sidebar
3. Try `Ctrl+Space` to manually trigger

### Autocomplete Not Triggering After WHERE

**This has been fixed!** Autocomplete now triggers automatically after:
- `WHERE` keyword (type `WHERE ` with a space)
- Comparison operators: `=`, `<`, `>`, `!=`
- Logical operators: `AND`, `OR`
- Opening parenthesis: `(`
- Commas in SELECT or WHERE clauses

If autocomplete still doesn't appear:
1. **Manual trigger**: Press `Ctrl+Space` (or `Cmd+Space` on Mac)
2. **Check for typos**: Ensure keywords are spelled correctly
3. **Check browser console**: Open DevTools (F12) and check for errors
4. **Debug logs**: Look for `[SqlContextDetector]` and `[SqlCompletionProvider]` logs in console

### Wrong Columns Suggested

1. Make sure your FROM clause is complete
2. Check that table aliases are defined before using them
3. Refresh schema metadata if tables were recently modified
4. If no FROM clause exists, editor shows columns from all tables (this is intentional fallback behavior)

### Single Statement Not Detected

1. Ensure statements are separated by semicolons (`;`)
2. Place cursor clearly inside the statement (not on semicolon)
3. Check for unbalanced quotes or parentheses

## API Details

For developers extending the editor, see:
- `SqlCompletionProvider.ts` - Autocomplete logic
- `SqlStatementParser.ts` - Statement parsing
- `SqlContextDetector.ts` - Context detection
- `contracts/api-reference.md` - API documentation

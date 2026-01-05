# Feature Specification: SQL Editor Enhancement

**Feature Branch**: `021-sql-editor-enhance`
**Created**: 2026-01-03
**Status**: Draft
**Input**: User description: "SQL syntax hints and autocomplete based on database tables, plus single statement execution in SQL editor"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Table and Column Autocomplete (Priority: P1)

As a user writing SQL queries, I want the editor to suggest table names and column names from my connected database so that I can write queries faster and with fewer errors.

**Why this priority**: This is the core value proposition - reducing typing effort and preventing typos in table/column names. It directly addresses the most common pain point in SQL writing.

**Independent Test**: Can be fully tested by connecting to a database with known tables, typing a query, and verifying autocomplete suggestions appear with correct table and column names.

**Acceptance Scenarios**:

1. **Given** I am connected to a database with tables, **When** I type `SELECT * FROM ` and pause, **Then** I see a dropdown list of available table names from the connected database
2. **Given** I have typed a table name in a query, **When** I type a column reference (e.g., after `SELECT ` or in `WHERE` clause), **Then** I see column names from the referenced table(s)
3. **Given** I see autocomplete suggestions, **When** I use arrow keys and press Enter or Tab, **Then** the selected item is inserted at cursor position
4. **Given** I see autocomplete suggestions, **When** I continue typing, **Then** the suggestions filter to match my input

---

### User Story 2 - SQL Syntax Highlighting and Keywords (Priority: P1)

As a user writing SQL queries, I want the editor to highlight SQL keywords and provide keyword autocomplete so that I can identify query structure easily and write syntactically correct SQL.

**Why this priority**: SQL syntax highlighting and keyword completion are fundamental to a good SQL editing experience and work alongside schema autocomplete.

**Independent Test**: Can be tested by typing SQL keywords and verifying visual highlighting appears, and that keyword suggestions (SELECT, FROM, WHERE, etc.) are offered.

**Acceptance Scenarios**:

1. **Given** I am typing in the SQL editor, **When** I type SQL keywords like SELECT, FROM, WHERE, JOIN, **Then** these keywords are visually highlighted in a distinct color
2. **Given** I am typing in the SQL editor, **When** I type partial keywords like `SEL`, **Then** I see suggestions for SQL keywords matching my input (SELECT, etc.)
3. **Given** I have SQL keywords in my query, **When** I view the query, **Then** different SQL elements (keywords, strings, numbers, comments) have distinct visual styling

---

### User Story 3 - Single Statement Execution (Priority: P2)

As a user with multiple SQL statements in the editor, I want to execute only the statement where my cursor is located so that I can run specific queries without executing the entire editor contents.

**Why this priority**: This enables a workflow where users accumulate SQL statements (including AI-generated ones) and selectively execute them, but requires the basic editing features first.

**Independent Test**: Can be tested by entering multiple SQL statements, placing cursor in one, and verifying only that statement executes.

**Acceptance Scenarios**:

1. **Given** I have multiple SQL statements separated by semicolons in the editor, **When** I place my cursor within one statement and trigger "Execute Current Statement", **Then** only that statement is executed and results are shown
2. **Given** I have multiple SQL statements in the editor, **When** I trigger single statement execution, **Then** the statement containing my cursor is visually highlighted to show which statement will run
3. **Given** I execute a single statement, **When** the AI generates a new SQL query, **Then** the new query is appended to the end of the editor (preserving existing statements)

---

### User Story 4 - Alias and Join Autocomplete (Priority: P3)

As a user writing complex queries with table aliases and joins, I want the autocomplete to understand my aliases and suggest appropriate columns so that I can write complex queries efficiently.

**Why this priority**: This is an enhancement for power users writing more complex queries; core functionality must work first.

**Independent Test**: Can be tested by writing a query with table aliases and verifying column suggestions use the alias context.

**Acceptance Scenarios**:

1. **Given** I have defined a table alias (e.g., `FROM users u`), **When** I type the alias followed by a dot (`u.`), **Then** I see columns from the aliased table
2. **Given** I have a JOIN clause, **When** I type column references after the join, **Then** I see columns from all joined tables with appropriate table prefixes

---

### Edge Cases

- What happens when the database connection is lost during autocomplete?
  - Autocomplete gracefully degrades to keyword-only suggestions and shows a subtle indicator that schema data is unavailable
- How does autocomplete handle very large schemas (hundreds of tables)?
  - Suggestions are loaded on-demand and filtered efficiently; initial load shows most recently used or frequently used tables first
- What happens when cursor is between two statements or on an empty line?
  - Single statement execution identifies the nearest complete statement or shows a message that no statement is selected
- How does the editor handle incomplete SQL syntax?
  - Autocomplete still functions for the valid portions; syntax errors are indicated but don't block suggestions

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display autocomplete suggestions for table names when user types in appropriate SQL contexts (after FROM, JOIN, INTO, UPDATE, etc.)
- **FR-002**: System MUST display autocomplete suggestions for column names based on tables referenced in the current query
- **FR-003**: System MUST provide SQL keyword highlighting with distinct visual styles for keywords, strings, numbers, comments, and identifiers
- **FR-004**: System MUST provide SQL keyword autocomplete suggestions (SELECT, FROM, WHERE, GROUP BY, ORDER BY, JOIN, etc.)
- **FR-005**: System MUST allow users to navigate autocomplete suggestions using keyboard (arrow keys, Enter/Tab to select, Escape to dismiss)
- **FR-013**: System MUST automatically trigger autocomplete in context-sensitive situations (after `.`, after SQL keywords like FROM/JOIN, after table alias definition) and support manual trigger via keyboard shortcut (e.g., Ctrl+Space) at any position
- **FR-006**: System MUST provide a "Execute Current Statement" action that runs only the SQL statement containing the cursor
- **FR-007**: System MUST visually indicate which statement will be executed before running single statement execution
- **FR-008**: System MUST correctly parse multiple SQL statements separated by semicolons to identify statement boundaries
- **FR-009**: System MUST recognize table aliases and provide column suggestions based on aliased tables
- **FR-010**: System MUST use the currently connected database's schema information for table and column suggestions
- **FR-011**: System MUST filter autocomplete suggestions as the user continues typing
- **FR-012**: System MUST append AI-generated SQL queries to the end of the existing editor content (not replace)

### Key Entities

- **Database Schema Metadata**: Tables and their columns from the connected database, used for autocomplete suggestions
- **SQL Statement**: A single executable SQL command, bounded by semicolons or editor boundaries
- **Autocomplete Suggestion**: A candidate item (table name, column name, keyword) offered to the user with type indicator
- **Cursor Position**: The user's current location in the editor, used to determine context for autocomplete and statement execution

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can select table and column names from autocomplete in under 2 seconds after typing trigger characters
- **SC-002**: Autocomplete suggestions accurately reflect the connected database's current schema (tables and columns match actual database)
- **SC-003**: Users can successfully execute a single statement from a multi-statement editor with one action
- **SC-004**: SQL keyword highlighting is applied to all standard SQL keywords immediately upon typing
- **SC-005**: 90% of users successfully use autocomplete to insert table/column names on first attempt
- **SC-006**: Autocomplete suggestions appear within 500ms of user pause or trigger
- **SC-007**: Single statement execution correctly identifies statement boundaries in 95% of valid SQL cases

## Clarifications

### Session 2026-01-03

- Q: 自动完成的触发方式是什么？ → A: 手动+上下文触发 - 在特定上下文（如 `.` 或空格后）自动显示，其他时候需按快捷键

## Assumptions

- The database connection is already established before autocomplete is used (existing functionality)
- Schema metadata (tables, columns) is accessible through the existing database connection APIs
- The SQL editor already has basic editing functionality (existing Monaco Editor or similar)
- SQL statements are separated by semicolons as per standard SQL conventions
- The AI-generated SQL append behavior integrates with the existing AI assistant feature

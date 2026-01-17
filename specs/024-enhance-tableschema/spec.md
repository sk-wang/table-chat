# Feature Specification: Enhance Table Schema Tool

**Feature Branch**: `024-enhance-tableschema`  
**Created**: 2026-01-17  
**Status**: Draft  
**Input**: User description: "tableschema工具返回的字段信息和表信息更全一点，比如默认的字段类型，是否允许为空，是否有默认值，注释，特殊信息等。"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Comprehensive Schema Retrieval (Priority: P1)

As a developer or AI agent using the TableChat toolset, I want to retrieve detailed metadata for database tables (including default values, nullability, and comments) so that I can understand the data structure accurately without needing multiple queries or external tools.

**Why this priority**: This is the core request. The current tool output is insufficient for complex tasks like generating correct INSERT statements (need defaults/nullability) or understanding column semantics (need comments).

**Independent Test**: Can be tested by invoking the schema tool against a known database table with rich metadata (defaults, comments, etc.) and verifying the output contains all new fields.

**Acceptance Scenarios**:

1. **Given** a database table with a column that has a default value (e.g., `created_at` default `CURRENT_TIMESTAMP`), **When** I request the schema for this table, **Then** the output for that column MUST include the `default` value.
2. **Given** a database table with nullable and non-nullable columns, **When** I request the schema, **Then** the output MUST explicitly state `nullable: true` or `false` for each column.
3. **Given** a database table with column comments, **When** I request the schema, **Then** the output MUST include the comment text for those columns.
4. **Given** a database table with special attributes (e.g., AUTO_INCREMENT in MySQL), **When** I request the schema, **Then** the output SHOULD include this in an `extra` or `special` field.

### Edge Cases

- **Unsupported Databases**: If the backing database does not support certain metadata (e.g., comments in older SQLite versions), the tool returns `null` for those specific fields rather than failing.
- **Complex Default Values**: If a default value is a function call or expression (e.g., `gen_random_uuid()`), the tool returns the raw expression string.
- **Permission Denied**: If the user lacks permissions to view metadata, the tool returns a clear error message.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The table schema tool MUST return the following metadata for each column:
  - `name`: Column name
  - `type`: Data type
  - `nullable`: Boolean indicating if NULL is allowed
  - `default`: Default value (if any)
  - `comment`: Column description/comment (if any)
  - `primary_key`: Boolean indicating if it is part of the primary key
  - `extra`: Any special attributes (e.g., "auto_increment")
- **FR-002**: The tool MUST support these metadata fields across all supported database backends (SQLite, MySQL, PostgreSQL).
- **FR-003**: If a metadata field is not applicable or not available for a specific column/database, it SHOULD be returned as `null` or omitted consistently.
- **FR-004**: The output format MUST be structured (e.g., JSON list of objects) to be easily parsable.

### Key Entities *(include if feature involves data)*

- **Column Metadata**: Represents a single column's schema information.
  - `name`: String
  - `type`: String
  - `nullable`: Boolean
  - `default`: String | Null
  - `comment`: String | Null
  - `primary_key`: Boolean
  - `extra`: String | Null

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The schema tool returns `default`, `nullable`, and `comment` fields for >95% of columns in a test database schema containing these attributes.
- **SC-002**: AI Agent correctly identifies required fields (non-nullable, no default) when generating SQL for INSERT operations in 100% of test cases.
- **SC-003**: The schema retrieval latency does not increase by more than 20% compared to the previous version.

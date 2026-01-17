# Research: Enhance Table Schema Tool

**Branch**: `024-enhance-tableschema`  
**Date**: 2026-01-17  

## Decision Summary

1.  **Backend Model Update**: Add `extra` field to `ColumnInfo` model in `backend/app/models/metadata.py`.
2.  **Connector Updates**:
    -   **MySQL**: Fetch `EXTRA` column from `INFORMATION_SCHEMA.COLUMNS`.
    -   **PostgreSQL**: Fetch identity/sequence info to populate `extra` (e.g., "generated always as identity").
    -   **SQLite**: Parse `sqlite_master` or `PRAGMA table_info` to find auto-increment or other special attributes.
3.  **Agent Tool Update**: Update `execute_get_table_schema` in `backend/app/services/agent_tools.py` to include `default_value` and `extra` in the formatted output string.

## Technical Details

### Current State Analysis
-   **Model**: `ColumnInfo` has `default_value` and `comment` but lacks `extra`.
-   **Connectors**:
    -   Postgres & MySQL connectors already fetch `default_value` and `comment`.
    -   They do NOT fetch `extra` attributes.
-   **Agent Tool**:
    -   `execute_get_table_schema` fetches the rich metadata but **ignores** `default_value` when formatting the string for the agent.
    -   It formats: `name`, `type`, `nullable`, `pk`, `comment`.
    -   It omits: `default_value`.

### Implementation Plan

1.  **Update `ColumnInfo`**:
    ```python
    class ColumnInfo(CamelModel):
        # ... existing fields ...
        extra: str | None = Field(None, description="Special attributes (e.g., auto_increment)")
    ```

2.  **Update MySQL Connector**:
    -   Modify query to select `EXTRA` from `INFORMATION_SCHEMA.COLUMNS`.
    -   Map to `ColumnInfo.extra`.

3.  **Update PostgreSQL Connector**:
    -   Modify query to check `is_identity` or `identity_generation` in `INFORMATION_SCHEMA.COLUMNS`.
    -   Map to `ColumnInfo.extra`.

4.  **Update Agent Tool**:
    -   Modify string formatting to include `Default: ...` and `Extra: ...` if present.

### Alternatives Considered

-   **Returning JSON directly**: The tool currently returns a formatted string. Keeping it as a string is consistent with other tools and saves tokens compared to raw JSON, while still being readable by the LLM. We will stick to the text format but enrich it.

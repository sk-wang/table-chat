# Quickstart: Enhance Table Schema Tool

## Overview

This feature enhances the `tableschema` tool (used by the AI agent) to provide detailed column metadata including default values, nullability, comments, and extra attributes (e.g., auto-increment). This ensures the agent generates accurate SQL.

## Development Steps

1.  **Backend Models**: Update `backend/app/models/metadata.py` to add `extra` field.
2.  **Connectors**: Update MySQL and PostgreSQL connectors to fetch `extra` info.
3.  **Agent Tool**: Update `backend/app/services/agent_tools.py` to format the output string with `Default`, `Extra`, and `Nullable` information.
4.  **Frontend**: Update `frontend/src/types/metadata.ts` to reflect the new `extra` field (optional but good for consistency).

## Verification

1.  Start the backend: `cd backend && uv run uvicorn app.main:app --reload`
2.  Connect to a local Postgres/MySQL database.
3.  Use the `get_table_schema` tool via the Agent interface or curl:
    ```bash
    # (Simplified curl if endpoint exposed, otherwise check Agent logs)
    ```
4.  Verify the output contains lines like:
    ```text
    - id: integer NOT NULL [PK] (Default: nextval(...)) (Extra: auto_increment)
    ```

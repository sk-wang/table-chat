"""Agent MCP tools for database exploration."""

import json
import logging
from typing import Any

from app.services.db_manager import database_manager
from app.services.query_service import query_service

logger = logging.getLogger(__name__)

# Maximum rows to return from tool queries
MAX_TOOL_RESULT_ROWS = 100
# Maximum output size in characters
MAX_OUTPUT_SIZE = 10000


def truncate_output(output: str, max_size: int = MAX_OUTPUT_SIZE) -> str:
    """Truncate output if it exceeds max size."""
    if len(output) <= max_size:
        return output
    return output[:max_size] + f"\n... (truncated, total {len(output)} chars)"


async def query_database(db_name: str, sql: str) -> dict[str, Any]:
    """
    Execute a read-only SQL query against the database.

    This tool can only execute SELECT, DESCRIBE, SHOW, and EXPLAIN statements.
    INSERT, UPDATE, DELETE, and DDL statements are blocked.

    Args:
        db_name: Database connection name
        sql: SQL query to execute

    Returns:
        Tool result with query output or error
    """
    try:
        # Get database info
        db = await database_manager.get_database(db_name)
        if not db:
            return {
                "content": [{"type": "text", "text": f"Error: Database '{db_name}' not found"}],
                "is_error": True,
            }

        db_type = db.get("db_type", "postgresql")
        dialect = "mysql" if db_type == "mysql" else "postgres"

        # Validate read-only
        try:
            query_service.validate_readonly(sql, dialect)
        except ValueError as e:
            return {
                "content": [{"type": "text", "text": f"Error: {e}"}],
                "is_error": True,
            }

        # Execute query
        columns, rows, execution_time_ms = await query_service.execute_query(db_name, sql)

        # Limit rows
        if len(rows) > MAX_TOOL_RESULT_ROWS:
            rows = rows[:MAX_TOOL_RESULT_ROWS]
            truncated = True
        else:
            truncated = False

        # Format output
        result_text = f"Query executed in {execution_time_ms}ms\n"
        result_text += f"Columns: {', '.join(columns)}\n"
        result_text += f"Rows returned: {len(rows)}"
        if truncated:
            result_text += f" (truncated to {MAX_TOOL_RESULT_ROWS})"
        result_text += "\n\n"

        # Add data as JSON for readability
        if rows:
            result_text += json.dumps(rows, indent=2, ensure_ascii=False, default=str)

        return {
            "content": [{"type": "text", "text": truncate_output(result_text)}],
            "is_error": False,
        }

    except Exception as e:
        logger.exception(f"query_database error: {e}")
        return {
            "content": [{"type": "text", "text": f"Error executing query: {e}"}],
            "is_error": True,
        }


async def get_table_schema(db_name: str, table_name: str | None = None) -> dict[str, Any]:
    """
    Get table schema information from the database.

    Args:
        db_name: Database connection name
        table_name: Specific table name (optional). If not provided, returns all tables.

    Returns:
        Tool result with schema information
    """
    try:
        from app.db.sqlite import db_manager

        # Get cached metadata
        metadata = await db_manager.get_metadata_for_database(db_name)

        if not metadata:
            return {
                "content": [{"type": "text", "text": "No tables found in this database."}],
                "is_error": False,
            }

        # Filter by table name if specified
        if table_name:
            # Support both "schema.table" and just "table" formats
            filtered = []
            for table_info in metadata:
                schema_name = table_info.get("schema_name", "public")
                tbl_name = table_info.get("table_name", "")
                full_name = f"{schema_name}.{tbl_name}"

                if table_name in (tbl_name, full_name):
                    filtered.append(table_info)

            if not filtered:
                return {
                    "content": [{"type": "text", "text": f"Table '{table_name}' not found."}],
                    "is_error": True,
                }
            metadata = filtered

        # Format output
        lines = ["Database Schema:", "=" * 50, ""]

        for table_info in metadata:
            schema_name = table_info.get("schema_name", "public")
            tbl_name = table_info.get("table_name", "unknown")
            table_type = table_info.get("table_type", "table")
            table_comment = table_info.get("table_comment", "")
            columns = table_info.get("columns", [])

            lines.append(f"Table: {schema_name}.{tbl_name} ({table_type})")
            if table_comment:
                lines.append(f"  Comment: {table_comment}")
            lines.append("-" * 50)

            for col in columns:
                col_name = col.get("name", "unknown")
                col_type = col.get("dataType", col.get("data_type", "unknown"))
                is_nullable = col.get("isNullable", col.get("is_nullable", True))
                is_pk = col.get("isPrimaryKey", col.get("is_primary_key", False))
                col_comment = col.get("comment", "")

                nullable_str = "" if is_nullable else " NOT NULL"
                pk_str = " [PK]" if is_pk else ""
                comment_str = f" -- {col_comment}" if col_comment else ""

                lines.append(f"  - {col_name}: {col_type}{nullable_str}{pk_str}{comment_str}")

            lines.append("")

        result_text = "\n".join(lines)
        return {
            "content": [{"type": "text", "text": truncate_output(result_text)}],
            "is_error": False,
        }

    except Exception as e:
        logger.exception(f"get_table_schema error: {e}")
        return {
            "content": [{"type": "text", "text": f"Error getting schema: {e}"}],
            "is_error": True,
        }


# Tool definitions for Claude Agent SDK
AGENT_TOOLS = [
    {
        "name": "query_database",
        "description": (
            "Execute a read-only SQL query against the database. "
            "Supports SELECT, DESCRIBE, SHOW, and EXPLAIN statements. "
            "Data modification statements (INSERT, UPDATE, DELETE) and DDL are blocked."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "sql": {
                    "type": "string",
                    "description": "The SQL query to execute (read-only)",
                }
            },
            "required": ["sql"],
        },
    },
    {
        "name": "get_table_schema",
        "description": (
            "Get table schema information including table names, columns, data types, "
            "primary keys, and comments. Use without table_name to get all tables."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "table_name": {
                    "type": "string",
                    "description": "Specific table name (optional). Format: 'table' or 'schema.table'",
                }
            },
            "required": [],
        },
    },
]


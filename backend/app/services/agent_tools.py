"""Agent tools for database exploration using Anthropic Tool Use."""

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


# =============================================================================
# Tool Definitions for Anthropic Tool Use API
# =============================================================================

ANTHROPIC_TOOLS = [
    {
        "name": "list_tables",
        "description": (
            "列出数据库中所有表的名称。这是一个轻量级工具，只返回表名列表，"
            "不包含详细的列信息。建议先使用此工具了解数据库结构，再针对特定表获取详情。"
        ),
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": [],
        },
    },
    {
        "name": "get_table_schema",
        "description": (
            "获取指定表的详细结构信息，包括列名、数据类型、是否可空、主键、注释等。"
            "必须提供 table_name 参数。格式可以是 'table' 或 'schema.table'。"
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "table_name": {
                    "type": "string",
                    "description": "要查询的表名，格式: 'table' 或 'schema.table'",
                }
            },
            "required": ["table_name"],
        },
    },
    {
        "name": "query_database",
        "description": (
            "执行只读SQL查询。仅支持 SELECT、DESCRIBE、SHOW、EXPLAIN 语句。"
            "INSERT、UPDATE、DELETE 和 DDL 语句会被拒绝。"
            "结果最多返回100行，超出会被截断。"
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "sql": {
                    "type": "string",
                    "description": "要执行的SQL查询（仅限只读）",
                }
            },
            "required": ["sql"],
        },
    },
]


# =============================================================================
# Tool Execution Functions (返回字符串结果)
# =============================================================================


async def execute_list_tables(db_name: str) -> str:
    """
    List all table names in the database.

    Args:
        db_name: Database connection name

    Returns:
        String result with list of table names
    """
    try:
        from app.db.sqlite import db_manager

        # Get cached metadata
        metadata = await db_manager.get_metadata_for_database(db_name)

        if not metadata:
            return "No tables found in this database."

        # Extract just table names
        tables = []
        for table_info in metadata:
            schema_name = table_info.get("schema_name", "public")
            tbl_name = table_info.get("table_name", "")
            table_type = table_info.get("table_type", "table")
            table_comment = table_info.get("table_comment", "")

            entry = f"{schema_name}.{tbl_name} ({table_type})"
            if table_comment:
                entry += f" - {table_comment}"
            tables.append(entry)

        result_text = f"Found {len(tables)} tables:\n\n"
        result_text += "\n".join(tables)
        return result_text

    except Exception as e:
        logger.exception(f"list_tables error: {e}")
        return f"Error listing tables: {e}"


async def execute_get_table_schema(db_name: str, table_name: str) -> str:
    """
    Get table schema information from the database.

    Args:
        db_name: Database connection name
        table_name: Specific table name

    Returns:
        String result with schema information
    """
    try:
        from app.db.sqlite import db_manager

        if not table_name:
            return "Error: table_name is required"

        # Get cached metadata
        metadata = await db_manager.get_metadata_for_database(db_name)

        if not metadata:
            return "No tables found in this database."

        # Filter by table name
        filtered = []
        for table_info in metadata:
            schema_name = table_info.get("schema_name", "public")
            tbl_name = table_info.get("table_name", "")
            full_name = f"{schema_name}.{tbl_name}"

            if table_name in (tbl_name, full_name):
                filtered.append(table_info)

        if not filtered:
            return f"Table '{table_name}' not found."

        # Format output
        lines = []
        for table_info in filtered:
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
                col_default = col.get("defaultValue", col.get("default_value", ""))
                col_extra = col.get("extra", "")

                nullable_str = "" if is_nullable else " NOT NULL"
                pk_str = " [PK]" if is_pk else ""
                default_str = f" (Default: {col_default})" if col_default else ""
                extra_str = f" (Extra: {col_extra})" if col_extra else ""
                comment_str = f" -- {col_comment}" if col_comment else ""

                lines.append(f"  - {col_name}: {col_type}{nullable_str}{pk_str}{default_str}{extra_str}{comment_str}")

            lines.append("")

        result_text = "\n".join(lines)
        return truncate_output(result_text)

    except Exception as e:
        logger.exception(f"get_table_schema error: {e}")
        return f"Error getting schema: {e}"


async def execute_query_database(db_name: str, sql: str) -> str:
    """
    Execute a read-only SQL query against the database.

    Args:
        db_name: Database connection name
        sql: SQL query to execute

    Returns:
        String result with query output or error
    """
    try:
        if not sql:
            return "Error: sql is required"

        # Get database info
        db = await database_manager.get_database(db_name)
        if not db:
            return f"Error: Database '{db_name}' not found"

        db_type = db.get("db_type", "postgresql")
        dialect = "mysql" if db_type == "mysql" else "postgres"

        # Validate read-only
        try:
            query_service.validate_readonly(sql, dialect)
        except ValueError as e:
            return f"Error: {e}"

        # Execute query
        columns, rows, execution_time_ms = await query_service.execute_query(db_name, sql)

        # Limit rows
        truncated = False
        if len(rows) > MAX_TOOL_RESULT_ROWS:
            rows = rows[:MAX_TOOL_RESULT_ROWS]
            truncated = True

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

        return truncate_output(result_text)

    except Exception as e:
        logger.exception(f"query_database error: {e}")
        return f"Error executing query: {e}"


async def execute_tool(db_name: str, tool_name: str, tool_input: dict[str, Any]) -> str:
    """
    Execute a tool by name.

    Args:
        db_name: Database connection name
        tool_name: Name of the tool to execute
        tool_input: Tool input parameters

    Returns:
        String result from tool execution
    """
    if tool_name == "list_tables":
        return await execute_list_tables(db_name)
    elif tool_name == "get_table_schema":
        return await execute_get_table_schema(db_name, tool_input.get("table_name", ""))
    elif tool_name == "query_database":
        return await execute_query_database(db_name, tool_input.get("sql", ""))
    else:
        return f"Error: Unknown tool '{tool_name}'"


# =============================================================================
# Legacy functions (保持向后兼容，可能被测试使用)
# =============================================================================


async def list_tables(db_name: str) -> dict[str, Any]:
    """Legacy wrapper for execute_list_tables."""
    result = await execute_list_tables(db_name)
    is_error = result.startswith("Error")
    return {
        "content": [{"type": "text", "text": result}],
        "is_error": is_error,
    }


async def get_table_schema(db_name: str, table_name: str | None = None) -> dict[str, Any]:
    """Legacy wrapper for execute_get_table_schema."""
    result = await execute_get_table_schema(db_name, table_name or "")
    is_error = result.startswith("Error") or "not found" in result
    return {
        "content": [{"type": "text", "text": result}],
        "is_error": is_error,
    }


async def query_database(db_name: str, sql: str) -> dict[str, Any]:
    """Legacy wrapper for execute_query_database."""
    result = await execute_query_database(db_name, sql)
    is_error = result.startswith("Error")
    return {
        "content": [{"type": "text", "text": result}],
        "is_error": is_error,
    }

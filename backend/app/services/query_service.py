"""SQL query execution service."""

import asyncio
import time
from typing import Any

import psycopg2
from psycopg2.extensions import connection as PgConnection
import sqlglot
from sqlglot import exp

from app.services.db_manager import database_manager


class QueryService:
    """Service for SQL query parsing and execution."""

    def parse_sql(self, sql: str) -> exp.Expression:
        """
        Parse SQL using sqlglot.

        Args:
            sql: SQL statement to parse

        Returns:
            Parsed SQL expression

        Raises:
            ValueError: If SQL is invalid
        """
        try:
            parsed = sqlglot.parse_one(sql, dialect="postgres")
            return parsed
        except Exception as e:
            raise ValueError(f"SQL syntax error: {e}") from e

    def validate_select_only(self, parsed: exp.Expression) -> None:
        """
        Validate that SQL is a SELECT statement only.

        Args:
            parsed: Parsed SQL expression

        Raises:
            ValueError: If SQL is not a SELECT statement
        """
        if not isinstance(parsed, exp.Select):
            stmt_type = type(parsed).__name__
            raise ValueError(
                f"Only SELECT queries are allowed. Got: {stmt_type}. "
                "INSERT, UPDATE, DELETE, and DDL statements are not permitted."
            )

    def inject_limit(self, sql: str, parsed: exp.Expression) -> tuple[str, bool]:
        """
        Add LIMIT 1000 if no LIMIT clause exists.

        Args:
            sql: Original SQL
            parsed: Parsed SQL expression

        Returns:
            Tuple of (modified SQL, was_truncated)
        """
        # Check if LIMIT already exists
        if parsed.args.get("limit"):
            return sql, False

        # Add LIMIT 1000
        parsed_with_limit = parsed.limit(1000)
        modified_sql = parsed_with_limit.sql(dialect="postgres")
        return modified_sql, True

    async def execute_query(
        self, db_name: str, sql: str
    ) -> tuple[list[str], list[dict[str, Any]], int]:
        """
        Execute SQL query against PostgreSQL database.

        Args:
            db_name: Database name
            sql: SQL query to execute

        Returns:
            Tuple of (column_names, rows, execution_time_ms)

        Raises:
            ValueError: If database not found
            Exception: If query execution fails
        """
        # Get connection URL
        url = await database_manager.get_connection(db_name)

        def _execute() -> tuple[list[str], list[dict[str, Any]], int]:
            """Synchronous query execution."""
            start_time = time.time()
            conn: PgConnection | None = None

            try:
                conn = psycopg2.connect(url)
                cursor = conn.cursor()

                # Execute query
                cursor.execute(sql)

                # Get column names
                columns = [desc[0] for desc in cursor.description] if cursor.description else []

                # Fetch all rows as dicts
                rows = []
                if cursor.description:
                    for row in cursor.fetchall():
                        row_dict = {columns[i]: self._serialize_value(val) for i, val in enumerate(row)}
                        rows.append(row_dict)

                execution_time_ms = int((time.time() - start_time) * 1000)

                return columns, rows, execution_time_ms

            finally:
                if conn:
                    conn.close()

        # Run in thread pool
        return await asyncio.to_thread(_execute)

    def _serialize_value(self, value: Any) -> Any:
        """Convert PostgreSQL types to JSON-serializable types."""
        # Handle None
        if value is None:
            return None

        # Handle dates/times
        if hasattr(value, "isoformat"):
            return value.isoformat()

        # Handle bytes
        if isinstance(value, bytes):
            try:
                return value.decode("utf-8")
            except UnicodeDecodeError:
                return str(value)

        # Handle other types
        return value

    async def execute_validated_query(
        self, db_name: str, sql: str
    ) -> tuple[str, list[str], list[dict[str, Any]], int, bool]:
        """
        Parse, validate, and execute SQL query.

        Args:
            db_name: Database name
            sql: SQL query

        Returns:
            Tuple of (executed_sql, columns, rows, execution_time_ms, truncated)

        Raises:
            ValueError: If SQL is invalid or not a SELECT statement
        """
        # Parse SQL
        parsed = self.parse_sql(sql.strip())

        # Validate SELECT only
        self.validate_select_only(parsed)

        # Inject LIMIT if needed
        final_sql, truncated = self.inject_limit(sql, parsed)

        # Execute query
        columns, rows, execution_time_ms = await self.execute_query(db_name, final_sql)

        return final_sql, columns, rows, execution_time_ms, truncated


# Global instance
query_service = QueryService()


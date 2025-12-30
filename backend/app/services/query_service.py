"""SQL query execution service."""

from typing import Any

import sqlglot
from sqlglot import exp

from app.connectors.factory import ConnectorFactory
from app.services.db_manager import database_manager


class QueryService:
    """Service for SQL query parsing and execution."""

    def parse_sql(self, sql: str, dialect: str = "postgres") -> exp.Expression:
        """
        Parse SQL using sqlglot.

        Args:
            sql: SQL statement to parse
            dialect: SQL dialect (postgres or mysql)

        Returns:
            Parsed SQL expression

        Raises:
            ValueError: If SQL is invalid
        """
        try:
            parsed = sqlglot.parse_one(sql, dialect=dialect)
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

    def validate_readonly(self, sql: str, dialect: str = "postgres") -> None:
        """
        Validate that SQL is a read-only operation.

        Allows SELECT, DESCRIBE, SHOW, EXPLAIN statements.
        Blocks INSERT, UPDATE, DELETE, and DDL statements.

        Args:
            sql: SQL statement to validate
            dialect: SQL dialect (postgres or mysql)

        Raises:
            ValueError: If SQL is not a read-only statement
        """
        sql_upper = sql.strip().upper()

        # Quick check for obviously dangerous statements
        dangerous_prefixes = (
            "INSERT", "UPDATE", "DELETE", "DROP", "CREATE", "ALTER",
            "TRUNCATE", "GRANT", "REVOKE", "COMMIT", "ROLLBACK",
        )
        for prefix in dangerous_prefixes:
            if sql_upper.startswith(prefix):
                raise ValueError(
                    f"Only read-only queries are allowed. Got: {prefix}. "
                    "Data modification and DDL statements are not permitted."
                )

        # Allow DESCRIBE, SHOW, EXPLAIN without parsing
        allowed_prefixes = ("SELECT", "DESCRIBE", "DESC", "SHOW", "EXPLAIN")
        if any(sql_upper.startswith(prefix) for prefix in allowed_prefixes):
            return

        # Try to parse and validate
        try:
            parsed = self.parse_sql(sql, dialect)
            if isinstance(parsed, exp.Select):
                return
            # For other parsed types, reject
            stmt_type = type(parsed).__name__
            raise ValueError(
                f"Only read-only queries are allowed. Got: {stmt_type}. "
                "Data modification and DDL statements are not permitted."
            )
        except ValueError:
            raise
        except Exception:
            # If parsing fails but it looks safe, allow it (for DESCRIBE/SHOW variants)
            pass

    def inject_limit(self, sql: str, parsed: exp.Expression, dialect: str = "postgres") -> tuple[str, bool]:
        """
        Add LIMIT 1000 if no LIMIT clause exists.

        Args:
            sql: Original SQL
            parsed: Parsed SQL expression
            dialect: SQL dialect

        Returns:
            Tuple of (modified SQL, was_truncated)
        """
        # Check if LIMIT already exists
        if parsed.args.get("limit"):
            return sql, False

        # Add LIMIT 1000
        parsed_with_limit = parsed.limit(1000)
        modified_sql = parsed_with_limit.sql(dialect=dialect)
        return modified_sql, True

    async def execute_query(
        self, db_name: str, sql: str
    ) -> tuple[list[str], list[dict[str, Any]], int]:
        """
        Execute SQL query against database.

        Args:
            db_name: Database name
            sql: SQL query to execute

        Returns:
            Tuple of (column_names, rows, execution_time_ms)

        Raises:
            ValueError: If database not found
            Exception: If query execution fails
        """
        # Get database info including ssl_disabled
        db = await database_manager.get_database(db_name)
        if not db:
            raise ValueError(f"Database '{db_name}' not found")

        url = db["url"]
        db_type = db.get("db_type", "postgresql")
        ssl_disabled = bool(db.get("ssl_disabled", 0))

        # Get connector and execute query
        connector = ConnectorFactory.get_connector(url)

        # Pass ssl_disabled for MySQL
        if db_type == "mysql":
            return await connector.execute_query(url, sql, ssl_disabled)
        else:
            return await connector.execute_query(url, sql)

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
        # Get database info including ssl_disabled
        db = await database_manager.get_database(db_name)
        if not db:
            raise ValueError(f"Database '{db_name}' not found")

        url = db["url"]
        db_type = db.get("db_type", "postgresql")
        ssl_disabled = bool(db.get("ssl_disabled", 0))

        connector = ConnectorFactory.get_connector(url)
        dialect = connector.get_dialect()

        # Parse SQL
        parsed = self.parse_sql(sql.strip(), dialect)

        # Validate SELECT only
        self.validate_select_only(parsed)

        # Inject LIMIT if needed
        final_sql, truncated = self.inject_limit(sql, parsed, dialect)

        # Execute query with ssl_disabled for MySQL
        if db_type == "mysql":
            columns, rows, execution_time_ms = await connector.execute_query(url, final_sql, ssl_disabled)
        else:
            columns, rows, execution_time_ms = await connector.execute_query(url, final_sql)

        return final_sql, columns, rows, execution_time_ms, truncated


# Global instance
query_service = QueryService()

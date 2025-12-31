"""MySQL database connector."""

import asyncio
import time
from typing import Any

import mysql.connector
from mysql.connector import MySQLConnection

from app.config import settings
from app.connectors.base import DatabaseConnector
from app.models.metadata import ColumnInfo, TableMetadata


class MySQLConnector(DatabaseConnector):
    """MySQL database connector implementation."""

    def get_dialect(self) -> str:
        """Get sqlglot dialect name."""
        return "mysql"

    def detect_db_type(self, url: str) -> str:
        """Detect database type from URL."""
        if url.startswith("mysql://"):
            return "mysql"
        raise ValueError(f"Unsupported database URL: {url}")

    def _parse_url(self, url: str, tunnel_endpoint: tuple[str, int] | None = None) -> dict[str, Any]:
        """Parse MySQL connection URL.

        Args:
            url: MySQL connection URL
            tunnel_endpoint: Optional (host, port) tuple to use instead of URL host/port

        Returns:
            Dictionary with connection parameters
        """
        from urllib.parse import unquote, urlparse

        parsed = urlparse(url)

        if parsed.scheme != "mysql":
            raise ValueError(f"Expected mysql:// URL, got {parsed.scheme}://")

        # unquote password to handle URL-encoded characters like %40 (@), %23 (#)
        password = unquote(parsed.password) if parsed.password else ""

        # Use tunnel endpoint if provided, otherwise use URL host/port
        if tunnel_endpoint:
            host, port = tunnel_endpoint
        else:
            host = parsed.hostname or "localhost"
            port = parsed.port or 3306

        return {
            "host": host,
            "port": port,
            "user": parsed.username or "",
            "password": password,
            "database": parsed.path[1:] if parsed.path else "",  # Remove leading /
        }

    def _build_connection_params(
        self,
        url: str,
        timeout: int | None = None,
        ssl_disabled: bool = False,
        tunnel_endpoint: tuple[str, int] | None = None,
    ) -> dict[str, Any]:
        """Build MySQL connection parameters.

        Args:
            url: MySQL connection URL
            timeout: Optional connection timeout in seconds
            ssl_disabled: Whether to disable SSL
            tunnel_endpoint: Optional (host, port) tuple if using SSH tunnel

        Returns:
            Dictionary of connection parameters for mysql.connector.connect()
        """
        params = self._parse_url(url, tunnel_endpoint)

        conn_params: dict[str, Any] = {
            "host": params["host"],
            "port": params["port"],
            "user": params["user"],
            "password": params["password"],
            "database": params["database"],
        }

        if timeout is not None:
            conn_params["connection_timeout"] = timeout
        else:
            conn_params["connection_timeout"] = settings.mysql_connect_timeout

        # Disable SSL if requested
        if ssl_disabled:
            conn_params["ssl_disabled"] = True
            # Also disable SSL verification as a fallback for older MySQL connector versions
            conn_params["ssl_verify_cert"] = False
            conn_params["ssl_verify_identity"] = False

        return conn_params

    async def test_connection(
        self, url: str, timeout: int, tunnel_endpoint: tuple[str, int] | None = None
    ) -> None:
        """Test MySQL connection."""

        def _connect() -> MySQLConnection:
            try:
                # Get SSL disabled flag from connection manager (if available)
                # For now, default to False - will be handled by db_manager
                conn_params = self._build_connection_params(
                    url, timeout, ssl_disabled=False, tunnel_endpoint=tunnel_endpoint
                )
                conn = mysql.connector.connect(**conn_params)
                conn.close()
                return conn
            except mysql.connector.Error as e:
                raise ConnectionError(f"Failed to connect to MySQL: {e}") from e
            except Exception as e:
                raise ValueError(f"Invalid MySQL connection URL: {e}") from e

        await asyncio.to_thread(_connect)

    async def fetch_metadata(
        self, url: str, tunnel_endpoint: tuple[str, int] | None = None
    ) -> tuple[list[str], list[TableMetadata]]:
        """Fetch MySQL metadata using INFORMATION_SCHEMA."""

        def _fetch() -> tuple[list[str], list[TableMetadata]]:
            conn: MySQLConnection | None = None

            try:
                # Note: ssl_disabled should be passed from db_manager context
                # For now, default to False
                conn_params = self._build_connection_params(
                    url, ssl_disabled=False, tunnel_endpoint=tunnel_endpoint
                )
                conn = mysql.connector.connect(**conn_params)
                cursor = conn.cursor()

                # Get all databases (schemas)
                cursor.execute(
                    """
                    SELECT SCHEMA_NAME
                    FROM INFORMATION_SCHEMA.SCHEMATA
                    WHERE SCHEMA_NAME NOT IN (
                        'information_schema', 'mysql', 'performance_schema', 'sys'
                    )
                    ORDER BY SCHEMA_NAME
                """
                )
                schemas = [row[0] for row in cursor.fetchall()]

                # Get all tables and views
                cursor.execute(
                    """
                    SELECT
                        TABLE_SCHEMA,
                        TABLE_NAME,
                        TABLE_TYPE,
                        TABLE_COMMENT
                    FROM INFORMATION_SCHEMA.TABLES
                    WHERE TABLE_SCHEMA NOT IN (
                        'information_schema', 'mysql', 'performance_schema', 'sys'
                    )
                    ORDER BY TABLE_SCHEMA, TABLE_NAME
                """
                )
                tables_raw = cursor.fetchall()

                # Get primary key info
                cursor.execute(
                    """
                    SELECT
                        TABLE_SCHEMA,
                        TABLE_NAME,
                        COLUMN_NAME
                    FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_SCHEMA NOT IN (
                        'information_schema', 'mysql', 'performance_schema', 'sys'
                    ) AND COLUMN_KEY = 'PRI'
                """
                )
                pk_columns: dict[str, set[str]] = {}
                for row in cursor.fetchall():
                    key = f"{row[0]}.{row[1]}"
                    if key not in pk_columns:
                        pk_columns[key] = set()
                    pk_columns[key].add(row[2])

                # Get all columns
                cursor.execute(
                    """
                    SELECT
                        TABLE_SCHEMA,
                        TABLE_NAME,
                        COLUMN_NAME,
                        DATA_TYPE,
                                IS_NULLABLE,
                        COLUMN_DEFAULT,
                        COLUMN_KEY,
                        COLUMN_COMMENT
                    FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_SCHEMA NOT IN (
                        'information_schema', 'mysql', 'performance_schema', 'sys'
                    )
                    ORDER BY TABLE_SCHEMA, TABLE_NAME, ORDINAL_POSITION
                """
                )
                columns_raw = cursor.fetchall()

                # Group columns by table
                columns_by_table: dict[str, list[ColumnInfo]] = {}
                for row in columns_raw:
                    key = f"{row[0]}.{row[1]}"
                    if key not in columns_by_table:
                        columns_by_table[key] = []

                    is_pk = key in pk_columns and row[2] in pk_columns[key]

                    columns_by_table[key].append(
                        ColumnInfo(
                            name=row[2],
                            data_type=row[3],
                            is_nullable=row[4] == "YES",
                            is_primary_key=is_pk,
                            default_value=row[5],
                            comment=row[7],
                        )
                    )

                # Build table metadata
                tables: list[TableMetadata] = []
                for row in tables_raw:
                    key = f"{row[0]}.{row[1]}"
                    table_type = "view" if row[2] == "VIEW" else "table"

                    tables.append(
                        TableMetadata(
                            schema_name=row[0],
                            table_name=row[1],
                            table_type=table_type,
                            columns=columns_by_table.get(key, []),
                            comment=row[3] if row[3] else None,
                        )
                    )

                return schemas, tables

            finally:
                if conn:
                    conn.close()

        return await asyncio.to_thread(_fetch)

    async def execute_query(
        self, url: str, sql: str, tunnel_endpoint: tuple[str, int] | None = None
    ) -> tuple[list[str], list[dict[str, Any]], int]:
        """Execute MySQL query."""

        def _execute() -> tuple[list[str], list[dict[str, Any]], int]:
            start_time = time.time()
            conn: MySQLConnection | None = None

            try:
                # Note: ssl_disabled should be passed from db_manager context
                # For now, default to False
                conn_params = self._build_connection_params(
                    url, ssl_disabled=False, tunnel_endpoint=tunnel_endpoint
                )
                conn = mysql.connector.connect(**conn_params)
                cursor = conn.cursor(dictionary=True)

                cursor.execute(sql)

                columns = [desc[0] for desc in cursor.description] if cursor.description else []

                rows = cursor.fetchall()

                # Serialize rows
                serialized_rows = [self._serialize_row(row) for row in rows]

                execution_time_ms = int((time.time() - start_time) * 1000)

                return columns, serialized_rows, execution_time_ms

            finally:
                if conn:
                    conn.close()

        return await asyncio.to_thread(_execute)

    def _serialize_row(self, row: dict[str, Any]) -> dict[str, Any]:
        """Serialize a row from MySQL."""
        result = {}
        for key, value in row.items():
            result[key] = self._serialize_value(value)
        return result

    def _serialize_value(self, value: Any) -> Any:
        """Convert MySQL types to JSON-serializable types."""
        if value is None:
            return None

        if hasattr(value, "isoformat"):
            return value.isoformat()

        if isinstance(value, bytes):
            try:
                return value.decode("utf-8")
            except UnicodeDecodeError:
                return str(value)

        return value

"""PostgreSQL database connector."""

import asyncio
import time
from typing import Any
from urllib.parse import ParseResult, parse_qs, urlparse, urlunparse

import psycopg2
from psycopg2.extensions import connection as PgConnection

from app.connectors.base import DatabaseConnector
from app.models.metadata import ColumnInfo, TableMetadata


class PostgreSQLConnector(DatabaseConnector):
    """PostgreSQL database connector implementation."""

    def get_dialect(self) -> str:
        """Get sqlglot dialect name."""
        return "postgres"

    def detect_db_type(self, url: str) -> str:
        """Detect database type from URL."""
        if url.startswith("postgresql://") or url.startswith("postgres://"):
            return "postgresql"
        raise ValueError(f"Unsupported database URL: {url}")

    def _rewrite_url_for_tunnel(self, url: str, tunnel_endpoint: tuple[str, int]) -> str:
        """Rewrite database URL to use SSH tunnel endpoint.

        Args:
            url: Original database connection URL
            tunnel_endpoint: (host, port) tuple of local tunnel endpoint

        Returns:
            Modified URL pointing to tunnel endpoint
        """
        parsed = urlparse(url)
        # Replace host and port with tunnel endpoint
        netloc_parts = parsed.netloc.split("@")
        if len(netloc_parts) == 2:
            # Has credentials: user:pass@host:port
            credentials, _ = netloc_parts
            new_netloc = f"{credentials}@{tunnel_endpoint[0]}:{tunnel_endpoint[1]}"
        else:
            # No credentials: host:port
            new_netloc = f"{tunnel_endpoint[0]}:{tunnel_endpoint[1]}"

        new_parsed = ParseResult(
            scheme=parsed.scheme,
            netloc=new_netloc,
            path=parsed.path,
            params=parsed.params,
            query=parsed.query,
            fragment=parsed.fragment,
        )
        return urlunparse(new_parsed)

    async def test_connection(
        self, url: str, timeout: int, tunnel_endpoint: tuple[str, int] | None = None
    ) -> None:
        """Test PostgreSQL connection."""
        # Use tunnel endpoint if provided
        connection_url = (
            self._rewrite_url_for_tunnel(url, tunnel_endpoint) if tunnel_endpoint else url
        )

        def _connect() -> PgConnection:
            try:
                conn = psycopg2.connect(connection_url, connect_timeout=timeout)
                conn.close()
                return conn
            except psycopg2.OperationalError as e:
                raise ConnectionError(f"Failed to connect to PostgreSQL: {e}") from e
            except Exception as e:
                raise ValueError(f"Invalid PostgreSQL connection URL: {e}") from e

        await asyncio.to_thread(_connect)

    async def fetch_metadata(
        self, url: str, tunnel_endpoint: tuple[str, int] | None = None
    ) -> tuple[list[str], list[TableMetadata]]:
        """Fetch PostgreSQL metadata."""
        # Use tunnel endpoint if provided
        connection_url = (
            self._rewrite_url_for_tunnel(url, tunnel_endpoint) if tunnel_endpoint else url
        )

        def _fetch() -> tuple[list[str], list[TableMetadata]]:
            conn: PgConnection | None = None

            try:
                conn = psycopg2.connect(connection_url)
                cursor = conn.cursor()

                # Get all schemas
                cursor.execute(
                    """
                    SELECT schema_name
                    FROM information_schema.schemata
                    WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
                    ORDER BY schema_name
                """
                )
                schemas = [row[0] for row in cursor.fetchall()]

                # Get all tables and views
                cursor.execute(
                    """
                    SELECT
                        t.table_schema,
                        t.table_name,
                        t.table_type,
                        obj_description(
                            (t.table_schema || '.' || t.table_name)::regclass, 'pg_class'
                        ) as table_comment
                    FROM information_schema.tables t
                    WHERE t.table_schema NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
                    ORDER BY t.table_schema, t.table_name
                """
                )
                tables_raw = cursor.fetchall()

                # Get primary key info
                cursor.execute(
                    """
                    SELECT
                        tc.table_schema,
                        tc.table_name,
                        kcu.column_name
                    FROM information_schema.table_constraints tc
                    JOIN information_schema.key_column_usage kcu
                        ON tc.constraint_name = kcu.constraint_name
                        AND tc.table_schema = kcu.table_schema
                    WHERE tc.constraint_type = 'PRIMARY KEY'
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
                        c.table_schema,
                        c.table_name,
                        c.column_name,
                        c.data_type,
                        c.is_nullable,
                        c.column_default,
                        col_description(
                            (c.table_schema || '.' || c.table_name)::regclass,
                            c.ordinal_position
                        ) as column_comment
                    FROM information_schema.columns c
                    WHERE c.table_schema NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
                    ORDER BY c.table_schema, c.table_name, c.ordinal_position
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
                            comment=row[6],
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
                            comment=row[3],
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
        """Execute PostgreSQL query."""
        # Use tunnel endpoint if provided
        connection_url = (
            self._rewrite_url_for_tunnel(url, tunnel_endpoint) if tunnel_endpoint else url
        )

        def _execute() -> tuple[list[str], list[dict[str, Any]], int]:
            start_time = time.time()
            conn: PgConnection | None = None

            try:
                conn = psycopg2.connect(connection_url)
                cursor = conn.cursor()

                cursor.execute(sql)

                columns = (
                    [desc[0] for desc in cursor.description] if cursor.description else []
                )

                rows = []
                if cursor.description:
                    for row in cursor.fetchall():
                        row_dict = {
                            columns[i]: self._serialize_value(val)
                            for i, val in enumerate(row)
                        }
                        rows.append(row_dict)

                execution_time_ms = int((time.time() - start_time) * 1000)

                return columns, rows, execution_time_ms

            finally:
                if conn:
                    conn.close()

        return await asyncio.to_thread(_execute)

    def _serialize_value(self, value: Any) -> Any:
        """Convert PostgreSQL types to JSON-serializable types."""
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

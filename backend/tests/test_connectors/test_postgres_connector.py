"""Unit tests for PostgreSQL connector."""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from datetime import datetime, date
from decimal import Decimal

from app.connectors.postgres import PostgreSQLConnector
from app.connectors.factory import ConnectorFactory


class TestPostgreSQLConnector:
    """Test suite for PostgreSQLConnector."""

    @pytest.fixture
    def connector(self):
        """Create a PostgreSQLConnector instance."""
        return PostgreSQLConnector()

    def test_get_dialect(self, connector):
        """Test get_dialect returns 'postgres'."""
        assert connector.get_dialect() == "postgres"

    def test_detect_db_type_postgresql(self, connector):
        """Test detect_db_type with postgresql:// URL."""
        assert connector.detect_db_type("postgresql://localhost/testdb") == "postgresql"
        assert connector.detect_db_type("postgresql://user:pass@host:5432/db") == "postgresql"

    def test_detect_db_type_postgres(self, connector):
        """Test detect_db_type with postgres:// URL (alias)."""
        assert connector.detect_db_type("postgres://localhost/testdb") == "postgresql"
        assert connector.detect_db_type("postgres://user:pass@host:5432/db") == "postgresql"

    def test_detect_db_type_invalid(self, connector):
        """Test detect_db_type with invalid URL."""
        with pytest.raises(ValueError, match="Unsupported database URL"):
            connector.detect_db_type("mysql://localhost/testdb")

    @pytest.mark.asyncio
    async def test_test_connection_success(self, connector):
        """Test successful connection test."""
        with patch("app.connectors.postgres.psycopg2.connect") as mock_connect:
            mock_conn = MagicMock()
            mock_connect.return_value = mock_conn

            await connector.test_connection("postgresql://localhost/testdb", timeout=10)

            mock_connect.assert_called_once_with(
                "postgresql://localhost/testdb",
                connect_timeout=10
            )
            mock_conn.close.assert_called_once()

    @pytest.mark.asyncio
    async def test_test_connection_operational_error(self, connector):
        """Test connection test with operational error."""
        import psycopg2

        with patch("app.connectors.postgres.psycopg2.connect") as mock_connect:
            mock_connect.side_effect = psycopg2.OperationalError("Connection refused")

            with pytest.raises(ConnectionError, match="Failed to connect to PostgreSQL"):
                await connector.test_connection("postgresql://localhost/testdb", timeout=10)

    @pytest.mark.asyncio
    async def test_test_connection_invalid_url(self, connector):
        """Test connection test with invalid URL."""
        with patch("app.connectors.postgres.psycopg2.connect") as mock_connect:
            mock_connect.side_effect = Exception("Invalid URL format")

            with pytest.raises(ValueError, match="Invalid PostgreSQL connection URL"):
                await connector.test_connection("postgresql://invalid", timeout=10)

    def test_serialize_value_none(self, connector):
        """Test serializing None value."""
        assert connector._serialize_value(None) is None

    def test_serialize_value_datetime(self, connector):
        """Test serializing datetime value."""
        dt = datetime(2024, 1, 15, 10, 30, 0)
        result = connector._serialize_value(dt)
        assert result == "2024-01-15T10:30:00"

    def test_serialize_value_date(self, connector):
        """Test serializing date value."""
        d = date(2024, 1, 15)
        result = connector._serialize_value(d)
        assert result == "2024-01-15"

    def test_serialize_value_bytes_utf8(self, connector):
        """Test serializing UTF-8 bytes."""
        data = b"hello world"
        result = connector._serialize_value(data)
        assert result == "hello world"

    def test_serialize_value_bytes_non_utf8(self, connector):
        """Test serializing non-UTF-8 bytes."""
        data = b"\x80\x81\x82"
        result = connector._serialize_value(data)
        assert isinstance(result, str)

    def test_serialize_value_regular(self, connector):
        """Test serializing regular values."""
        assert connector._serialize_value(42) == 42
        assert connector._serialize_value("hello") == "hello"
        assert connector._serialize_value(3.14) == 3.14
        assert connector._serialize_value(True) is True

    @pytest.mark.asyncio
    async def test_execute_query_success(self, connector):
        """Test successful query execution."""
        mock_cursor = MagicMock()
        mock_cursor.description = [("id",), ("name",)]
        mock_cursor.fetchall.return_value = [(1, "Alice"), (2, "Bob")]

        mock_conn = MagicMock()
        mock_conn.cursor.return_value = mock_cursor

        with patch("app.connectors.postgres.psycopg2.connect") as mock_connect:
            mock_connect.return_value = mock_conn

            columns, rows, exec_time = await connector.execute_query(
                "postgresql://localhost/testdb",
                "SELECT id, name FROM users"
            )

            assert columns == ["id", "name"]
            assert len(rows) == 2
            assert rows[0]["id"] == 1
            assert rows[0]["name"] == "Alice"
            assert rows[1]["id"] == 2
            assert rows[1]["name"] == "Bob"
            assert isinstance(exec_time, int)
            assert exec_time >= 0

            mock_conn.close.assert_called_once()

    @pytest.mark.asyncio
    async def test_execute_query_empty_result(self, connector):
        """Test query with empty result."""
        mock_cursor = MagicMock()
        mock_cursor.description = [("id",), ("name",)]
        mock_cursor.fetchall.return_value = []

        mock_conn = MagicMock()
        mock_conn.cursor.return_value = mock_cursor

        with patch("app.connectors.postgres.psycopg2.connect") as mock_connect:
            mock_connect.return_value = mock_conn

            columns, rows, exec_time = await connector.execute_query(
                "postgresql://localhost/testdb",
                "SELECT id, name FROM users WHERE 1=0"
            )

            assert columns == ["id", "name"]
            assert rows == []
            mock_conn.close.assert_called_once()

    @pytest.mark.asyncio
    async def test_execute_query_no_description(self, connector):
        """Test query with no description (e.g., DDL statements)."""
        mock_cursor = MagicMock()
        mock_cursor.description = None

        mock_conn = MagicMock()
        mock_conn.cursor.return_value = mock_cursor

        with patch("app.connectors.postgres.psycopg2.connect") as mock_connect:
            mock_connect.return_value = mock_conn

            columns, rows, exec_time = await connector.execute_query(
                "postgresql://localhost/testdb",
                "SELECT 1"
            )

            assert columns == []
            assert rows == []

    @pytest.mark.asyncio
    async def test_fetch_metadata_success(self, connector):
        """Test successful metadata fetch."""
        mock_cursor = MagicMock()

        # Mock schema query
        schemas_result = [("public",), ("analytics",)]

        # Mock tables query
        tables_result = [
            ("public", "users", "BASE TABLE", "User accounts"),
            ("public", "orders", "BASE TABLE", None),
            ("analytics", "metrics", "VIEW", "Metrics view"),
        ]

        # Mock primary key query
        pk_result = [
            ("public", "users", "id"),
            ("public", "orders", "id"),
        ]

        # Mock columns query
        columns_result = [
            ("public", "users", "id", "integer", "NO", None, "User ID"),
            ("public", "users", "name", "varchar", "YES", None, None),
            ("public", "orders", "id", "integer", "NO", None, None),
            ("public", "orders", "user_id", "integer", "YES", None, None),
            ("analytics", "metrics", "count", "bigint", "YES", None, None),
        ]

        # Setup cursor to return different results for each query
        mock_cursor.fetchall.side_effect = [
            schemas_result,
            tables_result,
            pk_result,
            columns_result,
        ]

        mock_conn = MagicMock()
        mock_conn.cursor.return_value = mock_cursor

        with patch("app.connectors.postgres.psycopg2.connect") as mock_connect:
            mock_connect.return_value = mock_conn

            schemas, tables = await connector.fetch_metadata(
                "postgresql://localhost/testdb"
            )

            # Verify schemas
            assert "public" in schemas
            assert "analytics" in schemas

            # Verify tables
            assert len(tables) == 3

            # Find users table
            users_table = next(t for t in tables if t.table_name == "users")
            assert users_table.schema_name == "public"
            assert users_table.table_type == "table"
            assert users_table.comment == "User accounts"
            assert len(users_table.columns) == 2

            # Verify primary key detection
            id_col = next(c for c in users_table.columns if c.name == "id")
            assert id_col.is_primary_key is True
            assert id_col.is_nullable is False
            assert id_col.comment == "User ID"

            name_col = next(c for c in users_table.columns if c.name == "name")
            assert name_col.is_primary_key is False
            assert name_col.is_nullable is True

            # Verify view
            metrics_table = next(t for t in tables if t.table_name == "metrics")
            assert metrics_table.table_type == "view"

            mock_conn.close.assert_called_once()


class TestConnectorFactoryPostgres:
    """Test ConnectorFactory with PostgreSQL URLs."""

    def test_get_connector_postgresql(self):
        """Get connector for postgresql:// URL."""
        connector = ConnectorFactory.get_connector("postgresql://localhost/testdb")
        assert isinstance(connector, PostgreSQLConnector)
        assert connector.get_dialect() == "postgres"

    def test_get_connector_postgres_alias(self):
        """Get connector for postgres:// URL (alias)."""
        connector = ConnectorFactory.get_connector("postgres://localhost/testdb")
        assert isinstance(connector, PostgreSQLConnector)

    def test_detect_db_type_postgresql(self):
        """Test detecting PostgreSQL from URL."""
        assert ConnectorFactory.detect_db_type("postgresql://host/db") == "postgresql"
        assert ConnectorFactory.detect_db_type("postgres://host/db") == "postgresql"

    def test_get_connector_with_full_url(self):
        """Test connector creation with full connection URL."""
        url = "postgresql://user:password@localhost:5432/mydb?sslmode=require"
        connector = ConnectorFactory.get_connector(url)
        assert isinstance(connector, PostgreSQLConnector)


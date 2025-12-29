"""Unit tests for MySQL connector."""

import pytest
from unittest.mock import patch, MagicMock
from datetime import datetime, date
from decimal import Decimal

from app.connectors.mysql import MySQLConnector
from app.connectors.factory import ConnectorFactory


class TestMySQLConnector:
    """Test suite for MySQLConnector."""

    @pytest.fixture
    def connector(self):
        """Create a MySQLConnector instance."""
        return MySQLConnector()

    def test_get_dialect(self, connector):
        """Test get_dialect returns 'mysql'."""
        assert connector.get_dialect() == "mysql"

    def test_detect_db_type_valid(self, connector):
        """Test detect_db_type with valid MySQL URL."""
        assert connector.detect_db_type("mysql://localhost/testdb") == "mysql"
        assert connector.detect_db_type("mysql://user:pass@host:3306/db") == "mysql"

    def test_detect_db_type_invalid(self, connector):
        """Test detect_db_type with invalid URL."""
        with pytest.raises(ValueError, match="Unsupported database URL"):
            connector.detect_db_type("postgresql://localhost/testdb")

    def test_parse_url_basic(self, connector):
        """Test parsing basic MySQL URL."""
        result = connector._parse_url("mysql://localhost/testdb")

        assert result["host"] == "localhost"
        assert result["port"] == 3306
        assert result["user"] == ""
        assert result["password"] == ""
        assert result["database"] == "testdb"

    def test_parse_url_with_credentials(self, connector):
        """Test parsing MySQL URL with credentials."""
        result = connector._parse_url("mysql://user:password@host:3306/mydb")

        assert result["host"] == "host"
        assert result["port"] == 3306
        assert result["user"] == "user"
        assert result["password"] == "password"
        assert result["database"] == "mydb"

    def test_parse_url_default_port(self, connector):
        """Test parsing MySQL URL with default port."""
        result = connector._parse_url("mysql://localhost/mydb")

        assert result["host"] == "localhost"
        assert result["port"] == 3306

    def test_parse_url_invalid_scheme(self, connector):
        """Test parsing invalid URL scheme."""
        with pytest.raises(ValueError):
            connector._parse_url("postgresql://localhost/testdb")

    def test_parse_url_with_encoded_password(self, connector):
        """Test parsing MySQL URL with URL-encoded password."""
        # Password contains @ symbol encoded as %40
        result = connector._parse_url("mysql://user:p%40ss@host:3306/mydb")

        assert result["user"] == "user"
        assert result["password"] == "p@ss"  # Should be decoded

    def test_parse_url_with_special_chars_in_password(self, connector):
        """Test parsing MySQL URL with special characters in password."""
        # Password contains # encoded as %23
        result = connector._parse_url("mysql://user:p%23ssword@host/mydb")

        assert result["password"] == "p#ssword"

    @pytest.mark.asyncio
    async def test_test_connection_success(self, connector):
        """Test successful connection test."""
        with patch("app.connectors.mysql.mysql.connector.connect") as mock_connect:
            mock_conn = MagicMock()
            mock_connect.return_value = mock_conn

            await connector.test_connection("mysql://localhost/testdb", timeout=10)

            mock_connect.assert_called_once()
            mock_conn.close.assert_called_once()

    @pytest.mark.asyncio
    async def test_test_connection_with_ssl_disabled(self, connector):
        """Test connection test with SSL disabled."""
        with patch("app.connectors.mysql.mysql.connector.connect") as mock_connect:
            mock_conn = MagicMock()
            mock_connect.return_value = mock_conn

            await connector.test_connection("mysql://localhost/testdb", timeout=10, ssl_disabled=True)

            call_kwargs = mock_connect.call_args[1]
            assert call_kwargs.get("ssl_disabled") is True
            assert call_kwargs.get("ssl_verify_cert") is False
            mock_conn.close.assert_called_once()

    @pytest.mark.asyncio
    async def test_test_connection_failure(self, connector):
        """Test connection test failure."""
        import mysql.connector

        with patch("app.connectors.mysql.mysql.connector.connect") as mock_connect:
            mock_connect.side_effect = mysql.connector.Error("Connection refused")

            with pytest.raises(ConnectionError, match="Failed to connect to MySQL"):
                await connector.test_connection("mysql://localhost/testdb", timeout=10)

    @pytest.mark.asyncio
    async def test_test_connection_invalid_url(self, connector):
        """Test connection test with invalid URL."""
        with pytest.raises(ValueError, match="Invalid MySQL connection URL"):
            await connector.test_connection("postgresql://localhost/testdb", timeout=10)

    # Serialization tests
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

    def test_serialize_row(self, connector):
        """Test serializing a row dictionary."""
        row = {
            "id": 1,
            "name": "Alice",
            "created_at": datetime(2024, 1, 15, 10, 30, 0),
            "data": b"binary",
        }
        result = connector._serialize_row(row)
        
        assert result["id"] == 1
        assert result["name"] == "Alice"
        assert result["created_at"] == "2024-01-15T10:30:00"
        assert result["data"] == "binary"

    # Query execution tests
    @pytest.mark.asyncio
    async def test_execute_query_success(self, connector):
        """Test successful query execution."""
        mock_cursor = MagicMock()
        mock_cursor.description = [("id",), ("name",)]
        mock_cursor.fetchall.return_value = [
            {"id": 1, "name": "Alice"},
            {"id": 2, "name": "Bob"},
        ]

        mock_conn = MagicMock()
        mock_conn.cursor.return_value = mock_cursor

        with patch("app.connectors.mysql.mysql.connector.connect") as mock_connect:
            mock_connect.return_value = mock_conn

            columns, rows, exec_time = await connector.execute_query(
                "mysql://localhost/testdb",
                "SELECT id, name FROM users"
            )

            assert columns == ["id", "name"]
            assert len(rows) == 2
            assert rows[0]["id"] == 1
            assert rows[0]["name"] == "Alice"
            assert isinstance(exec_time, int)
            assert exec_time >= 0
            mock_conn.close.assert_called_once()

    @pytest.mark.asyncio
    async def test_execute_query_with_ssl_disabled(self, connector):
        """Test query execution with SSL disabled."""
        mock_cursor = MagicMock()
        mock_cursor.description = [("id",)]
        mock_cursor.fetchall.return_value = [{"id": 1}]

        mock_conn = MagicMock()
        mock_conn.cursor.return_value = mock_cursor

        with patch("app.connectors.mysql.mysql.connector.connect") as mock_connect:
            mock_connect.return_value = mock_conn

            await connector.execute_query(
                "mysql://localhost/testdb",
                "SELECT 1",
                ssl_disabled=True
            )

            call_kwargs = mock_connect.call_args[1]
            assert call_kwargs.get("ssl_disabled") is True

    @pytest.mark.asyncio
    async def test_execute_query_empty_result(self, connector):
        """Test query with empty result."""
        mock_cursor = MagicMock()
        mock_cursor.description = [("id",), ("name",)]
        mock_cursor.fetchall.return_value = []

        mock_conn = MagicMock()
        mock_conn.cursor.return_value = mock_cursor

        with patch("app.connectors.mysql.mysql.connector.connect") as mock_connect:
            mock_connect.return_value = mock_conn

            columns, rows, exec_time = await connector.execute_query(
                "mysql://localhost/testdb",
                "SELECT id, name FROM users WHERE 1=0"
            )

            assert columns == ["id", "name"]
            assert rows == []
            mock_conn.close.assert_called_once()

    @pytest.mark.asyncio
    async def test_execute_query_no_description(self, connector):
        """Test query with no description."""
        mock_cursor = MagicMock()
        mock_cursor.description = None

        mock_conn = MagicMock()
        mock_conn.cursor.return_value = mock_cursor

        with patch("app.connectors.mysql.mysql.connector.connect") as mock_connect:
            mock_connect.return_value = mock_conn

            columns, rows, exec_time = await connector.execute_query(
                "mysql://localhost/testdb",
                "SELECT 1"
            )

            assert columns == []
            assert rows == []

    # Metadata fetch tests
    @pytest.mark.asyncio
    async def test_fetch_metadata_success(self, connector):
        """Test successful metadata fetch."""
        mock_cursor = MagicMock()

        # Mock schema query
        schemas_result = [("testdb",), ("analytics",)]

        # Mock tables query
        tables_result = [
            ("testdb", "users", "BASE TABLE", "User accounts"),
            ("testdb", "orders", "BASE TABLE", ""),
            ("analytics", "metrics", "VIEW", "Metrics view"),
        ]

        # Mock primary key query
        pk_result = [
            ("testdb", "users", "id"),
            ("testdb", "orders", "id"),
        ]

        # Mock columns query
        columns_result = [
            ("testdb", "users", "id", "int", "NO", None, "PRI", "User ID"),
            ("testdb", "users", "name", "varchar", "YES", None, "", ""),
            ("testdb", "orders", "id", "int", "NO", None, "PRI", ""),
            ("testdb", "orders", "user_id", "int", "YES", None, "", ""),
            ("analytics", "metrics", "count", "bigint", "YES", None, "", ""),
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

        with patch("app.connectors.mysql.mysql.connector.connect") as mock_connect:
            mock_connect.return_value = mock_conn

            schemas, tables = await connector.fetch_metadata(
                "mysql://localhost/testdb"
            )

            # Verify schemas
            assert "testdb" in schemas
            assert "analytics" in schemas

            # Verify tables
            assert len(tables) == 3

            # Find users table
            users_table = next(t for t in tables if t.table_name == "users")
            assert users_table.schema_name == "testdb"
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

    @pytest.mark.asyncio
    async def test_fetch_metadata_with_ssl_disabled(self, connector):
        """Test metadata fetch with SSL disabled."""
        mock_cursor = MagicMock()
        mock_cursor.fetchall.side_effect = [[], [], [], []]

        mock_conn = MagicMock()
        mock_conn.cursor.return_value = mock_cursor

        with patch("app.connectors.mysql.mysql.connector.connect") as mock_connect:
            mock_connect.return_value = mock_conn

            await connector.fetch_metadata(
                "mysql://localhost/testdb",
                ssl_disabled=True
            )

            call_kwargs = mock_connect.call_args[1]
            assert call_kwargs.get("ssl_disabled") is True

    @pytest.mark.asyncio
    async def test_fetch_metadata_empty_table_comment(self, connector):
        """Test metadata fetch with empty table comments."""
        mock_cursor = MagicMock()

        schemas_result = [("testdb",)]
        tables_result = [
            ("testdb", "users", "BASE TABLE", ""),  # Empty comment
            ("testdb", "orders", "BASE TABLE", None),  # None comment
        ]
        pk_result = []
        columns_result = []

        mock_cursor.fetchall.side_effect = [
            schemas_result,
            tables_result,
            pk_result,
            columns_result,
        ]

        mock_conn = MagicMock()
        mock_conn.cursor.return_value = mock_cursor

        with patch("app.connectors.mysql.mysql.connector.connect") as mock_connect:
            mock_connect.return_value = mock_conn

            schemas, tables = await connector.fetch_metadata(
                "mysql://localhost/testdb"
            )

            users_table = next(t for t in tables if t.table_name == "users")
            orders_table = next(t for t in tables if t.table_name == "orders")

            # Empty string should become None, None should stay None
            assert users_table.comment is None
            assert orders_table.comment is None


class TestConnectorFactory:
    """Test suite for ConnectorFactory."""

    def test_detect_db_type_postgresql(self):
        """Test detecting PostgreSQL URL."""
        assert ConnectorFactory.detect_db_type("postgresql://localhost/testdb") == "postgresql"
        assert ConnectorFactory.detect_db_type("postgres://localhost/testdb") == "postgresql"

    def test_detect_db_type_mysql(self):
        """Test detecting MySQL URL."""
        assert ConnectorFactory.detect_db_type("mysql://localhost/testdb") == "mysql"

    def test_detect_db_type_invalid(self):
        """Test detecting invalid URL."""
        with pytest.raises(ValueError, match="Unsupported database URL scheme"):
            ConnectorFactory.detect_db_type("sqlite:///test.db")

    def test_get_connector_postgresql(self):
        """Get PostgreSQL connector."""
        connector = ConnectorFactory.get_connector("postgresql://localhost/testdb")
        from app.connectors.postgres import PostgreSQLConnector
        assert isinstance(connector, PostgreSQLConnector)

    def test_get_connector_mysql(self):
        """Get MySQL connector."""
        connector = ConnectorFactory.get_connector("mysql://localhost/testdb")
        assert isinstance(connector, MySQLConnector)
        assert connector.get_dialect() == "mysql"

    def test_get_connector_invalid(self):
        """Get connector for invalid URL."""
        with pytest.raises(ValueError):
            ConnectorFactory.get_connector("sqlite:///test.db")

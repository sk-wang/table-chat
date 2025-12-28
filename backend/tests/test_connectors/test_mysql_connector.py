"""Unit tests for MySQL connector."""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock

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

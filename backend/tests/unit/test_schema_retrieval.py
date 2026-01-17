"""Unit tests for schema retrieval enhancements (extra field)."""

import pytest
from unittest.mock import MagicMock, patch
from app.connectors.postgres import PostgreSQLConnector
from app.connectors.mysql import MySQLConnector
from app.models.metadata import ColumnInfo

class TestSchemaRetrievalExtra:
    """Test suite for 'extra' field extraction in schema retrieval."""

    @pytest.mark.asyncio
    async def test_postgres_extra_identity(self):
        """Test PostgreSQL connector extracts identity info into 'extra' field."""
        connector = PostgreSQLConnector()
        mock_cursor = MagicMock()

        schemas_result = [("public",)]
        tables_result = [("public", "users", "BASE TABLE", "User table")]
        pk_result = [("public", "users", "id")]

        columns_result = [
            ("public", "users", "id", "integer", "NO", "nextval", "ID col", "ALWAYS"),
            ("public", "users", "name", "varchar", "YES", None, None, None),
        ]

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

            try:
                schemas, tables = await connector.fetch_metadata("postgresql://localhost/testdb")
                
                users_table = next(t for t in tables if t.table_name == "users")
                id_col = next(c for c in users_table.columns if c.name == "id")
                name_col = next(c for c in users_table.columns if c.name == "name")

                assert id_col.extra == "generated always as identity" or id_col.extra == "ALWAYS"
                assert name_col.extra is None
                
            except (ValueError, IndexError, TypeError):
                pytest.fail("Connector failed to handle extra column or populate extra field")

    @pytest.mark.asyncio
    async def test_mysql_extra_field(self):
        """Test MySQL connector extracts EXTRA column info."""
        connector = MySQLConnector()
        mock_cursor = MagicMock()

        schemas_result = [("db1",)]
        tables_result = [("db1", "users", "BASE TABLE", "User table")]
        pk_result = [("db1", "users", "id")]

        columns_result = [
            ("db1", "users", "id", "int", "NO", None, "PRI", "ID col", "auto_increment"),
            ("db1", "users", "name", "varchar", "YES", None, "", None, ""),
        ]

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
            
            try:
                schemas, tables = await connector.fetch_metadata("mysql://root:pass@localhost/db1")
                
                users_table = next(t for t in tables if t.table_name == "users")
                id_col = next(c for c in users_table.columns if c.name == "id")
                
                assert id_col.extra == "auto_increment"
                
            except (ValueError, IndexError, TypeError):
                pytest.fail("Connector failed to handle extra column")


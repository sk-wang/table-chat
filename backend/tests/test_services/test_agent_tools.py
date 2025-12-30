"""Unit tests for Agent tools security validation."""

from unittest.mock import AsyncMock, patch

import pytest

from app.services.agent_tools import (
    AGENT_TOOLS,
    MAX_OUTPUT_SIZE,
    MAX_TOOL_RESULT_ROWS,
    get_table_schema,
    query_database,
    truncate_output,
)


class TestTruncateOutput:
    """Test suite for output truncation."""

    def test_truncate_output_short_text(self):
        """Test that short text is not truncated."""
        text = "Hello, World!"
        result = truncate_output(text)
        assert result == text
        assert "truncated" not in result

    def test_truncate_output_at_limit(self):
        """Test text at exact limit."""
        text = "a" * MAX_OUTPUT_SIZE
        result = truncate_output(text)
        assert result == text
        assert "truncated" not in result

    def test_truncate_output_exceeds_limit(self):
        """Test text exceeding limit is truncated."""
        text = "a" * (MAX_OUTPUT_SIZE + 100)
        result = truncate_output(text)
        assert len(result) < len(text)
        assert "truncated" in result
        assert f"total {len(text)} chars" in result


class TestQueryDatabase:
    """Test suite for query_database tool."""

    @pytest.mark.asyncio
    async def test_query_database_not_found(self):
        """Test query on non-existent database."""
        with patch("app.services.agent_tools.database_manager") as mock_mgr:
            mock_mgr.get_database = AsyncMock(return_value=None)
            
            result = await query_database("nonexistent", "SELECT 1")
            
            assert result["is_error"] is True
            assert "not found" in result["content"][0]["text"]

    @pytest.mark.asyncio
    async def test_query_database_select_allowed(self):
        """Test SELECT query is allowed."""
        with patch("app.services.agent_tools.database_manager") as mock_mgr, \
             patch("app.services.agent_tools.query_service") as mock_qs:
            mock_mgr.get_database = AsyncMock(return_value={
                "url": "postgresql://localhost/test",
                "db_type": "postgresql"
            })
            mock_qs.validate_readonly = lambda sql, dialect: None
            mock_qs.execute_query = AsyncMock(return_value=(
                ["id", "name"],
                [{"id": 1, "name": "Alice"}, {"id": 2, "name": "Bob"}],
                10
            ))
            
            result = await query_database("testdb", "SELECT * FROM users")
            
            assert result["is_error"] is False
            assert "Alice" in result["content"][0]["text"]
            assert "Bob" in result["content"][0]["text"]

    @pytest.mark.asyncio
    async def test_query_database_describe_allowed(self):
        """Test DESCRIBE query is allowed."""
        with patch("app.services.agent_tools.database_manager") as mock_mgr, \
             patch("app.services.agent_tools.query_service") as mock_qs:
            mock_mgr.get_database = AsyncMock(return_value={
                "url": "mysql://localhost/test",
                "db_type": "mysql"
            })
            mock_qs.validate_readonly = lambda sql, dialect: None
            mock_qs.execute_query = AsyncMock(return_value=(
                ["Field", "Type"],
                [{"Field": "id", "Type": "int"}],
                5
            ))
            
            result = await query_database("testdb", "DESCRIBE users")
            
            assert result["is_error"] is False

    @pytest.mark.asyncio
    async def test_query_database_show_allowed(self):
        """Test SHOW query is allowed."""
        with patch("app.services.agent_tools.database_manager") as mock_mgr, \
             patch("app.services.agent_tools.query_service") as mock_qs:
            mock_mgr.get_database = AsyncMock(return_value={
                "url": "mysql://localhost/test",
                "db_type": "mysql"
            })
            mock_qs.validate_readonly = lambda sql, dialect: None
            mock_qs.execute_query = AsyncMock(return_value=(
                ["Tables"],
                [{"Tables": "users"}, {"Tables": "orders"}],
                5
            ))
            
            result = await query_database("testdb", "SHOW TABLES")
            
            assert result["is_error"] is False

    @pytest.mark.asyncio
    async def test_query_database_insert_blocked(self):
        """Test INSERT query is blocked."""
        with patch("app.services.agent_tools.database_manager") as mock_mgr, \
             patch("app.services.agent_tools.query_service") as mock_qs:
            mock_mgr.get_database = AsyncMock(return_value={
                "url": "postgresql://localhost/test",
                "db_type": "postgresql"
            })
            mock_qs.validate_readonly.side_effect = ValueError("Only read-only queries are allowed")
            
            result = await query_database("testdb", "INSERT INTO users VALUES (1, 'Test')")
            
            assert result["is_error"] is True
            assert "read-only" in result["content"][0]["text"].lower()

    @pytest.mark.asyncio
    async def test_query_database_update_blocked(self):
        """Test UPDATE query is blocked."""
        with patch("app.services.agent_tools.database_manager") as mock_mgr, \
             patch("app.services.agent_tools.query_service") as mock_qs:
            mock_mgr.get_database = AsyncMock(return_value={
                "url": "postgresql://localhost/test",
                "db_type": "postgresql"
            })
            mock_qs.validate_readonly.side_effect = ValueError("Only read-only queries are allowed")
            
            result = await query_database("testdb", "UPDATE users SET name = 'Hacked'")
            
            assert result["is_error"] is True

    @pytest.mark.asyncio
    async def test_query_database_delete_blocked(self):
        """Test DELETE query is blocked."""
        with patch("app.services.agent_tools.database_manager") as mock_mgr, \
             patch("app.services.agent_tools.query_service") as mock_qs:
            mock_mgr.get_database = AsyncMock(return_value={
                "url": "postgresql://localhost/test",
                "db_type": "postgresql"
            })
            mock_qs.validate_readonly.side_effect = ValueError("Only read-only queries are allowed")
            
            result = await query_database("testdb", "DELETE FROM users")
            
            assert result["is_error"] is True

    @pytest.mark.asyncio
    async def test_query_database_drop_blocked(self):
        """Test DROP query is blocked."""
        with patch("app.services.agent_tools.database_manager") as mock_mgr, \
             patch("app.services.agent_tools.query_service") as mock_qs:
            mock_mgr.get_database = AsyncMock(return_value={
                "url": "postgresql://localhost/test",
                "db_type": "postgresql"
            })
            mock_qs.validate_readonly.side_effect = ValueError("Only read-only queries are allowed")
            
            result = await query_database("testdb", "DROP TABLE users")
            
            assert result["is_error"] is True

    @pytest.mark.asyncio
    async def test_query_database_truncate_blocked(self):
        """Test TRUNCATE query is blocked."""
        with patch("app.services.agent_tools.database_manager") as mock_mgr, \
             patch("app.services.agent_tools.query_service") as mock_qs:
            mock_mgr.get_database = AsyncMock(return_value={
                "url": "postgresql://localhost/test",
                "db_type": "postgresql"
            })
            mock_qs.validate_readonly.side_effect = ValueError("Only read-only queries are allowed")
            
            result = await query_database("testdb", "TRUNCATE TABLE users")
            
            assert result["is_error"] is True

    @pytest.mark.asyncio
    async def test_query_database_result_truncation(self):
        """Test that large result sets are truncated."""
        with patch("app.services.agent_tools.database_manager") as mock_mgr, \
             patch("app.services.agent_tools.query_service") as mock_qs:
            mock_mgr.get_database = AsyncMock(return_value={
                "url": "postgresql://localhost/test",
                "db_type": "postgresql"
            })
            mock_qs.validate_readonly = lambda sql, dialect: None
            # Return more rows than MAX_TOOL_RESULT_ROWS
            large_result = [{"id": i} for i in range(MAX_TOOL_RESULT_ROWS + 50)]
            mock_qs.execute_query = AsyncMock(return_value=(["id"], large_result, 100))
            
            result = await query_database("testdb", "SELECT * FROM big_table")
            
            assert result["is_error"] is False
            assert f"truncated to {MAX_TOOL_RESULT_ROWS}" in result["content"][0]["text"]


class TestGetTableSchema:
    """Test suite for get_table_schema tool."""

    @pytest.mark.asyncio
    async def test_get_table_schema_no_tables(self):
        """Test getting schema when no tables exist."""
        with patch("app.db.sqlite.db_manager") as mock_mgr:
            mock_mgr.get_metadata_for_database = AsyncMock(return_value=None)
            
            result = await get_table_schema("testdb")
            
            assert result["is_error"] is False
            assert "No tables found" in result["content"][0]["text"]

    @pytest.mark.asyncio
    async def test_get_table_schema_all_tables(self):
        """Test getting schema for all tables."""
        with patch("app.db.sqlite.db_manager") as mock_mgr:
            mock_mgr.get_metadata_for_database = AsyncMock(return_value=[
                {
                    "schema_name": "public",
                    "table_name": "users",
                    "table_type": "table",
                    "table_comment": "User accounts",
                    "columns": [
                        {"name": "id", "dataType": "integer", "isNullable": False, "isPrimaryKey": True},
                        {"name": "email", "dataType": "varchar(255)", "isNullable": False, "isPrimaryKey": False},
                    ]
                },
                {
                    "schema_name": "public",
                    "table_name": "orders",
                    "table_type": "table",
                    "table_comment": None,
                    "columns": [
                        {"name": "id", "dataType": "integer", "isNullable": False, "isPrimaryKey": True},
                    ]
                }
            ])
            
            result = await get_table_schema("testdb")
            
            assert result["is_error"] is False
            text = result["content"][0]["text"]
            assert "users" in text
            assert "orders" in text
            assert "email" in text
            assert "[PK]" in text

    @pytest.mark.asyncio
    async def test_get_table_schema_specific_table(self):
        """Test getting schema for a specific table."""
        with patch("app.db.sqlite.db_manager") as mock_mgr:
            mock_mgr.get_metadata_for_database = AsyncMock(return_value=[
                {
                    "schema_name": "public",
                    "table_name": "users",
                    "table_type": "table",
                    "columns": [
                        {"name": "id", "dataType": "integer", "isNullable": False, "isPrimaryKey": True},
                    ]
                },
                {
                    "schema_name": "public",
                    "table_name": "orders",
                    "table_type": "table",
                    "columns": []
                }
            ])
            
            result = await get_table_schema("testdb", "users")
            
            assert result["is_error"] is False
            text = result["content"][0]["text"]
            assert "users" in text
            assert "orders" not in text

    @pytest.mark.asyncio
    async def test_get_table_schema_table_not_found(self):
        """Test getting schema for non-existent table."""
        with patch("app.db.sqlite.db_manager") as mock_mgr:
            mock_mgr.get_metadata_for_database = AsyncMock(return_value=[
                {
                    "schema_name": "public",
                    "table_name": "users",
                    "table_type": "table",
                    "columns": []
                }
            ])
            
            result = await get_table_schema("testdb", "nonexistent")
            
            assert result["is_error"] is True
            assert "not found" in result["content"][0]["text"]


class TestAgentToolsDefinition:
    """Test suite for AGENT_TOOLS definition."""

    def test_tools_count(self):
        """Test correct number of tools defined."""
        assert len(AGENT_TOOLS) == 2

    def test_query_database_tool_definition(self):
        """Test query_database tool has correct definition."""
        query_tool = next((t for t in AGENT_TOOLS if t["name"] == "query_database"), None)
        
        assert query_tool is not None
        assert "description" in query_tool
        assert "read-only" in query_tool["description"].lower()
        assert "input_schema" in query_tool
        assert query_tool["input_schema"]["required"] == ["sql"]

    def test_get_table_schema_tool_definition(self):
        """Test get_table_schema tool has correct definition."""
        schema_tool = next((t for t in AGENT_TOOLS if t["name"] == "get_table_schema"), None)
        
        assert schema_tool is not None
        assert "description" in schema_tool
        assert "input_schema" in schema_tool
        # table_name is optional
        assert schema_tool["input_schema"]["required"] == []


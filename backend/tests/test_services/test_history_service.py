"""Unit tests for history_service module."""

import pytest
from datetime import datetime
from unittest.mock import AsyncMock, patch, MagicMock

from app.services.history_service import HistoryService


class TestHistoryService:
    """Test suite for HistoryService."""

    @pytest.fixture
    def service(self):
        """Create a fresh HistoryService instance."""
        return HistoryService()

    # === create_history tests ===

    @pytest.mark.asyncio
    async def test_create_history_saves_record(self, service):
        """Test create_history saves record correctly."""
        with patch("app.services.history_service.db_manager") as mock_db, \
             patch("app.services.history_service.tokenize_for_search") as mock_tokenize:
            
            mock_tokenize.side_effect = lambda x: f"tokenized_{x}" if x else ""
            mock_db.create_query_history = AsyncMock(return_value=123)
            
            result = await service.create_history(
                db_name="test_db",
                sql_content="SELECT * FROM users",
                row_count=10,
                execution_time_ms=42,
                natural_query="查询所有用户",
            )
            
            assert result == 123
            mock_db.create_query_history.assert_called_once_with(
                db_name="test_db",
                sql_content="SELECT * FROM users",
                sql_tokens="tokenized_SELECT * FROM users",
                natural_query="查询所有用户",
                natural_tokens="tokenized_查询所有用户",
                row_count=10,
                execution_time_ms=42,
            )

    @pytest.mark.asyncio
    async def test_create_history_without_natural_query(self, service):
        """Test create_history works without natural_query."""
        with patch("app.services.history_service.db_manager") as mock_db, \
             patch("app.services.history_service.tokenize_for_search") as mock_tokenize:
            
            mock_tokenize.side_effect = lambda x: f"tokenized_{x}" if x else ""
            mock_db.create_query_history = AsyncMock(return_value=456)
            
            result = await service.create_history(
                db_name="test_db",
                sql_content="SELECT 1",
                row_count=1,
                execution_time_ms=5,
            )
            
            assert result == 456
            mock_db.create_query_history.assert_called_once()
            call_args = mock_db.create_query_history.call_args
            assert call_args.kwargs["natural_query"] is None
            assert call_args.kwargs["natural_tokens"] == ""

    # === list_history tests ===

    @pytest.mark.asyncio
    async def test_list_history_returns_records_in_descending_order(self, service):
        """Test list_history returns records in descending order."""
        mock_items = [
            {
                "id": 2,
                "db_name": "test_db",
                "sql_content": "SELECT 2",
                "natural_query": None,
                "row_count": 1,
                "execution_time_ms": 10,
                "executed_at": "2025-12-29T10:30:00",
            },
            {
                "id": 1,
                "db_name": "test_db",
                "sql_content": "SELECT 1",
                "natural_query": None,
                "row_count": 1,
                "execution_time_ms": 5,
                "executed_at": "2025-12-29T10:00:00",
            },
        ]
        
        with patch("app.services.history_service.db_manager") as mock_db:
            mock_db.list_query_history = AsyncMock(return_value=(mock_items, 2))
            
            items, total, has_more, next_cursor = await service.list_history(
                db_name="test_db",
                limit=20,
            )
            
            assert len(items) == 2
            assert total == 2
            assert has_more is False
            # Items should be in descending order (newest first)
            assert items[0]["id"] == 2
            assert items[1]["id"] == 1

    @pytest.mark.asyncio
    async def test_list_history_pagination_with_before_cursor(self, service):
        """Test list_history pagination with before cursor."""
        mock_items = [
            {
                "id": 1,
                "db_name": "test_db",
                "sql_content": "SELECT 1",
                "natural_query": None,
                "row_count": 1,
                "execution_time_ms": 5,
                "executed_at": "2025-12-29T10:00:00",
            },
        ]
        
        with patch("app.services.history_service.db_manager") as mock_db:
            mock_db.list_query_history = AsyncMock(return_value=(mock_items, 5))
            
            items, total, has_more, next_cursor = await service.list_history(
                db_name="test_db",
                limit=1,
                before="2025-12-29T10:30:00",
            )
            
            mock_db.list_query_history.assert_called_once()
            call_args = mock_db.list_query_history.call_args
            assert call_args.kwargs["before"] == "2025-12-29T10:30:00"

    @pytest.mark.asyncio
    async def test_list_history_has_more_when_more_records_exist(self, service):
        """Test list_history returns hasMore=True when more records exist."""
        # Return limit+1 items to indicate there are more
        mock_items = [
            {"id": i, "db_name": "test_db", "sql_content": f"SELECT {i}", 
             "natural_query": None, "row_count": 1, "execution_time_ms": 5,
             "executed_at": f"2025-12-29T10:{i:02d}:00"}
            for i in range(3)  # 3 items for limit=2
        ]
        
        with patch("app.services.history_service.db_manager") as mock_db:
            mock_db.list_query_history = AsyncMock(return_value=(mock_items, 10))
            
            items, total, has_more, next_cursor = await service.list_history(
                db_name="test_db",
                limit=2,
            )
            
            assert len(items) == 2  # Should return limit items
            assert has_more is True
            assert next_cursor is not None

    # === search_history tests ===

    @pytest.mark.asyncio
    async def test_search_history_finds_records_by_sql_keyword(self, service):
        """Test search_history finds records by SQL keyword."""
        mock_items = [
            {
                "id": 1,
                "db_name": "test_db",
                "sql_content": "SELECT * FROM users",
                "natural_query": None,
                "row_count": 10,
                "execution_time_ms": 42,
                "executed_at": "2025-12-29T10:00:00",
            },
        ]
        
        with patch("app.services.history_service.db_manager") as mock_db, \
             patch("app.services.history_service.tokenize_for_search") as mock_tokenize:
            
            mock_tokenize.return_value = "users"
            mock_db.search_query_history = AsyncMock(return_value=(mock_items, 1))
            
            items, total = await service.search_history(
                db_name="test_db",
                query="users",
            )
            
            assert len(items) == 1
            assert total == 1
            assert "users" in items[0]["sql_content"]

    @pytest.mark.asyncio
    async def test_search_history_finds_records_by_chinese_keyword(self, service):
        """Test search_history finds records by Chinese keyword."""
        mock_items = [
            {
                "id": 1,
                "db_name": "test_db",
                "sql_content": "SELECT * FROM users",
                "natural_query": "查询所有用户",
                "row_count": 10,
                "execution_time_ms": 42,
                "executed_at": "2025-12-29T10:00:00",
            },
        ]
        
        with patch("app.services.history_service.db_manager") as mock_db, \
             patch("app.services.history_service.tokenize_for_search") as mock_tokenize:
            
            mock_tokenize.return_value = "用户"
            mock_db.search_query_history = AsyncMock(return_value=(mock_items, 1))
            
            items, total = await service.search_history(
                db_name="test_db",
                query="用户",
            )
            
            assert len(items) == 1
            assert total == 1
            mock_tokenize.assert_called_with("用户")

    @pytest.mark.asyncio
    async def test_search_history_returns_empty_for_no_matches(self, service):
        """Test search_history returns empty for no matches."""
        with patch("app.services.history_service.db_manager") as mock_db, \
             patch("app.services.history_service.tokenize_for_search") as mock_tokenize:
            
            mock_tokenize.return_value = "nonexistent"
            mock_db.search_query_history = AsyncMock(return_value=([], 0))
            
            items, total = await service.search_history(
                db_name="test_db",
                query="nonexistent",
            )
            
            assert len(items) == 0
            assert total == 0

    @pytest.mark.asyncio
    async def test_search_history_returns_empty_for_whitespace_query(self, service):
        """Test search_history returns empty for whitespace-only query."""
        with patch("app.services.history_service.tokenize_for_search") as mock_tokenize:
            mock_tokenize.return_value = "   "
            
            items, total = await service.search_history(
                db_name="test_db",
                query="   ",
            )
            
            assert len(items) == 0
            assert total == 0

    # === natural_query tests ===

    @pytest.mark.asyncio
    async def test_natural_query_is_saved_when_provided(self, service):
        """Test natural_query is saved when provided."""
        with patch("app.services.history_service.db_manager") as mock_db, \
             patch("app.services.history_service.tokenize_for_search") as mock_tokenize:
            
            mock_tokenize.side_effect = lambda x: f"tokenized_{x}" if x else ""
            mock_db.create_query_history = AsyncMock(return_value=789)
            
            await service.create_history(
                db_name="test_db",
                sql_content="SELECT * FROM orders",
                row_count=50,
                execution_time_ms=100,
                natural_query="显示所有订单",
            )
            
            call_args = mock_db.create_query_history.call_args
            assert call_args.kwargs["natural_query"] == "显示所有订单"
            assert call_args.kwargs["natural_tokens"] == "tokenized_显示所有订单"

    @pytest.mark.asyncio
    async def test_search_matches_natural_query_content(self, service):
        """Test search matches natural_query content."""
        mock_items = [
            {
                "id": 1,
                "db_name": "test_db",
                "sql_content": "SELECT * FROM orders",
                "natural_query": "显示所有订单",
                "row_count": 50,
                "execution_time_ms": 100,
                "executed_at": "2025-12-29T10:00:00",
            },
        ]
        
        with patch("app.services.history_service.db_manager") as mock_db, \
             patch("app.services.history_service.tokenize_for_search") as mock_tokenize:
            
            mock_tokenize.return_value = "订单"
            mock_db.search_query_history = AsyncMock(return_value=(mock_items, 1))
            
            items, total = await service.search_history(
                db_name="test_db",
                query="订单",
            )
            
            assert len(items) == 1
            assert items[0]["natural_query"] == "显示所有订单"


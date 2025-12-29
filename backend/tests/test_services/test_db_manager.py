"""Unit tests for db_manager module."""

import pytest
from unittest.mock import AsyncMock, patch

from app.services.db_manager import DatabaseManager


class TestDatabaseManager:
    """Test suite for DatabaseManager."""

    @pytest.fixture
    def manager(self):
        """Create a fresh DatabaseManager instance."""
        return DatabaseManager()

    @pytest.mark.asyncio
    async def test_list_databases(self, manager):
        """Test listing databases delegates to sqlite manager."""
        mock_result = [
            {"name": "db1", "url": "postgresql://localhost/db1"},
            {"name": "db2", "url": "postgresql://localhost/db2"},
        ]
        
        with patch("app.services.db_manager.db_manager") as mock_db:
            mock_db.list_databases = AsyncMock(return_value=mock_result)
            
            result = await manager.list_databases()
            
            assert result == mock_result
            mock_db.list_databases.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_database(self, manager):
        """Test getting a database by name."""
        mock_result = {"name": "testdb", "url": "postgresql://localhost/testdb"}
        
        with patch("app.services.db_manager.db_manager") as mock_db:
            mock_db.get_database = AsyncMock(return_value=mock_result)
            
            result = await manager.get_database("testdb")
            
            assert result == mock_result
            mock_db.get_database.assert_called_once_with("testdb")

    @pytest.mark.asyncio
    async def test_get_database_not_found(self, manager):
        """Test getting non-existent database returns None."""
        with patch("app.services.db_manager.db_manager") as mock_db:
            mock_db.get_database = AsyncMock(return_value=None)
            
            result = await manager.get_database("nonexistent")
            
            assert result is None

    @pytest.mark.asyncio
    async def test_get_connection_returns_url(self, manager):
        """Test get_connection returns URL string."""
        mock_db_info = {"name": "testdb", "url": "postgresql://localhost/testdb"}
        
        with patch("app.services.db_manager.db_manager") as mock_db:
            mock_db.get_database = AsyncMock(return_value=mock_db_info)
            
            url = await manager.get_connection("testdb")
            
            assert url == "postgresql://localhost/testdb"

    @pytest.mark.asyncio
    async def test_get_connection_not_found_raises(self, manager):
        """Test get_connection raises ValueError if not found."""
        with patch("app.services.db_manager.db_manager") as mock_db:
            mock_db.get_database = AsyncMock(return_value=None)
            
            with pytest.raises(ValueError, match="Database 'nonexistent' not found"):
                await manager.get_connection("nonexistent")

    @pytest.mark.asyncio
    async def test_delete_database(self, manager):
        """Test deleting a database."""
        with patch("app.services.db_manager.db_manager") as mock_db:
            mock_db.delete_database = AsyncMock(return_value=True)
            
            result = await manager.delete_database("testdb")
            
            assert result is True
            mock_db.delete_database.assert_called_once_with("testdb")

    @pytest.mark.asyncio
    async def test_delete_database_not_found(self, manager):
        """Test deleting non-existent database returns False."""
        with patch("app.services.db_manager.db_manager") as mock_db:
            mock_db.delete_database = AsyncMock(return_value=False)
            
            result = await manager.delete_database("nonexistent")
            
            assert result is False

    @pytest.mark.asyncio
    async def test_create_or_update_database_tests_connection(self, manager):
        """Test that create_or_update tests connection first."""
        with patch("app.services.db_manager.db_manager") as mock_db, \
             patch("app.services.db_manager.ConnectorFactory") as mock_factory:

            # Setup mocks
            mock_connector = AsyncMock()
            mock_factory.get_connector.return_value = mock_connector
            mock_factory.detect_db_type.return_value = "postgresql"

            mock_db.create_or_update_database = AsyncMock(return_value={
                "name": "testdb",
                "url": "postgresql://localhost/testdb",
                "db_type": "postgresql",
                "ssl_disabled": False,
            })

            await manager.create_or_update_database("testdb", "postgresql://localhost/testdb")

            mock_connector.test_connection.assert_called_once()
            mock_db.create_or_update_database.assert_called_once_with(
                "testdb", "postgresql://localhost/testdb", "postgresql", False
            )

"""Unit tests for db_manager module."""

import pytest
import aiosqlite

from app.services.db_manager import database_manager


@pytest.mark.asyncio
class TestDatabaseManager:
    """Test suite for DatabaseManager."""

    @pytest.fixture
    async def clean_db(self, tmp_path):
        """Create a clean test database."""
        db_path = tmp_path / "test.db"
        async with aiosqlite.connect(db_path) as db:
            await db.execute("""
                CREATE TABLE IF NOT EXISTS databases (
                    name TEXT PRIMARY KEY,
                    url TEXT NOT NULL,
                    created_at TEXT NOT NULL DEFAULT (datetime('now')),
                    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
                )
            """)
            await db.commit()
        
        # Temporarily override database path
        original_path = database_manager.db_path
        database_manager.db_path = db_path
        
        yield db_path
        
        # Restore original path
        database_manager.db_path = original_path

    async def test_save_connection(self, clean_db):
        """Test saving a database connection."""
        await database_manager.save_connection(
            "testdb",
            "postgresql://user:pass@localhost/testdb"
        )
        
        # Verify it was saved
        url = await database_manager.get_connection("testdb")
        assert url == "postgresql://user:pass@localhost/testdb"

    async def test_save_connection_update(self, clean_db):
        """Test updating an existing connection."""
        await database_manager.save_connection("testdb", "postgresql://old@localhost/db")
        await database_manager.save_connection("testdb", "postgresql://new@localhost/db")
        
        url = await database_manager.get_connection("testdb")
        assert url == "postgresql://new@localhost/db"

    async def test_get_connection_not_found(self, clean_db):
        """Test getting non-existent connection raises error."""
        with pytest.raises(ValueError, match="Database 'nonexistent' not found"):
            await database_manager.get_connection("nonexistent")

    async def test_list_connections_empty(self, clean_db):
        """Test listing connections when none exist."""
        connections = await database_manager.list_connections()
        assert connections == []

    async def test_list_connections(self, clean_db):
        """Test listing multiple connections."""
        await database_manager.save_connection("db1", "postgresql://localhost/db1")
        await database_manager.save_connection("db2", "postgresql://localhost/db2")
        
        connections = await database_manager.list_connections()
        assert len(connections) == 2
        
        names = [conn["name"] for conn in connections]
        assert "db1" in names
        assert "db2" in names

    async def test_delete_connection(self, clean_db):
        """Test deleting a connection."""
        await database_manager.save_connection("testdb", "postgresql://localhost/testdb")
        await database_manager.delete_connection("testdb")
        
        # Should not exist anymore
        with pytest.raises(ValueError, match="Database 'testdb' not found"):
            await database_manager.get_connection("testdb")

    async def test_delete_connection_not_found(self, clean_db):
        """Test deleting non-existent connection raises error."""
        with pytest.raises(ValueError, match="Database 'nonexistent' not found"):
            await database_manager.delete_connection("nonexistent")


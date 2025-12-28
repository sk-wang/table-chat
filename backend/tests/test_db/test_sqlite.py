"""Unit tests for sqlite module."""

import json
import tempfile
from pathlib import Path

import pytest

from app.db.sqlite import SQLiteManager


class TestSQLiteManager:
    """Test suite for SQLiteManager."""

    @pytest.fixture
    async def manager(self):
        """Create a SQLiteManager with a temporary database."""
        with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
            db_path = Path(f.name)

        manager = SQLiteManager(db_path=db_path)
        await manager.init_schema()
        yield manager

        # Cleanup
        if db_path.exists():
            db_path.unlink()

    @pytest.mark.asyncio
    async def test_init_schema_creates_tables(self, manager):
        """Test init_schema creates required tables."""
        async with manager.get_connection() as conn:
            # Check databases table exists
            cursor = await conn.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='databases'"
            )
            assert await cursor.fetchone() is not None

            # Check table_metadata table exists
            cursor = await conn.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='table_metadata'"
            )
            assert await cursor.fetchone() is not None

    # === Database CRUD Tests ===

    @pytest.mark.asyncio
    async def test_list_databases_empty(self, manager):
        """Test listing databases when none exist."""
        result = await manager.list_databases()
        assert result == []

    @pytest.mark.asyncio
    async def test_create_database(self, manager):
        """Test creating a new database connection."""
        result = await manager.create_or_update_database(
            name="testdb",
            url="postgresql://localhost/testdb"
        )

        assert result["name"] == "testdb"
        assert result["url"] == "postgresql://localhost/testdb"
        assert "created_at" in result
        assert "updated_at" in result

    @pytest.mark.asyncio
    async def test_list_databases_after_create(self, manager):
        """Test listing databases after creating one."""
        await manager.create_or_update_database("db1", "postgresql://localhost/db1")
        await manager.create_or_update_database("db2", "postgresql://localhost/db2")

        result = await manager.list_databases()

        assert len(result) == 2
        names = [db["name"] for db in result]
        assert "db1" in names
        assert "db2" in names

    @pytest.mark.asyncio
    async def test_get_database_found(self, manager):
        """Test getting an existing database."""
        await manager.create_or_update_database("testdb", "postgresql://localhost/testdb")

        result = await manager.get_database("testdb")

        assert result is not None
        assert result["name"] == "testdb"
        assert result["url"] == "postgresql://localhost/testdb"

    @pytest.mark.asyncio
    async def test_get_database_not_found(self, manager):
        """Test getting a non-existent database."""
        result = await manager.get_database("nonexistent")
        assert result is None

    @pytest.mark.asyncio
    async def test_update_database(self, manager):
        """Test updating an existing database connection."""
        await manager.create_or_update_database("testdb", "postgresql://localhost/olddb")
        original = await manager.get_database("testdb")

        await manager.create_or_update_database("testdb", "postgresql://localhost/newdb")
        updated = await manager.get_database("testdb")

        assert updated["url"] == "postgresql://localhost/newdb"
        assert updated["updated_at"] >= original["updated_at"]

    @pytest.mark.asyncio
    async def test_delete_database_exists(self, manager):
        """Test deleting an existing database."""
        await manager.create_or_update_database("testdb", "postgresql://localhost/testdb")

        result = await manager.delete_database("testdb")

        assert result is True
        assert await manager.get_database("testdb") is None

    @pytest.mark.asyncio
    async def test_delete_database_not_exists(self, manager):
        """Test deleting a non-existent database."""
        result = await manager.delete_database("nonexistent")
        assert result is False

    # === Table Metadata Tests ===

    @pytest.mark.asyncio
    async def test_save_metadata(self, manager):
        """Test saving table metadata."""
        # First create the database
        await manager.create_or_update_database("testdb", "postgresql://localhost/testdb")

        columns = [
            {"name": "id", "dataType": "integer", "isNullable": False, "isPrimaryKey": True},
            {"name": "name", "dataType": "varchar", "isNullable": True, "isPrimaryKey": False},
        ]

        await manager.save_metadata(
            db_name="testdb",
            schema_name="public",
            table_name="users",
            table_type="table",
            columns=columns,
        )

        result = await manager.get_metadata_for_database("testdb")

        assert len(result) == 1
        assert result[0]["schema_name"] == "public"
        assert result[0]["table_name"] == "users"
        assert result[0]["table_type"] == "table"
        assert result[0]["columns"] == columns

    @pytest.mark.asyncio
    async def test_get_metadata_for_database_empty(self, manager):
        """Test getting metadata when none exists."""
        result = await manager.get_metadata_for_database("testdb")
        assert result == []

    @pytest.mark.asyncio
    async def test_get_metadata_for_database_multiple_tables(self, manager):
        """Test getting metadata for multiple tables."""
        await manager.create_or_update_database("testdb", "postgresql://localhost/testdb")

        await manager.save_metadata("testdb", "public", "users", "table", [{"name": "id"}])
        await manager.save_metadata("testdb", "public", "orders", "table", [{"name": "id"}])
        await manager.save_metadata("testdb", "analytics", "stats", "view", [{"name": "count"}])

        result = await manager.get_metadata_for_database("testdb")

        assert len(result) == 3
        table_names = [r["table_name"] for r in result]
        assert "users" in table_names
        assert "orders" in table_names
        assert "stats" in table_names

    @pytest.mark.asyncio
    async def test_save_metadata_upsert(self, manager):
        """Test that save_metadata updates existing entries."""
        await manager.create_or_update_database("testdb", "postgresql://localhost/testdb")

        # Save initial
        await manager.save_metadata("testdb", "public", "users", "table", [{"name": "id"}])

        # Update
        await manager.save_metadata("testdb", "public", "users", "table", [{"name": "id"}, {"name": "email"}])

        result = await manager.get_metadata_for_database("testdb")

        assert len(result) == 1
        assert len(result[0]["columns"]) == 2

    @pytest.mark.asyncio
    async def test_clear_metadata_for_database(self, manager):
        """Test clearing all metadata for a database."""
        await manager.create_or_update_database("testdb", "postgresql://localhost/testdb")
        await manager.save_metadata("testdb", "public", "users", "table", [{"name": "id"}])
        await manager.save_metadata("testdb", "public", "orders", "table", [{"name": "id"}])

        await manager.clear_metadata_for_database("testdb")

        result = await manager.get_metadata_for_database("testdb")
        assert result == []

    @pytest.mark.asyncio
    async def test_metadata_ordered_by_schema_and_table(self, manager):
        """Test that metadata is returned ordered by schema and table name."""
        await manager.create_or_update_database("testdb", "postgresql://localhost/testdb")

        # Insert in random order
        await manager.save_metadata("testdb", "public", "zebra", "table", [])
        await manager.save_metadata("testdb", "analytics", "metrics", "table", [])
        await manager.save_metadata("testdb", "public", "alpha", "table", [])

        result = await manager.get_metadata_for_database("testdb")

        # Should be ordered: analytics.metrics, public.alpha, public.zebra
        assert result[0]["schema_name"] == "analytics"
        assert result[1]["table_name"] == "alpha"
        assert result[2]["table_name"] == "zebra"

    @pytest.mark.asyncio
    async def test_cascade_delete_metadata_on_database_delete(self, manager):
        """Test that deleting database cascades to delete its metadata."""
        await manager.create_or_update_database("testdb", "postgresql://localhost/testdb")
        await manager.save_metadata("testdb", "public", "users", "table", [{"name": "id"}])

        # Verify metadata exists
        assert len(await manager.get_metadata_for_database("testdb")) == 1

        # Delete database
        await manager.delete_database("testdb")

        # Metadata should be deleted due to CASCADE
        result = await manager.get_metadata_for_database("testdb")
        assert result == []

"""Unit tests for editor_memory_service module."""

import pytest
from datetime import datetime
from unittest.mock import AsyncMock, patch

from app.services import editor_memory_service


class TestEditorMemoryService:
    """Test suite for editor_memory_service."""

    # === create_editor_memory tests ===

    @pytest.mark.asyncio
    async def test_create_editor_memory_saves_record(self):
        """Test create_editor_memory saves record correctly."""
        from app.models.editor_memory import EditorMemoryCreate

        mock_record = {
            "id": 123,
            "connection_id": "test_conn_1",
            "content": "SELECT * FROM users WHERE id = 1;",
            "created_at": datetime(2026, 1, 11, 10, 0, 0),
        }

        with patch("app.services.editor_memory_service.editor_memory_db") as mock_db, \
             patch("app.services.editor_memory_service.settings") as mock_settings:

            mock_settings.database_path = "/tmp/test.db"
            mock_db.create_editor_memory = AsyncMock(return_value=mock_record)

            data = EditorMemoryCreate(
                connection_id="test_conn_1",
                content="SELECT * FROM users WHERE id = 1;"
            )

            result = await editor_memory_service.create_editor_memory(data)

            assert result.id == 123
            assert result.connection_id == "test_conn_1"
            assert result.content == "SELECT * FROM users WHERE id = 1;"
            assert result.created_at == datetime(2026, 1, 11, 10, 0, 0)

            mock_db.create_editor_memory.assert_called_once_with(
                db_path="/tmp/test.db",
                connection_id="test_conn_1",
                content="SELECT * FROM users WHERE id = 1;"
            )

    @pytest.mark.asyncio
    async def test_create_editor_memory_with_empty_content(self):
        """Test create_editor_memory works with empty content."""
        from app.models.editor_memory import EditorMemoryCreate

        mock_record = {
            "id": 456,
            "connection_id": "test_conn_2",
            "content": "",
            "created_at": datetime(2026, 1, 11, 10, 5, 0),
        }

        with patch("app.services.editor_memory_service.editor_memory_db") as mock_db, \
             patch("app.services.editor_memory_service.settings") as mock_settings:

            mock_settings.database_path = "/tmp/test.db"
            mock_db.create_editor_memory = AsyncMock(return_value=mock_record)

            data = EditorMemoryCreate(connection_id="test_conn_2", content="")

            result = await editor_memory_service.create_editor_memory(data)

            assert result.id == 456
            assert result.content == ""
            mock_db.create_editor_memory.assert_called_once()

    # === get_editor_memories_by_connection tests ===

    @pytest.mark.asyncio
    async def test_get_editor_memories_by_connection_returns_list(self):
        """Test get_editor_memories_by_connection returns list of memories."""
        mock_records = [
            {
                "id": 1,
                "connection_id": "test_conn_1",
                "content": "SELECT * FROM users;",
                "created_at": datetime(2026, 1, 11, 10, 0, 0),
            },
            {
                "id": 2,
                "connection_id": "test_conn_1",
                "content": "SELECT COUNT(*) FROM orders;",
                "created_at": datetime(2026, 1, 11, 10, 5, 0),
            },
        ]

        with patch("app.services.editor_memory_service.editor_memory_db") as mock_db, \
             patch("app.services.editor_memory_service.settings") as mock_settings:

            mock_settings.database_path = "/tmp/test.db"
            mock_db.get_editor_memories_by_connection = AsyncMock(
                return_value=mock_records
            )

            result = await editor_memory_service.get_editor_memories_by_connection(
                "test_conn_1"
            )

            assert result.total == 2
            assert len(result.items) == 2
            assert result.items[0].id == 1
            assert result.items[0].content == "SELECT * FROM users;"
            assert result.items[1].id == 2
            assert result.items[1].content == "SELECT COUNT(*) FROM orders;"

            mock_db.get_editor_memories_by_connection.assert_called_once_with(
                db_path="/tmp/test.db",
                connection_id="test_conn_1"
            )

    @pytest.mark.asyncio
    async def test_get_editor_memories_by_connection_returns_empty_list(self):
        """Test get_editor_memories_by_connection returns empty list when no records."""
        with patch("app.services.editor_memory_service.editor_memory_db") as mock_db, \
             patch("app.services.editor_memory_service.settings") as mock_settings:

            mock_settings.database_path = "/tmp/test.db"
            mock_db.get_editor_memories_by_connection = AsyncMock(return_value=[])

            result = await editor_memory_service.get_editor_memories_by_connection(
                "nonexistent_conn"
            )

            assert result.total == 0
            assert len(result.items) == 0

    # === get_latest_editor_memory tests ===

    @pytest.mark.asyncio
    async def test_get_latest_editor_memory_returns_latest_record(self):
        """Test get_latest_editor_memory returns the most recent record."""
        mock_record = {
            "id": 99,
            "connection_id": "test_conn_1",
            "content": "SELECT * FROM latest_table;",
            "created_at": datetime(2026, 1, 11, 12, 0, 0),
        }

        with patch("app.services.editor_memory_service.editor_memory_db") as mock_db, \
             patch("app.services.editor_memory_service.settings") as mock_settings:

            mock_settings.database_path = "/tmp/test.db"
            mock_db.get_latest_editor_memory = AsyncMock(return_value=mock_record)

            result = await editor_memory_service.get_latest_editor_memory(
                "test_conn_1"
            )

            assert result is not None
            assert result.id == 99
            assert result.connection_id == "test_conn_1"
            assert result.content == "SELECT * FROM latest_table;"

            mock_db.get_latest_editor_memory.assert_called_once_with(
                db_path="/tmp/test.db",
                connection_id="test_conn_1"
            )

    @pytest.mark.asyncio
    async def test_get_latest_editor_memory_returns_none_when_no_record(self):
        """Test get_latest_editor_memory returns None when no records exist."""
        with patch("app.services.editor_memory_service.editor_memory_db") as mock_db, \
             patch("app.services.editor_memory_service.settings") as mock_settings:

            mock_settings.database_path = "/tmp/test.db"
            mock_db.get_latest_editor_memory = AsyncMock(return_value=None)

            result = await editor_memory_service.get_latest_editor_memory(
                "nonexistent_conn"
            )

            assert result is None

    # === delete_editor_memory tests ===

    @pytest.mark.asyncio
    async def test_delete_editor_memory_returns_true_on_success(self):
        """Test delete_editor_memory returns True when deletion succeeds."""
        with patch("app.services.editor_memory_service.editor_memory_db") as mock_db, \
             patch("app.services.editor_memory_service.settings") as mock_settings:

            mock_settings.database_path = "/tmp/test.db"
            mock_db.delete_editor_memory = AsyncMock(return_value=True)

            result = await editor_memory_service.delete_editor_memory(123)

            assert result is True
            mock_db.delete_editor_memory.assert_called_once_with(
                db_path="/tmp/test.db",
                record_id=123
            )

    @pytest.mark.asyncio
    async def test_delete_editor_memory_returns_false_when_not_found(self):
        """Test delete_editor_memory returns False when record not found."""
        with patch("app.services.editor_memory_service.editor_memory_db") as mock_db, \
             patch("app.services.editor_memory_service.settings") as mock_settings:

            mock_settings.database_path = "/tmp/test.db"
            mock_db.delete_editor_memory = AsyncMock(return_value=False)

            result = await editor_memory_service.delete_editor_memory(999)

            assert result is False

    # === delete_all_editor_memories_by_connection tests ===

    @pytest.mark.asyncio
    async def test_delete_all_editor_memories_by_connection_returns_count(self):
        """Test delete_all_editor_memories_by_connection returns deleted count."""
        with patch("app.services.editor_memory_service.editor_memory_db") as mock_db, \
             patch("app.services.editor_memory_service.settings") as mock_settings:

            mock_settings.database_path = "/tmp/test.db"
            mock_db.delete_all_editor_memories_by_connection = AsyncMock(
                return_value=5
            )

            result = await editor_memory_service.delete_all_editor_memories_by_connection(
                "test_conn_1"
            )

            assert result == 5
            mock_db.delete_all_editor_memories_by_connection.assert_called_once_with(
                db_path="/tmp/test.db",
                connection_id="test_conn_1"
            )

    @pytest.mark.asyncio
    async def test_delete_all_editor_memories_by_connection_returns_zero(self):
        """Test delete_all_editor_memories_by_connection returns 0 when no records."""
        with patch("app.services.editor_memory_service.editor_memory_db") as mock_db, \
             patch("app.services.editor_memory_service.settings") as mock_settings:

            mock_settings.database_path = "/tmp/test.db"
            mock_db.delete_all_editor_memories_by_connection = AsyncMock(return_value=0)

            result = await editor_memory_service.delete_all_editor_memories_by_connection(
                "nonexistent_conn"
            )

            assert result == 0

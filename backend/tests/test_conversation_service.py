import pytest
from unittest.mock import AsyncMock, patch, MagicMock
import uuid

from app.services.conversation_service import ConversationService


@pytest.fixture
def conversation_service():
    return ConversationService()


@pytest.fixture
def mock_db_connection():
    mock_conn = AsyncMock()
    mock_cursor = AsyncMock()
    mock_conn.execute = AsyncMock(return_value=mock_cursor)
    mock_conn.commit = AsyncMock()
    return mock_conn, mock_cursor


class TestCreateConversation:
    @pytest.mark.asyncio
    async def test_create_conversation_with_default_title(self, conversation_service, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        
        with patch('app.services.conversation_service.db_manager') as mock_db_manager:
            mock_db_manager.get_connection = MagicMock()
            mock_db_manager.get_connection.return_value.__aenter__ = AsyncMock(return_value=mock_conn)
            mock_db_manager.get_connection.return_value.__aexit__ = AsyncMock(return_value=None)
            
            result = await conversation_service.create_conversation("test-db")
            
            assert result["connection_id"] == "test-db"
            assert result["title"] == "New Conversation"
            assert "id" in result
            assert "created_at" in result
            assert "updated_at" in result

    @pytest.mark.asyncio
    async def test_create_conversation_with_custom_title(self, conversation_service, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        
        with patch('app.services.conversation_service.db_manager') as mock_db_manager:
            mock_db_manager.get_connection = MagicMock()
            mock_db_manager.get_connection.return_value.__aenter__ = AsyncMock(return_value=mock_conn)
            mock_db_manager.get_connection.return_value.__aexit__ = AsyncMock(return_value=None)
            
            result = await conversation_service.create_conversation("test-db", "Custom Title")
            
            assert result["title"] == "Custom Title"

    @pytest.mark.asyncio
    async def test_create_conversation_generates_uuid(self, conversation_service, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        
        with patch('app.services.conversation_service.db_manager') as mock_db_manager:
            mock_db_manager.get_connection = MagicMock()
            mock_db_manager.get_connection.return_value.__aenter__ = AsyncMock(return_value=mock_conn)
            mock_db_manager.get_connection.return_value.__aexit__ = AsyncMock(return_value=None)
            
            result = await conversation_service.create_conversation("test-db")
            
            try:
                uuid.UUID(result["id"])
                is_valid_uuid = True
            except ValueError:
                is_valid_uuid = False
            
            assert is_valid_uuid


class TestListConversations:
    @pytest.mark.asyncio
    async def test_list_conversations_returns_items_and_total(self, conversation_service, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        
        mock_count_row = MagicMock()
        mock_count_row.__getitem__ = MagicMock(return_value=2)
        
        mock_conv_row = MagicMock()
        mock_conv_row.keys = MagicMock(return_value=["id", "connection_id", "title", "created_at", "updated_at"])
        mock_conv_row.__iter__ = MagicMock(return_value=iter(["conv-1", "test-db", "Title 1", "2026-01-17", "2026-01-17"]))
        
        call_count = 0
        async def mock_fetchone():
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                return mock_count_row
            return None
        
        mock_cursor.fetchone = mock_fetchone
        mock_cursor.fetchall = AsyncMock(return_value=[])
        
        with patch('app.services.conversation_service.db_manager') as mock_db_manager:
            mock_db_manager.get_connection = MagicMock()
            mock_db_manager.get_connection.return_value.__aenter__ = AsyncMock(return_value=mock_conn)
            mock_db_manager.get_connection.return_value.__aexit__ = AsyncMock(return_value=None)
            
            items, total = await conversation_service.list_conversations("test-db", limit=50)
            
            assert isinstance(items, list)
            assert isinstance(total, int)


class TestGetConversation:
    @pytest.mark.asyncio
    async def test_get_conversation_not_found_returns_none(self, conversation_service, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchone = AsyncMock(return_value=None)
        
        with patch('app.services.conversation_service.db_manager') as mock_db_manager:
            mock_db_manager.get_connection = MagicMock()
            mock_db_manager.get_connection.return_value.__aenter__ = AsyncMock(return_value=mock_conn)
            mock_db_manager.get_connection.return_value.__aexit__ = AsyncMock(return_value=None)
            
            result = await conversation_service.get_conversation("non-existent-id")
            
            assert result is None


class TestAddMessage:
    @pytest.mark.asyncio
    async def test_add_message_without_tool_calls(self, conversation_service, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.lastrowid = 1
        mock_cursor.fetchone = AsyncMock(return_value={"id": "conv-1"})
        
        with patch('app.services.conversation_service.db_manager') as mock_db_manager:
            mock_db_manager.get_connection = MagicMock()
            mock_db_manager.get_connection.return_value.__aenter__ = AsyncMock(return_value=mock_conn)
            mock_db_manager.get_connection.return_value.__aexit__ = AsyncMock(return_value=None)
            
            result = await conversation_service.add_message(
                "conv-1",
                "user",
                "Hello, help me query the database"
            )
            
            assert result is not None
            assert result["role"] == "user"
            assert result["content"] == "Hello, help me query the database"
            assert result["tool_calls"] is None

    @pytest.mark.asyncio
    async def test_add_message_with_tool_calls(self, conversation_service, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.lastrowid = 2
        mock_cursor.fetchone = AsyncMock(return_value={"id": "conv-1"})
        
        tool_calls = [
            {
                "id": "tool-1",
                "tool": "list_tables",
                "input": {},
                "status": "completed",
                "output": '["users", "orders"]',
                "durationMs": 150
            }
        ]
        
        with patch('app.services.conversation_service.db_manager') as mock_db_manager:
            mock_db_manager.get_connection = MagicMock()
            mock_db_manager.get_connection.return_value.__aenter__ = AsyncMock(return_value=mock_conn)
            mock_db_manager.get_connection.return_value.__aexit__ = AsyncMock(return_value=None)
            
            result = await conversation_service.add_message(
                "conv-1",
                "assistant",
                "I found the tables.",
                tool_calls=tool_calls
            )
            
            assert result is not None
            assert result["role"] == "assistant"
            assert result["tool_calls"] == tool_calls

    @pytest.mark.asyncio
    async def test_add_message_to_nonexistent_conversation(self, conversation_service, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchone = AsyncMock(return_value=None)
        
        with patch('app.services.conversation_service.db_manager') as mock_db_manager:
            mock_db_manager.get_connection = MagicMock()
            mock_db_manager.get_connection.return_value.__aenter__ = AsyncMock(return_value=mock_conn)
            mock_db_manager.get_connection.return_value.__aexit__ = AsyncMock(return_value=None)
            
            result = await conversation_service.add_message(
                "non-existent",
                "user",
                "Hello"
            )
            
            assert result is None


class TestDeleteConversation:
    @pytest.mark.asyncio
    async def test_delete_conversation_success(self, conversation_service, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.rowcount = 1
        
        with patch('app.services.conversation_service.db_manager') as mock_db_manager:
            mock_db_manager.get_connection = MagicMock()
            mock_db_manager.get_connection.return_value.__aenter__ = AsyncMock(return_value=mock_conn)
            mock_db_manager.get_connection.return_value.__aexit__ = AsyncMock(return_value=None)
            
            result = await conversation_service.delete_conversation("conv-1")
            
            assert result is True

    @pytest.mark.asyncio
    async def test_delete_conversation_not_found(self, conversation_service, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.rowcount = 0
        
        with patch('app.services.conversation_service.db_manager') as mock_db_manager:
            mock_db_manager.get_connection = MagicMock()
            mock_db_manager.get_connection.return_value.__aenter__ = AsyncMock(return_value=mock_conn)
            mock_db_manager.get_connection.return_value.__aexit__ = AsyncMock(return_value=None)
            
            result = await conversation_service.delete_conversation("non-existent")
            
            assert result is False


class TestUpdateConversation:
    @pytest.mark.asyncio
    async def test_update_conversation_title(self, conversation_service, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.rowcount = 1
        
        mock_row = MagicMock()
        mock_row.keys = MagicMock(return_value=["id", "connection_id", "title", "created_at", "updated_at"])
        mock_row.__iter__ = MagicMock(return_value=iter(["conv-1", "test-db", "Updated Title", "2026-01-17", "2026-01-17"]))
        
        call_count = 0
        async def mock_fetchone():
            nonlocal call_count
            call_count += 1
            if call_count == 2:
                return mock_row
            return None
        
        mock_cursor.fetchone = mock_fetchone
        
        with patch('app.services.conversation_service.db_manager') as mock_db_manager:
            mock_db_manager.get_connection = MagicMock()
            mock_db_manager.get_connection.return_value.__aenter__ = AsyncMock(return_value=mock_conn)
            mock_db_manager.get_connection.return_value.__aexit__ = AsyncMock(return_value=None)
            
            result = await conversation_service.update_conversation("conv-1", "Updated Title")
            
            assert mock_conn.execute.called

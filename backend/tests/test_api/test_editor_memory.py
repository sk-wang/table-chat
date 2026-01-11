"""API tests for editor memory endpoints."""

import pytest
from datetime import datetime
from unittest.mock import AsyncMock, patch


class TestEditorMemoryAPI:
    """Test suite for editor memory API endpoints."""

    # === POST /api/v1/editor-memory tests ===

    def test_create_editor_memory_returns_201(self, test_client):
        """Test POST /api/v1/editor-memory returns 201 with created memory."""
        from app.models.editor_memory import EditorMemory

        mock_memory = EditorMemory(
            id=1,
            connection_id="test_conn_1",
            content="SELECT * FROM users;",
            created_at=datetime(2026, 1, 11, 10, 0, 0)
        )

        with patch("app.api.v1.editor_memory.editor_memory_service") as mock_service:
            mock_service.create_editor_memory = AsyncMock(return_value=mock_memory)

            response = test_client.post(
                "/api/v1/editor-memory",
                json={
                    "connectionId": "test_conn_1",
                    "content": "SELECT * FROM users;"
                }
            )

            assert response.status_code == 201
            data = response.json()
            assert data["id"] == 1
            assert data["connectionId"] == "test_conn_1"
            assert data["content"] == "SELECT * FROM users;"
            assert "createdAt" in data

    def test_create_editor_memory_with_empty_content(self, test_client):
        """Test POST /api/v1/editor-memory works with empty content."""
        from app.models.editor_memory import EditorMemory

        mock_memory = EditorMemory(
            id=2,
            connection_id="test_conn_1",
            content="",
            created_at=datetime(2026, 1, 11, 10, 5, 0)
        )

        with patch("app.api.v1.editor_memory.editor_memory_service") as mock_service:
            mock_service.create_editor_memory = AsyncMock(return_value=mock_memory)

            response = test_client.post(
                "/api/v1/editor-memory",
                json={"connectionId": "test_conn_1", "content": ""}
            )

            assert response.status_code == 201
            data = response.json()
            assert data["content"] == ""

    def test_create_editor_memory_returns_500_on_error(self, test_client):
        """Test POST /api/v1/editor-memory returns 500 on service error."""
        with patch("app.api.v1.editor_memory.editor_memory_service") as mock_service:
            mock_service.create_editor_memory = AsyncMock(
                side_effect=Exception("Database error")
            )

            response = test_client.post(
                "/api/v1/editor-memory",
                json={"connectionId": "test_conn_1", "content": "SELECT 1;"}
            )

            assert response.status_code == 500
            data = response.json()
            assert "Failed to create editor memory" in data["detail"]

    # === GET /api/v1/editor-memory/{connection_id} tests ===

    def test_get_editor_memories_by_connection_returns_200(self, test_client):
        """Test GET /api/v1/editor-memory/{connection_id} returns 200 with list."""
        from app.models.editor_memory import EditorMemory, EditorMemoryList

        mock_memories = EditorMemoryList(
            items=[
                EditorMemory(
                    id=1,
                    connection_id="test_conn_1",
                    content="SELECT * FROM users;",
                    created_at=datetime(2026, 1, 11, 10, 0, 0)
                ),
                EditorMemory(
                    id=2,
                    connection_id="test_conn_1",
                    content="SELECT COUNT(*) FROM orders;",
                    created_at=datetime(2026, 1, 11, 10, 5, 0)
                ),
            ],
            total=2
        )

        with patch("app.api.v1.editor_memory.editor_memory_service") as mock_service:
            mock_service.get_editor_memories_by_connection = AsyncMock(
                return_value=mock_memories
            )

            response = test_client.get("/api/v1/editor-memory/test_conn_1")

            assert response.status_code == 200
            data = response.json()
            assert "items" in data
            assert len(data["items"]) == 2
            assert data["total"] == 2
            assert data["items"][0]["content"] == "SELECT * FROM users;"
            assert data["items"][1]["content"] == "SELECT COUNT(*) FROM orders;"

    def test_get_editor_memories_by_connection_returns_empty_list(self, test_client):
        """Test GET /api/v1/editor-memory/{connection_id} returns empty list."""
        from app.models.editor_memory import EditorMemoryList

        mock_memories = EditorMemoryList(items=[], total=0)

        with patch("app.api.v1.editor_memory.editor_memory_service") as mock_service:
            mock_service.get_editor_memories_by_connection = AsyncMock(
                return_value=mock_memories
            )

            response = test_client.get("/api/v1/editor-memory/nonexistent_conn")

            assert response.status_code == 200
            data = response.json()
            assert data["items"] == []
            assert data["total"] == 0

    def test_get_editor_memories_by_connection_returns_500_on_error(self, test_client):
        """Test GET /api/v1/editor-memory/{connection_id} returns 500 on error."""
        with patch("app.api.v1.editor_memory.editor_memory_service") as mock_service:
            mock_service.get_editor_memories_by_connection = AsyncMock(
                side_effect=Exception("Database error")
            )

            response = test_client.get("/api/v1/editor-memory/test_conn_1")

            assert response.status_code == 500
            data = response.json()
            assert "Failed to get editor memories" in data["detail"]

    # === GET /api/v1/editor-memory/latest/{connection_id} tests ===

    def test_get_latest_editor_memory_returns_200_with_memory(self, test_client):
        """Test GET /api/v1/editor-memory/latest/{connection_id} returns latest."""
        from app.models.editor_memory import EditorMemory

        mock_memory = EditorMemory(
            id=99,
            connection_id="test_conn_1",
            content="SELECT * FROM latest_table;",
            created_at=datetime(2026, 1, 11, 12, 0, 0)
        )

        with patch("app.api.v1.editor_memory.editor_memory_service") as mock_service:
            mock_service.get_latest_editor_memory = AsyncMock(return_value=mock_memory)

            response = test_client.get("/api/v1/editor-memory/latest/test_conn_1")

            assert response.status_code == 200
            data = response.json()
            assert data["id"] == 99
            assert data["content"] == "SELECT * FROM latest_table;"

    def test_get_latest_editor_memory_returns_200_with_null(self, test_client):
        """Test GET /api/v1/editor-memory/latest/{connection_id} returns null when none."""
        with patch("app.api.v1.editor_memory.editor_memory_service") as mock_service:
            mock_service.get_latest_editor_memory = AsyncMock(return_value=None)

            response = test_client.get("/api/v1/editor-memory/latest/nonexistent_conn")

            assert response.status_code == 200
            assert response.json() is None

    def test_get_latest_editor_memory_returns_500_on_error(self, test_client):
        """Test GET /api/v1/editor-memory/latest/{connection_id} returns 500 on error."""
        with patch("app.api.v1.editor_memory.editor_memory_service") as mock_service:
            mock_service.get_latest_editor_memory = AsyncMock(
                side_effect=Exception("Database error")
            )

            response = test_client.get("/api/v1/editor-memory/latest/test_conn_1")

            assert response.status_code == 500
            data = response.json()
            assert "Failed to get latest editor memory" in data["detail"]

    # === DELETE /api/v1/editor-memory/{record_id} tests ===

    def test_delete_editor_memory_returns_200_on_success(self, test_client):
        """Test DELETE /api/v1/editor-memory/{record_id} returns 200."""
        with patch("app.api.v1.editor_memory.editor_memory_service") as mock_service:
            mock_service.delete_editor_memory = AsyncMock(return_value=True)

            response = test_client.delete("/api/v1/editor-memory/123")

            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert "已删除" in data["message"]

    def test_delete_editor_memory_returns_404_when_not_found(self, test_client):
        """Test DELETE /api/v1/editor-memory/{record_id} returns 404 when not found."""
        with patch("app.api.v1.editor_memory.editor_memory_service") as mock_service:
            mock_service.delete_editor_memory = AsyncMock(return_value=False)

            response = test_client.delete("/api/v1/editor-memory/999")

            assert response.status_code == 404
            data = response.json()
            assert "not found" in data["detail"]

    def test_delete_editor_memory_returns_500_on_error(self, test_client):
        """Test DELETE /api/v1/editor-memory/{record_id} returns 500 on error."""
        with patch("app.api.v1.editor_memory.editor_memory_service") as mock_service:
            mock_service.delete_editor_memory = AsyncMock(
                side_effect=Exception("Database error")
            )

            response = test_client.delete("/api/v1/editor-memory/123")

            assert response.status_code == 500
            data = response.json()
            assert "Failed to delete editor memory" in data["detail"]

    # === DELETE /api/v1/editor-memory/connection/{connection_id} tests ===

    def test_delete_all_editor_memories_by_connection_returns_200(self, test_client):
        """Test DELETE /api/v1/editor-memory/connection/{connection_id} returns 200."""
        with patch("app.api.v1.editor_memory.editor_memory_service") as mock_service:
            mock_service.delete_all_editor_memories_by_connection = AsyncMock(
                return_value=5
            )

            response = test_client.delete("/api/v1/editor-memory/connection/test_conn_1")

            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert "已清空" in data["message"]
            assert data["deletedCount"] == 5

    def test_delete_all_editor_memories_by_connection_returns_zero_count(self, test_client):
        """Test DELETE /api/v1/editor-memory/connection/{connection_id} with zero count."""
        with patch("app.api.v1.editor_memory.editor_memory_service") as mock_service:
            mock_service.delete_all_editor_memories_by_connection = AsyncMock(return_value=0)

            response = test_client.delete("/api/v1/editor-memory/connection/empty_conn")

            assert response.status_code == 200
            data = response.json()
            assert data["deletedCount"] == 0

    def test_delete_all_editor_memories_by_connection_returns_500_on_error(self, test_client):
        """Test DELETE /api/v1/editor-memory/connection/{connection_id} returns 500 on error."""
        with patch("app.api.v1.editor_memory.editor_memory_service") as mock_service:
            mock_service.delete_all_editor_memories_by_connection = AsyncMock(
                side_effect=Exception("Database error")
            )

            response = test_client.delete("/api/v1/editor-memory/connection/test_conn_1")

            assert response.status_code == 500
            data = response.json()
            assert "Failed to delete all editor memories" in data["detail"]

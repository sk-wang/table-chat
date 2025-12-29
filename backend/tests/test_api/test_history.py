"""API tests for history endpoints."""

import pytest
from unittest.mock import AsyncMock, patch
from datetime import datetime


class TestHistoryAPI:
    """Test suite for history API endpoints."""

    # === GET /dbs/{name}/history tests ===

    def test_list_history_returns_200_with_items(self, test_client):
        """Test GET /dbs/{name}/history returns 200 with items."""
        mock_items = [
            {
                "id": 1,
                "db_name": "test_db",
                "sql_content": "SELECT * FROM users",
                "natural_query": None,
                "row_count": 10,
                "execution_time_ms": 42,
                "executed_at": datetime(2025, 12, 29, 10, 0, 0),
            },
        ]
        
        with patch("app.api.v1.history.db_manager") as mock_db, \
             patch("app.api.v1.history.history_service") as mock_service:
            
            # Mock database exists check
            mock_db.get_database = AsyncMock(return_value={"name": "test_db"})
            # Mock list_history
            mock_service.list_history = AsyncMock(
                return_value=(mock_items, 1, False, None)
            )
            
            response = test_client.get("/api/v1/dbs/test_db/history")
            
            assert response.status_code == 200
            data = response.json()
            assert "items" in data
            assert len(data["items"]) == 1
            assert data["items"][0]["sqlContent"] == "SELECT * FROM users"
            assert data["total"] == 1
            assert data["hasMore"] is False

    def test_list_history_pagination_works(self, test_client):
        """Test pagination works correctly."""
        mock_items = [
            {
                "id": i,
                "db_name": "test_db",
                "sql_content": f"SELECT {i}",
                "natural_query": None,
                "row_count": 1,
                "execution_time_ms": 5,
                "executed_at": datetime(2025, 12, 29, 10, i, 0),
            }
            for i in range(20)
        ]
        
        with patch("app.api.v1.history.db_manager") as mock_db, \
             patch("app.api.v1.history.history_service") as mock_service:
            
            mock_db.get_database = AsyncMock(return_value={"name": "test_db"})
            mock_service.list_history = AsyncMock(
                return_value=(mock_items[:10], 20, True, "2025-12-29T10:09:00")
            )
            
            response = test_client.get("/api/v1/dbs/test_db/history?limit=10")
            
            assert response.status_code == 200
            data = response.json()
            assert len(data["items"]) == 10
            assert data["hasMore"] is True
            assert data["nextCursor"] == "2025-12-29T10:09:00"

    def test_list_history_with_before_cursor(self, test_client):
        """Test pagination with before cursor."""
        mock_items = [
            {
                "id": 1,
                "db_name": "test_db",
                "sql_content": "SELECT 1",
                "natural_query": None,
                "row_count": 1,
                "execution_time_ms": 5,
                "executed_at": datetime(2025, 12, 29, 10, 0, 0),
            },
        ]
        
        with patch("app.api.v1.history.db_manager") as mock_db, \
             patch("app.api.v1.history.history_service") as mock_service:
            
            mock_db.get_database = AsyncMock(return_value={"name": "test_db"})
            mock_service.list_history = AsyncMock(
                return_value=(mock_items, 5, False, None)
            )
            
            response = test_client.get(
                "/api/v1/dbs/test_db/history?before=2025-12-29T10:30:00"
            )
            
            assert response.status_code == 200
            mock_service.list_history.assert_called_once()
            call_kwargs = mock_service.list_history.call_args.kwargs
            assert call_kwargs["before"] == "2025-12-29T10:30:00"

    def test_list_history_404_when_database_not_found(self, test_client):
        """Test 404 when database not found."""
        with patch("app.api.v1.history.db_manager") as mock_db:
            mock_db.get_database = AsyncMock(return_value=None)
            
            response = test_client.get("/api/v1/dbs/nonexistent/history")
            
            assert response.status_code == 404
            assert "not found" in response.json()["detail"].lower()

    # === GET /dbs/{name}/history/search tests ===

    def test_search_history_returns_matches(self, test_client):
        """Test GET /dbs/{name}/history/search returns matches."""
        mock_items = [
            {
                "id": 1,
                "db_name": "test_db",
                "sql_content": "SELECT * FROM users WHERE name = 'test'",
                "natural_query": None,
                "row_count": 5,
                "execution_time_ms": 30,
                "executed_at": datetime(2025, 12, 29, 10, 0, 0),
            },
        ]
        
        with patch("app.api.v1.history.db_manager") as mock_db, \
             patch("app.api.v1.history.history_service") as mock_service:
            
            mock_db.get_database = AsyncMock(return_value={"name": "test_db"})
            mock_service.search_history = AsyncMock(return_value=(mock_items, 1))
            
            response = test_client.get(
                "/api/v1/dbs/test_db/history/search?query=users"
            )
            
            assert response.status_code == 200
            data = response.json()
            assert len(data["items"]) == 1
            assert "users" in data["items"][0]["sqlContent"]
            assert data["total"] == 1

    def test_search_history_400_when_query_empty(self, test_client):
        """Test 400 when query param is empty."""
        with patch("app.api.v1.history.db_manager") as mock_db:
            mock_db.get_database = AsyncMock(return_value={"name": "test_db"})
            
            response = test_client.get("/api/v1/dbs/test_db/history/search?query=")
            
            assert response.status_code == 422  # Validation error

    def test_search_history_400_when_query_missing(self, test_client):
        """Test 400 when query param is missing."""
        with patch("app.api.v1.history.db_manager") as mock_db:
            mock_db.get_database = AsyncMock(return_value={"name": "test_db"})
            
            response = test_client.get("/api/v1/dbs/test_db/history/search")
            
            assert response.status_code == 422  # Validation error

    def test_search_history_404_when_database_not_found(self, test_client):
        """Test 404 when database not found for search."""
        with patch("app.api.v1.history.db_manager") as mock_db:
            mock_db.get_database = AsyncMock(return_value=None)
            
            response = test_client.get(
                "/api/v1/dbs/nonexistent/history/search?query=test"
            )
            
            assert response.status_code == 404
            assert "not found" in response.json()["detail"].lower()

    def test_search_history_with_chinese_keyword(self, test_client):
        """Test search with Chinese keyword."""
        mock_items = [
            {
                "id": 1,
                "db_name": "test_db",
                "sql_content": "SELECT * FROM users",
                "natural_query": "查询所有用户",
                "row_count": 100,
                "execution_time_ms": 50,
                "executed_at": datetime(2025, 12, 29, 10, 0, 0),
            },
        ]
        
        with patch("app.api.v1.history.db_manager") as mock_db, \
             patch("app.api.v1.history.history_service") as mock_service:
            
            mock_db.get_database = AsyncMock(return_value={"name": "test_db"})
            mock_service.search_history = AsyncMock(return_value=(mock_items, 1))
            
            response = test_client.get(
                "/api/v1/dbs/test_db/history/search?query=用户"
            )
            
            assert response.status_code == 200
            data = response.json()
            assert len(data["items"]) == 1
            assert data["items"][0]["naturalQuery"] == "查询所有用户"

    def test_search_history_returns_empty_for_no_matches(self, test_client):
        """Test search returns empty for no matches."""
        with patch("app.api.v1.history.db_manager") as mock_db, \
             patch("app.api.v1.history.history_service") as mock_service:
            
            mock_db.get_database = AsyncMock(return_value={"name": "test_db"})
            mock_service.search_history = AsyncMock(return_value=([], 0))
            
            response = test_client.get(
                "/api/v1/dbs/test_db/history/search?query=nonexistent"
            )
            
            assert response.status_code == 200
            data = response.json()
            assert len(data["items"]) == 0
            assert data["total"] == 0


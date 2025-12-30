"""Unit tests for Agent API endpoints."""

import json
from unittest.mock import AsyncMock, patch, MagicMock

import pytest


class TestAgentStatusEndpoint:
    """Test suite for GET /agent/status endpoint."""

    def test_agent_status_endpoint_returns_200(self, test_client):
        """Test agent status endpoint returns 200."""
        response = test_client.get("/api/v1/agent/status")
        
        assert response.status_code == 200
        data = response.json()
        assert "available" in data
        assert "configured" in data

    def test_agent_status_response_structure(self, test_client):
        """Test agent status response has correct structure."""
        response = test_client.get("/api/v1/agent/status")
        
        assert response.status_code == 200
        data = response.json()
        # Should have these fields
        assert isinstance(data.get("available"), bool)
        assert isinstance(data.get("configured"), bool)
        # model can be None or string
        assert data.get("model") is None or isinstance(data.get("model"), str)


class TestAgentQueryEndpoint:
    """Test suite for POST /dbs/{name}/agent/query endpoint."""

    def test_agent_query_empty_prompt(self, test_client):
        """Test agent query with empty prompt."""
        response = test_client.post(
            "/api/v1/dbs/testdb/agent/query",
            json={"prompt": ""}
        )
        
        assert response.status_code == 422  # Validation error

    def test_agent_query_whitespace_prompt(self, test_client):
        """Test agent query with whitespace-only prompt."""
        response = test_client.post(
            "/api/v1/dbs/testdb/agent/query",
            json={"prompt": "   "}
        )
        
        assert response.status_code == 400

    def test_agent_query_database_not_found(self, test_client):
        """Test agent query with non-existent database."""
        # Use a database name that definitely doesn't exist
        response = test_client.post(
            "/api/v1/dbs/nonexistent_db_xyz_12345/agent/query",
            json={"prompt": "查询用户表"}
        )
        
        assert response.status_code == 404


class TestAgentCancelEndpoint:
    """Test suite for POST /dbs/{name}/agent/cancel endpoint."""

    def test_agent_cancel_no_active_task(self, test_client):
        """Test cancelling when no active task."""
        with patch("app.api.v1.agent.agent_service") as mock_agent:
            mock_agent.cancel_task.return_value = False
            
            response = test_client.post("/api/v1/dbs/testdb/agent/cancel")
            
            assert response.status_code == 200
            data = response.json()
            assert data["cancelled"] is False

    def test_agent_cancel_active_task(self, test_client):
        """Test cancelling an active task."""
        with patch("app.api.v1.agent.agent_service") as mock_agent:
            mock_agent.cancel_task.return_value = True
            
            response = test_client.post("/api/v1/dbs/testdb/agent/cancel")
            
            assert response.status_code == 200
            data = response.json()
            assert data["cancelled"] is True


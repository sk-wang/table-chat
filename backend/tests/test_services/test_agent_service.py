"""Unit tests for Agent service using Anthropic Python client."""

from unittest.mock import AsyncMock, MagicMock, patch, PropertyMock

import pytest

from app.services.agent_service import AgentService, agent_service


class TestAgentServiceSQLExtraction:
    """Test suite for SQL extraction from agent responses."""

    def test_extract_sql_from_code_block(self):
        """Test extracting SQL from markdown code block."""
        service = AgentService()
        
        text = """Here's the query:
```sql
SELECT * FROM users WHERE active = true
```
This will return all active users."""
        
        result = service._extract_sql(text)
        assert result == "SELECT * FROM users WHERE active = true"

    def test_extract_sql_from_plain_code_block(self):
        """Test extracting SQL from plain code block."""
        service = AgentService()
        
        text = """The query:
```
SELECT id, name FROM products
```"""
        
        result = service._extract_sql(text)
        assert result == "SELECT id, name FROM products"

    def test_extract_sql_no_code_block(self):
        """Test no extraction when no code block present."""
        service = AgentService()
        
        text = "Here's a description without any SQL."
        
        result = service._extract_sql(text)
        assert result is None

    def test_extract_sql_case_insensitive(self):
        """Test SQL extraction is case insensitive."""
        service = AgentService()
        
        text = """```SQL
select * from orders
```"""
        
        result = service._extract_sql(text)
        assert result == "select * from orders"

    def test_extract_ddl_statement(self):
        """Test extracting DDL statements."""
        service = AgentService()
        
        text = """```sql
CREATE INDEX idx_user_email ON users(email)
```"""
        
        result = service._extract_sql(text)
        assert result == "CREATE INDEX idx_user_email ON users(email)"

    def test_extract_sql_multiline(self):
        """Test extracting multiline SQL."""
        service = AgentService()
        
        text = """```sql
SELECT u.id, u.name, COUNT(o.id) as order_count
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.name
```"""
        
        result = service._extract_sql(text)
        assert "SELECT" in result
        assert "LEFT JOIN" in result
        assert "GROUP BY" in result


class TestAgentServiceCancellation:
    """Test suite for Agent task cancellation."""

    def test_cancel_task_returns_true(self):
        """Test cancelling task returns True (handled by SSE connection)."""
        service = AgentService()
        result = service.cancel_task("testdb")
        assert result is True


@pytest.mark.asyncio
class TestAgentServiceRunAgent:
    """Test suite for Agent service run_agent method."""

    async def test_run_agent_not_configured_emits_error(self):
        """Test run_agent emits error when not configured."""
        service = AgentService()
        
        with patch.object(AgentService, 'is_available', new_callable=PropertyMock) as mock_available:
            mock_available.return_value = False
            
            events = []
            async for event in service.run_agent("testdb", "test query"):
                events.append(event)
            
            # Should have error event
            error_events = [e for e in events if e.get("event") == "error"]
            assert len(error_events) >= 1
            
            error_data = error_events[0]["data"]
            assert "未配置" in error_data.get("error", "")

    async def test_run_agent_anthropic_not_installed_emits_error(self):
        """Test run_agent emits error when Anthropic client is not installed."""
        service = AgentService()
        
        with patch.object(AgentService, 'is_available', new_callable=PropertyMock) as mock_available:
            mock_available.return_value = True
            
            # Mock _get_client to return None
            with patch.object(service, '_get_client', return_value=None):
                events = []
                async for event in service.run_agent("testdb", "test query"):
                    events.append(event)
                
                # Should have error event about client not installed
                error_events = [e for e in events if e.get("event") == "error"]
                assert len(error_events) >= 1
                
                error_data = error_events[0]["data"]
                assert "未安装" in error_data.get("error", "")

    async def test_run_agent_done_event_structure(self):
        """Test run_agent done event has correct structure."""
        service = AgentService()
        
        with patch.object(AgentService, 'is_available', new_callable=PropertyMock) as mock_available:
            mock_available.return_value = False
            
            events = []
            async for event in service.run_agent("testdb", "test"):
                events.append(event)
            
            # Find done event
            done_events = [e for e in events if e.get("event") == "done"]
            assert len(done_events) == 1
            
            done_data = done_events[0]["data"]
            assert "total_time_ms" in done_data
            assert "tool_calls_count" in done_data
            assert isinstance(done_data["total_time_ms"], int)
            assert isinstance(done_data["tool_calls_count"], int)

    async def test_run_agent_thinking_event_first(self):
        """Test run_agent emits thinking event first."""
        service = AgentService()
        
        with patch.object(AgentService, 'is_available', new_callable=PropertyMock) as mock_available:
            mock_available.return_value = False
            
            events = []
            async for event in service.run_agent("testdb", "test"):
                events.append(event)
            
            # First event should be thinking
            assert events[0].get("event") == "thinking"
            thinking_data = events[0]["data"]
            assert "status" in thinking_data
            assert "message" in thinking_data


class TestAgentServiceGlobalInstance:
    """Test suite for global agent_service instance."""

    def test_global_instance_exists(self):
        """Test global instance is created."""
        assert agent_service is not None
        assert isinstance(agent_service, AgentService)

    def test_global_instance_has_methods(self):
        """Test global instance has expected methods."""
        assert hasattr(agent_service, "run_agent")
        assert hasattr(agent_service, "cancel_task")
        assert hasattr(agent_service, "is_available")
        assert hasattr(agent_service, "_extract_sql")
        assert hasattr(agent_service, "_get_client")

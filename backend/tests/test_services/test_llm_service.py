"""Unit tests for llm_service module."""

import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.llm_service import LLMService


class TestLLMService:
    """Test suite for LLMService."""

    @pytest.fixture
    def service(self):
        """Create a fresh LLMService instance."""
        return LLMService()

    def test_is_available_when_configured(self, service):
        """Test is_available returns True when API key is set."""
        with patch("app.services.llm_service.settings") as mock_settings:
            mock_settings.is_llm_configured = True

            assert service.is_available is True

    def test_is_available_when_not_configured(self, service):
        """Test is_available returns False when API key is not set."""
        with patch("app.services.llm_service.settings") as mock_settings:
            mock_settings.is_llm_configured = False

            assert service.is_available is False

    def test_client_raises_when_not_configured(self, service):
        """Test client property raises ValueError when not configured."""
        with patch("app.services.llm_service.settings") as mock_settings:
            mock_settings.is_llm_configured = False

            with pytest.raises(ValueError, match="LLM API is not configured"):
                _ = service.client

    def test_client_creates_openai_instance(self, service):
        """Test client creates OpenAI instance when configured."""
        with patch("app.services.llm_service.settings") as mock_settings, \
             patch("app.services.llm_service.OpenAI") as mock_openai:
            mock_settings.is_llm_configured = True
            mock_settings.effective_llm_api_key = "test-key"
            mock_settings.effective_llm_api_base = "https://api.openai.com/v1"

            client = service.client

            mock_openai.assert_called_once_with(
                api_key="test-key",
                base_url="https://api.openai.com/v1",
            )

    @pytest.mark.asyncio
    async def test_build_schema_context_no_database(self, service):
        """Test build_schema_context returns message when database not found."""
        with patch("app.services.llm_service.database_manager") as mock_mgr:
            mock_mgr.get_database = AsyncMock(return_value=None)

            result = await service.build_schema_context("testdb")

            assert "No schema information available" in result

    @pytest.mark.asyncio
    async def test_build_schema_context_no_tables(self, service):
        """Test build_schema_context returns message when no tables found."""
        with patch("app.services.llm_service.database_manager") as mock_mgr, \
             patch("app.services.llm_service.db_manager") as mock_db:
            mock_mgr.get_database = AsyncMock(return_value={"name": "testdb"})
            mock_db.get_metadata_for_database = AsyncMock(return_value=[])

            result = await service.build_schema_context("testdb")

            assert "No tables found" in result

    @pytest.mark.asyncio
    async def test_build_schema_context_with_tables(self, service):
        """Test build_schema_context builds proper schema description."""
        mock_metadata = [
            {
                "schema_name": "public",
                "table_name": "users",
                "table_type": "table",
                "columns": [
                    {"name": "id", "dataType": "integer", "isNullable": False, "isPrimaryKey": True},
                    {"name": "name", "dataType": "varchar", "isNullable": True, "isPrimaryKey": False},
                ],
            }
        ]

        with patch("app.services.llm_service.database_manager") as mock_mgr, \
             patch("app.services.llm_service.db_manager") as mock_db:
            mock_mgr.get_database = AsyncMock(return_value={"name": "testdb"})
            mock_db.get_metadata_for_database = AsyncMock(return_value=mock_metadata)

            result = await service.build_schema_context("testdb")

            assert "Database Schema:" in result
            assert "public.users" in result
            assert "id: integer" in result
            assert "PRIMARY KEY" in result
            assert "name: varchar" in result

    @pytest.mark.asyncio
    async def test_generate_sql_success(self, service):
        """Test generate_sql returns SQL and explanation."""
        mock_response = MagicMock()
        mock_response.choices = [
            MagicMock(
                message=MagicMock(
                    content='{"sql": "SELECT * FROM users", "explanation": "查询所有用户"}'
                )
            )
        ]

        with patch.object(service, "build_schema_context", new_callable=AsyncMock) as mock_schema, \
             patch.object(service, "_client", create=True) as mock_client:
            mock_schema.return_value = "Schema info"
            mock_client.chat.completions.create.return_value = mock_response
            service._client = mock_client

            sql, explanation = await service.generate_sql("testdb", "查询所有用户")

            assert sql == "SELECT * FROM users"
            assert explanation == "查询所有用户"

    @pytest.mark.asyncio
    async def test_generate_sql_handles_markdown_code_block(self, service):
        """Test generate_sql strips markdown code blocks from response."""
        mock_response = MagicMock()
        mock_response.choices = [
            MagicMock(
                message=MagicMock(
                    content='```json\n{"sql": "SELECT 1", "explanation": "test"}\n```'
                )
            )
        ]

        with patch.object(service, "build_schema_context", new_callable=AsyncMock) as mock_schema, \
             patch.object(service, "_client", create=True) as mock_client:
            mock_schema.return_value = "Schema info"
            mock_client.chat.completions.create.return_value = mock_response
            service._client = mock_client

            sql, explanation = await service.generate_sql("testdb", "test")

            assert sql == "SELECT 1"

    @pytest.mark.asyncio
    async def test_generate_sql_handles_raw_sql_response(self, service):
        """Test generate_sql handles non-JSON raw SQL response."""
        mock_response = MagicMock()
        mock_response.choices = [
            MagicMock(
                message=MagicMock(content="SELECT * FROM users WHERE id = 1")
            )
        ]

        with patch.object(service, "build_schema_context", new_callable=AsyncMock) as mock_schema, \
             patch.object(service, "_client", create=True) as mock_client:
            mock_schema.return_value = "Schema info"
            mock_client.chat.completions.create.return_value = mock_response
            service._client = mock_client

            sql, explanation = await service.generate_sql("testdb", "查询用户1")

            assert sql == "SELECT * FROM users WHERE id = 1"
            assert explanation is None

    @pytest.mark.asyncio
    async def test_generate_sql_rejects_non_select(self, service):
        """Test generate_sql raises error for non-SELECT queries."""
        mock_response = MagicMock()
        mock_response.choices = [
            MagicMock(
                message=MagicMock(
                    content='{"sql": "DELETE FROM users", "explanation": "删除用户"}'
                )
            )
        ]

        with patch.object(service, "build_schema_context", new_callable=AsyncMock) as mock_schema, \
             patch.object(service, "_client", create=True) as mock_client:
            mock_schema.return_value = "Schema info"
            mock_client.chat.completions.create.return_value = mock_response
            service._client = mock_client

            with pytest.raises(ValueError, match="not a SELECT statement"):
                await service.generate_sql("testdb", "删除用户")

    @pytest.mark.asyncio
    async def test_generate_sql_empty_response(self, service):
        """Test generate_sql raises error for empty response."""
        mock_response = MagicMock()
        mock_response.choices = [
            MagicMock(message=MagicMock(content=None))
        ]

        with patch.object(service, "build_schema_context", new_callable=AsyncMock) as mock_schema, \
             patch.object(service, "_client", create=True) as mock_client:
            mock_schema.return_value = "Schema info"
            mock_client.chat.completions.create.return_value = mock_response
            service._client = mock_client

            with pytest.raises(ValueError, match="Empty response from LLM"):
                await service.generate_sql("testdb", "test")

    @pytest.mark.asyncio
    async def test_generate_sql_api_error(self, service):
        """Test generate_sql raises error when API fails."""
        with patch.object(service, "build_schema_context", new_callable=AsyncMock) as mock_schema, \
             patch.object(service, "_client", create=True) as mock_client:
            mock_schema.return_value = "Schema info"
            mock_client.chat.completions.create.side_effect = Exception("API Error")
            service._client = mock_client

            with pytest.raises(ValueError, match="LLM generation failed"):
                await service.generate_sql("testdb", "test")

"""Unit tests for llm_service module."""

import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.llm_service import (
    LLMService,
    TABLE_SELECTION_THRESHOLD,
    MAX_SELECTED_TABLES,
    PHASE1_MAX_TOKENS,
    strip_think_tags,
)


class TestStripThinkTags:
    """Test suite for strip_think_tags helper function."""

    def test_strip_think_tags_removes_think_block(self):
        """Test that <think>...</think> block is removed from the beginning."""
        content = '<think>这是思考过程...</think>{"sql": "SELECT 1"}'
        result = strip_think_tags(content)
        assert result == '{"sql": "SELECT 1"}'

    def test_strip_think_tags_with_leading_whitespace(self):
        """Test that leading whitespace before <think> is handled."""
        content = '  \n<think>思考过程</think>{"sql": "SELECT 1"}'
        result = strip_think_tags(content)
        assert result == '{"sql": "SELECT 1"}'

    def test_strip_think_tags_with_multiline_content(self):
        """Test strip_think_tags handles multiline think content."""
        content = """<think>用户现在需要根据请求"报价全国不统一的测试项目"生成SQL查询。

首先分析需求：要找的是测试项目的报价，全国不统一。
现在构建JSON对象。</think>
{"sql": "SELECT * FROM test", "explanation": "test"}"""
        result = strip_think_tags(content)
        assert result.strip().startswith('{"sql":')
        assert "<think>" not in result

    def test_strip_think_tags_with_markdown_json(self):
        """Test strip_think_tags with think tags followed by markdown code block."""
        content = """<think>推理过程...</think>
```json
{"sql": "SELECT * FROM users", "explanation": "查询用户"}
```"""
        result = strip_think_tags(content)
        assert result.strip().startswith("```json")
        assert "<think>" not in result

    def test_strip_think_tags_preserves_content_without_tags(self):
        """Test strip_think_tags returns original content when no think tags."""
        content = '{"sql": "SELECT 1", "explanation": "test"}'
        result = strip_think_tags(content)
        assert result == content

    def test_strip_think_tags_preserves_markdown_without_tags(self):
        """Test strip_think_tags preserves markdown code block without think tags."""
        content = '```json\n{"sql": "SELECT 1"}\n```'
        result = strip_think_tags(content)
        assert result == content

    def test_strip_think_tags_only_removes_first_block(self):
        """Test strip_think_tags only removes the first <think> block."""
        content = '<think>first</think><think>second</think>{"sql": "SELECT 1"}'
        result = strip_think_tags(content)
        assert result == '<think>second</think>{"sql": "SELECT 1"}'

    def test_strip_think_tags_unclosed_tag_raises_error(self):
        """Test strip_think_tags raises error for truncated output (unclosed <think> tag)."""
        content = '<think>未闭合的思考标签，模型输出被截断了...'
        with pytest.raises(ValueError, match="truncated"):
            strip_think_tags(content)

    def test_strip_think_tags_with_json_in_think_block(self):
        """Test strip_think_tags correctly handles JSON-like content inside think block."""
        content = '<think>比如: {"key": "value"} 这是示例</think>{"sql": "SELECT 1"}'
        result = strip_think_tags(content)
        assert result == '{"sql": "SELECT 1"}'

    def test_strip_think_tags_very_long_think_content(self):
        """Test strip_think_tags handles very long think content."""
        long_reasoning = "这是很长的推理过程。" * 1000  # ~10KB of content
        content = f'<think>{long_reasoning}</think>{{"sql": "SELECT 1"}}'
        result = strip_think_tags(content)
        assert result == '{"sql": "SELECT 1"}'
        assert "<think>" not in result


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
             patch("app.db.sqlite.db_manager") as mock_db:
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
             patch("app.db.sqlite.db_manager") as mock_db:
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

            sql, explanation, export_format = await service.generate_sql("testdb", "查询所有用户")

            assert sql == "SELECT * FROM users"
            assert explanation == "查询所有用户"
            assert export_format is None

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

            sql, explanation, export_format = await service.generate_sql("testdb", "test")

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

            sql, explanation, export_format = await service.generate_sql("testdb", "查询用户1")

            assert sql == "SELECT * FROM users WHERE id = 1"
            assert explanation is None
            assert export_format is None

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

    @pytest.mark.asyncio
    async def test_generate_sql_mysql_dialect(self, service):
        """Test generate_sql uses MySQL dialect when db_type is mysql."""
        mock_response = MagicMock()
        mock_response.choices = [
            MagicMock(
                message=MagicMock(
                    content='{"sql": "SELECT * FROM `users` WHERE `id` = 1", "explanation": "查询用户1"}'
                )
            )
        ]

        with patch.object(service, "build_schema_context", new_callable=AsyncMock) as mock_schema, \
             patch.object(service, "_client", create=True) as mock_client:
            mock_schema.return_value = "Schema info"
            mock_client.chat.completions.create.return_value = mock_response
            service._client = mock_client

            # Call with mysql dialect
            sql, explanation, export_format = await service.generate_sql("testdb", "查询用户1", db_type="mysql")

            assert sql == "SELECT * FROM `users` WHERE `id` = 1"
            assert explanation == "查询用户1"

            # Verify the MySQL prompt was used
            call_args = mock_client.chat.completions.create.call_args
            messages = call_args.kwargs.get("messages", [])
            system_message = messages[0]["content"] if messages else ""
            assert "MySQL" in system_message
            assert "`users`" in system_message or "backtick" in system_message.lower()

    @pytest.mark.asyncio
    async def test_generate_sql_postgresql_dialect(self, service):
        """Test generate_sql uses PostgreSQL dialect when db_type is postgresql."""
        mock_response = MagicMock()
        mock_response.choices = [
            MagicMock(
                message=MagicMock(
                    content='{"sql": "SELECT * FROM public.users WHERE id = 1", "explanation": "查询用户1"}'
                )
            )
        ]

        with patch.object(service, "build_schema_context", new_callable=AsyncMock) as mock_schema, \
             patch.object(service, "_client", create=True) as mock_client:
            mock_schema.return_value = "Schema info"
            mock_client.chat.completions.create.return_value = mock_response
            service._client = mock_client

            # Call with postgresql dialect (default)
            sql, explanation, export_format = await service.generate_sql("testdb", "查询用户1", db_type="postgresql")

            assert sql == "SELECT * FROM public.users WHERE id = 1"
            assert explanation == "查询用户1"

            # Verify the PostgreSQL prompt was used
            call_args = mock_client.chat.completions.create.call_args
            messages = call_args.kwargs.get("messages", [])
            system_message = messages[0]["content"] if messages else ""
            assert "PostgreSQL" in system_message

    @pytest.mark.asyncio
    async def test_generate_sql_handles_think_tags_with_json(self, service):
        """Test generate_sql strips <think> tags before parsing JSON."""
        mock_response = MagicMock()
        mock_response.choices = [
            MagicMock(
                message=MagicMock(
                    content='<think>用户需要查询用户表...</think>{"sql": "SELECT * FROM users", "explanation": "查询所有用户"}'
                )
            )
        ]

        with patch.object(service, "build_schema_context", new_callable=AsyncMock) as mock_schema, \
             patch.object(service, "_client", create=True) as mock_client:
            mock_schema.return_value = "Schema info"
            mock_client.chat.completions.create.return_value = mock_response
            service._client = mock_client

            sql, explanation, export_format = await service.generate_sql("testdb", "查询所有用户")

            assert sql == "SELECT * FROM users"
            assert explanation == "查询所有用户"

    @pytest.mark.asyncio
    async def test_generate_sql_handles_think_tags_with_markdown(self, service):
        """Test generate_sql strips <think> tags followed by markdown code block."""
        mock_response = MagicMock()
        mock_response.choices = [
            MagicMock(
                message=MagicMock(
                    content='<think>分析需求...\n构建JSON。</think>\n```json\n{"sql": "SELECT id FROM users", "explanation": "查询用户ID"}\n```'
                )
            )
        ]

        with patch.object(service, "build_schema_context", new_callable=AsyncMock) as mock_schema, \
             patch.object(service, "_client", create=True) as mock_client:
            mock_schema.return_value = "Schema info"
            mock_client.chat.completions.create.return_value = mock_response
            service._client = mock_client

            sql, explanation, export_format = await service.generate_sql("testdb", "查询用户ID")

            assert sql == "SELECT id FROM users"
            assert explanation == "查询用户ID"


class TestPromptChain:
    """Test suite for Prompt Chain (Table Selection) functionality."""

    @pytest.fixture
    def service(self):
        """Create a fresh LLMService instance."""
        return LLMService()

    def test_config_constants_exist(self):
        """Test that configuration constants are defined."""
        assert TABLE_SELECTION_THRESHOLD == 3
        assert MAX_SELECTED_TABLES == 10
        assert PHASE1_MAX_TOKENS == 256

    @pytest.mark.asyncio
    async def test_build_table_summary_context_returns_correct_format(self, service):
        """Test build_table_summary_context returns proper table summary format."""
        mock_metadata = [
            {
                "schema_name": "public",
                "table_name": "orders",
                "table_type": "table",
                "table_comment": "订单主表",
            },
            {
                "schema_name": "public",
                "table_name": "customers",
                "table_type": "table",
                "table_comment": "客户信息",
            },
        ]

        with patch("app.db.sqlite.db_manager") as mock_db:
            mock_db.get_metadata_for_database = AsyncMock(return_value=mock_metadata)

            summary, count, all_tables = await service.build_table_summary_context("testdb")

            assert count == 2
            assert "public.orders" in summary
            assert "public.customers" in summary
            assert "订单主表" in summary
            assert "客户信息" in summary
            assert "public.orders" in all_tables
            assert "public.customers" in all_tables

    @pytest.mark.asyncio
    async def test_build_table_summary_context_no_comment(self, service):
        """Test build_table_summary_context handles tables without comments."""
        mock_metadata = [
            {
                "schema_name": "public",
                "table_name": "users",
                "table_type": "table",
                "table_comment": "",  # No comment
            },
        ]

        with patch("app.db.sqlite.db_manager") as mock_db:
            mock_db.get_metadata_for_database = AsyncMock(return_value=mock_metadata)

            summary, count, all_tables = await service.build_table_summary_context("testdb")

            assert count == 1
            assert "public.users" in summary
            assert "public.users" in all_tables

    @pytest.mark.asyncio
    async def test_build_table_summary_context_empty(self, service):
        """Test build_table_summary_context handles empty metadata."""
        with patch("app.db.sqlite.db_manager") as mock_db:
            mock_db.get_metadata_for_database = AsyncMock(return_value=[])

            summary, count, all_tables = await service.build_table_summary_context("testdb")

            assert count == 0
            assert all_tables == []
            assert "No tables found" in summary

    @pytest.mark.asyncio
    async def test_select_relevant_tables_parses_json_correctly(self, service):
        """Test select_relevant_tables correctly parses LLM JSON response."""
        mock_metadata = [
            {"schema_name": "public", "table_name": "orders", "table_type": "table", "table_comment": ""},
            {"schema_name": "public", "table_name": "customers", "table_type": "table", "table_comment": ""},
            {"schema_name": "public", "table_name": "products", "table_type": "table", "table_comment": ""},
            {"schema_name": "public", "table_name": "categories", "table_type": "table", "table_comment": ""},
        ]

        mock_response = MagicMock()
        mock_response.choices = [
            MagicMock(message=MagicMock(content='["public.orders", "public.customers"]'))
        ]

        with patch("app.db.sqlite.db_manager") as mock_db, \
             patch.object(service, "_client", create=True) as mock_client:
            mock_db.get_metadata_for_database = AsyncMock(return_value=mock_metadata)
            mock_client.chat.completions.create.return_value = mock_response
            service._client = mock_client

            selected, fallback = await service.select_relevant_tables("testdb", "查询订单", "postgresql")

            assert not fallback
            assert "public.orders" in selected
            assert "public.customers" in selected
            assert len(selected) == 2

    @pytest.mark.asyncio
    async def test_select_relevant_tables_fallback_on_empty_array(self, service):
        """Test select_relevant_tables falls back when LLM returns empty array."""
        mock_metadata = [
            {"schema_name": "public", "table_name": "orders", "table_type": "table", "table_comment": ""},
            {"schema_name": "public", "table_name": "customers", "table_type": "table", "table_comment": ""},
            {"schema_name": "public", "table_name": "products", "table_type": "table", "table_comment": ""},
            {"schema_name": "public", "table_name": "categories", "table_type": "table", "table_comment": ""},
        ]

        mock_response = MagicMock()
        mock_response.choices = [
            MagicMock(message=MagicMock(content='[]'))
        ]

        with patch("app.db.sqlite.db_manager") as mock_db, \
             patch.object(service, "_client", create=True) as mock_client:
            mock_db.get_metadata_for_database = AsyncMock(return_value=mock_metadata)
            mock_client.chat.completions.create.return_value = mock_response
            service._client = mock_client

            selected, fallback = await service.select_relevant_tables("testdb", "查询", "postgresql")

            # Should fallback to all tables
            assert fallback
            assert len(selected) == 4

    @pytest.mark.asyncio
    async def test_select_relevant_tables_skips_for_small_db(self, service):
        """Test select_relevant_tables skips phase 1 when table count <= threshold."""
        # Only 3 tables (at threshold)
        mock_metadata = [
            {"schema_name": "public", "table_name": "orders", "table_type": "table", "table_comment": ""},
            {"schema_name": "public", "table_name": "customers", "table_type": "table", "table_comment": ""},
            {"schema_name": "public", "table_name": "products", "table_type": "table", "table_comment": ""},
        ]

        with patch("app.db.sqlite.db_manager") as mock_db:
            mock_db.get_metadata_for_database = AsyncMock(return_value=mock_metadata)

            selected, fallback = await service.select_relevant_tables("testdb", "查询", "postgresql")

            # Should skip phase 1 and return all tables without calling LLM
            assert not fallback
            assert len(selected) == 3

    @pytest.mark.asyncio
    async def test_select_relevant_tables_fallback_on_invalid_json(self, service):
        """Test select_relevant_tables falls back when LLM returns invalid JSON."""
        mock_metadata = [
            {"schema_name": "public", "table_name": "t1", "table_type": "table", "table_comment": ""},
            {"schema_name": "public", "table_name": "t2", "table_type": "table", "table_comment": ""},
            {"schema_name": "public", "table_name": "t3", "table_type": "table", "table_comment": ""},
            {"schema_name": "public", "table_name": "t4", "table_type": "table", "table_comment": ""},
        ]

        mock_response = MagicMock()
        mock_response.choices = [
            MagicMock(message=MagicMock(content='Not valid JSON'))
        ]

        with patch("app.db.sqlite.db_manager") as mock_db, \
             patch.object(service, "_client", create=True) as mock_client:
            mock_db.get_metadata_for_database = AsyncMock(return_value=mock_metadata)
            mock_client.chat.completions.create.return_value = mock_response
            service._client = mock_client

            selected, fallback = await service.select_relevant_tables("testdb", "查询", "postgresql")

            assert fallback
            assert len(selected) == 4

    @pytest.mark.asyncio
    async def test_build_schema_context_filters_tables(self, service):
        """Test build_schema_context correctly filters to specified tables."""
        mock_metadata = [
            {
                "schema_name": "public",
                "table_name": "orders",
                "table_type": "table",
                "columns": [{"name": "id", "dataType": "integer", "isNullable": False, "isPrimaryKey": True}],
            },
            {
                "schema_name": "public",
                "table_name": "customers",
                "table_type": "table",
                "columns": [{"name": "id", "dataType": "integer", "isNullable": False, "isPrimaryKey": True}],
            },
            {
                "schema_name": "public",
                "table_name": "products",
                "table_type": "table",
                "columns": [{"name": "id", "dataType": "integer", "isNullable": False, "isPrimaryKey": True}],
            },
        ]

        with patch("app.services.llm_service.database_manager") as mock_mgr, \
             patch("app.db.sqlite.db_manager") as mock_db:
            mock_mgr.get_database = AsyncMock(return_value={"name": "testdb"})
            mock_db.get_metadata_for_database = AsyncMock(return_value=mock_metadata)

            # Filter to only orders table
            result = await service.build_schema_context("testdb", table_names=["public.orders"])

            assert "public.orders" in result
            assert "public.customers" not in result
            assert "public.products" not in result

    @pytest.mark.asyncio
    async def test_build_schema_context_no_filter_returns_all(self, service):
        """Test build_schema_context returns all tables when no filter specified."""
        mock_metadata = [
            {
                "schema_name": "public",
                "table_name": "orders",
                "table_type": "table",
                "columns": [{"name": "id", "dataType": "integer", "isNullable": False, "isPrimaryKey": True}],
            },
            {
                "schema_name": "public",
                "table_name": "customers",
                "table_type": "table",
                "columns": [{"name": "id", "dataType": "integer", "isNullable": False, "isPrimaryKey": True}],
            },
        ]

        with patch("app.services.llm_service.database_manager") as mock_mgr, \
             patch("app.db.sqlite.db_manager") as mock_db:
            mock_mgr.get_database = AsyncMock(return_value={"name": "testdb"})
            mock_db.get_metadata_for_database = AsyncMock(return_value=mock_metadata)

            # No filter
            result = await service.build_schema_context("testdb", table_names=None)

            assert "public.orders" in result
            assert "public.customers" in result

    @pytest.mark.asyncio
    async def test_generate_sql_uses_prompt_chain(self, service):
        """Test generate_sql integrates prompt chain correctly."""
        mock_metadata = [
            {"schema_name": "public", "table_name": "t1", "table_type": "table", "table_comment": "", "columns": []},
            {"schema_name": "public", "table_name": "t2", "table_type": "table", "table_comment": "", "columns": []},
            {"schema_name": "public", "table_name": "t3", "table_type": "table", "table_comment": "", "columns": []},
            {"schema_name": "public", "table_name": "t4", "table_type": "table", "table_comment": "", "columns": []},
        ]

        # Phase 1 response: select tables
        phase1_response = MagicMock()
        phase1_response.choices = [MagicMock(message=MagicMock(content='["public.t1", "public.t2"]'))]
        
        # Phase 2 response: generate SQL
        phase2_response = MagicMock()
        phase2_response.choices = [
            MagicMock(message=MagicMock(content='{"sql": "SELECT * FROM public.t1", "explanation": "查询t1"}'))
        ]

        with patch("app.services.llm_service.database_manager") as mock_mgr, \
             patch("app.db.sqlite.db_manager") as mock_db, \
             patch.object(service, "_client", create=True) as mock_client:
            mock_mgr.get_database = AsyncMock(return_value={"name": "testdb"})
            mock_db.get_metadata_for_database = AsyncMock(return_value=mock_metadata)
            
            # Return different responses for phase 1 and phase 2
            mock_client.chat.completions.create.side_effect = [phase1_response, phase2_response]
            service._client = mock_client

            sql, explanation, export_format = await service.generate_sql("testdb", "查询t1数据")

            assert sql == "SELECT * FROM public.t1"
            assert explanation == "查询t1"
            # Should have called LLM twice (phase 1 + phase 2)
            assert mock_client.chat.completions.create.call_count == 2

    @pytest.mark.asyncio
    async def test_select_relevant_tables_filters_invalid_table_names(self, service):
        """Test that invalid table names returned by LLM are filtered out."""
        mock_metadata = [
            {"schema_name": "public", "table_name": "orders", "table_type": "table", "table_comment": ""},
            {"schema_name": "public", "table_name": "customers", "table_type": "table", "table_comment": ""},
            {"schema_name": "public", "table_name": "products", "table_type": "table", "table_comment": ""},
            {"schema_name": "public", "table_name": "categories", "table_type": "table", "table_comment": ""},
        ]

        mock_response = MagicMock()
        # LLM returns a mix of valid and invalid table names
        mock_response.choices = [
            MagicMock(message=MagicMock(content='["public.orders", "nonexistent_table", "public.customers"]'))
        ]

        with patch("app.db.sqlite.db_manager") as mock_db, \
             patch.object(service, "_client", create=True) as mock_client:
            mock_db.get_metadata_for_database = AsyncMock(return_value=mock_metadata)
            mock_client.chat.completions.create.return_value = mock_response
            service._client = mock_client

            selected, fallback = await service.select_relevant_tables("testdb", "查询订单", "postgresql")

            assert not fallback
            assert "public.orders" in selected
            assert "public.customers" in selected
            assert "nonexistent_table" not in selected
            assert len(selected) == 2

    @pytest.mark.asyncio
    async def test_select_relevant_tables_fallback_when_all_invalid(self, service):
        """Test fallback when all LLM-selected table names are invalid."""
        mock_metadata = [
            {"schema_name": "public", "table_name": "orders", "table_type": "table", "table_comment": ""},
            {"schema_name": "public", "table_name": "customers", "table_type": "table", "table_comment": ""},
            {"schema_name": "public", "table_name": "products", "table_type": "table", "table_comment": ""},
            {"schema_name": "public", "table_name": "categories", "table_type": "table", "table_comment": ""},
        ]

        mock_response = MagicMock()
        # All table names are invalid
        mock_response.choices = [
            MagicMock(message=MagicMock(content='["invalid1", "invalid2"]'))
        ]

        with patch("app.db.sqlite.db_manager") as mock_db, \
             patch.object(service, "_client", create=True) as mock_client:
            mock_db.get_metadata_for_database = AsyncMock(return_value=mock_metadata)
            mock_client.chat.completions.create.return_value = mock_response
            service._client = mock_client

            selected, fallback = await service.select_relevant_tables("testdb", "查询", "postgresql")

            # Should fallback to all tables
            assert fallback
            assert len(selected) == 4

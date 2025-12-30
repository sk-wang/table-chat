"""Agent service for Claude Agent SDK integration."""

import asyncio
import json
import logging
import re
import time
import uuid
from collections.abc import AsyncGenerator
from typing import Any

from app.config import settings
from app.services.agent_tools import get_table_schema, query_database

logger = logging.getLogger(__name__)


# System prompt for the SQL assistant agent
AGENT_SYSTEM_PROMPT = """You are a SQL assistant agent helping users explore databases and generate SQL queries.

You have access to two tools:
1. `get_table_schema` - Get table structure information (tables, columns, types, comments)
2. `query_database` - Execute read-only SQL queries (SELECT, DESCRIBE, SHOW, EXPLAIN only)

Your workflow:
1. First, use `get_table_schema` to understand the database structure
2. If needed, use `query_database` to run sample queries and understand the data
3. Based on your exploration, generate the final SQL that fulfills the user's request

Important:
- The `query_database` tool can ONLY execute read-only queries
- However, you CAN generate DDL statements (CREATE INDEX, ALTER TABLE, etc.) as your final answer
- The user will execute DDL statements in other tools

When you're ready to provide the final SQL:
1. Clearly state what the SQL does
2. Provide the complete SQL statement in a ```sql code block
3. Format it nicely for readability

Respond in Chinese when the user uses Chinese."""


class AgentService:
    """Service for running Agent mode queries."""

    def __init__(self):
        """Initialize Agent service."""
        self._active_tasks: dict[str, asyncio.Task[None]] = {}

    @property
    def is_available(self) -> bool:
        """Check if Agent service is available."""
        return settings.is_agent_configured

    def _create_tools_and_server(self, db_name: str):
        """Create custom tools and MCP server for the agent."""
        from claude_agent_sdk import create_sdk_mcp_server, tool

        @tool("get_table_schema", "获取数据库表结构信息，包括表名、列名、数据类型和注释", {"table_name": str})
        async def get_schema_tool(args: dict[str, Any]) -> dict[str, Any]:
            """Get table schema information."""
            table_name = args.get("table_name")
            result = await get_table_schema(db_name, table_name)
            return result

        @tool("query_database", "执行只读SQL查询（仅支持SELECT、DESCRIBE、SHOW、EXPLAIN）", {"sql": str})
        async def query_db_tool(args: dict[str, Any]) -> dict[str, Any]:
            """Execute read-only SQL query."""
            sql = args.get("sql", "")
            result = await query_database(db_name, sql)
            return result

        server = create_sdk_mcp_server(
            name="database",
            version="1.0.0",
            tools=[get_schema_tool, query_db_tool]
        )

        return server

    async def run_agent(
        self,
        db_name: str,
        prompt: str,
    ) -> AsyncGenerator[dict[str, Any], None]:
        """
        Run Agent to process user prompt and generate SQL.

        Args:
            db_name: Database connection name
            prompt: User's natural language request

        Yields:
            SSE events with agent progress and results
        """
        start_time = time.time()
        tool_calls_count = 0

        try:
            # Emit thinking event
            yield {
                "event": "thinking",
                "data": {"status": "analyzing", "message": "正在分析您的需求..."},
            }

            # Check if agent is configured
            if not self.is_available:
                yield {
                    "event": "error",
                    "data": {
                        "error": "Agent 服务未配置",
                        "detail": "请设置 AGENT_API_BASE 和 AGENT_API_KEY 环境变量",
                    },
                }
                return

            # Try to import and use Claude Agent SDK
            try:
                from claude_agent_sdk import (
                    ClaudeAgentOptions,
                    ClaudeSDKClient,
                )
            except ImportError:
                logger.error("Claude Agent SDK not installed")
                yield {
                    "event": "error",
                    "data": {
                        "error": "Claude Agent SDK 未安装",
                        "detail": "请运行 'pip install claude-agent-sdk' 安装 Claude Agent SDK",
                    },
                }
                return

            # Create MCP server with our custom tools
            server = self._create_tools_and_server(db_name)

            # Configure Claude Agent with ONLY our custom tools
            options = ClaudeAgentOptions(
                system_prompt=AGENT_SYSTEM_PROMPT,
                max_turns=settings.agent_max_turns,
                mcp_servers={"database": server},
                # Only allow our custom tools, this disables built-in tools like Bash
                allowed_tools=[
                    "mcp__database__get_table_schema",
                    "mcp__database__query_database",
                ],
                model=settings.agent_model,
            )

            # Run agent with streaming
            async with ClaudeSDKClient(options=options) as client:
                await client.query(prompt)

                async for message in client.receive_response():
                    # Handle different message types
                    msg_type = getattr(message, 'type', None) or type(message).__name__
                    
                    if hasattr(message, 'content'):
                        for block in message.content:
                            block_type = getattr(block, 'type', None) or type(block).__name__
                            
                            if block_type == 'text' or hasattr(block, 'text'):
                                text = getattr(block, 'text', str(block))
                                # Check if this contains SQL
                                sql = self._extract_sql(text)
                                if sql:
                                    yield {
                                        "event": "sql",
                                        "data": {"sql": sql, "explanation": text},
                                    }
                                else:
                                    yield {
                                        "event": "message",
                                        "data": {"role": "assistant", "content": text},
                                    }
                            elif block_type == 'tool_use' or hasattr(block, 'name'):
                                tool_calls_count += 1
                                tool_id = getattr(block, 'id', f"tc_{tool_calls_count}")
                                tool_name = getattr(block, 'name', 'unknown')
                                tool_input = getattr(block, 'input', {})

                                # Emit tool call start
                                yield {
                                    "event": "tool_call",
                                    "data": {
                                        "id": tool_id,
                                        "tool": tool_name,
                                        "input": tool_input,
                                        "status": "running",
                                    },
                                }
                    
                    # Handle tool results
                    if hasattr(message, 'tool_result'):
                        result = message.tool_result
                        tool_id = getattr(result, 'tool_use_id', f"tc_{tool_calls_count}")
                        output_text = ""
                        is_error = getattr(result, 'is_error', False)
                        
                        if hasattr(result, 'content'):
                            for content_block in result.content:
                                if hasattr(content_block, 'text'):
                                    output_text = content_block.text
                                    break
                                elif isinstance(content_block, dict) and content_block.get('type') == 'text':
                                    output_text = content_block.get('text', '')
                                    break

                        yield {
                            "event": "tool_call",
                            "data": {
                                "id": tool_id,
                                "tool": "tool_result",
                                "input": {},
                                "status": "error" if is_error else "completed",
                                "output": output_text[:1000] if output_text else "",
                            },
                        }

        except asyncio.CancelledError:
            yield {
                "event": "error",
                "data": {"error": "任务已取消", "detail": None},
            }
            return

        except Exception as e:
            logger.exception(f"Agent error: {e}")
            yield {
                "event": "error",
                "data": {"error": str(e), "detail": None},
            }
            return

        finally:
            # Emit done event
            total_time_ms = int((time.time() - start_time) * 1000)
            yield {
                "event": "done",
                "data": {
                    "total_time_ms": total_time_ms,
                    "tool_calls_count": tool_calls_count,
                },
            }

    def _extract_sql(self, text: str) -> str | None:
        """Extract SQL from text containing markdown code blocks."""
        # Try to extract from ```sql ... ``` block
        sql_match = re.search(r"```sql\s*([\s\S]*?)```", text, re.IGNORECASE)
        if sql_match:
            return sql_match.group(1).strip()

        # Try to extract from ``` ... ``` block
        code_match = re.search(r"```\s*([\s\S]*?)```", text)
        if code_match:
            code = code_match.group(1).strip()
            # Check if it looks like SQL
            if any(
                kw in code.upper()
                for kw in ["SELECT", "INSERT", "UPDATE", "DELETE", "CREATE", "ALTER", "DROP"]
            ):
                return code

        return None

    def cancel_task(self, db_name: str) -> bool:
        """Cancel an active agent task for a database."""
        task = self._active_tasks.get(db_name)
        if task and not task.done():
            task.cancel()
            return True
        return False


# Global instance
agent_service = AgentService()

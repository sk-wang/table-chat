"""Agent service using Anthropic Python client with Tool Use."""

import asyncio
import json
import logging
import re
import time
from collections.abc import AsyncGenerator
from typing import TYPE_CHECKING, Any

from app.config import settings
from app.services.agent_tools import ANTHROPIC_TOOLS, execute_tool

if TYPE_CHECKING:
    from app.models.agent import ConversationTurn

logger = logging.getLogger(__name__)


# System prompt for the SQL assistant agent
AGENT_SYSTEM_PROMPT = """你是一个 SQL 助手，帮助用户探索数据库并生成 SQL 查询。

你有以下三个工具可用：
1. `list_tables` - 列出数据库中所有表的名称（先用这个探索数据库）
2. `get_table_schema` - 获取指定表的详细结构（列名、类型、注释）
3. `query_database` - 执行只读 SQL 查询（仅支持 SELECT、DESCRIBE、SHOW、EXPLAIN）

工作流程：
1. 首先使用 `list_tables` 查看有哪些表
2. 然后使用 `get_table_schema` 了解需要的表的结构
3. 如果需要，使用 `query_database` 执行示例查询
4. 最后生成满足用户需求的 SQL

重要提示：
- `query_database` 只能执行只读查询
- 但你可以生成 DDL 语句（如 CREATE INDEX、ALTER TABLE）作为最终答案
- 用户会在其他工具中执行这些 DDL 语句

当你准备好提供最终 SQL 时：
1. 清楚说明 SQL 的作用
2. 将完整的 SQL 语句放在 ```sql 代码块中
3. 格式化使其易于阅读

请用中文回复用户的中文请求。"""


class AgentService:
    """Service for running Agent mode queries using Anthropic client."""

    def __init__(self):
        """Initialize Agent service."""
        self._client = None

    @property
    def is_available(self) -> bool:
        """Check if Agent service is available (uses unified configuration)."""
        return settings.is_configured

    def _get_client(self):
        """Get or create Anthropic async client using unified configuration."""
        if self._client is None:
            try:
                from anthropic import AsyncAnthropic

                # 简化版架构：始终通过 proxy 连接，使用统一配置
                self._client = AsyncAnthropic(
                    api_key=settings.effective_api_key,
                    base_url=settings.effective_api_base,
                )
            except ImportError:
                logger.error("Anthropic package not installed")
                return None
        return self._client

    async def run_agent(
        self,
        db_name: str,
        prompt: str,
        history: list["ConversationTurn"] | None = None,
    ) -> AsyncGenerator[dict[str, Any], None]:
        """
        Run Agent to process user prompt and generate SQL.

        Uses Anthropic client with streaming for real-time output.

        Args:
            db_name: Database connection name
            prompt: User's natural language request
            history: Last N rounds of conversation history (user prompts + assistant responses)

        Yields:
            SSE events with agent progress and results
        """
        start_time = time.time()
        tool_calls_count = 0

        try:
            # Emit initial thinking event
            yield {
                "event": "thinking",
                "data": {"status": "analyzing", "message": "正在分析您的需求..."},
            }

            # Check if agent is configured (uses unified LLM configuration)
            if not self.is_available:
                yield {
                    "event": "error",
                    "data": {
                        "error": "Agent 服务未配置",
                        "detail": "请设置 LLM_API_KEY 环境变量",
                    },
                }
                return

            # Get Anthropic client
            client = self._get_client()
            if client is None:
                yield {
                    "event": "error",
                    "data": {
                        "error": "Anthropic 客户端未安装",
                        "detail": "请运行 'pip install anthropic' 安装",
                    },
                }
                return

            # Initialize conversation with history
            messages: list[dict[str, Any]] = []

            # Add history (last 3 rounds of conversation)
            if history:
                for turn in history[-3:]:  # Ensure max 3 rounds
                    messages.append({"role": "user", "content": turn.user_prompt})
                    messages.append({"role": "assistant", "content": turn.assistant_response})
                logger.info(f"Added {len(history[-3:])} turns of conversation history")

            # Add current user prompt
            messages.append({"role": "user", "content": prompt})
            max_turns = settings.agent_max_turns

            # Agent loop - continue until no more tool calls or max turns reached
            for turn in range(max_turns):
                logger.info(f"Agent turn {turn + 1}/{max_turns}")

                # Call Anthropic API with streaming
                tool_uses = []
                current_tool_use = None

                try:
                    # Use async streaming for real-time output
                    async with client.messages.stream(
                        model=settings.effective_model,
                        max_tokens=4096,
                        system=AGENT_SYSTEM_PROMPT,
                        tools=ANTHROPIC_TOOLS,
                        messages=messages,
                    ) as stream:
                        async for event in stream:
                            # Handle different event types
                            if event.type == "content_block_start":
                                if hasattr(event, "content_block"):
                                    block = event.content_block
                                    if block.type == "tool_use":
                                        current_tool_use = {
                                            "id": block.id,
                                            "name": block.name,
                                            "input": {},
                                        }
                                        tool_uses.append(current_tool_use)
                                        # Emit tool call start
                                        yield {
                                            "event": "tool_call",
                                            "data": {
                                                "id": block.id,
                                                "tool": block.name,
                                                "input": {},
                                                "status": "running",
                                            },
                                        }

                            elif event.type == "content_block_delta":
                                if hasattr(event, "delta"):
                                    delta = event.delta
                                    if delta.type == "text_delta":
                                        # Emit text delta incrementally
                                        yield {
                                            "event": "text_delta",
                                            "data": {"text": delta.text},
                                        }
                                    # input_json_delta is handled by stream internally

                            elif event.type == "content_block_stop":
                                current_tool_use = None

                            # message_stop is handled automatically by stream

                        # Get final message after stream completes
                        final_message = await stream.get_final_message()

                except Exception as api_error:
                    logger.exception(f"Anthropic API error: {api_error}")
                    yield {
                        "event": "error",
                        "data": {"error": f"API 错误: {api_error}", "detail": None},
                    }
                    return

                # Process the final message
                assistant_content = []
                has_tool_use = False
                fallback_tool_calls = []  # Tool calls extracted from text

                for block in final_message.content:
                    if block.type == "text":
                        # Check for text-format tool calls (fallback for non-Claude models)
                        text_tool_calls = self._extract_text_tool_calls(block.text)
                        if text_tool_calls:
                            # Found text-format tool calls, treat them as real tool calls
                            logger.info(f"Using fallback text-format tool calls: {len(text_tool_calls)}")
                            fallback_tool_calls.extend(text_tool_calls)
                            has_tool_use = True
                            # Add the text content (without tool call markers)
                            clean_text = re.sub(
                                r'\[Tool:\s*\w+\s*\(ID:[^)]+\)\]\s*(?:Input|Arguments):\s*\{[^}]*\}',
                                '',
                                block.text
                            ).strip()
                            if clean_text:
                                assistant_content.append({"type": "text", "text": clean_text})
                                yield {
                                    "event": "message",
                                    "data": {"role": "assistant", "content": clean_text},
                                }
                            # Add synthetic tool_use blocks to assistant_content
                            for tc in text_tool_calls:
                                assistant_content.append({
                                    "type": "tool_use",
                                    "id": tc["id"],
                                    "name": tc["name"],
                                    "input": tc["input"],
                                })
                        else:
                            assistant_content.append({"type": "text", "text": block.text})
                            # Check if this contains final SQL
                            sql = self._extract_sql(block.text)
                            if sql:
                                yield {
                                    "event": "sql",
                                    "data": {"sql": sql, "explanation": block.text},
                                }
                            else:
                                yield {
                                    "event": "message",
                                    "data": {"role": "assistant", "content": block.text},
                                }
                    elif block.type == "tool_use":
                        has_tool_use = True
                        assistant_content.append({
                            "type": "tool_use",
                            "id": block.id,
                            "name": block.name,
                            "input": block.input,
                        })

                # Add assistant message to history
                messages.append({"role": "assistant", "content": assistant_content})

                # If no tool use, we're done
                if not has_tool_use:
                    logger.info("Agent completed - no more tool calls")
                    break

                # Execute tools and collect results
                tool_results = []

                # Collect tool calls from both real tool_use blocks and fallback text parsing
                tools_to_execute = []

                # First, add real tool_use blocks
                for block in final_message.content:
                    if block.type == "tool_use":
                        tools_to_execute.append({
                            "id": block.id,
                            "name": block.name,
                            "input": block.input,
                        })

                # Then, add fallback tool calls (if any)
                if fallback_tool_calls:
                    tools_to_execute.extend(fallback_tool_calls)

                for tool_call in tools_to_execute:
                    tool_calls_count += 1
                    tool_name = tool_call["name"]
                    tool_input = tool_call["input"]
                    tool_id = tool_call["id"]

                    logger.info(f"Executing tool: {tool_name} with input: {tool_input}")

                    # Update tool call status
                    yield {
                        "event": "tool_call",
                        "data": {
                            "id": tool_id,
                            "tool": tool_name,
                            "input": tool_input,
                            "status": "running",
                        },
                    }

                    # Execute tool
                    tool_start = time.time()
                    result = await execute_tool(db_name, tool_name, tool_input)
                    tool_duration = int((time.time() - tool_start) * 1000)

                    logger.info(f"Tool {tool_name} completed in {tool_duration}ms")

                    # Emit tool result
                    yield {
                        "event": "tool_call",
                        "data": {
                            "id": tool_id,
                            "tool": tool_name,
                            "input": tool_input,
                            "status": "completed",
                            "output": result[:1000] if len(result) > 1000 else result,
                            "duration_ms": tool_duration,
                        },
                    }

                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": tool_id,
                        "content": result,
                    })

                # Add tool results to conversation
                messages.append({"role": "user", "content": tool_results})

            else:
                # Max turns reached
                logger.warning(f"Agent reached max turns ({max_turns})")
                yield {
                    "event": "message",
                    "data": {
                        "role": "assistant",
                        "content": f"已达到最大交互轮次 ({max_turns})，请简化您的请求或重试。",
                    },
                }

        except asyncio.CancelledError:
            yield {
                "event": "error",
                "data": {"error": "任务已取消", "detail": None},
            }
            raise

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

    def _extract_text_tool_calls(self, text: str) -> list[dict[str, Any]]:
        """
        Extract tool calls from text format (fallback for non-Claude models).

        Parses patterns like:
        [Tool: query_database (ID: query_database:1)]
        Input: {"sql": "SELECT ..."}

        or:
        Tool: query_database
        Arguments: {"sql": "SELECT ..."}
        """
        tool_calls = []

        # Pattern 1: [Tool: name (ID: id)]
        # Input: {...}
        pattern1 = re.compile(
            r'\[Tool:\s*(\w+)\s*\(ID:\s*([^)]+)\)\]\s*'
            r'(?:Input|Arguments):\s*(\{[^}]*\}|\{[\s\S]*?\})',
            re.MULTILINE
        )

        for match in pattern1.finditer(text):
            tool_name = match.group(1)
            tool_id = match.group(2)
            try:
                tool_input = json.loads(match.group(3))
            except json.JSONDecodeError:
                # Try to fix common JSON issues
                input_str = match.group(3).replace("'", '"')
                try:
                    tool_input = json.loads(input_str)
                except json.JSONDecodeError:
                    tool_input = {"raw": match.group(3)}

            tool_calls.append({
                "id": tool_id,
                "name": tool_name,
                "input": tool_input,
            })

        # Pattern 2: Tool: name
        # Arguments: {...}
        if not tool_calls:
            pattern2 = re.compile(
                r'Tool:\s*(\w+)\s*\n\s*Arguments:\s*(\{[\s\S]*?\})',
                re.MULTILINE
            )
            for i, match in enumerate(pattern2.finditer(text)):
                tool_name = match.group(1)
                try:
                    tool_input = json.loads(match.group(2))
                except json.JSONDecodeError:
                    tool_input = {"raw": match.group(2)}

                tool_calls.append({
                    "id": f"{tool_name}:{i}",
                    "name": tool_name,
                    "input": tool_input,
                })

        if tool_calls:
            logger.info(f"Extracted {len(tool_calls)} tool calls from text: {[tc['name'] for tc in tool_calls]}")

        return tool_calls

    def cancel_task(self, _db_name: str) -> bool:
        """Cancel an active agent task for a database."""
        # With Anthropic client, cancellation is handled by the SSE connection closing
        # This method is kept for API compatibility
        return True


# Global instance
agent_service = AgentService()

"""Agent mode request and response models."""

from typing import Any, Literal

from pydantic import BaseModel, Field


# === Request Models ===


class AgentQueryRequest(BaseModel):
    """Agent query request."""

    prompt: str = Field(
        ...,
        min_length=1,
        max_length=4000,
        description="User's natural language request",
    )


# === Event Models ===


class ThinkingEventData(BaseModel):
    """Thinking status event data."""

    status: Literal["analyzing", "planning", "generating"]
    message: str


class ToolCallEventData(BaseModel):
    """Tool call event data."""

    id: str
    tool: str
    input: dict[str, Any]
    status: Literal["running", "completed", "error"]
    output: str | None = None
    duration_ms: int | None = None


class MessageEventData(BaseModel):
    """Assistant message event data."""

    role: Literal["assistant"] = "assistant"
    content: str


class SQLEventData(BaseModel):
    """Final SQL event data."""

    sql: str
    explanation: str | None = None


class ErrorEventData(BaseModel):
    """Error event data."""

    error: str
    detail: str | None = None


class DoneEventData(BaseModel):
    """Done event data."""

    total_time_ms: int
    tool_calls_count: int


# === Response Models ===


class AgentStatusResponse(BaseModel):
    """Agent status response."""

    available: bool
    configured: bool
    model: str | None = None


class CancelResponse(BaseModel):
    """Cancel response."""

    cancelled: bool


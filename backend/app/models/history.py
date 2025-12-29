"""Pydantic models for SQL query history."""

from datetime import datetime

from pydantic import Field

from app.models.base import CamelModel


class QueryHistoryCreate(CamelModel):
    """Request model for creating a history record."""

    sql_content: str = Field(..., min_length=1, description="SQL statement")
    natural_query: str | None = Field(None, description="Natural language description")
    row_count: int = Field(0, ge=0, description="Number of rows returned")
    execution_time_ms: int = Field(0, ge=0, description="Execution time in milliseconds")


class QueryHistoryItem(CamelModel):
    """Response model for a single history record."""

    id: int
    db_name: str
    sql_content: str
    natural_query: str | None
    row_count: int
    execution_time_ms: int
    executed_at: datetime


class QueryHistoryListResponse(CamelModel):
    """Response model for history list."""

    items: list[QueryHistoryItem]
    total: int
    has_more: bool
    next_cursor: str | None = None


class QueryHistorySearchRequest(CamelModel):
    """Request model for searching history."""

    query: str = Field(..., min_length=1, description="Search keyword")
    limit: int = Field(20, ge=1, le=100, description="Result limit")


class QueryHistorySearchResponse(CamelModel):
    """Response model for search results."""

    items: list[QueryHistoryItem]
    total: int


"""Query-related models."""

from pydantic import Field

from app.models.base import CamelModel


class QueryRequest(CamelModel):
    """Request model for executing SQL query."""

    sql: str = Field(..., description="SQL SELECT statement")


class QueryResult(CamelModel):
    """Query result data."""

    columns: list[str] = Field(..., description="Column names")
    rows: list[dict] = Field(..., description="Data rows")
    row_count: int = Field(..., description="Number of rows returned")
    truncated: bool = Field(False, description="True if LIMIT was auto-added")


class QueryResponse(CamelModel):
    """Response model for query execution."""

    sql: str = Field(..., description="Executed SQL (may include auto-added LIMIT)")
    result: QueryResult
    execution_time_ms: int = Field(..., description="Execution time in milliseconds")


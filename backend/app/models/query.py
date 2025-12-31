"""Query-related models."""

from typing import Literal

from pydantic import Field

from app.models.base import CamelModel


class QueryRequest(CamelModel):
    """Request model for executing SQL query."""

    sql: str = Field(..., description="SQL SELECT statement")
    natural_query: str | None = Field(
        None, description="Natural language description (if SQL was generated from NL)"
    )


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


# === Natural Language Query Models ===


class NaturalQueryRequest(CamelModel):
    """Request model for natural language to SQL conversion."""

    prompt: str = Field(..., description="Natural language query description")


class NaturalQueryResponse(CamelModel):
    """Response model for natural language to SQL conversion."""

    generated_sql: str = Field(..., description="Generated SQL statement")
    explanation: str | None = Field(None, description="Explanation of the generated SQL")
    export_format: Literal["csv", "json", "xlsx"] | None = Field(
        None, description="Export format if export intent was detected"
    )


# === SQL Formatting Models ===


class FormatRequest(CamelModel):
    """Request model for SQL formatting."""

    sql: str = Field(..., description="SQL statement to format")
    dialect: str | None = Field(None, description="SQL dialect (postgres or mysql)")


class FormatResponse(CamelModel):
    """Response model for SQL formatting."""

    formatted: str = Field(..., description="Formatted SQL statement")


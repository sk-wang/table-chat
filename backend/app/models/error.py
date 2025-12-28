"""Error response models."""

from app.models.base import CamelModel


class ErrorResponse(CamelModel):
    """Standard error response format."""

    error: str
    detail: str | None = None


class SQLErrorResponse(CamelModel):
    """SQL-specific error response with position info."""

    error: str
    detail: str | None = None
    line: int | None = None
    column: int | None = None


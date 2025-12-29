"""Query history API endpoints."""

from fastapi import APIRouter, HTTPException, Query, status

from app.db.sqlite import db_manager
from app.models.error import ErrorResponse
from app.models.history import (
    QueryHistoryItem,
    QueryHistoryListResponse,
    QueryHistorySearchResponse,
)
from app.services.history_service import history_service

router = APIRouter(prefix="/dbs", tags=["History"])


async def _verify_database_exists(db_name: str) -> None:
    """Verify that a database connection exists."""
    db = await db_manager.get_database(db_name)
    if not db:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Database '{db_name}' not found",
        )


@router.get(
    "/{name}/history",
    response_model=QueryHistoryListResponse,
    responses={
        404: {"model": ErrorResponse, "description": "Database not found"},
    },
    summary="List query execution history",
)
async def list_history(
    name: str,
    limit: int = Query(default=20, ge=1, le=100, description="Number of records to return"),
    before: str | None = Query(default=None, description="Cursor for pagination (ISO8601 timestamp)"),
) -> QueryHistoryListResponse:
    """
    List SQL query execution history for a database.
    
    - Returns history records in descending order by execution time
    - Supports cursor-based pagination using the `before` parameter
    - Use `nextCursor` from response for subsequent requests
    """
    await _verify_database_exists(name)

    items, total, has_more, next_cursor = await history_service.list_history(
        db_name=name,
        limit=limit,
        before=before,
    )

    return QueryHistoryListResponse(
        items=[QueryHistoryItem(**item) for item in items],
        total=total,
        has_more=has_more,
        next_cursor=next_cursor,
    )


@router.get(
    "/{name}/history/search",
    response_model=QueryHistorySearchResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid search query"},
        404: {"model": ErrorResponse, "description": "Database not found"},
    },
    summary="Search query history",
)
async def search_history(
    name: str,
    query: str = Query(..., min_length=1, description="Search keyword"),
    limit: int = Query(default=20, ge=1, le=100, description="Maximum results to return"),
) -> QueryHistorySearchResponse:
    """
    Search query history using full-text search.
    
    - Supports Chinese text search with jieba tokenization
    - Searches both SQL content and natural language descriptions
    - Returns matching records sorted by execution time
    """
    await _verify_database_exists(name)

    items, total = await history_service.search_history(
        db_name=name,
        query=query,
        limit=limit,
    )

    return QueryHistorySearchResponse(
        items=[QueryHistoryItem(**item) for item in items],
        total=total,
    )


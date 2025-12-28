"""Query execution API endpoints."""

from fastapi import APIRouter, HTTPException, status

from app.models.error import ErrorResponse, SQLErrorResponse
from app.models.query import QueryRequest, QueryResponse, QueryResult
from app.services.query_service import query_service

router = APIRouter(prefix="/dbs", tags=["Query"])


@router.post(
    "/{name}/query",
    response_model=QueryResponse,
    responses={
        400: {
            "model": SQLErrorResponse,
            "description": "SQL syntax error or non-SELECT statement",
        },
        404: {"model": ErrorResponse, "description": "Database not found"},
        503: {"model": ErrorResponse, "description": "Query execution failed"},
    },
    summary="Execute SQL query",
)
async def execute_query(name: str, request: QueryRequest) -> QueryResponse:
    """
    Execute SQL SELECT query against a database.
    
    - Only SELECT statements are allowed
    - LIMIT 1000 is automatically added if no LIMIT clause exists
    - Returns query results as JSON
    """
    try:
        final_sql, columns, rows, execution_time_ms, truncated = (
            await query_service.execute_validated_query(name, request.sql)
        )

        return QueryResponse(
            sql=final_sql,
            result=QueryResult(
                columns=columns,
                rows=rows,
                row_count=len(rows),
                truncated=truncated,
            ),
            execution_time_ms=execution_time_ms,
        )

    except ValueError as e:
        # SQL validation or parsing errors
        error_msg = str(e)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg,
        ) from e

    except Exception as e:
        # Database connection or execution errors
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Query execution failed: {e}",
        ) from e


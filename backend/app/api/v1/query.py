"""Query execution API endpoints."""

from fastapi import APIRouter, HTTPException, status

from app.models.error import ErrorResponse, SQLErrorResponse
from app.models.query import (
    QueryRequest,
    QueryResponse,
    QueryResult,
    NaturalQueryRequest,
    NaturalQueryResponse,
)
from app.services.query_service import query_service
from app.services.llm_service import llm_service

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


@router.post(
    "/{name}/query/natural",
    response_model=NaturalQueryResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid natural language request"},
        404: {"model": ErrorResponse, "description": "Database not found"},
        503: {"model": ErrorResponse, "description": "LLM service unavailable"},
    },
    summary="Generate SQL from natural language",
)
async def natural_language_query(
    name: str, request: NaturalQueryRequest
) -> NaturalQueryResponse:
    """
    Generate SQL from natural language description.
    
    - Uses LLM to convert natural language to SQL
    - Only generates SELECT queries
    - Includes schema context for accurate generation
    """
    # Validate prompt is not empty
    if not request.prompt or not request.prompt.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Prompt cannot be empty",
        )

    # Check if LLM is configured
    if not llm_service.is_available:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="LLM service is not configured. Please set LLM_API_KEY environment variable.",
        )

    # Verify database exists
    from app.services.db_manager import database_manager
    
    try:
        db_info = await database_manager.get_database(name)
        if not db_info:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Database '{name}' not found",
            )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        ) from e

    try:
        generated_sql, explanation = await llm_service.generate_sql(
            db_name=name,
            prompt=request.prompt,
        )

        return NaturalQueryResponse(
            generated_sql=generated_sql,
            explanation=explanation,
        )

    except ValueError as e:
        error_msg = str(e)
        
        # Check if it's a database not found error
        if "not found" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=error_msg,
            ) from e
        
        # Other validation errors
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg,
        ) from e

    except Exception as e:
        # LLM API or other errors
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"LLM generation failed: {e}",
        ) from e


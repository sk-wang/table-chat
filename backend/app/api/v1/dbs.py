"""Database connection API endpoints."""

from datetime import datetime

from fastapi import APIRouter, HTTPException, status

from app.models.database import (
    DatabaseCreateRequest,
    DatabaseListResponse,
    DatabaseResponse,
    mask_password_in_url,
)
from app.models.error import ErrorResponse
from app.services.db_manager import database_manager

router = APIRouter(prefix="/dbs", tags=["Databases"])


@router.get(
    "",
    response_model=DatabaseListResponse,
    summary="List all database connections",
)
async def list_databases() -> DatabaseListResponse:
    """Get list of all saved database connections."""
    dbs = await database_manager.list_databases()

    # Mask passwords in URLs
    databases = [
        DatabaseResponse(
            name=db["name"],
            url=mask_password_in_url(db["url"]),
            created_at=datetime.fromisoformat(db["created_at"]),
            updated_at=datetime.fromisoformat(db["updated_at"]),
        )
        for db in dbs
    ]

    return DatabaseListResponse(databases=databases)


@router.get(
    "/{name}",
    response_model=DatabaseResponse,
    responses={
        404: {"model": ErrorResponse, "description": "Database not found"},
    },
    summary="Get database connection details",
)
async def get_database(name: str) -> DatabaseResponse:
    """Get details of a specific database connection."""
    db = await database_manager.get_database(name)

    if not db:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Database '{name}' not found",
        )

    return DatabaseResponse(
        name=db["name"],
        url=mask_password_in_url(db["url"]),
        created_at=datetime.fromisoformat(db["created_at"]),
        updated_at=datetime.fromisoformat(db["updated_at"]),
    )


@router.put(
    "/{name}",
    response_model=DatabaseResponse,
    status_code=status.HTTP_200_OK,
    responses={
        400: {
            "model": ErrorResponse,
            "description": "Invalid connection URL or connection failed",
        },
        503: {"model": ErrorResponse, "description": "Database connection failed"},
    },
    summary="Create or update database connection",
)
async def create_or_update_database(
    name: str, request: DatabaseCreateRequest
) -> DatabaseResponse:
    """
    Create or update a database connection.
    Tests the connection before saving.
    """
    try:
        db = await database_manager.create_or_update_database(name, request.url)

        return DatabaseResponse(
            name=db["name"],
            url=mask_password_in_url(db["url"]),
            created_at=datetime.fromisoformat(db["created_at"]),
            updated_at=datetime.fromisoformat(db["updated_at"]),
        )
    except ConnectionError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e),
        ) from e
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save database connection: {e}",
        ) from e


@router.delete(
    "/{name}",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={
        404: {"model": ErrorResponse, "description": "Database not found"},
    },
    summary="Delete database connection",
)
async def delete_database(name: str) -> None:
    """Delete a database connection."""
    deleted = await database_manager.delete_database(name)

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Database '{name}' not found",
        )


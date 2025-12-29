"""Database connection API endpoints."""

from datetime import datetime

from fastapi import APIRouter, HTTPException, Query, status

from app.models.database import (
    DatabaseCreateRequest,
    DatabaseListResponse,
    DatabaseResponse,
    mask_password_in_url,
)
from app.models.error import ErrorResponse
from app.models.metadata import DatabaseMetadata, TableListResponse, TableMetadata
from app.services.db_manager import database_manager
from app.services.metadata_service import metadata_service

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
            db_type=db.get("db_type", "postgresql"),
            ssl_disabled=bool(db.get("ssl_disabled", 0)),
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
        db_type=db.get("db_type", "postgresql"),
        ssl_disabled=bool(db.get("ssl_disabled", 0)),
        created_at=datetime.fromisoformat(db["created_at"]),
        updated_at=datetime.fromisoformat(db["updated_at"]),
    )


@router.get(
    "/{name}/metadata",
    response_model=DatabaseMetadata,
    responses={
        404: {"model": ErrorResponse, "description": "Database not found"},
        503: {"model": ErrorResponse, "description": "Failed to fetch metadata"},
    },
    summary="Get database metadata (tables, columns)",
)
async def get_database_metadata(
    name: str,
    refresh: bool = Query(False, description="Force refresh from database"),
) -> DatabaseMetadata:
    """
    Get database metadata including tables, views, and columns.

    - Returns cached metadata by default
    - Use refresh=true to force fetching fresh metadata from database
    """
    # First verify the database exists
    db = await database_manager.get_database(name)
    if not db:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Database '{name}' not found",
        )

    try:
        metadata = await metadata_service.get_or_refresh_metadata(name, force_refresh=refresh)
        return metadata
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        ) from e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Failed to fetch metadata: {e}",
        ) from e


@router.post(
    "/{name}/metadata/refresh",
    response_model=DatabaseMetadata,
    responses={
        404: {"model": ErrorResponse, "description": "Database not found"},
        503: {"model": ErrorResponse, "description": "Failed to refresh metadata"},
    },
    summary="Refresh database metadata",
)
async def refresh_database_metadata(name: str) -> DatabaseMetadata:
    """Force refresh database metadata from database."""
    # First verify the database exists
    db = await database_manager.get_database(name)
    if not db:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Database '{name}' not found",
        )

    try:
        metadata = await metadata_service.refresh_metadata(name)
        return metadata
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        ) from e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Failed to refresh metadata: {e}",
        ) from e


@router.get(
    "/{name}/metadata/tables",
    response_model=TableListResponse,
    responses={
        404: {"model": ErrorResponse, "description": "Database not found"},
        503: {"model": ErrorResponse, "description": "Failed to fetch metadata"},
    },
    summary="Get table list (without column details)",
)
async def get_table_list(
    name: str,
    refresh: bool = Query(False, description="Force refresh from database"),
) -> TableListResponse:
    """
    Get list of tables without column details (lightweight).
    
    Use this endpoint for initial loading to reduce data transfer.
    Then use /dbs/{name}/metadata/tables/{schema}/{table} to get column details when needed.
    """
    # First verify the database exists
    db = await database_manager.get_database(name)
    if not db:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Database '{name}' not found",
        )

    try:
        table_list = await metadata_service.get_table_list(name, force_refresh=refresh)
        return table_list
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        ) from e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Failed to fetch table list: {e}",
        ) from e


@router.get(
    "/{name}/metadata/tables/{schema_name}/{table_name}",
    response_model=TableMetadata,
    responses={
        404: {"model": ErrorResponse, "description": "Database or table not found"},
        503: {"model": ErrorResponse, "description": "Failed to fetch table details"},
    },
    summary="Get table details with columns",
)
async def get_table_details(
    name: str,
    schema_name: str,
    table_name: str,
) -> TableMetadata:
    """
    Get detailed metadata for a specific table including all columns.
    
    Use this endpoint after getting the table list to fetch column details on demand.
    """
    # First verify the database exists
    db = await database_manager.get_database(name)
    if not db:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Database '{name}' not found",
        )

    try:
        table_details = await metadata_service.get_table_details(
            name, schema_name, table_name
        )
        
        if not table_details:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Table '{schema_name}.{table_name}' not found in database '{name}'",
            )
        
        return table_details
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Failed to fetch table details: {e}",
        ) from e


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
        db = await database_manager.create_or_update_database(
            name, request.url, request.ssl_disabled
        )

        return DatabaseResponse(
            name=db["name"],
            url=mask_password_in_url(db["url"]),
            db_type=db.get("db_type", "postgresql"),
            ssl_disabled=bool(db.get("ssl_disabled", 0)),
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

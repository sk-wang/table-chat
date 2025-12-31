"""Database connection models."""

from datetime import datetime

from pydantic import Field

from app.models.base import CamelModel
from app.models.ssh import SSHConfig, SSHConfigResponse


class DatabaseCreateRequest(CamelModel):
    """Request model for creating/updating a database connection."""

    url: str = Field(..., description="Database connection URL (postgresql:// or mysql://)")
    ssl_disabled: bool = Field(
        False, description="Disable SSL for MySQL connection (only applies to MySQL)"
    )
    ssh_config: SSHConfig | None = Field(
        default=None, description="SSH tunnel configuration"
    )


class DatabaseResponse(CamelModel):
    """Response model for database connection."""

    name: str
    url: str  # Masked in actual responses
    db_type: str  # 'postgresql' or 'mysql'
    ssl_disabled: bool  # SSL disabled flag (only applies to MySQL)
    ssh_config: SSHConfigResponse | None  # Sanitized SSH config (no sensitive data)
    created_at: datetime
    updated_at: datetime


class DatabaseListResponse(CamelModel):
    """Response model for list of databases."""

    databases: list[DatabaseResponse]


def mask_password_in_url(url: str) -> str:
    """Mask password in connection URL for display."""
    if "@" not in url or "://" not in url:
        return url

    try:
        # Extract parts: postgresql://user:password@host:port/db
        protocol, rest = url.split("://", 1)
        if "@" in rest:
            credentials, host_part = rest.rsplit("@", 1)
            if ":" in credentials:
                user, _ = credentials.split(":", 1)
                return f"{protocol}://{user}:****@{host_part}"
        return url
    except Exception:
        return url

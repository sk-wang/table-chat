"""Database metadata models."""

from pydantic import Field

from app.models.base import CamelModel


class ColumnInfo(CamelModel):
    """Column metadata information."""

    name: str = Field(..., description="Column name")
    data_type: str = Field(..., description="Data type (e.g., varchar, integer)")
    is_nullable: bool = Field(True, description="Whether column allows NULL values")
    is_primary_key: bool = Field(False, description="Whether column is part of primary key")
    default_value: str | None = Field(None, description="Default value if any")
    comment: str | None = Field(None, description="Column comment/description")


class TableSummary(CamelModel):
    """Table summary without column details (for listing)."""

    schema_name: str = Field(..., description="Schema name (e.g., public)")
    table_name: str = Field(..., description="Table or view name")
    table_type: str = Field(..., description="Type: 'table' or 'view'")
    comment: str | None = Field(None, description="Table comment/description")


class TableMetadata(CamelModel):
    """Table or view metadata information."""

    schema_name: str = Field(..., description="Schema name (e.g., public)")
    table_name: str = Field(..., description="Table or view name")
    table_type: str = Field(..., description="Type: 'table' or 'view'")
    columns: list[ColumnInfo] = Field(default_factory=list, description="List of columns")
    row_count: int | None = Field(None, description="Estimated row count (for tables)")
    comment: str | None = Field(None, description="Table comment/description")


class TableListResponse(CamelModel):
    """Response for table list (without column details)."""

    name: str = Field(..., description="Database connection name")
    schemas: list[str] = Field(default_factory=list, description="List of schema names")
    tables: list[TableSummary] = Field(default_factory=list, description="List of tables and views")
    last_refreshed: str | None = Field(None, description="Last metadata refresh timestamp")


class DatabaseMetadata(CamelModel):
    """Complete database metadata with all tables and views."""

    name: str = Field(..., description="Database connection name")
    schemas: list[str] = Field(default_factory=list, description="List of schema names")
    tables: list[TableMetadata] = Field(default_factory=list, description="List of tables and views")
    last_refreshed: str | None = Field(None, description="Last metadata refresh timestamp")


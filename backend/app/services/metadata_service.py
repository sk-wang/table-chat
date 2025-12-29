"""Database metadata extraction and caching service."""

from datetime import datetime

from app.connectors.factory import ConnectorFactory
from app.db.sqlite import db_manager
from app.models.metadata import (
    ColumnInfo,
    DatabaseMetadata,
    TableListResponse,
    TableMetadata,
    TableSummary,
)
from app.services.db_manager import database_manager


class MetadataService:
    """Service for extracting and caching database metadata."""

    async def fetch_metadata(self, db_name: str) -> DatabaseMetadata:
        """
        Fetch metadata from database.

        Args:
            db_name: Database connection name

        Returns:
            DatabaseMetadata with tables and columns

        Raises:
            ValueError: If database not found or connection fails
        """
        # Get database info including ssl_disabled
        db = await database_manager.get_database(db_name)
        if not db:
            raise ValueError(f"Database '{db_name}' not found")

        url = db["url"]
        db_type = db.get("db_type", "postgresql")
        ssl_disabled = bool(db.get("ssl_disabled", 0))

        # Get connector and fetch metadata
        connector = ConnectorFactory.get_connector(url)

        # Pass ssl_disabled for MySQL
        if db_type == "mysql":
            schemas, tables = await connector.fetch_metadata(url, ssl_disabled)
        else:
            schemas, tables = await connector.fetch_metadata(url)

        return DatabaseMetadata(
            name=db_name,
            schemas=schemas,
            tables=tables,
            last_refreshed=datetime.now().isoformat(),
        )

    async def cache_metadata(self, db_name: str, metadata: DatabaseMetadata) -> None:
        """
        Cache metadata to SQLite.

        Args:
            db_name: Database connection name
            metadata: Metadata to cache
        """
        # Clear existing metadata for this database
        await db_manager.clear_metadata_for_database(db_name)

        # Save each table's metadata
        for table in metadata.tables:
            # Convert columns to list of dicts for storage
            columns_data = [col.model_dump(by_alias=True) for col in table.columns]

            await db_manager.save_metadata(
                db_name=db_name,
                schema_name=table.schema_name,
                table_name=table.table_name,
                table_type=table.table_type,
                columns=columns_data,
                table_comment=table.comment,
            )

    async def get_cached_metadata(self, db_name: str) -> DatabaseMetadata | None:
        """
        Get cached metadata from SQLite.

        Args:
            db_name: Database connection name

        Returns:
            Cached metadata or None if not found
        """
        rows = await db_manager.get_metadata_for_database(db_name)

        if not rows:
            return None

        # Build table metadata from cached data
        tables: list[TableMetadata] = []
        schemas: set[str] = set()

        for row in rows:
            schema_name = row.get("schema_name", "public")
            schemas.add(schema_name)

            # Note: get_metadata_for_database already parses columns_json to "columns" list
            columns_data = row.get("columns", [])
            try:
                # Handle both camelCase (from cache) and snake_case formats
                columns = []
                for col in columns_data:
                    columns.append(
                        ColumnInfo(
                            name=col.get("name", "unknown"),
                            data_type=col.get("dataType", col.get("data_type", "unknown")),
                            is_nullable=col.get("isNullable", col.get("is_nullable", True)),
                            is_primary_key=col.get("isPrimaryKey", col.get("is_primary_key", False)),
                            default_value=col.get("defaultValue", col.get("default_value")),
                            comment=col.get("comment"),
                        )
                    )
            except (TypeError, KeyError):
                columns = []

            tables.append(
                TableMetadata(
                    schema_name=schema_name,
                    table_name=row.get("table_name", "unknown"),
                    table_type=row.get("table_type", "table"),
                    columns=columns,
                    comment=row.get("table_comment"),
                )
            )

        return DatabaseMetadata(
            name=db_name,
            schemas=list(schemas),
            tables=tables,
            last_refreshed=rows[0].get("created_at") if rows else None,
        )

    async def refresh_metadata(self, db_name: str) -> DatabaseMetadata:
        """
        Refresh metadata from database and update cache.

        Args:
            db_name: Database connection name

        Returns:
            Fresh metadata
        """
        metadata = await self.fetch_metadata(db_name)
        await self.cache_metadata(db_name, metadata)
        return metadata

    async def get_or_refresh_metadata(
        self, db_name: str, force_refresh: bool = False
    ) -> DatabaseMetadata:
        """
        Get metadata from cache or refresh if needed.

        Args:
            db_name: Database connection name
            force_refresh: Force refresh from database

        Returns:
            Metadata (cached or fresh)
        """
        if not force_refresh:
            cached = await self.get_cached_metadata(db_name)
            if cached and cached.tables:
                return cached

        # Refresh from database
        return await self.refresh_metadata(db_name)

    async def get_table_list(self, db_name: str, force_refresh: bool = False) -> TableListResponse:
        """
        Get table list without column details (lightweight).
        
        Args:
            db_name: Database connection name
            force_refresh: Force refresh from database
            
        Returns:
            TableListResponse with tables (no columns)
        """
        # Get full metadata (we'll strip columns)
        metadata = await self.get_or_refresh_metadata(db_name, force_refresh=force_refresh)

        # Convert to table summaries (without columns)
        table_summaries = [
            TableSummary(
                schema_name=table.schema_name,
                table_name=table.table_name,
                table_type=table.table_type,
                comment=table.comment,
            )
            for table in metadata.tables
        ]

        return TableListResponse(
            name=metadata.name,
            schemas=metadata.schemas,
            tables=table_summaries,
            last_refreshed=metadata.last_refreshed,
        )

    async def get_table_details(
        self, db_name: str, schema_name: str, table_name: str
    ) -> TableMetadata | None:
        """
        Get detailed metadata for a specific table.
        
        Args:
            db_name: Database connection name
            schema_name: Schema name
            table_name: Table name
            
        Returns:
            TableMetadata with columns, or None if not found
        """
        # Get cached metadata
        metadata = await self.get_cached_metadata(db_name)

        if not metadata:
            # Try to refresh if not cached
            try:
                metadata = await self.refresh_metadata(db_name)
            except Exception:
                return None

        # Find the specific table
        for table in metadata.tables:
            if table.schema_name == schema_name and table.table_name == table_name:
                return table

        return None


# Global instance
metadata_service = MetadataService()

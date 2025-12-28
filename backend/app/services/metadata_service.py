"""Database metadata extraction and caching service."""

import asyncio
import json
from datetime import datetime
from typing import Any

import psycopg2
from psycopg2.extensions import connection as PgConnection

from app.db.sqlite import db_manager
from app.models.metadata import ColumnInfo, TableMetadata, DatabaseMetadata
from app.services.db_manager import database_manager


class MetadataService:
    """Service for extracting and caching database metadata."""

    async def fetch_metadata(self, db_name: str) -> DatabaseMetadata:
        """
        Fetch metadata from PostgreSQL database.

        Args:
            db_name: Database connection name

        Returns:
            DatabaseMetadata with tables and columns

        Raises:
            ValueError: If database not found or connection fails
        """
        # Get connection URL
        url = await database_manager.get_connection(db_name)

        def _fetch() -> tuple[list[str], list[TableMetadata]]:
            """Synchronous metadata fetch."""
            conn: PgConnection | None = None

            try:
                conn = psycopg2.connect(url)
                cursor = conn.cursor()

                # Get all schemas (excluding system schemas)
                cursor.execute("""
                    SELECT schema_name 
                    FROM information_schema.schemata 
                    WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
                    ORDER BY schema_name
                """)
                schemas = [row[0] for row in cursor.fetchall()]

                # Get all tables and views
                cursor.execute("""
                    SELECT 
                        t.table_schema,
                        t.table_name,
                        t.table_type,
                        obj_description((t.table_schema || '.' || t.table_name)::regclass, 'pg_class') as table_comment
                    FROM information_schema.tables t
                    WHERE t.table_schema NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
                    ORDER BY t.table_schema, t.table_name
                """)
                tables_raw = cursor.fetchall()

                # Get primary key info
                cursor.execute("""
                    SELECT 
                        tc.table_schema,
                        tc.table_name,
                        kcu.column_name
                    FROM information_schema.table_constraints tc
                    JOIN information_schema.key_column_usage kcu
                        ON tc.constraint_name = kcu.constraint_name
                        AND tc.table_schema = kcu.table_schema
                    WHERE tc.constraint_type = 'PRIMARY KEY'
                """)
                pk_columns: dict[str, set[str]] = {}
                for row in cursor.fetchall():
                    key = f"{row[0]}.{row[1]}"
                    if key not in pk_columns:
                        pk_columns[key] = set()
                    pk_columns[key].add(row[2])

                # Get all columns
                cursor.execute("""
                    SELECT 
                        c.table_schema,
                        c.table_name,
                        c.column_name,
                        c.data_type,
                        c.is_nullable,
                        c.column_default,
                        col_description(
                            (c.table_schema || '.' || c.table_name)::regclass,
                            c.ordinal_position
                        ) as column_comment
                    FROM information_schema.columns c
                    WHERE c.table_schema NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
                    ORDER BY c.table_schema, c.table_name, c.ordinal_position
                """)
                columns_raw = cursor.fetchall()

                # Group columns by table
                columns_by_table: dict[str, list[ColumnInfo]] = {}
                for row in columns_raw:
                    key = f"{row[0]}.{row[1]}"
                    if key not in columns_by_table:
                        columns_by_table[key] = []

                    is_pk = key in pk_columns and row[2] in pk_columns[key]

                    columns_by_table[key].append(
                        ColumnInfo(
                            name=row[2],
                            data_type=row[3],
                            is_nullable=row[4] == "YES",
                            is_primary_key=is_pk,
                            default_value=row[5],
                            comment=row[6],
                        )
                    )

                # Build table metadata
                tables: list[TableMetadata] = []
                for row in tables_raw:
                    key = f"{row[0]}.{row[1]}"
                    table_type = "view" if row[2] == "VIEW" else "table"

                    tables.append(
                        TableMetadata(
                            schema_name=row[0],
                            table_name=row[1],
                            table_type=table_type,
                            columns=columns_by_table.get(key, []),
                            comment=row[3],
                        )
                    )

                return schemas, tables

            finally:
                if conn:
                    conn.close()

        # Run in thread pool
        schemas, tables = await asyncio.to_thread(_fetch)

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
                    columns.append(ColumnInfo(
                        name=col.get("name", "unknown"),
                        data_type=col.get("dataType", col.get("data_type", "unknown")),
                        is_nullable=col.get("isNullable", col.get("is_nullable", True)),
                        is_primary_key=col.get("isPrimaryKey", col.get("is_primary_key", False)),
                        default_value=col.get("defaultValue", col.get("default_value")),
                        comment=col.get("comment"),
                    ))
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


# Global instance
metadata_service = MetadataService()


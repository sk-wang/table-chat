"""Unit tests for metadata_service module."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.models.metadata import ColumnInfo, TableMetadata, DatabaseMetadata
from app.services.metadata_service import MetadataService


class TestMetadataService:
    """Test suite for MetadataService."""

    @pytest.fixture
    def service(self):
        """Create a fresh MetadataService instance."""
        return MetadataService()

    @pytest.fixture
    def sample_metadata(self):
        """Create sample DatabaseMetadata for testing."""
        columns = [
            ColumnInfo(
                name="id",
                data_type="integer",
                is_nullable=False,
                is_primary_key=True,
            ),
            ColumnInfo(
                name="name",
                data_type="varchar",
                is_nullable=True,
                is_primary_key=False,
            ),
        ]
        tables = [
            TableMetadata(
                schema_name="public",
                table_name="users",
                table_type="table",
                columns=columns,
            ),
            TableMetadata(
                schema_name="public",
                table_name="user_view",
                table_type="view",
                columns=columns,
            ),
        ]
        return DatabaseMetadata(
            name="testdb",
            schemas=["public"],
            tables=tables,
            last_refreshed="2024-01-01T00:00:00",
        )

    @pytest.mark.asyncio
    async def test_cache_metadata(self, service, sample_metadata):
        """Test caching metadata to SQLite."""
        with patch("app.services.metadata_service.db_manager") as mock_db:
            mock_db.clear_metadata_for_database = AsyncMock()
            mock_db.save_metadata = AsyncMock()

            await service.cache_metadata("testdb", sample_metadata)

            mock_db.clear_metadata_for_database.assert_called_once_with("testdb")
            # Should save each table
            assert mock_db.save_metadata.call_count == 2

    @pytest.mark.asyncio
    async def test_get_cached_metadata_found(self, service):
        """Test getting cached metadata when it exists."""
        mock_rows = [
            {
                "schema_name": "public",
                "table_name": "users",
                "table_type": "table",
                "columns": [
                    {"name": "id", "dataType": "integer", "isNullable": False, "isPrimaryKey": True}
                ],
                "created_at": "2024-01-01T00:00:00",
            }
        ]

        with patch("app.services.metadata_service.db_manager") as mock_db:
            mock_db.get_metadata_for_database = AsyncMock(return_value=mock_rows)

            result = await service.get_cached_metadata("testdb")

            assert result is not None
            assert result.name == "testdb"
            assert len(result.tables) == 1
            assert result.tables[0].table_name == "users"
            assert len(result.tables[0].columns) == 1

    @pytest.mark.asyncio
    async def test_get_cached_metadata_not_found(self, service):
        """Test getting cached metadata when none exists."""
        with patch("app.services.metadata_service.db_manager") as mock_db:
            mock_db.get_metadata_for_database = AsyncMock(return_value=[])

            result = await service.get_cached_metadata("testdb")

            assert result is None

    @pytest.mark.asyncio
    async def test_get_cached_metadata_handles_snake_case(self, service):
        """Test that get_cached_metadata handles snake_case column format."""
        mock_rows = [
            {
                "schema_name": "public",
                "table_name": "users",
                "table_type": "table",
                "columns": [
                    {"name": "id", "data_type": "integer", "is_nullable": False, "is_primary_key": True}
                ],
                "created_at": "2024-01-01T00:00:00",
            }
        ]

        with patch("app.services.metadata_service.db_manager") as mock_db:
            mock_db.get_metadata_for_database = AsyncMock(return_value=mock_rows)

            result = await service.get_cached_metadata("testdb")

            assert result is not None
            assert result.tables[0].columns[0].data_type == "integer"
            assert result.tables[0].columns[0].is_primary_key is True

    @pytest.mark.asyncio
    async def test_refresh_metadata(self, service, sample_metadata):
        """Test refresh_metadata fetches and caches."""
        with patch.object(service, "fetch_metadata", new_callable=AsyncMock) as mock_fetch, \
             patch.object(service, "cache_metadata", new_callable=AsyncMock) as mock_cache:
            mock_fetch.return_value = sample_metadata

            result = await service.refresh_metadata("testdb")

            mock_fetch.assert_called_once_with("testdb")
            mock_cache.assert_called_once_with("testdb", sample_metadata)
            assert result == sample_metadata

    @pytest.mark.asyncio
    async def test_get_or_refresh_uses_cache(self, service, sample_metadata):
        """Test get_or_refresh_metadata returns cached data when available."""
        with patch.object(service, "get_cached_metadata", new_callable=AsyncMock) as mock_cache, \
             patch.object(service, "refresh_metadata", new_callable=AsyncMock) as mock_refresh:
            mock_cache.return_value = sample_metadata

            result = await service.get_or_refresh_metadata("testdb", force_refresh=False)

            mock_cache.assert_called_once_with("testdb")
            mock_refresh.assert_not_called()
            assert result == sample_metadata

    @pytest.mark.asyncio
    async def test_get_or_refresh_refreshes_when_empty(self, service, sample_metadata):
        """Test get_or_refresh_metadata refreshes when cache is empty."""
        empty_metadata = DatabaseMetadata(name="testdb", schemas=[], tables=[])

        with patch.object(service, "get_cached_metadata", new_callable=AsyncMock) as mock_cache, \
             patch.object(service, "refresh_metadata", new_callable=AsyncMock) as mock_refresh:
            mock_cache.return_value = empty_metadata
            mock_refresh.return_value = sample_metadata

            result = await service.get_or_refresh_metadata("testdb", force_refresh=False)

            mock_refresh.assert_called_once_with("testdb")
            assert result == sample_metadata

    @pytest.mark.asyncio
    async def test_get_or_refresh_force_refresh(self, service, sample_metadata):
        """Test get_or_refresh_metadata with force_refresh=True."""
        with patch.object(service, "get_cached_metadata", new_callable=AsyncMock) as mock_cache, \
             patch.object(service, "refresh_metadata", new_callable=AsyncMock) as mock_refresh:
            mock_refresh.return_value = sample_metadata

            result = await service.get_or_refresh_metadata("testdb", force_refresh=True)

            mock_cache.assert_not_called()
            mock_refresh.assert_called_once_with("testdb")
            assert result == sample_metadata

    @pytest.mark.asyncio
    async def test_fetch_metadata_database_not_found(self, service):
        """Test fetch_metadata raises when database not found."""
        with patch("app.services.metadata_service.database_manager") as mock_mgr:
            mock_mgr.get_database = AsyncMock(return_value=None)

            with pytest.raises(ValueError, match="Database 'testdb' not found"):
                await service.fetch_metadata("testdb")

    @pytest.mark.asyncio
    async def test_fetch_metadata_postgresql_success(self, service):
        """Test fetch_metadata for PostgreSQL."""
        from app.models.metadata import ColumnInfo, TableMetadata

        mock_db = {
            "url": "postgresql://localhost/testdb",
            "db_type": "postgresql",
            "ssl_disabled": False,
        }

        mock_schemas = ["public"]
        mock_tables = [
            TableMetadata(
                schema_name="public",
                table_name="users",
                table_type="table",
                columns=[ColumnInfo(name="id", data_type="integer")],
            )
        ]

        mock_connector = MagicMock()
        mock_connector.fetch_metadata = AsyncMock(return_value=(mock_schemas, mock_tables))

        with patch("app.services.metadata_service.database_manager") as mock_mgr, \
             patch("app.services.metadata_service.ConnectorFactory") as mock_factory:
            mock_mgr.get_database = AsyncMock(return_value=mock_db)
            mock_factory.get_connector.return_value = mock_connector

            result = await service.fetch_metadata("testdb")

            assert result.name == "testdb"
            assert "public" in result.schemas
            assert len(result.tables) == 1
            # PostgreSQL should not pass ssl_disabled
            mock_connector.fetch_metadata.assert_called_once_with("postgresql://localhost/testdb")

    @pytest.mark.asyncio
    async def test_fetch_metadata_mysql_with_ssl_disabled(self, service):
        """Test fetch_metadata for MySQL with ssl_disabled."""
        from app.models.metadata import TableMetadata

        mock_db = {
            "url": "mysql://localhost/testdb",
            "db_type": "mysql",
            "ssl_disabled": 1,  # SQLite stores as integer
        }

        mock_connector = MagicMock()
        mock_connector.fetch_metadata = AsyncMock(return_value=([], []))

        with patch("app.services.metadata_service.database_manager") as mock_mgr, \
             patch("app.services.metadata_service.ConnectorFactory") as mock_factory:
            mock_mgr.get_database = AsyncMock(return_value=mock_db)
            mock_factory.get_connector.return_value = mock_connector

            await service.fetch_metadata("testdb")

            # MySQL should pass ssl_disabled=True
            mock_connector.fetch_metadata.assert_called_once_with("mysql://localhost/testdb", True)

    @pytest.mark.asyncio
    async def test_cache_metadata_includes_table_comment(self, service):
        """Test that cache_metadata passes table comment to save_metadata."""
        columns = [
            ColumnInfo(
                name="id",
                data_type="integer",
                is_nullable=False,
                is_primary_key=True,
                comment="Primary key column",
            ),
        ]
        tables = [
            TableMetadata(
                schema_name="public",
                table_name="users",
                table_type="table",
                columns=columns,
                comment="User information table",
            ),
        ]
        metadata = DatabaseMetadata(
            name="testdb",
            schemas=["public"],
            tables=tables,
            last_refreshed="2024-01-01T00:00:00",
        )

        with patch("app.services.metadata_service.db_manager") as mock_db:
            mock_db.clear_metadata_for_database = AsyncMock()
            mock_db.save_metadata = AsyncMock()

            await service.cache_metadata("testdb", metadata)

            # Verify table_comment is passed
            mock_db.save_metadata.assert_called_once()
            call_kwargs = mock_db.save_metadata.call_args
            assert call_kwargs.kwargs.get("table_comment") == "User information table"

    @pytest.mark.asyncio
    async def test_get_cached_metadata_restores_table_comment(self, service):
        """Test that get_cached_metadata restores table comment from cache."""
        mock_rows = [
            {
                "schema_name": "public",
                "table_name": "users",
                "table_type": "table",
                "table_comment": "User information table",
                "columns": [
                    {
                        "name": "id",
                        "dataType": "integer",
                        "isNullable": False,
                        "isPrimaryKey": True,
                        "comment": "Primary key column",
                    }
                ],
                "created_at": "2024-01-01T00:00:00",
            }
        ]

        with patch("app.services.metadata_service.db_manager") as mock_db:
            mock_db.get_metadata_for_database = AsyncMock(return_value=mock_rows)

            result = await service.get_cached_metadata("testdb")

            assert result is not None
            assert result.tables[0].comment == "User information table"
            assert result.tables[0].columns[0].comment == "Primary key column"

    @pytest.mark.asyncio
    async def test_get_cached_metadata_handles_null_comments(self, service):
        """Test that get_cached_metadata handles null/missing comments gracefully."""
        mock_rows = [
            {
                "schema_name": "public",
                "table_name": "users",
                "table_type": "table",
                "table_comment": None,
                "columns": [
                    {
                        "name": "id",
                        "dataType": "integer",
                        "isNullable": False,
                        "isPrimaryKey": True,
                    }
                ],
                "created_at": "2024-01-01T00:00:00",
            }
        ]

        with patch("app.services.metadata_service.db_manager") as mock_db:
            mock_db.get_metadata_for_database = AsyncMock(return_value=mock_rows)

            result = await service.get_cached_metadata("testdb")

            assert result is not None
            assert result.tables[0].comment is None
            assert result.tables[0].columns[0].comment is None


class TestTableListService:
    """Test suite for MetadataService.get_table_list method."""

    @pytest.fixture
    def service(self):
        """Create a fresh MetadataService instance."""
        return MetadataService()

    @pytest.fixture
    def sample_metadata(self):
        """Create sample DatabaseMetadata for testing."""
        columns = [
            ColumnInfo(
                name="id",
                data_type="integer",
                is_nullable=False,
                is_primary_key=True,
            ),
            ColumnInfo(
                name="name",
                data_type="varchar",
                is_nullable=True,
                is_primary_key=False,
            ),
        ]
        tables = [
            TableMetadata(
                schema_name="public",
                table_name="users",
                table_type="table",
                columns=columns,
                comment="用户表",
            ),
            TableMetadata(
                schema_name="public",
                table_name="orders",
                table_type="table",
                columns=columns,
                comment="订单表",
            ),
        ]
        return DatabaseMetadata(
            name="testdb",
            schemas=["public"],
            tables=tables,
            last_refreshed="2024-01-01T00:00:00",
        )

    @pytest.mark.asyncio
    async def test_get_table_list_returns_summary_without_columns(self, service, sample_metadata):
        """Test that get_table_list returns TableSummary without columns."""
        with patch.object(service, "get_or_refresh_metadata", new_callable=AsyncMock) as mock_meta:
            mock_meta.return_value = sample_metadata

            result = await service.get_table_list("testdb")

            assert result is not None
            assert result.name == "testdb"
            assert len(result.tables) == 2
            # Verify it's TableSummary (no columns attribute)
            assert not hasattr(result.tables[0], "columns") or result.tables[0].columns is None
            assert result.tables[0].table_name == "users"
            assert result.tables[0].comment == "用户表"

    @pytest.mark.asyncio
    async def test_get_table_list_with_force_refresh(self, service, sample_metadata):
        """Test get_table_list with force_refresh=True."""
        with patch.object(service, "get_or_refresh_metadata", new_callable=AsyncMock) as mock_meta:
            mock_meta.return_value = sample_metadata

            await service.get_table_list("testdb", force_refresh=True)

            mock_meta.assert_called_once_with("testdb", force_refresh=True)

    @pytest.mark.asyncio
    async def test_get_table_list_empty_when_no_tables(self, service):
        """Test get_table_list returns empty list when metadata has no tables."""
        empty_metadata = DatabaseMetadata(name="testdb", schemas=[], tables=[])
        
        with patch.object(service, "get_or_refresh_metadata", new_callable=AsyncMock) as mock_meta:
            mock_meta.return_value = empty_metadata

            result = await service.get_table_list("testdb")

            assert result is not None
            assert result.name == "testdb"
            assert len(result.tables) == 0


class TestTableDetailsService:
    """Test suite for MetadataService.get_table_details method."""

    @pytest.fixture
    def service(self):
        """Create a fresh MetadataService instance."""
        return MetadataService()

    @pytest.fixture
    def sample_metadata(self):
        """Create sample DatabaseMetadata for testing."""
        users_columns = [
            ColumnInfo(
                name="id",
                data_type="integer",
                is_nullable=False,
                is_primary_key=True,
            ),
            ColumnInfo(
                name="name",
                data_type="varchar",
                is_nullable=True,
                is_primary_key=False,
            ),
        ]
        orders_columns = [
            ColumnInfo(
                name="order_id",
                data_type="integer",
                is_nullable=False,
                is_primary_key=True,
            ),
        ]
        tables = [
            TableMetadata(
                schema_name="public",
                table_name="users",
                table_type="table",
                columns=users_columns,
                comment="用户表",
            ),
            TableMetadata(
                schema_name="sales",
                table_name="orders",
                table_type="table",
                columns=orders_columns,
                comment="订单表",
            ),
        ]
        return DatabaseMetadata(
            name="testdb",
            schemas=["public", "sales"],
            tables=tables,
            last_refreshed="2024-01-01T00:00:00",
        )

    @pytest.mark.asyncio
    async def test_get_table_details_returns_full_table(self, service, sample_metadata):
        """Test that get_table_details returns TableMetadata with columns."""
        with patch.object(service, "get_cached_metadata", new_callable=AsyncMock) as mock_cache:
            mock_cache.return_value = sample_metadata

            result = await service.get_table_details("testdb", "public", "users")

            assert result is not None
            assert result.schema_name == "public"
            assert result.table_name == "users"
            assert result.comment == "用户表"
            assert len(result.columns) == 2
            assert result.columns[0].name == "id"

    @pytest.mark.asyncio
    async def test_get_table_details_different_schema(self, service, sample_metadata):
        """Test get_table_details finds table in different schema."""
        with patch.object(service, "get_cached_metadata", new_callable=AsyncMock) as mock_cache:
            mock_cache.return_value = sample_metadata

            result = await service.get_table_details("testdb", "sales", "orders")

            assert result is not None
            assert result.schema_name == "sales"
            assert result.table_name == "orders"

    @pytest.mark.asyncio
    async def test_get_table_details_not_found(self, service, sample_metadata):
        """Test get_table_details returns None when table not found."""
        with patch.object(service, "get_cached_metadata", new_callable=AsyncMock) as mock_cache:
            mock_cache.return_value = sample_metadata

            result = await service.get_table_details("testdb", "public", "nonexistent")

            assert result is None

    @pytest.mark.asyncio
    async def test_get_table_details_wrong_schema(self, service, sample_metadata):
        """Test get_table_details returns None when schema doesn't match."""
        with patch.object(service, "get_cached_metadata", new_callable=AsyncMock) as mock_cache:
            mock_cache.return_value = sample_metadata

            # users is in public, not sales
            result = await service.get_table_details("testdb", "sales", "users")

            assert result is None

    @pytest.mark.asyncio
    async def test_get_table_details_refreshes_when_no_cache(self, service, sample_metadata):
        """Test get_table_details refreshes when no cache exists."""
        with patch.object(service, "get_cached_metadata", new_callable=AsyncMock) as mock_cache, \
             patch.object(service, "refresh_metadata", new_callable=AsyncMock) as mock_refresh:
            mock_cache.return_value = None
            mock_refresh.return_value = sample_metadata

            result = await service.get_table_details("testdb", "public", "users")

            mock_refresh.assert_called_once_with("testdb")
            assert result is not None
            assert result.table_name == "users"

    @pytest.mark.asyncio
    async def test_get_table_details_returns_none_when_refresh_fails(self, service):
        """Test get_table_details returns None when refresh fails."""
        with patch.object(service, "get_cached_metadata", new_callable=AsyncMock) as mock_cache, \
             patch.object(service, "refresh_metadata", new_callable=AsyncMock) as mock_refresh:
            mock_cache.return_value = None
            mock_refresh.side_effect = Exception("Connection failed")

            result = await service.get_table_details("testdb", "public", "users")

            assert result is None

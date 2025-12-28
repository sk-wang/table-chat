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
            mock_mgr.get_connection = AsyncMock(side_effect=ValueError("Database 'testdb' not found"))

            with pytest.raises(ValueError, match="Database 'testdb' not found"):
                await service.fetch_metadata("testdb")

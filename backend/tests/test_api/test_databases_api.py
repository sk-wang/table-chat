"""Integration tests for database management API."""

from unittest.mock import AsyncMock, patch


class TestDatabasesAPI:
    """Test database management endpoints."""

    def test_list_databases_empty(self, test_client):
        """Test listing databases when none exist."""
        response = test_client.get("/api/v1/dbs")
        assert response.status_code == 200
        
        data = response.json()
        assert "databases" in data
        assert isinstance(data["databases"], list)

    def test_create_database_invalid_url(self, test_client):
        """Test creating database with invalid URL."""
        response = test_client.put(
            "/api/v1/dbs/testdb",
            json={"url": "invalid://url"}
        )
        # Should fail connection test
        assert response.status_code in [400, 503]

    def test_get_database_not_found(self, test_client):
        """Test getting non-existent database."""
        response = test_client.get("/api/v1/dbs/nonexistent")
        assert response.status_code == 404
        
        data = response.json()
        assert "error" in data or "detail" in data

    def test_delete_database_not_found(self, test_client):
        """Test deleting non-existent database."""
        response = test_client.delete("/api/v1/dbs/nonexistent")
        assert response.status_code == 404


class TestDatabasesAPIWithMocks:
    """Test database endpoints with mocked dependencies."""

    def test_create_database_success(self, test_client):
        """Test successfully creating a database connection."""
        mock_db = {
            "name": "mydb",
            "url": "postgresql://user:pass@localhost:5432/mydb",
            "created_at": "2025-01-01T00:00:00",
            "updated_at": "2025-01-01T00:00:00",
        }

        with patch("app.api.v1.dbs.database_manager") as mock_mgr:
            mock_mgr.create_or_update_database = AsyncMock(return_value=mock_db)

            response = test_client.put(
                "/api/v1/dbs/mydb",
                json={"url": "postgresql://user:pass@localhost:5432/mydb"}
            )

            assert response.status_code == 200
            data = response.json()
            assert data["name"] == "mydb"
            # Password should be masked
            assert "****" in data["url"]

    def test_create_database_connection_error(self, test_client):
        """Test database creation when connection fails."""
        with patch("app.api.v1.dbs.database_manager") as mock_mgr:
            mock_mgr.create_or_update_database = AsyncMock(
                side_effect=ConnectionError("Connection refused")
            )

            response = test_client.put(
                "/api/v1/dbs/mydb",
                json={"url": "postgresql://user:pass@localhost:5432/mydb"}
            )

            assert response.status_code == 503
            assert "Connection refused" in response.json()["detail"]

    def test_create_database_value_error(self, test_client):
        """Test database creation with invalid input."""
        with patch("app.api.v1.dbs.database_manager") as mock_mgr:
            mock_mgr.create_or_update_database = AsyncMock(
                side_effect=ValueError("Invalid database URL format")
            )

            response = test_client.put(
                "/api/v1/dbs/mydb",
                json={"url": "bad-url"}
            )

            assert response.status_code == 400
            assert "Invalid database URL format" in response.json()["detail"]

    def test_get_database_success(self, test_client):
        """Test getting database details successfully."""
        mock_db = {
            "name": "mydb",
            "url": "postgresql://user:pass@localhost:5432/mydb",
            "created_at": "2025-01-01T00:00:00",
            "updated_at": "2025-01-01T00:00:00",
        }

        with patch("app.api.v1.dbs.database_manager") as mock_mgr:
            mock_mgr.get_database = AsyncMock(return_value=mock_db)

            response = test_client.get("/api/v1/dbs/mydb")

            assert response.status_code == 200
            data = response.json()
            assert data["name"] == "mydb"
            assert "****" in data["url"]

    def test_list_databases_with_data(self, test_client):
        """Test listing databases when some exist."""
        mock_dbs = [
            {
                "name": "db1",
                "url": "postgresql://user:pass@host1:5432/db1",
                "created_at": "2025-01-01T00:00:00",
                "updated_at": "2025-01-01T00:00:00",
            },
            {
                "name": "db2",
                "url": "postgresql://user:pass@host2:5432/db2",
                "created_at": "2025-01-02T00:00:00",
                "updated_at": "2025-01-02T00:00:00",
            },
        ]

        with patch("app.api.v1.dbs.database_manager") as mock_mgr:
            mock_mgr.list_databases = AsyncMock(return_value=mock_dbs)

            response = test_client.get("/api/v1/dbs")

            assert response.status_code == 200
            data = response.json()
            assert len(data["databases"]) == 2
            assert data["databases"][0]["name"] == "db1"
            assert data["databases"][1]["name"] == "db2"

    def test_delete_database_success(self, test_client):
        """Test successfully deleting a database."""
        with patch("app.api.v1.dbs.database_manager") as mock_mgr:
            mock_mgr.delete_database = AsyncMock(return_value=True)

            response = test_client.delete("/api/v1/dbs/mydb")

            assert response.status_code == 204

    def test_get_metadata_success(self, test_client):
        """Test getting database metadata successfully."""
        from app.models.metadata import DatabaseMetadata, TableMetadata, ColumnInfo

        mock_metadata = DatabaseMetadata(
            name="mydb",
            schemas=["public"],
            tables=[
                TableMetadata(
                    schema_name="public",
                    table_name="users",
                    table_type="table",
                    columns=[
                        ColumnInfo(name="id", data_type="integer", is_nullable=False),
                    ],
                )
            ],
        )

        with patch("app.api.v1.dbs.database_manager") as mock_db_mgr, \
             patch("app.api.v1.dbs.metadata_service") as mock_meta_svc:
            mock_db_mgr.get_database = AsyncMock(return_value={"name": "mydb"})
            mock_meta_svc.get_or_refresh_metadata = AsyncMock(return_value=mock_metadata)

            response = test_client.get("/api/v1/dbs/mydb/metadata")

            assert response.status_code == 200

    def test_get_metadata_not_found(self, test_client):
        """Test getting metadata for non-existent database."""
        with patch("app.api.v1.dbs.database_manager") as mock_mgr:
            mock_mgr.get_database = AsyncMock(return_value=None)

            response = test_client.get("/api/v1/dbs/nonexistent/metadata")

            assert response.status_code == 404

    def test_get_metadata_service_error(self, test_client):
        """Test metadata fetch when service fails."""
        with patch("app.api.v1.dbs.database_manager") as mock_db_mgr, \
             patch("app.api.v1.dbs.metadata_service") as mock_meta_svc:
            mock_db_mgr.get_database = AsyncMock(return_value={"name": "mydb"})
            mock_meta_svc.get_or_refresh_metadata = AsyncMock(
                side_effect=Exception("Connection timeout")
            )

            response = test_client.get("/api/v1/dbs/mydb/metadata")

            assert response.status_code == 503
            assert "Failed to fetch metadata" in response.json()["detail"]

    def test_refresh_metadata_success(self, test_client):
        """Test refreshing database metadata successfully."""
        from app.models.metadata import DatabaseMetadata

        mock_metadata = DatabaseMetadata(
            name="mydb",
            schemas=[],
            tables=[],
        )

        with patch("app.api.v1.dbs.database_manager") as mock_db_mgr, \
             patch("app.api.v1.dbs.metadata_service") as mock_meta_svc:
            mock_db_mgr.get_database = AsyncMock(return_value={"name": "mydb"})
            mock_meta_svc.refresh_metadata = AsyncMock(return_value=mock_metadata)

            response = test_client.post("/api/v1/dbs/mydb/metadata/refresh")

            assert response.status_code == 200

    def test_refresh_metadata_not_found(self, test_client):
        """Test refreshing metadata for non-existent database."""
        with patch("app.api.v1.dbs.database_manager") as mock_mgr:
            mock_mgr.get_database = AsyncMock(return_value=None)

            response = test_client.post("/api/v1/dbs/nonexistent/metadata/refresh")

            assert response.status_code == 404

    def test_refresh_metadata_service_error(self, test_client):
        """Test metadata refresh when service fails."""
        with patch("app.api.v1.dbs.database_manager") as mock_db_mgr, \
             patch("app.api.v1.dbs.metadata_service") as mock_meta_svc:
            mock_db_mgr.get_database = AsyncMock(return_value={"name": "mydb"})
            mock_meta_svc.refresh_metadata = AsyncMock(
                side_effect=Exception("Connection timeout")
            )

            response = test_client.post("/api/v1/dbs/mydb/metadata/refresh")

            assert response.status_code == 503
            assert "Failed to refresh metadata" in response.json()["detail"]


class TestTableListAPI:
    """Test table list API endpoints (lightweight metadata)."""

    def test_get_table_list_success(self, test_client):
        """Test getting table list without column details."""
        from app.models.metadata import TableListResponse, TableSummary

        mock_table_list = TableListResponse(
            name="mydb",
            schemas=["public"],
            tables=[
                TableSummary(
                    schema_name="public",
                    table_name="users",
                    table_type="table",
                    comment="用户表",
                ),
                TableSummary(
                    schema_name="public",
                    table_name="orders",
                    table_type="table",
                    comment="订单表",
                ),
            ],
            last_refreshed="2025-01-01T00:00:00",
        )

        with patch("app.api.v1.dbs.database_manager") as mock_db_mgr, \
             patch("app.api.v1.dbs.metadata_service") as mock_meta_svc:
            mock_db_mgr.get_database = AsyncMock(return_value={"name": "mydb"})
            mock_meta_svc.get_table_list = AsyncMock(return_value=mock_table_list)

            response = test_client.get("/api/v1/dbs/mydb/metadata/tables")

            assert response.status_code == 200
            data = response.json()
            assert data["name"] == "mydb"
            assert len(data["tables"]) == 2
            assert data["tables"][0]["tableName"] == "users"
            # Verify no columns in response (lightweight)
            assert "columns" not in data["tables"][0]

    def test_get_table_list_not_found(self, test_client):
        """Test getting table list for non-existent database."""
        with patch("app.api.v1.dbs.database_manager") as mock_mgr:
            mock_mgr.get_database = AsyncMock(return_value=None)

            response = test_client.get("/api/v1/dbs/nonexistent/metadata/tables")

            assert response.status_code == 404

    def test_get_table_list_with_refresh(self, test_client):
        """Test getting table list with refresh parameter."""
        from app.models.metadata import TableListResponse

        mock_table_list = TableListResponse(
            name="mydb",
            schemas=[],
            tables=[],
        )

        with patch("app.api.v1.dbs.database_manager") as mock_db_mgr, \
             patch("app.api.v1.dbs.metadata_service") as mock_meta_svc:
            mock_db_mgr.get_database = AsyncMock(return_value={"name": "mydb"})
            mock_meta_svc.get_table_list = AsyncMock(return_value=mock_table_list)

            response = test_client.get("/api/v1/dbs/mydb/metadata/tables?refresh=true")

            assert response.status_code == 200
            # Verify refresh=true was passed
            mock_meta_svc.get_table_list.assert_called_once_with("mydb", force_refresh=True)


class TestTableDetailsAPI:
    """Test table details API endpoints (with columns)."""

    def test_get_table_details_success(self, test_client):
        """Test getting table details with columns."""
        from app.models.metadata import TableMetadata, ColumnInfo

        mock_table = TableMetadata(
            schema_name="public",
            table_name="users",
            table_type="table",
            columns=[
                ColumnInfo(name="id", data_type="integer", is_nullable=False, is_primary_key=True),
                ColumnInfo(name="name", data_type="varchar", is_nullable=True),
                ColumnInfo(name="email", data_type="varchar", is_nullable=False),
            ],
            comment="用户表",
        )

        with patch("app.api.v1.dbs.database_manager") as mock_db_mgr, \
             patch("app.api.v1.dbs.metadata_service") as mock_meta_svc:
            mock_db_mgr.get_database = AsyncMock(return_value={"name": "mydb"})
            mock_meta_svc.get_table_details = AsyncMock(return_value=mock_table)

            response = test_client.get("/api/v1/dbs/mydb/metadata/tables/public/users")

            assert response.status_code == 200
            data = response.json()
            assert data["schemaName"] == "public"
            assert data["tableName"] == "users"
            assert len(data["columns"]) == 3
            assert data["columns"][0]["name"] == "id"
            assert data["columns"][0]["isPrimaryKey"] is True

    def test_get_table_details_not_found_db(self, test_client):
        """Test getting table details for non-existent database."""
        with patch("app.api.v1.dbs.database_manager") as mock_mgr:
            mock_mgr.get_database = AsyncMock(return_value=None)

            response = test_client.get("/api/v1/dbs/nonexistent/metadata/tables/public/users")

            assert response.status_code == 404
            assert "not found" in response.json()["detail"].lower()

    def test_get_table_details_not_found_table(self, test_client):
        """Test getting details for non-existent table."""
        with patch("app.api.v1.dbs.database_manager") as mock_db_mgr, \
             patch("app.api.v1.dbs.metadata_service") as mock_meta_svc:
            mock_db_mgr.get_database = AsyncMock(return_value={"name": "mydb"})
            mock_meta_svc.get_table_details = AsyncMock(return_value=None)

            response = test_client.get("/api/v1/dbs/mydb/metadata/tables/public/nonexistent")

            assert response.status_code == 404
            assert "public.nonexistent" in response.json()["detail"]

    def test_get_table_details_service_error(self, test_client):
        """Test table details fetch when service fails."""
        with patch("app.api.v1.dbs.database_manager") as mock_db_mgr, \
             patch("app.api.v1.dbs.metadata_service") as mock_meta_svc:
            mock_db_mgr.get_database = AsyncMock(return_value={"name": "mydb"})
            mock_meta_svc.get_table_details = AsyncMock(
                side_effect=Exception("Connection timeout")
            )

            response = test_client.get("/api/v1/dbs/mydb/metadata/tables/public/users")

            assert response.status_code == 503
            assert "Failed to fetch table details" in response.json()["detail"]


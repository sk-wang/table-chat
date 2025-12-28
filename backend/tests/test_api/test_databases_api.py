"""Integration tests for database management API."""


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


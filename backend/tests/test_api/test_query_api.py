"""Integration tests for query execution API."""


class TestQueryAPI:
    """Test query execution endpoints."""

    def test_query_database_not_found(self, test_client):
        """Test querying non-existent database."""
        response = test_client.post(
            "/api/v1/dbs/nonexistent/query",
            json={"sql": "SELECT 1"}
        )
        # May return 400 (validation), 404 (not found), or 503 (service error)
        assert response.status_code in [400, 404, 503]

    def test_query_invalid_sql(self, test_client):
        """Test executing invalid SQL."""
        response = test_client.post(
            "/api/v1/dbs/testdb/query",
            json={"sql": "This is not SQL!!!"}
        )
        assert response.status_code == 400
        
        data = response.json()
        assert "detail" in data
        assert "syntax error" in data["detail"].lower() or "sql" in data["detail"].lower()

    def test_query_non_select_statement(self, test_client):
        """Test executing non-SELECT statement."""
        response = test_client.post(
            "/api/v1/dbs/testdb/query",
            json={"sql": "INSERT INTO users VALUES (1)"}
        )
        assert response.status_code == 400
        
        data = response.json()
        assert "detail" in data
        assert "only select" in data["detail"].lower() or "insert" in data["detail"].lower()

    def test_query_update_statement(self, test_client):
        """Test rejecting UPDATE statement."""
        response = test_client.post(
            "/api/v1/dbs/testdb/query",
            json={"sql": "UPDATE users SET name = 'hacker'"}
        )
        assert response.status_code == 400

    def test_query_delete_statement(self, test_client):
        """Test rejecting DELETE statement."""
        response = test_client.post(
            "/api/v1/dbs/testdb/query",
            json={"sql": "DELETE FROM users"}
        )
        assert response.status_code == 400

    def test_query_create_statement(self, test_client):
        """Test rejecting CREATE statement."""
        response = test_client.post(
            "/api/v1/dbs/testdb/query",
            json={"sql": "CREATE TABLE evil (id INT)"}
        )
        assert response.status_code == 400


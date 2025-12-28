"""Integration tests for query execution API."""

from unittest.mock import AsyncMock, patch


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


class TestQueryAPIWithMocks:
    """Test query endpoints with mocked dependencies."""

    def test_query_success(self, test_client):
        """Test successfully executing a query."""
        mock_result = (
            "SELECT * FROM users LIMIT 1000",  # final_sql
            ["id", "name", "email"],  # columns
            [{"id": 1, "name": "Alice", "email": "alice@example.com"}],  # rows
            15,  # execution_time_ms
            True,  # truncated
        )

        with patch("app.api.v1.query.query_service") as mock_svc:
            mock_svc.execute_validated_query = AsyncMock(return_value=mock_result)

            response = test_client.post(
                "/api/v1/dbs/mydb/query",
                json={"sql": "SELECT * FROM users"}
            )

            assert response.status_code == 200
            data = response.json()
            assert data["sql"] == "SELECT * FROM users LIMIT 1000"
            assert data["result"]["columns"] == ["id", "name", "email"]
            assert data["result"]["rowCount"] == 1
            assert data["result"]["truncated"] is True
            assert data["executionTimeMs"] == 15

    def test_query_value_error(self, test_client):
        """Test query with validation error."""
        with patch("app.api.v1.query.query_service") as mock_svc:
            mock_svc.execute_validated_query = AsyncMock(
                side_effect=ValueError("SQL syntax error: unexpected token")
            )

            response = test_client.post(
                "/api/v1/dbs/mydb/query",
                json={"sql": "SELECT * FROM"}
            )

            assert response.status_code == 400
            assert "syntax error" in response.json()["detail"].lower()

    def test_query_service_error(self, test_client):
        """Test query when service fails."""
        with patch("app.api.v1.query.query_service") as mock_svc:
            mock_svc.execute_validated_query = AsyncMock(
                side_effect=Exception("Connection lost")
            )

            response = test_client.post(
                "/api/v1/dbs/mydb/query",
                json={"sql": "SELECT 1"}
            )

            assert response.status_code == 503
            assert "Query execution failed" in response.json()["detail"]


class TestNaturalQueryAPI:
    """Test natural language query endpoint."""

    def test_natural_query_empty_prompt(self, test_client):
        """Test natural query with empty prompt."""
        with patch("app.api.v1.query.llm_service") as mock_llm:
            mock_llm.is_available = True

            response = test_client.post(
                "/api/v1/dbs/mydb/query/natural",
                json={"prompt": ""}
            )

            assert response.status_code == 400
            assert "empty" in response.json()["detail"].lower()

    def test_natural_query_whitespace_prompt(self, test_client):
        """Test natural query with whitespace-only prompt."""
        with patch("app.api.v1.query.llm_service") as mock_llm:
            mock_llm.is_available = True

            response = test_client.post(
                "/api/v1/dbs/mydb/query/natural",
                json={"prompt": "   "}
            )

            assert response.status_code == 400
            assert "empty" in response.json()["detail"].lower()

    def test_natural_query_llm_unavailable(self, test_client):
        """Test natural query when LLM is not configured."""
        with patch("app.api.v1.query.llm_service") as mock_llm:
            mock_llm.is_available = False

            response = test_client.post(
                "/api/v1/dbs/mydb/query/natural",
                json={"prompt": "Show all users"}
            )

            assert response.status_code == 503
            assert "not configured" in response.json()["detail"].lower()

    def test_natural_query_database_not_found(self, test_client):
        """Test natural query for non-existent database."""
        with patch("app.api.v1.query.llm_service") as mock_llm, \
             patch("app.services.db_manager.database_manager") as mock_db_mgr:
            mock_llm.is_available = True
            mock_db_mgr.get_database = AsyncMock(return_value=None)

            response = test_client.post(
                "/api/v1/dbs/nonexistent/query/natural",
                json={"prompt": "Show all users"}
            )

            assert response.status_code == 404
            assert "not found" in response.json()["detail"].lower()

    def test_natural_query_success(self, test_client):
        """Test successful natural language query."""
        with patch("app.api.v1.query.llm_service") as mock_llm, \
             patch("app.services.db_manager.database_manager") as mock_db_mgr:
            mock_llm.is_available = True
            mock_llm.generate_sql = AsyncMock(
                return_value=("SELECT * FROM users", "查询所有用户")
            )
            mock_db_mgr.get_database = AsyncMock(return_value={"name": "mydb"})

            response = test_client.post(
                "/api/v1/dbs/mydb/query/natural",
                json={"prompt": "显示所有用户"}
            )

            assert response.status_code == 200
            data = response.json()
            assert data["generatedSql"] == "SELECT * FROM users"
            assert data["explanation"] == "查询所有用户"

    def test_natural_query_llm_error(self, test_client):
        """Test natural query when LLM fails."""
        with patch("app.api.v1.query.llm_service") as mock_llm, \
             patch("app.services.db_manager.database_manager") as mock_db_mgr:
            mock_llm.is_available = True
            mock_llm.generate_sql = AsyncMock(
                side_effect=Exception("OpenAI API error")
            )
            mock_db_mgr.get_database = AsyncMock(return_value={"name": "mydb"})

            response = test_client.post(
                "/api/v1/dbs/mydb/query/natural",
                json={"prompt": "Show users"}
            )

            assert response.status_code == 503
            assert "LLM generation failed" in response.json()["detail"]

    def test_natural_query_validation_error(self, test_client):
        """Test natural query when generated SQL is invalid."""
        with patch("app.api.v1.query.llm_service") as mock_llm, \
             patch("app.services.db_manager.database_manager") as mock_db_mgr:
            mock_llm.is_available = True
            mock_llm.generate_sql = AsyncMock(
                side_effect=ValueError("Generated query is not a SELECT statement")
            )
            mock_db_mgr.get_database = AsyncMock(return_value={"name": "mydb"})

            response = test_client.post(
                "/api/v1/dbs/mydb/query/natural",
                json={"prompt": "Delete all users"}
            )

            assert response.status_code == 400
            assert "not a SELECT statement" in response.json()["detail"]


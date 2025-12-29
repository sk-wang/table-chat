"""Unit tests for Pydantic models."""

import json

from app.models.base import CamelModel
from app.models.database import DatabaseCreateRequest, DatabaseResponse, mask_password_in_url
from app.models.query import QueryRequest, QueryResponse, QueryResult
from app.models.error import ErrorResponse, SQLErrorResponse


class TestCamelModel:
    """Test camelCase serialization."""

    def test_camel_case_serialization(self):
        """Test snake_case to camelCase conversion."""
        class TestModel(CamelModel):
            first_name: str
            last_name: str
            age_in_years: int

        model = TestModel(first_name="John", last_name="Doe", age_in_years=30)
        json_data = json.loads(model.model_dump_json(by_alias=True))
        
        assert "firstName" in json_data
        assert "lastName" in json_data
        assert "ageInYears" in json_data
        assert "first_name" not in json_data

    def test_camel_case_deserialization(self):
        """Test camelCase to snake_case parsing."""
        class TestModel(CamelModel):
            first_name: str
            last_name: str

        json_data = '{"firstName": "Jane", "lastName": "Smith"}'
        model = TestModel.model_validate_json(json_data)
        
        assert model.first_name == "Jane"
        assert model.last_name == "Smith"


class TestDatabaseModels:
    """Test database-related models."""

    def test_database_create_request(self):
        """Test DatabaseCreateRequest model."""
        request = DatabaseCreateRequest(url="postgresql://localhost/testdb")
        assert request.url == "postgresql://localhost/testdb"

    def test_database_response(self):
        """Test DatabaseResponse model."""
        response = DatabaseResponse(
            name="testdb",
            url="postgresql://localhost/testdb",
            db_type="postgresql",
            ssl_disabled=False,
            created_at="2024-01-01T00:00:00",
            updated_at="2024-01-01T00:00:00",
        )

        json_data = json.loads(response.model_dump_json(by_alias=True))
        assert json_data["name"] == "testdb"
        assert json_data["dbType"] == "postgresql"
        assert json_data["sslDisabled"] is False
        assert json_data["createdAt"] == "2024-01-01T00:00:00"
        assert json_data["updatedAt"] == "2024-01-01T00:00:00"


class TestQueryModels:
    """Test query-related models."""

    def test_query_request(self):
        """Test QueryRequest model."""
        request = QueryRequest(sql="SELECT * FROM users")
        assert request.sql == "SELECT * FROM users"

    def test_query_result(self):
        """Test QueryResult model."""
        result = QueryResult(
            columns=["id", "name"],
            rows=[{"id": 1, "name": "John"}],
            row_count=1,
            truncated=False,
        )
        
        json_data = json.loads(result.model_dump_json(by_alias=True))
        assert json_data["columns"] == ["id", "name"]
        assert json_data["rowCount"] == 1
        assert json_data["truncated"] is False

    def test_query_response(self):
        """Test QueryResponse model."""
        result = QueryResult(
            columns=["id"],
            rows=[{"id": 1}],
            row_count=1,
            truncated=True,
        )
        
        response = QueryResponse(
            sql="SELECT * FROM users LIMIT 1000",
            result=result,
            execution_time_ms=42,
        )
        
        json_data = json.loads(response.model_dump_json(by_alias=True))
        assert "executionTimeMs" in json_data
        assert json_data["executionTimeMs"] == 42


class TestErrorModels:
    """Test error response models."""

    def test_error_response(self):
        """Test ErrorResponse model."""
        error = ErrorResponse(error="Not found", detail="Database does not exist")
        
        json_data = json.loads(error.model_dump_json())
        assert json_data["error"] == "Not found"
        assert json_data["detail"] == "Database does not exist"

    def test_error_response_no_detail(self):
        """Test ErrorResponse without detail."""
        error = ErrorResponse(error="Bad request")
        
        json_data = json.loads(error.model_dump_json())
        assert json_data["error"] == "Bad request"
        assert json_data["detail"] is None

    def test_sql_error_response(self):
        """Test SQLErrorResponse model with line and column info."""
        error = SQLErrorResponse(
            error="SQL syntax error",
            detail="Unexpected token",
            line=5,
            column=10,
        )
        
        json_data = json.loads(error.model_dump_json())
        assert json_data["error"] == "SQL syntax error"
        assert json_data["line"] == 5
        assert json_data["column"] == 10


class TestMaskPassword:
    """Test password masking utility."""

    def test_mask_password_basic(self):
        """Test masking password in basic URL."""
        url = "postgresql://user:secret@localhost:5432/mydb"
        masked = mask_password_in_url(url)
        
        assert "****" in masked
        assert "secret" not in masked
        assert "user" in masked
        assert "localhost:5432/mydb" in masked

    def test_mask_password_no_password(self):
        """Test URL without password."""
        url = "postgresql://user@localhost:5432/mydb"
        masked = mask_password_in_url(url)
        
        # Should return as-is or handle gracefully
        assert "localhost" in masked

    def test_mask_password_no_at_symbol(self):
        """Test URL without @ symbol."""
        url = "postgresql://localhost/mydb"
        masked = mask_password_in_url(url)
        
        assert masked == url

    def test_mask_password_no_protocol(self):
        """Test URL without protocol (should handle gracefully)."""
        url = "localhost/mydb"
        masked = mask_password_in_url(url)
        
        assert masked == url

    def test_mask_password_mysql(self):
        """Test masking password in MySQL URL."""
        url = "mysql://admin:p@ssword123@db.example.com:3306/app"
        masked = mask_password_in_url(url)
        
        assert "****" in masked
        assert "p@ssword123" not in masked
        assert "admin" in masked

    def test_mask_password_complex_password(self):
        """Test masking password with special characters."""
        url = "postgresql://user:p%40ss%23word@localhost/db"
        masked = mask_password_in_url(url)
        
        assert "****" in masked
        assert "p%40ss%23word" not in masked


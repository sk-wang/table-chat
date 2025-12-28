"""Unit tests for Pydantic models."""

import json

from app.models.base import CamelModel
from app.models.database import DatabaseCreateRequest, DatabaseResponse
from app.models.query import QueryRequest, QueryResponse, QueryResult
from app.models.error import ErrorResponse


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
            created_at="2024-01-01T00:00:00",
            updated_at="2024-01-01T00:00:00",
        )

        json_data = json.loads(response.model_dump_json(by_alias=True))
        assert json_data["name"] == "testdb"
        assert json_data["dbType"] == "postgresql"
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


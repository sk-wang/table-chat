"""Integration tests for natural language query API."""

import os

import pytest

# PostgreSQL 连接 URL (必须通过环境变量设置)
POSTGRES_URL = os.getenv("POSTGRES_URL")
TEST_DB_NAME = "test_natural_query_db"


@pytest.mark.integration
class TestNaturalQueryAPI:
    """Test natural language query endpoint."""

    @pytest.fixture(autouse=True)
    async def setup_test_database(self, test_client):
        """Setup test database connection."""
        # 检查是否设置了环境变量
        if not POSTGRES_URL:
            pytest.skip("POSTGRES_URL environment variable not set")

        # Create test database connection
        response = test_client.put(
            f"/api/v1/dbs/{TEST_DB_NAME}",
            json={"url": POSTGRES_URL}
        )
        
        if response.status_code != 200:
            pytest.skip(f"PostgreSQL not available: {response.text}")
        
        yield
        
        # Cleanup
        test_client.delete(f"/api/v1/dbs/{TEST_DB_NAME}")

    def test_natural_query_simple(self, test_client):
        """Test simple natural language query."""
        response = test_client.post(
            f"/api/v1/dbs/{TEST_DB_NAME}/query/natural",
            json={"prompt": "查询数据库版本"}
        )
        
        # May be 200 if LLM is configured, 503 if not
        if response.status_code == 503:
            pytest.skip("LLM service not configured")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "generatedSql" in data
        assert data["generatedSql"].strip().upper().startswith("SELECT")

    def test_natural_query_with_explanation(self, test_client):
        """Test that natural query returns explanation."""
        response = test_client.post(
            f"/api/v1/dbs/{TEST_DB_NAME}/query/natural",
            json={"prompt": "列出所有 schema"}
        )
        
        if response.status_code == 503:
            pytest.skip("LLM service not configured")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "generatedSql" in data
        # Explanation may be present
        if "explanation" in data and data["explanation"]:
            assert isinstance(data["explanation"], str)

    def test_natural_query_nonexistent_database(self, test_client):
        """Test natural query with nonexistent database."""
        response = test_client.post(
            "/api/v1/dbs/nonexistent_db_12345/query/natural",
            json={"prompt": "查询用户信息"}
        )
        
        # Should return 404 or 503 (LLM not configured)
        assert response.status_code in [404, 503]

    def test_natural_query_empty_prompt(self, test_client):
        """Test natural query with empty prompt."""
        response = test_client.post(
            f"/api/v1/dbs/{TEST_DB_NAME}/query/natural",
            json={"prompt": ""}
        )
        
        # Should return 400 (validation error) or 422 (Pydantic)
        assert response.status_code in [400, 422, 503]


class TestNaturalQueryWithoutLLM:
    """Test natural query endpoint without LLM configured."""

    def test_llm_unavailable_returns_503(self, test_client, monkeypatch):
        """Test that unconfigured LLM returns 503."""
        # Patch settings to simulate no LLM config
        from app.config import settings
        monkeypatch.setattr(settings, "llm_api_key", "")
        monkeypatch.setattr(settings, "openai_api_key", "")
        
        response = test_client.post(
            "/api/v1/dbs/testdb/query/natural",
            json={"prompt": "查询用户信息"}
        )
        
        assert response.status_code == 503
        data = response.json()
        assert "LLM" in data.get("detail", "") or "not configured" in data.get("detail", "").lower()


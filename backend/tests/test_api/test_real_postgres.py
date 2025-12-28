"""Integration tests with real PostgreSQL database.

这些测试需要真实的 PostgreSQL 连接才能运行。
可以通过设置环境变量 POSTGRES_URL 来指定数据库连接。
"""

import os

import pytest

# PostgreSQL 连接 URL
POSTGRES_URL = os.getenv("POSTGRES_URL", "postgresql://root:0412yxyxysYs@localhost:5432/postgres")
TEST_DB_NAME = "test_postgres_db"


@pytest.mark.integration
class TestRealPostgresIntegration:
    """使用真实 PostgreSQL 的集成测试."""

    @pytest.fixture(autouse=True)
    async def setup_test_database(self, test_client):
        """设置测试数据库连接."""
        # 创建测试数据库连接
        response = test_client.put(
            f"/api/v1/dbs/{TEST_DB_NAME}",
            json={"url": POSTGRES_URL}
        )
        
        # 可能连接失败（如果 PostgreSQL 未运行）
        if response.status_code != 200:
            pytest.skip(f"PostgreSQL 不可用: {response.text}")
        
        yield
        
        # 清理：删除测试数据库连接
        test_client.delete(f"/api/v1/dbs/{TEST_DB_NAME}")

    def test_create_database_connection_success(self, test_client):
        """测试成功创建数据库连接."""
        response = test_client.put(
            f"/api/v1/dbs/{TEST_DB_NAME}",
            json={"url": POSTGRES_URL}
        )
        
        if response.status_code == 200:
            assert response.status_code == 200
            data = response.json()
            assert data["name"] == TEST_DB_NAME
            assert "createdAt" in data
        else:
            pytest.skip("PostgreSQL connection failed")

    def test_simple_select_query(self, test_client):
        """测试简单的 SELECT 查询."""
        response = test_client.post(
            f"/api/v1/dbs/{TEST_DB_NAME}/query",
            json={"sql": "SELECT 1 as test_column"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "result" in data
        assert data["result"]["columns"] == ["test_column"]
        assert len(data["result"]["rows"]) == 1
        assert data["result"]["rows"][0]["test_column"] == 1
        assert "executionTimeMs" in data

    def test_version_query(self, test_client):
        """测试查询数据库版本."""
        response = test_client.post(
            f"/api/v1/dbs/{TEST_DB_NAME}/query",
            json={"sql": "SELECT version()"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "result" in data
        assert "version" in data["result"]["columns"][0].lower()
        assert "PostgreSQL" in data["result"]["rows"][0]["version"]

    def test_query_with_limit_injection(self, test_client):
        """测试自动 LIMIT 注入."""
        response = test_client.post(
            f"/api/v1/dbs/{TEST_DB_NAME}/query",
            json={"sql": "SELECT * FROM pg_tables"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # 应该自动添加 LIMIT 1000
        assert data["result"]["truncated"] is True
        assert "LIMIT 1000" in data["sql"]

    def test_query_with_existing_limit(self, test_client):
        """测试保留现有 LIMIT."""
        response = test_client.post(
            f"/api/v1/dbs/{TEST_DB_NAME}/query",
            json={"sql": "SELECT * FROM pg_tables LIMIT 5"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # 不应该修改已有的 LIMIT
        assert data["result"]["truncated"] is False
        assert data["result"]["rowCount"] <= 5

    def test_query_with_where_clause(self, test_client):
        """测试带 WHERE 条件的查询."""
        response = test_client.post(
            f"/api/v1/dbs/{TEST_DB_NAME}/query",
            json={"sql": "SELECT * FROM pg_tables WHERE schemaname = 'public'"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "result" in data
        # 所有结果的 schemaname 应该是 'public'
        for row in data["result"]["rows"]:
            assert row.get("schemaname") == "public"

    def test_schema_information_query(self, test_client):
        """测试查询 schema 信息."""
        response = test_client.post(
            f"/api/v1/dbs/{TEST_DB_NAME}/query",
            json={"sql": "SELECT schema_name FROM information_schema.schemata ORDER BY schema_name LIMIT 5"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "result" in data
        assert "schema_name" in data["result"]["columns"]
        assert len(data["result"]["rows"]) > 0

    def test_columns_information_query(self, test_client):
        """测试查询列信息."""
        response = test_client.post(
            f"/api/v1/dbs/{TEST_DB_NAME}/query",
            json={
                "sql": """
                    SELECT column_name, data_type, is_nullable 
                    FROM information_schema.columns 
                    WHERE table_schema = 'pg_catalog' 
                    AND table_name = 'pg_tables' 
                    LIMIT 5
                """
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "result" in data
        expected_columns = ["column_name", "data_type", "is_nullable"]
        for col in expected_columns:
            assert col in data["result"]["columns"]

    def test_aggregate_query(self, test_client):
        """测试聚合查询."""
        response = test_client.post(
            f"/api/v1/dbs/{TEST_DB_NAME}/query",
            json={
                "sql": "SELECT COUNT(*) as table_count FROM pg_tables WHERE schemaname = 'public'"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "result" in data
        assert "table_count" in data["result"]["columns"]
        assert isinstance(data["result"]["rows"][0]["table_count"], int)

    def test_reject_insert_statement(self, test_client):
        """测试拒绝 INSERT 语句."""
        response = test_client.post(
            f"/api/v1/dbs/{TEST_DB_NAME}/query",
            json={"sql": "INSERT INTO test_table VALUES (1, 'test')"}
        )
        
        assert response.status_code == 400
        data = response.json()
        assert "only select" in data["detail"].lower() or "insert" in data["detail"].lower()

    def test_reject_update_statement(self, test_client):
        """测试拒绝 UPDATE 语句."""
        response = test_client.post(
            f"/api/v1/dbs/{TEST_DB_NAME}/query",
            json={"sql": "UPDATE pg_tables SET tablename = 'hacked'"}
        )
        
        assert response.status_code == 400

    def test_reject_delete_statement(self, test_client):
        """测试拒绝 DELETE 语句."""
        response = test_client.post(
            f"/api/v1/dbs/{TEST_DB_NAME}/query",
            json={"sql": "DELETE FROM pg_tables"}
        )
        
        assert response.status_code == 400

    def test_reject_create_statement(self, test_client):
        """测试拒绝 CREATE 语句."""
        response = test_client.post(
            f"/api/v1/dbs/{TEST_DB_NAME}/query",
            json={"sql": "CREATE TABLE evil_table (id INT)"}
        )
        
        assert response.status_code == 400

    def test_execution_time_tracking(self, test_client):
        """测试执行时间统计."""
        response = test_client.post(
            f"/api/v1/dbs/{TEST_DB_NAME}/query",
            json={"sql": "SELECT 1"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "executionTimeMs" in data
        assert isinstance(data["executionTimeMs"], int)
        assert data["executionTimeMs"] >= 0


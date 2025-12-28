# Quickstart: MySQL 数据库支持开发指南

**Feature**: 004-mysql-support  
**Date**: 2025-12-28

## Prerequisites

1. Python 3.13+ (通过 uv 管理)
2. 运行中的 MySQL 5.7+ 或 8.x 实例
3. 现有 TableChat 开发环境

## 开发环境设置

### 1. 安装 MySQL 驱动依赖

```bash
cd backend
uv add mysql-connector-python
```

### 2. 准备测试用 MySQL 数据库

使用用户提供的连接：
```
mysql://root:123456@localhost:3306/scinew
```

或使用 Docker 快速启动：
```bash
docker run -d \
  --name mysql-test \
  -e MYSQL_ROOT_PASSWORD=123456 \
  -e MYSQL_DATABASE=scinew \
  -p 3306:3306 \
  mysql:8.0
```

### 3. 验证 MySQL 连接

```bash
# 使用 mysql 客户端测试
mysql -h localhost -P 3306 -u root -p123456 scinew -e "SELECT 1"
```

---

## 实现顺序

### Step 1: 创建抽象基类

创建 `backend/app/connectors/base.py`:

```python
from abc import ABC, abstractmethod
from typing import Any

class DatabaseConnector(ABC):
    """数据库连接器抽象基类"""
    
    @abstractmethod
    async def test_connection(self, url: str, timeout: int = 10) -> None:
        """测试连接，失败抛出 ConnectionError"""
        pass
    
    @abstractmethod
    async def fetch_metadata(self, url: str) -> tuple[list[str], list[Any]]:
        """提取元数据，返回 (schemas, tables)"""
        pass
    
    @abstractmethod
    async def execute_query(
        self, url: str, sql: str
    ) -> tuple[list[str], list[dict[str, Any]], int]:
        """执行查询，返回 (columns, rows, execution_time_ms)"""
        pass
    
    @abstractmethod
    def get_dialect(self) -> str:
        """返回 sqlglot 方言名称"""
        pass
```

### Step 2: 迁移 PostgreSQL 实现

创建 `backend/app/connectors/postgres.py`，将现有 `metadata_service.py` 和 `query_service.py` 中的 PostgreSQL 逻辑迁移过来。

### Step 3: 创建工厂类

创建 `backend/app/connectors/factory.py`:

```python
from app.connectors.base import DatabaseConnector
from app.connectors.postgres import PostgreSQLConnector
from app.connectors.mysql import MySQLConnector

class ConnectorFactory:
    @staticmethod
    def get_connector(url: str) -> DatabaseConnector:
        if url.startswith(("postgresql://", "postgres://")):
            return PostgreSQLConnector()
        elif url.startswith("mysql://"):
            return MySQLConnector()
        raise ValueError(f"Unsupported database URL: {url}")
    
    @staticmethod
    def detect_db_type(url: str) -> str:
        if url.startswith(("postgresql://", "postgres://")):
            return "postgresql"
        elif url.startswith("mysql://"):
            return "mysql"
        raise ValueError(f"Unknown database type: {url}")
```

### Step 4: 实现 MySQL 连接器

创建 `backend/app/connectors/mysql.py`:

```python
import asyncio
import mysql.connector
from app.connectors.base import DatabaseConnector

class MySQLConnector(DatabaseConnector):
    async def test_connection(self, url: str, timeout: int = 10) -> None:
        def _connect():
            config = self._parse_url(url)
            config['connect_timeout'] = timeout
            conn = mysql.connector.connect(**config)
            conn.close()
        
        try:
            await asyncio.to_thread(_connect)
        except mysql.connector.Error as e:
            raise ConnectionError(f"Failed to connect: {e}")
    
    def get_dialect(self) -> str:
        return "mysql"
    
    def _parse_url(self, url: str) -> dict:
        """解析 mysql://user:pass@host:port/db"""
        from urllib.parse import urlparse
        parsed = urlparse(url)
        return {
            'user': parsed.username,
            'password': parsed.password,
            'host': parsed.hostname,
            'port': parsed.port or 3306,
            'database': parsed.path.lstrip('/'),
        }
```

### Step 5: 更新服务层

更新 `db_manager.py`, `metadata_service.py`, `query_service.py` 使用工厂获取连接器。

### Step 6: 更新数据模型

更新 `DatabaseResponse` 添加 `db_type` 字段。

### Step 7: 更新前端

更新 TypeScript 类型和 UI 组件显示数据库类型。

---

## 测试命令

### 运行后端测试
```bash
cd backend
uv run pytest tests/ -v
```

### 运行 MySQL 连接器专项测试
```bash
uv run pytest tests/test_services/test_mysql_connector.py -v
```

### 运行 API 测试
```bash
# 使用 VSCode REST Client 打开 api-tests.rest
# 或使用 httpie
http PUT localhost:7888/api/v1/dbs/mysql-test url=mysql://root:123456@localhost:3306/scinew
```

### 运行 E2E 测试
```bash
cd frontend
npx playwright test mysql-support.spec.ts
```

---

## 调试技巧

### 验证 MySQL 元数据提取
```python
# 在 Python REPL 中测试
import asyncio
from app.connectors.mysql import MySQLConnector

async def test():
    conn = MySQLConnector()
    schemas, tables = await conn.fetch_metadata("mysql://root:123456@localhost:3306/scinew")
    print(f"Schemas: {schemas}")
    print(f"Tables: {len(tables)}")

asyncio.run(test())
```

### 检查 sqlglot MySQL 解析
```python
import sqlglot

sql = "SELECT * FROM users WHERE age > 18"
parsed = sqlglot.parse_one(sql, dialect="mysql")
print(parsed.sql(dialect="mysql"))
# 输出: SELECT * FROM users WHERE age > 18

# 添加 LIMIT
with_limit = parsed.limit(100)
print(with_limit.sql(dialect="mysql"))
# 输出: SELECT * FROM users WHERE age > 18 LIMIT 100
```

---

## 常见问题

### Q: MySQL 8.0 连接报认证错误

**A**: MySQL 8.0 默认使用 `caching_sha2_password`，确保使用最新版 mysql-connector-python。

### Q: 中文表名/列名乱码

**A**: 确保连接时指定字符集：
```python
config['charset'] = 'utf8mb4'
```

### Q: 连接超时

**A**: 检查 MySQL 服务器是否允许远程连接：
```sql
-- 在 MySQL 中执行
SELECT host, user FROM mysql.user WHERE user = 'root';
-- 确保有 '%' 或具体的客户端 IP
```

---

## 检查清单

- [ ] MySQL 驱动已安装
- [ ] 测试数据库可连接
- [ ] PostgreSQL 功能无回归
- [ ] MySQL 连接/元数据/查询正常
- [ ] 自然语言生成 MySQL 语法正确
- [ ] 前端显示数据库类型
- [ ] 单元测试通过
- [ ] E2E 测试通过


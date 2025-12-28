# Implementation Plan: MySQL 数据库支持

**Branch**: `004-mysql-support` | **Date**: 2025-12-28 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-mysql-support/spec.md`

## Summary

扩展 TableChat 系统以支持 MySQL 数据库，包括连接管理、元数据提取、SQL 查询执行和自然语言 SQL 生成。当前系统仅支持 PostgreSQL（使用 psycopg2），需要引入抽象层以遵循 SOLID 原则，实现多数据库类型支持。

**技术方案**：引入 DatabaseConnector 抽象接口，实现策略模式（Strategy Pattern），根据连接字符串自动选择 PostgreSQL 或 MySQL 连接器。

## Technical Context

**Language/Version**: Python 3.13+ (uv 管理)  
**Primary Dependencies**: FastAPI, Pydantic, psycopg2 (PostgreSQL), mysql-connector-python (MySQL), sqlglot  
**Storage**: SQLite（元数据缓存）, PostgreSQL/MySQL（用户数据库）  
**Testing**: pytest, pytest-asyncio, httpx, Playwright  
**Target Platform**: Linux/macOS 服务端  
**Project Type**: Web 应用（FastAPI 后端 + React 前端）  
**Performance Goals**: 元数据提取 <10s (100表), 查询额外开销 <500ms  
**Constraints**: 连接超时 10 秒，只允许 SELECT 查询  
**Scale/Scope**: 支持 MySQL 5.7+/8.x，100+ 表的数据库

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 原则 | 状态 | 说明 |
|------|------|------|
| I. Ergonomic Python | ✅ 通过 | 使用类型提示、现代 Python 特性 |
| II. TypeScript Frontend | ✅ 通过 | 前端改动使用 TypeScript |
| III. Strict Type Annotations | ✅ 通过 | 所有函数有类型标注 |
| IV. Pydantic Data Models | ✅ 通过 | 使用 Pydantic BaseModel，camelCase JSON |
| V. Open Access | ✅ 通过 | 无需认证 |
| VI. Comprehensive Testing | ✅ 通过 | 包含单元测试、接口测试、E2E 测试 |
| SQL Query Constraints | ✅ 通过 | 仅 SELECT，自动 LIMIT |

**Gate Result**: ✅ 全部通过

## Project Structure

### Documentation (this feature)

```text
specs/004-mysql-support/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
backend/
├── app/
│   ├── connectors/              # 新增: 数据库连接器抽象层
│   │   ├── __init__.py
│   │   ├── base.py              # DatabaseConnector 抽象基类
│   │   ├── postgres.py          # PostgreSQLConnector 实现
│   │   ├── mysql.py             # MySQLConnector 实现
│   │   └── factory.py           # ConnectorFactory 工厂类
│   ├── models/
│   │   └── database.py          # 更新: 添加 db_type 字段
│   ├── services/
│   │   ├── db_manager.py        # 更新: 使用连接器抽象
│   │   ├── metadata_service.py  # 更新: 委托给连接器
│   │   ├── query_service.py     # 更新: 委托给连接器
│   │   └── llm_service.py       # 更新: 支持 MySQL 方言
│   ├── db/
│   │   └── sqlite.py            # 更新: 添加 db_type 列
│   └── config.py                # 更新: 添加 MySQL 超时配置
└── tests/
    ├── test_services/
    │   ├── test_mysql_connector.py   # 新增
    │   └── test_connector_factory.py # 新增
    └── test_api/
        └── test_mysql_integration.py # 新增

frontend/
├── src/
│   ├── types/
│   │   └── index.ts             # 更新: 添加 dbType 字段
│   └── components/
│       └── sidebar/
│           └── DatabaseSidebar.tsx  # 更新: 显示数据库类型图标
└── e2e/
    └── mysql-support.spec.ts    # 新增: E2E 测试
```

**Structure Decision**: 采用 Web 应用结构，新增 `connectors/` 模块实现数据库抽象层。

## Complexity Tracking

| 新增复杂度 | 为什么需要 | 被拒绝的更简单方案 |
|-----------|------------|-------------------|
| DatabaseConnector 抽象层 | 遵循 SOLID 的 OCP 和 DIP 原则，支持未来扩展更多数据库类型 | 直接在现有代码中添加 if-else 判断：会导致代码耦合，违反 OCP |
| ConnectorFactory 工厂类 | 根据 URL 协议自动选择连接器 | 手动传递数据库类型参数：增加 API 复杂度 |

## Architecture Design

### 核心抽象层设计

```python
# app/connectors/base.py
from abc import ABC, abstractmethod
from typing import Any

class DatabaseConnector(ABC):
    """数据库连接器抽象基类"""
    
    @abstractmethod
    async def test_connection(self, url: str, timeout: int) -> None:
        """测试数据库连接"""
        pass
    
    @abstractmethod
    async def fetch_metadata(self, url: str) -> tuple[list[str], list[TableMetadata]]:
        """提取数据库元数据（schemas, tables）"""
        pass
    
    @abstractmethod
    async def execute_query(self, url: str, sql: str) -> tuple[list[str], list[dict], int]:
        """执行查询，返回 (columns, rows, execution_time_ms)"""
        pass
    
    @abstractmethod
    def get_dialect(self) -> str:
        """返回 sqlglot 方言名称"""
        pass
```

### 连接器工厂设计

```python
# app/connectors/factory.py
class ConnectorFactory:
    """根据 URL 协议选择合适的连接器"""
    
    @staticmethod
    def get_connector(url: str) -> DatabaseConnector:
        if url.startswith("postgresql://") or url.startswith("postgres://"):
            return PostgreSQLConnector()
        elif url.startswith("mysql://"):
            return MySQLConnector()
        else:
            raise ValueError(f"Unsupported database URL: {url}")
    
    @staticmethod
    def detect_db_type(url: str) -> str:
        """检测数据库类型：'postgresql' 或 'mysql'"""
        if url.startswith("postgresql://") or url.startswith("postgres://"):
            return "postgresql"
        elif url.startswith("mysql://"):
            return "mysql"
        else:
            raise ValueError(f"Unknown database type: {url}")
```

### 数据模型更新

```python
# app/models/database.py 更新
class DatabaseResponse(CamelModel):
    name: str
    url: str
    db_type: str  # 新增: "postgresql" 或 "mysql"
    created_at: datetime
    updated_at: datetime
```

### SQLite Schema 更新

```sql
-- 添加 db_type 列
ALTER TABLE databases ADD COLUMN db_type TEXT DEFAULT 'postgresql';
```

## Implementation Phases

### Phase 1: 抽象层 & PostgreSQL 重构 (P1)
1. 创建 `connectors/base.py` 定义抽象接口
2. 创建 `connectors/postgres.py` 将现有 PostgreSQL 逻辑迁移
3. 创建 `connectors/factory.py` 工厂类
4. 更新 `db_manager.py` 使用工厂
5. 更新 `metadata_service.py` 使用连接器
6. 更新 `query_service.py` 使用连接器
7. 运行现有测试确保无回归

### Phase 2: MySQL 连接器实现 (P1)
1. 创建 `connectors/mysql.py` 实现 MySQL 连接
2. 实现 MySQL 元数据提取（INFORMATION_SCHEMA）
3. 实现 MySQL 查询执行
4. 添加 MySQL 连接器单元测试

### Phase 3: 数据模型 & 存储更新 (P1)
1. 更新 `DatabaseResponse` 添加 `db_type`
2. 更新 SQLite schema 添加 `db_type` 列
3. 更新 API 响应包含数据库类型
4. 添加数据库类型自动检测逻辑

### Phase 4: LLM 服务更新 (P2)
1. 更新 `llm_service.py` 系统提示支持 MySQL 语法
2. 根据数据库类型选择正确的 SQL 方言
3. 测试自然语言生成 MySQL 查询

### Phase 5: 前端更新 (P1)
1. 更新 TypeScript 类型定义
2. 在数据库列表中显示类型图标
3. E2E 测试

### Phase 6: 测试 & 文档 (P1)
1. 单元测试覆盖
2. 接口测试（.rest 文件）
3. E2E 测试
4. 更新 README

## Key Technical Decisions

| 决策 | 选择 | 理由 |
|------|------|------|
| MySQL 驱动 | mysql-connector-python | 纯 Python 实现，无需 C 依赖，与 psycopg2 风格一致 |
| 抽象模式 | Strategy Pattern | 符合 SOLID，易于扩展新数据库类型 |
| 类型检测 | URL 协议前缀 | 简单可靠，无需用户手动指定 |
| sqlglot 方言 | 动态选择 | 根据 db_type 返回 "postgres" 或 "mysql" |

## Risk Mitigation

| 风险 | 缓解措施 |
|------|---------|
| 重构破坏现有 PostgreSQL 功能 | Phase 1 完成后运行全部现有测试 |
| MySQL 语法差异导致查询失败 | 使用 sqlglot 进行语法验证和转换 |
| MySQL 5.x/8.x 兼容性问题 | 使用 INFORMATION_SCHEMA 标准接口 |

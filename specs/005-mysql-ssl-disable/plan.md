# Implementation Plan: MySQL SSL 模式配置支持

**Branch**: `005-mysql-ssl-disable` | **Date**: 2025-12-29 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/005-mysql-ssl-disable/spec.md`

## Summary

允许用户在添加/编辑 MySQL 数据库连接时，通过界面上的"禁用 SSL"复选框来配置 SSL 模式，解决 SSL 协议不兼容导致的连接失败问题。

## Technical Context

**Language/Version**: Python 3.11 (backend), TypeScript (frontend)  
**Primary Dependencies**: FastAPI, Pydantic, mysql-connector-python (backend); React, Ant Design (frontend)  
**Storage**: SQLite (连接配置存储)  
**Testing**: pytest (backend), vitest (frontend)  
**Target Platform**: Web application  
**Performance Goals**: N/A (配置功能，无性能敏感操作)  
**Constraints**: 向后兼容现有数据库连接  
**Scale/Scope**: 单个配置字段的添加，涉及前后端全链路

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- ✅ 功能范围小且清晰
- ✅ 不引入新的外部依赖
- ✅ 遵循现有代码结构和模式
- ✅ 向后兼容

## Project Structure

### Documentation (this feature)

```text
specs/005-mysql-ssl-disable/
├── plan.md              # This file
├── spec.md              # Feature specification
├── checklists/
│   └── requirements.md  # Quality checklist
└── tasks.md             # Task list (created by /speckit.tasks)
```

### Source Code (repository root)

```text
backend/
├── app/
│   ├── api/v1/
│   │   └── dbs.py                 # API 端点 - 处理 ssl_disabled 参数
│   ├── connectors/
│   │   └── mysql.py               # MySQL 连接器 - 应用 ssl_disabled 配置
│   ├── db/
│   │   └── sqlite.py              # SQLite 存储 - 新增 ssl_disabled 列
│   ├── models/
│   │   └── database.py            # 数据模型 - 添加 ssl_disabled 字段
│   └── services/
│       └── db_manager.py          # 业务服务 - 传递 ssl_disabled 配置
└── tests/
    └── test_connectors/
        └── test_mysql_connector.py # MySQL 连接器测试

frontend/
├── src/
│   ├── components/database/
│   │   └── AddDatabaseModal.tsx   # 添加"禁用 SSL"复选框
│   └── types/
│       └── index.ts               # 类型定义 - 添加 sslDisabled 字段
└── e2e/
    └── database-management.spec.ts # E2E 测试
```

**Structure Decision**: 遵循现有 Web 应用结构，前后端分离

## Design Decisions

### 1. 数据存储

在 SQLite `databases` 表中新增 `ssl_disabled` 列：
- 类型: `INTEGER` (0 或 1，SQLite 无原生布尔类型)
- 默认值: `0` (不禁用，保持安全优先)
- 迁移: 使用现有的迁移模式（检查列是否存在后 ALTER TABLE）

### 2. API 变更

扩展 `DatabaseCreateRequest` 模型：
```python
class DatabaseCreateRequest(CamelModel):
    url: str
    ssl_disabled: bool = False  # 新增，仅 MySQL 生效
```

扩展 `DatabaseResponse` 模型：
```python
class DatabaseResponse(CamelModel):
    name: str
    url: str
    db_type: str
    ssl_disabled: bool  # 新增
    created_at: datetime
    updated_at: datetime
```

### 3. MySQL 连接器修改

在 `mysql.connector.connect()` 调用中添加 `ssl_disabled` 参数：
```python
conn = mysql.connector.connect(
    host=params["host"],
    port=params["port"],
    user=params["user"],
    password=params["password"],
    database=params["database"],
    connection_timeout=timeout,
    ssl_disabled=ssl_disabled,  # 新增
)
```

### 4. 前端 UI

在 `AddDatabaseModal` 组件中：
- 当 `dbType === 'mysql'` 时显示"禁用 SSL"复选框
- 使用 Ant Design 的 `Checkbox` 组件
- 默认不勾选

## Data Flow

```
用户界面 (AddDatabaseModal)
    ↓ { url, sslDisabled }
API (PUT /api/v1/dbs/{name})
    ↓ DatabaseCreateRequest
DatabaseManager.create_or_update_database()
    ↓ 传递 ssl_disabled 到连接器
MySQLConnector.test_connection(url, timeout, ssl_disabled)
    ↓ 使用 ssl_disabled=True 连接
SQLiteManager.create_or_update_database(name, url, db_type, ssl_disabled)
    ↓ 存储到数据库
```

## Complexity Tracking

> 无复杂性违规，本功能简单直接

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | N/A | N/A |

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| 迁移失败导致现有连接丢失 | 低 | 高 | 使用现有迁移模式，仅 ADD COLUMN |
| MySQL 强制 SSL 时禁用失败 | 中 | 低 | 显示清晰错误信息 |
| PostgreSQL 误操作 SSL 选项 | 低 | 低 | 前端仅对 MySQL 显示选项 |


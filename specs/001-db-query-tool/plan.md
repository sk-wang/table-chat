# Implementation Plan: 数据库查询工具

**Branch**: `001-db-query-tool` | **Date**: 2025-12-28 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/001-db-query-tool/spec.md`

## Summary

构建一个数据库查询工具，允许用户添加 PostgreSQL 数据库连接，自动获取并缓存数据库 metadata（表、视图、字段信息），提供 SQL 编辑器执行查询，并支持通过自然语言生成 SQL。后端使用 FastAPI + sqlglot + OpenAI SDK，前端使用 React + Refine 5 + Monaco Editor，视觉风格参考 JetBrains IDE。

## Technical Context

**Language/Version**: Python 3.13+ (uv) / TypeScript 5.x  
**Primary Dependencies**:
- Backend: FastAPI, Pydantic, sqlglot, openai, psycopg2, aiosqlite
- Frontend: React 18, Refine 5, Tailwind CSS, Ant Design, Monaco Editor

**Storage**: 
- 应用数据: SQLite (`./scinew.db`)
- 目标数据库: PostgreSQL (用户提供连接)

**Testing**: pytest (backend), vitest (frontend)  
**Target Platform**: Web (浏览器) + Linux/macOS 服务端  
**Project Type**: Web application (frontend + backend)  
**Performance Goals**: 
- metadata 获取 < 10s (100表)
- SQL 查询响应 < 5s
- 自然语言生成 < 3s

**Constraints**:
- 仅支持 SELECT 查询
- 默认 LIMIT 1000
- CORS 允许所有 origin
- 无需认证

**Scale/Scope**: 单用户/小团队使用，10+ 数据库连接

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 原则 | 状态 | 说明 |
|------|------|------|
| I. Ergonomic Python Backend | ✅ Pass | 使用 FastAPI + 类型提示 |
| II. TypeScript Frontend | ✅ Pass | 使用 TypeScript + React |
| III. Strict Type Annotations | ✅ Pass | Pydantic 模型 + TypeScript strict |
| IV. Pydantic Data Models | ✅ Pass | 所有 API 使用 Pydantic + camelCase |
| V. Open Access | ✅ Pass | 无认证，所有 API 公开访问 |

**Gate Result**: ✅ PASS - 可以进入 Phase 0

## Project Structure

### Documentation (this feature)

```text
specs/001-db-query-tool/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (OpenAPI)
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI 应用入口
│   ├── config.py            # 配置管理
│   ├── models/              # Pydantic 模型
│   │   ├── __init__.py
│   │   ├── database.py      # DatabaseConnection 模型
│   │   ├── metadata.py      # TableMetadata, ColumnInfo 模型
│   │   └── query.py         # Query 请求/响应模型
│   ├── services/            # 业务逻辑
│   │   ├── __init__.py
│   │   ├── db_manager.py    # 数据库连接管理
│   │   ├── metadata_service.py  # Metadata 获取与存储
│   │   ├── query_service.py     # SQL 解析与执行
│   │   └── llm_service.py       # 自然语言转 SQL
│   ├── api/                 # API 路由
│   │   ├── __init__.py
│   │   └── v1/
│   │       ├── __init__.py
│   │       ├── dbs.py       # /api/v1/dbs 路由
│   │       └── query.py     # 查询相关路由
│   └── db/                  # SQLite 数据库层
│       ├── __init__.py
│       └── sqlite.py        # SQLite 操作
└── tests/
    ├── conftest.py
    ├── test_api/
    └── test_services/

frontend/
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── config/
│   │   └── refine.ts        # Refine 配置
│   ├── providers/
│   │   └── data-provider.ts # 自定义 data provider
│   ├── components/
│   │   ├── layout/          # 布局组件
│   │   ├── database/        # 数据库连接相关
│   │   ├── schema/          # Schema 浏览器
│   │   ├── editor/          # SQL 编辑器 (Monaco)
│   │   └── results/         # 查询结果表格
│   ├── pages/
│   │   ├── databases/       # 数据库管理页面
│   │   └── query/           # 查询页面
│   ├── services/
│   │   └── api.ts           # API 客户端
│   └── types/
│       └── index.ts         # TypeScript 类型定义
├── tailwind.config.js
├── vite.config.ts
└── package.json
```

**Structure Decision**: 选择 Web application 结构（Option 2），前后端分离。后端提供 RESTful API，前端为 SPA。

## Environment Configuration

```bash
# Backend (.env)
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_API_KEY=sk-xxx
DATABASE_PATH=./scinew.db

# Frontend (.env)
VITE_API_BASE_URL=http://localhost:8000
```

## Complexity Tracking

无需填写 - Constitution Check 全部通过，无违规项。

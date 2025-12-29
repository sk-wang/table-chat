# tableChat Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-12-28

## Active Technologies
- Python 3.13+ (uv) / TypeScript 5.x + FastAPI (后端) / React + Refine 5 + Ant Design (前端) (003-table-search)
- SQLite (元数据存储) - 无需新增存储 (003-table-search)
- Python 3.13+ (uv 管理) + FastAPI, Pydantic, psycopg2 (PostgreSQL), mysql-connector-python (MySQL), sqlglo (004-mysql-support)
- SQLite（元数据缓存）, PostgreSQL/MySQL（用户数据库） (004-mysql-support)
- Python 3.13+ (uv 管理) + FastAPI, OpenAI SDK, Pydantic (006-metadata-prompt-chain)
- SQLite (元数据缓存) (006-metadata-prompt-chain)
- TypeScript 5.x + React 18+, Ant Design 5.x (007-localstorage-cache)
- localStorage (浏览器原生 API) (007-localstorage-cache)

- Python 3.13+ (uv) / TypeScript 5.x (001-db-query-tool)

## Project Structure

```text
src/
tests/
```

## Commands

cd src [ONLY COMMANDS FOR ACTIVE TECHNOLOGIES][ONLY COMMANDS FOR ACTIVE TECHNOLOGIES] pytest [ONLY COMMANDS FOR ACTIVE TECHNOLOGIES][ONLY COMMANDS FOR ACTIVE TECHNOLOGIES] ruff check .

## Code Style

Python 3.13+ (uv) / TypeScript 5.x: Follow standard conventions

## Recent Changes
- 007-localstorage-cache: Added TypeScript 5.x + React 18+, Ant Design 5.x
- 006-metadata-prompt-chain: Added Python 3.13+ (uv 管理) + FastAPI, OpenAI SDK, Pydantic
- 004-mysql-support: Added Python 3.13+ (uv 管理) + FastAPI, Pydantic, psycopg2 (PostgreSQL), mysql-connector-python (MySQL), sqlglo


<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->

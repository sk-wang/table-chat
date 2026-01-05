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
- TypeScript 5.9+ (Vite + React 19) + React, Ant Design, react-resizable (已安装) (008-resizable-query-panel)
- localStorage (browser) (008-resizable-query-panel)
- Python 3.13+ (backend), Node.js 22 (frontend build) + Docker, Docker Compose V2, Nginx (frontend serving), uvicorn (backend) (012-docker-setup)
- SQLite (via Docker Volume 持久化) (012-docker-setup)
- TypeScript 5.x + React, Ant Design, 浏览器 File API (014-ssh-key-file-picker)
- N/A（前端文件读取，不涉及持久化） (014-ssh-key-file-picker)
- TypeScript 5.x (前端), Python 3.13+ (后端) + React, Monaco Editor, sqlglot, sql-formatter (015-sql-formatter)
- Python 3.13+ (uv 管理) + FastAPI, Pydantic, anthropic SDK (新增), openai SDK (保留) (018-unified-llm-api)
- SQLite (元数据存储，无变更) (018-unified-llm-api)
- TypeScript 5.x (前端), React 19 + React, marked (Markdown 解析), highlight.js (语法高亮), Ant Design (019-sql-display)
- N/A（纯前端功能，不涉及存储） (019-sql-display)
- Python 3.13+ (backend), TypeScript (frontend) + FastAPI (backend), React + TypeScript (frontend), Tailwind CSS, Ant Design (020-i18n-readme)
- SQLite (existing) (020-i18n-readme)
- Python 3.13+ (uv 管理) / TypeScript 5.9+ (021-sql-editor-enhance)
- SQLite（元数据缓存，现有功能） (021-sql-editor-enhance)
- Python 3.13+ (uv) / TypeScript 5.9+ (021-sql-editor-enhance)
- SQLite (metadata caching), localStorage (frontend schema cache) (021-sql-editor-enhance)

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
- 021-sql-editor-enhance: Added Python 3.13+ (uv) / TypeScript 5.9+
- 021-sql-editor-enhance: Added Python 3.13+ (uv 管理) / TypeScript 5.9+
- 020-i18n-readme: Added Python 3.13+ (backend), TypeScript (frontend) + FastAPI (backend), React + TypeScript (frontend), Tailwind CSS, Ant Design


<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->

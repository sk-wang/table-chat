# Research: 数据库查询工具

**Date**: 2025-12-28  
**Status**: Complete

## 技术决策

### 1. SQL 解析器选择

**Decision**: 使用 sqlglot

**Rationale**:
- sqlglot 是纯 Python 实现，无外部依赖
- 支持多种 SQL 方言（PostgreSQL、MySQL 等），便于未来扩展
- 提供 AST 解析，可以精确判断语句类型（SELECT/INSERT/UPDATE/DELETE）
- 支持 SQL 格式化和转换
- 活跃的社区和持续维护

**Alternatives Considered**:
- `sqlparse`: 仅支持 tokenize，无法准确判断语句类型
- `pglast`: 仅支持 PostgreSQL，限制扩展性
- `antlr4`: 过于复杂，需要自定义语法文件

### 2. PostgreSQL Metadata 获取方案

**Decision**: 使用 information_schema 查询

**Rationale**:
- `information_schema` 是 SQL 标准，跨数据库兼容
- 包含表、视图、列的完整信息
- 无需 superuser 权限

**实现方案**:
```sql
-- 获取表信息
SELECT table_schema, table_name, table_type
FROM information_schema.tables
WHERE table_schema NOT IN ('pg_catalog', 'information_schema');

-- 获取列信息
SELECT table_schema, table_name, column_name, data_type, 
       is_nullable, column_default
FROM information_schema.columns
WHERE table_schema NOT IN ('pg_catalog', 'information_schema');
```

**Alternatives Considered**:
- `pg_catalog` 系统表: 更底层但 PostgreSQL 专用
- `psycopg2.extras.RealDictCursor`: 仅获取查询结果，不含 schema

### 3. 自然语言转 SQL 方案

**Decision**: 使用 OpenAI API + 结构化 Prompt

**Rationale**:
- OpenAI GPT 模型在 SQL 生成方面表现优秀
- 可以通过 system prompt 注入数据库 schema 上下文
- 支持通过环境变量配置 base_url，兼容其他 OpenAI 兼容 API

**Prompt 策略**:
```text
System: 你是一个 SQL 专家。根据用户的自然语言描述生成 PostgreSQL SELECT 查询。
只返回 SQL 语句，不要解释。

数据库 Schema:
{table_definitions}

User: {user_prompt}
```

### 4. 前端 SQL 编辑器

**Decision**: 使用 Monaco Editor

**Rationale**:
- VS Code 同款编辑器，用户体验一致
- 内置 SQL 语法高亮和自动补全
- 支持自定义主题，可实现 JetBrains 风格
- React 封装 `@monaco-editor/react` 易于集成

**Alternatives Considered**:
- `CodeMirror 6`: 轻量但 SQL 支持不如 Monaco
- `Ace Editor`: 较老，维护不活跃

### 5. 前端框架选择

**Decision**: Refine 5 + Ant Design + Tailwind

**Rationale**:
- Refine 提供 CRUD 脚手架，减少样板代码
- Ant Design 组件库成熟，Table 组件功能强大
- Tailwind 灵活定制，可实现 JetBrains 深色主题

**JetBrains 风格实现**:
- 深色主题为主 (`bg-gray-900`, `text-gray-100`)
- 侧边栏固定，工具栏顶部
- 分栏布局：左侧 schema 树，右侧编辑器+结果

### 6. SQLite 存储方案

**Decision**: 使用 aiosqlite 异步操作

**Rationale**:
- FastAPI 推荐异步 I/O
- aiosqlite 提供异步接口，不阻塞事件循环
- SQLite 足够满足元数据存储需求

**Schema 设计**:
```sql
CREATE TABLE IF NOT EXISTS databases (
    name TEXT PRIMARY KEY,
    url TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS table_metadata (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    db_name TEXT NOT NULL,
    schema_name TEXT NOT NULL,
    table_name TEXT NOT NULL,
    table_type TEXT NOT NULL,  -- 'table' or 'view'
    metadata_json TEXT NOT NULL,  -- JSON 格式的列信息
    created_at TEXT NOT NULL,
    FOREIGN KEY (db_name) REFERENCES databases(name)
);
```

## 最佳实践

### FastAPI 项目结构

- 使用 `APIRouter` 组织路由
- 依赖注入管理数据库连接
- Pydantic `model_config` 配置 camelCase alias
- CORS 中间件配置

### 错误处理

- 使用 `HTTPException` 返回结构化错误
- SQL 语法错误返回 400 + 详细错误信息
- 数据库连接错误返回 503

### 安全考虑

- SQL 注入：仅允许 SELECT，通过 sqlglot AST 验证
- 敏感信息：连接字符串中的密码不在日志中显示
- LIMIT 保护：防止返回过多数据


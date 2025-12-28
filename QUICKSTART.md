# 🚀 TableChat 快速开始指南

## 📦 准备工作

### 1. 环境要求
- Python 3.11+
- Node.js 18+
- PostgreSQL 数据库（用于查询）

### 2. 克隆项目
```bash
git clone <repository-url>
cd tableChat
```

---

## 🔧 启动服务

### 启动后端 API

```bash
cd backend

# 配置环境变量（如果需要）
cat > .env << 'EOF'
OPENAI_API_KEY=your_key_here
OPENAI_BASE_URL=https://api.openai.com/v1
DATABASE_PATH=./scinew.db
EOF

# 启动服务
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

后端 API 将运行在: http://localhost:8000

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### 启动前端应用

```bash
cd frontend

# 安装依赖（首次）
npm install

# 启动开发服务器
npm run dev
```

前端应用将运行在: http://localhost:5173

---

## 🧪 使用 REST Client 测试 API

### 方式 1: VSCode REST Client

1. **安装扩展**: 在 VSCode 中安装 "REST Client" 扩展
2. **打开测试文件**: 打开 `api-tests.rest`
3. **发送请求**: 点击请求上方的 "Send Request" 按钮

### 方式 2: IntelliJ HTTP Client

1. **打开文件**: 在 IntelliJ IDEA / WebStorm 中打开 `api-tests.rest`
2. **运行请求**: 点击请求旁边的 ▶️ 按钮

### 方式 3: cURL 命令行

```bash
# 1. 添加数据库连接
curl -X PUT http://localhost:8000/api/v1/dbs/testdb \
  -H "Content-Type: application/json" \
  -d '{"url": "postgresql://root:0412yxyxysYs@localhost:5432/postgres"}'

# 2. 执行查询
curl -X POST http://localhost:8000/api/v1/dbs/testdb/query \
  -H "Content-Type: application/json" \
  -d '{"sql": "SELECT version()"}'

# 3. 列出所有数据库
curl http://localhost:8000/api/v1/dbs
```

---

## 📝 API 测试流程

### 步骤 1: 添加数据库连接

```http
PUT http://localhost:8000/api/v1/dbs/testdb
Content-Type: application/json

{
  "url": "postgresql://root:0412yxyxysYs@localhost:5432/postgres"
}
```

**响应示例**:
```json
{
  "name": "testdb",
  "url": "postgresql://root:0412yxyxysYs@localhost:5432/postgres",
  "createdAt": "2025-12-28T10:30:00",
  "updatedAt": "2025-12-28T10:30:00"
}
```

### 步骤 2: 执行简单查询

```http
POST http://localhost:8000/api/v1/dbs/testdb/query
Content-Type: application/json

{
  "sql": "SELECT 1 as test_column"
}
```

**响应示例**:
```json
{
  "sql": "SELECT 1 as test_column",
  "result": {
    "columns": ["test_column"],
    "rows": [{"test_column": 1}],
    "rowCount": 1,
    "truncated": false
  },
  "executionTimeMs": 15
}
```

### 步骤 3: 查询数据库版本

```http
POST http://localhost:8000/api/v1/dbs/testdb/query
Content-Type: application/json

{
  "sql": "SELECT version()"
}
```

### 步骤 4: 查询表信息

```http
POST http://localhost:8000/api/v1/dbs/testdb/query
Content-Type: application/json

{
  "sql": "SELECT tablename FROM pg_tables WHERE schemaname = 'public' LIMIT 10"
}
```

---

## 🛡️ 安全测试

### 测试 SQL 注入防护

这些请求**应该被拒绝**（返回 400 错误）：

```http
# INSERT 语句 - 应该被拒绝
POST http://localhost:8000/api/v1/dbs/testdb/query
Content-Type: application/json

{
  "sql": "INSERT INTO users VALUES (1, 'hacker')"
}

# UPDATE 语句 - 应该被拒绝
POST http://localhost:8000/api/v1/dbs/testdb/query
Content-Type: application/json

{
  "sql": "UPDATE users SET password = 'hacked'"
}

# DELETE 语句 - 应该被拒绝
POST http://localhost:8000/api/v1/dbs/testdb/query
Content-Type: application/json

{
  "sql": "DELETE FROM users"
}

# CREATE 语句 - 应该被拒绝
POST http://localhost:8000/api/v1/dbs/testdb/query
Content-Type: application/json

{
  "sql": "CREATE TABLE evil (id INT)"
}
```

---

## 🎯 常用查询示例

### 1. 查询当前时间和用户

```sql
SELECT NOW() as current_time, CURRENT_USER as current_user
```

### 2. 列出所有 schema

```sql
SELECT schema_name FROM information_schema.schemata ORDER BY schema_name
```

### 3. 查询表的列信息

```sql
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'your_table_name' 
ORDER BY ordinal_position
```

### 4. 查询数据库大小

```sql
SELECT 
  pg_database.datname as database_name,
  pg_size_pretty(pg_database_size(pg_database.datname)) as size 
FROM pg_database 
ORDER BY pg_database_size(pg_database.datname) DESC 
LIMIT 10
```

### 5. 查询表大小

```sql
SELECT 
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC 
LIMIT 10
```

---

## 🧪 运行测试

### 后端单元测试

```bash
cd backend

# 运行所有测试
python -m pytest tests/ -v

# 运行特定测试文件
python -m pytest tests/test_services/test_query_service.py -v

# 运行带覆盖率的测试
python -m pytest tests/ --cov=app --cov-report=html
open htmlcov/index.html
```

### PostgreSQL 集成测试

```bash
cd backend

# 使用真实数据库测试
POSTGRES_URL="postgresql://root:0412yxyxysYs@localhost:5432/postgres" \
python -m pytest tests/test_api/test_real_postgres.py -v -m integration
```

### 前端 E2E 测试

```bash
cd frontend

# 运行 Playwright 测试
npm run test:e2e

# 可视化模式
npm run test:e2e:ui
```

---

## 📖 API 文档

### 数据库管理 API

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/v1/dbs` | 列出所有数据库连接 |
| PUT | `/api/v1/dbs/{name}` | 创建/更新数据库连接 |
| GET | `/api/v1/dbs/{name}` | 获取数据库信息 |
| DELETE | `/api/v1/dbs/{name}` | 删除数据库连接 |

### 查询执行 API

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/api/v1/dbs/{name}/query` | 执行 SQL 查询 |

---

## 🌐 前端界面使用

### 1. 添加数据库连接

1. 访问 http://localhost:5173/databases
2. 点击 "Add Database" 按钮
3. 输入数据库名称和连接 URL
4. 点击 "Test Connection" 测试连接
5. 点击 "Save" 保存

### 2. 执行 SQL 查询

1. 访问 http://localhost:5173/query
2. 从下拉菜单选择数据库
3. 在 Monaco 编辑器中输入 SQL
4. 按 `Ctrl+Enter` (或点击 "Execute" 按钮) 执行查询
5. 查看结果表格

### 3. 查看结果

- 表格显示查询结果
- 支持分页浏览
- 显示执行时间和行数
- 如果结果被截断，会显示警告

---

## 🐛 常见问题

### 1. 后端无法启动

**问题**: `ModuleNotFoundError: No module named 'fastapi'`

**解决**: 
```bash
cd backend
pip install fastapi uvicorn pydantic sqlglot psycopg2-binary aiosqlite pyhumps
```

### 2. 数据库连接失败

**问题**: 连接 PostgreSQL 失败

**检查**:
- PostgreSQL 服务是否运行
- 连接 URL 格式是否正确: `postgresql://user:pass@host:port/dbname`
- 用户权限是否足够
- 防火墙是否允许连接

### 3. 前端无法连接后端

**问题**: API 请求失败

**检查**:
- 后端是否运行在 http://localhost:8000
- CORS 配置是否正确
- 浏览器控制台是否有错误信息

### 4. Monaco 编辑器不显示

**问题**: SQL 编辑器无法加载

**解决**:
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

---

## 📚 下一步

- ✅ **完成**: Phase 3 (数据库管理) + Phase 4 (SQL 查询)
- 🚧 **进行中**: 测试完善和文档编写
- 📋 **计划**: Phase 5 (自然语言生成 SQL) + Phase 6 (数据库结构浏览)

---

## 📞 获取帮助

- **测试指南**: [TESTING.md](./TESTING.md)
- **测试报告**: [TEST_REPORT.md](./TEST_REPORT.md)
- **项目文档**: [README.md](./README.md)
- **API 测试集合**: [api-tests.rest](./api-tests.rest)

---

**快速开始完成！** 🎉

现在你已经：
- ✅ 启动了后端和前端服务
- ✅ 学会了使用 REST Client 测试 API
- ✅ 了解了常用的 SQL 查询示例
- ✅ 知道如何运行测试

开始探索 TableChat 吧！🚀


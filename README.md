# TableChat - Database Query Tool

一个现代化的数据库查询工具，支持 PostgreSQL 数据库的 SQL 查询和自然语言生成 SQL。

## 🚀 特性

- ✅ **数据库连接管理**: 添加、查看、删除 PostgreSQL 数据库连接
- ✅ **SQL 查询执行**: 
  - Monaco Editor 提供专业的 SQL 编辑体验
  - 仅允许 SELECT 查询（安全保护）
  - 自动添加 LIMIT 1000 防止大量数据返回
  - 实时语法验证和错误提示
- ✅ **查询结果展示**: 
  - 表格形式展示查询结果
  - 支持分页浏览
  - 显示执行时间和行数统计
- 🚧 **自然语言生成 SQL** (Phase 5 - 待实现)
- 🚧 **数据库结构浏览** (Phase 6 - 待实现)

## 📋 技术栈

### 后端
- **Python 3.11+** with `uv` package manager
- **FastAPI** - 现代化的 Web 框架
- **Pydantic** - 数据验证和序列化
- **sqlglot** - SQL 解析和验证
- **psycopg2** - PostgreSQL 驱动
- **aiosqlite** - SQLite 异步支持（用于元数据存储）
- **OpenAI SDK** - AI 功能支持

### 前端
- **TypeScript 5.x**
- **React 18**
- **Refine 5** - 企业级前端框架
- **Ant Design** - UI 组件库
- **Monaco Editor** - 代码编辑器
- **Tailwind CSS** - 样式框架
- **Vite** - 构建工具

## 🛠️ 开发环境设置

### 前置要求

- Python 3.11+
- Node.js 18+
- PostgreSQL 数据库（用于查询）
- `uv` (Python 包管理器)

### 后端设置

```bash
# 进入后端目录
cd backend

# 安装依赖（uv 会自动处理）
uv sync

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，设置 OPENAI_API_KEY 等

# 运行开发服务器
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 前端设置

```bash
# 进入前端目录
cd frontend

# 安装依赖
npm install

# 运行开发服务器
npm run dev
```

访问 http://localhost:5173 查看应用。

## 🧪 测试

### 后端测试

```bash
cd backend

# 运行所有测试
python -m pytest tests/ -v

# 运行测试并生成覆盖率报告
python -m pytest tests/ -v --cov=app --cov-report=html

# 查看覆盖率报告
open htmlcov/index.html

# 运行集成测试（需要真实 PostgreSQL）
POSTGRES_URL="postgresql://user:pass@localhost:5432/db" python -m pytest tests/ -v -m integration
```

### 前端 E2E 测试

```bash
cd frontend

# 运行 Playwright 测试
npm run test:e2e

# 可视化模式运行测试
npm run test:e2e:ui
```

### API 接口测试

使用 REST Client 扩展或 HTTP Client 测试 API：

```bash
# 使用 VSCode REST Client 或 IntelliJ HTTP Client
# 打开 api-tests.rest 文件，点击 "Send Request" 按钮
```

## 📝 API 文档

启动后端服务后，访问：
- **Swagger UI**: http://localhost:7888/docs
- **ReDoc**: http://localhost:7888/redoc

## 🏗️ 项目结构

```
tableChat/
├── backend/
│   ├── app/
│   │   ├── api/v1/          # API 路由
│   │   ├── models/          # Pydantic 模型
│   │   ├── services/        # 业务逻辑
│   │   ├── db/              # 数据库管理
│   │   ├── config.py        # 配置管理
│   │   └── main.py          # FastAPI 应用入口
│   ├── tests/               # 测试文件
│   └── pyproject.toml       # Python 依赖
├── frontend/
│   ├── src/
│   │   ├── components/      # React 组件
│   │   ├── pages/           # 页面
│   │   ├── services/        # API 客户端
│   │   ├── types/           # TypeScript 类型
│   │   └── App.tsx          # 应用入口
│   ├── e2e/                 # Playwright 测试
│   └── package.json         # Node 依赖
├── specs/                   # 项目规范文档
├── api-tests.rest           # REST API 测试集合
└── TEST_REPORT.md           # 测试报告
```

## 🔒 安全特性

- **SQL 注入防护**: 仅允许 SELECT 查询
- **查询限制**: 自动添加 LIMIT 1000 防止资源耗尽
- **类型安全**: 前后端完整的类型定义
- **CORS 配置**: 允许所有来源（开发环境，生产环境需调整）

## 📊 测试覆盖率

- **后端单元测试**: 25/25 通过 (100%)
- **后端 API 测试**: 34/35 通过 (97%)
- **代码覆盖率**: ~60%
- **E2E 测试**: 9 个测试场景已配置

详细测试报告: [TEST_REPORT.md](./TEST_REPORT.md)

## 🚀 API 快速开始

### 1. 添加数据库连接

```bash
curl -X PUT http://localhost:7888/api/v1/dbs/mydb \
  -H "Content-Type: application/json" \
  -d '{"url": "postgresql://user:pass@localhost:5432/dbname"}'
```

### 2. 执行 SQL 查询

```bash
curl -X POST http://localhost:7888/api/v1/dbs/mydb/query \
  -H "Content-Type: application/json" \
  -d '{"sql": "SELECT * FROM users LIMIT 10"}'
```

### 3. 列出所有数据库

```bash
curl http://localhost:7888/api/v1/dbs
```

## 📖 环境变量

创建 `backend/.env` 文件：

```env
# OpenAI API 配置
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_BASE_URL=https://api.openai.com/v1

# SQLite 元数据数据库路径
DATABASE_PATH=./scinew.db
```

## 🤝 开发规范

### 代码风格
- **Python**: 
  - 使用 `ruff` 进行 linting 和格式化
  - 严格类型注解 (mypy)
  - Pydantic 模型使用 camelCase JSON 序列化
- **TypeScript**: 
  - 严格模式 (`strict: true`)
  - ESLint + Prettier
  - Refine 最佳实践

### Git 提交规范
- `feat: ` - 新功能
- `fix: ` - Bug 修复
- `test: ` - 测试相关
- `docs: ` - 文档更新
- `refactor: ` - 代码重构

## 📅 开发计划

- [x] **Phase 1**: 项目设置 ✅
- [x] **Phase 2**: 基础设施 ✅
- [x] **Phase 3**: 数据库管理 (US1) ✅
- [x] **Phase 4**: SQL 查询执行 (US2) ✅
- [ ] **Phase 5**: 自然语言生成 SQL (US3) 🚧
- [ ] **Phase 6**: 数据库结构浏览 (US4) 🚧
- [ ] **Phase 7**: 优化和完善

## 🐛 问题反馈

如有问题或建议，请通过 Issues 反馈。

## 📄 许可证

MIT License

---

**开发中** 🚧 | 当前版本: 0.1.0 | Phase 4 已完成


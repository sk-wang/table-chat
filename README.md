# TableChat - 数据库查询工具

一个现代化的 PostgreSQL 数据库查询工具，支持 SQL 编辑器和自然语言查询。

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Python](https://img.shields.io/badge/python-3.13+-green.svg)
![Node](https://img.shields.io/badge/node-18+-green.svg)

## ✨ 功能特性

- 🗄️ **数据库连接管理** - 添加、编辑、删除 PostgreSQL 连接
- 📝 **SQL 编辑器** - Monaco Editor 提供语法高亮、自动补全
- 🤖 **自然语言查询** - 用自然语言描述需求，AI 生成 SQL
- 📊 **结果展示** - 表格形式展示查询结果，支持分页和排序
- 🔍 **Schema 浏览器** - 查看数据库表结构、字段信息
- ⌨️ **快捷键支持** - Ctrl+Enter 执行查询
- 🔐 **密码安全** - 连接 URL 密码自动脱敏显示

## 🛠️ 技术栈

### 后端
- **Python 3.13+** - 使用 uv 管理依赖
- **FastAPI** - 高性能异步 API 框架
- **SQLite** - 元数据存储
- **psycopg2** - PostgreSQL 连接
- **sqlglot** - SQL 解析与验证
- **OpenAI SDK** - LLM 自然语言处理

### 前端
- **React 18** + TypeScript
- **Refine 5** - 管理后台框架
- **Ant Design** - UI 组件库
- **Monaco Editor** - 代码编辑器
- **Tailwind CSS** - 样式框架

## 🚀 快速开始

### 前置要求

- Python 3.13+ (推荐使用 [uv](https://github.com/astral-sh/uv))
- Node.js 18+
- PostgreSQL 数据库（作为查询目标）

### 1. 克隆项目

```bash
git clone <repository-url>
cd tableChat
```

### 2. 启动后端

```bash
cd backend

# 安装依赖
uv sync

# 配置环境变量（可选，用于自然语言功能）
cp .env.example .env
# 编辑 .env 配置 OPENAI_API_KEY

# 启动开发服务器
uv run uvicorn app.main:app --reload --port 7888
```

后端运行在 http://localhost:7888

API 文档：http://localhost:7888/docs

### 3. 启动前端

```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

前端运行在 http://localhost:5173

## 📖 使用指南

### 添加数据库连接

1. 打开应用，进入 **Databases** 页面
2. 点击 **Add Database** 按钮
3. 输入连接名称和 PostgreSQL 连接字符串：
   ```
   postgresql://user:password@localhost:5432/mydb
   ```
4. 点击 **Save** 保存

### 执行 SQL 查询

1. 进入 **Query** 页面
2. 在头部选择目标数据库
3. 在 SQL 编辑器中输入查询语句
4. 点击 **Execute** 或按 `Ctrl+Enter` 执行

**注意事项：**
- 仅支持 SELECT 语句（安全限制）
- 未指定 LIMIT 时自动添加 LIMIT 1000

### 自然语言查询

1. 切换到 **自然语言** 标签
2. 输入查询描述，如："查询所有活跃用户的邮箱"
3. 点击 **生成 SQL**
4. 检查生成的 SQL 后执行

### 浏览数据库结构

在 Query 页面左侧的 Schema 浏览器中：
- 展开查看表和视图列表
- 双击表名自动生成 SELECT 语句
- 查看字段类型、主键、可空等信息

## 📁 项目结构

```
tableChat/
├── backend/                 # Python 后端
│   ├── app/
│   │   ├── api/v1/         # API 路由
│   │   ├── models/         # Pydantic 模型
│   │   ├── services/       # 业务逻辑
│   │   └── db/             # 数据库操作
│   ├── tests/              # 测试用例
│   └── pyproject.toml
├── frontend/               # React 前端
│   ├── src/
│   │   ├── components/     # React 组件
│   │   ├── pages/          # 页面
│   │   ├── contexts/       # React Context
│   │   ├── services/       # API 客户端
│   │   └── types/          # TypeScript 类型
│   └── package.json
├── specs/                  # 设计规格文档
├── api-tests.rest          # API 测试用例
└── README.md
```

## 🧪 运行测试

### 后端测试

```bash
cd backend

# 运行所有测试
uv run pytest

# 运行带覆盖率
uv run pytest --cov=app

# 仅运行单元测试（排除集成测试）
uv run pytest -m "not integration"
```

### 前端测试

```bash
cd frontend

# E2E 测试（需要先启动服务）
npm run test:e2e
```

## 🔧 API 参考

### 数据库管理

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/api/v1/dbs` | 列出所有数据库连接 |
| GET | `/api/v1/dbs/{name}` | 获取数据库详情 |
| PUT | `/api/v1/dbs/{name}` | 创建/更新数据库连接 |
| DELETE | `/api/v1/dbs/{name}` | 删除数据库连接 |
| GET | `/api/v1/dbs/{name}/metadata` | 获取表结构元数据 |

### 查询执行

| 方法 | 端点 | 描述 |
|------|------|------|
| POST | `/api/v1/dbs/{name}/query` | 执行 SQL 查询 |
| POST | `/api/v1/dbs/{name}/query/natural` | 自然语言生成 SQL |

完整 API 文档请访问：http://localhost:7888/docs

## ⚙️ 环境变量

| 变量名 | 描述 | 默认值 |
|--------|------|--------|
| `OPENAI_API_KEY` | OpenAI API 密钥 | - |
| `OPENAI_BASE_URL` | OpenAI API 地址 | `https://api.openai.com/v1` |
| `LLM_MODEL` | 使用的模型名称 | `gpt-3.5-turbo` |
| `DATABASE_PATH` | SQLite 存储路径 | `./scinew.db` |
| `PORT` | 后端端口 | `7888` |

## 📄 License

MIT License - 详见 [LICENSE](LICENSE)

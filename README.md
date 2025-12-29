# TableChat - 智能数据库查询工具

一个现代化的数据库查询工具，支持 **PostgreSQL** 和 **MySQL** 数据库，提供 SQL 编辑器、自然语言查询、查询结果导出和执行历史记录功能。

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Python](https://img.shields.io/badge/python-3.13+-green.svg)
![Node](https://img.shields.io/badge/node-18+-green.svg)

## ✨ 功能特性

### 🗄️ 多数据库支持
- **PostgreSQL** 和 **MySQL** 数据库连接管理
- 添加、编辑、删除数据库连接
- 支持禁用 SSL 连接（MySQL）
- 连接 URL 密码自动脱敏显示

### 📝 SQL 编辑器
- Monaco Editor 提供语法高亮、自动补全
- 快捷键支持（Ctrl+Enter 执行查询）
- 仅允许 SELECT 语句（安全限制）
- 未指定 LIMIT 时自动添加 LIMIT 1000
- **可调节面板比例**：编辑器与结果区域大小可拖拽调整，自动记忆

### 🤖 智能自然语言查询
- 用自然语言描述需求，AI 自动生成 SQL
- **两阶段提示链优化**：支持大型数据库（3000+ 表）
  - 第一阶段：智能选择相关表
  - 第二阶段：基于选定表生成精准 SQL
- 支持 PostgreSQL 和 MySQL 方言
- 生成结果包含中文解释
- **智能导出识别**：识别"导出为 CSV"等意图自动触发导出

### 📊 结果展示与导出
- 表格形式展示查询结果
- 支持分页和排序
- 显示执行时间和行数
- 结果截断提示
- **导出功能**：支持 CSV、JSON、XLSX 三种格式
  - CSV：UTF-8 编码，Excel 兼容
  - JSON：格式化输出，2 空格缩进
  - XLSX：标准 Excel 格式，自动列宽

### 📜 SQL 执行历史
- 自动记录每次成功执行的 SQL 查询
- 记录执行时间、返回行数、耗时信息
- 保存自然语言描述（如有）
- **全文搜索**：支持中文关键词搜索（jieba 分词）
- 点击历史记录快速复用 SQL
- 表格形式展示，参考阿里云 DMS 风格

### 🔍 Schema 浏览器
- 查看数据库表结构、字段信息
- **表搜索功能**：快速过滤数百张表
- 展示表/字段注释（类似阿里云 DMS）
- 双击表名自动生成 SELECT 语句
- 查看字段类型、主键、可空等信息

### ⚡ 性能优化
- **浏览器本地缓存**：减少重复请求，提升响应速度
- 元数据智能缓存
- 查询结果快速渲染
- 按需加载表详情

## 🛠️ 技术栈

### 后端
- **Python 3.13+** - 使用 uv 管理依赖
- **FastAPI** - 高性能异步 API 框架
- **SQLite** - 元数据存储 + FTS5 全文搜索
- **asyncpg** - PostgreSQL 异步连接
- **aiomysql** - MySQL 异步连接
- **sqlglot** - SQL 解析与验证
- **OpenAI SDK** - LLM 自然语言处理
- **jieba** - 中文分词（支持中文搜索）

### 前端
- **React 19** + TypeScript 5.9
- **Refine 5** - 管理后台框架
- **Ant Design 5** - UI 组件库
- **Monaco Editor** - 代码编辑器
- **xlsx (SheetJS)** - Excel 导出
- **localStorage** - 浏览器本地缓存

## 🚀 快速开始

### 前置要求

- Python 3.13+ (推荐使用 [uv](https://github.com/astral-sh/uv))
- Node.js 18+
- PostgreSQL 或 MySQL 数据库（作为查询目标）

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

1. 打开应用，左侧边栏显示所有已添加的数据库
2. 点击 **Add Database** 按钮
3. 输入连接名称和连接字符串：

**PostgreSQL：**
```
postgresql://user:password@localhost:5432/mydb
```

**MySQL：**
```
mysql://user:password@localhost:3306/mydb
```

4. 点击 **Save** 保存

### 执行 SQL 查询

1. 在左侧边栏选择目标数据库
2. 在 SQL 编辑器中输入查询语句
3. 点击 **Execute** 或按 `Ctrl+Enter` 执行

**注意事项：**
- 仅支持 SELECT 语句（安全限制）
- 未指定 LIMIT 时自动添加 LIMIT 1000

### 导出查询结果

执行查询后，可以通过以下方式导出结果：

**方式一：工具栏按钮**
1. 执行 SQL 查询获得结果
2. 点击结果区域上方的「导出」下拉按钮
3. 选择导出格式：CSV / JSON / XLSX

**方式二：自然语言触发**
1. 在自然语言输入框中描述需求，包含导出意图
   - 例如："查询所有用户并导出为 CSV"
   - 例如："导出最近30天的订单数据为 Excel"
2. 系统自动生成 SQL 并在执行后自动导出

导出文件命名格式：`{数据库名}_{时间戳}.{格式}`

### 自然语言查询

1. 切换到 **自然语言** 标签
2. 输入查询描述，如："查询所有活跃用户的邮箱"
3. 点击 **生成 SQL**
4. 检查生成的 SQL 后执行

**提示：** 系统会自动识别相关表，即使数据库有数千张表也能快速生成准确的 SQL。

### 查看执行历史

1. 切换到结果区域的 **执行历史** 标签
2. 查看过去执行的 SQL 记录
3. 使用搜索框按关键词过滤（支持中文）
4. 点击历史记录将 SQL 复制到编辑器

### 浏览数据库结构

在左侧 Schema 浏览器中：
- 使用**搜索框**快速过滤表名
- 展开查看表和视图列表
- 双击表名自动生成 SELECT 语句
- 查看字段类型、主键、可空等信息
- 查看表和字段的注释

## 📁 项目结构

```
tableChat/
├── backend/                 # Python 后端
│   ├── app/
│   │   ├── api/v1/         # API 路由
│   │   ├── connectors/     # 数据库连接器（PostgreSQL/MySQL）
│   │   ├── models/         # Pydantic 模型
│   │   ├── services/       # 业务逻辑（LLM、历史记录等）
│   │   └── db/             # SQLite 存储 + FTS5 全文搜索
│   ├── tests/              # 测试用例
│   └── pyproject.toml
├── frontend/               # React 前端
│   ├── src/
│   │   ├── components/     # React 组件
│   │   │   ├── database/   # 数据库管理组件
│   │   │   ├── editor/     # SQL 编辑器组件
│   │   │   ├── export/     # 导出功能组件
│   │   │   ├── history/    # 执行历史组件
│   │   │   ├── results/    # 查询结果组件
│   │   │   ├── sidebar/    # 侧边栏（含表搜索）
│   │   │   └── layout/     # 布局组件（可调节面板）
│   │   ├── pages/          # 页面
│   │   ├── contexts/       # React Context
│   │   ├── services/       # API 客户端 + 缓存服务
│   │   ├── test/           # 单元测试
│   │   └── types/          # TypeScript 类型
│   ├── e2e/                # E2E 测试
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

# 单元测试（111 个测试用例）
npm run test

# E2E 测试（需要先启动服务）
npm run test:e2e

# E2E 可视化模式
npm run test:e2e:ui
```

## 🔧 API 参考

### 数据库管理

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/api/v1/dbs` | 列出所有数据库连接 |
| GET | `/api/v1/dbs/{name}` | 获取数据库详情 |
| PUT | `/api/v1/dbs/{name}` | 创建/更新数据库连接 |
| DELETE | `/api/v1/dbs/{name}` | 删除数据库连接 |
| GET | `/api/v1/dbs/{name}/metadata/tables` | 获取表列表 |
| GET | `/api/v1/dbs/{name}/metadata/tables/{schema}/{table}` | 获取表详情 |

### 查询执行

| 方法 | 端点 | 描述 |
|------|------|------|
| POST | `/api/v1/dbs/{name}/query` | 执行 SQL 查询 |
| POST | `/api/v1/dbs/{name}/query/natural` | 自然语言生成 SQL |

### 执行历史

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/api/v1/dbs/{name}/history` | 获取执行历史列表 |
| GET | `/api/v1/dbs/{name}/history/search?query=xxx` | 搜索执行历史 |

完整 API 文档请访问：http://localhost:7888/docs

## ⚙️ 环境变量

| 变量名 | 描述 | 默认值 |
|--------|------|--------|
| `OPENAI_API_KEY` 或 `LLM_API_KEY` | LLM API 密钥 | - |
| `OPENAI_BASE_URL` 或 `LLM_API_BASE` | LLM API 地址 | `https://api.openai.com/v1` |
| `LLM_MODEL` | 使用的模型名称 | `gpt-3.5-turbo` |
| `DATABASE_PATH` | SQLite 存储路径 | `./scinew.db` |
| `PORT` | 后端端口 | `7888` |

## 🗺️ 功能路线图

- [x] 基础 SQL 查询功能
- [x] PostgreSQL 支持
- [x] MySQL 支持
- [x] Schema 注释显示
- [x] 表搜索功能
- [x] 两阶段提示链（支持大型数据库）
- [x] 浏览器本地缓存
- [x] 可调节查询面板比例
- [x] SQL 执行历史记录（含中文搜索）
- [x] 导出功能（CSV/JSON/XLSX）
- [x] 自然语言触发导出
- [ ] SSH 隧道支持

## 📄 License

MIT License - 详见 [LICENSE](LICENSE)

## 📚 相关文档

- [快速开始指南](QUICKSTART.md)
- [测试指南](TESTING.md)
- [代码分析报告](CODEBASE_ANALYSIS.md)
- [导出功能设计](specs/010-query-export/spec.md)
- [API 测试集合](api-tests.rest)

# Quickstart: 数据库查询工具

## 前置要求

- Python 3.13+ (使用 uv 管理)
- Node.js 18+ (使用 npm/pnpm)
- PostgreSQL 数据库（作为查询目标）

## 快速开始

### 1. 克隆并进入项目

```bash
cd /Users/wanghao/git/tableChat
```

### 2. 配置环境变量

创建 `.env` 文件：

```bash
# Backend
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_API_KEY=sk-your-api-key
DATABASE_PATH=./scinew.db
```

### 3. 启动后端

```bash
# 安装依赖
cd backend
uv sync

# 启动开发服务器
uv run uvicorn app.main:app --reload --port 8000
```

后端服务将运行在 http://localhost:8000

API 文档：http://localhost:8000/docs

### 4. 启动前端

```bash
# 安装依赖
cd frontend
npm install

# 启动开发服务器
npm run dev
```

前端将运行在 http://localhost:5173

## 使用流程

### 步骤 1: 添加数据库连接

1. 打开应用首页
2. 点击「添加数据库」按钮
3. 输入连接名称（如 `my-postgres`）
4. 输入 PostgreSQL 连接字符串：
   ```
   postgresql://user:password@localhost:5432/mydb
   ```
5. 点击「连接」

系统将自动获取数据库的表和视图元数据。

### 步骤 2: 浏览数据库结构

1. 在左侧面板选择已连接的数据库
2. 展开查看所有表和视图
3. 点击表名查看字段详情

### 步骤 3: 执行 SQL 查询

1. 在 SQL 编辑器中输入查询语句：
   ```sql
   SELECT * FROM users WHERE active = true
   ```
2. 点击「执行」按钮或按 Ctrl+Enter
3. 查看下方表格中的查询结果

**注意**：
- 仅支持 SELECT 语句
- 如果没有 LIMIT 子句，系统会自动添加 LIMIT 1000

### 步骤 4: 使用自然语言查询

1. 切换到「自然语言」标签
2. 输入查询描述：
   ```
   查询所有活跃用户的邮箱和注册时间
   ```
3. 点击「生成」按钮
4. 查看生成的 SQL 并确认执行

## API 示例

### 添加数据库连接

```bash
curl -X PUT http://localhost:8000/api/v1/dbs/my-postgres \
  -H "Content-Type: application/json" \
  -d '{"url": "postgresql://user:password@localhost:5432/mydb"}'
```

### 获取数据库元数据

```bash
curl http://localhost:8000/api/v1/dbs/my-postgres
```

### 执行 SQL 查询

```bash
curl -X POST http://localhost:8000/api/v1/dbs/my-postgres/query \
  -H "Content-Type: application/json" \
  -d '{"sql": "SELECT * FROM users LIMIT 10"}'
```

### 自然语言生成 SQL

```bash
curl -X POST http://localhost:8000/api/v1/dbs/my-postgres/query/natural \
  -H "Content-Type: application/json" \
  -d '{"prompt": "查询所有活跃用户"}'
```

## 常见问题

### Q: 连接数据库失败？

- 检查连接字符串格式是否正确
- 确保 PostgreSQL 服务已启动
- 检查网络连接和防火墙设置

### Q: 自然语言功能不工作？

- 检查 `OPENAI_API_KEY` 环境变量是否设置
- 确保 OpenAI API 可访问（或 `OPENAI_BASE_URL` 指向正确的兼容 API）

### Q: SQL 执行报错？

- 检查 SQL 语法是否正确
- 确认仅使用 SELECT 语句
- 查看错误详情中的具体位置信息

## 项目结构

```
tableChat/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI 入口
│   │   ├── models/          # Pydantic 模型
│   │   ├── services/        # 业务逻辑
│   │   └── api/v1/          # API 路由
│   └── tests/
├── frontend/
│   ├── src/
│   │   ├── components/      # React 组件
│   │   ├── pages/           # 页面
│   │   └── services/        # API 客户端
│   └── package.json
├── specs/                   # 规格说明
└── scinew.db               # SQLite 元数据存储
```


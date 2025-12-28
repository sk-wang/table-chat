# Quickstart: Table Search Feature

**Feature**: 003-table-search | **Date**: 2025-12-28

## Development Setup

### Prerequisites

```bash
# 检查 Python 版本
python --version  # 需要 3.13+

# 检查 Node 版本
node --version    # 需要 18+

# 检查 uv (Python 包管理器)
uv --version
```

### Install Dependencies

```bash
# 后端依赖
cd backend && uv sync

# 前端依赖
cd frontend && npm install
```

## Running the Application

### Development Mode

```bash
# 终端 1: 启动后端
cd backend
uv run uvicorn app.main:app --reload --port 8000

# 终端 2: 启动前端
cd frontend
npm run dev
```

访问 http://localhost:5173

## Testing

### Frontend Unit Tests

```bash
cd frontend
npm run test          # 运行测试
npm run test:watch    # 监听模式
npm run test:coverage # 覆盖率报告
```

### Frontend E2E Tests

```bash
cd frontend
npx playwright install chromium  # 安装浏览器
npx playwright test             # 运行 E2E 测试
npx playwright test --reporter=line  # 简洁输出
```

### Backend Tests

```bash
cd backend
uv run pytest               # 运行所有测试
uv run pytest -v            # 详细输出
uv run pytest --cov=app     # 覆盖率
```

## Feature-Specific Testing

### Table Search E2E Test Location

```
tests/frontend/e2e/
└── table-search.spec.ts    # 主要 E2E 测试文件
```

### Test Scenarios

1. **基本搜索**: 在搜索框输入表名，验证结果过滤
2. **模糊匹配**: 输入部分表名，验证包含该子串的表出现
3. **大小写不敏感**: 输入大写/小写，验证匹配不区分大小写
4. **清空搜索**: 清空搜索框，验证显示所有表
5. **无结果**: 输入不存在的表名，验证显示"未找到"
6. **结果计数**: 验证显示匹配数量

## Building for Production

```bash
# 前端构建
cd frontend
npm run build

# 后端构建
cd backend
uv build
```

## Troubleshooting

### 搜索无响应

1. 检查浏览器控制台是否有错误
2. 验证元数据已加载（`metadata` 不为 null）
3. 检查搜索框是否正确渲染

### 性能问题

1. 打开浏览器 DevTools Performance 标签
2. 输入搜索词，观察渲染时间
3. 如超过 2 秒，考虑实现后端搜索 API

### 样式问题

1. 验证 JetBrains Darcula 主题配置
2. 检查 Ant Design 组件版本兼容性

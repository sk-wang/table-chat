# Quickstart: Docker 部署

**Feature**: 012-docker-setup

## Prerequisites

- Docker 24.0+ 
- Docker Compose V2 (docker compose 命令)
- 至少 2GB 可用磁盘空间

## Quick Start

### 1. 克隆项目

```bash
git clone <repository-url>
cd tableChat
```

### 2. 配置环境变量（可选）

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑配置（如需使用自然语言/Agent功能）
vim .env
```

主要配置项：
- `LLM_API_KEY`: OpenAI 兼容 API 密钥
- `AGENT_API_KEY`: Anthropic API 密钥

### 3. 启动服务

```bash
# 构建并启动所有服务（前台运行）
docker compose up --build

# 或后台运行
docker compose up --build -d
```

### 4. 访问应用

- **前端**: http://localhost:5888
- **后端 API**: http://localhost:7888
- **API 文档**: http://localhost:7888/docs

### 5. 停止服务

```bash
# 停止服务（保留数据）
docker compose down

# 停止服务并删除数据卷（完全清理）
docker compose down -v
```

## Common Operations

### 查看日志

```bash
# 查看所有服务日志
docker compose logs -f

# 仅查看后端日志
docker compose logs -f backend

# 仅查看前端日志
docker compose logs -f frontend
```

### 重启服务

```bash
# 重启所有服务
docker compose restart

# 仅重启后端
docker compose restart backend
```

### 重新构建

```bash
# 代码更新后重新构建
docker compose up --build
```

### 备份数据

```bash
# 备份 SQLite 数据库
docker compose cp backend:/app/data/scinew.db ./backup/

# 或直接复制 volume
docker run --rm -v tablechat-data:/data -v $(pwd)/backup:/backup \
  alpine tar czf /backup/tablechat-data.tar.gz -C /data .
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `LLM_API_KEY` | LLM API 密钥 | - |
| `LLM_API_BASE` | LLM API 地址 | https://api.openai.com/v1 |
| `LLM_MODEL` | 模型名称 | gpt-4o-mini |
| `AGENT_API_KEY` | Agent API 密钥 | - |
| `AGENT_MODEL` | Agent 模型 | claude-sonnet-4-5-20250929 |

## Troubleshooting

### 端口被占用

```bash
# 检查端口占用
lsof -i :5888
lsof -i :7888

# 或修改 docker-compose.yml 中的端口映射
ports:
  - "5889:80"  # 改为其他端口
```

### 无法连接外部数据库

- 确保数据库允许 Docker 容器 IP 访问
- 对于本地数据库，使用 `host.docker.internal` 替代 `localhost`
- 检查数据库防火墙规则

### 容器启动失败

```bash
# 查看详细错误
docker compose logs backend
docker compose logs frontend

# 检查容器状态
docker compose ps
```

### 数据丢失

- 确保使用 `docker compose down` 而非 `docker compose down -v`
- 检查 volume 是否存在：`docker volume ls | grep tablechat`


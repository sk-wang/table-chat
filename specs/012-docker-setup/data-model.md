# Data Model: Docker 容器化部署

**Feature**: 012-docker-setup  
**Date**: 2025-12-30

## Overview

本功能是基础设施配置，不涉及应用数据模型变更。此文档描述 Docker 配置的逻辑结构。

## Configuration Entities

### 1. Docker Compose Services

```yaml
services:
  backend:
    # Python FastAPI 后端服务
    build: ./backend
    ports: 7888:7888
    volumes: data:/app/data
    env_file: .env
    
  frontend:
    # Nginx 静态文件服务 + 反向代理
    build: ./frontend
    ports: 5888:80
    depends_on: backend
```

### 2. Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `LLM_API_KEY` | No | - | OpenAI 兼容 API 密钥 |
| `LLM_API_BASE` | No | https://api.openai.com/v1 | LLM API 地址 |
| `LLM_MODEL` | No | gpt-4o-mini | 使用的模型名称 |
| `AGENT_API_KEY` | No | - | Anthropic API 密钥 |
| `AGENT_API_BASE` | No | - | Agent API 地址（可选） |
| `AGENT_MODEL` | No | claude-sonnet-4-5-20250929 | Agent 模型 |
| `DATABASE_PATH` | No | /app/data/scinew.db | SQLite 数据库路径 |

### 3. Docker Volumes

| Volume | Mount Point | Purpose |
|--------|-------------|---------|
| `tablechat-data` | `/app/data` | SQLite 数据库持久化 |

### 4. Docker Networks

| Network | Type | Purpose |
|---------|------|---------|
| `tablechat-net` | bridge | 前后端容器通信 |

## File Structure

### New Files

```
tableChat/
├── docker-compose.yml       # Docker Compose 编排文件
├── .env.example             # 环境变量模板
├── backend/
│   ├── Dockerfile           # 后端镜像构建
│   └── .dockerignore        # 构建排除文件
└── frontend/
    ├── Dockerfile           # 前端镜像构建
    ├── nginx.conf           # Nginx 配置
    └── .dockerignore        # 构建排除文件
```

## Container Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Docker Host                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │              docker-compose network               │  │
│  │                                                   │  │
│  │  ┌─────────────────┐    ┌─────────────────────┐  │  │
│  │  │    Frontend     │    │      Backend        │  │  │
│  │  │    (Nginx)      │───▶│     (FastAPI)       │  │  │
│  │  │   :5888 → :80   │    │   :7888 → :7888     │  │  │
│  │  └─────────────────┘    └──────────┬──────────┘  │  │
│  │                                    │             │  │
│  └────────────────────────────────────┼─────────────┘  │
│                                       │                 │
│                          ┌────────────▼────────────┐    │
│                          │   Volume: tablechat-data│    │
│                          │   (SQLite Database)     │    │
│                          └─────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │   External Database   │
              │  (PostgreSQL/MySQL)   │
              └───────────────────────┘
```

## State Transitions

无状态转换 - 这是配置型功能，容器状态由 Docker 管理。

## Validation Rules

1. **环境变量验证**: 后端启动时通过 Pydantic Settings 验证配置
2. **端口可用性**: 5888 和 7888 端口不能被占用
3. **Volume 权限**: Docker Volume 目录需要写权限

## Data Persistence

- **持久化数据**: SQLite 数据库（连接配置、查询历史）
- **非持久化数据**: 容器日志、临时文件
- **备份方式**: `docker cp` 或直接复制 volume 数据


# Quickstart: 统一 LLM API 配置格式

**Feature**: 018-unified-llm-api  
**Date**: 2026-01-01

## 概述

本文档提供统一 LLM API 配置的快速上手指南。

---

## 场景 1: 使用 Anthropic API（推荐）

### 最小配置

```bash
# .env 文件
LLM_API_KEY=sk-ant-your-anthropic-key
```

### 启动命令

```bash
# Docker Compose
docker compose up

# 本地开发
cd backend && uv run uvicorn app.main:app --reload
```

### 验证

```bash
curl http://localhost:7888/api/v1/query/generate \
  -H "Content-Type: application/json" \
  -d '{"dbName": "test", "prompt": "列出所有表"}'
```

---

## 场景 2: 使用 OpenAI 兼容 API

当你的 LLM 服务只支持 OpenAI 格式时，claude-code-proxy 会自动转换：
- 应用发送 Anthropic 格式请求 → 代理转换为 OpenAI 格式 → 发送到你的服务
- 你的服务返回 OpenAI 格式响应 → 代理转换为 Anthropic 格式 → 返回给应用

### 配置步骤

1. **设置环境变量**

```bash
# .env 文件
LLM_API_TYPE=openai
LLM_API_KEY=sk-ant-placeholder  # 应用配置，可以是任意值（代理不验证）
LLM_MODEL=gpt-4o                # 目标模型名称

# OpenAI 兼容服务配置（代理使用这些配置连接你的服务）
OPENAI_API_KEY=sk-your-openai-key
OPENAI_API_BASE=https://api.openai.com/v1  # 或你的自定义端点
```

2. **启动服务（包含代理）**

```bash
docker compose --profile openai up
```

### 支持的 OpenAI 兼容服务

- OpenAI 官方 API
- Azure OpenAI
- 本地部署的 vLLM / Ollama
- OpenRouter
- 其他 OpenAI 兼容接口

---

## 场景 3: 从旧配置迁移

### 旧配置（仍支持）

```bash
# 旧 Agent 配置
AGENT_API_KEY=sk-ant-xxx
AGENT_API_BASE=https://api.anthropic.com
AGENT_MODEL=claude-sonnet-4-5-20250929
```

### 新配置（推荐）

```bash
# 新统一配置
LLM_API_KEY=sk-ant-xxx
# LLM_API_BASE 可省略，默认 Anthropic
# LLM_MODEL 可省略，默认 claude-sonnet-4-5-20250929
```

### 迁移说明

- 旧配置变量仍然有效，无需立即修改
- 新配置变量优先级更高
- 建议逐步迁移到新变量名

---

## 配置验证

### 检查当前配置

```bash
# 查看加载的配置
curl http://localhost:7888/api/v1/config/status
```

### 常见错误

| 错误信息 | 原因 | 解决方案 |
|----------|------|----------|
| `LLM API is not configured` | 未设置 API Key | 设置 `LLM_API_KEY` |
| `Invalid LLM_API_TYPE` | 类型值错误 | 使用 `anthropic` 或 `openai` |
| `Proxy connection failed` | 代理服务未启动 | 使用 `--profile openai` 启动 |

---

## Docker Compose 命令速查

```bash
# Anthropic 模式（默认）
docker compose up -d

# OpenAI 模式
docker compose --profile openai up -d

# 查看日志
docker compose logs -f backend
docker compose logs -f proxy  # 仅 OpenAI 模式

# 停止服务
docker compose down
```

---

## 开发环境设置

### 本地运行后端

```bash
cd backend

# 安装依赖
uv sync

# 创建 .env
cat > .env << EOF
LLM_API_KEY=your-api-key
LLM_API_TYPE=anthropic
EOF

# 启动
uv run uvicorn app.main:app --reload --port 7888
```

### 本地运行代理（OpenAI 模式）

```bash
# 方式 1: Docker
docker run -d \
  -e OPENAI_API_KEY=your-key \
  -e PREFERRED_PROVIDER=openai \
  -p 8082:8082 \
  ghcr.io/1rgs/claude-code-proxy:latest

# 方式 2: 从源码
git clone https://github.com/1rgs/claude-code-proxy
cd claude-code-proxy
uv run uvicorn server:app --port 8082
```

---

## 测试验证清单

- [ ] Anthropic 模式：SQL 生成功能正常
- [ ] Anthropic 模式：Agent 模式正常
- [ ] OpenAI 模式：代理服务启动
- [ ] OpenAI 模式：SQL 生成功能正常
- [ ] 向后兼容：旧配置变量可用
- [ ] 错误提示：无效配置有清晰提示


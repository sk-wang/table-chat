# Research: 统一 LLM API 配置格式

**Feature**: 018-unified-llm-api  
**Date**: 2026-01-01

## 研究任务清单

1. claude-code-proxy 集成方式
2. Anthropic Python SDK 使用模式
3. 统一配置的向后兼容策略
4. Docker Compose 服务依赖设计

---

## 1. claude-code-proxy 集成方式

### Decision

使用官方 Docker 镜像 `ghcr.io/1rgs/claude-code-proxy:latest`，固定到特定版本标签。

### Rationale

- 官方提供 Docker 镜像，无需自行构建
- 支持通过环境变量配置：`OPENAI_API_KEY`、`PREFERRED_PROVIDER`、`BIG_MODEL`、`SMALL_MODEL`
- 默认监听 8082 端口
- **将 OpenAI 格式的后端服务"包装"为 Anthropic API 格式**：应用发送 Anthropic 格式请求 → 代理转换为 OpenAI 格式 → 发送到 OpenAI 兼容服务 → 代理将响应转换回 Anthropic 格式 → 返回给应用

### Alternatives Considered

| 方案 | 优点 | 缺点 | 结论 |
|------|------|------|------|
| 官方 Docker 镜像 | 维护简单、更新方便 | 依赖外部镜像 | ✅ 选用 |
| 本地 Python 包 | 更紧密集成 | 增加依赖、需要额外进程管理 | ❌ 拒绝 |
| 自建转换层 | 完全可控 | 维护成本高、重复造轮子 | ❌ 拒绝 |

### 工作流程

```
┌─────────────┐     Anthropic API     ┌──────────────────┐     OpenAI API      ┌─────────────────┐
│  TableChat  │ ──────────────────>   │ claude-code-proxy │ ──────────────────> │ OpenAI 兼容服务  │
│  (后端应用)  │ <──────────────────   │     (代理)        │ <────────────────── │ (vLLM/Azure等)  │
└─────────────┘     Anthropic API     └──────────────────┘     OpenAI API      └─────────────────┘
```

### 配置映射

```yaml
# Docker Compose 配置示例
claude-code-proxy:
  image: ghcr.io/1rgs/claude-code-proxy:latest  # 后续固定版本
  environment:
    - OPENAI_API_KEY=${OPENAI_API_KEY}       # 传给 OpenAI 兼容服务的密钥
    - PREFERRED_PROVIDER=openai               # 目标服务格式
    - BIG_MODEL=${LLM_MODEL:-gpt-4o}          # 模型映射
    - SMALL_MODEL=${LLM_MODEL:-gpt-4o-mini}
  ports:
    - "8082:8082"
```

---

## 2. Anthropic Python SDK 使用模式

### Decision

使用 `anthropic` Python SDK 作为**统一的 LLM 客户端**，完全替换 llm_service.py 中的 OpenAI SDK。

### Rationale

- 项目已依赖 `anthropic` 包用于 Agent 功能，统一使用减少依赖
- SDK 支持自定义 `base_url`，可指向代理或兼容服务
- 代码一致性：所有 LLM 调用使用相同的 SDK 和 API 格式
- 当需要连接 OpenAI 格式服务时，通过 claude-code-proxy 转换，应用代码无需感知

### 关键 API 用法

```python
from anthropic import Anthropic, AsyncAnthropic

# 同步客户端
client = Anthropic(
    api_key=settings.llm_api_key,
    base_url=settings.llm_api_base or None,  # None 使用默认
)

# 异步客户端
async_client = AsyncAnthropic(
    api_key=settings.llm_api_key,
    base_url=settings.llm_api_base or None,
)

# 创建消息
response = client.messages.create(
    model=settings.llm_model,
    max_tokens=1024,
    messages=[{"role": "user", "content": prompt}],
)
```

### Alternatives Considered

| 方案 | 优点 | 缺点 | 结论 |
|------|------|------|------|
| Anthropic SDK | 原生支持、类型完整 | 需要修改 llm_service.py | ✅ 选用 |
| 保持 OpenAI SDK + 代理 | 代码改动小 | 配置混乱、不一致 | ❌ 拒绝 |
| LiteLLM 统一层 | 多 LLM 支持 | 增加依赖、过度工程 | ❌ 拒绝 |

---

## 3. 统一配置的向后兼容策略

### Decision

保留旧环境变量作为别名，优先级：新变量 > 旧变量 > 默认值

### Rationale

- 现有部署无需修改即可升级
- 渐进式迁移，文档引导用户使用新变量
- 未来版本可废弃旧变量

### 变量映射

| 新变量 | 旧变量（别名） | 默认值 |
|--------|---------------|--------|
| `LLM_API_KEY` | `AGENT_API_KEY`, `OPENAI_API_KEY` | (必填) |
| `LLM_API_BASE` | `AGENT_API_BASE`, `OPENAI_BASE_URL` | `https://api.anthropic.com` |
| `LLM_MODEL` | `AGENT_MODEL` | `claude-sonnet-4-5-20250929` |
| `LLM_API_TYPE` | (新增) | `anthropic` |

### 优先级逻辑

```python
@property
def effective_api_key(self) -> str:
    return self.llm_api_key or self.agent_api_key or self.openai_api_key

@property  
def effective_api_type(self) -> Literal["anthropic", "openai"]:
    return self.llm_api_type  # 无别名，新变量
```

---

## 4. Docker Compose 服务依赖设计

### Decision

claude-code-proxy 作为可选服务，仅在 `LLM_API_TYPE=openai` 时需要。使用 Docker Compose profiles 实现条件启动。

### Rationale

- 默认 Anthropic 模式不需要代理服务
- 减少资源占用
- 用户可按需启用

### 实现方案

```yaml
services:
  backend:
    # ... 现有配置
    depends_on:
      proxy:
        condition: service_healthy
        required: false  # 可选依赖

  proxy:
    image: ghcr.io/1rgs/claude-code-proxy:v1.0.0
    profiles: ["openai"]  # 仅在 --profile openai 时启动
    env_file:
      - .env
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - PREFERRED_PROVIDER=openai
    ports:
      - "8082:8082"
    networks:
      - tablechat-net
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8082/health"]
      interval: 10s
      timeout: 5s
      retries: 3
```

### 启动命令

```bash
# Anthropic 模式（默认）
docker compose up

# OpenAI 模式
docker compose --profile openai up
```

### Alternatives Considered

| 方案 | 优点 | 缺点 | 结论 |
|------|------|------|------|
| Profiles 条件启动 | 灵活、资源节省 | 需要额外命令参数 | ✅ 选用 |
| 始终启动代理 | 简单 | 浪费资源、增加复杂度 | ❌ 拒绝 |
| 环境变量条件 | 无需命令参数 | Docker Compose 不原生支持 | ❌ 拒绝 |

---

## 总结

| 领域 | 决策 |
|------|------|
| 代理集成 | Docker 官方镜像 + Profiles |
| LLM SDK | Anthropic Python SDK |
| 向后兼容 | 别名优先级链 |
| 服务依赖 | 可选依赖 + 健康检查 |

**所有 NEEDS CLARIFICATION 已解决**，可进入 Phase 1。


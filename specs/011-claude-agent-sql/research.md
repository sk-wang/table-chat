# Research: Claude Agent SQL 模式

**Date**: 2025-12-30  
**Feature**: 011-claude-agent-sql

## 1. Claude Agent SDK for Python

### 概述

Claude Agent SDK 是 Anthropic 官方提供的 Python 库，用于构建基于 Claude 的 AI Agent。SDK 通过管理 Claude Code CLI 作为子进程，提供异步优先的 Python API。

**关键特性**：
- 自定义 MCP 工具支持（进程内运行）
- 基于钩子的事件处理
- 流式消息响应
- 多轮对话管理

### 安装

```bash
pip install claude-agent-sdk
```

### 核心 API

#### 1. 定义自定义工具

使用 `@tool` 装饰器定义工具：

```python
from claude_agent_sdk import tool

@tool("query_database", "Execute a read-only SQL query", {"sql": str})
async def query_database(args: dict[str, Any]) -> dict[str, Any]:
    sql = args["sql"]
    # 验证只读
    # 执行查询
    return {
        "content": [{"type": "text", "text": f"Results: {results}"}]
    }
```

#### 2. 创建 MCP 服务器

```python
from claude_agent_sdk import create_sdk_mcp_server

server = create_sdk_mcp_server(
    name="db-tools",
    version="1.0.0",
    tools=[query_database, get_schema]
)
```

#### 3. 配置 Agent

```python
from claude_agent_sdk import ClaudeAgentOptions, ClaudeSDKClient

options = ClaudeAgentOptions(
    mcp_servers={"db": server},
    allowed_tools=["mcp__db__query_database", "mcp__db__get_schema"],
    system_prompt="You are a SQL assistant...",
    max_turns=20,
    env={
        "ANTHROPIC_BASE_URL": "http://localhost:3000/api",
        "ANTHROPIC_API_KEY": "your-token"
    }
)
```

#### 4. 运行查询

```python
async with ClaudeSDKClient(options=options) as client:
    await client.query("帮我查询订单总金额")
    
    async for message in client.receive_response():
        if isinstance(message, AssistantMessage):
            # 处理助手消息
            pass
        elif isinstance(message, ToolUseBlock):
            # 处理工具调用
            pass
```

### 消息类型

| 类型 | 说明 |
|------|------|
| `AssistantMessage` | 助手回复，包含 TextBlock 或 ToolUseBlock |
| `UserMessage` | 用户输入 |
| `ResultMessage` | 完成消息，包含成本信息 |
| `TextBlock` | 文本内容块 |
| `ToolUseBlock` | 工具调用块，包含 name 和 input |

## 2. 自定义 API 端点配置

根据用户需求，需要配置自定义的 API 端点：

```
ANTHROPIC_BASE_URL=http://localhost:3000/api
ANTHROPIC_AUTH_TOKEN=cr_xxx...
```

Claude Agent SDK 支持通过 `env` 参数传入环境变量：

```python
options = ClaudeAgentOptions(
    env={
        "ANTHROPIC_BASE_URL": settings.agent_api_base,
        "ANTHROPIC_API_KEY": settings.agent_api_key,
    }
)
```

**注意**: SDK 内部使用 `ANTHROPIC_API_KEY`，但用户配置使用 `ANTHROPIC_AUTH_TOKEN`。需要在配置映射时处理。

## 3. 安全性考虑

### 只读查询验证

使用 sqlglot 解析 SQL 并验证语句类型：

```python
import sqlglot
from sqlglot import exp

def validate_readonly(sql: str) -> bool:
    """验证 SQL 是否为只读操作"""
    try:
        parsed = sqlglot.parse_one(sql)
        
        # 允许的语句类型
        allowed_types = (
            exp.Select,      # SELECT
            exp.Describe,    # DESCRIBE
            exp.Show,        # SHOW
            exp.Explain,     # EXPLAIN
        )
        
        return isinstance(parsed, allowed_types)
    except:
        return False
```

### 禁止的操作

| 操作类型 | 语句示例 | 处理方式 |
|----------|----------|----------|
| 数据修改 | INSERT, UPDATE, DELETE | 拒绝执行，返回错误 |
| DDL | CREATE, ALTER, DROP | 拒绝执行，返回错误 |
| 事务 | COMMIT, ROLLBACK | 拒绝执行，返回错误 |
| 权限 | GRANT, REVOKE | 拒绝执行，返回错误 |

## 4. SSE (Server-Sent Events) 实现

### FastAPI SSE 端点

```python
from fastapi import APIRouter
from fastapi.responses import StreamingResponse

@router.post("/{name}/agent/query")
async def agent_query(name: str, request: AgentQueryRequest):
    async def event_generator():
        async for event in agent_service.run_agent(name, request.prompt):
            yield f"event: {event.type}\ndata: {event.data}\n\n"
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )
```

### 前端 SSE 客户端

```typescript
function subscribeToAgent(dbName: string, prompt: string, handlers: AgentHandlers) {
    const eventSource = new EventSource(`/api/v1/dbs/${dbName}/agent/query`, {
        // POST 需要使用 fetch + ReadableStream
    });
    
    // 使用 fetch 实现 POST + SSE
    fetch(`/api/v1/dbs/${dbName}/agent/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
    }).then(response => {
        const reader = response.body?.getReader();
        // 处理流式响应...
    });
}
```

## 5. 前端交互设计参考

### Claude Code VSCode 插件风格

1. **对话布局**
   - 用户消息：右对齐，深色背景
   - 助手消息：左对齐，浅色背景
   - 工具调用：可折叠块，显示工具名称和状态

2. **状态指示**
   - 思考中：动态点动画 "思考中..."
   - 工具执行中：显示工具名称 + 旋转图标
   - 完成：显示执行时间

3. **SQL 展示**
   - 使用代码高亮显示最终 SQL
   - 提供"复制到编辑器"按钮
   - 可选：一键执行

## 6. 现有代码复用分析

### 可复用的服务

| 服务 | 用途 | 复用方式 |
|------|------|----------|
| `query_service.execute_query()` | 执行 SQL | Agent 工具直接调用 |
| `db_manager.get_database()` | 获取数据库连接信息 | Agent 工具调用 |
| `metadata_service` | 获取表结构 | Agent 工具调用 |

### 现有验证逻辑

`query_service.validate_select_only()` 可作为参考，但需要扩展支持 DESCRIBE、SHOW 等：

```python
# 现有实现（仅 SELECT）
def validate_select_only(self, parsed: exp.Expression) -> None:
    if not isinstance(parsed, exp.Select):
        raise ValueError("Only SELECT queries are allowed...")

# 新实现（扩展只读类型）
def validate_readonly(self, parsed: exp.Expression) -> None:
    allowed = (exp.Select, exp.Describe, exp.Show, exp.Explain)
    if not isinstance(parsed, allowed):
        raise ValueError("Only read-only queries are allowed...")
```

## 7. 配置项设计

```python
# backend/app/config.py

class Settings(BaseSettings):
    # ... 现有配置 ...
    
    # Agent 配置
    agent_api_base: str = ""  # ANTHROPIC_BASE_URL
    agent_api_key: str = ""   # ANTHROPIC_AUTH_TOKEN
    agent_model: str = "claude-sonnet-4-5"
    agent_max_turns: int = 20
    agent_timeout: int = 120  # 秒
    
    @property
    def is_agent_configured(self) -> bool:
        """检查 Agent 是否已配置"""
        return bool(self.agent_api_base and self.agent_api_key)
```

环境变量映射：
```
AGENT_API_BASE=http://localhost:3000/api
AGENT_API_KEY=cr_xxx...
```

## 8. 风险与缓解

| 风险 | 说明 | 缓解措施 |
|------|------|----------|
| SDK 兼容性 | Claude Agent SDK 可能不完全兼容自定义 API | 早期原型验证；准备回退方案（直接使用 Anthropic SDK） |
| 流式响应复杂性 | SSE 需要处理连接中断、重试 | 实现超时机制；前端添加重连逻辑 |
| 安全风险 | SQL 注入、敏感信息泄露 | 严格验证 SQL 类型；限制结果集大小 |
| 性能 | Agent 多轮对话可能耗时较长 | 设置超时；允许用户取消；优化 system prompt |

## 9. 结论

技术可行性：✅ 高

Claude Agent SDK 提供了构建自定义 Agent 所需的全部能力：
- 自定义工具支持
- 流式响应
- 灵活的配置选项

关键实现点：
1. 工具定义需要严格的安全验证
2. SSE 需要正确处理 POST 请求的流式响应
3. 前端交互需要平衡信息展示和用户体验


# Implementation Plan: Claude Agent SQL 模式

**Branch**: `011-claude-agent-sql` | **Date**: 2025-12-30 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/011-claude-agent-sql/spec.md`

## Summary

为 TableChat 添加 Agent 模式，基于 **Anthropic Python 客户端** 实现智能数据库探索和 SQL 生成。Agent 模式与现有的"自然语言"模式作为同级选项卡并存，用户可自由切换。Agent 通过 Tool Use 功能探索数据库（只读查询），可生成任意类型的 SQL（包括 DDL）供用户在其他工具执行。

> **注意**: 最初计划使用 Claude Agent SDK，但由于其基于子进程的架构不适合 Web 服务器的 SSE 实时流式输出，已改用 Anthropic Python 客户端的原生 Tool Use 功能。

## Technical Context

**Language/Version**: Python 3.11 (后端), TypeScript 5.x (前端)  
**Primary Dependencies**: 
- 后端: FastAPI, anthropic (Anthropic Python Client), sqlglot
- 前端: React 18, Ant Design, Monaco Editor  

**Storage**: SQLite (本地元数据缓存), 目标数据库 (PostgreSQL/MySQL)  
**Testing**: pytest (后端), vitest + playwright (前端)  
**Target Platform**: Web 应用 (Linux/macOS server, 现代浏览器)
**Project Type**: Web 应用 (frontend + backend)  
**Performance Goals**: Agent 响应 30 秒内生成有效 SQL  
**Constraints**: 探索工具仅允许只读操作，100% 拦截修改性语句

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Check | Status | Notes |
|-------|--------|-------|
| 单一职责 | ✅ | Agent 服务独立于现有 LLM 服务 |
| 最小依赖 | ✅ | 仅新增 anthropic Python 客户端 |
| 复用现有 | ✅ | 复用 query_service、db_manager、metadata 服务 |
| 无重复造轮子 | ✅ | 使用官方 SDK，不自行实现 Agent 逻辑 |

## Project Structure

### Documentation (this feature)

```text
specs/011-claude-agent-sql/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (API contracts)
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
backend/
├── app/
│   ├── api/v1/
│   │   ├── agent.py           # NEW: Agent API 端点 (SSE streaming)
│   │   └── query.py           # 现有：保持不变
│   ├── services/
│   │   ├── agent_service.py   # NEW: Agent 服务，封装 Claude SDK
│   │   ├── agent_tools.py     # NEW: MCP 工具定义 (database_query, get_schema)
│   │   ├── llm_service.py     # 现有：保持不变（普通模式）
│   │   └── query_service.py   # 现有：复用 execute_query
│   ├── models/
│   │   └── agent.py           # NEW: Agent 请求/响应模型
│   └── config.py              # 更新：添加 Agent 配置项
└── tests/
    ├── test_api/
    │   └── test_agent.py      # NEW: Agent API 测试
    └── test_services/
        └── test_agent_service.py  # NEW: Agent 服务测试

frontend/
├── src/
│   ├── components/
│   │   └── agent/             # NEW: Agent 组件目录
│   │       ├── AgentChat.tsx      # 对话式交互主组件
│   │       ├── AgentMessage.tsx   # 单条消息渲染
│   │       ├── ToolCallBlock.tsx  # 工具调用展示块
│   │       └── ThinkingIndicator.tsx  # 思考中状态指示器
│   ├── pages/query/
│   │   └── index.tsx          # 更新：添加 Agent 选项卡
│   ├── services/
│   │   └── api.ts             # 更新：添加 Agent API 调用
│   └── types/
│       └── agent.ts           # NEW: Agent 类型定义
└── src/test/
    └── agent.test.ts          # NEW: Agent 组件测试
```

**Structure Decision**: 采用现有的 Web 应用结构，在 backend 和 frontend 各自目录下扩展。Agent 功能作为独立模块添加，不修改现有的普通模式代码。

## Complexity Tracking

> **No violations - design follows minimal complexity principles**

## Phase 0: Research Summary

### Claude Agent SDK for Python

**关键发现**:
1. SDK 通过 `@tool` 装饰器定义自定义工具
2. 使用 `create_sdk_mcp_server()` 创建 MCP 服务器
3. `ClaudeSDKClient` 支持多轮对话和流式响应
4. 通过 `ClaudeAgentOptions` 配置 API 端点、工具、权限等
5. 支持 `env` 参数传入环境变量（如 ANTHROPIC_BASE_URL）

**配置方式**:
```python
options = ClaudeAgentOptions(
    mcp_servers={"db": db_tools_server},
    allowed_tools=["mcp__db__query", "mcp__db__get_schema"],
    system_prompt="You are a SQL assistant...",
    env={
        "ANTHROPIC_BASE_URL": settings.agent_api_base,
        "ANTHROPIC_API_KEY": settings.agent_api_key,
    }
)
```

### 工具设计

需要为 Agent 提供两个核心工具：

1. **query_database**: 执行只读 SQL 查询
   - 输入: `sql: str`
   - 验证: 只允许 SELECT、DESCRIBE、SHOW、EXPLAIN
   - 输出: 查询结果（截断到 100 行）

2. **get_table_schema**: 获取表结构信息
   - 输入: `table_name: str` (可选，空则返回所有表)
   - 输出: 表名、列定义、索引、注释等

### 前端交互设计

参考 Claude Code VSCode 插件的交互模式：
- 用户输入区域 + 消息历史区域
- 工具调用以折叠块形式展示
- 思考过程可展开查看
- 最终 SQL 高亮显示，提供"复制到编辑器"按钮

## Phase 1: Architecture Design

### API 设计

#### POST /api/v1/dbs/{name}/agent/query (SSE)

启动 Agent 会话，通过 Server-Sent Events 流式返回消息。

**Request**:
```json
{
  "prompt": "帮我查询订单总金额"
}
```

**SSE Events**:
```
event: thinking
data: {"status": "analyzing", "message": "正在分析您的需求..."}

event: tool_call
data: {"tool": "get_table_schema", "input": {}, "status": "running"}

event: tool_result
data: {"tool": "get_table_schema", "output": "...", "status": "completed"}

event: message
data: {"role": "assistant", "content": "根据您的需求..."}

event: sql
data: {"sql": "SELECT SUM(amount) FROM orders", "explanation": "..."}

event: done
data: {"total_time_ms": 5230}
```

#### POST /api/v1/dbs/{name}/agent/cancel

取消正在进行的 Agent 任务。

### 数据流

```
用户输入 → 前端 AgentChat
    ↓
POST /agent/query (SSE)
    ↓
AgentService.run_agent()
    ↓
ClaudeSDKClient + MCP Tools
    ↓
Tools 调用 QueryService (只读)
    ↓
SSE 流式响应
    ↓
前端更新消息列表
    ↓
用户点击"复制到编辑器"
    ↓
SQL 填充到 Monaco Editor
```

### 关键类型定义

```typescript
// frontend/src/types/agent.ts
interface AgentMessage {
  id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  timestamp: number;
  toolCall?: ToolCallInfo;
}

interface ToolCallInfo {
  name: string;
  input: Record<string, unknown>;
  output?: string;
  status: 'running' | 'completed' | 'error';
  durationMs?: number;
}

interface AgentResponse {
  sql?: string;
  explanation?: string;
}
```

```python
# backend/app/models/agent.py
class AgentQueryRequest(BaseModel):
    prompt: str

class AgentEvent(BaseModel):
    event: Literal["thinking", "tool_call", "tool_result", "message", "sql", "error", "done"]
    data: dict[str, Any]
```

## Implementation Phases

### Phase 1: Backend - Agent 服务核心 (P1)

1. 添加 `claude-agent-sdk` 依赖
2. 实现 `agent_tools.py` - MCP 工具定义
3. 实现 `agent_service.py` - Agent 服务封装
4. 添加 Agent 配置项到 `config.py`
5. 单元测试

### Phase 2: Backend - API 端点 (P1)

1. 实现 `/agent/query` SSE 端点
2. 实现 `/agent/cancel` 端点
3. API 集成测试

### Phase 3: Frontend - Agent 组件 (P2)

1. 创建 `AgentChat` 主组件
2. 创建 `AgentMessage` 消息渲染组件
3. 创建 `ToolCallBlock` 工具调用展示组件
4. 创建 `ThinkingIndicator` 状态指示器
5. 更新 `api.ts` 添加 SSE 客户端

### Phase 4: Frontend - 集成到主页面 (P3)

1. 更新 `QueryPage` 添加 Agent 选项卡
2. 实现选项卡切换逻辑
3. 实现"复制到编辑器"功能
4. E2E 测试

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Claude Agent SDK 与自定义 API 端点兼容性 | 高 | 早期原型验证，准备回退到 Anthropic SDK |
| SSE 连接稳定性 | 中 | 实现重连机制和超时处理 |
| 工具调用安全性（SQL 注入） | 高 | 使用 sqlglot 解析验证，白名单语句类型 |
| Agent 响应延迟影响用户体验 | 中 | 流式显示中间状态，允许取消 |

## Next Steps

1. 运行 `/speckit.tasks` 生成详细任务清单
2. 优先验证 Claude Agent SDK 与自定义 API 端点的兼容性
3. 实现 Agent 工具的安全验证逻辑


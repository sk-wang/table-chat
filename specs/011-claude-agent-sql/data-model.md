# Data Model: Claude Agent SQL 模式

**Date**: 2025-12-30  
**Feature**: 011-claude-agent-sql

## 概述

Agent 模式不需要持久化存储（会话仅在内存中），但需要定义清晰的数据类型用于 API 通信和前端状态管理。

## Backend 模型

### 请求模型

```python
# backend/app/models/agent.py

from pydantic import BaseModel, Field
from typing import Literal, Any

class AgentQueryRequest(BaseModel):
    """Agent 查询请求"""
    prompt: str = Field(..., min_length=1, max_length=4000, description="用户的自然语言请求")
```

### 事件模型

```python
class AgentEvent(BaseModel):
    """SSE 事件基类"""
    event: Literal["thinking", "tool_call", "tool_result", "message", "sql", "error", "done"]
    data: dict[str, Any]

class ThinkingEvent(BaseModel):
    """思考状态事件"""
    status: Literal["analyzing", "planning", "generating"]
    message: str

class ToolCallEvent(BaseModel):
    """工具调用事件"""
    id: str
    tool: str
    input: dict[str, Any]
    status: Literal["running", "completed", "error"]
    output: str | None = None
    duration_ms: int | None = None

class MessageEvent(BaseModel):
    """助手消息事件"""
    role: Literal["assistant"]
    content: str

class SQLEvent(BaseModel):
    """最终 SQL 事件"""
    sql: str
    explanation: str | None = None

class ErrorEvent(BaseModel):
    """错误事件"""
    error: str
    detail: str | None = None

class DoneEvent(BaseModel):
    """完成事件"""
    total_time_ms: int
    tool_calls_count: int
```

### 工具输入/输出模型

```python
class QueryDatabaseInput(BaseModel):
    """数据库查询工具输入"""
    sql: str = Field(..., description="SQL 查询语句（仅支持只读操作）")

class GetSchemaInput(BaseModel):
    """获取表结构工具输入"""
    table_name: str | None = Field(None, description="表名（可选，空则返回所有表）")
    include_columns: bool = Field(True, description="是否包含列信息")

class ToolOutput(BaseModel):
    """工具输出"""
    content: list[dict[str, Any]]
    is_error: bool = False
```

## Frontend 类型

```typescript
// frontend/src/types/agent.ts

// === 消息类型 ===

export type AgentMessageRole = 'user' | 'assistant' | 'tool';

export interface AgentMessage {
  id: string;
  role: AgentMessageRole;
  content: string;
  timestamp: number;
  toolCall?: ToolCallInfo;
}

export interface ToolCallInfo {
  id: string;
  name: string;
  input: Record<string, unknown>;
  output?: string;
  status: 'running' | 'completed' | 'error';
  durationMs?: number;
}

// === SSE 事件类型 ===

export type AgentEventType = 
  | 'thinking' 
  | 'tool_call' 
  | 'tool_result' 
  | 'message' 
  | 'sql' 
  | 'error' 
  | 'done';

export interface ThinkingEventData {
  status: 'analyzing' | 'planning' | 'generating';
  message: string;
}

export interface ToolCallEventData {
  id: string;
  tool: string;
  input: Record<string, unknown>;
  status: 'running' | 'completed' | 'error';
  output?: string;
  durationMs?: number;
}

export interface MessageEventData {
  role: 'assistant';
  content: string;
}

export interface SQLEventData {
  sql: string;
  explanation?: string;
}

export interface ErrorEventData {
  error: string;
  detail?: string;
}

export interface DoneEventData {
  totalTimeMs: number;
  toolCallsCount: number;
}

export type AgentEventData = 
  | ThinkingEventData 
  | ToolCallEventData 
  | MessageEventData 
  | SQLEventData 
  | ErrorEventData 
  | DoneEventData;

// === 组件状态 ===

export type AgentStatus = 
  | 'idle'           // 空闲
  | 'thinking'       // 思考中
  | 'tool_running'   // 工具执行中
  | 'responding'     // 生成响应中
  | 'completed'      // 完成
  | 'error'          // 出错
  | 'cancelled';     // 已取消

export interface AgentState {
  status: AgentStatus;
  messages: AgentMessage[];
  generatedSQL?: string;
  explanation?: string;
  error?: string;
  totalTimeMs?: number;
}

// === API 请求 ===

export interface AgentQueryRequest {
  prompt: string;
}
```

## 状态转换

```
idle → thinking → tool_running → thinking → ... → responding → completed
                                                              ↘ error
     ↘ cancelled (any state)
```

## 消息流程示例

用户输入: "帮我查询订单总金额"

```
1. ThinkingEvent: { status: "analyzing", message: "正在分析您的需求..." }
2. ToolCallEvent: { tool: "get_table_schema", status: "running", input: {} }
3. ToolCallEvent: { tool: "get_table_schema", status: "completed", output: "...", durationMs: 150 }
4. ThinkingEvent: { status: "planning", message: "正在规划查询策略..." }
5. ToolCallEvent: { tool: "query_database", status: "running", input: { sql: "SELECT * FROM orders LIMIT 5" } }
6. ToolCallEvent: { tool: "query_database", status: "completed", output: "...", durationMs: 50 }
7. ThinkingEvent: { status: "generating", message: "正在生成最终 SQL..." }
8. MessageEvent: { role: "assistant", content: "根据您的需求，我已经探索了数据库结构..." }
9. SQLEvent: { sql: "SELECT SUM(amount) AS total FROM orders", explanation: "查询订单表中金额的总和" }
10. DoneEvent: { totalTimeMs: 5230, toolCallsCount: 2 }
```

## 数据大小限制

| 数据类型 | 限制 | 说明 |
|----------|------|------|
| 用户 prompt | 4000 字符 | 防止过长输入 |
| 工具输出 | 10KB | 截断大结果集 |
| 查询结果行数 | 100 行 | 防止内存溢出 |
| 消息历史 | 50 条 | 前端本地限制 |


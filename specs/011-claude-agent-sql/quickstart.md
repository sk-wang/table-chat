# Quickstart: Claude Agent SQL 模式

**Date**: 2025-12-30  
**Feature**: 011-claude-agent-sql

## 配置

### 1. 环境变量

在 `backend/.env` 中添加以下配置：

```bash
# Agent 模式配置
AGENT_API_BASE=http://localhost:3000/api
AGENT_API_KEY=cr_f750d122c1827568ff5899ba947d512a5381285a8d80ce76aa98c6873011561a

# 可选配置
AGENT_MODEL=claude-sonnet-4-5
AGENT_MAX_TURNS=20
AGENT_TIMEOUT=120
```

### 2. 安装依赖

```bash
cd backend
pip install claude-agent-sdk
```

## 快速验证

### 验证 Agent 服务

```python
# 在 Python REPL 中测试
import asyncio
from claude_agent_sdk import query, ClaudeAgentOptions

async def test():
    options = ClaudeAgentOptions(
        env={
            "ANTHROPIC_BASE_URL": "http://localhost:3000/api",
            "ANTHROPIC_API_KEY": "cr_xxx..."
        }
    )
    async for msg in query("Hello, what can you do?", options=options):
        print(msg)

asyncio.run(test())
```

### 验证 API 端点

```bash
# 使用 curl 测试 SSE 端点
curl -X POST http://localhost:7888/api/v1/dbs/mydb/agent/query \
  -H "Content-Type: application/json" \
  -d '{"prompt": "列出所有表"}' \
  --no-buffer
```

## 使用指南

### 1. 切换到 Agent 模式

在查询页面，点击"Agent"选项卡（与"自然语言"选项卡同级）。

### 2. 输入请求

在输入框中描述您的需求：
- "帮我查询订单总金额"
- "给用户表的邮箱字段加个索引"
- "分析一下这个数据库有哪些表"

### 3. 观察探索过程

Agent 会显示：
- 🔍 思考状态
- 🔧 工具调用（可展开查看详情）
- 💬 分析说明
- 📝 最终生成的 SQL

### 4. 使用生成的 SQL

点击"复制到编辑器"按钮，SQL 会填充到 Monaco 编辑器中。

对于 SELECT 查询，可以直接在 TableChat 中执行。  
对于 DDL 语句（如 CREATE INDEX），请复制到其他数据库管理工具执行。

## 支持的工具操作

### query_database

执行只读 SQL 查询：

| 允许 | 不允许 |
|------|--------|
| SELECT | INSERT |
| DESCRIBE | UPDATE |
| SHOW | DELETE |
| EXPLAIN | CREATE/ALTER/DROP |

### get_table_schema

获取表结构信息：
- 表名列表
- 列定义（名称、类型、是否可空、主键）
- 索引信息
- 表注释

## 示例对话

**用户**: 帮我统计每个用户的订单数量

**Agent**:
```
🔍 正在分析您的需求...

🔧 get_table_schema
   正在获取数据库表结构...
   ✓ 发现 users, orders, products 等表

🔧 query_database
   执行示例查询: SELECT * FROM orders LIMIT 5
   ✓ 确认 orders 表包含 user_id 字段

💬 根据数据库结构分析，orders 表中的 user_id 字段关联用户。

📝 生成的 SQL:
```

```sql
SELECT 
    u.id AS user_id,
    u.name AS user_name,
    COUNT(o.id) AS order_count
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.name
ORDER BY order_count DESC
```

## 故障排查

### Agent 功能不可用

检查环境变量是否正确配置：
```bash
echo $AGENT_API_BASE
echo $AGENT_API_KEY
```

### 连接超时

1. 检查 AGENT_API_BASE 是否可访问
2. 增加 AGENT_TIMEOUT 值
3. 检查网络代理设置

### 工具调用失败

查看后端日志：
```bash
tail -f backend/logs/agent.log
```


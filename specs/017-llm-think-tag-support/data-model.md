# Data Model: LLM 思考标签输出支持

**Date**: 2026-01-01  
**Feature**: 017-llm-think-tag-support

## 概述

本功能不涉及数据模型变更。现有的 API 响应模型保持不变。

## 现有实体（无变更）

### LLM Response Content

LLM 返回的原始文本内容，可能包含以下格式：

| 格式类型 | 示例 | 当前支持 | 修改后支持 |
|----------|------|----------|------------|
| 纯 JSON | `{"sql": "...", ...}` | ✅ | ✅ |
| Markdown 包裹 | ` ```json\n{...}\n``` ` | ✅ | ✅ |
| 思考标签 + JSON | `<think>...</think>{"sql": "..."}` | ❌ | ✅ |
| 思考标签 + Markdown | `<think>...</think>\n```json\n{...}\n``` ` | ❌ | ✅ |

### Parsed Result

解析后的结构化结果，模型定义在 `backend/app/models/query.py`：

```python
class NaturalQueryResponse(BaseModel):
    """Response from natural language query generation."""
    
    generated_sql: str = Field(..., alias="generatedSql")
    explanation: str | None = None
    export_format: str | None = Field(None, alias="exportFormat")
```

**无变更** - 响应结构保持不变，只是解析逻辑增强。

## 数据流

```
LLM 原始响应
    │
    ▼
┌─────────────────────────┐
│ strip_think_tags()      │  ← 新增步骤
│ 移除 <think>...</think> │
└─────────────────────────┘
    │
    ▼
┌─────────────────────────┐
│ 移除 markdown 代码块    │  ← 现有步骤
└─────────────────────────┘
    │
    ▼
┌─────────────────────────┐
│ JSON 解析               │  ← 现有步骤
└─────────────────────────┘
    │
    ▼
NaturalQueryResponse
```

## 数据库影响

**无** - 本功能不涉及任何数据库表或存储变更。


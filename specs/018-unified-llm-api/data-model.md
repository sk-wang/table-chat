# Data Model: 统一 LLM API 配置格式

**Feature**: 018-unified-llm-api  
**Date**: 2026-01-01

## 概述

本特性主要涉及配置模型的变更，无新数据库实体。核心是 `Settings` 类的重构。

---

## 实体定义

### Settings (配置实体)

**位置**: `backend/app/config.py`

#### 新增字段

| 字段 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `llm_api_type` | `Literal["anthropic", "openai"]` | `"anthropic"` | API 格式类型 |

#### 修改字段

| 字段 | 旧默认值 | 新默认值 | 变更说明 |
|------|----------|----------|----------|
| `llm_api_base` | `"https://api.openai.com/v1"` | `""` | 移除硬编码，由 effective 属性计算 |
| `llm_model` | `"gpt-4o-mini"` | `"claude-sonnet-4-5-20250929"` | 改为 Anthropic 默认模型 |

#### 保留字段（向后兼容别名）

| 字段 | 用途 |
|------|------|
| `openai_base_url` | 旧 OpenAI 配置兼容 |
| `openai_api_key` | 旧 OpenAI 配置兼容 |
| `agent_api_base` | 旧 Agent 配置兼容 |
| `agent_api_key` | 旧 Agent 配置兼容 |
| `agent_model` | 旧 Agent 配置兼容 |

#### 计算属性

```python
@property
def effective_api_key(self) -> str:
    """统一 API Key，优先级: llm_api_key > agent_api_key > openai_api_key"""
    return self.llm_api_key or self.agent_api_key or self.openai_api_key

@property
def effective_api_base(self) -> str:
    """统一 API Base URL，根据 api_type 返回合适默认值"""
    if self.llm_api_base:
        return self.llm_api_base
    if self.agent_api_base:
        return self.agent_api_base
    if self.openai_base_url:
        return self.openai_base_url
    # 默认值
    if self.llm_api_type == "anthropic":
        return "https://api.anthropic.com"
    else:
        return "http://proxy:8082"  # Docker 内部代理地址

@property
def effective_model(self) -> str:
    """统一模型名称"""
    return self.llm_model or self.agent_model or "claude-sonnet-4-5-20250929"

@property
def is_configured(self) -> bool:
    """检查是否已配置 API"""
    return bool(self.effective_api_key)
```

---

## 验证规则

### LLM_API_TYPE 验证

```python
from pydantic import field_validator
from typing import Literal

class Settings(BaseSettings):
    llm_api_type: Literal["anthropic", "openai"] = "anthropic"
    
    @field_validator("llm_api_type")
    @classmethod
    def validate_api_type(cls, v: str) -> str:
        if v not in ("anthropic", "openai"):
            raise ValueError(
                f"Invalid LLM_API_TYPE: {v}. Must be 'anthropic' or 'openai'"
            )
        return v
```

### API Key 必填验证

```python
@property
def is_configured(self) -> bool:
    return bool(self.effective_api_key)

# 在服务启动时检查
def validate_config():
    if not settings.is_configured:
        raise ConfigurationError(
            "LLM API is not configured. "
            "Please set LLM_API_KEY (or AGENT_API_KEY) environment variable."
        )
```

---

## 状态转换

本特性无状态机，配置为静态加载。

---

## 关系图

```
┌─────────────────────────────────────────────────────────────────┐
│                         Settings                                 │
├─────────────────────────────────────────────────────────────────┤
│ 新增字段                                                         │
│   llm_api_type: Literal["anthropic", "openai"]                  │
├─────────────────────────────────────────────────────────────────┤
│ 统一字段（带别名）                                               │
│   llm_api_key ← agent_api_key, openai_api_key                   │
│   llm_api_base ← agent_api_base, openai_base_url                │
│   llm_model ← agent_model                                        │
├─────────────────────────────────────────────────────────────────┤
│ 计算属性                                                         │
│   effective_api_key                                              │
│   effective_api_base                                             │
│   effective_model                                                │
│   is_configured                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────┴─────────────────────┐
        │                                           │
        ▼                                           ▼
┌───────────────────┐                   ┌───────────────────┐
│   LLMService      │                   │   AgentService    │
│ (SQL 生成)        │                   │ (Agent 模式)      │
├───────────────────┤                   ├───────────────────┤
│ 使用:             │                   │ 使用:             │
│ - effective_*     │                   │ - effective_*     │
│ - llm_api_type    │                   │ - llm_api_type    │
└───────────────────┘                   └───────────────────┘
```

---

## 环境变量完整列表

### 新配置变量

| 变量名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| `LLM_API_KEY` | string | 是 | - | 统一的 API 密钥 |
| `LLM_API_BASE` | string | 否 | (按 type 计算) | 统一的 API 地址 |
| `LLM_MODEL` | string | 否 | `claude-sonnet-4-5-20250929` | 统一的模型名称 |
| `LLM_API_TYPE` | enum | 否 | `anthropic` | API 格式类型 |

### OpenAI 模式额外变量

| 变量名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `OPENAI_API_KEY` | string | 是 | OpenAI 兼容服务的密钥 |
| `OPENAI_API_BASE` | string | 否 | OpenAI 兼容服务的地址 |

### 向后兼容变量（已弃用，仍支持）

| 变量名 | 替代为 |
|--------|--------|
| `AGENT_API_KEY` | `LLM_API_KEY` |
| `AGENT_API_BASE` | `LLM_API_BASE` |
| `AGENT_MODEL` | `LLM_MODEL` |
| `OPENAI_API_KEY` | `LLM_API_KEY` (当 type=openai) |
| `OPENAI_BASE_URL` | `LLM_API_BASE` |


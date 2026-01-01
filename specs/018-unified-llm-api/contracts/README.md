# API Contracts: 统一 LLM API 配置格式

**Feature**: 018-unified-llm-api  
**Date**: 2026-01-01

## 概述

本特性**不涉及新的 API 端点**。所有变更均为内部配置和服务层重构。

## 现有 API 影响

以下现有 API 的行为保持不变：

| 端点 | 方法 | 影响 |
|------|------|------|
| `/api/v1/query/generate` | POST | 无变化（内部使用统一配置） |
| `/api/v1/agent/run` | POST | 无变化（内部使用统一配置） |

## 可选：配置状态 API

如需添加配置状态查询端点（用于调试），可考虑：

```yaml
# 可选实现
GET /api/v1/config/status

Response:
  200 OK:
    content:
      application/json:
        schema:
          type: object
          properties:
            llmConfigured:
              type: boolean
            apiType:
              type: string
              enum: [anthropic, openai]
            modelName:
              type: string
```

此 API 为可选增强，不在核心需求范围内。


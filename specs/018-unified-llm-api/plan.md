# Implementation Plan: 统一 LLM API 配置格式

**Branch**: `018-unified-llm-api` | **Date**: 2026-01-01 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/018-unified-llm-api/spec.md`

## Summary

将现有分离的 LLM 和 Agent API 配置统一为以 **Anthropic 格式为标准** 的单一配置体系。应用代码统一使用 Anthropic Python Client。当用户的后端服务仅支持 OpenAI 格式时，通过 Docker Compose 中集成的 claude-code-proxy 自动完成格式转换（Anthropic ↔ OpenAI），使 OpenAI 兼容服务对应用透明呈现为 Anthropic API。

## Technical Context

**Language/Version**: Python 3.13+ (uv 管理)  
**Primary Dependencies**: FastAPI, Pydantic, anthropic SDK (统一使用)  
**Storage**: SQLite (元数据存储，无变更)  
**Testing**: pytest, pytest-asyncio, Playwright  
**Target Platform**: Linux server (Docker), macOS/Linux 本地开发  
**Project Type**: web (backend + frontend)  
**Performance Goals**: 代理层增加延迟 < 50ms p95  
**Constraints**: 向后兼容现有配置，零停机升级  
**Scale/Scope**: 单用户工具，无并发压力

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Ergonomic Python Backend | ✅ PASS | 继续使用类型提示、Pydantic 模型 |
| II. TypeScript Frontend | ✅ PASS | 无前端变更需求 |
| III. Strict Type Annotations | ✅ PASS | 新配置项使用 Literal 类型约束 |
| IV. Pydantic Data Models | ✅ PASS | Settings 类继续使用 Pydantic |
| V. Open Access (No Auth) | ✅ PASS | 无认证变更 |
| VI. Comprehensive Testing | ✅ PASS | 需编写配置验证测试 |

**Gate Result**: ✅ PASSED - 无违规，可进入 Phase 0

## Project Structure

### Documentation (this feature)

```text
specs/018-unified-llm-api/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (N/A - 无新 API)
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
backend/
├── app/
│   ├── config.py              # 修改: 统一 LLM 配置，新增 llm_api_type
│   ├── services/
│   │   ├── llm_service.py     # 重构: OpenAI SDK → Anthropic SDK + 统一配置
│   │   └── agent_service.py   # 修改: 使用统一配置
│   └── models/
│       └── (无变更)
└── tests/
    └── test_config.py         # 新增: 配置测试

docker-compose.yml               # 修改: 添加 claude-code-proxy 服务 (profiles: openai)
.env.example                     # 修改: 添加新环境变量示例
```

**Structure Decision**: 继承现有 Web 应用结构，主要修改 `config.py` 和两个服务文件。

## Complexity Tracking

> 无违规需要 justify

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | N/A | N/A |

---

## Phase 0 & 1 完成状态

### Phase 0: Research ✅

- [x] claude-code-proxy 集成方式研究
- [x] Anthropic Python SDK 使用模式
- [x] 统一配置向后兼容策略
- [x] Docker Compose 服务依赖设计

**输出**: [research.md](./research.md)

### Phase 1: Design & Contracts ✅

- [x] 数据模型定义 (Settings 重构)
- [x] 环境变量映射设计
- [x] 验证规则设计
- [x] 快速开始文档
- [x] Agent 上下文更新

**输出**:
- [data-model.md](./data-model.md)
- [quickstart.md](./quickstart.md)
- [contracts/README.md](./contracts/README.md)

### Constitution Re-check (Post-Design) ✅

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Ergonomic Python Backend | ✅ PASS | 使用 Literal 类型、属性计算 |
| II. TypeScript Frontend | ✅ PASS | 无前端变更 |
| III. Strict Type Annotations | ✅ PASS | 所有新字段有类型标注 |
| IV. Pydantic Data Models | ✅ PASS | Settings 继续使用 Pydantic |
| V. Open Access | ✅ PASS | 无认证变更 |
| VI. Comprehensive Testing | ✅ PASS | 测试计划已在 quickstart.md 中定义 |

---

## 下一步

运行 `/speckit.tasks` 生成具体任务列表。

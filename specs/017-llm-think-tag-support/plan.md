# Implementation Plan: LLM 思考标签输出支持

**Branch**: `017-llm-think-tag-support` | **Date**: 2026-01-01 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/017-llm-think-tag-support/spec.md`

## Summary

支持开源推理模型（如 DeepSeek、Qwen）在自然语言生成 SQL 时输出的 `<think>...</think>` 标签格式。当前系统在解析 LLM 响应时会尝试直接解析整个输出为 JSON，导致包含思考标签的响应解析失败。需要在 JSON 解析前添加思考标签剥离逻辑。

## Technical Context

**Language/Version**: Python 3.13+ (uv 管理)  
**Primary Dependencies**: FastAPI, OpenAI SDK, Pydantic  
**Storage**: SQLite (元数据存储)  
**Testing**: pytest, pytest-asyncio, .rest 文件  
**Target Platform**: Linux/macOS 服务器  
**Project Type**: Web 应用（前后端分离）  
**Performance Goals**: 响应解析额外耗时 <10ms  
**Constraints**: 向后兼容，不影响现有不带思考标签的响应解析  
**Scale/Scope**: 后端服务层单点修改

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 原则 | 状态 | 说明 |
|------|------|------|
| I. Ergonomic Python Backend | ✅ 通过 | 修改使用清晰的正则表达式和类型提示 |
| II. TypeScript Frontend | ✅ N/A | 本功能仅涉及后端修改 |
| III. Strict Type Annotations | ✅ 通过 | 所有函数保持类型标注 |
| IV. Pydantic Data Models | ✅ 通过 | 响应模型不变 |
| V. Open Access | ✅ N/A | 不涉及认证 |
| VI. Comprehensive Testing | ✅ 计划中 | 添加单元测试覆盖新逻辑 |

## Project Structure

### Documentation (this feature)

```text
specs/017-llm-think-tag-support/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # N/A - 无 API 变更
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
backend/
├── app/
│   └── services/
│       └── llm_service.py    # 主要修改点：添加思考标签剥离逻辑
└── tests/
    └── test_services/
        └── test_llm_service.py  # 添加新测试用例
```

**Structure Decision**: 本功能为后端服务层的小型增强，仅修改 `llm_service.py` 中的响应解析逻辑，并添加相应的单元测试。

## Complexity Tracking

> 无复杂度违规，本功能是简单的字符串处理增强。

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | N/A | N/A |

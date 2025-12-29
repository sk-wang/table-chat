# Implementation Plan: 元数据提示链（Metadata Prompt Chain）

**Branch**: `006-metadata-prompt-chain` | **Date**: 2025-12-29 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/006-metadata-prompt-chain/spec.md`

## Summary

将当前一次性传递全部数据库 schema 给 LLM 的方式优化为两阶段提示链：

1. **第一阶段（表选择）**：只传递表名、类型和注释，让 LLM 识别相关表
2. **第二阶段（SQL 生成）**：只传递选中表的完整字段信息，生成 SQL

核心修改集中在 `backend/app/services/llm_service.py`，通过重构 `generate_sql` 方法实现提示链逻辑。

## Technical Context

**Language/Version**: Python 3.13+ (uv 管理)  
**Primary Dependencies**: FastAPI, OpenAI SDK, Pydantic  
**Storage**: SQLite (元数据缓存)  
**Testing**: pytest, pytest-asyncio, .rest 文件, Playwright  
**Target Platform**: Web 应用 (Linux/macOS server)  
**Project Type**: Web (frontend + backend)  
**Performance Goals**: SQL 生成响应时间 <5s，Token 消耗减少 60%+  
**Constraints**: 两次 LLM 调用总时间增加不超过 50%  
**Scale/Scope**: 支持 50+ 表的数据库

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Ergonomic Python Backend | ✅ PASS | 使用类型提示和现代 Python 特性 |
| II. TypeScript Frontend | ✅ PASS | 前端无需修改（API 接口不变） |
| III. Strict Type Annotations | ✅ PASS | 所有新增函数有类型标注 |
| IV. Pydantic Data Models | ✅ PASS | 内部数据结构使用 Pydantic |
| V. Open Access | ✅ PASS | 无认证需求变更 |
| VI. Comprehensive Testing | ✅ PASS | 需增加单元测试和接口测试 |

**所有 Gate 通过，无需 Complexity Tracking。**

## Project Structure

### Documentation (this feature)

```text
specs/006-metadata-prompt-chain/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (内部接口，无新 API)
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
backend/
├── app/
│   ├── services/
│   │   └── llm_service.py    # 主要修改：实现提示链逻辑
│   └── models/
│       └── query.py          # 无需修改（API 接口不变）
└── tests/
    └── test_services/
        └── test_llm_service.py  # 新增/扩展测试

frontend/                      # 无需修改
```

**Structure Decision**: 后端服务层修改，无架构变更。主要在 `llm_service.py` 中添加表选择逻辑，保持 API 接口不变。

## Implementation Approach

### 核心修改点

1. **新增方法**: `select_relevant_tables(db_name, prompt, db_type)` - 第一阶段表选择
2. **新增方法**: `build_table_summary_context(db_name)` - 构建表概要（无字段详情）
3. **修改方法**: `build_schema_context(db_name, table_names)` - 支持过滤指定表
4. **修改方法**: `generate_sql(...)` - 整合两阶段调用

### 优化策略

- 表数量 ≤3 时跳过第一阶段，直接使用全部 schema
- 第一阶段无法识别相关表时，fallback 到全部 schema
- 使用较小的 `max_tokens` 配置第一阶段调用（只需返回表名列表）

## Complexity Tracking

> 无违反 Constitution 的情况，此节留空。

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | N/A | N/A |

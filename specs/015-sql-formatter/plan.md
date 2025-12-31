# Implementation Plan: SQL 编辑器格式化功能

**Branch**: `015-sql-formatter` | **Date**: 2025-12-31 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/015-sql-formatter/spec.md`

## Summary

为 SQL 编辑器添加一键格式化功能（按钮 + 快捷键），同时优化后端的 LIMIT 自动添加逻辑，确保添加 LIMIT 时保持原 SQL 的格式风格（单行/多行）。

## Technical Context

**Language/Version**: TypeScript 5.x (前端), Python 3.13+ (后端)  
**Primary Dependencies**: React, Monaco Editor, sqlglot, sql-formatter  
**Storage**: N/A  
**Testing**: Playwright (E2E), pytest (后端)  
**Target Platform**: 现代浏览器  
**Project Type**: Web 应用（前端 + 后端改动）  
**Performance Goals**: 格式化 <1 秒（1000 行以内）  
**Constraints**: 支持 MySQL 和 PostgreSQL 方言  
**Scale/Scope**: 前端组件增强 + 后端服务优化

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Requirement | Status | Notes |
|-----------|-------------|--------|-------|
| I. Ergonomic Python Backend | Python 风格代码 | ✅ Pass | 后端使用 sqlglot 处理 |
| II. TypeScript Frontend | 使用 TypeScript | ✅ Pass | 前端全部 TypeScript |
| III. Strict Type Annotations | 严格类型标注 | ✅ Pass | 完整类型定义 |
| IV. Pydantic Data Models | Pydantic 模型 | ✅ Pass | 新增 API 使用 Pydantic |
| V. Open Access | 无需认证 | ✅ Pass | 不涉及认证 |
| VI. Comprehensive Testing | 全面测试 | ✅ Required | 需后端单测 + E2E 测试 |

**Gate Result**: ✅ PASS - 可继续进入 Phase 0

## Project Structure

### Documentation (this feature)

```text
specs/015-sql-formatter/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (by /speckit.tasks)
```

### Source Code (repository root)

```text
backend/
├── app/
│   ├── api/v1/
│   │   └── query.py              # 新增格式化 API 端点
│   ├── models/
│   │   └── query.py              # 新增格式化请求/响应模型
│   └── services/
│       └── query_service.py      # 修改: inject_limit 保持格式 + 新增格式化方法
└── tests/
    └── test_services/
        └── test_query_service.py # 新增格式化和 LIMIT 测试

frontend/
├── src/
│   ├── components/
│   │   └── editor/
│   │       ├── SqlEditor.tsx     # 修改: 添加格式化快捷键
│   │       └── QueryToolbar.tsx  # 修改: 添加格式化按钮
│   └── services/
│       └── api.ts                # 新增格式化 API 调用
└── e2e/
    └── sql-formatter.spec.ts     # 新增 E2E 测试
```

**Structure Decision**: 前后端都需要改动。后端提供格式化 API 和优化 LIMIT 逻辑，前端添加格式化 UI 交互。

## Implementation Approach

### 技术方案

1. **SQL 格式化（后端实现）**:
   - 使用 `sqlglot` 的 `pretty` 参数进行格式化
   - 支持 MySQL 和 PostgreSQL 方言
   - 新增 `/api/v1/format` 端点

2. **LIMIT 保持格式（后端实现）**:
   - 修改 `inject_limit` 方法，检测原 SQL 是否为多行
   - 如果是多行，使用字符串拼接而非 AST 重新生成
   - 保持原有缩进风格

3. **前端交互**:
   - 在 `QueryToolbar` 添加 "Format" 按钮
   - 在 `SqlEditor` 添加 Shift+Alt+F 快捷键
   - 调用后端 API 进行格式化

### 关键代码位置

| 文件 | 修改内容 |
|------|----------|
| `backend/app/services/query_service.py` | 修改 `inject_limit`，新增 `format_sql` |
| `backend/app/api/v1/query.py` | 新增格式化端点 |
| `frontend/src/components/editor/QueryToolbar.tsx` | 添加格式化按钮 |
| `frontend/src/components/editor/SqlEditor.tsx` | 添加快捷键 |

## Complexity Tracking

> 本功能无复杂度违规项。

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| - | - | - |

## Phase Completion Status

- [x] Phase 0: Research - 完成
- [x] Phase 1: Design & Contracts - 完成
- [ ] Phase 2: Tasks - 待执行 `/speckit.tasks`

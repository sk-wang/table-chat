# Implementation Plan: Table Search Feature

**Branch**: `003-table-search` | **Date**: 2025-12-28 | **Spec**: [link](../spec.md)
**Input**: Feature specification from `/specs/003-table-search/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command.

## Summary

在侧边栏的 Schema 面板顶部添加搜索功能，支持实时模糊搜索和大小写不敏感匹配表名。该功能主要在前端实现，使用 React hooks 进行客户端过滤，性能目标为 500+ 表时响应时间小于 2 秒。

## Technical Context

**Language/Version**: Python 3.13+ (uv) / TypeScript 5.x
**Primary Dependencies**: FastAPI (后端) / React + Refine 5 + Ant Design (前端)
**Storage**: SQLite (元数据存储) - 无需新增存储
**Testing**: pytest (后端单元测试) / Playwright (前端 E2E 测试)
**Target Platform**: Web 浏览器
**Project Type**: Web Application (前后端分离)
**Performance Goals**: 搜索响应 < 500ms，500+ 表时过滤 < 2 秒
**Constraints**: 保持与现有 JetBrains Darcula 主题一致
**Scale/Scope**: 侧边栏组件局部修改，约 1-2 个新组件

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Ergonomic Python Backend | ✅ PASS | 后端无新增代码 |
| II. TypeScript Frontend | ✅ PASS | 所有前端代码使用 TypeScript |
| III. Strict Type Annotations | ✅ PASS | 组件 props 和 API 响应有类型定义 |
| IV. Pydantic Data Models | ✅ PASS | 无需新增数据模型 |
| V. Open Access (No Authentication) | ✅ PASS | 不涉及认证 |
| VI. Comprehensive Testing | ✅ PASS | 需要添加 E2E 测试 |

## Project Structure

### Documentation (this feature)

```text
specs/003-table-search/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
frontend/
├── src/
│   ├── components/
│   │   └── sidebar/
│   │       ├── DatabaseSidebar.tsx   # 修改：添加搜索框
│   │       └── TableSearchInput.tsx  # 新增：搜索组件
│   ├── services/
│   │   └── api.ts                    # 可能需要新增 API
│   └── types/
│       └── metadata.ts               # 可能需要扩展类型

backend/
├── app/
│   ├── api/v1/dbs.py                 # 可能需要新增搜索 API（可选）
│   └── services/metadata_service.py  # 可能需要新增搜索方法（可选）

tests/
├── frontend/e2e/
│   └── table-search.spec.ts          # 新增：E2E 测试
```

**Structure Decision**:
- 前端为主：搜索功能在 `DatabaseSidebar.tsx` 组件中实现
- 新增 `TableSearchInput.tsx` 组件处理搜索逻辑
- 如果性能需求超出客户端过滤能力，才考虑后端搜索 API
- 测试文件放置在 `tests/frontend/e2e/` 目录

## Complexity Tracking

> N/A - 无宪法违规需要记录

---

## Phase 0: Research & Clarifications

### Known Unknowns (NEEDS CLARIFICATION)

| ID | Question | Research Topic |
|----|----------|----------------|
| N/A | 无需澄清 - 根据项目规范和最佳实践做出合理假设 |

### Research Decisions

| Topic | Decision | Rationale |
|-------|----------|-----------|
| 搜索实现位置 | 客户端过滤 | 500+ 表的客户端过滤在现代浏览器中毫秒级完成，无需后端 API |
| 搜索算法 | 子串包含 + 大小写不敏感 | 符合需求规格中的模糊匹配要求 |
| 防抖策略 | 300ms 防抖 | 平衡响应性和性能，避免频繁更新 |
| 搜索范围 | 仅表名 | 需求规格明确为"搜索表功能"，暂不搜索列名 |

### Phase 0 Output

`research.md` - 已完成（无未知问题需要研究）

---

## Phase 1: Design & Contracts

### Data Model

**TableSearchState** (前端状态):
```typescript
interface TableSearchState {
  query: string;           // 搜索词
  filteredTables: TableMetadata[];  // 过滤后的表列表
  isSearching: boolean;    // 是否正在搜索
  resultCount: number;     // 结果数量
}
```

### API Contracts

**Option A: 纯前端搜索（推荐）**
- 无需新增 API
- 使用现有 `getDatabaseMetadata` API 获取的元数据进行客户端过滤

**Option B: 后端搜索 API（可选优化）**
```
GET /api/v1/dbs/{db}/tables/search?q={query}
Response: {
  "tables": [...],
  "total": number,
  "executionTimeMs": number
}
```

**Decision**: 采用 Option A，客户端过滤。如性能测试发现问题，再实现 Option B。

### Quickstart

```bash
# 开发
cd frontend && npm run dev

# 测试
cd frontend && npm run test        # 单元测试
npx playwright test               # E2E 测试
```

---

## Phase 2: Implementation Tasks

*(由 /speckit.tasks 命令生成)*

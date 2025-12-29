# Implementation Plan: SQL执行历史记录

**Branch**: `009-sql-history` | **Date**: 2025-12-29 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/009-sql-history/spec.md`

## Summary

实现SQL执行历史记录功能，记录用户执行的每条SQL查询（包括SQL内容、执行时间、返回行数、耗时）以及自然语言描述（如有）。使用SQLite FTS5全文搜索引擎配合jieba分词实现中英文混合搜索。前端通过Tab页形式（与查询结果并列）展示历史记录列表，支持搜索和复用SQL到编辑器。

## Technical Context

**Language/Version**: Python 3.13+ (后端) / TypeScript 5.9+ (前端)  
**Primary Dependencies**: FastAPI, aiosqlite, jieba (后端) / React 19, Ant Design 5.x (前端)  
**Storage**: SQLite (FTS5虚拟表 + 主表)  
**Testing**: pytest (后端), Vitest + Playwright (前端)  
**Target Platform**: Modern browsers + Linux/macOS server  
**Project Type**: Web application (全栈功能)  
**Performance Goals**: 10000条记录搜索 <1s，列表首屏加载 <1s  
**Constraints**: jieba分词需要额外内存，FTS5索引需要额外存储空间  
**Scale/Scope**: 单用户本地存储，按数据库连接隔离

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 原则 | 状态 | 说明 |
|------|------|------|
| Python 3.13+ Backend | ✅ PASS | 使用现有Python后端技术栈 |
| TypeScript Frontend | ✅ PASS | 使用现有TypeScript前端技术栈 |
| SQLite Storage | ✅ PASS | 扩展现有SQLite schema添加新表 |
| Comprehensive Testing | ✅ PASS | 计划包含后端pytest和前端E2E测试 |

**Gate Result**: ✅ PASS - 无违规项，可以继续

## Project Structure

### Documentation (this feature)

```text
specs/009-sql-history/
├── plan.md              # This file
├── research.md          # Phase 0 output - FTS5和jieba研究
├── data-model.md        # Phase 1 output - 数据模型设计
├── quickstart.md        # Phase 1 output - 快速开始指南
├── contracts/           # Phase 1 output - API契约
│   └── api.md
├── checklists/
│   └── requirements.md  # 质量检查清单
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
backend/
├── app/
│   ├── db/
│   │   └── sqlite.py           # 修改：添加query_history表和FTS5索引
│   ├── models/
│   │   └── history.py          # 新增：历史记录Pydantic模型
│   ├── services/
│   │   └── history_service.py  # 新增：历史记录服务（增删查搜）
│   └── api/v1/
│       └── history.py          # 新增：历史记录API端点
└── tests/
    ├── test_services/
    │   └── test_history_service.py  # 新增：服务层测试
    └── test_api/
        └── test_history.py          # 新增：API测试

frontend/
├── src/
│   ├── components/
│   │   └── history/
│   │       ├── QueryHistoryTab.tsx      # 新增：历史记录Tab组件
│   │       ├── QueryHistoryList.tsx     # 新增：历史记录列表组件
│   │       └── QueryHistorySearch.tsx   # 新增：搜索输入组件
│   ├── services/
│   │   └── api.ts              # 修改：添加历史记录API方法
│   ├── types/
│   │   └── history.ts          # 新增：历史记录类型定义
│   └── pages/query/
│       └── index.tsx           # 修改：集成历史记录Tab
└── e2e/
    └── query-history.spec.ts   # 新增：E2E测试
```

**Structure Decision**: 全栈功能，后端新增历史记录服务模块，前端新增历史记录组件目录。遵循现有项目结构约定。

## Complexity Tracking

> 无需额外复杂度，功能在现有架构内实现。

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| jieba分词依赖 | SQLite不支持中文分词，需要外部分词器 | 不使用分词将导致中文搜索失效 |
| FTS5虚拟表 | 全文搜索性能需求 | 普通LIKE查询在大数据量下性能差 |


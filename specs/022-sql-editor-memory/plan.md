# Implementation Plan: SQL编辑器历史记录功能

**Branch**: `022-sql-editor-memory` | **Date**: 2026-01-10 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/022-sql-editor-memory/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

实现SQL编辑器的输入记忆功能，允许用户在编辑器中输入的SQL内容被自动保存到SQLite数据库。每个数据库连接拥有独立的编辑器内容历史记录。系统会每30秒自动保存编辑器内容，当用户切换数据库连接时自动加载该数据库上次保存的内容。用户可以查看历史记录列表，选择并加载历史内容，以及删除不需要的历史记录。

## Technical Context

**Language/Version**: Python 3.13+ (后端), TypeScript 5.9+ (前端)
**Primary Dependencies**: FastAPI, Pydantic, aiosqlite (后端); React 19, Ant Design, Monaco Editor (前端)
**Storage**: SQLite (用于存储编辑器历史记录)
**Testing**: pytest + pytest-asyncio (后端), Playwright (前端E2E), vitest (前端单元测试)
**Target Platform**: Web应用程序 (前后端分离架构)
**Project Type**: Web应用程序 (backend + frontend)
**Performance Goals**:
  - 编辑器自动保存延迟 < 100ms
  - 历史记录查询响应时间 < 500ms
  - 切换数据库加载历史记录 < 1秒
**Constraints**:
  - 使用现有的SQLite数据库（scinew.db）
  - 保持与现有数据库连接管理机制的兼容性
  - 不影响现有SQL执行功能
**Scale/Scope**:
  - 支持多个数据库连接的独立历史记录
  - 单个连接的历史记录无数量限制
  - 前端组件集成到现有SQL编辑器页面

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 原则 | 状态 | 说明 |
|------|------|------|
| I. Ergonomic Python Backend | ✅ PASS | 后端使用Python 3.13+，采用类型提示、Pydantic模型 |
| II. TypeScript Frontend | ✅ PASS | 前端使用TypeScript 5.9+，strict模式 |
| III. Strict Type Annotations | ✅ PASS | 后端所有API使用Pydantic模型，前端启用strict模式 |
| IV. Pydantic Data Models | ✅ PASS | 所有API请求/响应使用Pydantic BaseModel，JSON使用camelCase |
| V. Open Access | ✅ PASS | 历史记录API无需认证，任何用户均可访问 |
| VI. Comprehensive Testing | ✅ PASS | 计划包含后端单元测试、接口测试(.rest文件)、前端E2E测试 |

**结论**: 所有宪法原则均符合，可以进入Phase 0研究阶段。

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
backend/
├── app/
│   ├── models/
│   │   └── editor_memory.py          # SQL编辑器记忆的Pydantic模型
│   ├── services/
│   │   └── editor_memory_service.py  # 编辑器记忆业务逻辑
│   ├── api/
│   │   └── editor_memory.py          # 编辑器记忆API端点
│   └── database/
│       └── editor_memory_db.py       # SQLite数据库操作
└── tests/
    ├── unit/
    │   └── test_editor_memory_service.py
    └── integration/
        └── test_editor_memory_api.py

frontend/
├── src/
│   ├── components/
│   │   └── EditorMemory/             # 编辑器记忆相关组件
│   │       ├── HistoryPanel.tsx      # 历史记录面板
│   │       ├── HistoryItem.tsx       # 历史记录项
│   │       └── AutoSaveIndicator.tsx # 自动保存指示器
│   ├── services/
│   │   └── editorMemoryService.ts    # 编辑器记忆API客户端
│   ├── hooks/
│   │   └── useEditorAutoSave.ts      # 自动保存Hook
│   └── types/
│       └── editorMemory.ts           # TypeScript类型定义
└── e2e/
    └── editor-memory.spec.ts         # E2E测试

# API测试文件
api-tests.rest                         # 添加编辑器记忆API测试用例
```

**Structure Decision**: 采用现有的Web应用程序结构（backend + frontend分离）。后端使用FastAPI + SQLite，前端使用React + TypeScript。编辑器记忆功能作为独立模块添加到现有架构中，不影响现有功能。

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

**无需填写** - 所有宪法原则均符合，无违规项需要说明。

---

## Phase 0: Research (✅ 完成)

研究文档已生成：[research.md](./research.md)

**关键决策**:
1. SQLite表结构：editor_memory表，包含connection_id索引
2. 自动保存机制：React hooks + 30秒定时器
3. 连接ID策略：使用系统分配的connection_id
4. 并发处理：Last write wins策略
5. 性能优化：connection_id和created_at索引

---

## Phase 1: Design & Contracts (✅ 完成)

### 生成的设计文档

1. **数据模型** - [data-model.md](./data-model.md)
   - SQLite表结构定义
   - Pydantic模型（后端）
   - TypeScript接口（前端）
   - 数据验证规则

2. **API契约** - [contracts/openapi.yaml](./contracts/openapi.yaml)
   - OpenAPI 3.0规范
   - 4个端点：创建、查询、删除单条、清空全部
   - 请求/响应示例
   - 错误处理规范

3. **快速上手指南** - [quickstart.md](./quickstart.md)
   - 环境设置步骤
   - API使用示例
   - 前端集成示例
   - 测试指南
   - 常见问题解答

### Agent Context更新

✅ Claude Code上下文已更新（CLAUDE.md）
- 添加了技术栈信息
- 记录了最新变更

### Constitution Check 复验 (Phase 1后)

| 原则 | 状态 | Phase 1验证 |
|------|------|-------------|
| I. Ergonomic Python Backend | ✅ PASS | 数据模型使用Pydantic，类型标注完整 |
| II. TypeScript Frontend | ✅ PASS | 前端接口定义使用strict TypeScript |
| III. Strict Type Annotations | ✅ PASS | 所有模型都有明确的类型定义 |
| IV. Pydantic Data Models | ✅ PASS | API使用Pydantic BaseModel，配置camelCase |
| V. Open Access | ✅ PASS | API无认证要求 |
| VI. Comprehensive Testing | ✅ PASS | 已规划单元测试、集成测试、E2E测试 |

**Phase 1结论**: 设计符合所有宪法原则，可以进入Phase 2（任务生成）。

---

## Phase 2: 任务生成 (待执行)

**下一步**: 运行 `/speckit.tasks` 命令生成详细的实施任务列表。

Phase 2将基于以上设计生成：
- tasks.md：按优先级排序的实施任务
- 任务依赖关系图
- 预估工作量
- 验收标准

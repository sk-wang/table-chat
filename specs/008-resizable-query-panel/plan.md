# Implementation Plan: 可调节的查询面板分隔器

**Branch**: `008-resizable-query-panel` | **Date**: 2025-12-29 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/008-resizable-query-panel/spec.md`

## Summary

在 SQL 编辑器区域和查询结果区域之间添加可拖动分隔条，允许用户调整两个区域的高度比例，并通过 localStorage 持久化用户偏好设置。技术上采用项目已有的 `react-resizable` 库实现拖拽功能，复用现有 `storage.ts` 服务模式进行数据持久化。

## Technical Context

**Language/Version**: TypeScript 5.9+ (Vite + React 19)  
**Primary Dependencies**: React, Ant Design, react-resizable (已安装)  
**Storage**: localStorage (browser)  
**Testing**: Vitest (unit), Playwright (E2E)  
**Target Platform**: Modern browsers (Chrome/Firefox/Safari/Edge)  
**Project Type**: Web application (frontend-only feature)  
**Performance Goals**: 60fps 流畅拖拽体验，<100ms 响应时间  
**Constraints**: 最小区域高度 100px，localStorage 可用性降级处理  
**Scale/Scope**: 单页面功能，影响 QueryPage 组件

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 原则 | 状态 | 说明 |
|------|------|------|
| II. TypeScript Frontend | ✅ PASS | 使用 TypeScript 实现所有新代码 |
| III. Strict Type Annotations | ✅ PASS | 所有新接口和函数将有完整类型标注 |
| VI. Comprehensive Testing | ✅ PASS | 将包含 E2E 测试覆盖用户交互场景 |

**Gate Result**: ✅ PASS - 无违规项，可以继续

## Project Structure

### Documentation (this feature)

```text
specs/008-resizable-query-panel/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── checklists/          # Validation checklists
│   └── requirements.md
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
frontend/
├── src/
│   ├── components/
│   │   └── layout/
│   │       └── ResizableSplitPane.tsx  # 新增：可调节分隔面板组件
│   ├── pages/
│   │   └── query/
│   │       └── index.tsx               # 修改：集成分隔面板
│   ├── services/
│   │   └── storage.ts                  # 修改：添加面板比例缓存方法
│   └── types/
│       └── storage.ts                  # 修改：添加面板比例缓存类型
└── e2e/
    └── resizable-panel.spec.ts         # 新增：E2E 测试
```

**Structure Decision**: 纯前端功能，不涉及后端变更。新建独立组件 `ResizableSplitPane` 封装可调节逻辑，保持 QueryPage 简洁。

## Complexity Tracking

> 无需额外复杂度，功能在现有架构内实现。

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | - | - |

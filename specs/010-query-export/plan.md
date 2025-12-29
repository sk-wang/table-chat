# Implementation Plan: 查询结果导出

**Branch**: `010-query-export` | **Date**: 2025-12-29 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/010-query-export/spec.md`

## Summary

实现查询结果导出功能，支持将 SQL 查询结果导出为 CSV、JSON 和 XLSX 三种格式。功能完全在前端实现，通过下拉按钮触发，同时支持通过自然语言指定导出格式后自动执行导出。使用 SheetJS 库生成 XLSX 文件，CSV 和 JSON 格式使用原生 JavaScript 实现。

## Technical Context

**Language/Version**: TypeScript 5.9+ (前端)  
**Primary Dependencies**: React 19, Ant Design 5.x, SheetJS (xlsx)  
**Storage**: 无（纯前端功能）  
**Testing**: Vitest (单元测试), Playwright (E2E 测试)  
**Target Platform**: Modern browsers (Chrome, Firefox, Safari, Edge)  
**Project Type**: Web application (纯前端功能)  
**Performance Goals**: 1000 行导出 <2s，不阻塞 UI  
**Constraints**: XLSX 库较大（~300KB），需考虑动态加载  
**Scale/Scope**: 单用户本地导出

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 原则 | 状态 | 说明 |
|------|------|------|
| TypeScript Frontend | ✅ PASS | 使用现有 TypeScript 前端技术栈 |
| 前端实现 | ✅ PASS | 无需后端改动 |
| 最小依赖 | ⚠️ WARN | 需要添加 xlsx 库，但该库是 XLSX 导出的最佳选择 |
| Comprehensive Testing | ✅ PASS | 计划包含单元测试和 E2E 测试 |

**Gate Result**: ✅ PASS - 无阻塞项，可以继续

## Project Structure

### Documentation (this feature)

```text
specs/010-query-export/
├── plan.md              # This file
├── spec.md              # 功能规格说明
├── data-model.md        # 数据模型设计
├── tasks.md             # 任务清单
└── checklists/
    └── requirements.md  # 需求检查清单
```

### Source Code (repository root)

```text
frontend/
├── src/
│   ├── components/
│   │   └── export/
│   │       ├── ExportButton.tsx        # 新增：导出下拉按钮组件
│   │       ├── exportUtils.ts          # 新增：导出工具函数
│   │       └── index.ts                # 新增：模块导出
│   ├── pages/
│   │   └── query/
│   │       └── index.tsx               # 修改：集成导出按钮
│   ├── types/
│   │   └── export.ts                   # 新增：导出相关类型定义
│   └── test/
│       └── export.test.ts              # 新增：导出功能单元测试
└── e2e/
    └── export.spec.ts                  # 新增：E2E 测试
```

**Structure Decision**: 创建独立的 export 组件目录，保持与现有 history 组件一致的结构。导出逻辑封装在 exportUtils.ts 中以便单元测试。

## Complexity Tracking

> 尽量使用简单方案，避免过度设计。

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| xlsx 第三方库 | 生成 XLSX 格式需要 | 原生 JS 无法生成标准 XLSX 格式 |
| 动态 import | xlsx 库较大 | 静态导入会增加首屏加载时间 |

## Implementation Phases

### Phase 1: Setup (依赖安装与类型定义)

- 安装 xlsx 依赖
- 创建导出相关类型定义

### Phase 2: Core Export Utils (导出核心工具)

- 实现 CSV 导出函数
- 实现 JSON 导出函数
- 实现 XLSX 导出函数
- 实现文件下载触发函数

### Phase 3: UI Integration (UI 集成)

- 创建 ExportButton 组件
- 集成到查询结果区域
- 处理禁用状态

### Phase 4: Natural Language Export (自然语言导出)

- 修改 LLM 提示词以识别导出意图
- 修改自然语言查询响应处理
- 自动触发导出流程

### Phase 5: Testing & Polish

- 编写单元测试
- 编写 E2E 测试
- 边界情况处理

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup)
    │
    └── Phase 2 (Core Export Utils)
              │
              ├── Phase 3 (UI Integration)
              │
              └── Phase 4 (Natural Language Export)
                        │
                        └── Phase 5 (Testing & Polish)
```

### Parallel Opportunities

```bash
# Phase 1 - Sequential:
T001 → T002

# Phase 2 - CSV/JSON can be parallel (different functions):
T003 (CSV) || T004 (JSON)
then T005 (XLSX) 
then T006 (download trigger)

# Phase 3 & 4 - Sequential (UI depends on utils):
Phase 3 → Phase 4

# Phase 5 - Tests can be parallel:
T012 (unit tests) || T013 (E2E tests)
```

## Task Count Summary

| Phase | Tasks | Description | Status |
|-------|-------|-------------|--------|
| Phase 1 | 2 | 依赖安装与类型定义 | ⏳ |
| Phase 2 | 4 | 导出核心工具 | ⏳ |
| Phase 3 | 3 | UI 集成 | ⏳ |
| Phase 4 | 3 | 自然语言导出 | ⏳ |
| Phase 5 | 4 | 测试与优化 | ⏳ |
| **Total** | **16** | | |

## Notes

- xlsx 库使用动态 import 以减少首屏加载时间
- CSV 使用标准 RFC 4180 格式，自动处理逗号和引号转义
- JSON 使用 2 空格缩进的格式化输出
- 文件名中的特殊字符需要清理
- NULL 值在 CSV 中显示为空字符串，在 JSON 中显示为 null


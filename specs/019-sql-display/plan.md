# Implementation Plan: SQL Code Display Optimization

**Branch**: `019-sql-display` | **Date**: 2026-01-01 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/019-sql-display/spec.md`

## Summary

优化 AI Agent 对话中 SQL 代码块的显示效果：
1. **宽度约束**: 确保代码块不超出消息气泡的可见区域，超长内容支持水平滚动
2. **复制功能**: 为所有 Markdown 代码块添加复制按钮，支持一键复制到剪贴板
3. **视觉反馈**: 复制成功后显示"已复制"状态，2秒后恢复

技术方案：修改前端 MarkdownRenderer 组件和相关 CSS 样式，使用 Clipboard API 实现复制功能。

## Technical Context

**Language/Version**: TypeScript 5.x (前端), React 19
**Primary Dependencies**: React, marked (Markdown 解析), highlight.js (语法高亮), Ant Design
**Storage**: N/A（纯前端功能，不涉及存储）
**Testing**: Playwright (E2E 测试)
**Target Platform**: 现代浏览器 (Chrome, Firefox, Safari, Edge)
**Project Type**: Web application
**Performance Goals**: 复制操作响应时间 < 200ms
**Constraints**: 兼容 Clipboard API 和传统复制方式
**Scale/Scope**: 单个前端组件优化

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Ergonomic Python Backend | N/A | 纯前端功能，不涉及后端 |
| II. TypeScript Frontend | ✅ PASS | 使用 TypeScript 编写 |
| III. Strict Type Annotations | ✅ PASS | 组件 props 有类型定义 |
| IV. Pydantic Data Models | N/A | 不涉及后端 API |
| V. Open Access | N/A | 不涉及认证 |
| VI. Comprehensive Testing | ✅ REQUIRED | 需要 E2E 测试覆盖 |

**Gate Result**: ✅ PASS - 可以继续

## Project Structure

### Documentation (this feature)

```text
specs/019-sql-display/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (N/A for this feature)
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
frontend/
├── src/
│   ├── components/
│   │   └── agent/
│   │       ├── MarkdownRenderer.tsx  # 主要修改：添加复制按钮逻辑
│   │       ├── AgentMessage.tsx       # 修改：添加 overflow 约束
│   │       └── styles.css             # 修改：代码块和复制按钮样式
│   └── ...
└── e2e/
    └── sql-display.spec.ts           # 新增：E2E 测试
```

**Structure Decision**: 纯前端修改，集中在 `frontend/src/components/agent/` 目录

## Complexity Tracking

> 无违反宪法的情况，无需记录复杂度引入理由。

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| (无) | - | - |

# Implementation Plan: SSH 私钥文件选择器

**Branch**: `014-ssh-key-file-picker` | **Date**: 2025-12-31 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/014-ssh-key-file-picker/spec.md`

## Summary

增强 SSH 隧道配置界面中的私钥输入组件，添加"选择文件"按钮，让用户可以直接从本地文件系统选择私钥文件，文件内容自动读取并填入文本框。这是纯前端功能，使用浏览器原生 File API 实现。

## Technical Context

**Language/Version**: TypeScript 5.x  
**Primary Dependencies**: React, Ant Design, 浏览器 File API  
**Storage**: N/A（前端文件读取，不涉及持久化）  
**Testing**: Playwright (E2E 测试)  
**Target Platform**: 现代浏览器 (Chrome, Firefox, Safari, Edge)  
**Project Type**: Web 应用（仅前端改动）  
**Performance Goals**: 文件读取 <1 秒  
**Constraints**: 文件大小限制 100KB，仅支持文本文件  
**Scale/Scope**: 单个组件增强

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Requirement | Status | Notes |
|-----------|-------------|--------|-------|
| I. Ergonomic Python Backend | Python 风格代码 | N/A | 本功能不涉及后端 |
| II. TypeScript Frontend | 使用 TypeScript | ✅ Pass | 所有前端代码使用 TypeScript |
| III. Strict Type Annotations | 严格类型标注 | ✅ Pass | 将为文件读取逻辑添加完整类型 |
| IV. Pydantic Data Models | Pydantic 数据模型 | N/A | 本功能不涉及后端 |
| V. Open Access | 无需认证 | ✅ Pass | 不涉及认证 |
| VI. Comprehensive Testing | 全面测试 | ✅ Required | 需添加 Playwright E2E 测试 |

**Gate Result**: ✅ PASS - 可继续进入 Phase 0

## Project Structure

### Documentation (this feature)

```text
specs/014-ssh-key-file-picker/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (by /speckit.tasks)
```

### Source Code (repository root)

```text
frontend/
├── src/
│   ├── components/
│   │   └── database/
│   │       └── AddDatabaseModal.tsx  # 需修改：添加文件选择按钮
│   └── utils/
│       └── fileReader.ts             # 新增：文件读取工具函数（可选）
└── e2e/
    └── ssh-key-file-picker.spec.ts   # 新增：E2E 测试
```

**Structure Decision**: 纯前端改动，主要修改 `AddDatabaseModal.tsx` 组件，添加文件选择功能。

## Implementation Approach

### 技术方案

1. **文件选择**: 使用隐藏的 `<input type="file">` 元素配合按钮触发
2. **文件读取**: 使用 `FileReader` API 的 `readAsText()` 方法
3. **UI 设计**: 在私钥 TextArea 上方添加 "选择文件" 按钮

### 关键代码位置

- **修改文件**: `frontend/src/components/database/AddDatabaseModal.tsx`
- **修改位置**: 第 378-411 行的私钥输入区域
- **修改内容**: 添加文件选择按钮，集成 FileReader 逻辑

### 错误处理策略

1. 文件过大 (>100KB): 显示 "文件过大，私钥文件通常小于 100KB"
2. 读取失败: 显示 "无法读取文件，请确认文件权限或格式"
3. 取消选择: 不做任何操作
4. 浏览器不支持: 隐藏文件选择按钮（实际上所有现代浏览器都支持）

## Complexity Tracking

> 本功能无复杂度违规项，不需要额外理由说明。

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| - | - | - |

## Phase Completion Status

- [x] Phase 0: Research - 完成
- [x] Phase 1: Design & Contracts - 完成（无需后端改动）
- [ ] Phase 2: Tasks - 待执行 `/speckit.tasks`

# Research: 代码库审查与质量提升

**Feature**: 016-code-review-cleanup  
**Date**: 2025-12-31

## 1. Lint 问题分析

### 当前状态

运行 `npm run lint` 结果：

```
✖ 59 problems (42 errors, 17 warnings)
  0 errors and 14 warnings potentially fixable with the `--fix` option
```

### 问题分类

#### Errors (42 个)

| 类别 | 数量 | 主要文件 |
|------|------|----------|
| 未使用变量/imports | ~20 | `api.test.ts`, 其他测试文件 |
| `any` 类型使用 | ~10 | `setup.ts`, hooks |
| 其他 | ~12 | 分散各文件 |

#### Warnings (17 个)

| 类别 | 数量 | 主要文件 |
|------|------|----------|
| React Hooks 依赖 | ~15 | `useAgentChat.ts` |
| 其他 | ~2 | - |

### 关键问题详情

#### 1. `useAgentChat.ts` - useCallback 依赖项问题

```typescript
// 当前代码
const sendMessage = useCallback(
  async (prompt: string) => {
    // ... 使用了 extractHistory 和 state.messages
  },
  [dbName, state.status]  // ← 缺少 extractHistory, state.messages
);
```

**修复方案**：
- 选项 A：添加缺失依赖项（可能导致过度重渲染）
- 选项 B：使用 `useRef` 存储 `extractHistory`（推荐）
- 选项 C：添加 eslint-disable 注释并记录原因

#### 2. `api.test.ts` - 未使用 imports

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
                                              // ^^^^^^^^^ 未使用
import type { AxiosInstance, AxiosResponse } from 'axios';
            // ^^^^^^^^^^^^^ 未使用
```

**修复方案**：删除未使用的 imports

#### 3. `setup.ts` - `any` 类型

```typescript
const originalError = console.error;
console.error = (...args: any[]) => { ... };  // ← any 类型
```

**修复方案**：使用 `unknown[]` 替代 `any[]`

## 2. 测试覆盖分析

### 前端测试现状

| 测试文件 | 测试数量 | 覆盖组件 |
|----------|----------|----------|
| storage.test.ts | 34 | localStorage 服务 |
| api.test.ts | ~20 | API 客户端 |
| export.test.ts | 19 | 导出功能 |
| ResizableSplitPane.test.tsx | 13 | 可调整分割面板 |
| DatabaseContext.test.tsx | 12 | 数据库上下文 |
| QueryToolbar.test.tsx | 8 | 查询工具栏 |
| types.test.ts | 若干 | 类型检查 |
| agent.test.ts | 若干 | Agent 功能 |
| **总计** | ~110 | - |

### 缺少测试的组件

| 组件 | 复杂度 | 测试优先级 | 原因 |
|------|--------|------------|------|
| SqlEditor.tsx | 高 | P1 | 核心编辑器，Monaco 集成 |
| AddDatabaseModal.tsx | 高 | P1 | 复杂表单，SSH 配置 |
| NaturalLanguageInput.tsx | 中 | P2 | 用户交互组件 |
| QueryResultTable.tsx | 中 | P2 | 数据展示组件 |
| DatabaseSidebar.tsx | 低 | P3 | 主要是展示 |
| AgentChat.tsx | 高 | P3 | 复杂但依赖后端 |

### 后端测试现状

```
backend/tests/
├── test_api/           # 5 个文件
├── test_services/      # 7 个文件
├── test_connectors/    # 2 个文件
├── test_db/            # 1 个文件
└── test_models.py
```

### 需要补充的后端测试

| 模块 | 测试类型 | 优先级 |
|------|----------|--------|
| format_sql API | 端点测试 | P1 |
| ssh_tunnel 服务 | 单元测试 | P2 |
| 边界情况 | 错误处理 | P2 |

## 3. 死代码分析

### Refine DataProvider 契约代码

以下代码虽未直接调用，但为框架契约要求：

```typescript
// frontend/src/services/data-provider.ts
getMany: async () => { ... },      // Required by DataProvider
createMany: async () => { ... },   // Required by DataProvider
updateMany: async () => { ... },   // Required by DataProvider
deleteMany: async () => { ... },   // Required by DataProvider
custom: async () => { ... },       // Required by DataProvider
```

**决策**：保留并添加注释说明

### 可能废弃的代码

| 位置 | 代码 | 状态 |
|------|------|------|
| - | - | 待进一步扫描确认 |

## 4. 优化机会初步识别

### 性能优化

1. **useAgentChat 重渲染**：useCallback 依赖项过多导致频繁重建
2. **Monaco Editor 初始化**：每次切换 tab 重新初始化
3. **API 调用去重**：metadata 请求可能重复

### 架构优化

1. **状态管理分散**：QueryPage 有太多 useState
2. **错误处理不一致**：部分组件 try-catch，部分依赖 ErrorBoundary
3. **类型定义重复**：前后端类型未自动同步

### 用户体验优化

1. **加载状态不一致**：不同操作加载反馈不统一
2. **错误消息本地化**：部分错误消息为英文

### 开发者体验优化

1. **测试覆盖率可视化**：缺少覆盖率报告
2. **类型安全增强**：减少 `any` 使用
3. **文档完善**：组件 Props 文档不完整

## 5. 技术决策

### 修复策略

1. **自动修复优先**：使用 `npm run lint -- --fix`
2. **保守删除**：对不确定的"未使用"代码只添加注释
3. **测试隔离**：新增测试使用 mock 隔离外部依赖

### 不处理的问题

1. 需要重大重构的架构问题
2. Python mypy 类型检查（项目未启用）
3. E2E 测试补充（已有 8 个测试文件）


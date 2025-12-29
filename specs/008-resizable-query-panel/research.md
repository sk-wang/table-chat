# Research: 可调节的查询面板分隔器

**Feature**: 008-resizable-query-panel  
**Date**: 2025-12-29

## 研究背景

本功能需要在 SQL 编辑器和查询结果之间实现可拖拽的分隔条。研究重点包括：
1. React 中实现可调节面板的最佳方案
2. localStorage 持久化的最佳实践
3. 性能优化策略

---

## Decision 1: 可调节面板实现方案

### Decision

使用项目已安装的 **react-resizable** 库实现可调节功能。

### Rationale

1. **已有依赖**: `react-resizable@3.0.5` 已在 `package.json` 中
2. **轻量级**: 仅 ~7KB gzipped，不增加额外包大小
3. **TypeScript 支持**: 项目已安装 `@types/react-resizable`
4. **API 简洁**: 提供 `Resizable` 和 `ResizableBox` 组件，满足需求
5. **可控性**: 支持自定义 handle、约束条件、回调函数

### Alternatives Considered

| 方案 | 优点 | 缺点 | 结论 |
|------|------|------|------|
| **react-resizable** | 已安装、轻量、简单 | 功能相对基础 | ✅ 选用 |
| **react-split-pane** | 专为分隔面板设计 | 已停止维护，需新增依赖 | ❌ 拒绝 |
| **原生实现** | 无依赖 | 开发成本高，需处理边缘情况 | ❌ 拒绝 |
| **allotment** | 现代、功能丰富 | 需新增依赖 ~20KB | ❌ 拒绝 |

---

## Decision 2: 状态持久化方案

### Decision

复用现有 `storage.ts` 服务模式，添加专用的面板比例缓存方法。

### Rationale

1. **一致性**: 遵循项目已有的 `CACHE_KEYS`、`CacheData<T>` 模式
2. **健壮性**: 复用 `safeGetItem`/`safeSetItem` 的错误处理
3. **版本管理**: 集成现有的缓存版本检查机制
4. **可测试性**: 与现有测试模式保持一致

### Storage Key Design

```typescript
// 添加到 CACHE_KEYS
QUERY_PANEL_RATIO: 'tablechat_query_panel_ratio'

// 数据结构
interface QueryPanelRatioCache {
  editorRatio: number;  // 0-1 之间的小数，表示编辑器区域占比
}
```

### Alternatives Considered

| 方案 | 优点 | 缺点 | 结论 |
|------|------|------|------|
| **复用 storage.ts** | 一致性、健壮性 | 无 | ✅ 选用 |
| **React Context** | 简单 | 刷新后丢失 | ❌ 拒绝 |
| **独立 localStorage 调用** | 简单 | 缺少版本管理和错误处理 | ❌ 拒绝 |

---

## Decision 3: 组件架构

### Decision

创建独立的 `ResizableSplitPane` 组件封装分隔逻辑。

### Rationale

1. **单一职责**: 分隔逻辑与 QueryPage 业务逻辑分离
2. **可复用**: 未来其他页面可能需要类似功能
3. **可测试**: 独立组件更易于单元测试
4. **Props 设计**: 通过 props 传入上下两个面板内容

### Component Interface

```typescript
interface ResizableSplitPaneProps {
  topPanel: React.ReactNode;
  bottomPanel: React.ReactNode;
  defaultRatio?: number;        // 默认 0.4
  minTopHeight?: number;        // 默认 100
  minBottomHeight?: number;     // 默认 100
  storageKey?: string;          // localStorage key，可选
  onRatioChange?: (ratio: number) => void;
}
```

---

## Decision 4: 性能优化策略

### Decision

采用以下策略确保 60fps 流畅体验：

1. **节流保存**: 拖拽结束时才保存到 localStorage，避免频繁 I/O
2. **CSS 优化**: 使用 `flex` 布局而非绝对定位，利用浏览器原生优化
3. **事件处理**: 使用 `useCallback` 缓存事件处理函数
4. **状态更新**: 直接操作高度值，避免复杂计算

### Rationale

- localStorage 写入是同步阻塞操作，频繁调用会影响拖拽流畅性
- CSS flex 布局性能优于 JavaScript 计算位置
- React 重渲染优化对拖拽体验至关重要

---

## Decision 5: 视觉反馈设计

### Decision

分隔条样式与项目现有 JetBrains 风格保持一致：

- **宽度**: 8px（足够点击，不占用过多空间）
- **默认色**: `#323232`（与现有边框色一致）
- **悬停色**: `#4a4a4a`（微妙高亮）
- **光标**: `ns-resize`（上下调整）

### Rationale

参考 `MainLayout.tsx` 中的 `borderColor: '#323232'` 和整体暗色主题风格。

---

## 总结

| 研究项 | 决策 | 关键理由 |
|--------|------|----------|
| 拖拽库 | react-resizable | 已安装、轻量 |
| 持久化 | 复用 storage.ts | 一致性、健壮性 |
| 组件架构 | 独立 ResizableSplitPane | 单一职责、可复用 |
| 性能优化 | 节流保存 + flex 布局 | 60fps 流畅体验 |
| 视觉风格 | JetBrains 暗色风格 | 与现有 UI 一致 |

所有 NEEDS CLARIFICATION 已解决，可以进入 Phase 1 设计阶段。


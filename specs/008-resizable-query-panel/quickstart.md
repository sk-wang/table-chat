# Quickstart: 可调节的查询面板分隔器

**Feature**: 008-resizable-query-panel  
**Date**: 2025-12-29

## 快速概览

本功能在 SQL 编辑器和查询结果区域之间添加可拖动分隔条，支持：
- 拖拽调整两个区域的高度比例
- 自动保存用户偏好到 localStorage
- 页面刷新后恢复上次设置

## 前置条件

- Node.js 18+
- 项目已安装依赖（`npm install` 已执行）
- 熟悉 React、TypeScript 基础

## 开发环境设置

```bash
# 1. 切换到功能分支
git checkout 008-resizable-query-panel

# 2. 进入前端目录
cd frontend

# 3. 启动开发服务器
npm run dev
```

## 涉及文件

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/types/storage.ts` | 修改 | 添加 `QueryPanelRatioCache` 类型和缓存 key |
| `src/services/storage.ts` | 修改 | 添加面板比例的 get/set 方法 |
| `src/components/layout/ResizableSplitPane.tsx` | 新建 | 可调节分隔面板组件 |
| `src/pages/query/index.tsx` | 修改 | 集成 `ResizableSplitPane` 组件 |
| `e2e/resizable-panel.spec.ts` | 新建 | E2E 测试 |

## 实现步骤概要

### Step 1: 扩展存储类型

```typescript
// src/types/storage.ts
export interface QueryPanelRatioCache {
  editorRatio: number;
}

export const CACHE_KEYS = {
  // ...existing
  QUERY_PANEL_RATIO: 'tablechat_query_panel_ratio',
} as const;
```

### Step 2: 添加存储方法

```typescript
// src/services/storage.ts
export const getQueryPanelRatio = (): number | null => { /* ... */ }
export const setQueryPanelRatio = (ratio: number): void => { /* ... */ }
```

### Step 3: 创建分隔面板组件

```typescript
// src/components/layout/ResizableSplitPane.tsx
export const ResizableSplitPane: React.FC<Props> = ({ topPanel, bottomPanel, ... }) => {
  // 使用 react-resizable 实现拖拽
  // 从 localStorage 加载/保存比例
}
```

### Step 4: 集成到 QueryPage

```tsx
// src/pages/query/index.tsx
<ResizableSplitPane
  topPanel={<EditorTabs />}
  bottomPanel={<QueryResultTable />}
  storageKey="tablechat_query_panel_ratio"
/>
```

## 测试验证

### 手动测试

1. 打开查询页面 `http://localhost:5173`
2. 将鼠标悬停在编辑器和结果区域之间，确认光标变为 `ns-resize`
3. 拖动分隔条，确认两个区域实时调整大小
4. 刷新页面，确认比例保持不变
5. 打开 DevTools → Application → Local Storage，确认 `tablechat_query_panel_ratio` key 存在

### 自动化测试

```bash
# 运行 E2E 测试
npm run test:e2e -- resizable-panel.spec.ts

# 或使用 UI 模式调试
npm run test:e2e:ui
```

## 关键 API 参考

### react-resizable

```typescript
import { Resizable, ResizeCallbackData } from 'react-resizable';

<Resizable
  height={height}
  width={Infinity}
  axis="y"
  minConstraints={[Infinity, minHeight]}
  maxConstraints={[Infinity, maxHeight]}
  onResize={(e, data) => setHeight(data.size.height)}
  onResizeStop={(e, data) => saveToStorage(data.size.height)}
  handle={<div className="resize-handle" />}
>
  <div style={{ height }}>Content</div>
</Resizable>
```

### localStorage 服务模式

```typescript
// 遵循项目现有模式
const wrapped = safeGetItem<CacheData<QueryPanelRatioCache>>(CACHE_KEYS.QUERY_PANEL_RATIO);
const cache = unwrapCache(wrapped);
return cache?.editorRatio ?? null;
```

## 常见问题

**Q: 为什么不用 CSS resize 属性？**  
A: CSS resize 仅支持单个元素的自由调整，无法实现两个面板联动且保持总高度不变。

**Q: 为什么拖拽结束才保存？**  
A: localStorage 是同步阻塞操作，拖拽过程中频繁写入会影响流畅性。

**Q: 如何测试 localStorage 不可用的情况？**  
A: 在 DevTools Console 执行 `Object.defineProperty(window, 'localStorage', { value: undefined })` 后刷新页面。

## 相关文档

- [spec.md](./spec.md) - 功能规范
- [research.md](./research.md) - 技术调研
- [data-model.md](./data-model.md) - 数据模型
- [react-resizable 文档](https://github.com/react-grid-layout/react-resizable)


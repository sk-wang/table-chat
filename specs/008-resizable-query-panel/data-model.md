# Data Model: 可调节的查询面板分隔器

**Feature**: 008-resizable-query-panel  
**Date**: 2025-12-29

## 概述

本功能是纯前端实现，不涉及后端 API 或数据库变更。数据模型仅涉及浏览器端 localStorage 缓存结构。

---

## Entities

### 1. QueryPanelRatioCache

**描述**: 存储用户调整的面板比例设置

| 属性 | 类型 | 约束 | 说明 |
|------|------|------|------|
| editorRatio | number | 0.1 ~ 0.9 | 编辑器区域占总高度的比例 |

**验证规则**:
- `editorRatio` 必须在 0.1 到 0.9 之间（确保两个区域都有最小可见空间）
- 无效值时回退到默认值 0.4

**状态转换**:
- **初始状态**: 无缓存 → 使用默认值 0.4
- **用户调整**: 拖拽释放 → 保存新比例到 localStorage
- **页面加载**: 从 localStorage 读取 → 应用缓存比例

---

### 2. CacheData\<QueryPanelRatioCache\>

**描述**: 遵循现有缓存包装格式

```typescript
interface CacheData<QueryPanelRatioCache> {
  data: QueryPanelRatioCache;
  timestamp: number;    // 保存时间戳
  version: string;      // 缓存版本号（当前为 '1'）
}
```

**验证规则**:
- `version` 必须与当前 `CACHE_VERSION` 匹配，否则数据无效
- 无效数据静默丢弃，使用默认值

---

## Storage Schema

### localStorage Key

```
tablechat_query_panel_ratio
```

### 存储示例

```json
{
  "data": {
    "editorRatio": 0.35
  },
  "timestamp": 1735488000000,
  "version": "1"
}
```

---

## TypeScript 类型定义

```typescript
// 添加到 frontend/src/types/storage.ts

/** 查询面板比例缓存 */
export interface QueryPanelRatioCache {
  editorRatio: number;
}

// 更新 CACHE_KEYS
export const CACHE_KEYS = {
  // ...existing keys
  QUERY_PANEL_RATIO: 'tablechat_query_panel_ratio',
} as const;

// 更新 CacheType 联合类型
export type CacheType =
  | SelectedDatabaseCache
  | TableListCache
  | TableDetailsCache
  | QueryPanelRatioCache;
```

---

## 组件 Props 类型

```typescript
// frontend/src/components/layout/ResizableSplitPane.tsx

export interface ResizableSplitPaneProps {
  /** 顶部面板内容 */
  topPanel: React.ReactNode;
  /** 底部面板内容 */
  bottomPanel: React.ReactNode;
  /** 默认编辑器比例，范围 0.1-0.9，默认 0.4 */
  defaultRatio?: number;
  /** 顶部面板最小高度（px），默认 100 */
  minTopHeight?: number;
  /** 底部面板最小高度（px），默认 100 */
  minBottomHeight?: number;
  /** localStorage 持久化 key，不传则不持久化 */
  storageKey?: string;
  /** 比例变化回调 */
  onRatioChange?: (ratio: number) => void;
}
```

---

## 关系图

```
┌─────────────────────────────────────────────────────────┐
│                     QueryPage                            │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │            ResizableSplitPane                    │   │
│  │                                                  │   │
│  │  ┌────────────────────────────────────────┐    │   │
│  │  │         Top Panel (Editor)              │    │   │
│  │  │         height = ratio * total          │    │   │
│  │  └────────────────────────────────────────┘    │   │
│  │  ┌────────────────────────────────────────┐    │   │
│  │  │    Resizable Divider (8px)              │    │   │
│  │  │    cursor: ns-resize                    │    │   │
│  │  └────────────────────────────────────────┘    │   │
│  │  ┌────────────────────────────────────────┐    │   │
│  │  │       Bottom Panel (Results)            │    │   │
│  │  │       height = (1-ratio) * total        │    │   │
│  │  └────────────────────────────────────────┘    │   │
│  │                                                  │   │
│  └──────────────────────┬───────────────────────────┘   │
│                         │                               │
└─────────────────────────┼───────────────────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │     localStorage       │
              │                       │
              │  tablechat_query_     │
              │  panel_ratio          │
              │  {                    │
              │    data: {            │
              │      editorRatio: 0.4 │
              │    },                 │
              │    timestamp: ...,    │
              │    version: "1"       │
              │  }                    │
              └───────────────────────┘
```

---

## 数据流

1. **初始化加载**:
   ```
   页面加载 → getQueryPanelRatio() → localStorage.getItem() → 解析 JSON → 验证版本 → 返回 ratio
   ```

2. **用户调整**:
   ```
   拖拽分隔条 → onResize callback → 更新组件 state → 重新渲染面板高度
   ```

3. **保存持久化**:
   ```
   拖拽结束 → onResizeStop callback → setQueryPanelRatio(ratio) → localStorage.setItem()
   ```

4. **错误处理**:
   ```
   localStorage 不可用 / JSON 解析失败 / 版本不匹配 → 返回 null → 使用默认值 0.4
   ```


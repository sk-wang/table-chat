# Data Model: Table Search Feature

**Feature**: 003-table-search | **Date**: 2025-12-28

## Overview

表搜索功能的数据模型定义，主要涉及前端状态管理和类型定义。

## Frontend State Models

### TableSearchState

```typescript
interface TableSearchState {
  query: string;           // 当前搜索词
  isActive: boolean;       // 搜索是否激活
}
```

### TableSearchResult

```typescript
interface TableSearchResult {
  filteredTables: TableMetadata[];  // 过滤后的表列表
  totalCount: number;               // 原始表总数
  resultCount: number;              // 过滤后结果数
  executionTimeMs: number;          // 过滤耗时（可选，用于性能监控）
}
```

### Extended Props for DatabaseSidebar

```typescript
interface DatabaseSidebarWithSearchProps {
  metadata: TableMetadata[] | null;
  metadataLoading: boolean;
  onTableSelect?: (schemaName: string, tableName: string) => void;
  onRefreshMetadata?: () => void;
  searchQuery?: string;           // 可选：从外部传入的搜索词
  onSearchChange?: (query: string) => void;  // 搜索变化回调
}
```

## Type Extensions

### metadata.ts Extensions

```typescript
// 新增搜索相关类型到 metadata.ts

export interface TableSearchState {
  query: string;
  isActive: boolean;
  filteredCount: number;
  totalCount: number;
}
```

## Validation Rules

| Field | Rule | Error Message |
|-------|------|---------------|
| query | 最大长度 255 字符 | "搜索词过长" |
| query | 禁止特殊正则字符 | N/A（使用转义处理） |

## State Transitions

```
Empty Query ──输入──> Active Search ──清空──> Empty Query
                 │
                 └── 结果变化 ──> 显示过滤后列表
```

## Persistence

搜索状态为临时状态，刷新页面后重置，不持久化存储。

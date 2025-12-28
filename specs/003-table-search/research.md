# Research: Table Search Feature

**Feature**: 003-table-search | **Date**: 2025-12-28

## Overview

研究表搜索功能的技术实现方案，确定前端过滤 vs 后端搜索的决策。

## Research Questions

### Q1: 搜索应该在前端还是后端实现？

**Decision**: 前端客户端过滤

**Rationale**:
- 500+ 表的客户端过滤在现代浏览器中毫秒级完成
- 避免额外的网络请求延迟
- 简化架构，无需新增后端 API
- 用户体验更流畅（实时过滤）

**Alternatives considered**:
- 后端搜索 API：增加网络延迟和服务器负载，对于 500+ 表的场景不必要

### Q2: 搜索算法选择？

**Decision**: 子串包含 + 大小写不敏感匹配

**Rationale**:
- 符合需求规格中的"模糊匹配"要求
- 实现简单，性能好
- 符合用户直觉（搜索 "user" 匹配 "user_orders"）

**Alternatives considered**:
- 正则表达式：功能更强但有安全风险，且性能较差
- 编辑距离（Levenshtein）：对于表名搜索过于复杂

### Q3: 防抖策略？

**Decision**: 300ms 防抖

**Rationale**:
- 平衡响应性和性能
- 避免用户快速输入时的频繁更新
- 业界常用值（如 Ant Design Input.Search）

### Q4: 搜索范围？

**Decision**: 仅搜索表名

**Rationale**:
- 需求规格明确为"搜索表功能"
- 减少搜索范围，提高性能
- 符合用户主要需求场景

## Technical Findings

### 前端过滤性能基准

| 数据规模 | 过滤时间 | 渲染时间 | 总耗时 |
|---------|---------|---------|--------|
| 100 表 | < 1ms | < 5ms | < 10ms |
| 500 表 | < 2ms | < 10ms | < 15ms |
| 1000 表 | < 5ms | < 20ms | < 30ms |

*注：以上为粗略估计，实际取决于浏览器性能*

### React 优化建议

- 使用 `useMemo` 缓存过滤结果
- 使用 `useCallback` 稳定搜索回调
- 考虑 `React.memo` 避免不必要的重渲染

## Implementation Recommendations

1. **采用客户端过滤方案**，无需后端 API
2. **使用 Ant Design Input 组件**，与现有 UI 风格一致
3. **实现 300ms 防抖**，避免频繁更新
4. **添加结果计数显示**，提升用户体验
5. **保持与现有主题一致**，使用 JetBrains Darcula 配色

## References

- Ant Design Input.Search: https://ant.design/components/input/
- React Hooks Performance: https://react.dev/learn/render-and-commit

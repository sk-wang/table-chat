# Research: 浏览器本地缓存

**Feature**: 007-localstorage-cache  
**Date**: 2025-01-29

## 研究项目

### 1. localStorage 最佳实践

**Decision**: 使用原生 localStorage API，封装为独立服务

**Rationale**:
- localStorage 是浏览器原生 API，无需额外依赖
- 同步 API，简单易用
- 持久化存储，关闭浏览器后数据仍存在
- 容量足够（5-10MB）满足表元数据缓存需求

**Alternatives considered**:
- **sessionStorage**: 关闭标签页后数据丢失，不适合"记住上次选择"的需求
- **IndexedDB**: 功能更强大但 API 复杂，异步操作增加代码复杂度，对于简单缓存场景过度设计
- **第三方库 (localForage)**: 提供 IndexedDB 封装，但引入额外依赖，对简单场景不必要

### 2. 缓存数据结构设计

**Decision**: 使用带版本号的扁平化键值结构

**Rationale**:
- 版本号用于处理数据格式变更时的兼容性
- 扁平化键便于单独读写和清除
- 按数据库分离缓存，便于管理

**Key 设计**:
```
tableChat:version         -> "1"
tableChat:selectedDb      -> "mydb"
tableChat:tables:{dbName} -> {tables: [...], cachedAt: "..."}
tableChat:details:{dbName}:{schema}.{table} -> {columns: [...], cachedAt: "..."}
```

### 3. 优雅降级策略

**Decision**: try-catch 包装所有 localStorage 操作

**Rationale**:
- 隐私模式下 localStorage 可能不可用
- 存储满时 setItem 会抛出 QuotaExceededError
- 不应因缓存问题影响核心功能

**实现方式**:
```typescript
function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}
```

### 4. 缓存失效策略

**Decision**: 仅通过强制刷新手动失效，不设置自动过期

**Rationale**:
- 数据库元数据变更不频繁
- 用户可通过刷新按钮主动更新
- 简化实现，避免复杂的过期检查逻辑

**Alternatives considered**:
- **TTL 过期**: 增加复杂度，需要在每次读取时检查时间戳
- **版本号比对**: 需要额外 API 支持，增加服务端复杂度

### 5. 存储空间管理

**Decision**: 不主动清理，仅在存储满时报错提示

**Rationale**:
- 表元数据数据量通常较小（每个数据库 < 100KB）
- 正常使用不会达到 localStorage 限制
- 用户可通过浏览器清除数据解决

**备选方案**（暂不实现）:
- 实现 LRU 清理策略
- 只保留最近 N 个数据库的缓存

## 技术决策汇总

| 决策点 | 选择 | 理由 |
|-------|-----|------|
| 存储 API | localStorage | 原生、同步、持久化 |
| 数据结构 | 带版本号的扁平键值 | 简单、可扩展 |
| 降级策略 | try-catch 封装 | 不影响核心功能 |
| 缓存失效 | 手动刷新 | 简化实现 |
| 空间管理 | 不主动清理 | 数据量小，不需要 |


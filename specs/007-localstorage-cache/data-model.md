# Data Model: 浏览器本地缓存

**Feature**: 007-localstorage-cache  
**Date**: 2025-01-29

## 缓存数据结构

### 1. CacheVersion

缓存版本标识，用于数据格式兼容性检查。

```typescript
interface CacheVersion {
  version: number;  // 当前版本: 1
}
```

**localStorage Key**: `tableChat:version`

### 2. SelectedDatabase

用户上次选中的数据库连接。

```typescript
interface SelectedDatabase {
  name: string;       // 数据库连接名称
  selectedAt: string; // ISO 时间戳
}
```

**localStorage Key**: `tableChat:selectedDb`

### 3. TableListCache

表列表缓存，每个数据库一个条目。

```typescript
interface TableSummaryCache {
  schemaName: string;
  tableName: string;
  tableType: 'table' | 'view';
  comment?: string;
}

interface TableListCache {
  dbName: string;
  tables: TableSummaryCache[];
  cachedAt: string;  // ISO 时间戳
}
```

**localStorage Key**: `tableChat:tables:{dbName}`

### 4. TableDetailsCache

表字段详情缓存，每个表一个条目。

```typescript
interface ColumnInfoCache {
  name: string;
  dataType: string;
  isNullable: boolean;
  isPrimaryKey: boolean;
  defaultValue?: string;
  comment?: string;
}

interface TableDetailsCache {
  schemaName: string;
  tableName: string;
  tableType: 'table' | 'view';
  columns: ColumnInfoCache[];
  comment?: string;
  cachedAt: string;  // ISO 时间戳
}
```

**localStorage Key**: `tableChat:details:{dbName}:{schemaName}.{tableName}`

## localStorage 键结构

| 键模式 | 描述 | 示例 |
|-------|------|-----|
| `tableChat:version` | 缓存版本号 | `1` |
| `tableChat:selectedDb` | 上次选中的数据库 | `{"name":"mydb","selectedAt":"..."}` |
| `tableChat:tables:{dbName}` | 表列表缓存 | `tableChat:tables:mydb` |
| `tableChat:details:{dbName}:{schema}.{table}` | 表详情缓存 | `tableChat:details:mydb:public.users` |

## 服务接口

### StorageService

```typescript
interface StorageService {
  // 版本管理
  getVersion(): number | null;
  setVersion(version: number): void;
  
  // 选中的数据库
  getSelectedDatabase(): string | null;
  setSelectedDatabase(name: string): void;
  clearSelectedDatabase(): void;
  
  // 表列表缓存
  getTableListCache(dbName: string): TableSummaryCache[] | null;
  setTableListCache(dbName: string, tables: TableSummaryCache[]): void;
  clearTableListCache(dbName: string): void;
  
  // 表详情缓存
  getTableDetailsCache(dbName: string, schema: string, table: string): TableDetailsCache | null;
  setTableDetailsCache(dbName: string, schema: string, table: string, details: TableDetailsCache): void;
  clearTableDetailsCache(dbName: string): void;
  
  // 批量操作
  clearAllCache(): void;
  clearDatabaseCache(dbName: string): void;
}
```

## 状态转换

### 缓存生命周期

```
[Empty] --用户选择数据库--> [有selectedDb]
[Empty] --加载表列表--> [有tables缓存]
[有tables缓存] --展开表--> [有details缓存]
[任意状态] --强制刷新--> [更新缓存]
[任意状态] --清除浏览器数据--> [Empty]
[任意状态] --版本不兼容--> [Empty] (自动清除)
```

## 版本兼容性

当检测到缓存版本与当前版本不匹配时：
1. 清除所有缓存数据
2. 设置新版本号
3. 从服务器重新获取数据

**当前版本**: 1


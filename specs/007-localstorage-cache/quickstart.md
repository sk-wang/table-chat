# Quickstart: 浏览器本地缓存

**Feature**: 007-localstorage-cache  
**Date**: 2025-01-29

## 快速开始

### 前置条件

- Node.js 18+
- pnpm 或 npm

### 本地开发

```bash
# 进入前端目录
cd frontend

# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev
```

### 文件结构

本功能涉及以下文件：

```
frontend/src/
├── services/
│   └── storage.ts          # 新增：缓存服务
├── types/
│   └── storage.ts          # 新增：缓存类型定义
├── contexts/
│   └── DatabaseContext.tsx # 修改：集成缓存
└── pages/query/
    └── index.tsx           # 修改：使用缓存
```

## 核心实现

### 1. 创建缓存服务 (`storage.ts`)

```typescript
// frontend/src/services/storage.ts

const CACHE_VERSION = 1;
const PREFIX = 'tableChat';

// 安全的 localStorage 操作
function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

// 导出的缓存服务
export const storageService = {
  // 选中的数据库
  getSelectedDatabase(): string | null {
    const data = safeGet(`${PREFIX}:selectedDb`);
    if (!data) return null;
    try {
      return JSON.parse(data).name;
    } catch {
      return null;
    }
  },
  
  setSelectedDatabase(name: string): void {
    safeSet(`${PREFIX}:selectedDb`, JSON.stringify({
      name,
      selectedAt: new Date().toISOString()
    }));
  },
  
  // ... 其他方法
};
```

### 2. 修改 DatabaseContext

```typescript
// 在 DatabaseContext 初始化时恢复选中的数据库
useEffect(() => {
  const savedDb = storageService.getSelectedDatabase();
  if (savedDb && databases.some(db => db.name === savedDb)) {
    setSelectedDatabase(savedDb);
  }
}, [databases]);

// 在选择数据库时保存
const handleSelectDatabase = (name: string) => {
  setSelectedDatabase(name);
  storageService.setSelectedDatabase(name);
};
```

### 3. 修改 QueryPage 使用缓存

```typescript
// 加载表列表时优先使用缓存
const loadTableList = async (forceRefresh = false) => {
  if (!forceRefresh) {
    const cached = storageService.getTableListCache(selectedDatabase);
    if (cached) {
      setTableSummaries(cached);
      return;
    }
  }
  
  // 从服务器获取
  const response = await apiClient.getTableList(selectedDatabase, forceRefresh);
  setTableSummaries(response.tables);
  
  // 更新缓存
  storageService.setTableListCache(selectedDatabase, response.tables);
};
```

## 测试验证

### 手动测试

1. **测试数据库记忆**:
   - 选择一个数据库
   - 刷新页面
   - 验证该数据库自动被选中

2. **测试表列表缓存**:
   - 选择数据库 A，等待表列表加载
   - 切换到数据库 B
   - 切换回数据库 A
   - 验证表列表立即显示（无加载提示）

3. **测试强制刷新**:
   - 点击刷新按钮
   - 验证显示加载提示
   - 验证数据从服务器更新

### 查看 localStorage

在浏览器开发者工具 > Application > Local Storage 中可以查看缓存数据：

- `tableChat:version` - 缓存版本
- `tableChat:selectedDb` - 选中的数据库
- `tableChat:tables:*` - 表列表缓存

## 常见问题

### Q: 缓存数据何时失效？

A: 缓存仅在以下情况失效：
- 用户点击强制刷新按钮
- 用户清除浏览器数据
- 缓存版本号变更（代码升级时）

### Q: localStorage 不可用怎么办？

A: 缓存服务会优雅降级，所有功能正常工作，只是每次都从服务器获取数据。

### Q: 如何清除缓存？

A: 
- 浏览器开发者工具 > Application > Local Storage > 清除
- 或调用 `storageService.clearAllCache()`


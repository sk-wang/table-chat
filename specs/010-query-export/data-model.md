# Data Model: 查询结果导出

**Feature**: 010-query-export  
**Date**: 2025-12-29  
**Phase**: 1 - Design

## 1. 类型定义

### 1.1 前端类型 (src/types/export.ts)

```typescript
/**
 * 支持的导出格式
 */
export type ExportFormat = 'csv' | 'json' | 'xlsx';

/**
 * 导出配置
 */
export interface ExportConfig {
  /** 数据库名称，用于生成文件名 */
  dbName: string;
  /** 导出格式 */
  format: ExportFormat;
  /** 列名数组 */
  columns: string[];
  /** 数据行数组 */
  rows: Record<string, unknown>[];
}

/**
 * 导出结果
 */
export interface ExportResult {
  /** 是否成功 */
  success: boolean;
  /** 导出的文件名（成功时） */
  filename?: string;
  /** 错误信息（失败时） */
  error?: string;
}

/**
 * 导出菜单项
 */
export interface ExportMenuItem {
  key: ExportFormat;
  label: string;
  icon: React.ReactNode;
}
```

### 1.2 后端类型扩展 (自然语言导出)

```python
# backend/app/models/query.py

class NaturalLanguageResponse(BaseModel):
    """自然语言查询响应"""
    generated_sql: str
    explanation: str | None = None
    # 新增：导出格式（当识别到导出意图时）
    export_format: Literal['csv', 'json', 'xlsx'] | None = None
```

## 2. 数据格式规范

### 2.1 CSV 格式规范

遵循 RFC 4180 标准：

```
规则：
1. 首行为列名，用逗号分隔
2. 值包含逗号、引号或换行时，用双引号包裹
3. 值中的双引号用两个双引号转义
4. 使用 CRLF (\r\n) 作为行分隔符
5. 文件开头添加 UTF-8 BOM (\uFEFF) 以支持 Excel 中文

示例：
\uFEFFname,email,description
张三,zhang@example.com,"包含逗号,的描述"
李四,li@example.com,"包含""引号""的描述"
王五,wang@example.com,"多行
描述"
```

### 2.2 JSON 格式规范

```json
[
  {
    "name": "张三",
    "email": "zhang@example.com",
    "age": 30,
    "active": true,
    "created_at": "2025-01-01T00:00:00.000Z",
    "extra": null
  },
  {
    "name": "李四",
    "email": "li@example.com",
    "age": 25,
    "active": false,
    "created_at": "2025-01-02T00:00:00.000Z",
    "extra": null
  }
]
```

规则：
- 使用 2 空格缩进
- NULL 值保持为 JSON null
- 日期转换为 ISO8601 字符串
- 布尔值保持原样

### 2.3 XLSX 格式规范

```
规则：
1. 第一行为表头（列名）
2. 列宽自动适应内容
3. 单元格类型自动识别（数字、日期、字符串）
4. NULL 值显示为空单元格
5. 工作表名称：Sheet1
```

## 3. 文件命名规范

### 3.1 命名模式

```
{数据库名}_{时间戳}.{扩展名}

模式：{dbName}_{yyyyMMdd_HHmmss}.{ext}
```

### 3.2 示例

```
mydb_20251229_153000.csv
mydb_20251229_153000.json
mydb_20251229_153000.xlsx
```

### 3.3 特殊字符处理

数据库名中的以下字符替换为下划线 `_`：

```
/ \ : * ? " < > | 空格
```

示例：
```
输入: "my/db:test"
输出: "my_db_test_20251229_153000.csv"
```

## 4. 数据类型转换

### 4.1 转换规则

| 原始类型 | CSV | JSON | XLSX |
|----------|-----|------|------|
| string | 原样 | 原样 | 原样 |
| number | 原样 | 原样 | 数字单元格 |
| boolean | "true"/"false" | true/false | TRUE/FALSE |
| null | "" (空) | null | 空单元格 |
| undefined | "" (空) | null | 空单元格 |
| Date | ISO8601 | ISO8601 | 日期单元格 |
| Object | JSON.stringify | 原样 | JSON.stringify |
| Array | JSON.stringify | 原样 | JSON.stringify |
| Buffer/Binary | "[binary]" | "[binary]" | "[binary]" |

### 4.2 特殊值处理

```typescript
function formatValue(value: unknown, format: ExportFormat): string | unknown {
  if (value === null || value === undefined) {
    return format === 'json' ? null : '';
  }
  
  if (value instanceof Date) {
    return value.toISOString();
  }
  
  if (Buffer.isBuffer(value) || value instanceof ArrayBuffer) {
    return '[binary]';
  }
  
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  
  return value;
}
```

## 5. 性能考量

### 5.1 内存估算

| 数据量 | CSV 大小 | JSON 大小 | XLSX 大小 |
|--------|----------|-----------|-----------|
| 100 行 × 10 列 | ~50 KB | ~80 KB | ~20 KB |
| 1000 行 × 10 列 | ~500 KB | ~800 KB | ~150 KB |
| 10000 行 × 10 列 | ~5 MB | ~8 MB | ~1.5 MB |

### 5.2 处理策略

- **< 1000 行**: 同步处理，直接生成
- **1000-5000 行**: 显示 loading 状态
- **> 5000 行**: 分块处理，使用 requestIdleCallback

```typescript
async function processLargeDataset(
  rows: Record<string, unknown>[],
  chunkSize: number = 1000
): Promise<void> {
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    // 处理块
    await new Promise(resolve => requestIdleCallback(resolve));
  }
}
```

## 6. 错误处理

### 6.1 可能的错误

| 错误类型 | 原因 | 处理方式 |
|----------|------|----------|
| 无数据 | 查询结果为空 | 禁用导出按钮 |
| 内存不足 | 数据量过大 | 提示用户限制数据量 |
| 下载失败 | 浏览器阻止下载 | 提示用户检查浏览器设置 |
| XLSX 加载失败 | 网络问题 | 提示用户重试 |

### 6.2 错误信息

```typescript
const ERROR_MESSAGES = {
  NO_DATA: '没有可导出的数据',
  EXPORT_FAILED: '导出失败，请重试',
  XLSX_LOAD_FAILED: 'Excel 导出组件加载失败，请检查网络',
  DOWNLOAD_BLOCKED: '下载被浏览器阻止，请检查浏览器设置',
};
```


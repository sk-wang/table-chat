# Quickstart: SQL 编辑器格式化功能

**Feature**: 015-sql-formatter  
**Date**: 2025-12-31

## 功能概述

为 SQL 编辑器添加格式化功能 + 优化 LIMIT 自动添加逻辑。

## 快速实现指南

### 1. 后端：修改 inject_limit 保持格式

**文件**: `backend/app/services/query_service.py`

```python
def inject_limit(self, sql: str, parsed: exp.Expression, dialect: str = "postgres") -> tuple[str, bool]:
    """Add LIMIT 1000 if no LIMIT clause exists, preserving original format."""
    if parsed.args.get("limit"):
        return sql, False
    
    # 检测是否为多行 SQL
    stripped_sql = sql.rstrip()
    is_multiline = '\n' in stripped_sql
    
    if is_multiline:
        # 多行格式：新行 + LIMIT
        modified_sql = stripped_sql + '\nLIMIT 1000'
    else:
        # 单行格式：空格 + LIMIT
        modified_sql = stripped_sql + ' LIMIT 1000'
    
    return modified_sql, True
```

### 2. 后端：新增格式化 API

**文件**: `backend/app/api/v1/query.py`

```python
from app.models.query import FormatRequest, FormatResponse

@router.post("/format", response_model=FormatResponse)
async def format_sql(request: FormatRequest) -> FormatResponse:
    """Format SQL query for better readability."""
    try:
        formatted = query_service.format_sql(request.sql, request.dialect or "postgres")
        return FormatResponse(formatted=formatted)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
```

**文件**: `backend/app/models/query.py` - 新增模型

```python
class FormatRequest(CamelModel):
    sql: str
    dialect: str | None = None

class FormatResponse(CamelModel):
    formatted: str
```

**文件**: `backend/app/services/query_service.py` - 新增方法

```python
def format_sql(self, sql: str, dialect: str = "postgres") -> str:
    """Format SQL query for better readability."""
    try:
        formatted = sqlglot.transpile(sql, read=dialect, write=dialect, pretty=True)[0]
        return formatted
    except Exception as e:
        raise ValueError(f"Failed to format SQL: {e}")
```

### 3. 前端：添加格式化按钮

**文件**: `frontend/src/components/editor/QueryToolbar.tsx`

```tsx
<Button
  icon={<FormatPainterOutlined />}
  onClick={onFormat}
  disabled={!sql || loading}
>
  Format
</Button>
```

### 4. 前端：添加快捷键

**文件**: `frontend/src/components/editor/SqlEditor.tsx`

```tsx
// 在 handleEditorDidMount 中添加
editorInstance.addCommand(
  monacoInstance.KeyMod.Shift | monacoInstance.KeyMod.Alt | monacoInstance.KeyCode.KeyF,
  () => {
    onFormat?.();
  }
);
```

### 5. 前端：API 调用

**文件**: `frontend/src/services/api.ts`

```typescript
async formatSql(sql: string, dialect?: string): Promise<string> {
  const response = await this.request<{ formatted: string }>('/format', {
    method: 'POST',
    body: JSON.stringify({ sql, dialect }),
  });
  return response.formatted;
}
```

## 测试要点

### 手动测试

1. 输入混乱格式 SQL，点击 Format 按钮
2. 使用 Shift+Alt+F 快捷键格式化
3. 提交多行 SQL（无 LIMIT），验证 LIMIT 保持格式
4. 提交单行 SQL（无 LIMIT），验证 LIMIT 追加在末尾

### E2E 测试场景

1. 格式化按钮点击后 SQL 格式改变
2. 快捷键格式化正常工作
3. 语法错误 SQL 格式化显示错误提示
4. 多行 SQL 自动添加 LIMIT 保持格式

## 完成标准

- [x] Format 按钮显示在工具栏
- [x] Shift+Alt+F 快捷键可用
- [x] 格式化后关键字大写、子句独立行
- [x] 多行 SQL 添加 LIMIT 后保持多行格式
- [x] 单行 SQL 添加 LIMIT 后保持单行格式
- [x] 后端单元测试通过
- [x] E2E 测试通过

---

## 实施完成

**完成日期**: 2025-12-31  
**实施状态**: ✅ 已完成

### 实施总结

1. **后端改动**:
   - ✅ 新增 `FormatRequest` 和 `FormatResponse` 模型
   - ✅ 新增 `format_sql` 方法使用 `sqlglot` 格式化
   - ✅ 新增 `/api/v1/dbs/format` 端点
   - ✅ 修改 `inject_limit` 方法保持原 SQL 格式（单行/多行）

2. **前端改动**:
   - ✅ `QueryToolbar` 添加 Format 按钮（带 loading 状态）
   - ✅ `SqlEditor` 添加 Shift+Alt+F 快捷键
   - ✅ `QueryPage` 集成格式化功能（调用 API + 错误处理）
   - ✅ `api.ts` 新增 `formatSql` 方法

3. **测试覆盖**:
   - ✅ 后端单元测试（简单/复杂 SQL、错误处理、幂等性）
   - ✅ LIMIT 保持格式单元测试（单行/多行/尾部空白）
   - ✅ E2E 测试（按钮/快捷键/错误提示/LIMIT 格式）

### 验证方式

```bash
# 后端测试
cd backend && pytest tests/test_services/test_query_service.py::TestFormatSql -v

# 前端 E2E 测试
cd frontend && npx playwright test sql-formatter
```


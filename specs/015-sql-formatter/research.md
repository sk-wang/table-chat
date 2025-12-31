# Research: SQL 编辑器格式化功能

**Feature**: 015-sql-formatter  
**Date**: 2025-12-31

## 研究概述

本功能涉及 SQL 格式化和 LIMIT 自动添加优化。项目已使用 `sqlglot` 进行 SQL 解析，可以复用。

## 技术决策

### 1. SQL 格式化实现方式

**Decision**: 使用后端 `sqlglot` 进行格式化

**Rationale**:
- 项目已依赖 `sqlglot`，无需新增依赖
- `sqlglot` 支持 `pretty=True` 参数进行格式化
- 支持多种 SQL 方言（MySQL, PostgreSQL）
- 后端处理确保一致性

**Alternatives Considered**:
1. ~~前端 sql-formatter 库~~ - 需新增依赖，且需处理方言差异
2. ~~Monaco Editor 内置格式化~~ - 不支持 SQL 方言，格式化效果一般

### 2. 格式化 API 设计

**Decision**: 新增 `POST /api/v1/format` 端点

**Rationale**:
- 独立端点，职责单一
- 支持不同方言参数
- 可缓存格式化结果（幂等操作）

**API Contract**:
```
POST /api/v1/format
Request: { sql: string, dialect?: "mysql" | "postgres" }
Response: { formatted: string } | { error: string }
```

### 3. LIMIT 保持格式的实现

**Decision**: 使用字符串拼接而非 AST 重新生成

**Rationale**:
- 当前 `inject_limit` 使用 `parsed.limit(1000).sql(dialect=dialect)` 重新生成 SQL
- 这会丢失原有格式（空白、换行、注释位置）
- 改为检测原 SQL 格式风格，直接字符串拼接 LIMIT 子句

**实现逻辑**:
```python
def inject_limit_preserve_format(sql: str, parsed: Expression, dialect: str) -> str:
    if parsed.args.get("limit"):
        return sql  # 已有 LIMIT，返回原样
    
    # 检测是否为多行 SQL
    is_multiline = '\n' in sql.strip()
    
    if is_multiline:
        # 多行格式：新行 + LIMIT
        return sql.rstrip() + '\nLIMIT 1000'
    else:
        # 单行格式：空格 + LIMIT
        return sql.rstrip() + ' LIMIT 1000'
```

**Alternatives Considered**:
1. ~~AST 重新生成后格式化~~ - 格式化风格可能与原 SQL 不一致
2. ~~保留原 SQL 完整格式~~ - 需要复杂的 AST 位置追踪

### 4. 前端格式化快捷键

**Decision**: Shift+Alt+F（与 VS Code 一致）

**Rationale**:
- 用户熟悉的快捷键
- 不与现有 Ctrl+Enter（执行）冲突
- Monaco Editor 支持自定义快捷键

### 5. 格式化选项（P3 延后）

**Decision**: MVP 不实现自定义选项，使用默认配置

**默认配置**:
- 关键字大写
- 4 空格缩进
- 主要子句独立行
- 保留注释

## sqlglot 格式化能力验证

```python
import sqlglot

sql = "select id,name from users where age>18 order by name"
formatted = sqlglot.transpile(sql, pretty=True)[0]
print(formatted)
# 输出:
# SELECT
#   id,
#   name
# FROM users
# WHERE
#   age > 18
# ORDER BY
#   name
```

**结论**: `sqlglot` 的 `pretty=True` 参数提供良好的格式化效果，可直接使用。

## 现有代码分析

### 当前 inject_limit 实现

```python
# backend/app/services/query_service.py
def inject_limit(self, sql: str, parsed: exp.Expression, dialect: str = "postgres") -> tuple[str, bool]:
    if parsed.args.get("limit"):
        return sql, False
    parsed_with_limit = parsed.limit(1000)
    modified_sql = parsed_with_limit.sql(dialect=dialect)  # 这里丢失原格式
    return modified_sql, True
```

**问题**: `parsed_with_limit.sql(dialect=dialect)` 重新生成 SQL，丢失原有格式。

**修复**: 改为字符串拼接，保持原格式。

## 无需进一步研究

技术方案明确，无 NEEDS CLARIFICATION 项。


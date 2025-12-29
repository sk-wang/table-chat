# Internal API Contracts: 元数据提示链

**Feature**: 006-metadata-prompt-chain  
**Date**: 2025-12-29

## 概述

本功能不引入新的 REST API 端点。现有 `/api/v1/dbs/{name}/query/natural` 端点保持不变，内部实现改为提示链方式。

本文档定义内部方法的接口契约。

## LLMService 内部方法

### 1. select_relevant_tables

**Purpose**: 第一阶段 - 从表列表中选择与用户查询相关的表

```python
async def select_relevant_tables(
    self,
    db_name: str,
    prompt: str,
    db_type: str = "postgresql",
) -> tuple[list[str], bool]:
    """
    Select relevant tables for a natural language query.
    
    Args:
        db_name: Database connection name
        prompt: User's natural language query
        db_type: Database type ('postgresql' or 'mysql')
    
    Returns:
        Tuple of:
        - selected_tables: List of table names (schema.table format)
        - fallback_used: True if fallback to all tables was used
    
    Raises:
        ValueError: If LLM is not configured
    """
```

**LLM Prompt Template (第一阶段)**:

```text
System Prompt:
You are a database schema analyst. Given a list of tables and a user query,
identify which tables are most likely needed to answer the query.

Rules:
1. Return ONLY a JSON array of table names, no other text
2. Include tables that might be needed for JOINs or relationships
3. If unsure about a table, include it (prefer false positives)
4. Return empty array [] only if truly no table matches the query
5. Consider table names AND comments when making decisions

User Prompt:
Available Tables:
{table_summary_list}

User Query: {prompt}

Return a JSON array of relevant table names. Example: ["orders", "customers"]
```

**Response Format**:

```json
["public.orders", "public.order_items", "public.customers"]
```

---

### 2. build_table_summary_context

**Purpose**: 构建表概要信息（不含字段详情）用于第一阶段

```python
async def build_table_summary_context(self, db_name: str) -> tuple[str, int]:
    """
    Build table summary context for LLM table selection.
    
    Args:
        db_name: Database connection name
    
    Returns:
        Tuple of:
        - summary_context: Formatted string of table summaries
        - table_count: Total number of tables
    
    Example output format:
        Table: public.orders (table) - 订单主表
        Table: public.order_items (table) - 订单明细
        Table: public.customers (table) - 客户信息表
    """
```

**Output Format**:

```text
Table: {schema}.{table_name} ({table_type}) - {comment or "No description"}
Table: {schema}.{table_name} ({table_type}) - {comment or "No description"}
...
```

---

### 3. build_schema_context (修改)

**Purpose**: 构建 schema 上下文，支持过滤指定表

```python
async def build_schema_context(
    self,
    db_name: str,
    table_names: list[str] | None = None,
) -> str:
    """
    Build schema context for LLM from database metadata.
    
    Args:
        db_name: Database connection name
        table_names: Optional list of table names to include.
                    If None, include all tables (backward compatible).
    
    Returns:
        Schema context string for LLM prompt
    """
```

**Behavior**:
- `table_names=None`: 原有行为，返回全部表的 schema（向后兼容）
- `table_names=["orders", "customers"]`: 只返回指定表的 schema

---

### 4. generate_sql (修改)

**Purpose**: 整合两阶段提示链，生成 SQL

```python
async def generate_sql(
    self,
    db_name: str,
    prompt: str,
    db_type: str = "postgresql",
) -> tuple[str, str | None]:
    """
    Generate SQL from natural language prompt using prompt chain.
    
    Implementation:
    1. Get table summary and count
    2. If table_count <= TABLE_SELECTION_THRESHOLD:
       - Skip phase 1, use all tables
    3. Else:
       - Phase 1: Call select_relevant_tables()
       - If no tables selected, fallback to all tables
    4. Phase 2: Call LLM with selected tables' schema
    5. Return generated SQL and explanation
    
    Args:
        db_name: Database name for schema context
        prompt: Natural language description of the query
        db_type: Database type ('postgresql' or 'mysql')
    
    Returns:
        Tuple of (generated_sql, explanation)
    
    Raises:
        ValueError: If LLM is not configured or generation fails
    """
```

## 配置常量

```python
# 表选择阈值
TABLE_SELECTION_THRESHOLD: int = 3

# 第一阶段最大选择表数
MAX_SELECTED_TABLES: int = 10

# 第一阶段 LLM 配置
PHASE1_MAX_TOKENS: int = 256
PHASE1_TEMPERATURE: float = 0.1
```

## 错误处理

| 场景 | 处理方式 |
|------|----------|
| 第一阶段 LLM 调用失败 | Fallback 到全部表 |
| 第一阶段返回非 JSON | Fallback 到全部表 |
| 第一阶段返回空数组 | Fallback 到全部表 |
| 选中的表不存在于数据库 | 过滤掉不存在的表，继续执行 |
| 所有选中表都不存在 | Fallback 到全部表 |


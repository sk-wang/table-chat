# Data Model: 元数据提示链（Metadata Prompt Chain）

**Feature**: 006-metadata-prompt-chain  
**Date**: 2025-12-29

## 概述

本功能不引入新的持久化数据模型，主要涉及内部数据结构用于 LLM 提示链处理。

## 内部数据结构

### 1. TableSummary（表概要）

用于第一阶段表选择，只包含表的基本信息，不含字段详情。

```python
class TableSummary(BaseModel):
    """表概要信息，用于第一阶段表选择。"""
    
    schema_name: str = Field(..., description="Schema 名称")
    table_name: str = Field(..., description="表名")
    table_type: str = Field(..., description="表类型 (table/view)")
    comment: str | None = Field(None, description="表注释")
```

**用途**: 构建第一阶段 LLM 提示的表列表。

### 2. TableSelectionResult（表选择结果）

第一阶段 LLM 返回的结果。

```python
class TableSelectionResult(BaseModel):
    """第一阶段表选择结果。"""
    
    selected_tables: list[str] = Field(..., description="选中的表名列表")
    fallback_used: bool = Field(False, description="是否使用了 fallback 策略")
```

**用途**: 封装第一阶段结果，传递给第二阶段。

### 3. PromptChainContext（提示链上下文）

可选的调试/日志结构，记录整个提示链的执行过程。

```python
class PromptChainContext(BaseModel):
    """提示链执行上下文（用于调试/日志）。"""
    
    total_tables: int = Field(..., description="数据库总表数")
    selected_tables: list[str] = Field(..., description="选中的表")
    phase1_skipped: bool = Field(False, description="是否跳过了第一阶段")
    fallback_used: bool = Field(False, description="是否使用了 fallback")
    phase1_tokens: int | None = Field(None, description="第一阶段 token 消耗")
    phase2_tokens: int | None = Field(None, description="第二阶段 token 消耗")
```

**用途**: 可选功能，用于监控和调试提示链效果。

## 现有模型复用

### 从 metadata 缓存获取的数据结构

现有 `db_manager.get_metadata_for_database(db_name)` 返回的数据结构：

```python
# 每个表的元数据 (dict)
{
    "schema_name": "public",
    "table_name": "orders",
    "table_type": "table",
    "table_comment": "订单表",
    "columns": [
        {
            "name": "id",
            "dataType": "integer",
            "isNullable": False,
            "isPrimaryKey": True,
            "comment": "主键"
        },
        # ... more columns
    ]
}
```

**复用方式**:
- 第一阶段：只使用 `schema_name`, `table_name`, `table_type`, `table_comment`
- 第二阶段：使用完整结构（包含 `columns`）

## 数据流

```
┌─────────────────────────────────────────────────────────────────┐
│                        用户自然语言查询                           │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    获取数据库元数据缓存                           │
│              db_manager.get_metadata_for_database()              │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │   表数量 > 3 ?        │
                    └───────────────────────┘
                         │           │
                        YES         NO
                         │           │
                         ▼           │
┌────────────────────────────────┐   │
│     第一阶段：表选择           │   │
│  - 构建 TableSummary 列表     │   │
│  - 调用 LLM 选择相关表        │   │
│  - 解析返回的表名数组         │   │
└────────────────────────────────┘   │
                    │                │
                    ▼                │
         ┌──────────────────┐        │
         │ 选中表数量 > 0 ? │        │
         └──────────────────┘        │
              │        │             │
             YES      NO             │
              │        │             │
              │        ▼             │
              │   ┌──────────┐       │
              │   │ Fallback │       │
              │   │ 使用全表 │       │
              │   └──────────┘       │
              │        │             │
              ▼        ▼             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    第二阶段：SQL 生成                            │
│  - 获取选中表的完整 schema（含字段）                              │
│  - 调用 LLM 生成 SQL                                            │
│  - 返回 sql + explanation                                       │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      NaturalQueryResponse                        │
│                  { generated_sql, explanation }                  │
└─────────────────────────────────────────────────────────────────┘
```

## 配置参数

```python
# 可添加到 app/config.py

# 表选择阈值：表数量超过此值才启用第一阶段
TABLE_SELECTION_THRESHOLD: int = 3

# 第一阶段最大返回表数（防止选择过多表）
MAX_SELECTED_TABLES: int = 10
```


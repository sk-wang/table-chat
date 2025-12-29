# Research: 元数据提示链（Metadata Prompt Chain）

**Feature**: 006-metadata-prompt-chain  
**Date**: 2025-12-29

## 研究问题

### 1. LLM 提示链最佳实践

**Decision**: 采用两阶段串行调用，第一阶段用于表选择，第二阶段用于 SQL 生成。

**Rationale**:
- 串行调用确保第二阶段能使用第一阶段的结果
- 两阶段是最小必要拆分，不过度复杂化
- 每个阶段有明确的职责和输出格式

**Alternatives Considered**:
- **单阶段 + 表名提取**：让 LLM 在生成 SQL 时自行选择表。问题：仍需传递全部 schema，无法减少 token。
- **三阶段（表选择 → 关系推断 → SQL 生成）**：过度复杂，增加延迟，收益不明显。
- **并行调用 + 合并**：不适用于本场景，第二阶段依赖第一阶段结果。

### 2. 表选择提示词设计

**Decision**: 第一阶段只提供表名、类型和注释，要求 LLM 返回 JSON 格式的相关表名数组。

**Rationale**:
- 表名和注释足够 LLM 理解表的用途
- JSON 数组格式易于解析，降低出错率
- 不传递字段信息大幅减少 token 消耗

**Prompt 设计**:

```text
System: You are a database schema analyst. Given a list of tables and a user query, 
identify which tables are relevant for answering the query.

Rules:
1. Return ONLY a JSON array of table names
2. Include tables that might be needed for JOINs
3. If unsure, include the table (prefer false positives over false negatives)
4. Return empty array [] only if truly no table matches

Example output: ["orders", "order_items", "customers"]
```

**Alternatives Considered**:
- **返回 schema.table 格式**：增加复杂度，当前项目表名已足够唯一。
- **返回置信度分数**：过度设计，增加解析复杂度。
- **自然语言解释**：难以程序化解析。

### 3. Token 优化效果估算

**Decision**: 对于 50 表数据库，第一阶段使用约 500 tokens，预计总体减少 60%+ token。

**Rationale**:
- 假设每表平均 10 字段，每字段约 10 tokens → 全量 schema 约 5000 tokens
- 表概要（名称+注释）每表约 10 tokens → 第一阶段约 500 tokens
- 用户查询通常涉及 2-5 表 → 第二阶段约 200-500 tokens
- 总计：500 + 500 = 1000 tokens vs 原来 5000 tokens → 减少 80%

**Measurement Plan**:
- 记录每次 LLM 调用的 token 使用量
- 对比优化前后同一查询的 token 消耗
- 可通过 OpenAI API 响应中的 `usage` 字段获取

### 4. 错误处理和 Fallback 策略

**Decision**: 第一阶段失败或返回空数组时，fallback 到使用全部 schema。

**Rationale**:
- 保证功能可用性优先于 token 优化
- 用户无感知的降级策略
- 避免因优化导致功能不可用

**Fallback 场景**:
1. 第一阶段 LLM 调用失败（网络、超时等）
2. 第一阶段返回空数组
3. 第一阶段返回的表名在数据库中不存在
4. 数据库表数量 ≤3（直接跳过第一阶段）

### 5. 小数据库优化

**Decision**: 表数量 ≤3 时跳过第一阶段，直接使用全部 schema 生成 SQL。

**Rationale**:
- 小数据库全量 schema 的 token 消耗可接受
- 减少一次 LLM 调用可显著降低延迟
- 3 是一个合理的阈值（经验值，可配置）

**Configuration**:
- 阈值可通过配置参数调整
- 默认值 `TABLE_SELECTION_THRESHOLD = 3`

## 技术决策总结

| 决策点 | 选择 | 理由 |
|--------|------|------|
| 调用模式 | 两阶段串行 | 最小必要拆分 |
| 第一阶段输入 | 表名+类型+注释 | 足够识别，大幅减 token |
| 第一阶段输出 | JSON 数组 | 易解析，低出错率 |
| 小数据库策略 | 跳过第一阶段 | 减少延迟 |
| Fallback 策略 | 使用全部 schema | 保证可用性 |

## 依赖和风险

### 依赖

- OpenAI SDK：现有依赖，无新增
- 现有 metadata 缓存机制：复用 `db_manager.get_metadata_for_database`

### 风险

| 风险 | 可能性 | 影响 | 缓解措施 |
|------|--------|------|----------|
| LLM 表选择不准确 | 中 | 中 | Fallback 到全量 schema |
| 双次调用增加延迟 | 高 | 低 | 小数据库跳过第一阶段 |
| JSON 解析失败 | 低 | 中 | 使用 fallback 策略 |


# Research: LLM 思考标签输出支持

**Date**: 2026-01-01  
**Feature**: 017-llm-think-tag-support

## 研究问题

### 1. 开源推理模型的输出格式分析

**问题**: 开源推理模型（如 DeepSeek-R1、Qwen-QwQ）的 `<think>` 标签输出格式是什么样的？

**发现**:

DeepSeek-R1 和类似模型会在响应开头输出其推理过程：

```
<think>用户现在需要根据请求"报价全国不统一的测试项目"生成SQL查询。

首先分析需求：要找的是测试项目的报价，全国不统一...
...更多推理过程...
现在构建JSON对象。</think>
```json
{
    "sql": "SELECT id, buffet_name FROM public.table WHERE ...",
    "explanation": "查询报价全国不统一的测试项目",
    "export_format": null
}
```
```

**关键特征**:
- `<think>` 标签总是在响应开头
- `</think>` 闭合标签后紧跟实际 JSON 内容
- JSON 可能带有 markdown 代码块包裹，也可能不带
- 思考内容可能很长，包含换行符

### 2. 最佳解析策略

**问题**: 如何安全可靠地剥离 `<think>` 标签？

**决策**: 使用正则表达式匹配和剥离

**理由**:
1. 正则表达式可以处理多行内容
2. 使用 `re.DOTALL` 标志确保 `.` 匹配换行符
3. 边界明确：`<think>` 和 `</think>` 是固定的 XML 风格标签
4. 性能影响微乎其微（单次正则替换）

**替代方案考虑**:

| 方案 | 优点 | 缺点 | 结论 |
|------|------|------|------|
| 正则表达式 | 简洁、性能好、可处理多行 | 需要正确的标志 | ✅ 采用 |
| 字符串 find/split | 不需要正则 | 代码复杂、边界情况多 | ❌ 拒绝 |
| XML 解析器 | 标准化 | 过度工程、依赖多 | ❌ 拒绝 |

### 3. 边界情况处理

**问题**: 如何处理异常格式？

**决策**:

| 情况 | 处理方式 |
|------|----------|
| 无 `<think>` 标签 | 保持原有逻辑，不做任何处理 |
| 未闭合的 `<think>` | 保持原内容，让后续逻辑报错 |
| 多个 `<think>` 块 | 只移除第一个完整的块 |
| 嵌套 `<think>` | 正则会匹配到第一个 `</think>`，可能导致残留，但实际不太可能发生 |

**理由**: 简单优先。实际使用中，模型输出格式相对稳定，过度处理边界情况会增加代码复杂度。

### 4. 实现位置分析

**问题**: 在哪里添加思考标签剥离逻辑？

**发现**:

当前 `llm_service.py` 中有两处解析 LLM 响应的代码：

1. `select_relevant_tables` 方法（第 211-256 行）
   - 用于表选择的 Phase 1
   - 返回 JSON 数组格式

2. `generate_sql` 方法（第 404-440 行）
   - 用于 SQL 生成的 Phase 2
   - 返回 JSON 对象格式

**决策**: 创建一个通用的辅助函数 `strip_think_tags`，在两处调用

**理由**:
1. DRY 原则 - 避免重复代码
2. 单一职责 - 思考标签剥离是独立的预处理步骤
3. 可测试性 - 辅助函数更容易单独测试

## 实现方案

### 核心函数

```python
import re

def strip_think_tags(content: str) -> str:
    """
    Remove <think>...</think> tags from LLM response.
    
    Some open-source reasoning models (e.g., DeepSeek-R1, Qwen-QwQ) 
    output their reasoning process wrapped in <think> tags before 
    the actual response.
    
    Args:
        content: Raw LLM response content
        
    Returns:
        Content with <think> block removed (if present)
    """
    # Pattern matches <think>...</think> including newlines
    # Using non-greedy match to handle potential edge cases
    pattern = r'^<think>.*?</think>\s*'
    return re.sub(pattern, '', content, count=1, flags=re.DOTALL)
```

### 调用位置

1. `select_relevant_tables` - 第 217 行后
2. `generate_sql` - 第 411 行后

### 测试策略

1. 单元测试 `strip_think_tags` 函数
2. 集成测试确保现有格式仍然工作
3. 新增测试用例覆盖思考标签格式

## 参考资料

- DeepSeek-R1 模型输出格式：https://api-docs.deepseek.com/
- OpenAI SDK 文档：https://platform.openai.com/docs/


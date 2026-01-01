# Quickstart: LLM 思考标签输出支持

**Feature**: 017-llm-think-tag-support  
**Date**: 2026-01-01

## 快速开始

### 1. 代码修改

在 `backend/app/services/llm_service.py` 中添加思考标签剥离函数：

```python
import re

def strip_think_tags(content: str) -> str:
    """Remove <think>...</think> tags from LLM response."""
    pattern = r'^<think>.*?</think>\s*'
    return re.sub(pattern, '', content, count=1, flags=re.DOTALL)
```

### 2. 集成点

在两个方法中调用此函数：

1. `select_relevant_tables` - 解析表选择响应前
2. `generate_sql` - 解析 SQL 生成响应前

### 3. 测试验证

```bash
# 运行单元测试
cd backend
uv run pytest tests/test_services/test_llm_service.py -v

# 使用 DeepSeek 模型测试
export LLM_API_KEY=your_deepseek_key
export OPENAI_BASE_URL=https://api.deepseek.com
uv run pytest tests/test_services/test_llm_service.py::test_strip_think_tags -v
```

### 4. 手动验证

启动服务后，使用自然语言查询功能：

1. 配置 DeepSeek-R1 或其他推理模型作为 LLM
2. 在前端输入自然语言查询
3. 确认能正常生成 SQL 而不报错

## 预期效果

| 场景 | 修改前 | 修改后 |
|------|--------|--------|
| 使用 DeepSeek-R1 | ❌ 报错 "not a SELECT statement" | ✅ 正常生成 SQL |
| 使用 OpenAI GPT | ✅ 正常工作 | ✅ 正常工作 |
| 使用 Qwen-QwQ | ❌ 报错 | ✅ 正常生成 SQL |

## 相关文件

- `backend/app/services/llm_service.py` - 主要修改
- `backend/tests/test_services/test_llm_service.py` - 新增测试


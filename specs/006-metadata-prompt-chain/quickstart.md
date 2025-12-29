# Quickstart: 元数据提示链（Metadata Prompt Chain）

**Feature**: 006-metadata-prompt-chain  
**Date**: 2025-12-29

## 快速开始

### 前置条件

1. 后端服务运行中
2. 已配置 LLM API Key (`LLM_API_KEY` 环境变量)
3. 已添加至少一个数据库连接

### 开发环境设置

```bash
# 切换到功能分支
git checkout 006-metadata-prompt-chain

# 进入后端目录
cd backend

# 安装依赖（如有新增）
uv sync

# 运行测试
uv run pytest tests/test_services/test_llm_service.py -v
```

### 核心代码位置

```text
backend/app/services/llm_service.py  # 主要修改文件
```

### 修改内容速览

#### 1. 新增 `build_table_summary_context` 方法

```python
async def build_table_summary_context(self, db_name: str) -> tuple[str, int]:
    """构建表概要（无字段详情）用于第一阶段。"""
    # 获取 metadata
    # 提取表名、类型、注释
    # 返回格式化字符串和表数量
```

#### 2. 新增 `select_relevant_tables` 方法

```python
async def select_relevant_tables(
    self, db_name: str, prompt: str, db_type: str = "postgresql"
) -> tuple[list[str], bool]:
    """第一阶段：让 LLM 选择相关表。"""
    # 构建表概要上下文
    # 调用 LLM
    # 解析 JSON 返回的表名数组
    # 错误处理和 fallback
```

#### 3. 修改 `build_schema_context` 方法

```python
async def build_schema_context(
    self, db_name: str, table_names: list[str] | None = None
) -> str:
    """支持过滤指定表的 schema。"""
    # 新增 table_names 参数
    # 如果指定了表名，只返回这些表的 schema
```

#### 4. 修改 `generate_sql` 方法

```python
async def generate_sql(self, db_name: str, prompt: str, db_type: str = "postgresql"):
    """整合两阶段提示链。"""
    # 获取表概要和数量
    # 判断是否跳过第一阶段（表数量 <= 3）
    # 如需要，执行第一阶段选择表
    # 构建选中表的 schema 上下文
    # 执行第二阶段生成 SQL
```

### 测试验证

#### 单元测试

```bash
# 运行 LLM 服务测试
cd backend
uv run pytest tests/test_services/test_llm_service.py -v

# 运行全部测试
uv run pytest tests/ -v
```

#### 接口测试

使用 `api-tests.rest` 中的自然语言查询接口测试：

```http
### 测试自然语言查询（会触发提示链）
POST http://localhost:8000/api/v1/dbs/my-database/query/natural
Content-Type: application/json

{
  "prompt": "查询所有订单的总金额"
}
```

#### 验证 Token 优化效果

可以在代码中添加日志记录 token 使用量：

```python
# 在 LLM 调用后记录
response = self.client.chat.completions.create(...)
if response.usage:
    logger.info(f"Token usage: {response.usage.total_tokens}")
```

### 配置参数

在 `app/config.py` 或直接在 `llm_service.py` 中定义：

```python
# 表选择阈值（表数量超过此值才启用第一阶段）
TABLE_SELECTION_THRESHOLD = 3

# 第一阶段最大选择表数
MAX_SELECTED_TABLES = 10
```

### 调试技巧

1. **查看第一阶段结果**：在 `select_relevant_tables` 返回前添加日志

```python
logger.debug(f"Selected tables: {selected_tables}")
```

2. **强制启用/禁用第一阶段**：临时调整 `TABLE_SELECTION_THRESHOLD`

3. **检查 fallback 情况**：观察日志中 `fallback_used=True` 的记录

### 常见问题

**Q: 为什么某些查询没有减少 token？**
A: 表数量 ≤3 时会跳过第一阶段，直接使用全部 schema。

**Q: 第一阶段选择的表不准确怎么办？**
A: 系统会自动 fallback 到全部 schema。可以考虑优化表注释来提高识别准确率。

**Q: 如何禁用提示链功能？**
A: 将 `TABLE_SELECTION_THRESHOLD` 设为一个很大的值（如 9999）。


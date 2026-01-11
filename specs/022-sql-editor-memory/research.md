# Research: SQL编辑器历史记录功能

**Feature**: 022-sql-editor-memory
**Date**: 2026-01-10
**Purpose**: 研究并解决实现过程中的技术决策

## 研究领域

### 1. SQLite数据库表结构设计

**决策**: 创建`editor_memory`表存储编辑器历史记录

**理由**:
- 使用现有的SQLite数据库（scinew.db），无需额外的数据库连接
- 简单的表结构满足所有功能需求
- 支持快速查询和高效存储

**表结构**:
```sql
CREATE TABLE IF NOT EXISTS editor_memory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    connection_id TEXT NOT NULL,      -- 数据库连接ID
    content TEXT NOT NULL,             -- 编辑器内容（可为空字符串）
    created_at TIMESTAMP NOT NULL,     -- 创建时间
    INDEX idx_connection_id (connection_id),
    INDEX idx_created_at (created_at)
);
```

**备选方案考虑**:
- ❌ 使用独立的SQLite文件：增加复杂度，不必要
- ❌ 使用JSON文件存储：查询性能差，不支持索引
- ✅ 使用现有SQLite数据库：简单、高效、一致

### 2. 前端自动保存机制

**决策**: 使用React hooks + debounce实现30秒自动保存

**理由**:
- React hooks提供清晰的状态管理
- debounce避免频繁的API调用
- 30秒间隔平衡了数据安全性和性能

**实现方式**:
```typescript
useEffect(() => {
  const timer = setInterval(() => {
    if (editorContent !== lastSavedContent) {
      saveToBackend(connectionId, editorContent);
    }
  }, 30000); // 30秒

  return () => clearInterval(timer);
}, [editorContent, connectionId]);
```

**备选方案考虑**:
- ❌ 实时保存（每次输入）：API调用过于频繁，性能差
- ❌ 仅在切换数据库时保存：可能丢失数据
- ❌ 使用Web Worker：增加复杂度，不必要
- ✅ 定时30秒保存：平衡性能和数据安全

### 3. 数据库连接ID获取方式

**决策**: 从前端上下文中获取当前连接的connection_id

**理由**:
- 前端已经维护了当前数据库连接状态
- 无需后端额外维护连接映射
- 简化API设计，前端直接传递connection_id

**实现方式**:
```typescript
// 从现有的数据库连接上下文获取
const { currentConnection } = useConnectionContext();
const connectionId = currentConnection?.id;
```

**备选方案考虑**:
- ❌ 后端生成并管理连接ID：增加后端复杂度
- ❌ 使用数据库名称作为ID：同名数据库会冲突
- ✅ 使用前端connection_id：利用现有机制，简单可靠

### 4. 历史记录查询和排序

**决策**: 按时间倒序返回所有历史记录，前端按需分页

**理由**:
- 用户最关心最新的历史记录
- 后端简单返回全量数据，前端灵活控制显示
- 支持未来添加搜索和过滤功能

**API设计**:
```python
GET /api/editor-memory/{connection_id}
Response: List[EditorMemory] (按created_at倒序)
```

**备选方案考虑**:
- ❌ 后端分页：增加API复杂度，目前数据量不大
- ❌ 只返回最新一条：不满足查看历史的需求
- ✅ 返回全量按时间排序：简单直接，满足需求

### 5. 并发保存冲突处理

**决策**: 使用"last write wins"策略

**理由**:
- SQL编辑器通常是单用户单连接场景
- 简单的覆盖策略满足大多数使用场景
- 避免引入复杂的锁机制

**实现方式**:
- 每次保存都是INSERT新记录
- 不做并发冲突检测
- 依赖数据库的ACID特性保证数据一致性

**备选方案考虑**:
- ❌ 乐观锁（版本号）：过度设计，增加复杂度
- ❌ 悲观锁（行锁）：影响性能，不必要
- ✅ Last write wins：简单可靠，符合使用场景

### 6. 空内容处理

**决策**: 空编辑器内容也保存为空字符串记录

**理由**:
- 保持状态一致性，用户清空编辑器后切换回来应该看到空白
- 简化逻辑，不需要特殊处理空内容
- 符合用户预期

**实现方式**:
```python
# 后端允许content为空字符串
class EditorMemoryCreate(BaseModel):
    connection_id: str
    content: str  # 可以是空字符串
```

**备选方案考虑**:
- ❌ 空内容不保存：用户期望不一致
- ❌ 空内容标记为特殊值：增加复杂度
- ✅ 空字符串正常保存：简单、一致

### 7. 性能优化策略

**决策**: 使用索引 + 限制查询范围

**理由**:
- connection_id索引加速按连接查询
- created_at索引支持时间排序
- 前端可选择性加载更多历史记录

**优化措施**:
```sql
-- 索引
CREATE INDEX idx_connection_id ON editor_memory(connection_id);
CREATE INDEX idx_created_at ON editor_memory(created_at);

-- 可选：限制返回数量（Phase 2考虑）
SELECT * FROM editor_memory
WHERE connection_id = ?
ORDER BY created_at DESC
LIMIT 100;
```

**备选方案考虑**:
- ❌ 不使用索引：查询性能差
- ❌ 全量加载所有记录：数据量大时性能问题
- ✅ 索引 + 合理的查询策略：平衡性能和功能

## 技术栈确认

### 后端
- **语言**: Python 3.13+
- **框架**: FastAPI
- **数据验证**: Pydantic（BaseModel，使用camelCase alias）
- **数据库**: aiosqlite（异步SQLite操作）
- **测试**: pytest, pytest-asyncio, httpx

### 前端
- **语言**: TypeScript 5.9+
- **框架**: React 19
- **UI组件**: Ant Design
- **编辑器**: Monaco Editor
- **HTTP客户端**: axios
- **测试**: Playwright (E2E), vitest (单元测试)

## 集成点分析

### 1. 与现有数据库连接管理的集成
- **现状**: 前端已有数据库连接管理机制
- **集成**: 从现有连接上下文获取connection_id
- **影响**: 无，不影响现有连接管理

### 2. 与SQL编辑器的集成
- **现状**: Monaco Editor已集成
- **集成**: 添加自动保存Hook和历史记录面板组件
- **影响**: 最小化，作为独立功能模块添加

### 3. 与SQLite数据库的集成
- **现状**: 已使用SQLite存储元数据
- **集成**: 添加editor_memory表
- **影响**: 无，使用相同的数据库文件

## 风险和缓解措施

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| SQLite存储空间不足 | 保存失败 | 前端捕获错误并提示用户 |
| 30秒内数据丢失 | 用户体验差 | 在窗口关闭时触发最后一次保存 |
| 大量历史记录影响性能 | 查询变慢 | 使用索引，未来可添加分页 |
| 连接ID变化导致历史记录丢失 | 数据不一致 | 确保连接ID的稳定性（需要验证现有实现） |

## 下一步行动

Phase 1将基于以上研究结果生成：
1. **data-model.md**: 详细的数据模型定义
2. **contracts/**: API契约（OpenAPI规范）
3. **quickstart.md**: 开发者快速上手指南
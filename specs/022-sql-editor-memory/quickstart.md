# Quick Start: SQL编辑器历史记录功能

**Feature**: 022-sql-editor-memory
**Date**: 2026-01-10

## 功能概述

SQL编辑器历史记录功能允许用户自动保存和管理SQL编辑器中的内容。每个数据库连接拥有独立的编辑器历史记录，支持查看、加载和删除历史内容。

### 核心特性

- ✅ 每30秒自动保存编辑器内容
- ✅ 按数据库连接隔离历史记录
- ✅ 切换数据库自动加载上次保存的内容
- ✅ 支持查看历史记录列表
- ✅ 支持删除单条或全部历史记录
- ✅ 中文界面显示

## 架构概览

```
┌─────────────┐     HTTP/JSON      ┌─────────────┐     aiosqlite    ┌──────────┐
│   前端      │  ───────────────>  │   后端      │  ──────────────> │  SQLite  │
│   React     │                    │   FastAPI   │                  │  数据库  │
│   Monaco    │  <───────────────  │   Pydantic  │  <──────────────│ scinew.db│
│   Editor    │                    │             │                  │          │
└─────────────┘                    └─────────────┘                  └──────────┘
      │                                   │
      │                                   │
      ▼                                   ▼
  自动保存                           editor_memory表
  (30秒定时器)                     (connection_id索引)
```

## 开发环境设置

### 前置条件

- Python 3.13+
- Node.js 18+
- uv (Python包管理器)
- 现有的TableChat项目环境

### 后端设置

```bash
# 1. 进入后端目录
cd backend/

# 2. 确保已安装依赖（如果未安装）
uv sync

# 3. 初始化editor_memory表（首次运行）
python -c "
import asyncio
from app.database.editor_memory_db import init_editor_memory_table

asyncio.run(init_editor_memory_table('scinew.db'))
print('✅ editor_memory表初始化完成')
"

# 4. 运行后端服务
uv run uvicorn app.main:app --reload --port 8000
```

### 前端设置

```bash
# 1. 进入前端目录
cd frontend/

# 2. 确保已安装依赖（如果未安装）
npm install

# 3. 运行前端开发服务器
npm run dev
```

## API使用示例

### 1. 保存编辑器内容

```bash
# 创建新的历史记录
curl -X POST http://localhost:8000/api/editor-memory \
  -H "Content-Type: application/json" \
  -d '{
    "connectionId": "conn_123",
    "content": "SELECT * FROM users;"
  }'

# 响应示例
{
  "id": 1,
  "connectionId": "conn_123",
  "content": "SELECT * FROM users;",
  "createdAt": "2026-01-10T12:00:00Z"
}
```

### 2. 获取历史记录列表

```bash
# 获取指定连接的所有历史记录
curl http://localhost:8000/api/editor-memory/conn_123

# 响应示例
{
  "items": [
    {
      "id": 2,
      "connectionId": "conn_123",
      "content": "SELECT * FROM orders;",
      "createdAt": "2026-01-10T12:30:00Z"
    },
    {
      "id": 1,
      "connectionId": "conn_123",
      "content": "SELECT * FROM users;",
      "createdAt": "2026-01-10T12:00:00Z"
    }
  ],
  "total": 2
}
```

### 3. 删除历史记录

```bash
# 删除单条记录
curl -X DELETE http://localhost:8000/api/editor-memory/1

# 清空连接的所有记录
curl -X DELETE http://localhost:8000/api/editor-memory/connection/conn_123
```

## 前端集成示例

### 1. 使用自动保存Hook

```typescript
import { useEditorAutoSave } from '@/hooks/useEditorAutoSave';

function SQLEditorPage() {
  const { currentConnection } = useConnectionContext();
  const [editorContent, setEditorContent] = useState('');

  // 启用自动保存
  useEditorAutoSave({
    connectionId: currentConnection?.id,
    content: editorContent,
    interval: 30000, // 30秒
  });

  return (
    <MonacoEditor
      value={editorContent}
      onChange={(value) => setEditorContent(value || '')}
    />
  );
}
```

### 2. 显示历史记录面板

```typescript
import { HistoryPanel } from '@/components/EditorMemory/HistoryPanel';

function SQLEditorPage() {
  const { currentConnection } = useConnectionContext();
  const [editorContent, setEditorContent] = useState('');

  const handleLoadHistory = (content: string) => {
    setEditorContent(content);
  };

  return (
    <div>
      <MonacoEditor value={editorContent} onChange={setEditorContent} />

      <HistoryPanel
        connectionId={currentConnection?.id}
        onLoadHistory={handleLoadHistory}
      />
    </div>
  );
}
```

### 3. 切换数据库时加载历史

```typescript
useEffect(() => {
  if (currentConnection?.id) {
    // 加载该连接最后一次保存的内容
    editorMemoryService
      .getLatest(currentConnection.id)
      .then(memory => {
        if (memory) {
          setEditorContent(memory.content);
        }
      });
  }
}, [currentConnection?.id]);
```

## 测试指南

### 后端单元测试

```bash
cd backend/

# 运行所有测试
pytest

# 只运行编辑器记忆相关测试
pytest tests/unit/test_editor_memory_service.py
pytest tests/integration/test_editor_memory_api.py

# 查看测试覆盖率
pytest --cov=app.services.editor_memory_service
```

### 前端E2E测试

```bash
cd frontend/

# 运行E2E测试
npm run test:e2e

# 运行特定测试文件
npm run test:e2e -- editor-memory.spec.ts

# UI模式运行
npm run test:e2e:ui
```

### API接口测试

使用VSCode REST Client插件打开`api-tests.rest`文件，找到编辑器记忆相关的测试用例并执行。

## 数据库管理

### 查看editor_memory表数据

```bash
# 使用sqlite3命令行
sqlite3 backend/scinew.db

# SQL查询示例
SELECT * FROM editor_memory ORDER BY created_at DESC LIMIT 10;
SELECT connection_id, COUNT(*) FROM editor_memory GROUP BY connection_id;
```

### 清理测试数据

```sql
-- 删除所有历史记录
DELETE FROM editor_memory;

-- 删除特定连接的记录
DELETE FROM editor_memory WHERE connection_id = 'conn_123';

-- 删除7天前的记录
DELETE FROM editor_memory WHERE created_at < datetime('now', '-7 days');
```

## 常见问题

### Q: 为什么我的内容没有自动保存？

A: 检查以下几点：
1. 确保已连接到数据库（connection_id存在）
2. 检查浏览器控制台是否有错误
3. 验证后端API是否正常运行
4. 确认30秒定时器是否触发

### Q: 切换数据库后看不到历史内容？

A: 检查：
1. connection_id是否正确
2. 该连接是否有历史记录（查看数据库）
3. 前端是否正确调用加载API

### Q: 如何调整自动保存间隔？

A: 修改前端Hook的interval参数：

```typescript
useEditorAutoSave({
  connectionId: currentConnection?.id,
  content: editorContent,
  interval: 60000, // 改为60秒
});
```

### Q: 历史记录会占用多少存储空间？

A: 取决于SQL内容的长度和数量。建议定期清理不需要的历史记录，或实现自动清理策略（如只保留最近30天的记录）。

## 下一步

- ✅ 阅读完整的 [data-model.md](./data-model.md)
- ✅ 查看 [API契约](./contracts/openapi.yaml)
- ✅ 运行 `/speckit.tasks` 生成实施任务列表
- ✅ 开始实施开发任务

## 参考资源

- [规格说明](./spec.md)
- [研究文档](./research.md)
- [实施计划](./plan.md)
- [TableChat宪法](./.specify/memory/constitution.md)
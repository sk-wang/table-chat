# Implementation Plan: 代码库审查与质量提升

**Branch**: `016-code-review-cleanup` | **Date**: 2025-12-31 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/016-code-review-cleanup/spec.md`

## Summary

对 TableChat 代码库进行全面审查，修复 lint 错误、删除未使用代码、补充单元测试，并识别优化机会。技术方案采用 ESLint 自动修复 + 手动修复结合，使用 Vitest 和 pytest 分别为前后端添加单元测试。

## Technical Context

**Language/Version**: TypeScript 5.x (前端), Python 3.13+ (后端)  
**Primary Dependencies**: React, Ant Design, Monaco Editor (前端); FastAPI, sqlglot (后端)  
**Storage**: N/A（本次任务不涉及存储变更）  
**Testing**: Vitest + @testing-library/react (前端), pytest (后端)  
**Target Platform**: Web 应用（Docker 部署）  
**Project Type**: Web application (backend + frontend)  
**Performance Goals**: N/A（本次任务为代码质量提升，不涉及性能优化）  
**Constraints**: 不破坏现有功能，测试全部通过  
**Scale/Scope**: 前端约 110 个测试 → 130+，后端测试覆盖率 +10%

## Constitution Check

*GATE: Must pass before Phase 0 research.*

| Principle | Status | Notes |
|-----------|--------|-------|
| 最小实现 | ✅ Pass | 只修复问题和添加测试，不重构 |
| 单一职责 | ✅ Pass | 每个任务独立可验证 |
| 测试优先 | ✅ Pass | 添加测试是核心目标 |
| 增量交付 | ✅ Pass | 按 User Story 优先级分阶段完成 |

## Project Structure

### Documentation (this feature)

```text
specs/016-code-review-cleanup/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Lint 问题分析和测试覆盖分析
├── quickstart.md        # 快速修复指南
└── tasks.md             # 任务列表 (/speckit.tasks 生成)
```

### Source Code (repository root)

```text
backend/
├── app/
│   ├── api/v1/          # API 端点
│   ├── models/          # Pydantic 模型
│   ├── services/        # 业务逻辑
│   └── connectors/      # 数据库连接器
└── tests/
    ├── test_api/        # API 测试
    ├── test_services/   # 服务测试
    └── test_connectors/ # 连接器测试

frontend/
├── src/
│   ├── components/      # React 组件
│   │   ├── editor/      # 编辑器组件 (SqlEditor, QueryToolbar)
│   │   ├── database/    # 数据库组件 (AddDatabaseModal)
│   │   ├── agent/       # Agent 组件 (AgentChat)
│   │   ├── results/     # 结果组件 (QueryResultTable)
│   │   └── sidebar/     # 侧边栏组件 (DatabaseSidebar)
│   ├── hooks/           # 自定义 Hooks (useAgentChat)
│   ├── services/        # API 服务
│   └── test/            # 单元测试
└── e2e/                 # E2E 测试
```

**Structure Decision**: 使用现有项目结构，在 `frontend/src/test/` 下添加新测试文件

## Implementation Approach

### Phase 1: Lint 错误修复 (US1)

#### 自动修复

```bash
cd frontend && npm run lint -- --fix
```

#### 手动修复项

| 文件 | 问题 | 修复方案 |
|------|------|----------|
| `useAgentChat.ts` | useCallback 依赖项缺失 | 添加缺失的依赖项或使用 `useRef` 避免重新创建 |
| `api.test.ts` | 未使用的 imports | 删除 `afterEach`, `AxiosInstance` |
| `setup.ts` | 使用 `any` 类型 | 替换为具体类型或 `unknown` |

### Phase 2: 死代码清理 (US2)

#### 检测工具

```bash
# 检测未使用的 exports
npx ts-unused-exports tsconfig.json
```

#### 保留策略

- Refine DataProvider 接口方法：添加 `// Required by DataProvider contract` 注释
- 预留扩展点：添加 `@deprecated` 或 TODO 注释

### Phase 3: 前端测试补充 (US3)

#### 新增测试文件

| 文件 | 测试数量 | 覆盖内容 |
|------|----------|----------|
| `SqlEditor.test.tsx` | 5+ | 渲染、onChange、快捷键 |
| `AddDatabaseModal.test.tsx` | 5+ | 表单验证、提交、SSH 配置 |
| `NaturalLanguageInput.test.tsx` | 3+ | 输入、提交、禁用状态 |
| `QueryResultTable.test.tsx` | 3+ | 空数据、渲染、列宽 |

#### 测试模式

```typescript
// 组件渲染测试
it('should render component', () => {
  render(<Component {...props} />);
  expect(screen.getByRole('...')).toBeInTheDocument();
});

// 用户交互测试
it('should call callback on action', () => {
  const onCallback = vi.fn();
  render(<Component onCallback={onCallback} />);
  fireEvent.click(screen.getByRole('button'));
  expect(onCallback).toHaveBeenCalled();
});
```

### Phase 4: 后端测试补充 (US4)

#### 新增测试

| 文件 | 测试数量 | 覆盖内容 |
|------|----------|----------|
| `test_query_api.py` | 2+ | format 端点测试 |
| `test_ssh_tunnel.py` | 3+ | 连接、断开、错误处理 |

### Phase 5: 优化机会文档 (US5)

#### 输出文件

`specs/016-code-review-cleanup/OPTIMIZATION_OPPORTUNITIES.md`

#### 分类模板

```markdown
## 性能优化

| ID | 描述 | 影响 | 难度 | 优先级 |
|----|------|------|------|--------|
| P1 | useAgentChat 依赖优化 | 中 | 低 | 高 |

## 架构优化
...

## 用户体验优化
...

## 开发者体验优化
...
```

## Complexity Tracking

无违规项，本次任务不引入新的复杂性。

## Risk Assessment

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 修复 lint 破坏功能 | 高 | 每次修复后运行测试 |
| 删除"未使用"代码导致运行时错误 | 高 | 仔细检查 DataProvider 契约 |
| 新增测试不稳定 | 中 | 使用 mock 隔离外部依赖 |

## Verification Plan

1. **Lint 验证**: `npm run lint` 返回 0 errors
2. **测试验证**: `npm test` 和 `pytest` 全部通过
3. **功能验证**: 手动测试关键流程（SQL 执行、Agent 对话）


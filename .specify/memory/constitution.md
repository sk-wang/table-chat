<!--
Sync Impact Report
==================
Version change: 1.0.0 → 1.1.0 (MINOR: Added new testing principle)
Modified principles: None (existing principles unchanged)
Added sections:
  - Principle VI: Comprehensive Testing Requirements
Removed sections: None
Templates requiring updates:
  - .specify/templates/plan-template.md: ✅ compatible (Testing section already exists)
  - .specify/templates/spec-template.md: ✅ compatible (User Scenarios & Testing section exists)
  - .specify/templates/tasks-template.md: ✅ compatible (Test tasks already documented)
Follow-up TODOs: None
-->

# TableChat Constitution

## Core Principles

### I. Ergonomic Python Backend

后端代码 MUST 使用 Ergonomic Python 风格编写。

**具体要求**:
- 优先使用类型提示（type hints）增强代码可读性
- 使用现代 Python 特性（如 dataclasses、match-case、walrus operator 等）
- 代码结构清晰、简洁、易于理解
- 函数和方法保持单一职责

**理由**: Ergonomic Python 强调代码的人体工程学设计，提高开发效率和代码可维护性。

### II. TypeScript Frontend

前端代码 MUST 使用 TypeScript 编写。

**具体要求**:
- 所有前端代码必须使用 TypeScript（.ts/.tsx 文件）
- 禁止使用 `any` 类型，除非有明确的技术理由
- 组件 props 必须有明确的类型定义
- API 响应必须有对应的 TypeScript 接口定义

**理由**: TypeScript 提供编译时类型检查，减少运行时错误，提高代码质量。

### III. Strict Type Annotations

前后端都 MUST 有严格的类型标注。

**具体要求**:
- Python 后端：所有函数参数和返回值必须有类型标注
- Python 后端：使用 Pydantic 模型定义 API 请求和响应
- TypeScript 前端：启用 strict 模式
- 禁止隐式 any 类型

**理由**: 严格的类型系统是代码质量和团队协作的基础保障。

### IV. Pydantic Data Models

后端数据模型 MUST 使用 Pydantic 定义。

**具体要求**:
- API 请求体使用 Pydantic BaseModel
- API 响应体使用 Pydantic BaseModel
- 数据库实体映射使用 Pydantic 模型
- 所有 JSON 序列化 MUST 使用 camelCase 格式（通过 Pydantic alias 配置）

**理由**: Pydantic 提供运行时数据验证、自动文档生成和类型安全的数据转换。

### V. Open Access (No Authentication)

系统 MUST NOT 要求用户认证。

**具体要求**:
- 所有 API 端点无需认证即可访问
- 不实现用户登录、注册功能
- 不存储用户凭证
- 任何用户都可以直接使用所有功能

**理由**: 本项目是内部工具/开发工具，简化使用流程，降低开发复杂度。

### VI. Comprehensive Testing Requirements

完成功能后 MUST 进行全面的测试覆盖。

**具体要求**:

1. **后端单元测试**:
   - 所有服务层（services）MUST 有对应的单元测试
   - 使用 pytest 作为测试框架
   - 测试文件放置在 `backend/tests/` 目录
   - 覆盖核心业务逻辑和边界条件

2. **后端接口测试**:
   - 所有 API 端点 MUST 有对应的接口测试
   - 使用 `.rest` 文件记录接口测试用例（VSCode REST Client 格式）
   - `.rest` 文件放置在项目根目录或 `api-tests.rest`
   - 包含正常场景和错误场景的测试用例

3. **前端单元测试**:
   - 核心组件和服务 SHOULD 有对应的单元测试
   - 使用项目配置的测试框架

4. **前端 UI 测试**:
   - 主要用户流程 MUST 使用 Playwright 进行 E2E 测试
   - 测试文件放置在 `frontend/e2e/` 目录
   - 覆盖关键用户交互场景

**测试验收标准**:
- 新功能必须附带相应测试才能视为完成
- 后端测试通过率 MUST 达到 100%
- 关键路径的 E2E 测试 MUST 通过

**理由**: 全面的测试覆盖确保代码质量、防止回归、提高重构信心、便于后续维护。

## Technology Stack Requirements

### Backend Stack

| 组件 | 技术选型 |
|------|---------|
| 语言 | Python 3.13+ (uv 管理) |
| 框架 | FastAPI |
| 数据验证 | Pydantic |
| SQL 解析 | sqlglot |
| LLM 集成 | OpenAI SDK |
| 元数据存储 | SQLite |
| 测试框架 | pytest, pytest-asyncio |
| API 测试 | httpx, .rest 文件 |

### Frontend Stack

| 组件 | 技术选型 |
|------|---------|
| 语言 | TypeScript |
| 框架 | React |
| 管理框架 | Refine 5 |
| 样式 | Tailwind CSS |
| UI 组件 | Ant Design |
| SQL 编辑器 | Monaco Editor |
| E2E 测试 | Playwright |

### JSON Serialization Convention

所有后端生成的 JSON 数据 MUST 使用 **camelCase** 格式：

```python
# 正确示例
class UserResponse(BaseModel):
    user_name: str
    created_at: datetime

    class Config:
        alias_generator = to_camel
        populate_by_name = True
```

## Development Workflow

### Code Quality Gates

1. **类型检查**: 后端使用 mypy，前端使用 tsc strict 模式
2. **代码格式**: 后端使用 ruff，前端使用 prettier + eslint
3. **SQL 安全**: 所有 SQL 语句必须经过 sqlglot 解析验证
4. **仅允许 SELECT**: 用户输入的 SQL 仅限 SELECT 语句
5. **测试覆盖**: 新功能必须包含相应测试（详见 Principle VI）

### SQL Query Constraints

- 所有用户输入的 SQL MUST 经过 sqlglot 解析
- 仅允许 SELECT 语句，拒绝 INSERT/UPDATE/DELETE/DDL
- 无 LIMIT 子句时，自动添加 `LIMIT 1000`

### Testing Workflow

功能开发完成后的测试流程：

1. **编写后端单元测试** → `pytest tests/`
2. **编写/更新接口测试** → 更新 `api-tests.rest`
3. **编写前端 E2E 测试** → `npx playwright test`
4. **验证所有测试通过** → 功能完成

## Governance

本宪法是 TableChat 项目的最高开发准则。

**修订流程**:
1. 任何修订必须在 `.specify/memory/constitution.md` 中记录
2. 版本号遵循语义化版本规范（MAJOR.MINOR.PATCH）
3. 重大变更需要更新相关模板和文档

**合规检查**:
- 所有代码审查必须验证是否符合本宪法
- 新功能开发前必须确认不违反核心原则
- 新功能完成后必须验证测试覆盖要求（Principle VI）
- 复杂度引入必须有明确理由

**运行时指导**: 参考 `spec/instructions.md` 获取详细开发指导。

**Version**: 1.1.0 | **Ratified**: 2025-12-28 | **Last Amended**: 2025-12-28

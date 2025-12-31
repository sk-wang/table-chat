# Feature Specification: 代码库审查与质量提升

**Feature Branch**: `016-code-review-cleanup`  
**Created**: 2025-12-31  
**Status**: Draft  
**Input**: User description: "仔细 review 当前代码库的代码，删除不用的代码，添加更多 unit test，以及寻找 opportunity"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 修复 Lint 错误和警告 (Priority: P1) 🎯 MVP

作为开发者，我希望修复所有 ESLint 错误和警告，以确保代码质量基线达标。

**当前发现的问题**：
- 前端有 59 个 lint 问题（42 个 errors，17 个 warnings）
- 主要问题包括：
  - `useAgentChat.ts`: useCallback 依赖项缺失
  - `api.test.ts`: 未使用的 imports (`afterEach`, `AxiosInstance`)
  - `setup.ts`: 使用了 `any` 类型

**Why this priority**: Lint 错误会阻塞 CI/CD 流水线，是代码质量的基础门槛

**Independent Test**: 运行 `npm run lint` 返回 0 errors 和 0 warnings

**Acceptance Scenarios**:

1. **Given** 当前代码库有 lint 错误, **When** 运行 `npm run lint`, **Then** 返回 0 errors
2. **Given** 修复后的代码, **When** 运行 lint 检查, **Then** 所有文件通过检查

---

### User Story 2 - 删除未使用的代码 (Priority: P1)

作为开发者，我希望识别并删除未使用的代码，以保持代码库精简和可维护。

**需要检查的内容**：
- 未使用的 imports
- 未使用的组件和函数
- 未使用的类型定义
- 已废弃的文件

**Why this priority**: 死代码会增加维护成本和认知负担

**Independent Test**: 代码扫描工具不再检测到未使用的 exports

**Acceptance Scenarios**:

1. **Given** 代码库中存在未使用的 imports, **When** 执行清理, **Then** 所有 imports 都被使用
2. **Given** 代码库中存在未使用的组件, **When** 执行清理, **Then** 删除或标记废弃

---

### User Story 3 - 增加前端组件单元测试覆盖 (Priority: P2)

作为开发者，我希望为缺少测试的核心前端组件添加单元测试，以提高代码可靠性。

**当前缺少测试的组件**：
- `SqlEditor.tsx` - SQL 编辑器核心组件
- `NaturalLanguageInput.tsx` - 自然语言输入组件
- `AddDatabaseModal.tsx` - 数据库添加对话框
- `AgentChat.tsx` - Agent 聊天组件
- `DatabaseSidebar.tsx` - 数据库侧边栏
- `QueryResultTable.tsx` - 查询结果表格

**已有测试的组件**：
- `QueryToolbar.tsx` (8 个测试)
- `ResizableSplitPane.tsx` (13 个测试)
- `DatabaseContext.tsx` (12 个测试)

**Why this priority**: 核心组件测试覆盖可以防止回归问题

**Independent Test**: 新增至少 20 个前端单元测试，测试通过率 100%

**Acceptance Scenarios**:

1. **Given** `SqlEditor` 组件没有测试, **When** 添加测试, **Then** 至少覆盖基本渲染和快捷键功能
2. **Given** `AddDatabaseModal` 组件没有测试, **When** 添加测试, **Then** 覆盖表单验证和提交逻辑

---

### User Story 4 - 增加后端服务单元测试覆盖 (Priority: P2)

作为开发者，我希望为后端服务添加更多单元测试，特别是新增的 `format_sql` 功能。

**当前测试情况**：
- `test_query_service.py` - 已有基础测试
- `test_agent_tools.py` - Agent 工具测试
- `test_llm_service.py` - LLM 服务测试

**需要补充的测试**：
- 格式化 API 端点测试
- SSH 隧道服务测试
- 边界情况和错误处理测试

**Why this priority**: 后端服务是应用核心，测试覆盖可防止严重错误

**Independent Test**: 后端测试覆盖率从当前水平提升至少 10%

**Acceptance Scenarios**:

1. **Given** `format_sql` 方法有单元测试, **When** 运行测试, **Then** 所有测试通过
2. **Given** SSH 隧道服务, **When** 添加测试, **Then** 覆盖连接、错误处理场景

---

### User Story 5 - 代码优化机会识别 (Priority: P3)

作为开发者，我希望识别代码优化机会，为未来改进提供参考。

**优化机会分类**：
1. **性能优化**：组件重渲染、API 调用去重
2. **架构优化**：代码解耦、抽象复用
3. **用户体验优化**：加载状态、错误处理
4. **开发者体验优化**：类型安全、文档完善

**Why this priority**: 优化机会可在后续迭代中逐步实施

**Independent Test**: 生成优化建议清单，分类记录在文档中

**Acceptance Scenarios**:

1. **Given** 代码库完成审查, **When** 生成报告, **Then** 包含至少 10 条可执行的优化建议
2. **Given** 优化建议列表, **When** 按优先级排序, **Then** 每条建议有清晰的实施路径

---

### Edge Cases

- 如果某些"未使用"的代码是 API 契约要求保留的怎么办？（如 Refine DataProvider）
- 如果修复 lint 错误需要重大重构怎么办？
- 如果某些组件难以单独测试怎么办？

## Requirements *(mandatory)*

### Functional Requirements

#### 代码质量修复

- **FR-001**: 系统 MUST 修复所有 ESLint errors（42 个）
- **FR-002**: 系统 SHOULD 修复所有 ESLint warnings（17 个）
- **FR-003**: 系统 MUST 删除或修复所有未使用的 imports
- **FR-004**: 系统 SHOULD 保留 API 契约要求的"未使用"代码，并添加注释说明

#### 测试覆盖提升

- **FR-005**: 系统 MUST 为 `SqlEditor.tsx` 添加至少 5 个单元测试
- **FR-006**: 系统 MUST 为 `AddDatabaseModal.tsx` 添加至少 5 个单元测试
- **FR-007**: 系统 SHOULD 为 `NaturalLanguageInput.tsx` 添加至少 3 个单元测试
- **FR-008**: 系统 SHOULD 为 `QueryResultTable.tsx` 添加至少 3 个单元测试
- **FR-009**: 系统 MUST 确保新增测试全部通过

#### 优化机会记录

- **FR-010**: 系统 MUST 生成优化建议文档
- **FR-011**: 优化建议 MUST 按类别分类（性能/架构/UX/DX）
- **FR-012**: 每条优化建议 SHOULD 包含预估影响和实施难度

### Key Entities

- **LintError**: Lint 检查发现的问题（文件路径、行号、错误类型、修复建议）
- **DeadCode**: 未使用的代码段（位置、类型、保留原因（如有））
- **TestCase**: 单元测试用例（组件名、测试描述、测试类型）
- **Optimization**: 优化建议（类别、描述、影响、难度）

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: ESLint 检查返回 0 errors（当前：42 errors）
- **SC-002**: ESLint 检查 warnings 数量减少至少 50%（当前：17 warnings）
- **SC-003**: 前端单元测试数量增加至少 20 个（当前约 110 个）
- **SC-004**: 所有新增测试通过率 100%
- **SC-005**: 生成优化建议文档，包含至少 10 条可执行建议
- **SC-006**: 代码库无新增未使用 imports（扫描验证）

## Assumptions

1. **保留 API 契约代码**：Refine DataProvider 接口要求的方法即使未直接调用也需保留
2. **测试优先级**：优先测试用户交互多的核心组件
3. **修复策略**：优先自动修复（`--fix`），手动修复复杂问题
4. **优化不实施**：本 spec 只识别优化机会，不实际实施优化

## Out of Scope

- 重大架构重构
- 性能优化的实际实施
- E2E 测试补充（已有 8 个 E2E 测试文件）
- 后端类型检查（Python 使用 mypy，当前未启用）

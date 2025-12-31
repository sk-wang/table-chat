# Feature Specification: SQL 编辑器格式化功能

**Feature Branch**: `015-sql-formatter`  
**Created**: 2025-12-31  
**Status**: Draft  
**Input**: User description: "增加SQL编辑器格式化SQL的功能，然后自动添加LIMIT 1000的时候，不要破坏SQL格式"

## 概述

为 SQL 编辑器添加一键格式化 SQL 语句的功能，同时优化现有的自动 LIMIT 1000 添加逻辑，确保添加 LIMIT 子句后不会破坏原有的 SQL 格式和可读性。

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 一键格式化 SQL 语句 (Priority: P1)

用户在 SQL 编辑器中编写或粘贴了一段格式混乱的 SQL 语句（如单行长语句、缩进不一致、关键字大小写不统一等）。用户点击"格式化"按钮或使用快捷键，系统自动将 SQL 语句格式化为易读的多行格式，包含适当的缩进和关键字大写。

**Why this priority**: 这是核心功能，直接提升 SQL 编写和阅读体验。

**Independent Test**: 在编辑器中输入混乱格式的 SQL，点击格式化按钮，验证输出格式正确。

**Acceptance Scenarios**:

1. **Given** 用户输入单行 SQL `select id,name from users where age>18 order by name`，**When** 用户点击"Format"按钮，**Then** SQL 被格式化为多行格式，关键字大写，适当缩进
2. **Given** 用户输入带有子查询的复杂 SQL，**When** 用户使用快捷键格式化，**Then** 子查询被正确缩进，整体结构清晰
3. **Given** 编辑器中有语法错误的 SQL，**When** 用户尝试格式化，**Then** 显示友好错误提示，原内容保持不变

---

### User Story 2 - 自动添加 LIMIT 保持格式 (Priority: P1)

当系统自动为没有 LIMIT 子句的 SELECT 语句添加 `LIMIT 1000` 时，添加的内容应该与原 SQL 的格式风格保持一致。如果原 SQL 是单行的，LIMIT 直接追加在末尾；如果原 SQL 是多行格式化的，LIMIT 应该独占一行并保持缩进。

**Why this priority**: 确保自动添加 LIMIT 不会破坏用户精心格式化的 SQL，这是用户明确提出的痛点。

**Independent Test**: 提交格式化的多行 SQL（无 LIMIT），检查返回的实际执行 SQL 格式。

**Acceptance Scenarios**:

1. **Given** 用户提交单行 SQL `SELECT * FROM users WHERE age > 18`，**When** 系统自动添加 LIMIT，**Then** 结果为 `SELECT * FROM users WHERE age > 18 LIMIT 1000`（单行）
2. **Given** 用户提交多行格式化 SQL：
   ```sql
   SELECT 
       id,
       name
   FROM users
   WHERE age > 18
   ```
   **When** 系统自动添加 LIMIT，**Then** 结果保持多行格式：
   ```sql
   SELECT 
       id,
       name
   FROM users
   WHERE age > 18
   LIMIT 1000
   ```
3. **Given** 用户提交的 SQL 已有 LIMIT 子句，**When** 系统处理，**Then** 不添加额外的 LIMIT，保持原样

---

### User Story 3 - 格式化选项（可选增强）(Priority: P3)

用户可以自定义格式化偏好，如关键字大小写（全大写/小写）、缩进风格（2空格/4空格/Tab）、逗号位置（行首/行尾）等。

**Why this priority**: 增强型功能，基础格式化功能优先。

**Independent Test**: 修改格式化设置，验证输出符合设置。

**Acceptance Scenarios**:

1. **Given** 用户设置关键字为小写，**When** 格式化 SQL，**Then** 所有关键字使用小写
2. **Given** 用户设置缩进为 2 空格，**When** 格式化 SQL，**Then** 缩进使用 2 空格

---

### Edge Cases

- 当 SQL 包含注释时，格式化应保留注释并正确放置
- 当 SQL 包含字符串字面量（带特殊字符）时，格式化不应修改字符串内容
- 当 SQL 为空或仅包含空白时，格式化不做任何操作
- 当 SQL 包含多条语句（分号分隔）时，分别格式化每条语句
- 当 SQL 已经格式化良好时，再次格式化不应产生变化（幂等性）

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 系统 MUST 在 SQL 编辑器工具栏提供"格式化"按钮
- **FR-002**: 系统 MUST 支持格式化快捷键（建议 Shift+Alt+F，与 VS Code 一致）
- **FR-003**: 系统 MUST 将 SQL 关键字转换为大写（SELECT, FROM, WHERE 等）
- **FR-004**: 系统 MUST 为主要子句（SELECT, FROM, WHERE, GROUP BY, ORDER BY, LIMIT）使用独立行
- **FR-005**: 系统 MUST 为嵌套内容（子查询、CASE WHEN、函数参数）使用适当缩进
- **FR-006**: 系统 MUST 在自动添加 LIMIT 时检测原 SQL 格式风格（单行/多行）
- **FR-007**: 系统 MUST 在添加 LIMIT 时保持与原 SQL 一致的格式风格
- **FR-008**: 系统 MUST 在格式化失败时保留原内容并显示错误提示
- **FR-009**: 系统 MUST 保留 SQL 中的注释内容

### Key Entities

- **SQL 语句**: 用户在编辑器中输入的 SQL 文本
- **格式化配置**: 定义格式化行为的参数集（缩进、大小写等）
- **LIMIT 子句**: 自动添加的结果限制语句

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 用户可以在 1 秒内完成任意长度 SQL 的格式化（1000 行以内）
- **SC-002**: 格式化后的 SQL 可读性显著提升（每个主要子句独占一行）
- **SC-003**: 自动添加 LIMIT 后，多行 SQL 保持原有的行结构
- **SC-004**: 格式化操作具有幂等性（多次格式化结果相同）
- **SC-005**: 格式化不改变 SQL 的语义（执行结果相同）

## Assumptions

- 用户使用的 SQL 方言为 MySQL 或 PostgreSQL（项目已支持的数据库类型）
- 格式化默认使用 4 空格缩进
- 格式化默认将关键字转为大写
- 格式化功能仅作用于编辑器当前内容，不自动保存
- 快捷键遵循常见 IDE 习惯（Shift+Alt+F）

## Out of Scope

- 不支持 SQL 语法高亮（已由 Monaco Editor 提供）
- 不支持 SQL 自动补全（可作为未来功能）
- 不支持自定义格式化规则（P3 优先级，可延后）
- 不支持批量格式化多个 SQL 文件

## Dependencies

- 依赖现有的 SQL 编辑器组件（Monaco Editor）
- 依赖现有的 LIMIT 自动添加逻辑（后端 sqlglot）

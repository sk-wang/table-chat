# Feature Specification: 显示数据库表和字段注释

**Feature Branch**: `002-display-schema-comments`  
**Created**: 2024-12-28  
**Status**: Draft  
**Input**: User description: "字段注释和表注释，要在合适的地方显示，比如查询结构，表结构树中。"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 在表结构树中查看表注释 (Priority: P1)

用户在侧边栏浏览数据库表结构时，能够看到每个表的注释说明，帮助快速理解表的用途。

**Why this priority**: 表注释是理解数据库结构的第一步，用户无需查询系统表即可了解表的业务含义。

**Independent Test**: 添加一个带有表注释的数据库，在侧边栏的表结构树中验证表注释是否正确显示。

**Acceptance Scenarios**:

1. **Given** 用户已连接到一个包含表注释的数据库, **When** 用户查看侧边栏的表结构树, **Then** 每个有注释的表名后面直接显示表注释（灰色文字）
2. **Given** 某个表没有注释, **When** 用户查看该表, **Then** 仅显示表名，无注释区域
3. **Given** 表注释超过50个字符, **When** 用户查看该表, **Then** 注释截断显示，悬浮时Tooltip显示完整内容

---

### User Story 2 - 在表结构树中查看字段注释 (Priority: P1)

用户展开表结构查看列信息时，能够看到每个字段的注释说明，帮助理解字段含义和业务规则。

**Why this priority**: 字段注释直接影响用户编写SQL时对数据的理解，减少查询错误。

**Independent Test**: 展开一个包含字段注释的表，验证字段注释是否正确显示在每个字段旁边。

**Acceptance Scenarios**:

1. **Given** 用户已连接到数据库并展开某个表, **When** 该表的字段有注释, **Then** 字段名称和类型后面直接显示字段注释（灰色文字）
2. **Given** 某个字段没有注释, **When** 用户查看该字段, **Then** 仅显示名称和数据类型
3. **Given** 字段注释超过30个字符, **When** 用户查看该字段, **Then** 注释截断显示，悬浮时Tooltip显示完整内容

---

### User Story 3 - 在查询结果表头显示字段注释 (Priority: P2)

用户执行SQL查询后，在结果表格的列头能够查看对应字段的注释，帮助理解查询结果中各列的含义。

**Why this priority**: 查询结果中的列注释增强数据可读性，但需要依赖元数据匹配，实现复杂度较高。

**Independent Test**: 执行一个SELECT查询，悬浮在结果列头上验证是否显示对应字段的注释。

**Acceptance Scenarios**:

1. **Given** 用户执行了 `SELECT * FROM table_with_comments`, **When** 查询成功返回结果, **Then** 结果表格的列头下方小字显示对应字段的注释
2. **Given** 查询涉及表达式或别名 (如 `SELECT name AS n`), **When** 无法匹配到原始字段注释, **Then** 列头不显示注释，正常显示列名

---

### User Story 4 - 查询结果表格列宽可拖拽调整 (Priority: P2)

用户在查看查询结果时，能够通过拖拽列边框调整列宽，以便更好地查看不同长度的数据内容。

**Why this priority**: 列宽调整是表格交互的基础功能，提升数据浏览体验，与注释显示功能配合使用效果更佳。

**Independent Test**: 执行查询后，拖拽任意列的边框验证列宽是否可调整。

**Acceptance Scenarios**:

1. **Given** 用户已执行查询并显示结果表格, **When** 用户将鼠标悬浮在列边框上, **Then** 鼠标指针变为左右拖拽样式（col-resize）
2. **Given** 用户拖拽列边框, **When** 用户松开鼠标, **Then** 列宽按拖拽方向调整并保持
3. **Given** 用户拖拽列宽到极小值, **When** 列宽小于最小值（如50px）, **Then** 列宽固定在最小值，不会完全隐藏

---

### Edge Cases

- 注释内容过长时如何显示？直接显示时截断（表注释50字符，列注释30字符），悬浮Tooltip显示完整内容
- 注释包含特殊字符（HTML标签、换行符）时如何处理？转义显示，保留格式
- 数据库不支持注释功能时如何处理？正常显示表/字段信息，注释区域为空
- 跨schema查询时如何匹配字段注释？根据schema.table.column三元组匹配

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 系统 MUST 在表结构树中直接显示表注释（灰色文字，如有）
- **FR-002**: 系统 MUST 在表结构树的列节点中直接显示字段注释（灰色文字，如有）
- **FR-003**: 系统 MUST 在查询结果表头下方显示字段注释（如有）
- **FR-004**: 系统 MUST 正确处理空注释、长注释和特殊字符注释
- **FR-005**: 系统 MUST 保持现有UI布局的整洁，注释不应干扰主要信息的展示
- **FR-006**: 系统 MUST 支持长注释截断（表50字符，列30字符）并通过Tooltip显示完整内容
- **FR-007**: 系统 MUST 支持查询结果表格列宽拖拽调整
- **FR-008**: 系统 MUST 设置列宽最小值（50px），防止列被完全隐藏

### Key Entities

- **表注释 (Table Comment)**: 描述表用途的文本，存储于数据库系统表，现已在 `TableMetadata.comment` 字段中
- **字段注释 (Column Comment)**: 描述字段含义的文本，存储于数据库系统表，现已在 `ColumnInfo.comment` 字段中

## Assumptions

1. 后端已正确提取并返回表注释和字段注释（通过 `DatabaseMetadata` API）
2. 现有前端类型定义已包含 `comment` 字段（`TableMetadata.comment` 和 `ColumnInfo.comment`）
3. 用户当前使用的数据库（PostgreSQL/MySQL）支持表和字段注释功能
4. 注释内容为纯文本，不需要支持富文本或Markdown格式

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 用户在表结构树中查看表注释的时间减少到1秒内（无需额外查询系统表）
- **SC-002**: 100%的有注释的表和字段在UI中可见其注释信息
- **SC-003**: 用户理解查询结果列含义的时间减少30%（通过列头注释提示）
- **SC-004**: 注释显示功能不影响现有UI的加载速度和响应性能

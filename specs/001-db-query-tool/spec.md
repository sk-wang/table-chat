# Feature Specification: 数据库查询工具

**Feature Branch**: `001-db-query-tool`  
**Created**: 2025-12-28  
**Status**: Draft  
**Input**: 用户添加 db url 连接数据库，获取 metadata，展示 table 和 view 信息，支持 SQL 查询和自然语言生成 SQL

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 添加数据库连接 (Priority: P1)

用户作为数据分析师，需要添加一个数据库连接字符串，以便系统能够连接到目标数据库并获取其结构信息。

**Why this priority**: 这是所有功能的基础，没有数据库连接就无法进行任何查询操作。

**Independent Test**: 可以通过输入一个有效的 PostgreSQL 连接字符串来测试，成功后应该能看到数据库的表和视图列表。

**Acceptance Scenarios**:

1. **Given** 用户在连接管理页面, **When** 输入有效的 PostgreSQL 连接字符串并点击连接, **Then** 系统显示连接成功并展示数据库中的表和视图列表
2. **Given** 用户输入无效的连接字符串, **When** 点击连接, **Then** 系统显示明确的错误信息说明连接失败原因
3. **Given** 用户已添加多个数据库连接, **When** 查看连接列表, **Then** 可以看到所有已保存的连接并能切换使用

---

### User Story 2 - 执行 SQL 查询 (Priority: P1)

用户作为数据分析师，需要在 SQL 编辑器中输入 SQL 查询语句，执行后以表格形式查看结果。

**Why this priority**: 这是产品的核心功能，直接满足用户查询数据的主要需求。

**Independent Test**: 可以通过在编辑器中输入一条 SELECT 语句并执行来测试，应该能看到查询结果以表格形式展示。

**Acceptance Scenarios**:

1. **Given** 用户已连接到数据库, **When** 在 SQL 编辑器中输入有效的 SELECT 语句并执行, **Then** 查询结果以表格形式展示
2. **Given** 用户输入包含语法错误的 SQL, **When** 点击执行, **Then** 系统显示具体的语法错误信息和位置
3. **Given** 用户输入 INSERT/UPDATE/DELETE 语句, **When** 点击执行, **Then** 系统拒绝执行并提示仅支持 SELECT 查询
4. **Given** 用户输入不包含 LIMIT 子句的查询, **When** 执行查询, **Then** 系统自动添加 LIMIT 1000 并正常返回结果

---

### User Story 3 - 自然语言生成 SQL (Priority: P2)

用户作为非技术人员，希望用自然语言描述查询需求，系统自动生成对应的 SQL 语句。

**Why this priority**: 这是产品的差异化功能，降低了 SQL 使用门槛，但依赖于基础查询功能的完成。

**Independent Test**: 可以通过输入"查询所有用户"这样的自然语言来测试，系统应生成对应的 SQL 并允许用户确认后执行。

**Acceptance Scenarios**:

1. **Given** 用户已连接到数据库, **When** 在自然语言输入框中描述查询需求, **Then** 系统生成对应的 SQL 语句并显示在编辑器中
2. **Given** 系统生成了 SQL 语句, **When** 用户查看生成的 SQL, **Then** 可以选择直接执行或修改后执行
3. **Given** 用户输入模糊的自然语言描述, **When** 系统无法确定具体查询意图, **Then** 系统提供多个可能的 SQL 选项供用户选择

---

### User Story 4 - 浏览数据库结构 (Priority: P2)

用户作为数据分析师，需要查看数据库中的表、视图及其字段结构，以便了解可用的数据。

**Why this priority**: 帮助用户理解数据结构，是编写正确 SQL 的前提，但不是必须的核心路径。

**Independent Test**: 可以通过连接数据库后查看左侧面板来测试，应该能看到表/视图列表，点击后能看到字段详情。

**Acceptance Scenarios**:

1. **Given** 用户已连接到数据库, **When** 查看数据库结构面板, **Then** 可以看到所有表和视图的列表
2. **Given** 用户在结构面板中, **When** 点击某个表或视图, **Then** 展示该表/视图的字段名称、类型等信息
3. **Given** 用户查看表结构, **When** 点击某个表名, **Then** 可以快速生成该表的基础 SELECT 查询

---

### Edge Cases

- 当数据库连接超时或断开时，系统应提示用户重新连接
- 当查询返回空结果时，显示"无数据"提示而非空白表格
- 当查询返回超过 1000 行时，显示分页或提示用户结果已被截断
- 当 LLM 服务不可用时，自然语言功能应显示友好的降级提示
- 当数据库 metadata 获取失败时，仍允许用户手动输入 SQL 查询

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 系统 MUST 允许用户添加、编辑、删除数据库连接配置
- **FR-002**: 系统 MUST 支持 PostgreSQL 数据库连接
- **FR-003**: 系统 MUST 在连接成功后自动获取数据库的表和视图 metadata
- **FR-004**: 系统 MUST 将连接配置和 metadata 持久化存储以便复用
- **FR-005**: 系统 MUST 提供 SQL 编辑器供用户输入查询语句
- **FR-006**: 系统 MUST 对用户输入的 SQL 进行语法验证
- **FR-007**: 系统 MUST 仅允许执行 SELECT 语句，拒绝其他 DML/DDL 操作
- **FR-008**: 系统 MUST 在查询无 LIMIT 子句时自动添加 LIMIT 1000
- **FR-009**: 系统 MUST 以表格形式展示查询结果
- **FR-010**: 系统 MUST 提供自然语言到 SQL 的转换功能
- **FR-011**: 系统 MUST 在 SQL 语法错误时显示具体的错误信息
- **FR-012**: 系统 MUST 展示数据库的表和视图结构信息（表名、字段名、字段类型）

### Key Entities

- **DatabaseConnection**: 表示一个数据库连接配置，包含名称、连接字符串、创建时间、最后使用时间
- **TableMetadata**: 表示一个数据库表的结构信息，包含表名、所属 schema、字段列表、创建时间
- **ViewMetadata**: 表示一个数据库视图的结构信息，包含视图名、所属 schema、字段列表、定义查询
- **ColumnInfo**: 表示一个字段的信息，包含字段名、数据类型、是否可空、是否主键、注释
- **QueryHistory**: 表示一条查询历史记录，包含 SQL 语句、执行时间、执行结果状态

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 用户能在 30 秒内完成数据库连接配置
- **SC-002**: 数据库 metadata 获取在 10 秒内完成（100 张表以内）
- **SC-003**: SQL 查询结果在 5 秒内返回（LIMIT 1000 以内）
- **SC-004**: 自然语言生成 SQL 在 3 秒内返回结果
- **SC-005**: 90% 的用户能在首次使用时成功执行一条查询
- **SC-006**: SQL 语法验证准确率达到 100%（不允许非 SELECT 语句执行）
- **SC-007**: 系统支持同时管理至少 10 个数据库连接

## Assumptions

- 用户具备基本的 SQL 知识或愿意使用自然语言功能
- 目标数据库为 PostgreSQL，后续版本可能扩展支持其他数据库
- LLM 服务（OpenAI）可用且 API Key 已配置
- 用户的查询主要用于数据分析，不涉及数据修改
- 单次查询结果量在合理范围内（通过 LIMIT 1000 约束）

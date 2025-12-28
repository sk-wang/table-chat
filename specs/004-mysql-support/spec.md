# Feature Specification: MySQL 数据库支持

**Feature Branch**: `004-mysql-support`  
**Created**: 2025-12-28  
**Status**: Draft  
**Input**: 参考 backend 中的 PostgreSQL 实现，实现 MySQL 的 metadata 提取和查询支持，同时自然语言生成也支持 MySQL。由于之前实现只考虑了 PostgreSQL，在新实现 MySQL 功能时，要注意 SOLID 原则，必要时进行代码的重构。

## Overview

当前系统仅支持 PostgreSQL 数据库。本功能将扩展系统以支持 MySQL 数据库，使用户能够连接、浏览和查询 MySQL 数据库，并使用自然语言生成 MySQL 查询语句。

## Clarifications

### Session 2025-12-28

- Q: MySQL 连接超时时间应设为多少？ → A: 10 秒（行业标准，平衡响应速度与容错）
- Q: 连接凭证（密码）如何存储？ → A: 加密存储（使用应用密钥加密后存储）

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 连接 MySQL 数据库 (Priority: P1)

作为用户，我希望能够添加 MySQL 数据库连接，就像现在添加 PostgreSQL 一样，这样我可以管理多种类型的数据库。

**Why this priority**: 这是所有其他 MySQL 功能的基础。没有连接能力，后续的元数据浏览、查询执行等功能都无法实现。

**Independent Test**: 可以通过尝试添加一个 MySQL 连接字符串（如 `mysql://user:password@host:3306/database`）并验证连接成功来独立测试。

**Acceptance Scenarios**:

1. **Given** 用户在数据库管理页面, **When** 输入有效的 MySQL 连接字符串并保存, **Then** 系统验证连接成功并保存该数据库配置
2. **Given** 用户输入无效的 MySQL 连接字符串, **When** 尝试保存, **Then** 系统显示清晰的错误信息说明连接失败原因
3. **Given** 用户输入 MySQL 连接字符串, **When** MySQL 服务器不可达, **Then** 系统在 10 秒内超时并显示友好的错误提示

---

### User Story 2 - 浏览 MySQL 数据库元数据 (Priority: P1)

作为用户，我希望能够浏览 MySQL 数据库的结构（数据库、表、列、注释），以便了解数据模型并编写查询。

**Why this priority**: 元数据浏览是使用数据库的核心功能，用户需要了解表结构才能有效地进行查询。

**Independent Test**: 连接到一个已有表结构的 MySQL 数据库后，验证能够看到数据库中的所有表及其列信息。

**Acceptance Scenarios**:

1. **Given** 已成功连接的 MySQL 数据库, **When** 用户请求刷新元数据, **Then** 系统显示所有数据库/表/视图列表
2. **Given** MySQL 数据库包含表和视图, **When** 用户查看某个表, **Then** 系统显示该表的所有列、数据类型、是否可空、主键标识
3. **Given** MySQL 表/列包含注释（COMMENT）, **When** 用户查看元数据, **Then** 系统正确显示这些注释信息
4. **Given** 用户已获取元数据, **When** 再次访问同一数据库, **Then** 系统使用缓存的元数据（除非用户强制刷新）

---

### User Story 3 - 执行 MySQL 查询 (Priority: P1)

作为用户，我希望能够对 MySQL 数据库执行 SQL 查询，并查看结果。

**Why this priority**: 查询执行是数据库工具的核心功能，直接影响用户的工作效率。

**Independent Test**: 对连接的 MySQL 数据库输入一条 SELECT 语句，验证能够获得正确的查询结果。

**Acceptance Scenarios**:

1. **Given** 已连接的 MySQL 数据库, **When** 用户输入有效的 SELECT 查询, **Then** 系统执行查询并显示结果
2. **Given** 用户输入不带 LIMIT 的查询, **When** 执行查询, **Then** 系统自动添加结果数量限制以保护系统性能
3. **Given** 用户输入非 SELECT 语句（如 INSERT/UPDATE/DELETE）, **When** 尝试执行, **Then** 系统拒绝执行并提示只允许 SELECT 查询
4. **Given** 用户输入语法错误的 SQL, **When** 尝试执行, **Then** 系统显示清晰的语法错误信息

---

### User Story 4 - MySQL 自然语言查询生成 (Priority: P2)

作为用户，我希望能够用自然语言描述查询需求，系统自动生成对应的 MySQL 查询语句。

**Why this priority**: 自然语言生成提升用户体验，但核心的连接、元数据、查询功能更为基础。

**Independent Test**: 对 MySQL 数据库输入自然语言描述（如"查询所有年龄大于 30 的用户"），验证系统生成有效的 MySQL SELECT 语句。

**Acceptance Scenarios**:

1. **Given** 已连接的 MySQL 数据库且已缓存元数据, **When** 用户输入自然语言查询描述, **Then** 系统生成符合 MySQL 语法的 SELECT 查询
2. **Given** 生成的查询, **When** 用户确认执行, **Then** 系统执行该查询并显示结果
3. **Given** 自然语言描述不清晰, **When** 系统生成查询, **Then** 同时提供查询解释帮助用户理解

---

### Edge Cases

- 当 MySQL 数据库没有任何表时，系统应友好地提示"数据库为空"
- 当 MySQL 版本较低（如 5.x）时，元数据提取应保持兼容
- 当 MySQL 使用非标准端口时，连接字符串解析应正确处理
- 当 MySQL 表名或列名包含特殊字符或中文时，系统应正确处理
- 当同时存在 PostgreSQL 和 MySQL 数据库时，用户应能区分它们
- 当 MySQL 连接意外断开时，系统应在下次操作时给出清晰的重连提示

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 系统 MUST 支持 MySQL 连接字符串格式（`mysql://user:password@host:port/database`）
- **FR-002**: 系统 MUST 在保存连接前验证 MySQL 数据库可连接
- **FR-003**: 系统 MUST 能够提取 MySQL 数据库的元数据，包括：数据库、表、视图、列、数据类型、主键、注释
- **FR-004**: 系统 MUST 缓存 MySQL 元数据以提高性能
- **FR-005**: 系统 MUST 支持对 MySQL 数据库执行 SELECT 查询
- **FR-006**: 系统 MUST 阻止对 MySQL 数据库执行非 SELECT 语句
- **FR-007**: 系统 MUST 为无 LIMIT 的 MySQL 查询自动添加结果限制
- **FR-008**: 系统 MUST 支持为 MySQL 数据库生成自然语言 SQL 查询
- **FR-009**: 系统 MUST 根据连接字符串自动识别数据库类型（PostgreSQL vs MySQL）
- **FR-010**: 系统 MUST 在数据库列表中显示数据库类型标识
- **FR-011**: 系统 MUST 使用应用密钥加密存储数据库连接凭证（密码）

### Key Entities

- **数据库连接**: 包含名称、连接字符串、数据库类型（PostgreSQL/MySQL）、创建时间
- **数据库元数据**: 包含数据库名、模式/数据库列表、表列表、表类型（表/视图）、表注释
- **列元数据**: 包含列名、数据类型、是否可空、是否主键、默认值、列注释

## Assumptions

- MySQL 5.7+ 及 MySQL 8.x 版本均需支持
- 用户提供的 MySQL 连接字符串包含有效的认证信息
- MySQL 数据库服务器允许来自应用服务器的网络连接
- 用户连接的 MySQL 数据库权限至少包含读取元数据和执行 SELECT 的权限
- 系统的 SQL 注入防护机制同样适用于 MySQL

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 用户可以在 30 秒内完成添加一个新的 MySQL 数据库连接
- **SC-002**: MySQL 元数据提取时间与 PostgreSQL 同等规模数据库的提取时间相当（误差不超过 50%）
- **SC-003**: 对于 100 个表以下的 MySQL 数据库，元数据首次加载不超过 10 秒
- **SC-004**: 用户对 MySQL 执行的查询响应时间与直接使用 MySQL 客户端查询的响应时间相当（额外开销不超过 500ms）
- **SC-005**: 自然语言生成的 MySQL 查询语法正确率达到 95%（基于典型的 CRUD 查询场景）
- **SC-006**: 用户无需了解底层数据库类型差异即可使用系统的核心功能（连接、浏览、查询）

# Feature Specification: MySQL SSL 模式配置支持

**Feature Branch**: `005-mysql-ssl-disable`  
**Created**: 2025-12-29  
**Status**: Draft  
**Input**: MySQL 需要支持 SSL mode disable，以解决 SSL connection error: unsupported protocol 错误

## Overview

当前系统的 MySQL 连接器在某些环境下会遇到 SSL 连接错误（`SSL connection error: error:0A000102:SSL routines::unsupported protocol`），这通常发生在 MySQL 服务器 SSL 版本与客户端不兼容时。本功能将在数据库连接配置界面添加 SSL 模式选项，允许用户通过可视化界面禁用 SSL 以绕过兼容性问题。

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 在界面上配置 SSL 模式 (Priority: P1)

作为用户，当我添加或编辑 MySQL 数据库连接时，我希望能够在界面上看到 SSL 配置选项，以便根据我的数据库环境选择是否禁用 SSL。

**Why this priority**: 用户需要直观、易用的方式来解决 SSL 兼容性问题，可视化配置是最佳用户体验。

**Independent Test**: 在添加 MySQL 数据库连接的表单中，能够看到并使用 SSL 禁用选项。

**Acceptance Scenarios**:

1. **Given** 用户在添加 MySQL 数据库连接界面, **When** 选择数据库类型为 MySQL, **Then** 界面显示"禁用 SSL"复选框选项
2. **Given** 用户勾选"禁用 SSL"选项, **When** 保存连接, **Then** 系统使用禁用 SSL 的方式连接 MySQL
3. **Given** 用户未勾选"禁用 SSL"选项, **When** 保存连接, **Then** 系统使用默认 SSL 行为连接 MySQL
4. **Given** 用户编辑已有的 MySQL 连接, **When** 打开编辑界面, **Then** SSL 配置选项显示当前保存的状态

---

### User Story 2 - 禁用 SSL 成功连接 (Priority: P1)

作为用户，当我遇到 MySQL SSL 协议不支持的错误时，我希望通过禁用 SSL 选项来成功连接数据库，以便正常使用系统功能。

**Why this priority**: 这是用户当前遇到的阻塞性问题，无法连接数据库意味着完全无法使用系统。

**Independent Test**: 对一个 SSL 不兼容的 MySQL 服务器，通过勾选禁用 SSL 选项成功建立连接。

**Acceptance Scenarios**:

1. **Given** 用户有一个 SSL 不兼容的 MySQL 服务器, **When** 用户勾选"禁用 SSL"并保存连接, **Then** 系统成功连接到 MySQL 数据库
2. **Given** 用户使用禁用 SSL 的连接, **When** 执行元数据获取和查询操作, **Then** 所有功能正常工作
3. **Given** 连接 SSL 不兼容的服务器但未勾选禁用 SSL, **When** 尝试连接, **Then** 系统显示清晰的 SSL 错误信息

---

### Edge Cases

- 当 MySQL 服务器强制要求 SSL 而用户禁用了 SSL 时，系统应显示清晰的错误信息说明原因
- 当用户从 PostgreSQL 切换到 MySQL 类型时，SSL 选项应正确显示
- 禁用 SSL 选项仅对 MySQL 数据库显示，PostgreSQL 不显示此选项

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 系统 MUST 在 MySQL 数据库连接配置界面提供"禁用 SSL"复选框
- **FR-002**: 系统 MUST 将 SSL 禁用配置与数据库连接信息一起保存
- **FR-003**: 当用户勾选"禁用 SSL"时，系统 MUST 在 MySQL 连接中设置禁用 SSL 配置
- **FR-004**: 当"禁用 SSL"未勾选时，系统 MUST 保持现有的默认 SSL 行为
- **FR-005**: 系统 MUST 在测试连接、获取元数据、执行查询三个操作中一致地应用 SSL 配置
- **FR-006**: 编辑已有 MySQL 连接时，系统 MUST 正确回显 SSL 配置状态
- **FR-007**: "禁用 SSL"选项 MUST 仅对 MySQL 类型数据库显示

### Key Entities

- **数据库连接配置**: 扩展现有实体，增加 ssl_disabled 布尔属性（仅适用于 MySQL）

## Assumptions

- 用户了解禁用 SSL 可能带来的安全风险（数据传输不加密）
- 需要禁用 SSL 的场景主要是：开发/测试环境、内网数据库、SSL 版本不兼容
- 默认不勾选"禁用 SSL"，保持安全优先原则

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 用户可以通过界面选项在 5 秒内完成 SSL 配置
- **SC-002**: 禁用 SSL 后的连接、元数据获取、查询执行功能 100% 正常工作
- **SC-003**: 现有数据库连接行为保持不变（向后兼容）
- **SC-004**: 用户无需了解技术细节即可通过界面选项解决 SSL 兼容性问题

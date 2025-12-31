# Feature Specification: SSH 隧道连接支持

**Feature Branch**: `013-ssh-tunnel`  
**Created**: 2025-12-31  
**Status**: Draft  
**Input**: User description: "需要支持 OVER SSH，以访问一些不能直连的数据库"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 通过 SSH 隧道连接远程数据库 (Priority: P1)

用户需要连接位于内网的数据库服务器，该服务器只能通过跳板机（SSH 服务器）访问。用户在添加数据库连接时，启用 SSH 隧道选项，填写跳板机的连接信息，系统自动建立 SSH 隧道并通过隧道连接到目标数据库。

**Why this priority**: 这是核心需求，没有这个功能用户无法访问任何需要 SSH 隧道的数据库。

**Independent Test**: 可以通过配置一台需要 SSH 跳板机访问的测试数据库来独立测试，验证连接成功后能正常执行查询。

**Acceptance Scenarios**:

1. **Given** 用户打开添加数据库对话框，**When** 用户启用"SSH 隧道"选项，**Then** 显示 SSH 连接配置表单（主机、端口、用户名、认证方式）
2. **Given** 用户填写了有效的 SSH 跳板机信息和数据库连接信息，**When** 用户点击"添加"按钮，**Then** 系统建立 SSH 隧道并成功连接数据库，显示成功提示
3. **Given** SSH 跳板机配置错误（如主机不可达或认证失败），**When** 用户点击"添加"按钮，**Then** 显示明确的错误信息说明 SSH 连接失败原因

---

### User Story 2 - 使用 SSH 密钥认证 (Priority: P1)

用户的跳板机使用 SSH 密钥认证而非密码认证。用户需要能够选择密钥认证方式，并提供私钥内容（或上传私钥文件内容）。

**Why this priority**: 企业环境中密钥认证比密码认证更常用，是核心认证方式之一。

**Independent Test**: 可以使用配置了 SSH 密钥认证的跳板机进行独立测试。

**Acceptance Scenarios**:

1. **Given** 用户启用 SSH 隧道，**When** 用户选择"密钥认证"方式，**Then** 显示私钥输入区域（支持粘贴私钥内容）和可选的密钥密码输入框
2. **Given** 用户填写了有效的私钥，**When** 私钥有密码保护，**Then** 用户需要输入密钥密码才能成功连接
3. **Given** 用户提供了无效或格式错误的私钥，**When** 用户尝试连接，**Then** 显示明确的错误信息说明密钥无效

---

### User Story 3 - 使用密码认证连接 SSH (Priority: P2)

用户的跳板机使用传统的密码认证方式。用户选择密码认证后输入 SSH 密码即可。

**Why this priority**: 密码认证虽然不如密钥认证安全，但在某些环境中仍然使用，需要支持。

**Independent Test**: 可以使用支持密码认证的 SSH 服务器进行独立测试。

**Acceptance Scenarios**:

1. **Given** 用户启用 SSH 隧道，**When** 用户选择"密码认证"方式，**Then** 显示密码输入框
2. **Given** 用户输入正确的 SSH 用户名和密码，**When** 用户点击添加，**Then** 成功建立 SSH 隧道并连接数据库

---

### User Story 4 - 编辑已有的 SSH 隧道配置 (Priority: P2)

用户需要修改已配置的数据库连接的 SSH 隧道设置，如更换跳板机地址、更新密钥、或从非 SSH 连接改为 SSH 连接。

**Why this priority**: 支持修改配置是完整用户体验的重要部分。

**Independent Test**: 可以通过先添加一个带 SSH 隧道的连接，然后编辑其配置来独立测试。

**Acceptance Scenarios**:

1. **Given** 用户已有一个配置了 SSH 隧道的数据库连接，**When** 用户点击编辑，**Then** SSH 隧道配置（除敏感信息外）被正确回显
2. **Given** 用户编辑 SSH 配置，**When** 用户保存更改，**Then** 新的 SSH 配置生效，可以正常连接

---

### Edge Cases

- 当 SSH 连接建立后但数据库连接失败时，应明确区分是 SSH 连接问题还是数据库连接问题
- 当 SSH 会话超时或断开时，当前查询失败并提示用户重试；下次查询时自动尝试重建隧道
- 当用户提供的私钥格式不受支持时，应给出具体的格式要求提示
- 当目标数据库端口在 SSH 服务器上不可达时，应给出明确的端口不可达错误

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 系统 MUST 在添加/编辑数据库连接时提供"启用 SSH 隧道"选项
- **FR-002**: 系统 MUST 支持 SSH 密钥认证方式（私钥 + 可选密码）
- **FR-003**: 系统 MUST 支持 SSH 密码认证方式
- **FR-004**: 系统 MUST 收集以下 SSH 连接信息：主机地址、端口（默认22）、用户名
- **FR-005**: 系统 MUST 在保存连接前测试 SSH 隧道和数据库连接的连通性
- **FR-006**: 系统 MUST 存储 SSH 认证凭证（密码或私钥），采用与现有数据库密码相同的存储策略（SQLite 存储，不额外加密）
- **FR-007**: 系统 MUST 在查询执行时自动管理 SSH 隧道的建立和维护
- **FR-008**: 系统 MUST 同时支持 PostgreSQL 和 MySQL 通过 SSH 隧道连接
- **FR-009**: 系统 MUST 在 SSH 连接失败时提供明确的错误信息
- **FR-010**: 系统 MUST 支持编辑已有连接的 SSH 隧道配置
- **FR-011**: 系统 MUST 记录 SSH 连接关键事件到应用日志（连接成功/失败、断开、重连尝试）

### Key Entities

- **SSH 隧道配置**: 包含 SSH 主机、端口、用户名、认证方式（密码/密钥）、认证凭证；与数据库连接 1:1 绑定
- **数据库连接**: 现有实体，扩展内嵌可选的 SSH 隧道配置字段（非独立引用）

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 用户可以在 2 分钟内完成带 SSH 隧道的数据库连接配置
- **SC-002**: 通过 SSH 隧道连接的数据库，查询响应时间增加不超过 500ms（相对于直连）
- **SC-003**: SSH 连接失败时，用户能在 5 秒内看到明确的错误提示
- **SC-004**: 支持 OpenSSH 格式的 RSA、ECDSA、Ed25519 私钥
- **SC-005**: SSH 隧道在空闲时保持活跃，避免频繁重连影响用户体验

## Clarifications

### Session 2025-12-31

- Q: SSH 凭证存储安全策略？ → A: 与现有数据库密码相同策略（直接存入 SQLite，不额外加密）
- Q: SSH 配置与数据库连接的关系？ → A: 1:1 绑定（每个数据库连接独立保存 SSH 配置）
- Q: SSH 隧道断开时的行为？ → A: 查询失败并提示用户重试
- Q: SSH 连接日志记录？ → A: 记录关键事件到应用日志（连接成功/失败、断开、重连尝试）

## Assumptions

- 用户的 SSH 跳板机支持标准的 SSH 协议（SSH-2）
- 用户了解如何获取 SSH 服务器的连接信息和认证凭证
- SSH 跳板机允许端口转发（TCP forwarding）功能
- 私钥文件采用 OpenSSH 格式或 PEM 格式
- SSH 连接超时采用合理的默认值（如 30 秒）
- 数据库连接 URL 中的 host 在 SSH 隧道模式下指的是从 SSH 服务器视角的数据库地址（通常为内网地址或 localhost）

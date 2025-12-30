# Feature Specification: Claude Agent SQL 模式

**Feature Branch**: `011-claude-agent-sql`  
**Created**: 2025-12-30  
**Status**: Draft  
**Input**: User description: "利用Claude Code SDK完成SQL生成，添加Agent模式，与普通模式并存可切换，通过工具探索数据库生成SQL，工具只能执行SELECT查询，前端模仿Claude Code VSCode插件交互方式"

## 用户场景与测试 *(mandatory)*

### 用户故事 1 - 切换到 Agent 模式生成 SQL (Priority: P1)

用户在使用自然语言查询功能时，可以选择切换到 Agent 模式。在 Agent 模式下，系统会启动一个智能代理，通过对话式交互帮助用户探索数据库并生成准确的 SQL 查询。代理可以主动查询数据库结构、执行示例查询来验证理解，并逐步优化生成的 SQL。

**Why this priority**: 这是功能的核心价值，没有模式切换和 Agent 对话功能，其他功能无法独立存在。

**Independent Test**: 可以通过切换到 Agent 模式、输入自然语言请求、观察代理的探索过程和最终生成的 SQL 来完整测试。

**Acceptance Scenarios**:

1. **Given** 用户已连接数据库, **When** 用户点击 "Agent" 选项卡, **Then** 界面从自然语言输入切换到 Agent 对话式交互界面
2. **Given** 用户处于 Agent 模式, **When** 用户输入 "帮我查询订单总金额", **Then** 代理开始对话式探索，显示思考过程和工具调用，最终生成对应的 SQL
3. **Given** 用户输入 "帮我给订单表的用户ID字段加个索引", **When** 代理完成探索, **Then** 生成 CREATE INDEX 语句供用户在其他工具执行

---

### 用户故事 2 - 查看代理探索过程 (Priority: P2)

用户在 Agent 模式下可以实时看到代理的"思考"过程，包括代理决定查询哪些表结构、执行了哪些示例查询、以及如何一步步推理出最终的 SQL。这种透明性帮助用户理解查询逻辑并建立对结果的信任。

**Why this priority**: 透明度是 Agent 模式区别于普通模式的关键差异化特性，也是用户信任代理的基础。

**Independent Test**: 可以通过发起一个 Agent 请求，观察展开/折叠思考过程面板来验证。

**Acceptance Scenarios**:

1. **Given** 代理正在处理用户请求, **When** 代理调用工具查询表结构, **Then** 界面显示"正在查询表结构..."等状态提示
2. **Given** 代理完成一次工具调用, **When** 用户查看对话历史, **Then** 可以看到工具调用的输入和输出结果
3. **Given** 代理生成了最终 SQL, **When** 用户展开思考过程, **Then** 可以看到代理的完整推理链路

---

### 用户故事 3 - 在两种模式间自由切换 (Priority: P3)

用户可以通过选项卡在"自然语言"和"Agent"模式之间随时切换。切换模式后，SQL 编辑器的内容保持不变，用户可以继续使用切换后的模式进行新的查询。

**Why this priority**: 提供灵活性，让用户根据需求选择合适的模式。

**Independent Test**: 可以通过点击不同选项卡来回切换，验证界面正确响应且编辑器内容不丢失。

**Acceptance Scenarios**:

1. **Given** 用户在 Agent 模式下已生成 SQL, **When** 用户点击"自然语言"选项卡, **Then** 生成的 SQL 保留在编辑器中可继续编辑执行
2. **Given** 用户在自然语言模式下有 SQL 内容, **When** 用户点击"Agent"选项卡, **Then** SQL 编辑器内容不丢失

---

### 边缘场景

- 代理探索过程超时怎么办？系统应显示超时提示并允许用户中断或重试
- 如果代理通过工具尝试执行数据修改语句会发生什么？工具应拒绝执行并返回错误，代理需要调整为只读查询
- 网络断开时 Agent 模式如何处理？应优雅降级并显示连接错误提示
- 用户在代理处理过程中发送新请求怎么办？应排队处理或允许用户取消当前任务
- 代理生成的 DDL 语句（如 CREATE INDEX）如何处理？填充到编辑器供用户复制，但不在本系统执行

## 需求 *(mandatory)*

### 功能需求

- **FR-001**: 系统 MUST 提供普通模式和 Agent 模式两种自然语言转 SQL 的方式
- **FR-002**: 前端 MUST 提供选项卡界面，"自然语言" 和 "Agent" 作为同级选项卡供用户切换
- **FR-003**: Agent 模式 MUST 使用 Claude Code SDK 与配置的 LLM API 通信
- **FR-004**: 系统 MUST 为代理提供一个探索数据库的工具，支持执行只读查询（SELECT、DESCRIBE、SHOW 等元数据查询）
- **FR-005**: 探索工具 MUST 拒绝执行数据修改语句（INSERT、UPDATE、DELETE）和 DDL 语句，并返回明确的错误信息
- **FR-006**: 代理 MUST 能够通过工具获取数据库的表结构信息（表名、列名、类型、索引、注释等）
- **FR-007**: 代理 MUST 能够执行示例查询来验证对数据结构的理解
- **FR-008**: 代理最终生成的 SQL 可以是任意类型（SELECT、CREATE INDEX、ALTER TABLE 等），由用户自行在其他工具执行
- **FR-009**: 前端 MUST 实时显示代理的处理状态（思考中、执行工具中、生成结果中）
- **FR-010**: 前端 MUST 显示代理的工具调用历史，包括调用的工具名称、参数和结果
- **FR-011**: Agent 模式生成的 SQL MUST 能够填充到 SQL 编辑器中供用户查看和复制
- **FR-012**: 系统 MUST 支持用户中断正在进行的代理任务
- **FR-013**: 代理配置（API URL 和认证信息）MUST 从环境变量读取

### 关键实体

- **AgentSession**: 代表一次 Agent 模式的会话，包含会话 ID、开始时间、状态、消息历史
- **ToolCall**: 代表代理执行的一次工具调用，包含工具名称、输入参数、输出结果、执行时间
- **AgentMessage**: 代表对话中的一条消息，包含角色（用户/代理/工具）、内容、时间戳

## 成功标准 *(mandatory)*

### 可衡量结果

- **SC-001**: 用户能在 3 秒内通过选项卡完成模式切换，界面响应流畅无卡顿
- **SC-002**: Agent 模式对于常见场景（查询、建索引、表结构探索），能在 30 秒内生成有效的 SQL
- **SC-003**: 探索工具对数据修改语句（INSERT/UPDATE/DELETE/DDL）的拦截成功率达到 100%
- **SC-004**: 用户在 Agent 模式下能清晰看到代理的探索过程，无需额外说明即可理解代理在做什么
- **SC-005**: 80% 的用户在首次使用 Agent 模式时能够成功生成所需的 SQL 查询

## 假设

- Claude Code SDK 兼容配置的 API 端点（ANTHROPIC_BASE_URL）
- API 认证 token（ANTHROPIC_AUTH_TOKEN）已正确配置
- 现有的数据库连接和元数据服务可被 Agent 工具复用
- 用户对 Agent 对话式交互有基本的认知，知道需要等待代理响应

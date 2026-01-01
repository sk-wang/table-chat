# Feature Specification: 统一 LLM API 配置格式

**Feature Branch**: `018-unified-llm-api`  
**Created**: 2026-01-01  
**Status**: Draft  
**Input**: User description: "统一LLM_API_BASE和AGENT_API_BASE，都默认用Anthropic的格式，但是也可以配置openai的格式，docker compose引入 claude-code-proxy，转换openai的接口到Anthropic格式。如果配的本来就是Anthropic格式就不用转换了，所以要新加一个api类型的环境变量"

## Clarifications

### Session 2026-01-01

- Q: claude-code-proxy 服务的 API Key 如何安全传递？ → A: 继续沿用现有 `.env` 模式，通过同一个 `.env` 文件传递所有 API Key（包括 OPENAI_API_KEY）
- Q: claude-code-proxy 版本策略？ → A: 固定到特定版本标签，手动升级
- Q: 非 Docker 部署的 OpenAI 模式支持？ → A: 文档说明非 Docker 用户需自行部署 claude-code-proxy
- Q: 代理层可观测性需求？ → A: 代理日志输出到 Docker 标准日志（docker logs 可查看）
- Q: 统一配置后的默认模型？ → A: 使用 `claude-sonnet-4-5-20250929`（当前 Agent 默认）

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 使用 Anthropic API（默认场景）(Priority: P1)

管理员使用 Anthropic 官方 API 或兼容 Anthropic 格式的第三方服务部署 TableChat。这是最简单的默认配置路径，无需额外转换层。

**Why this priority**: 这是最核心的使用场景，Anthropic 格式作为默认选项，用户开箱即用，配置最简单。

**Independent Test**: 可通过设置 Anthropic API Key 并启动服务，验证 LLM 和 Agent 功能均正常工作来独立测试。

**Acceptance Scenarios**:

1. **Given** 用户设置了 `LLM_API_KEY` 为有效的 Anthropic API Key，**When** 用户不设置 `LLM_API_TYPE` 或设置为 `anthropic`，**Then** 系统使用 Anthropic Python Client 直接调用 API，无需经过代理转换。

2. **Given** 用户同时配置了 LLM 和 Agent 相关环境变量（统一后的变量），**When** 用户使用 SQL 生成功能和 Agent 模式，**Then** 两个功能都使用相同的 API 配置正常工作。

3. **Given** 用户仅设置了 API Key 未设置 Base URL，**When** 系统启动，**Then** 默认使用 Anthropic 官方 API 地址 `https://api.anthropic.com`。

---

### User Story 2 - 使用 OpenAI 格式 API + 代理转换 (Priority: P2)

管理员现有的 LLM 服务仅支持 OpenAI API 格式（如 Azure OpenAI、本地部署的 vLLM、OpenRouter 等），需要通过代理层转换为 Anthropic 格式供 TableChat 使用。

**Why this priority**: 支持更广泛的 LLM 服务生态，特别是企业用户常用的 Azure OpenAI 和各类开源模型部署方案。

**Independent Test**: 可通过配置 OpenAI 格式的 API 端点和 claude-code-proxy 服务，验证请求被正确转换并获得响应。

**Acceptance Scenarios**:

1. **Given** 用户设置 `LLM_API_TYPE=openai` 并配置 OpenAI 格式的 API 信息，**When** Docker Compose 启动服务栈，**Then** claude-code-proxy 服务自动启动并将请求从 Anthropic 格式转换为 OpenAI 格式。

2. **Given** claude-code-proxy 服务正在运行，**When** 应用发送 Anthropic 格式的请求，**Then** 代理将其转换为 OpenAI 格式并返回正确响应。

3. **Given** 用户的 OpenAI 兼容服务返回错误，**When** 代理收到错误响应，**Then** 错误信息被正确传递到应用层并显示给用户。

---

### User Story 3 - 配置验证与错误提示 (Priority: P3)

管理员在配置 API 时可能出现格式不匹配或配置错误，系统需要提供清晰的验证和错误提示。

**Why this priority**: 良好的错误提示能减少用户配置时间和运维成本，提升用户体验。

**Independent Test**: 可通过故意配置错误的 API 类型组合，验证系统返回明确的错误信息。

**Acceptance Scenarios**:

1. **Given** 用户设置了 `LLM_API_TYPE=openai` 但未在 Docker Compose 中启用代理服务，**When** 应用启动，**Then** 系统提示需要代理服务或建议切换 API 类型。

2. **Given** 用户设置了无效的 `LLM_API_TYPE` 值（非 `anthropic` 或 `openai`），**When** 应用读取配置，**Then** 系统返回明确的错误信息说明支持的选项。

---

### Edge Cases

- **代理服务不可用时的降级处理**：当配置为 OpenAI 模式但代理服务未启动或不可达时，应有明确的错误提示，不应静默失败。
- **API Key 格式校验**：虽然不验证 Key 的有效性，但可以对明显格式错误的 Key 给出警告。
- **混合配置场景**：用户可能想 LLM 功能用 Anthropic、Agent 功能用 OpenAI（或反过来），当前设计统一配置，需明确这是有意为之的简化。
- **代理健康检查**：Docker Compose 中代理服务应有健康检查，后端服务应依赖代理服务健康。

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 系统 MUST 提供统一的 LLM API 配置，使用单一的 `LLM_API_BASE`、`LLM_API_KEY`、`LLM_MODEL`（默认 `claude-sonnet-4-5-20250929`）环境变量同时服务于 SQL 生成和 Agent 功能。

- **FR-002**: 系统 MUST 提供 `LLM_API_TYPE` 环境变量，支持 `anthropic`（默认）和 `openai` 两个选项。

- **FR-003**: 当 `LLM_API_TYPE=anthropic` 时，系统 MUST 使用 Anthropic Python Client 直接调用 API。

- **FR-004**: 当 `LLM_API_TYPE=openai` 时，系统 MUST 通过 claude-code-proxy 代理转换请求格式。

- **FR-005**: Docker Compose 配置 MUST 包含 claude-code-proxy 服务（使用固定版本标签），通过共享的 `.env` 文件传递 API Key，并正确配置服务依赖。

- **FR-006**: 系统 MUST 在 `LLM_API_BASE` 未设置时，根据 `LLM_API_TYPE` 使用合理的默认值（anthropic: `https://api.anthropic.com`，openai: 本地代理地址）。

- **FR-007**: 系统 MUST 保持向后兼容，支持现有的 `AGENT_API_KEY`、`AGENT_API_BASE` 等环境变量作为别名。

- **FR-008**: 系统 MUST 在配置错误时提供清晰的错误消息，指导用户正确配置。

- **FR-009**: claude-code-proxy 服务 MUST 将日志输出到 Docker 标准输出，可通过 `docker logs` 查看。

### Key Entities

- **LLM 配置（LLM Configuration）**: 统一的 API 连接配置，包含 API 地址、密钥、模型名称和 API 类型。
- **claude-code-proxy 服务**: API 格式转换代理。接收应用的 Anthropic 格式请求，转换为 OpenAI 格式发送到后端服务，再将响应转换回 Anthropic 格式返回。使 OpenAI 兼容服务对应用呈现为 Anthropic API。
- **API 类型（API Type）**: 标识 API 端点使用的协议格式，决定是否需要代理转换层。

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 使用 Anthropic 格式 API 的用户可以在 5 分钟内完成配置并成功运行第一个查询。

- **SC-002**: 使用 OpenAI 格式 API 的用户可以在 10 分钟内完成配置（包含代理设置）并成功运行第一个查询。

- **SC-003**: 配置错误时，用户能在 30 秒内从错误信息中理解问题并找到解决方向。

- **SC-004**: 现有部署升级后，无需修改配置即可正常工作（向后兼容 100%）。

- **SC-005**: SQL 生成功能和 Agent 功能使用统一配置，减少配置项数量至少 30%。

## Assumptions

1. **用户理解 API 格式差异**：假设用户知道自己使用的 LLM 服务是 Anthropic 格式还是 OpenAI 格式。
2. **Docker 环境可用**：使用 Docker Compose 部署时，OpenAI 模式代理服务自动启动；非 Docker 用户需自行部署 claude-code-proxy。
3. **claude-code-proxy 稳定性**：假设该开源项目（https://github.com/1rgs/claude-code-proxy）能够稳定运行，使用固定版本标签确保可重复性。
4. **网络连通性**：代理服务与后端服务在同一 Docker 网络中可互相访问。
5. **统一配置足够**：假设大多数用户不需要为 LLM 和 Agent 功能配置不同的 API 端点。

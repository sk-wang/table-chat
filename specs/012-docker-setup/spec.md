# Feature Specification: Docker 容器化部署

**Feature Branch**: `012-docker-setup`  
**Created**: 2025-12-30  
**Status**: Draft  
**Input**: User description: "编写dockerfile和docker-compose文件，使得程序能靠docker一键启动，方便使用"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 一键启动完整应用 (Priority: P1)

作为一个想要快速体验 TableChat 的用户，我希望能够通过一条 Docker 命令启动整个应用（前端 + 后端），无需手动安装 Python、Node.js 等依赖环境，这样我可以在几分钟内开始使用系统。

**Why this priority**: 这是 Docker 化的核心价值——简化部署流程，让用户无需关心环境配置即可快速启动应用。

**Independent Test**: 在一台只安装了 Docker 的机器上，运行 `docker-compose up` 命令，验证应用能够正常启动并可通过浏览器访问。

**Acceptance Scenarios**:

1. **Given** 用户已安装 Docker 和 Docker Compose，**When** 用户在项目根目录执行 `docker-compose up`，**Then** 前端和后端服务均成功启动，前端可通过浏览器访问
2. **Given** 服务已启动，**When** 用户访问前端页面并添加数据库连接，**Then** 能够正常连接到外部数据库并执行查询
3. **Given** 服务运行中，**When** 用户执行 `docker-compose down`，**Then** 所有容器正常停止并清理

---

### User Story 2 - 配置环境变量 (Priority: P2)

作为部署管理员，我希望能够通过环境变量或配置文件来配置 LLM API 密钥等敏感信息，这样我可以在不修改代码的情况下适配不同的部署环境。

**Why this priority**: 环境变量配置是生产部署的基础需求，但相比核心启动功能略次要。

**Independent Test**: 通过修改 `.env` 文件中的 LLM 配置，验证自然语言查询功能正常工作。

**Acceptance Scenarios**:

1. **Given** 用户创建了 `.env` 文件并配置了 `LLM_API_KEY`，**When** 启动容器，**Then** 后端服务能够读取配置并正常提供自然语言查询功能
2. **Given** 用户配置了 `AGENT_API_KEY`，**When** 使用 Agent 模式，**Then** Agent 功能正常工作
3. **Given** 未配置任何 API 密钥，**When** 启动容器，**Then** 应用仍能正常启动，仅自然语言/Agent 功能不可用

---

### User Story 3 - 数据持久化 (Priority: P2)

作为用户，我希望容器重启后我的数据库连接配置和查询历史记录不会丢失，这样我不需要每次重新配置。

**Why this priority**: 数据持久化对于实际使用非常重要，但不影响基本功能演示。

**Independent Test**: 添加数据库连接后重启容器，验证连接配置仍然存在。

**Acceptance Scenarios**:

1. **Given** 用户已添加数据库连接并执行过查询，**When** 执行 `docker-compose restart`，**Then** 重启后数据库连接配置和查询历史记录仍然保留
2. **Given** 用户执行 `docker-compose down`，**When** 再次执行 `docker-compose up`，**Then** 之前的数据仍然存在

---

### Edge Cases

- **容器启动失败**：如果端口被占用，应提供明确的错误信息
- **网络连接问题**：容器内后端应能够访问用户指定的外部数据库（PostgreSQL/MySQL）
- **存储空间不足**：镜像构建或数据存储空间不足时应有合理提示
- **环境变量未配置**：未配置 LLM 相关环境变量时，应用基础功能仍可正常使用

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 系统 MUST 提供 Dockerfile，能够分别构建前端和后端的容器镜像
- **FR-002**: 系统 MUST 提供 docker-compose.yml 文件，能够一键启动前端、后端服务
- **FR-003**: 后端容器 MUST 能够连接到外部 PostgreSQL 和 MySQL 数据库
- **FR-004**: 系统 MUST 支持通过环境变量配置 LLM API 密钥、API 地址、模型名称等
- **FR-005**: 系统 MUST 支持通过环境变量配置 Agent API 密钥及相关配置
- **FR-006**: 系统 MUST 通过 Docker Volume 持久化 SQLite 数据库文件（存储连接配置和查询历史）
- **FR-007**: 前端容器 MUST 提供生产就绪的静态文件服务
- **FR-008**: docker-compose 配置 MUST 正确设置容器间的网络通信，使前端能够访问后端 API
- **FR-009**: 系统 MUST 提供 `.env.example` 文件作为环境变量配置模板

### Key Entities

- **Backend Container**: Python FastAPI 应用容器，提供 API 服务，端口 7888
- **Frontend Container**: 静态文件服务容器（如 Nginx），提供前端页面，默认端口 5888
- **Data Volume**: 持久化存储，保存 SQLite 数据库文件

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 用户在安装 Docker 的机器上，能够在 5 分钟内完成首次启动（不含镜像下载时间）
- **SC-002**: 容器启动后，用户能够在 30 秒内通过浏览器访问前端页面
- **SC-003**: 100% 的现有功能（SQL 查询、自然语言、Agent 模式、导出、历史记录）在容器环境中正常工作
- **SC-004**: 容器重启后，用户数据（数据库连接配置、查询历史）100% 保留
- **SC-005**: 镜像大小保持合理（后端镜像 < 500MB，前端镜像 < 100MB）

## Assumptions

- 用户已安装 Docker 和 Docker Compose（支持 Docker Compose V2）
- 用户要连接的 PostgreSQL/MySQL 数据库可从运行 Docker 的机器网络访问
- 用户熟悉基本的 Docker 命令（`docker-compose up/down`）
- 默认使用官方 Python 和 Nginx 基础镜像
- 前端构建后作为静态文件由 Nginx 提供服务
- 后端使用 uvicorn 运行，不需要额外的 WSGI 服务器
- 默认端口：前端 5888，后端 7888（可通过环境变量配置）

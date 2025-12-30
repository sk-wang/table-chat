# Implementation Plan: Docker 容器化部署

**Branch**: `012-docker-setup` | **Date**: 2025-12-30 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/012-docker-setup/spec.md`

## Summary

为 TableChat 项目提供 Docker 容器化部署方案，包含 Dockerfile 和 docker-compose 配置，实现前后端一键启动。采用多阶段构建优化镜像大小，使用 Docker Volume 持久化数据，通过环境变量配置敏感信息。

## Technical Context

**Language/Version**: Python 3.13+ (backend), Node.js 22 (frontend build)  
**Primary Dependencies**: Docker, Docker Compose V2, Nginx (frontend serving), uvicorn (backend)  
**Storage**: SQLite (via Docker Volume 持久化)  
**Testing**: 手动验证 docker-compose up/down 流程  
**Target Platform**: Linux containers (amd64/arm64)  
**Project Type**: Web application (frontend + backend)  
**Performance Goals**: 启动时间 < 30 秒，镜像大小合理（后端 < 500MB，前端 < 100MB）  
**Constraints**: 容器间网络通信、外部数据库访问、数据持久化  
**Scale/Scope**: 单节点部署，适用于开发/演示环境

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Ergonomic Python Backend | ✅ N/A | 不修改后端代码 |
| II. TypeScript Frontend | ✅ N/A | 不修改前端代码 |
| III. Strict Type Annotations | ✅ N/A | 不修改应用代码 |
| IV. Pydantic Data Models | ✅ N/A | 不修改数据模型 |
| V. Open Access (No Auth) | ✅ PASS | Docker 部署无需认证 |
| VI. Comprehensive Testing | ✅ PASS | 手动验证 + README 文档 |

**Gate Result**: ✅ PASS - 本功能是纯基础设施配置，不涉及应用代码修改

## Project Structure

### Documentation (this feature)

```text
specs/012-docker-setup/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (minimal - infrastructure only)
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (empty - no new APIs)
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
# New files to be created
tableChat/
├── docker-compose.yml      # Main orchestration file
├── .env.example            # Environment variable template
├── backend/
│   └── Dockerfile          # Backend container image
└── frontend/
    ├── Dockerfile          # Frontend container image
    └── nginx.conf          # Nginx configuration for SPA
```

**Structure Decision**: Docker 配置文件放置在项目根目录和各子项目目录，遵循行业标准实践。

## Complexity Tracking

> 无复杂度违规 - 本功能采用标准 Docker 部署模式，无需额外抽象层。

## Phase 0: Research

见 [research.md](./research.md)

## Phase 1: Design

见以下文档：
- [data-model.md](./data-model.md) - 配置结构
- [quickstart.md](./quickstart.md) - 快速启动指南
- `contracts/` - 无新增 API

## Implementation Overview

### 1. Backend Dockerfile

- 基于 `python:3.13-slim` 基础镜像
- 使用 uv 安装依赖（高效、快速）
- 多阶段构建优化镜像大小
- 暴露端口 7888

### 2. Frontend Dockerfile

- 阶段1：Node.js 构建静态文件
- 阶段2：Nginx 提供静态文件服务
- 配置 Nginx 支持 SPA 路由
- 动态注入 API_BASE_URL 环境变量
- 暴露端口 5888

### 3. Docker Compose

- 定义 backend 和 frontend 两个服务
- 配置 Docker network 实现容器间通信
- 配置 volume 持久化 SQLite 数据库
- 支持 .env 文件配置环境变量

### 4. 环境变量

- LLM_API_KEY / LLM_API_BASE / LLM_MODEL
- AGENT_API_KEY / AGENT_API_BASE / AGENT_MODEL
- DATABASE_PATH（容器内路径）
- VITE_API_BASE_URL（前端 API 地址）

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| 前端无法连接后端 | Nginx 反向代理 + CORS 配置 |
| 数据丢失 | Docker Volume 持久化 |
| 镜像过大 | 多阶段构建 + .dockerignore |
| 环境变量泄露 | .env 文件不纳入版本控制 |

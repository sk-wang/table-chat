# Research: Docker 容器化部署

**Feature**: 012-docker-setup  
**Date**: 2025-12-30

## Research Tasks

### 1. Python 后端 Docker 最佳实践

**Decision**: 使用 `python:3.13-slim` + uv 包管理器

**Rationale**:
- `slim` 变体比完整镜像小约 800MB，同时包含必要的系统库
- uv 是现代 Python 包管理器，安装速度比 pip 快 10-100 倍
- 项目已使用 uv 管理依赖，保持一致性

**Alternatives Considered**:
- `python:3.13-alpine`: 更小但缺少 glibc，某些依赖编译困难
- 使用 pip: 安装速度较慢，uv 已是项目标准

### 2. 前端静态文件服务

**Decision**: 使用 Nginx 多阶段构建

**Rationale**:
- Nginx 是生产级静态文件服务器，性能优异
- 多阶段构建：Node.js 构建 → Nginx 运行，最终镜像 < 50MB
- Nginx 可配置 SPA 路由（所有路径返回 index.html）
- 可配置反向代理，解决跨域问题

**Alternatives Considered**:
- serve (npm 包): 生产环境性能不足
- Vite preview: 仅用于开发预览

### 3. 前后端通信方案

**Decision**: Nginx 反向代理 + 后端直接暴露

**Rationale**:
- 方案 A（反向代理）：Nginx 将 `/api` 请求代理到后端容器
  - 优点：无跨域问题，前端配置简单
  - 缺点：增加配置复杂度
- 方案 B（直接连接）：前端直接访问后端暴露的端口
  - 优点：配置简单
  - 缺点：需要 CORS 配置，SSE 可能有问题

**Final Decision**: 采用方案 A（反向代理），因为：
1. 更符合生产部署模式
2. 避免 CORS 复杂配置
3. SSE (Agent 模式) 在反向代理下更稳定

### 4. 环境变量注入

**Decision**: 后端通过 .env 文件，前端构建时注入

**Rationale**:
- 后端：Pydantic Settings 原生支持 .env 文件
- 前端：Vite 构建时读取 VITE_* 环境变量
- Docker Compose 支持 env_file 指令

**Implementation**:
- docker-compose 使用 `env_file: .env`
- 前端 Nginx 容器启动时动态替换 API URL（可选增强）

### 5. 数据持久化

**Decision**: Docker Named Volume

**Rationale**:
- Named Volume 比 bind mount 更便携
- Docker 管理生命周期，数据独立于容器
- 易于备份和迁移

**Configuration**:
```yaml
volumes:
  tablechat-data:
    driver: local
```

### 6. 多架构支持

**Decision**: 仅支持默认架构（构建机器的架构）

**Rationale**:
- buildx 多架构构建增加复杂度
- 用户大多在本地构建本地运行
- 可通过 docker buildx 手动构建其他架构

**Future Enhancement**: 可以添加 GitHub Actions 自动构建多架构镜像

### 7. 健康检查

**Decision**: 添加基本健康检查

**Rationale**:
- 帮助 Docker Compose 确定服务就绪状态
- 便于监控和自动重启

**Implementation**:
```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:7888/"]
  interval: 30s
  timeout: 10s
  retries: 3
```

## Decisions Summary

| Topic | Decision | Confidence |
|-------|----------|------------|
| 后端基础镜像 | python:3.13-slim + uv | High |
| 前端服务 | Nginx + 多阶段构建 | High |
| 通信方案 | Nginx 反向代理 | High |
| 环境配置 | .env 文件 | High |
| 数据持久化 | Docker Named Volume | High |
| 多架构 | 暂不支持（可扩展） | Medium |
| 健康检查 | 基本 HTTP 检查 | Medium |

## References

- [Docker Python Best Practices](https://docs.docker.com/language/python/)
- [Nginx Docker Official](https://hub.docker.com/_/nginx)
- [Docker Compose Specification](https://docs.docker.com/compose/compose-file/)
- [uv - Python Package Manager](https://github.com/astral-sh/uv)


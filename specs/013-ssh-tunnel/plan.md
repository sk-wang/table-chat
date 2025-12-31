# Implementation Plan: SSH 隧道连接支持

**Branch**: `013-ssh-tunnel` | **Date**: 2025-12-31 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/013-ssh-tunnel/spec.md`

## Summary

为 TableChat 添加 SSH 隧道支持，允许用户通过 SSH 跳板机连接无法直连的 PostgreSQL/MySQL 数据库。采用 `asyncssh` 库实现异步 SSH 连接，新增 `SSHTunnelManager` 服务管理隧道生命周期，扩展数据模型存储 SSH 配置。

## Technical Context

**Language/Version**: Python 3.13+ (backend), TypeScript 5.x (frontend)  
**Primary Dependencies**: asyncssh (新增), FastAPI, React, Ant Design  
**Storage**: SQLite (扩展 databases 表)  
**Testing**: pytest + 手动验证 SSH 隧道连接  
**Target Platform**: Linux/macOS (Docker 部署)  
**Project Type**: Web application (frontend + backend)  
**Performance Goals**: SSH 隧道开销 < 500ms，查询无感知延迟  
**Constraints**: 依赖 SSH 服务器可达性，需要有效的认证凭证  
**Scale/Scope**: 单用户本地工具，每个数据库连接最多一个 SSH 隧道

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Ergonomic Python Backend | ✅ PASS | 使用 asyncssh 异步库，符合 FastAPI 风格 |
| II. TypeScript Frontend | ✅ PASS | 前端扩展使用 TypeScript + Ant Design |
| III. Strict Type Annotations | ✅ PASS | Pydantic 模型 + TypeScript 接口 |
| IV. Pydantic Data Models | ✅ PASS | SSHConfig 使用 Pydantic 定义 |
| V. Open Access (No Auth) | ✅ PASS | SSH 认证在连接层面，不影响应用访问 |
| VI. Comprehensive Testing | ✅ PASS | 单元测试 + 集成测试 + 手动验证 |

**Gate Result**: ✅ PASS

## Project Structure

### Documentation (this feature)

```text
specs/013-ssh-tunnel/
├── plan.md              # This file
├── research.md          # Phase 0 output - SSH 库选型研究
├── data-model.md        # Phase 1 output - 数据模型设计
├── quickstart.md        # Phase 1 output - 快速验证指南
├── contracts/           # Phase 1 output - API 接口定义
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
backend/
├── app/
│   ├── models/
│   │   ├── database.py      # 扩展：添加 SSHConfig 字段
│   │   └── ssh.py           # 新增：SSH 配置模型
│   ├── services/
│   │   ├── ssh_tunnel.py    # 新增：SSH 隧道管理服务
│   │   └── db_manager.py    # 修改：集成 SSH 隧道
│   ├── connectors/
│   │   ├── base.py          # 修改：添加隧道参数
│   │   ├── postgres.py      # 修改：支持隧道连接
│   │   └── mysql.py         # 修改：支持隧道连接
│   ├── db/
│   │   └── sqlite.py        # 修改：添加 ssh_config 列迁移
│   └── api/v1/
│       └── dbs.py           # 修改：处理 SSH 配置
└── tests/
    ├── unit/
    │   └── test_ssh_tunnel.py   # 新增：SSH 隧道单元测试
    └── integration/
        └── test_ssh_connection.py  # 新增：SSH 连接集成测试

frontend/
├── src/
│   ├── types/
│   │   └── index.ts         # 修改：添加 SSH 类型定义
│   ├── components/database/
│   │   └── AddDatabaseModal.tsx  # 修改：添加 SSH 配置表单
│   └── services/
│       └── api.ts           # 修改：更新请求类型
└── tests/
    └── AddDatabaseModal.test.tsx  # 新增：表单测试
```

**Structure Decision**: 在现有 backend/frontend 结构基础上扩展，新增 `ssh_tunnel.py` 服务模块，其他为增量修改。

## Complexity Tracking

> 无复杂度违规 - 本功能采用标准模式，无需额外抽象层。

## Phase 0: Research

详见 [research.md](./research.md)

**关键结论**：
- 选用 `asyncssh` 库（异步原生，更高质量评分）
- 数据模型采用 JSON 字段存储 SSH 配置
- 隧道管理采用按需创建 + 连接复用策略

## Phase 1: Design

详见以下文档：
- [data-model.md](./data-model.md) - 数据模型设计
- [quickstart.md](./quickstart.md) - 快速验证指南
- [contracts/](./contracts/) - API 接口定义

## Implementation Overview

### 1. 后端 - SSH 隧道服务

新增 `SSHTunnelManager` 类，负责：
- 建立 SSH 连接和端口转发
- 管理隧道生命周期（创建、复用、关闭）
- 处理连接失败和重连
- 日志记录

核心方法：
```python
class SSHTunnelManager:
    async def get_tunnel(self, db_name: str, ssh_config: SSHConfig, 
                         remote_host: str, remote_port: int) -> tuple[str, int]
    async def close_tunnel(self, db_name: str) -> None
    async def close_all(self) -> None
```

### 2. 后端 - 数据模型扩展

- `SSHConfig` Pydantic 模型
- `databases` 表添加 `ssh_config` TEXT 列
- 迁移脚本在启动时自动执行

### 3. 后端 - 连接器修改

修改 `PostgreSQLConnector` 和 `MySQLConnector`：
- 检测是否需要 SSH 隧道
- 如需要，先建立隧道获取本地端口
- 使用本地端口连接数据库

### 4. 前端 - 表单扩展

扩展 `AddDatabaseModal` 组件：
- 添加「SSH 隧道」开关
- 根据开关显示/隐藏 SSH 配置表单
- 支持密码认证和密钥认证切换
- 密钥认证时提供文本区域粘贴私钥

### 5. 前端 - 类型定义

新增 TypeScript 接口：
- `SSHConfig` - 请求模型
- `SSHConfigResponse` - 响应模型（脱敏）

## Risk Assessment

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| asyncssh 兼容性问题 | 中 | 低 | 选用稳定版本，编写充分测试 |
| SSH 连接不稳定 | 中 | 中 | 实现重连机制，清晰的错误提示 |
| 私钥格式多样性 | 低 | 中 | 支持常见格式，提供格式说明 |
| 隧道资源泄露 | 中 | 低 | 在 FastAPI lifespan 中确保关闭 |

## Dependencies

### 新增 Python 依赖

```
asyncssh>=2.14.0
```

### 前端依赖

无新增依赖，使用现有 Ant Design 组件。

## Next Steps

运行 `/speckit.tasks` 生成详细任务列表。


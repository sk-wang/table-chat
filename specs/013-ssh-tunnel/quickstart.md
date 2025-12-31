# Quickstart: SSH 隧道连接支持

**Feature**: 013-ssh-tunnel  
**Date**: 2025-12-31

## 概述

本功能允许用户通过 SSH 跳板机连接到无法直连的数据库。实现涉及前端表单扩展、后端隧道管理、数据模型扩展三个层面。

## 快速验证流程

### 1. 添加依赖

```bash
cd backend
uv add asyncssh
```

### 2. 运行数据库迁移

迁移会在应用启动时自动执行，添加 `ssh_config` 列到 `databases` 表。

### 3. 配置 SSH 跳板机

准备一个可访问的 SSH 服务器和一个只能通过该服务器访问的数据库：

```
┌─────────┐     SSH      ┌─────────────┐     Direct     ┌──────────────┐
│  User   │─────────────▶│  Jump Host  │───────────────▶│  Database    │
│ (local) │   port 22    │ jump.example│   port 5432    │ db.internal  │
└─────────┘              └─────────────┘                └──────────────┘
```

### 4. 通过 UI 添加数据库

1. 打开 TableChat 前端
2. 点击「添加数据库」
3. 选择数据库类型（PostgreSQL / MySQL）
4. 填写数据库连接 URL：`postgresql://user:pass@db.internal:5432/mydb`
5. 启用「SSH 隧道」开关
6. 填写 SSH 配置：
   - 主机：`jump.example.com`
   - 端口：`22`
   - 用户名：`admin`
   - 认证方式：选择「密钥认证」或「密码认证」
   - 提供相应凭证
7. 点击「添加」

### 5. 验证连接

- 成功：显示成功提示，数据库出现在列表中
- 失败：显示错误信息，区分 SSH 连接问题和数据库连接问题

## API 使用示例

### 创建带 SSH 隧道的数据库连接

```bash
curl -X PUT "http://localhost:7888/api/v1/dbs/my-internal-db" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "postgresql://user:password@db.internal:5432/mydb",
    "sshConfig": {
      "enabled": true,
      "host": "jump.example.com",
      "port": 22,
      "username": "admin",
      "authType": "key",
      "privateKey": "-----BEGIN OPENSSH PRIVATE KEY-----\n...\n-----END OPENSSH PRIVATE KEY-----"
    }
  }'
```

### 响应示例

```json
{
  "name": "my-internal-db",
  "url": "postgresql://user:****@db.internal:5432/mydb",
  "dbType": "postgresql",
  "sslDisabled": false,
  "sshConfig": {
    "enabled": true,
    "host": "jump.example.com",
    "port": 22,
    "username": "admin",
    "authType": "key"
  },
  "createdAt": "2025-12-31T10:00:00",
  "updatedAt": "2025-12-31T10:00:00"
}
```

### 执行查询

查询流程对用户透明，后端自动管理 SSH 隧道：

```bash
curl -X POST "http://localhost:7888/api/v1/dbs/my-internal-db/query" \
  -H "Content-Type: application/json" \
  -d '{
    "sql": "SELECT * FROM users LIMIT 10"
  }'
```

## 开发环境设置

### 测试用 SSH 服务器

可使用 Docker 快速启动测试 SSH 服务器：

```bash
# 启动 SSH 测试服务器
docker run -d --name ssh-test \
  -p 2222:22 \
  -e PASSWORD=test123 \
  lscr.io/linuxserver/openssh-server:latest
```

### 测试用数据库

```bash
# 启动 PostgreSQL（仅允许从 SSH 容器网络访问）
docker run -d --name pg-internal \
  --network container:ssh-test \
  -e POSTGRES_PASSWORD=dbpass \
  postgres:15
```

### 测试连接

```bash
# SSH 连接测试
ssh -p 2222 linuxserver.io@localhost -o StrictHostKeyChecking=no

# 通过 SSH 隧道连接数据库
ssh -L 15432:localhost:5432 -p 2222 linuxserver.io@localhost -N &
psql -h localhost -p 15432 -U postgres
```

## 错误排查

### 常见错误及解决方案

| 错误信息 | 原因 | 解决方案 |
|----------|------|----------|
| `SSH connection failed: Connection refused` | SSH 服务器不可达 | 检查主机地址和端口 |
| `SSH authentication failed` | 认证失败 | 检查用户名、密码或私钥 |
| `Invalid private key format` | 私钥格式不支持 | 使用 OpenSSH 或 PEM 格式 |
| `Database connection failed via tunnel` | 隧道已建立但数据库不可达 | 检查数据库 URL 中的主机地址是否正确（应为 SSH 服务器视角的地址） |
| `Tunnel connection lost` | 隧道意外断开 | 重试查询，系统会自动重建隧道 |

### 日志查看

SSH 连接事件会记录到应用日志：

```bash
# 查看后端日志
docker compose logs -f backend | grep -i ssh
```

日志示例：
```
INFO: SSH tunnel established: jump.example.com:22 -> db.internal:5432 (local port: 12345)
INFO: SSH tunnel closed: my-internal-db
ERROR: SSH connection failed for my-internal-db: Authentication failed
```


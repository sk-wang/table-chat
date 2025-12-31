# Research: SSH 隧道连接支持

**Feature**: 013-ssh-tunnel  
**Date**: 2025-12-31

## 问题定义

用户需要通过 SSH 跳板机访问无法直连的数据库服务器（位于内网或防火墙后）。系统需要在后端建立 SSH 隧道，将数据库端口转发到本地，再通过转发后的端口连接数据库。

## 技术选型分析

### Python SSH 库对比

| 库 | 类型 | 异步支持 | 端口转发 | 评分 | 备注 |
|----|------|----------|----------|------|------|
| **asyncssh** | 原生 SSH | ✅ 原生 async | ✅ `forward_local_port` | 79.1 | 最适合 FastAPI 异步架构 |
| sshtunnel | paramiko 封装 | ❌ 同步 | ✅ `SSHTunnelForwarder` | 61.3 | 简单但需线程包装 |
| paramiko | 底层 SSH | ❌ 同步 | ✅ 手动实现 | N/A | 功能全但复杂 |

### 选型决策：asyncssh

选择 `asyncssh` 的原因：

1. **原生异步支持** - 与 FastAPI、asyncpg、aiomysql 架构一致
2. **更高质量评分** - Benchmark Score 79.1 vs sshtunnel 的 61.3
3. **更丰富的文档** - 133 个代码示例
4. **简洁的 API** - `conn.forward_local_port()` 一行建立隧道

### asyncssh 关键 API

```python
import asyncssh

# 密钥认证
async with asyncssh.connect(
    'jump-host.example.com',
    username='user',
    client_keys=['~/.ssh/id_rsa'],  # 或直接传入私钥字符串
    passphrase='key_password'       # 可选的密钥密码
) as conn:
    # 建立本地端口转发
    listener = await conn.forward_local_port(
        '127.0.0.1', 0,              # 本地地址和端口（0 = 自动分配）
        'db.internal.net', 5432       # 远程数据库地址和端口
    )
    local_port = listener.get_port()
    # 现在可以通过 localhost:local_port 连接数据库
```

## 数据模型扩展方案

### 方案 A：JSON 字段存储（推荐）

在 `databases` 表添加 `ssh_config` JSON 字段：

```sql
ALTER TABLE databases ADD COLUMN ssh_config TEXT;  -- JSON 格式
```

优点：
- 与现有 `columns_json` 模式一致
- 灵活性高，易于扩展
- 减少表结构变更

JSON 结构：
```json
{
  "enabled": true,
  "host": "jump.example.com",
  "port": 22,
  "username": "admin",
  "authType": "key",           // "key" | "password"
  "password": "...",           // 密码认证时
  "privateKey": "...",         // 密钥认证时（PEM 格式字符串）
  "keyPassphrase": "..."       // 可选的密钥密码
}
```

### 方案 B：独立列存储

添加多个独立列：`ssh_host`, `ssh_port`, `ssh_username`, `ssh_auth_type`, ...

缺点：
- 需要更多列，schema 变更复杂
- 未来扩展需要再次修改表结构

**决策**：采用方案 A（JSON 字段）

## 隧道生命周期管理

### 设计方案

```
┌─────────────────┐     ┌──────────────────┐     ┌────────────────┐
│  DatabaseManager │────▶│  SSHTunnelManager │────▶│  asyncssh conn │
└─────────────────┘     └──────────────────┘     └────────────────┘
         │                       │
         │ get_connection()      │ get_tunnel(db_name)
         ▼                       ▼
    "localhost:12345"      SSH tunnel active
```

### 隧道池策略

- **按需创建**：首次查询时建立隧道
- **复用连接**：同一数据库的多次查询复用已有隧道
- **Keep-alive**：使用 `keepalive_interval` 保持隧道活跃
- **错误处理**：隧道断开时标记失效，下次查询重建

### SSHTunnelManager 接口设计

```python
class SSHTunnelManager:
    async def get_tunnel(self, db_name: str, ssh_config: dict) -> tuple[str, int]:
        """获取或创建隧道，返回 (local_host, local_port)"""
    
    async def close_tunnel(self, db_name: str) -> None:
        """关闭指定数据库的隧道"""
    
    async def close_all(self) -> None:
        """关闭所有隧道（应用关闭时调用）"""
```

## 安全考量

1. **凭证存储**：采用与数据库密码相同策略（SQLite 直接存储）- 已在澄清阶段确认
2. **私钥格式**：支持 OpenSSH 格式（RSA、ECDSA、Ed25519）和 PEM 格式
3. **内存安全**：隧道关闭后清理连接对象
4. **日志脱敏**：日志中不记录密码和私钥内容

## 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| SSH 连接超时 | 用户等待时间长 | 设置合理超时（30秒），超时后给出明确提示 |
| 隧道意外断开 | 查询失败 | 检测断开后标记隧道失效，下次查询自动重建 |
| 端口冲突 | 隧道创建失败 | 使用动态端口分配（port=0） |
| 私钥格式不支持 | 认证失败 | 前端验证私钥格式，后端提供明确错误信息 |

## 参考资料

- [asyncssh 官方文档](https://asyncssh.readthedocs.io/)
- [asyncssh 端口转发示例](https://asyncssh.readthedocs.io/en/latest/#port-forwarding)


# Data Model: SSH 隧道连接支持

**Feature**: 013-ssh-tunnel  
**Date**: 2025-12-31

## 数据库 Schema 变更

### 新增列：databases.ssh_config

```sql
-- Migration: 添加 SSH 配置列
ALTER TABLE databases ADD COLUMN ssh_config TEXT;
```

`ssh_config` 列存储 JSON 格式的 SSH 隧道配置，为 NULL 表示不使用 SSH 隧道。

### SSH 配置 JSON 结构

```json
{
  "enabled": true,
  "host": "jump.example.com",
  "port": 22,
  "username": "admin",
  "authType": "key",
  "password": null,
  "privateKey": "-----BEGIN OPENSSH PRIVATE KEY-----\n...\n-----END OPENSSH PRIVATE KEY-----",
  "keyPassphrase": null
}
```

### 字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `enabled` | boolean | ✅ | 是否启用 SSH 隧道 |
| `host` | string | ✅ | SSH 服务器地址 |
| `port` | integer | ✅ | SSH 端口，默认 22 |
| `username` | string | ✅ | SSH 用户名 |
| `authType` | string | ✅ | 认证方式：`"password"` 或 `"key"` |
| `password` | string | ❌ | SSH 密码（authType=password 时必填） |
| `privateKey` | string | ❌ | 私钥内容（authType=key 时必填） |
| `keyPassphrase` | string | ❌ | 私钥密码（可选） |

## 后端模型定义

### Pydantic 模型

```python
# app/models/ssh.py

from pydantic import Field
from typing import Literal
from app.models.base import CamelModel


class SSHConfig(CamelModel):
    """SSH 隧道配置模型"""
    
    enabled: bool = Field(default=False, description="是否启用 SSH 隧道")
    host: str = Field(default="", description="SSH 服务器地址")
    port: int = Field(default=22, description="SSH 端口")
    username: str = Field(default="", description="SSH 用户名")
    auth_type: Literal["password", "key"] = Field(
        default="password", 
        description="认证方式"
    )
    password: str | None = Field(default=None, description="SSH 密码")
    private_key: str | None = Field(default=None, description="私钥内容")
    key_passphrase: str | None = Field(default=None, description="私钥密码")
```

### 扩展 DatabaseCreateRequest

```python
# app/models/database.py（修改）

class DatabaseCreateRequest(CamelModel):
    """Request model for creating/updating a database connection."""

    url: str = Field(..., description="Database connection URL")
    ssl_disabled: bool = Field(False, description="Disable SSL for MySQL")
    ssh_config: SSHConfig | None = Field(
        default=None, 
        description="SSH tunnel configuration"
    )
```

### 扩展 DatabaseResponse

```python
class DatabaseResponse(CamelModel):
    """Response model for database connection."""

    name: str
    url: str  # Masked
    db_type: str
    ssl_disabled: bool
    ssh_config: SSHConfigResponse | None  # 脱敏后的 SSH 配置
    created_at: datetime
    updated_at: datetime


class SSHConfigResponse(CamelModel):
    """SSH 配置响应模型（脱敏）"""
    
    enabled: bool
    host: str
    port: int
    username: str
    auth_type: Literal["password", "key"]
    # 不返回 password、privateKey、keyPassphrase
```

## 前端类型定义

### TypeScript 接口

```typescript
// types/index.ts

export interface SSHConfig {
  enabled: boolean;
  host: string;
  port: number;
  username: string;
  authType: 'password' | 'key';
  password?: string;
  privateKey?: string;
  keyPassphrase?: string;
}

export interface SSHConfigResponse {
  enabled: boolean;
  host: string;
  port: number;
  username: string;
  authType: 'password' | 'key';
  // 敏感字段不返回
}

export interface DatabaseCreateRequest {
  url: string;
  sslDisabled?: boolean;
  sshConfig?: SSHConfig;
}

export interface DatabaseResponse {
  name: string;
  url: string;
  dbType: 'postgresql' | 'mysql';
  sslDisabled: boolean;
  sshConfig: SSHConfigResponse | null;
  createdAt: string;
  updatedAt: string;
}
```

## 数据流

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend                                  │
│  AddDatabaseModal                                               │
│  ├── url: "postgresql://user:pass@db.internal:5432/mydb"       │
│  └── sshConfig: { enabled: true, host: "jump", ... }           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ POST /api/v1/dbs/{name}
┌─────────────────────────────────────────────────────────────────┐
│                        Backend API                               │
│  1. 解析请求                                                     │
│  2. 如果 sshConfig.enabled:                                      │
│     - 建立 SSH 隧道 → localhost:12345                           │
│     - 修改连接 URL → postgresql://user:pass@localhost:12345/mydb│
│  3. 测试数据库连接                                               │
│  4. 保存到 SQLite（含 ssh_config JSON）                         │
│  5. 关闭测试隧道                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        SQLite                                    │
│  databases 表                                                    │
│  ├── name: "my-db"                                              │
│  ├── url: "postgresql://user:pass@db.internal:5432/mydb"       │
│  ├── db_type: "postgresql"                                      │
│  └── ssh_config: '{"enabled":true,"host":"jump",...}'          │
└─────────────────────────────────────────────────────────────────┘
```

## 脱敏规则

### 返回给前端时

| 字段 | 处理方式 |
|------|----------|
| `password` | 不返回 |
| `privateKey` | 不返回 |
| `keyPassphrase` | 不返回 |
| `host`, `port`, `username` | 原样返回 |
| `authType` | 原样返回 |

### 日志记录时

- 记录：host、port、username、authType
- 不记录：password、privateKey、keyPassphrase


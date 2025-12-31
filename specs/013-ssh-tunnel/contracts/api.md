# API Contract: SSH 隧道连接支持

**Feature**: 013-ssh-tunnel  
**Date**: 2025-12-31

## 概述

本功能扩展现有数据库管理 API，无新增端点，仅扩展请求/响应模型以支持 SSH 隧道配置。

## 修改的端点

### PUT /api/v1/dbs/{name}

创建或更新数据库连接。

#### 请求体扩展

```json
{
  "url": "postgresql://user:password@db.internal:5432/mydb",
  "sslDisabled": false,
  "sshConfig": {
    "enabled": true,
    "host": "jump.example.com",
    "port": 22,
    "username": "admin",
    "authType": "key",
    "password": null,
    "privateKey": "-----BEGIN OPENSSH PRIVATE KEY-----\n...",
    "keyPassphrase": null
  }
}
```

#### 新增字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `sshConfig` | object \| null | ❌ | SSH 隧道配置，null 或不传表示不使用 SSH |
| `sshConfig.enabled` | boolean | ✅ | 是否启用 SSH 隧道 |
| `sshConfig.host` | string | ✅* | SSH 服务器地址（enabled=true 时必填） |
| `sshConfig.port` | integer | ❌ | SSH 端口，默认 22 |
| `sshConfig.username` | string | ✅* | SSH 用户名（enabled=true 时必填） |
| `sshConfig.authType` | string | ✅* | 认证方式：`"password"` 或 `"key"` |
| `sshConfig.password` | string | ❌ | SSH 密码（authType=password 时必填） |
| `sshConfig.privateKey` | string | ❌ | 私钥内容（authType=key 时必填） |
| `sshConfig.keyPassphrase` | string | ❌ | 私钥密码（可选） |

#### 响应体扩展

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

**注意**：响应中的 `sshConfig` 不包含敏感字段（password、privateKey、keyPassphrase）。

---

### GET /api/v1/dbs

列出所有数据库连接。

#### 响应体扩展

每个数据库对象新增 `sshConfig` 字段（脱敏）。

```json
{
  "databases": [
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
  ]
}
```

---

### GET /api/v1/dbs/{name}

获取单个数据库连接详情。

#### 响应体扩展

同上，新增 `sshConfig` 字段。

---

## 错误响应

### SSH 连接错误

当 SSH 隧道建立失败时：

```json
{
  "error": "SSH connection failed",
  "detail": "Authentication failed: invalid private key format"
}
```

HTTP Status: `400 Bad Request`

### SSH 认证错误

```json
{
  "error": "SSH authentication failed",
  "detail": "Invalid username or password for jump.example.com"
}
```

HTTP Status: `401 Unauthorized`

### SSH 服务器不可达

```json
{
  "error": "SSH connection failed",
  "detail": "Connection refused: jump.example.com:22"
}
```

HTTP Status: `502 Bad Gateway`

### 数据库通过隧道不可达

SSH 隧道建立成功，但数据库连接失败：

```json
{
  "error": "Database connection failed",
  "detail": "Could not connect to db.internal:5432 via SSH tunnel"
}
```

HTTP Status: `400 Bad Request`

---

## 验证规则

### sshConfig 验证

```python
# 验证逻辑伪代码
if ssh_config and ssh_config.enabled:
    assert ssh_config.host, "SSH host is required"
    assert ssh_config.username, "SSH username is required"
    assert ssh_config.auth_type in ["password", "key"]
    
    if ssh_config.auth_type == "password":
        assert ssh_config.password, "SSH password is required"
    else:  # key
        assert ssh_config.private_key, "Private key is required"
        # 验证私钥格式
        validate_private_key_format(ssh_config.private_key)
```

### 私钥格式验证

支持的格式：
- OpenSSH 格式：`-----BEGIN OPENSSH PRIVATE KEY-----`
- PEM RSA 格式：`-----BEGIN RSA PRIVATE KEY-----`
- PEM EC 格式：`-----BEGIN EC PRIVATE KEY-----`

不支持的格式：
- PPK（PuTTY 格式）
- PKCS#12 (.p12, .pfx)

---

## 向后兼容性

- 现有不使用 SSH 的数据库连接不受影响
- `sshConfig` 字段可选，默认为 `null`
- 旧版客户端发送的请求（无 `sshConfig`）将正常处理


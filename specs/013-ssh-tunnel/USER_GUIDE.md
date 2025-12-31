# SSH Tunnel Feature - Quick Start Guide

## 使用场景

当您的数据库服务器无法直接访问，需要通过 SSH 跳板机连接时使用此功能。

```
您的电脑 → SSH 跳板机 → 数据库服务器
         (SSH 隧道)    (数据库连接)
```

## 配置步骤

### 1. 添加数据库连接

点击侧边栏的 "Add Database" 按钮，打开配置对话框。

### 2. 基础配置

1. **Database Type**: 选择 PostgreSQL 或 MySQL
2. **Database Name**: 输入名称（如 `my-remote-db`）
3. **Connection URL**: 输入**远程数据库**的连接字符串

   ```
   # MySQL 示例
   mysql://username:password@remote-db-host.com:3306/database

   # PostgreSQL 示例
   postgresql://username:password@remote-db-host.com:5432/database
   ```

   ⚠️ **注意**: URL 中填写的是最终目标数据库的地址，而不是跳板机地址

### 3. 启用 SSH Tunnel

1. 打开 **SSH Tunnel** 开关
2. 展开的配置面板会出现

### 4. 配置 SSH 连接信息

填写 **SSH 跳板机** 的连接信息：

- **SSH Host**: 跳板机地址（如 `bastion.example.com` 或 `192.168.1.100`）
- **SSH Port**: SSH 端口（默认 22）
- **SSH Username**: SSH 用户名（如 `root` 或您的用户名）

### 5. 选择认证方式

#### 方式 A: 密码认证

1. 选择 **Password** 认证类型
2. 输入 **SSH Password**

#### 方式 B: 私钥认证（推荐）

1. 选择 **Private Key** 认证类型
2. 粘贴您的私钥内容到 **Private Key** 文本框

   ```
   -----BEGIN RSA PRIVATE KEY-----
   MIIEpQIBAAKCAQEA...
   ...
   -----END RSA PRIVATE KEY-----
   ```

3. 如果私钥有密码保护，填写 **Key Passphrase**（可选）

### 6. 保存配置

点击 **Add** 按钮，系统会：

1. 建立 SSH 隧道连接
2. 测试数据库连接
3. 保存配置（敏感信息加密存储）

## 实际示例

### 示例 1: 通过跳板机连接阿里云 RDS

```
场景：
- 阿里云 RDS MySQL: rm-xxxxx.mysql.rds.aliyuncs.com:3306
- SSH 跳板机: bastion.example.com (root 用户，密钥认证)
- 数据库: scinew (用户 tool_account)

配置：
1. Database Type: MySQL
2. Database Name: aliyun-rds
3. Connection URL:
   mysql://tool_account:password@rm-xxxxx.mysql.rds.aliyuncs.com:3306/scinew
4. SSH Tunnel: Enabled
   - SSH Host: bastion.example.com
   - SSH Port: 22
   - SSH Username: root
   - Authentication Type: Private Key
   - Private Key: (粘贴 /Users/xxx/id_rsa 内容)
```

### 示例 2: 通过跳板机连接内网 PostgreSQL

```
场景：
- 内网 PostgreSQL: 10.0.0.100:5432
- SSH 跳板机: vpn.company.com (使用密码)
- 数据库: production (用户 admin)

配置：
1. Database Type: PostgreSQL
2. Database Name: prod-db
3. Connection URL:
   postgresql://admin:password@10.0.0.100:5432/production
4. SSH Tunnel: Enabled
   - SSH Host: vpn.company.com
   - SSH Port: 22
   - SSH Username: your-username
   - Authentication Type: Password
   - SSH Password: your-ssh-password
```

## 编辑现有连接

1. 在数据库列表中点击数据库旁的编辑图标
2. 修改需要更改的 SSH 配置
3. **注意**: 出于安全考虑，密码和私钥不会回显，如需更改请重新输入
4. 点击 **Update** 保存

## 使用连接

配置完成后：

1. 在侧边栏点击数据库名称
2. 系统会自动：
   - 建立 SSH 隧道（如果尚未建立）
   - 通过隧道连接数据库
   - 加载元数据（表、列信息）
3. 您可以正常执行 SQL 查询，所有流量都通过 SSH 隧道加密传输

## 故障排查

### 连接失败

**错误**: "SSH connection failed: Connection timeout"
- 检查 SSH Host 和 Port 是否正确
- 确认跳板机网络可达
- 检查防火墙设置

**错误**: "SSH connection failed: Authentication failed"
- 密码认证：检查密码是否正确
- 私钥认证：确认私钥格式正确（OpenSSH 或 PEM）
- 检查跳板机上是否配置了正确的公钥

**错误**: "Database connection failed"
- 确认数据库 URL 中的主机地址是**远程数据库地址**
- 检查数据库凭证是否正确
- 确认跳板机能否访问数据库服务器

### 查看详细日志

后端日志会记录 SSH 连接的详细信息：

```bash
# 查看后端日志
cd backend
uv run uvicorn app.main:app --reload
```

查找日志中的 SSH 相关信息：
- `SSH tunnel established` - 隧道建立成功
- `SSH connection failed` - 连接失败（包含详细原因）
- `SSH tunnel closed` - 隧道关闭

## 安全提示

1. **私钥保护**:
   - 不要在公共场所使用私钥认证
   - 建议为私钥设置密码保护

2. **密码安全**:
   - 使用强密码
   - 避免在不安全的网络环境下输入密码

3. **权限控制**:
   - 跳板机用户应该只有必要的权限
   - 定期轮换 SSH 密钥和密码

4. **数据加密**:
   - SSH 隧道提供端到端加密
   - 所有数据库流量都通过加密通道传输

## 性能说明

- SSH 隧道建立时间: ~100-200ms
- 查询性能影响: 最小化（<50ms 额外延迟）
- 隧道自动保活: 30 秒 keepalive 间隔
- 连接复用: 同一数据库的多个查询共享隧道

## 高级功能

### 自动隧道管理

- 隧道在首次使用时自动建立
- 空闲时保持连接（keepalive）
- 应用关闭时自动清理
- 编辑配置时自动重建

### 并发支持

- 支持多个数据库同时使用不同的 SSH 隧道
- 单个隧道支持并发查询
- 自动连接池管理

## 测试验证

运行测试脚本验证连接：

```bash
# 安全的只读测试
python test_ssh_safe.py

# 综合测试套件（7 项测试）
python test_ssh_comprehensive.py
```

## 常见问题

**Q: 可以使用密钥文件路径而不是粘贴内容吗？**
A: 目前需要粘贴私钥内容。未来版本可能支持文件路径。

**Q: 支持多级跳板机（ProxyJump）吗？**
A: 当前版本仅支持单级跳板机。多级跳转可在未来版本添加。

**Q: SSH 隧道会自动重连吗？**
A: 如果隧道断开，下次查询时会自动重建。

**Q: 如何查看当前活跃的 SSH 隧道？**
A: 当前没有 UI 显示，可通过后端日志查看。未来可能添加监控面板。

---

**更多帮助**: 查看 [contracts/api.md](contracts/api.md) 了解 API 详情

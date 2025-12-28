# Research: MySQL 数据库支持

**Feature**: 004-mysql-support  
**Date**: 2025-12-28

## 1. MySQL Python 驱动选型

### Decision: mysql-connector-python

### Rationale
- **纯 Python 实现**：无需 C 扩展依赖，安装简单
- **官方维护**：由 Oracle/MySQL 团队维护，兼容性有保障
- **API 风格一致**：与 psycopg2 类似的 DBAPI 2.0 接口
- **支持 Python 3.13**：已验证兼容最新 Python 版本

### Alternatives Considered
| 驱动 | 优点 | 缺点 | 结论 |
|------|------|------|------|
| mysql-connector-python | 纯 Python，官方维护 | 性能略低于 C 扩展 | ✅ 选择 |
| PyMySQL | 纯 Python，社区活跃 | 非官方，更新不如官方快 | 备选 |
| mysqlclient | 性能最高（C 扩展） | 需要 libmysqlclient 系统依赖 | 不选 |
| aiomysql | 原生异步 | 基于 PyMySQL，维护不活跃 | 不选 |

### Implementation Note
使用同步驱动 + `asyncio.to_thread()` 包装，与现有 psycopg2 模式保持一致。

---

## 2. MySQL 元数据提取方案

### Decision: 使用 INFORMATION_SCHEMA

### Rationale
- **SQL 标准**：INFORMATION_SCHEMA 是 SQL 标准的一部分
- **版本兼容**：MySQL 5.x 和 8.x 均支持
- **无需特殊权限**：只需 SELECT 权限

### MySQL 元数据查询

#### 获取所有数据库/Schema
```sql
SELECT SCHEMA_NAME 
FROM INFORMATION_SCHEMA.SCHEMATA 
WHERE SCHEMA_NAME NOT IN ('information_schema', 'mysql', 'performance_schema', 'sys')
ORDER BY SCHEMA_NAME
```

#### 获取所有表和视图
```sql
SELECT 
    TABLE_SCHEMA,
    TABLE_NAME,
    TABLE_TYPE,
    TABLE_COMMENT
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA NOT IN ('information_schema', 'mysql', 'performance_schema', 'sys')
ORDER BY TABLE_SCHEMA, TABLE_NAME
```

#### 获取列信息
```sql
SELECT 
    TABLE_SCHEMA,
    TABLE_NAME,
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT,
    COLUMN_KEY,
    COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA NOT IN ('information_schema', 'mysql', 'performance_schema', 'sys')
ORDER BY TABLE_SCHEMA, TABLE_NAME, ORDINAL_POSITION
```

### 与 PostgreSQL 的差异
| 特性 | PostgreSQL | MySQL |
|------|------------|-------|
| Schema 概念 | 多 schema per database | 每个 database 是独立的 schema |
| 表注释获取 | obj_description() 函数 | TABLE_COMMENT 列 |
| 列注释获取 | col_description() 函数 | COLUMN_COMMENT 列 |
| 主键标识 | information_schema + pg_constraint | COLUMN_KEY = 'PRI' |
| 系统 schema | pg_catalog, pg_toast | mysql, information_schema, performance_schema, sys |

---

## 3. MySQL 连接字符串格式

### Decision: 支持标准 MySQL URL 格式

### Format
```
mysql://[user]:[password]@[host]:[port]/[database]
```

### Examples
```
mysql://root:123456@localhost:3306/scinew
mysql://admin:pass@db.example.com:3306/production
```

### Parsing Strategy
使用 `urllib.parse.urlparse()` 解析，提取：
- `scheme`: 用于识别数据库类型
- `username`: 用户名
- `password`: 密码
- `hostname`: 主机地址
- `port`: 端口（默认 3306）
- `path[1:]`: 数据库名（去除开头的 `/`）

---

## 4. sqlglot MySQL 方言支持

### Decision: 使用 sqlglot 的 mysql 方言

### Rationale
- sqlglot 原生支持 MySQL 方言
- 可用于 SQL 解析、验证、LIMIT 注入
- 与现有 PostgreSQL 处理保持一致

### Usage
```python
import sqlglot

# 解析 MySQL SQL
parsed = sqlglot.parse_one(sql, dialect="mysql")

# 验证是否为 SELECT
if not isinstance(parsed, sqlglot.exp.Select):
    raise ValueError("Only SELECT queries allowed")

# 注入 LIMIT
parsed_with_limit = parsed.limit(1000)
final_sql = parsed_with_limit.sql(dialect="mysql")
```

### MySQL vs PostgreSQL 语法差异
| 特性 | PostgreSQL | MySQL |
|------|------------|-------|
| 字符串引用 | 单引号 `'text'` | 单引号或双引号 |
| 标识符引用 | 双引号 `"column"` | 反引号 `` `column` `` |
| LIMIT 语法 | `LIMIT n OFFSET m` | `LIMIT m, n` 或 `LIMIT n OFFSET m` |
| 布尔类型 | true/false | TRUE/FALSE 或 1/0 |
| 类型转换 | `::type` | `CAST(... AS type)` |

sqlglot 会自动处理这些差异。

---

## 5. 连接器抽象设计

### Decision: Strategy Pattern + Factory

### Pattern Description
```
┌─────────────────────────┐
│   DatabaseConnector     │  (Abstract Base Class)
│   - test_connection()   │
│   - fetch_metadata()    │
│   - execute_query()     │
│   - get_dialect()       │
└───────────┬─────────────┘
            │
    ┌───────┴────────┐
    │                │
┌───┴───┐      ┌─────┴─────┐
│Postgres│      │   MySQL   │
│Connector│     │ Connector │
└────────┘      └───────────┘
            │
    ┌───────┴────────┐
    │ ConnectorFactory│
    │ get_connector() │
    └─────────────────┘
```

### Benefits
- **开闭原则 (OCP)**：添加新数据库类型只需新建 Connector 类
- **依赖倒置 (DIP)**：服务层依赖抽象接口，非具体实现
- **单一职责 (SRP)**：每个 Connector 只负责一种数据库
- **易于测试**：可以 mock Connector 进行单元测试

---

## 6. 凭证加密存储

### Decision: 使用 Fernet 对称加密

### Rationale
- Python 标准库 `cryptography` 提供 Fernet
- 简单易用，安全性足够
- 适合本地存储场景

### Implementation Approach
```python
from cryptography.fernet import Fernet

# 生成或加载应用密钥（存储在环境变量或配置文件）
ENCRYPTION_KEY = os.environ.get("DB_ENCRYPTION_KEY") or Fernet.generate_key()
fernet = Fernet(ENCRYPTION_KEY)

# 加密
encrypted_url = fernet.encrypt(url.encode()).decode()

# 解密
decrypted_url = fernet.decrypt(encrypted_url.encode()).decode()
```

### Note
此功能为 FR-011 要求，但可作为后续增强实现。当前阶段优先实现核心 MySQL 功能，凭证加密可在单独 PR 中完成。

---

## 7. MySQL 版本兼容性

### Decision: 支持 MySQL 5.7+ 和 8.x

### Compatibility Notes
| 版本 | INFORMATION_SCHEMA | 连接器支持 | 注意事项 |
|------|-------------------|-----------|---------|
| 5.7  | ✅ 完整支持 | ✅ | 默认字符集 latin1 |
| 8.0  | ✅ 完整支持 | ✅ | 默认字符集 utf8mb4，新认证插件 |

### MySQL 8.0 认证插件
MySQL 8.0 默认使用 `caching_sha2_password` 认证插件，mysql-connector-python 默认支持。

如果遇到旧客户端兼容问题，可在 MySQL 配置中设置：
```sql
ALTER USER 'user'@'%' IDENTIFIED WITH mysql_native_password BY 'password';
```

---

## Summary

| 研究项 | 决策 | 状态 |
|--------|------|------|
| MySQL 驱动 | mysql-connector-python | ✅ 已确定 |
| 元数据提取 | INFORMATION_SCHEMA | ✅ 已确定 |
| URL 格式 | mysql://user:pass@host:port/db | ✅ 已确定 |
| SQL 方言 | sqlglot mysql | ✅ 已确定 |
| 抽象模式 | Strategy + Factory | ✅ 已确定 |
| 凭证加密 | Fernet (可选增强) | ⏸️ 后续实现 |
| 版本兼容 | MySQL 5.7+/8.x | ✅ 已确定 |

所有 NEEDS CLARIFICATION 已解决，可进入 Phase 1 设计阶段。


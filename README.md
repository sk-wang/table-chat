<p align="center">
  <img src="https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Robot/3D/robot_3d.png" width="120" alt="TableChat Logo"/>
</p>

<h1 align="center">🤖 TableChat</h1>

<p align="center">
  <strong>让 AI 帮你探索数据库、生成 SQL —— 像和专家对话一样简单</strong>
</p>

<p align="center">
  <a href="#-核心亮点">核心亮点</a> •
  <a href="#-快速开始">快速开始</a> •
  <a href="#-功能特性">功能特性</a> •
  <a href="#-技术栈">技术栈</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/AI_Powered-Claude-blueviolet?style=for-the-badge&logo=anthropic" alt="Claude Powered"/>
  <img src="https://img.shields.io/badge/Database-PostgreSQL_|_MySQL-blue?style=for-the-badge&logo=postgresql" alt="Database Support"/>
  <img src="https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker" alt="Docker Ready"/>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/python-3.13+-green.svg" alt="Python 3.13+"/>
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react" alt="React 19"/>
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License"/>
</p>

---

## ✨ 核心亮点

### 🧠 AI Agent 模式

不同于简单的 "文字转SQL"，TableChat 的 **Agent 模式** 让 AI 像一个真正的数据库专家一样工作：

| 能力 | 说明 |
|------|------|
| 🔍 **自主探索** | AI 会主动查看表结构、理解表关系 |
| 💭 **透明思考** | 实时看到 AI 的推理过程和工具调用 |
| 🛠️ **智能工具** | 列表、查结构、试查询，步步为营 |
| ✅ **任意 SQL** | SELECT、CREATE INDEX、ALTER TABLE 都行 |

<details>
<summary>💡 <b>示例：创建索引</b></summary>

```
👤 用户: 帮我给订单表的用户ID加个索引

🤖 Agent 思考中...
   ├─ 🔧 list_tables → 发现 orders, users, products...
   ├─ 🔧 get_table_schema("orders") → 找到 user_id 字段
   └─ 💡 生成: CREATE INDEX idx_orders_user_id ON orders(user_id);

✅ SQL 已生成，点击复制到编辑器
```

</details>


## 🚀 快速开始

**30 秒启动，无需安装 Python/Node 环境！**

```bash
# 1. 克隆项目
git clone https://github.com/your-username/tableChat.git
cd tableChat

# 2. 配置 API Key
cp .env.example .env
# 编辑 .env，填入 LLM_API_KEY（详见下方「环境变量」章节）

# 3. 一键启动
docker compose up -d

# 🎉 完成！
# 前端: http://localhost:5888
# API:  http://localhost:7888/docs
```

<details>
<summary>📋 <b>常用命令</b></summary>

```bash
docker compose ps          # 查看状态
docker compose logs -f     # 查看日志
docker compose down        # 停止服务
docker compose up --build  # 重新构建
```

</details>

---

## 🎬 功能演示

### Agent 模式 — 智能探索数据库

<p align="center">
  <img src="docs/img-2.png" alt="Agent Result" width="800"/>
</p>

> 💡 AI 自动探索表结构 → 执行验证查询 → 生成精准 SQL → Markdown 格式化输出

### 工具调用 — 透明的思考过程

<p align="center">
  <img src="docs/img-1.png" alt="Agent Panel" width="800"/>
</p>

> 🔧 可折叠的工具调用块，显示 `list_tables` → `get_table_schema` → `query_database` 完整链路

### 三种查询模式，自由切换

| SQL 编辑器 | 自然语言 | Agent 模式 |
|:---:|:---:|:---:|
| Monaco Editor | 简单场景快速生成 | 复杂场景智能探索 |
| 语法高亮、自动补全 | 两阶段提示链优化 | 实时流式输出 |
| Ctrl+Enter 执行 | 支持大型数据库 | 可折叠工具调用 |

---

## 🔥 功能特性

<table>
<tr>
<td valign="top" width="50%">

### 🤖 AI 能力

- **Agent 模式** — Claude 驱动的智能代理
  - 实时流式输出思考过程
  - 可折叠的工具调用详情
  - 一键复制 SQL 到编辑器
- **自然语言查询** — 简单场景快速生成
  - 两阶段提示链，支持 3000+ 表
  - 智能识别导出意图

### 🗄️ 数据库支持

- PostgreSQL / MySQL 双支持
- 添加、编辑、删除连接
- 密码自动脱敏显示
- SSL 可选配置

</td>
<td valign="top" width="50%">

### 📝 SQL 编辑器

- Monaco Editor 语法高亮
- 快捷键 Ctrl+Enter 执行
- 安全限制仅 SELECT
- 自动 LIMIT 1000

### 📊 结果 & 导出

- 表格展示 + 分页排序
- 导出 CSV / JSON / XLSX
- 执行历史 + 中文全文搜索

### 🔍 Schema 浏览器

- 快速搜索过滤表名
- 表/字段注释显示
- 双击生成 SELECT

</td>
</tr>
</table>

---

## 🔌 LLM 架构

### 为什么选择 Anthropic API？

TableChat 的 **Agent 模式** 是核心功能，需要 LLM 具备强大的工具调用（Tool Use）能力。经过测试，**Anthropic Claude 在 Agent 场景下表现最佳**：

- 🧠 **更精准的工具调用** — Claude 能准确理解何时该调用哪个工具
- 🔗 **更好的多步推理** — 复杂查询场景下，能正确串联 `list_tables` → `get_schema` → `query` 等步骤  
- 📝 **更清晰的思考链** — 输出的推理过程更易读、更有条理

因此，TableChat 后端统一使用 **Anthropic SDK**。

### 统一代理架构

但我们也理解，很多用户希望使用其他 LLM 服务（如 vLLM、Azure OpenAI、本地部署模型等）。为了**兼容 OpenAI 格式的服务**，我们引入了 `claude-code-proxy` 作为统一入口：

```
┌─────────────┐                    ┌──────────────────┐                    ┌─────────────────┐
│  TableChat  │   Anthropic API    │ claude-code-proxy │   Anthropic/      │   LLM 服务       │
│   (后端)     │ ─────────────────> │      (代理)       │   OpenAI API     │ (Claude/vLLM等) │
└─────────────┘                    └──────────────────┘ ─────────────────> └─────────────────┘
                                          ↑
                                   所有请求统一入口
```

**优势**：
- ✅ 后端代码简单 — 只需维护一套 Anthropic SDK 代码
- ✅ 配置统一 — 切换 LLM 只需改环境变量，无需改代码
- ✅ 一键部署 — `docker compose up` 自动启动 proxy

---

## ⚙️ 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `LLM_API_KEY` | API Key（必填） | - |
| `LLM_MODEL` | 使用的模型 | `claude-sonnet-4-5-20250929` |
| `UPSTREAM_API_TYPE` | 上游类型: `anthropic` 或 `openai` | `anthropic` |
| `UPSTREAM_API_BASE` | 上游 API 地址（可选） | 根据类型自动选择 |

### 🔵 Anthropic 模式（推荐）

直接使用 Claude API，Agent 效果最佳：

```bash
LLM_API_KEY=sk-ant-api03-xxxxx
# 就这么简单！一键启动：
docker compose up
```

### 🟢 OpenAI 兼容模式

连接 vLLM、LM Studio、Ollama 等服务：

```bash
LLM_API_KEY=your-key
UPSTREAM_API_TYPE=openai
UPSTREAM_API_BASE=http://your-server:8000/v1

# ⚠️ 模型名需要 openai/ 前缀
LLM_MODEL=openai/qwen/qwen3-4b-2507

# 同样一键启动：
docker compose up
```

> ⚠️ **注意**：OpenAI 兼容模式的 Agent 效果取决于模型的 Tool Use 能力。建议使用 GPT-4o 或同等级模型。

### 向后兼容

旧变量仍然支持：`AGENT_API_KEY`、`AGENT_API_BASE`、`AGENT_MODEL`

---

## 🛠️ 技术栈

<table>
<tr>
<td align="center" width="33%">
<h3>🐍 后端</h3>
Python 3.13 + FastAPI<br/>
Anthropic SDK<br/>
asyncpg / aiomysql<br/>
SQLite + FTS5
</td>
<td align="center" width="33%">
<h3>⚛️ 前端</h3>
React 19 + TypeScript<br/>
Ant Design 5<br/>
Monaco Editor<br/>
Refine 5
</td>
<td align="center" width="33%">
<h3>🐳 部署</h3>
Docker Compose<br/>
Nginx<br/>
Health Check<br/>
Volume 持久化
</td>
</tr>
</table>

---

## 📁 项目结构

```
tableChat/
├── backend/                 # Python 后端
│   ├── app/
│   │   ├── api/v1/         # API 路由 (含 agent 端点)
│   │   ├── services/       # 业务逻辑 (agent_service, agent_tools)
│   │   ├── connectors/     # 数据库连接器
│   │   └── models/         # Pydantic 模型
│   └── Dockerfile
├── frontend/               # React 前端
│   ├── src/
│   │   ├── components/
│   │   │   ├── agent/     # 🤖 Agent 模式组件
│   │   │   ├── editor/    # SQL 编辑器
│   │   │   └── ...
│   │   └── pages/
│   └── Dockerfile
└── docker-compose.yml      # 一键部署
```

---

## 🗺️ Roadmap

### ✅ 已完成

- [x] 🤖 **Agent 模式** — Claude 驱动的智能数据库探索
- [x] 💬 **自然语言查询** — 两阶段提示链，支持大型数据库
- [x] 🗄️ **多数据库支持** — PostgreSQL + MySQL
- [x] 📊 **多格式导出** — CSV / JSON / XLSX
- [x] 📜 **执行历史** — 中文全文搜索 (FTS5)
- [x] 🔐 **SSH 隧道** — 安全连接内网数据库
- [x] 🔌 **统一 LLM API** — Anthropic + OpenAI 兼容模式
- [x] 🐳 **一键部署** — Docker Compose 开箱即用

### 🚧 进行中

- [ ] 📝 查询收藏与分享
- [ ] 🎨 自定义主题

### 📋 计划中

- [ ] 👥 多用户支持
- [ ] 🔒 权限管理
- [ ] 📈 查询性能分析

---

## 📄 License

MIT License

---

<p align="center">
  <strong>⭐ 如果觉得有用，请给个 Star ⭐</strong>
</p>

<p align="center">
  Made with ❤️ by the TableChat Team
</p>

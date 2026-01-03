<p align="center">
  <img src="https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Robot/3D/robot_3d.png" width="120" alt="TableChat Logo"/>
</p>

<h1 align="center">🤖 TableChat</h1>

<p align="center">
  <strong>Let AI help you explore databases and generate SQL — as simple as chatting with an expert</strong>
</p>

<p align="center">
  🇺🇸 English | <a href="./readme_zh.md">🇨🇳 简体中文</a>
</p>

<p align="center">
  <a href="#-key-highlights">Key Highlights</a> •
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-features">Features</a> •
  <a href="#-tech-stack">Tech Stack</a>
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

## ✨ Key Highlights

### 🧠 AI Agent Mode

Unlike simple "text-to-SQL" tools, TableChat's **Agent Mode** lets AI work like a real database expert:

| Capability | Description |
|------|------|
| 🔍 **Autonomous Exploration** | AI proactively examines table structures and understands relationships |
| 💭 **Transparent Thinking** | Watch AI's reasoning process and tool calls in real-time |
| 🛠️ **Smart Tools** | List tables, check schemas, run test queries — step by step |
| ✅ **Any SQL** | SELECT, CREATE INDEX, ALTER TABLE — all supported |

<details>
<summary>💡 <b>Example: Creating an Index</b></summary>

```
👤 User: Help me add an index on user_id for the orders table

🤖 Agent thinking...
   ├─ 🔧 list_tables → Found orders, users, products...
   ├─ 🔧 get_table_schema("orders") → Found user_id column
   └─ 💡 Generated: CREATE INDEX idx_orders_user_id ON orders(user_id);

✅ SQL generated, click to copy to editor
```

</details>


## 🚀 Quick Start

**Start in 30 seconds — no Python/Node environment needed!**

```bash
# 1. Clone the project
git clone https://github.com/your-username/tableChat.git
cd tableChat

# 2. Configure API Key
cp .env.example .env
# Edit .env and add your LLM_API_KEY (see "Environment Variables" section below)

# 3. One-click start
docker compose up -d

# 🎉 Done!
# Frontend: http://localhost:5888
# API:      http://localhost:7888/docs
```

<details>
<summary>📋 <b>Common Commands</b></summary>

```bash
docker compose ps          # Check status
docker compose logs -f     # View logs
docker compose down        # Stop services
docker compose up --build  # Rebuild
```

</details>

---

## 🎬 Feature Demo

### Agent Mode — Intelligent Database Exploration

<p align="center">
  <img src="docs/img-2.png" alt="Agent Result" width="800"/>
</p>

> 💡 AI automatically explores table structures → Executes validation queries → Generates precise SQL → Outputs in Markdown format

### Tool Calls — Transparent Thinking Process

<p align="center">
  <img src="docs/img-1.png" alt="Agent Panel" width="800"/>
</p>

> 🔧 Collapsible tool call blocks showing the complete `list_tables` → `get_table_schema` → `query_database` chain

### Three Query Modes, Switch Freely

| SQL Editor | Natural Language | Agent Mode |
|:---:|:---:|:---:|
| Monaco Editor | Quick generation for simple scenarios | Intelligent exploration for complex scenarios |
| Syntax highlighting, auto-completion | Two-stage prompt chain optimization | Real-time streaming output |
| Ctrl+Enter to execute | Supports large databases | Collapsible tool calls |

---

## 🔥 Features

<table>
<tr>
<td valign="top" width="50%">

### 🤖 AI Capabilities

- **Agent Mode** — Claude-powered intelligent agent
  - Real-time streaming output of thinking process
  - Collapsible tool call details
  - One-click copy SQL to editor
- **Natural Language Query** — Quick generation for simple scenarios
  - Two-stage prompt chain, supports 3000+ tables
  - Smart export intent detection

### 🗄️ Database Support

- PostgreSQL / MySQL dual support
- Add, edit, delete connections
- Auto-masked password display
- Optional SSL configuration

</td>
<td valign="top" width="50%">

### 📝 SQL Editor

- Monaco Editor syntax highlighting
- Ctrl+Enter shortcut to execute
- Safety-restricted to SELECT only
- Auto LIMIT 1000

### 📊 Results & Export

- Table display + pagination/sorting
- Export to CSV / JSON / XLSX
- Query history + full-text search

### 🔍 Schema Browser

- Quick search to filter tables
- Table/column comments display
- Double-click to generate SELECT

</td>
</tr>
</table>

---

## 🔌 LLM Architecture

### Why Anthropic API?

TableChat's **Agent Mode** is a core feature that requires strong tool use capabilities from the LLM. After testing, **Anthropic Claude performs best in Agent scenarios**:

- 🧠 **More Precise Tool Calls** — Claude accurately understands when to call which tool
- 🔗 **Better Multi-step Reasoning** — Correctly chains `list_tables` → `get_schema` → `query` steps in complex scenarios
- 📝 **Clearer Chain of Thought** — More readable and organized reasoning output

Therefore, TableChat backend uniformly uses **Anthropic SDK**.

### Unified Proxy Architecture

However, we understand that many users want to use other LLM services (like vLLM, Azure OpenAI, locally deployed models, etc.). To **support OpenAI-compatible services**, we introduced `claude-code-proxy` as a unified entry point:

```
┌─────────────┐                    ┌──────────────────┐                    ┌─────────────────┐
│  TableChat  │   Anthropic API    │ claude-code-proxy│   Anthropic/       │   LLM Service   │
│  (Backend)  │ ─────────────────> │     (Proxy)      │   OpenAI API       │ (Claude/vLLM)   │
└─────────────┘                    └──────────────────┘ ─────────────────> └─────────────────┘
                                          ↑
                                   Unified entry point
                                   for all requests
```

**Advantages**:
- ✅ Simple backend code — Only maintain one set of Anthropic SDK code
- ✅ Unified configuration — Switch LLMs by changing environment variables, no code changes
- ✅ One-click deployment — `docker compose up` automatically starts the proxy

---

## ⚙️ Environment Variables

| Variable | Description | Default |
|------|------|--------|
| `LLM_API_KEY` | API Key (required) | - |
| `LLM_MODEL` | Model to use | `claude-sonnet-4-5-20250929` |
| `UPSTREAM_API_TYPE` | Upstream type: `anthropic` or `openai` | `anthropic` |
| `UPSTREAM_API_BASE` | Upstream API URL (optional) | Auto-selected based on type |

### 🔵 Anthropic Mode (Recommended)

Direct use of Claude API for best Agent performance:

```bash
LLM_API_KEY=sk-ant-api03-xxxxx
# That's it! One-click start:
docker compose up
```

### 🟢 OpenAI Compatible Mode

Connect to vLLM, LM Studio, Ollama, etc.:

```bash
LLM_API_KEY=your-key
UPSTREAM_API_TYPE=openai
UPSTREAM_API_BASE=http://your-server:8000/v1

# ⚠️ Model name needs openai/ prefix
LLM_MODEL=openai/qwen/qwen3-4b-2507

# Same one-click start:
docker compose up
```

> ⚠️ **Note**: Agent performance in OpenAI compatible mode depends on the model's Tool Use capability. GPT-4o or equivalent models are recommended.

### Backward Compatibility

Legacy variables are still supported: `AGENT_API_KEY`, `AGENT_API_BASE`, `AGENT_MODEL`

---

## 🛠️ Tech Stack

<table>
<tr>
<td align="center" width="33%">
<h3>🐍 Backend</h3>
Python 3.13 + FastAPI<br/>
Anthropic SDK<br/>
asyncpg / aiomysql<br/>
SQLite + FTS5
</td>
<td align="center" width="33%">
<h3>⚛️ Frontend</h3>
React 19 + TypeScript<br/>
Ant Design 5<br/>
Monaco Editor<br/>
Refine 5
</td>
<td align="center" width="33%">
<h3>🐳 Deployment</h3>
Docker Compose<br/>
Nginx<br/>
Health Check<br/>
Volume Persistence
</td>
</tr>
</table>

---

## 📁 Project Structure

```
tableChat/
├── backend/                 # Python backend
│   ├── app/
│   │   ├── api/v1/         # API routes (including agent endpoints)
│   │   ├── services/       # Business logic (agent_service, agent_tools)
│   │   ├── connectors/     # Database connectors
│   │   └── models/         # Pydantic models
│   └── Dockerfile
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── agent/     # 🤖 Agent mode components
│   │   │   ├── editor/    # SQL editor
│   │   │   └── ...
│   │   └── pages/
│   └── Dockerfile
└── docker-compose.yml      # One-click deployment
```

---

## 🗺️ Roadmap

### ✅ Completed

- [x] 🤖 **Agent Mode** — Claude-powered intelligent database exploration
- [x] 💬 **Natural Language Query** — Two-stage prompt chain, supports large databases
- [x] 🗄️ **Multi-database Support** — PostgreSQL + MySQL
- [x] 📊 **Multi-format Export** — CSV / JSON / XLSX
- [x] 📜 **Query History** — Full-text search (FTS5)
- [x] 🔐 **SSH Tunnel** — Secure connection to internal databases
- [x] 🔌 **Unified LLM API** — Anthropic + OpenAI compatible mode
- [x] 🐳 **One-click Deployment** — Docker Compose out of the box

### 🚧 In Progress

- [ ] 📝 Query bookmarks and sharing
- [ ] 🎨 Custom themes

### 📋 Planned

- [ ] 👥 Multi-user support
- [ ] 🔒 Permission management
- [ ] 📈 Query performance analysis

---

## 📄 License

MIT License

---

<p align="center">
  <strong>⭐ If you find this useful, please give it a Star ⭐</strong>
</p>

<p align="center">
  Made with ❤️ by the TableChat Team
</p>

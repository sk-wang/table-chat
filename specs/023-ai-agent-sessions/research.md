# Research: AI Agent Multi-Session Support

**Feature**: 023-ai-agent-sessions  
**Date**: 2026-01-17

## Research Summary

### 1. Existing Agent Architecture Analysis

**Decision**: Extend existing agent infrastructure rather than rebuild

**Rationale**: 
- Current agent implementation is well-structured with clear separation (agent_service.py, agent_tools.py, agent.py API)
- SSE streaming already works reliably
- Frontend components (AgentChat, AgentSidebar, ToolCallBlock) are modular
- SQLite infrastructure already exists with migration pattern

**Key Findings**:
- Backend: `backend/app/services/agent_service.py` - Core agent loop
- Backend: `backend/app/api/v1/agent.py` - SSE streaming endpoints
- Backend: `backend/app/db/sqlite.py` - SQLite manager with migration pattern
- Frontend: `frontend/src/hooks/useAgentChat.ts` - Reducer-based state management
- Frontend: `frontend/src/components/agent/` - Modular component structure

**Alternatives Considered**:
- Full rewrite with different state management → Rejected (unnecessary, current works well)
- Use external chat service → Rejected (adds complexity, doesn't fit single-user model)

---

### 2. Database Schema Design

**Decision**: Add `agent_conversations` and `agent_messages` tables to existing SQLite

**Rationale**:
- Follows existing pattern (databases, table_metadata, query_history, editor_memory)
- Uses migration pattern already established in sqlite.py
- Foreign key to `databases.name` for connection isolation
- JSON storage for tool call metadata (consistent with columns_json pattern)

**Schema Design**:
```sql
-- Conversations table
CREATE TABLE IF NOT EXISTS agent_conversations (
    id TEXT PRIMARY KEY,  -- UUID
    connection_id TEXT NOT NULL,  -- FK to databases.name
    title TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (connection_id) REFERENCES databases(name) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_conv_connection ON agent_conversations(connection_id);
CREATE INDEX IF NOT EXISTS idx_conv_updated ON agent_conversations(updated_at DESC);

-- Messages table
CREATE TABLE IF NOT EXISTS agent_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    tool_calls_json TEXT,  -- JSON array of ToolCallEventData
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (conversation_id) REFERENCES agent_conversations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_msg_conversation ON agent_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_msg_created ON agent_messages(created_at);
```

**Alternatives Considered**:
- Separate tool_calls table → Rejected (over-normalized for read-heavy use case)
- Store full SSE event stream → Rejected (too verbose, only need final state)
- IndexedDB frontend storage → Rejected (user chose backend SQLite)

---

### 3. LLM Title Generation

**Decision**: Use existing LLM infrastructure with lightweight prompt

**Rationale**:
- User explicitly chose LLM-generated titles over truncation
- Can reuse existing Anthropic client from agent_service
- Async non-blocking call after first message

**Implementation Approach**:
- Separate lightweight function in agent_service.py
- System prompt: "Generate a concise 5-10 word title for this database query conversation"
- Use smaller/faster model variant if available
- Fallback to first 30 chars if LLM fails

**Alternatives Considered**:
- Client-side title generation → Rejected (inconsistent results)
- Keyword extraction → Rejected (less natural than LLM)

---

### 4. Frontend Sidebar UI

**Decision**: Use Ant Design Layout.Sider with custom conversation list component

**Rationale**:
- Ant Design X Conversations component is too opinionated for our needs
- Layout.Sider provides collapsible behavior out-of-box
- Custom list allows inline editing and delete confirmation
- Matches existing project patterns (Ant Design 5)

**Component Structure**:
```
AgentPage (new layout wrapper)
├── ConversationSidebar (new)
│   ├── NewConversationButton
│   ├── ConversationList
│   │   └── ConversationItem (with inline edit, delete)
│   └── CollapseToggle
└── AgentChat (existing, modified for conversation context)
```

**Key Patterns**:
- Ant Design `Layout.Sider` with `collapsible` prop
- `List` component for conversation items
- `Typography.Text` with `editable` prop for inline rename
- `Popconfirm` for delete confirmation
- React Context for conversation state (conversationId, messages)

**Alternatives Considered**:
- Ant Design X Conversations → Rejected (requires @ant-design/x dependency)
- Drawer component → Rejected (not persistent enough for primary navigation)

---

### 5. Context Window Strategy

**Decision**: 20-message sliding window for LLM context

**Rationale**:
- User confirmed N=20 during clarification
- Balances context quality with token costs
- Consistent with current 3-turn history pattern (just expanded)

**Implementation**:
- Store all messages in database (full history for UI)
- When calling LLM, send only last 20 messages
- Include tool call results in message content for context

**Alternatives Considered**:
- Full history → Rejected (token limits, cost)
- Summarization → Rejected (complexity, may lose important details)

---

## Technology Decisions Summary

| Area | Decision | Key Dependency |
|------|----------|----------------|
| Storage | Backend SQLite | aiosqlite (existing) |
| Schema | 2 tables (conversations, messages) | Migration pattern |
| Title Gen | LLM via Anthropic SDK | anthropic (existing) |
| Frontend UI | Ant Design Sider + custom list | antd (existing) |
| State | React Context + useReducer | react (existing) |
| Context Window | 20 messages sliding | Backend logic |

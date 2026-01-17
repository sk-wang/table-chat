# Data Model: AI Agent Multi-Session Support

**Feature**: 023-ai-agent-sessions  
**Date**: 2026-01-17

## Entity Relationship Diagram

```
┌─────────────────────┐
│     databases       │
│─────────────────────│
│ name (PK)           │◄──────────────┐
│ url                 │               │
│ db_type             │               │
│ ...                 │               │
└─────────────────────┘               │
                                      │ FK: connection_id
                                      │
┌─────────────────────┐               │
│ agent_conversations │               │
│─────────────────────│               │
│ id (PK) UUID        │───────────────┘
│ connection_id (FK)  │
│ title               │◄──────────────┐
│ created_at          │               │
│ updated_at          │               │
└─────────────────────┘               │
                                      │ FK: conversation_id
                                      │
┌─────────────────────┐               │
│   agent_messages    │               │
│─────────────────────│               │
│ id (PK) INTEGER     │───────────────┘
│ conversation_id (FK)│
│ role                │
│ content             │
│ tool_calls_json     │
│ created_at          │
└─────────────────────┘
```

## Table Definitions

### agent_conversations

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | UUID v4 generated on creation |
| connection_id | TEXT | NOT NULL, FK | References databases.name |
| title | TEXT | NOT NULL | Auto-generated or user-edited title |
| created_at | TEXT | NOT NULL, DEFAULT now | ISO 8601 timestamp |
| updated_at | TEXT | NOT NULL, DEFAULT now | Updated on new message or rename |

**Indexes**:
- `idx_conv_connection` on `connection_id` - Filter by database connection
- `idx_conv_updated` on `updated_at DESC` - Sort by recent activity

**Cascade**: DELETE on `databases.name` cascades to delete all related conversations

### agent_messages

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Auto-increment message ID |
| conversation_id | TEXT | NOT NULL, FK | References agent_conversations.id |
| role | TEXT | NOT NULL, CHECK | Either 'user' or 'assistant' |
| content | TEXT | NOT NULL | Message text content |
| tool_calls_json | TEXT | NULL | JSON array of tool call metadata |
| created_at | TEXT | NOT NULL, DEFAULT now | ISO 8601 timestamp |

**Indexes**:
- `idx_msg_conversation` on `conversation_id` - Retrieve messages for conversation
- `idx_msg_created` on `created_at` - Order messages chronologically

**Cascade**: DELETE on `agent_conversations.id` cascades to delete all messages

## JSON Schemas

### tool_calls_json Structure

```json
[
  {
    "id": "toolu_01abc123",
    "tool": "list_tables",
    "input": {"schema": "public"},
    "status": "completed",
    "output": "Found 15 tables: users, orders, ...",
    "duration_ms": 234
  },
  {
    "id": "toolu_02def456",
    "tool": "get_table_schema",
    "input": {"table": "users"},
    "status": "completed",
    "output": "Columns: id (integer), name (varchar), ...",
    "duration_ms": 156
  }
]
```

## Pydantic Models

### Backend Models (backend/app/models/conversation.py)

```python
from datetime import datetime
from typing import Any
from pydantic import BaseModel, Field
from humps import camelize

def to_camel(string: str) -> str:
    return camelize(string)

class ConversationBase(BaseModel):
    """Base conversation model."""
    class Config:
        alias_generator = to_camel
        populate_by_name = True

class ConversationCreate(ConversationBase):
    """Create conversation request."""
    connection_id: str = Field(..., description="Database connection name")

class ConversationUpdate(ConversationBase):
    """Update conversation request."""
    title: str = Field(..., min_length=1, max_length=200)

class ConversationResponse(ConversationBase):
    """Conversation response."""
    id: str
    connection_id: str
    title: str
    created_at: datetime
    updated_at: datetime

class MessageCreate(ConversationBase):
    """Create message (internal use)."""
    role: str = Field(..., pattern="^(user|assistant)$")
    content: str
    tool_calls: list[dict[str, Any]] | None = None

class MessageResponse(ConversationBase):
    """Message response."""
    id: int
    conversation_id: str
    role: str
    content: str
    tool_calls: list[dict[str, Any]] | None = None
    created_at: datetime

class ConversationWithMessages(ConversationResponse):
    """Conversation with full message history."""
    messages: list[MessageResponse] = []

class GenerateTitleRequest(ConversationBase):
    """Request to generate title from first message."""
    first_message: str = Field(..., max_length=1000)
```

### Frontend Types (frontend/src/types/conversation.ts)

```typescript
export interface Conversation {
  id: string;
  connectionId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: number;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  toolCalls: ToolCallData[] | null;
  createdAt: string;
}

export interface ToolCallData {
  id: string;
  tool: string;
  input: Record<string, unknown>;
  status: 'running' | 'completed' | 'error';
  output: string | null;
  durationMs: number | null;
}

export interface ConversationWithMessages extends Conversation {
  messages: Message[];
}
```

## State Transitions

### Conversation Lifecycle

```
[Not Exists] ──create──► [Created/Empty] ──first message──► [Active/Has Title]
                                │                                   │
                                │                                   │
                                ▼                                   ▼
                         [Deleted] ◄────delete────────────── [Active/Has Title]
                                                                    │
                                                                    │ rename
                                                                    ▼
                                                            [Active/Renamed]
```

### Message States

Messages are immutable after creation. No state transitions - append-only log.

## Validation Rules

1. **Conversation ID**: Must be valid UUID v4 format
2. **Connection ID**: Must reference existing database connection
3. **Title**: 1-200 characters, auto-generated if not provided
4. **Role**: Must be exactly 'user' or 'assistant'
5. **Content**: Non-empty string
6. **tool_calls_json**: Valid JSON array or NULL

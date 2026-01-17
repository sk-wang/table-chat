# Quickstart: AI Agent Multi-Session Support

**Feature**: 023-ai-agent-sessions  
**Date**: 2026-01-17

## Overview

This feature adds multi-session conversation support to the AI Agent, allowing users to:
- Create multiple conversation sessions per database connection
- Switch between conversations with full history restoration
- Persist conversations to SQLite database
- Auto-generate conversation titles using LLM

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend                                  │
│  ┌─────────────────┐    ┌─────────────────────────────────────┐ │
│  │ ConversationSidebar│    │         AgentChat                 │ │
│  │  - New button    │    │  - Message list                    │ │
│  │  - Conv list     │◄──►│  - Input area                      │ │
│  │  - Edit/Delete   │    │  - Streaming display               │ │
│  └─────────────────┘    └─────────────────────────────────────┘ │
│           │                           │                          │
│           └───────────┬───────────────┘                          │
│                       ▼                                          │
│              ConversationContext                                 │
│              (React Context + useReducer)                        │
└───────────────────────┬─────────────────────────────────────────┘
                        │ REST API
                        ▼
┌───────────────────────────────────────────────────────────────────┐
│                        Backend                                     │
│  ┌─────────────────┐    ┌─────────────────┐    ┌───────────────┐ │
│  │ conversations.py │    │ agent.py (SSE)  │    │ agent_service │ │
│  │ (CRUD API)       │    │ (existing)      │    │ (LLM calls)   │ │
│  └────────┬─────────┘    └────────┬────────┘    └───────┬───────┘ │
│           │                       │                      │         │
│           └───────────┬───────────┴──────────────────────┘         │
│                       ▼                                            │
│              ┌─────────────────┐                                   │
│              │  SQLiteManager  │                                   │
│              │ (sqlite.py)     │                                   │
│              └────────┬────────┘                                   │
│                       ▼                                            │
│              ┌─────────────────┐                                   │
│              │   SQLite DB     │                                   │
│              │ - conversations │                                   │
│              │ - messages      │                                   │
│              └─────────────────┘                                   │
└───────────────────────────────────────────────────────────────────┘
```

## Key Files to Create/Modify

### Backend (New Files)

| File | Purpose |
|------|---------|
| `backend/app/models/conversation.py` | Pydantic models for conversations/messages |
| `backend/app/services/conversation_service.py` | Business logic for CRUD operations |
| `backend/app/api/v1/conversations.py` | REST API endpoints |

### Backend (Modify)

| File | Changes |
|------|---------|
| `backend/app/db/sqlite.py` | Add migration for agent_conversations, agent_messages tables |
| `backend/app/services/agent_service.py` | Add `generate_title()` method |
| `backend/app/api/v1/__init__.py` | Register conversations router |

### Frontend (New Files)

| File | Purpose |
|------|---------|
| `frontend/src/types/conversation.ts` | TypeScript interfaces |
| `frontend/src/contexts/ConversationContext.tsx` | React context for state |
| `frontend/src/components/agent/ConversationSidebar.tsx` | Sidebar with conversation list |
| `frontend/src/components/agent/ConversationItem.tsx` | List item with edit/delete |
| `frontend/src/services/conversationApi.ts` | API client functions |

### Frontend (Modify)

| File | Changes |
|------|---------|
| `frontend/src/components/agent/AgentChat.tsx` | Integrate with ConversationContext |
| `frontend/src/hooks/useAgentChat.ts` | Save messages to API after exchange |
| `frontend/src/pages/agent/index.tsx` | Wrap with ConversationContext, add sidebar layout |

## Implementation Order

### Phase 1: Backend Foundation
1. Add database schema migration
2. Create Pydantic models
3. Implement ConversationService
4. Create REST API endpoints
5. Add title generation to agent_service

### Phase 2: Frontend Core
1. Create TypeScript types
2. Implement API client
3. Create ConversationContext
4. Build ConversationSidebar component
5. Build ConversationItem component

### Phase 3: Integration
1. Modify AgentChat to use context
2. Update useAgentChat to persist messages
3. Integrate sidebar with AgentChat page
4. Wire up conversation switching

### Phase 4: Polish & Testing
1. Add loading/error states
2. Implement inline title editing
3. Add delete confirmation
4. Write backend unit tests
5. Write API integration tests (.rest)
6. Write E2E tests (Playwright)

## API Quick Reference

```bash
# List conversations
GET /api/v1/dbs/{connectionId}/conversations

# Create conversation
POST /api/v1/dbs/{connectionId}/conversations

# Get conversation with messages
GET /api/v1/conversations/{conversationId}

# Rename conversation
PATCH /api/v1/conversations/{conversationId}
{"title": "New Title"}

# Delete conversation
DELETE /api/v1/conversations/{conversationId}

# Add message
POST /api/v1/conversations/{conversationId}/messages
{"role": "user", "content": "...", "toolCalls": [...]}

# Generate title
POST /api/v1/conversations/{conversationId}/generate-title
{"firstMessage": "..."}
```

## Testing Checklist

- [ ] Create conversation → verify in DB
- [ ] List conversations → sorted by updatedAt DESC
- [ ] Switch conversation → messages load correctly
- [ ] Send message → persisted with tool calls
- [ ] Title generation → LLM called, title saved
- [ ] Rename → inline edit works
- [ ] Delete → confirmation, cascade delete messages
- [ ] Browser restart → conversations persist
- [ ] Switch database connection → different conversation list

# Implementation Plan: AI Agent Multi-Session Support

**Branch**: `023-ai-agent-sessions` | **Date**: 2026-01-17 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/023-ai-agent-sessions/spec.md`

## Summary

Add multi-session conversation support to the AI Agent, enabling users to create, switch between, and persist multiple conversation sessions per database connection. Conversations are stored in backend SQLite with a collapsible left sidebar UI similar to Cursor/ChatGPT. Key features include LLM-generated titles, 20-message sliding window context, and conversation isolation by database connection.

## Technical Context

**Language/Version**: Python 3.13+ (backend), TypeScript 5.9+ (frontend)  
**Primary Dependencies**: FastAPI, Pydantic, aiosqlite (backend); React 19, Ant Design 5, Monaco Editor (frontend)  
**Storage**: SQLite (backend, existing infrastructure)  
**Testing**: pytest, pytest-asyncio, .rest files (backend); Playwright (frontend E2E)  
**Target Platform**: Docker (Linux containers), modern browsers  
**Project Type**: Web application (frontend + backend)  
**Performance Goals**: Create conversation <2s, switch <1s, 100 conversations without degradation  
**Constraints**: 500 messages per conversation without UI slowdown  
**Scale/Scope**: Single user, multiple database connections, ~100 conversations per connection

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Ergonomic Python Backend | ✅ PASS | Using type hints, dataclasses, modern Python features |
| II. TypeScript Frontend | ✅ PASS | All new frontend code in .tsx files with strict types |
| III. Strict Type Annotations | ✅ PASS | Pydantic models for API, TypeScript interfaces for frontend |
| IV. Pydantic Data Models | ✅ PASS | ConversationResponse, MessageResponse with camelCase aliases |
| V. Open Access (No Auth) | ✅ PASS | No authentication required for conversation endpoints |
| VI. Comprehensive Testing | ✅ PASS | Backend pytest + .rest files, Frontend Playwright E2E planned |

**Post-Design Re-check**: All principles still satisfied. No violations.

## Project Structure

### Documentation (this feature)

```text
specs/023-ai-agent-sessions/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 research output
├── data-model.md        # Phase 1 data model
├── quickstart.md        # Phase 1 implementation guide
├── contracts/           # Phase 1 API contracts
│   └── conversations-api.yaml
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
backend/
├── app/
│   ├── api/v1/
│   │   ├── conversations.py    # NEW: Conversation REST endpoints
│   │   └── agent.py            # MODIFY: Integrate with conversations
│   ├── db/
│   │   └── sqlite.py           # MODIFY: Add migration for new tables
│   ├── models/
│   │   ├── conversation.py     # NEW: Pydantic models
│   │   └── agent.py            # EXISTS: Reference for ToolCallEventData
│   └── services/
│       ├── conversation_service.py  # NEW: CRUD operations
│       └── agent_service.py         # MODIFY: Add generate_title()
└── tests/
    ├── test_conversation_service.py  # NEW: Unit tests
    └── api-tests.rest                # MODIFY: Add conversation endpoints

frontend/
├── src/
│   ├── components/agent/
│   │   ├── ConversationSidebar.tsx   # NEW: Sidebar component
│   │   ├── ConversationItem.tsx      # NEW: List item component
│   │   ├── AgentChat.tsx             # MODIFY: Use ConversationContext
│   │   └── ...                       # EXISTS: Other agent components
│   ├── contexts/
│   │   └── ConversationContext.tsx   # NEW: React context
│   ├── hooks/
│   │   └── useAgentChat.ts           # MODIFY: Persist messages
│   ├── services/
│   │   └── conversationApi.ts        # NEW: API client
│   ├── types/
│   │   └── conversation.ts           # NEW: TypeScript interfaces
│   └── pages/agent/
│       └── index.tsx                 # MODIFY: Add sidebar layout
└── e2e/
    └── agent-conversations.spec.ts   # NEW: E2E tests
```

**Structure Decision**: Web application structure (Option 2) - existing tableChat architecture with separate backend/ and frontend/ directories.

## Complexity Tracking

> No violations to justify. All implementations follow existing patterns.

| Aspect | Approach | Rationale |
|--------|----------|-----------|
| Storage | Extend existing SQLite | Follows established pattern (query_history, editor_memory) |
| State Management | React Context + useReducer | Matches existing useAgentChat pattern |
| API Design | REST endpoints | Consistent with existing /api/v1/ structure |
| UI Layout | Ant Design Sider | Matches existing Ant Design usage |

## Related Artifacts

- [research.md](./research.md) - Technology decisions and alternatives
- [data-model.md](./data-model.md) - Database schema and Pydantic models
- [quickstart.md](./quickstart.md) - Implementation guide and file mapping
- [contracts/conversations-api.yaml](./contracts/conversations-api.yaml) - OpenAPI specification

# Tasks: AI Agent Multi-Session Support

**Input**: Design documents from `/specs/023-ai-agent-sessions/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Included per Constitution Principle VI (Comprehensive Testing Requirements)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `backend/` for Python FastAPI, `frontend/` for React TypeScript
- Paths based on existing tableChat structure per plan.md

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Database schema and shared models/types that all user stories depend on

- [x] T001 Add agent_conversations and agent_messages table migration in backend/app/db/sqlite.py
- [x] T002 [P] Create Pydantic models for Conversation and Message in backend/app/models/conversation.py
- [x] T003 [P] Create TypeScript interfaces for Conversation and Message in frontend/src/types/conversation.ts
- [x] T004 [P] Create conversation API client functions in frontend/src/services/conversationApi.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core backend service and API endpoints that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T005 Implement ConversationService with CRUD operations in backend/app/services/conversation_service.py
- [x] T006 Create REST API endpoints for conversations in backend/app/api/v1/conversations.py
- [x] T007 Register conversations router in backend/app/api/v1/__init__.py
- [x] T008 [P] Create ConversationContext with useReducer state management in frontend/src/contexts/ConversationContext.tsx
- [x] T009 [P] Add generate_title() method using LLM in backend/app/services/agent_service.py

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Create New Conversation (Priority: P1) 🎯 MVP

**Goal**: Users can create new conversations and start chatting with fresh context

**Independent Test**: Click "New Conversation" button, verify new empty conversation is created, send first message and verify title is auto-generated

### Tests for User Story 1

- [ ] T010 [P] [US1] Write unit tests for create_conversation in backend/tests/test_conversation_service.py
- [ ] T011 [P] [US1] Add .rest test cases for POST /api/v1/dbs/{connectionId}/conversations in backend/tests/api-tests.rest

### Implementation for User Story 1

- [ ] T012 [P] [US1] Create ConversationSidebar component with "New Conversation" button in frontend/src/components/agent/ConversationSidebar.tsx
- [ ] T013 [US1] Update AgentChat to use ConversationContext for active conversation in frontend/src/components/agent/AgentChat.tsx
- [ ] T014 [US1] Modify useAgentChat to save messages after each exchange in frontend/src/hooks/useAgentChat.ts
- [ ] T015 [US1] Update Agent page to include sidebar layout with ConversationContext provider in frontend/src/pages/agent/index.tsx
- [ ] T016 [US1] Implement auto-title generation after first message using generate-title API in frontend/src/hooks/useAgentChat.ts

**Checkpoint**: User Story 1 complete - users can create conversations and chat with auto-generated titles

---

## Phase 4: User Story 2 - View and Switch Between Conversations (Priority: P1)

**Goal**: Users can see conversation list and switch between them with full history restoration

**Independent Test**: Create multiple conversations, view them in sidebar sorted by recent, click to switch and verify full message history loads

### Tests for User Story 2

- [ ] T017 [P] [US2] Write unit tests for list_conversations and get_conversation in backend/tests/test_conversation_service.py
- [ ] T018 [P] [US2] Add .rest test cases for GET /api/v1/dbs/{connectionId}/conversations and GET /api/v1/conversations/{id} in backend/tests/api-tests.rest

### Implementation for User Story 2

- [ ] T019 [P] [US2] Create ConversationItem component for list display in frontend/src/components/agent/ConversationItem.tsx
- [ ] T020 [US2] Add conversation list loading and display in ConversationSidebar in frontend/src/components/agent/ConversationSidebar.tsx
- [ ] T021 [US2] Implement conversation switching with history load in ConversationContext in frontend/src/contexts/ConversationContext.tsx
- [ ] T022 [US2] Add visual indicator for active conversation in ConversationItem in frontend/src/components/agent/ConversationItem.tsx
- [ ] T023 [US2] Implement 20-message sliding window context for LLM calls in frontend/src/hooks/useAgentChat.ts

**Checkpoint**: User Stories 1 AND 2 complete - users can create and switch between conversations

---

## Phase 5: User Story 3 - Conversation Persistence Across Sessions (Priority: P1)

**Goal**: Conversations survive browser restart with all data intact including tool calls

**Independent Test**: Create conversation, send messages with tool calls, close browser, reopen and verify all data restored

### Tests for User Story 3

- [ ] T024 [P] [US3] Write unit tests for message persistence with tool_calls_json in backend/tests/test_conversation_service.py
- [ ] T025 [P] [US3] Add .rest test cases for POST /api/v1/conversations/{id}/messages with toolCalls in backend/tests/api-tests.rest

### Implementation for User Story 3

- [ ] T026 [US3] Ensure tool call metadata is serialized correctly in message creation in backend/app/services/conversation_service.py
- [ ] T027 [US3] Load conversation list on app startup in ConversationContext in frontend/src/contexts/ConversationContext.tsx
- [ ] T028 [US3] Restore tool call display in ToolCallBlock when loading history in frontend/src/components/agent/AgentChat.tsx
- [ ] T029 [US3] Add connection-based conversation isolation (filter by connectionId) in frontend/src/contexts/ConversationContext.tsx

**Checkpoint**: User Stories 1, 2, AND 3 complete - full persistence working

---

## Phase 6: User Story 4 - Delete Conversations (Priority: P2)

**Goal**: Users can delete unwanted conversations with confirmation

**Independent Test**: Select conversation, click delete, confirm in dialog, verify removed from list and database

### Tests for User Story 4

- [ ] T030 [P] [US4] Write unit tests for delete_conversation with cascade in backend/tests/test_conversation_service.py
- [ ] T031 [P] [US4] Add .rest test case for DELETE /api/v1/conversations/{id} in backend/tests/api-tests.rest

### Implementation for User Story 4

- [ ] T032 [US4] Add delete button with Popconfirm to ConversationItem in frontend/src/components/agent/ConversationItem.tsx
- [ ] T033 [US4] Implement delete handler in ConversationContext in frontend/src/contexts/ConversationContext.tsx
- [ ] T034 [US4] Handle active conversation deletion (switch to most recent or empty state) in frontend/src/contexts/ConversationContext.tsx

**Checkpoint**: User Story 4 complete - delete functionality working

---

## Phase 7: User Story 5 - Rename Conversations (Priority: P3)

**Goal**: Users can rename conversations via inline editing

**Independent Test**: Double-click conversation title, edit text, press Enter to save or Escape to cancel

### Tests for User Story 5

- [ ] T035 [P] [US5] Write unit tests for update_conversation title in backend/tests/test_conversation_service.py
- [ ] T036 [P] [US5] Add .rest test case for PATCH /api/v1/conversations/{id} in backend/tests/api-tests.rest

### Implementation for User Story 5

- [ ] T037 [US5] Add inline editing with Typography.Text editable to ConversationItem in frontend/src/components/agent/ConversationItem.tsx
- [ ] T038 [US5] Implement rename handler in ConversationContext in frontend/src/contexts/ConversationContext.tsx

**Checkpoint**: All user stories complete

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Testing, documentation, and improvements that affect multiple user stories

- [ ] T039 [P] Write Playwright E2E test for conversation create/switch/delete flow in frontend/e2e/agent-conversations.spec.ts
- [ ] T040 [P] Add loading states to ConversationSidebar in frontend/src/components/agent/ConversationSidebar.tsx
- [ ] T041 [P] Add error handling and retry for API failures in frontend/src/contexts/ConversationContext.tsx
- [ ] T042 [P] Add sidebar collapse/expand functionality in frontend/src/components/agent/ConversationSidebar.tsx
- [ ] T043 Run all backend tests and fix any failures: cd backend && pytest tests/
- [ ] T044 Run Playwright E2E tests and fix any failures: cd frontend && npx playwright test

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - US1, US2, US3 are all P1 priority and should be done sequentially
  - US4 (P2) can start after US3 completes
  - US5 (P3) can start after US4 completes
- **Polish (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational - No dependencies on other stories
- **User Story 2 (P1)**: Depends on US1 (needs conversations to exist to list/switch)
- **User Story 3 (P1)**: Depends on US2 (needs switch functionality to test persistence)
- **User Story 4 (P2)**: Depends on US3 (needs persistence working to test deletion)
- **User Story 5 (P3)**: Depends on US4 (needs list working to test rename)

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Backend changes before frontend changes
- Context/service layer before UI components
- Core implementation before integration

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel (T002, T003, T004)
- All Foundational tasks marked [P] can run in parallel (T008, T009)
- All tests within a story marked [P] can run in parallel
- All Polish tasks marked [P] can run in parallel

---

## Parallel Example: Phase 1 Setup

```bash
# Launch all parallel setup tasks together:
Task: "Create Pydantic models in backend/app/models/conversation.py"
Task: "Create TypeScript interfaces in frontend/src/types/conversation.ts"
Task: "Create API client functions in frontend/src/services/conversationApi.ts"
```

## Parallel Example: User Story 1 Tests

```bash
# Launch all US1 tests together:
Task: "Write unit tests for create_conversation in backend/tests/test_conversation_service.py"
Task: "Add .rest test cases for POST conversations in backend/tests/api-tests.rest"
```

---

## Implementation Strategy

### MVP First (User Stories 1-3)

1. Complete Phase 1: Setup (T001-T004)
2. Complete Phase 2: Foundational (T005-T009)
3. Complete Phase 3: User Story 1 (T010-T016)
4. **CHECKPOINT**: Test creating conversations and auto-title
5. Complete Phase 4: User Story 2 (T017-T023)
6. **CHECKPOINT**: Test listing and switching conversations
7. Complete Phase 5: User Story 3 (T024-T029)
8. **CHECKPOINT**: Test persistence across browser restart
9. **MVP COMPLETE**: Deploy/demo core functionality

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add User Story 1 → Test → Can create conversations
3. Add User Story 2 → Test → Can list/switch conversations
4. Add User Story 3 → Test → Persistence working (MVP!)
5. Add User Story 4 → Test → Can delete conversations
6. Add User Story 5 → Test → Can rename conversations
7. Polish → Test → Production ready

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Constitution requires: pytest tests, .rest files, Playwright E2E

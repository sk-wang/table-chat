# Feature Specification: AI Agent Multi-Session Support

**Feature Branch**: `023-ai-agent-sessions`  
**Created**: 2026-01-17  
**Status**: Draft  
**Input**: User description: "AI Agent交互优化 - ai agent支持多个会话。且会话会存储到sqlite数据库中，交互类似cursor"

## Clarifications

### Session 2026-01-17

- Q: 会话数据存储位置（后端SQLite vs 前端IndexedDB vs 混合模式）？ → A: 后端SQLite（服务器端存储，通过API访问）
- Q: 会话与数据库连接的关联方式？ → A: 会话按数据库连接隔离，每个连接有独立的会话列表，切换连接时自动切换对应的会话列表
- Q: 会话标题自动生成方式？ → A: 调用LLM生成简短摘要标题
- Q: 会话列表UI布局位置？ → A: 左侧边栏（可折叠），类似Cursor/ChatGPT布局
- Q: 继续历史会话时是否向LLM发送完整历史？ → A: 发送最近N条消息作为上下文（滑动窗口，N=20）

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create New Conversation (Priority: P1)

As a user, I want to start a new conversation with the AI Agent so that I can explore a fresh topic without mixing context with previous queries.

**Why this priority**: Core functionality - without the ability to create new conversations, multi-session support is meaningless. This is the foundation for all other features.

**Independent Test**: Can be fully tested by clicking "New Conversation" button and verifying a new empty conversation context is created. User can immediately start asking questions.

**Acceptance Scenarios**:

1. **Given** the user is on the Agent Mode page, **When** they click the "New Conversation" button, **Then** a new empty conversation is created and the chat area is cleared
2. **Given** the user has an active conversation, **When** they create a new conversation, **Then** the previous conversation is automatically saved and the new conversation becomes active
3. **Given** the user creates a new conversation, **When** they send their first message, **Then** the conversation is saved with a generated title based on the first message content

---

### User Story 2 - View and Switch Between Conversations (Priority: P1)

As a user, I want to see a list of my past conversations and switch between them so that I can continue previous work or reference past queries.

**Why this priority**: Essential for multi-session value - users need to access their conversation history to benefit from persistence.

**Independent Test**: Can be tested by creating multiple conversations, viewing them in a sidebar list, and clicking to switch between them. Each conversation should restore its full message history.

**Acceptance Scenarios**:

1. **Given** the user has multiple saved conversations, **When** they view the conversation list, **Then** they see all conversations with titles and timestamps sorted by most recent first
2. **Given** the user is viewing conversation A, **When** they click on conversation B in the list, **Then** conversation B's full message history is loaded and displayed
3. **Given** the user switches to an old conversation, **When** the conversation loads, **Then** all previous messages (user and AI) are displayed with their original formatting and tool call details

---

### User Story 3 - Conversation Persistence Across Sessions (Priority: P1)

As a user, I want my conversations to be saved automatically so that I don't lose my work when I close the browser or navigate away.

**Why this priority**: Core reliability requirement - data persistence is fundamental to the feature's value proposition.

**Independent Test**: Create a conversation, send messages, close the browser completely, reopen, and verify all conversations and messages are restored exactly as before.

**Acceptance Scenarios**:

1. **Given** the user is having a conversation, **When** they close the browser tab, **Then** the conversation is automatically saved to the database
2. **Given** the user has saved conversations, **When** they return to the application later, **Then** they see their conversation list with all previous conversations intact
3. **Given** a conversation with tool calls and SQL results, **When** the conversation is restored, **Then** all tool call details and results are displayed correctly

---

### User Story 4 - Delete Conversations (Priority: P2)

As a user, I want to delete conversations I no longer need so that I can keep my conversation list organized.

**Why this priority**: Important for usability but not critical for core functionality. Users can work without deletion initially.

**Independent Test**: Can be tested by selecting a conversation, clicking delete, confirming, and verifying it's removed from the list and database.

**Acceptance Scenarios**:

1. **Given** the user has a conversation in the list, **When** they click the delete button for that conversation, **Then** a confirmation dialog appears
2. **Given** the confirmation dialog is shown, **When** the user confirms deletion, **Then** the conversation and all its messages are permanently removed
3. **Given** the user is currently viewing the conversation being deleted, **When** deletion is confirmed, **Then** the view switches to the most recent remaining conversation or shows an empty state

---

### User Story 5 - Rename Conversations (Priority: P3)

As a user, I want to rename my conversations so that I can give them meaningful titles for easier identification.

**Why this priority**: Nice-to-have enhancement. Auto-generated titles work for most cases; manual renaming is a polish feature.

**Independent Test**: Can be tested by double-clicking a conversation title, entering a new name, and verifying the new title is saved and displayed.

**Acceptance Scenarios**:

1. **Given** a conversation in the list, **When** the user double-clicks the conversation title, **Then** the title becomes editable
2. **Given** the title is being edited, **When** the user enters a new title and presses Enter, **Then** the new title is saved and displayed
3. **Given** the title is being edited, **When** the user presses Escape, **Then** the edit is cancelled and the original title is restored

---

### Edge Cases

- What happens when the user tries to create a conversation but the database is unavailable? → Show error message and allow retry
- How does the system handle extremely long conversations (1000+ messages)? → Implement pagination/virtualization for message display
- What happens when two browser tabs have the same conversation open? → Last write wins; consider warning user
- How does the system handle network interruption during message send? → Queue messages locally and retry; show sync status
- What happens when storage quota is exceeded? → Warn user and suggest deleting old conversations

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST support creating new conversations with a unique identifier
- **FR-002**: System MUST automatically save conversations to backend SQLite database (server-side, accessed via API) on each message exchange
- **FR-003**: System MUST display a conversation list in a collapsible left sidebar (similar to Cursor/ChatGPT layout) showing all conversations with titles and timestamps
- **FR-004**: System MUST allow switching between conversations with full message history restoration
- **FR-005**: System MUST auto-generate conversation titles by calling LLM to generate a concise summary title based on the first user message
- **FR-006**: System MUST persist tool call details (list_tables, get_schema, query results) within messages
- **FR-007**: System MUST support deleting conversations with confirmation
- **FR-008**: System MUST support renaming conversation titles
- **FR-009**: System MUST isolate conversations by database connection; each connection has its own conversation list, switching connections automatically switches the displayed conversation list
- **FR-010**: System MUST load conversation list on application startup
- **FR-011**: System MUST sort conversations by last activity timestamp (most recent first)
- **FR-012**: System MUST show visual indicator for the currently active conversation
- **FR-013**: System MUST send the most recent 20 messages as context to LLM when continuing a conversation (sliding window approach)

### Key Entities

- **Conversation**: Represents a single chat session with the AI Agent. Contains unique ID, title, creation timestamp, last activity timestamp, and associated database connection ID (foreign key to connection).
- **Message**: Represents a single exchange in a conversation. Contains role (user/assistant), content, timestamp, and optional tool call metadata.
- **ToolCall**: Represents a tool invocation within an assistant message. Contains tool name, input parameters, and output results.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can create a new conversation and start chatting in under 2 seconds
- **SC-002**: Users can switch between conversations and see full history loaded in under 1 second
- **SC-003**: Conversation list displays up to 100 conversations without noticeable performance degradation
- **SC-004**: 100% of conversation data survives browser restart (no data loss)
- **SC-005**: Users can locate a specific past conversation within 10 seconds through visual scanning or search
- **SC-006**: System supports conversations with up to 500 messages without UI slowdown

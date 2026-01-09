# Research: Single SQL Statement Execution

**Feature**: 021-single-sql-execution
**Date**: 2026-01-09
**Status**: Phase 0 Complete

## Overview

This document records technical decisions, research findings, and rationale for key implementation choices in the Single SQL Statement Execution feature.

---

## 1. SQL Statement Boundary Detection Strategy

### Decision
**Frontend-based parsing** using a lightweight JavaScript SQL parser, with backend validation using existing sqlglot library.

### Rationale
- **Performance**: Parsing 10-50 statements client-side is faster than round-trip API calls
- **User Experience**: Immediate visual feedback without network latency (< 16ms for 60fps highlighting)
- **Existing Infrastructure**: Backend already uses sqlglot for SQL validation; can reuse for verification
- **Monaco Editor Integration**: Easy to integrate parsing results with Monaco's decoration API

### Alternatives Considered

| Alternative | Pros | Cons | Rejected Because |
|-------------|------|------|------------------|
| Backend-only parsing via API | Centralized logic, consistent with backend validation | Network latency (100-300ms), blocks UI responsiveness | Fails 60fps highlighting requirement |
| Pure regex-based splitting | Simple, no dependencies | Cannot handle nested queries, comments, string literals correctly | Spec requires 99% accuracy (FR-011) |
| SQL formatter library (sql-formatter) | Already in dependencies | Not designed for statement boundary detection, heavy for this use case | Overkill for boundary detection only |

### Implementation Notes
- Use simple tokenizer approach: scan for semicolons while respecting:
  - Single quotes (`'...'`)
  - Double quotes (`"..."`)
  - Block comments (`/* ... */`)
  - Line comments (`-- ...`, `# ...`)
- Backend sqlglot validation runs on actual execution as safety check

---

## 2. Real-Time Statement Highlighting Implementation

### Decision
**Monaco Editor Decorations API** with debounced cursor position tracking (50ms debounce).

### Rationale
- **Native Support**: Monaco provides `deltaDecorations()` for adding/removing highlights
- **Performance**: Decorations are optimized for frequent updates
- **Customizable**: Full control over highlight styling (background color, border, etc.)
- **Accessibility**: Decorations are compatible with screen readers

### Alternatives Considered

| Alternative | Pros | Cons | Rejected Because |
|-------------|------|------|------------------|
| CSS-based highlighting via line classes | Simple to implement | Monaco doesn't expose line-level class APIs easily | Poor API support |
| Overlay div positioning | Full custom styling | Complex z-index management, breaks on scroll/resize | Fragile, hard to maintain |
| Monaco markers API | Built-in error highlighting | Designed for errors/warnings, not interactive selection | Wrong semantic use case |

### Implementation Notes
- Debounce cursor position changes to 50ms to avoid excessive re-renders
- Use `IModelDeltaDecoration` with `className` for styling
- Clear previous decorations before applying new ones
- Highlight entire statement range (start line/column to end line/column)

---

## 3. Keyboard Shortcut Implementation

### Decision
**Monaco Editor's `addCommand()` API** with platform-specific key bindings (F8, Cmd+Enter on Mac, Ctrl+Enter on Windows/Linux).

### Rationale
- **Built-in Support**: Monaco handles keyboard events and platform detection
- **Conflict Avoidance**: Monaco's command system prevents conflicts with browser shortcuts
- **Consistency**: Same API used for other editor commands (e.g., format, save)

### Alternatives Considered

| Alternative | Pros | Cons | Rejected Because |
|-------------|------|------|------------------|
| Global document.addEventListener | Simple, works anywhere | Conflicts with browser shortcuts, doesn't respect editor focus | Poor UX, accessibility issues |
| React onKeyDown handler | React-native approach | Must manually handle platform detection, focus management | Reinvents what Monaco provides |
| External hotkey library (react-hotkeys) | Feature-rich | Extra dependency, Monaco already provides this | Unnecessary complexity |

### Implementation Notes
- Register commands:
  - `KeyCode.F8` for all platforms
  - `KeyMod.CtrlCmd | KeyCode.Enter` for platform-appropriate Ctrl/Cmd
- Commands only trigger when editor has focus
- Prevent default browser behavior for these keys

---

## 4. Query Timeout Configuration Storage

### Decision
**localStorage** for client-side preference persistence, no backend storage.

### Rationale
- **Simplicity**: No database schema changes, no backend API needed
- **User-Centric**: Timeout preference is per-browser, not per-account (aligns with no-auth principle)
- **Fast Access**: No network round-trip to read/write settings
- **Constitutional Compliance**: Aligns with "Open Access" principle (no user accounts)

### Alternatives Considered

| Alternative | Pros | Cons | Rejected Because |
|-------------|------|------|------------------|
| Backend SQLite settings table | Centralized, survives browser clear | Requires user identity (violates Principle V), adds DB complexity | Conflicts with no-auth design |
| Session storage | Same as localStorage | Lost on browser close | Poor UX for persistent preference |
| URL query parameters | Shareable timeout config | Clutters URL, requires manual management | Not a user preference pattern |

### Implementation Notes
- Store as JSON: `{ "queryTimeout": 30 }` (seconds)
- Key: `tableChat:queryTimeout`
- Default to 30s if not set or invalid
- Validate range: 10-300 seconds (per FR-013)
- Use React hook: `useLocalStorage('tableChat:queryTimeout', 30)`

---

## 5. Error Handling and Retry Mechanism

### Decision
**Ant Design Modal** for connection errors with retry button, inline error messages for SQL errors.

### Rationale
- **Consistency**: Ant Design is already the UI framework
- **User Guidance**: Modal grabs attention for critical connection failures
- **Retry Pattern**: Common UX pattern users understand
- **Separation of Concerns**: Connection errors (modal) vs SQL errors (inline) have different severity

### Alternatives Considered

| Alternative | Pros | Cons | Rejected Because |
|-------------|------|------|------------------|
| Toast notifications | Non-blocking | Easy to miss, no retry CTA | Connection failures need immediate attention |
| Inline error only (no modal) | Consistent placement | Connection errors look like SQL errors | Different error types need different treatment |
| Browser confirm() dialog | Simple, built-in | Ugly, not customizable, poor UX | Doesn't match app design system |

### Implementation Notes
- Connection error modal:
  ```tsx
  Modal.error({
    title: '数据库连接失败',
    content: '请检查网络或数据库状态',
    okText: '重试',
    onOk: () => retryQuery()
  })
  ```
- SQL error: Display in result panel with red background, error icon
- Timeout error: Similar to SQL error but suggest increasing timeout in settings

---

## 6. SQL Statement Extraction Logic

### Decision
**Cursor-first strategy**: Check manual selection first, fall back to cursor-based detection.

### Rationale
- **User Intent Priority**: Manual selection is explicit intent, should override auto-detection
- **Flexibility**: Supports both power users (manual selection) and casual users (cursor position)
- **Spec Compliance**: FR-003 requires manual selection to override automatic detection

### Implementation Notes
```typescript
function getStatementToExecute(editor: monaco.editor.IStandaloneCodeEditor): string {
  const selection = editor.getSelection();
  const model = editor.getModel();

  // 1. Check for manual selection
  if (selection && !selection.isEmpty()) {
    return model.getValueInRange(selection);
  }

  // 2. Fall back to cursor-based statement detection
  const cursorPosition = editor.getPosition();
  const statements = parseStatements(model.getValue());
  const statement = findStatementAtPosition(statements, cursorPosition);

  return statement?.text || '';
}
```

---

## 7. Performance Optimization Strategy

### Decision
**Debouncing and memoization** for frequent operations (cursor tracking, parsing).

### Rationale
- **60fps Requirement**: Highlighting must update in < 16ms
- **Parsing Cost**: Parsing 10,000 lines on every keystroke is wasteful
- **User Experience**: Debouncing feels responsive while reducing CPU usage

### Implementation Notes
- **Cursor position tracking**: 50ms debounce
  - User moves cursor → wait 50ms → update highlight
  - Prevents highlight flicker during rapid cursor movement
- **SQL parsing**: Memoize based on editor content hash
  ```typescript
  const parsedStatements = useMemo(() => {
    return parseStatements(sqlContent);
  }, [sqlContent]); // Only re-parse when content changes
  ```
- **Highlight application**: Use `requestAnimationFrame` for smooth rendering

---

## Summary of Key Decisions

| Area | Decision | Key Benefit |
|------|----------|-------------|
| Statement Detection | Frontend parsing + backend validation | < 50ms response time |
| Highlighting | Monaco Decorations API | Native, performant, accessible |
| Keyboard Shortcuts | Monaco addCommand() | Platform-aware, conflict-free |
| Timeout Storage | localStorage | Simple, no backend needed |
| Error Handling | Modal for connections, inline for SQL | Clear severity distinction |
| Execution Logic | Selection-first, cursor fallback | Flexible user intent support |
| Performance | Debounce + memoization | Meets 60fps + 2s exec goals |

All decisions align with constitutional principles and support the success criteria defined in the specification.
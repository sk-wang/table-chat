# Implementation Plan: Single SQL Statement Execution

**Branch**: `021-single-sql-execution` | **Date**: 2026-01-09 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/021-single-sql-execution/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Enable users to execute a single SQL SELECT statement from a multi-statement editor by positioning their cursor within the desired statement or manually selecting text. The system will detect statement boundaries using SQL parsing, provide real-time visual highlighting, and execute only the selected statement with configurable timeout (30s default, 10-300s range) and friendly error handling with retry capability.

**Primary Approach**: Frontend-focused feature enhancement leveraging Monaco Editor APIs for cursor tracking and text selection, combined with SQL parsing library (sqlglot already available in backend) for accurate statement boundary detection. Backend modifications minimal - mainly adding timeout configuration support.

## Technical Context

**Language/Version**:
- Backend: Python 3.13+ (uv managed)
- Frontend: TypeScript 5.9

**Primary Dependencies**:
- Backend: FastAPI, Pydantic, sqlglot (already present for SQL parsing)
- Frontend: React 19, Monaco Editor (@monaco-editor/react 4.7.0), Ant Design 5.x

**Storage**: SQLite (existing metadata store, no schema changes needed for this feature)

**Testing**:
- Backend: pytest, pytest-asyncio
- Frontend: vitest (unit), Playwright (E2E)
- API: .rest files (httpx)

**Target Platform**: Web application (backend API + frontend SPA)

**Project Type**: Web (backend + frontend)

**Performance Goals**:
- Statement boundary detection: < 50ms for editors up to 10,000 lines
- Visual highlight update: < 16ms (60fps) when cursor moves
- Single statement execution: < 2 seconds from cursor positioning to results display

**Constraints**:
- Only SELECT queries supported (already enforced by existing system)
- Editor must remain responsive during parsing (async/non-blocking operations)
- Highlight UX must not interfere with typing or editing

**Scale/Scope**:
- Typical use case: 10-50 SQL statements per editor session
- Max editor size: 10,000 lines (reasonable for SQL editing)
- Concurrent users: Scales with existing query execution infrastructure

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### ✅ Principle I: Ergonomic Python Backend
**Status**: PASS - Minimal backend changes needed (timeout configuration endpoint)
- Will use type hints and Pydantic models for any new backend code
- Existing service architecture supports extension

### ✅ Principle II: TypeScript Frontend
**Status**: PASS - Frontend implementation will be 100% TypeScript
- Monaco Editor APIs have TypeScript definitions
- Strict type checking enabled (tsconfig.json strict: true)

### ✅ Principle III: Strict Type Annotations
**Status**: PASS
- Backend: All new functions will have complete type annotations
- Frontend: No `any` types, explicit interfaces for all data structures

### ✅ Principle IV: Pydantic Data Models
**Status**: PASS - Backend timeout configuration will use Pydantic models with camelCase aliases

### ✅ Principle V: Open Access
**Status**: PASS - No authentication required (existing system design)

### ✅ Principle VI: Comprehensive Testing
**Status**: PASS - Testing plan includes:
- Backend unit tests for SQL parsing logic (pytest)
- Frontend unit tests for statement detection utility functions (vitest)
- E2E tests for user workflows (Playwright): cursor execution, visual highlighting, keyboard shortcuts, error handling
- API tests for timeout configuration (.rest files)

**Gate Result**: ✅ ALL GATES PASSED - Proceed to Phase 0

## Project Structure

### Documentation (this feature)

```text
specs/021-single-sql-execution/
├── spec.md                     # Feature specification (completed)
├── plan.md                     # This file (/speckit.plan output)
├── research.md                 # Phase 0 output (pending)
├── data-model.md              # Phase 1 output (pending)
├── quickstart.md              # Phase 1 output (pending)
├── contracts/                  # Phase 1 output (pending)
│   ├── frontend-api.ts        # TypeScript interfaces
│   └── backend-api.yaml       # OpenAPI spec for timeout config
└── tasks.md                    # Phase 2 output (/speckit.tasks - not created by /speckit.plan)
```

### Source Code (repository root)

```text
backend/
├── app/
│   ├── api/
│   │   └── query.py           # Existing query execution endpoint (modify for timeout)
│   ├── models/
│   │   ├── query.py           # Existing QueryRequest/Response (extend for timeout config)
│   │   └── settings.py        # NEW: User settings model for timeout preferences
│   ├── services/
│   │   ├── query_executor.py # Existing query executor (add timeout enforcement)
│   │   └── settings_service.py # NEW: Settings CRUD service
│   └── db/
│       └── sqlite.py          # Existing SQLite client (extend for settings table)
└── tests/
    ├── unit/
    │   └── test_query_timeout.py # NEW: Test timeout enforcement
    └── integration/
        └── test_settings_api.py    # NEW: Test settings endpoints

frontend/
├── src/
│   ├── components/
│   │   └── SqlEditor/
│   │       ├── SqlEditor.tsx           # MODIFY: Add cursor tracking + highlighting
│   │       ├── useSqlStatementParser.ts # NEW: Custom hook for statement detection
│   │       ├── useEditorHighlight.ts    # NEW: Custom hook for visual highlight
│   │       └── ExecutionControls.tsx    # MODIFY: Add retry button, keyboard shortcuts
│   ├── services/
│   │   ├── queryService.ts      # MODIFY: Add timeout parameter to query execution
│   │   └── settingsService.ts   # NEW: Settings API client
│   ├── utils/
│   │   └── sqlParser.ts         # NEW: SQL statement boundary detection logic
│   └── hooks/
│       └── useKeyboardShortcut.ts # NEW: Reusable keyboard shortcut hook
└── e2e/
    └── single-sql-execution.spec.ts # NEW: E2E tests for all user stories
```

**Structure Decision**: Web application structure (Option 2) - Feature requires coordination between frontend (SQL editor enhancements) and backend (timeout configuration). The `/backend/app/` directories follow FastAPI best practices with separation of API routes, models, services, and data access. The `/frontend/src/` structure organizes React components, custom hooks, and services. Tests are colocated with source code per language conventions.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No constitutional violations - table remains empty per requirements.


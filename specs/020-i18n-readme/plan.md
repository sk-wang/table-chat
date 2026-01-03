# Implementation Plan: Internationalize UI to English and Update README Files

**Branch**: `020-i18n-readme` | **Date**: 2025-01-02 | **Spec**: `/specs/020-i18n-readme/spec.md`
**Input**: Feature specification from `/specs/020-i18n-readme/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

This feature focuses on internationalizing the TableChat application by:
1. Converting all Chinese UI text to English for better international accessibility
2. Removing the "Copy to SQL Editor" button from the AI agent to prevent excessive SQL generation
3. Converting the main README.md to English while preserving the original Chinese content in readme_zh.md with bidirectional navigation links

## Technical Context

**Language/Version**: Python 3.13+ (backend), TypeScript (frontend)  
**Primary Dependencies**: FastAPI (backend), React + TypeScript (frontend), Tailwind CSS, Ant Design  
**Storage**: SQLite (existing)  
**Testing**: pytest (backend), Playwright (frontend E2E)  
**Target Platform**: Web application  
**Project Type**: Web application with separate frontend and backend  
**Performance Goals**: No significant performance impact expected, UI rendering times should remain unchanged  
**Constraints**: Must preserve all existing functionality while changing only language text  
**Scale/Scope**: UI text changes across all frontend components, README file restructuring

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Phase 0 Evaluation: PASS

### Post-Phase 1 Design Re-evaluation: PASS

### Principle I: Ergonomic Python Backend
**Status**: COMPLIANT
- This feature doesn't modify backend code, only frontend UI text changes
- No impact on backend Python code style or architecture

### Principle II: TypeScript Frontend
**Status**: COMPLIANT
- All frontend changes will maintain TypeScript usage (.ts/.tsx files)
- No `any` types will be introduced during text translations
- Component props will maintain existing type definitions

### Principle III: Strict Type Annotations
**Status**: COMPLIANT
- No new types or type changes required for this feature
- Existing type annotations will be preserved during text changes

### Principle IV: Pydantic Data Models
**Status**: COMPLIANT
- This feature doesn't modify backend data models
- No API changes affecting data models

### Principle V: Open Access (No Authentication)
**Status**: COMPLIANT
- No authentication changes are required
- The feature doesn't affect API access patterns

### Principle VI: Comprehensive Testing Requirements
**Status**: COMPLIANT (Implementation Plan Created)
- E2E tests must be updated to verify English UI text
- Tests must verify removal of "Copy to SQL Editor" button
- Tests must verify README functionality and links
- Testing approach documented in quickstart.md

### Technology Stack Requirements
**Status**: COMPLIANT
- All changes will use the approved technology stack
- No new dependencies or frameworks will be introduced

### Code Quality Gates
**Status**: COMPLIANT
- All code changes will pass existing type checking
- Formatting standards will be maintained
- No SQL security concerns for this UI/text-only feature

**Overall Status**: PASS

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
backend/
├── app/
│   ├── api/
│   ├── connectors/
│   ├── db/
│   ├── models/
│   ├── services/
│   └── main.py
├── tests/
│   ├── test_api/
│   ├── test_connectors/
│   ├── test_db/
│   ├── test_models/
│   └── test_services/
├── Dockerfile
└── pyproject.toml

frontend/
├── src/
│   ├── components/
│   ├── contexts/
│   ├── hooks/
│   ├── pages/
│   ├── providers/
│   ├── services/
│   ├── types/
│   ├── utils/
│   ├── App.tsx
│   └── main.tsx
├── e2e/
│   ├── app.spec.ts
│   ├── database-management.spec.ts
│   ├── query-history.spec.ts
│   ├── resizable-panel.spec.ts
│   ├── schema-comments.spec.ts
│   ├── sql-display.spec.ts
│   ├── sql-formatter.spec.ts
│   ├── sql-query.spec.ts
│   └── ssh-key-file-picker.spec.ts
├── tests/
├── dist/
├── Dockerfile
└── package.json
```

**Structure Decision**: This is a web application with a clear separation between backend and frontend. The backend uses Python with FastAPI, and the frontend uses React with TypeScript. The internationalization changes will primarily affect frontend components, with README changes in the project root.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No constitutional violations that require complexity justification. The feature is a straightforward UI text translation and documentation update that maintains all existing functionality while improving international accessibility.

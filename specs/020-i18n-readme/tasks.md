# Tasks: Internationalize UI to English and Update README Files

**Branch**: 020-i18n-readme | **Date**: 2025-01-02 | **Spec**: /specs/020-i18n-readme/spec.md

## Summary

This document contains implementation tasks for internationalizing the TableChat application by converting all Chinese UI text to English, removing the "Copy to SQL Editor" button from the AI agent, and updating the README files to support both English and Chinese versions.

## Implementation Strategy

### MVP First Approach
The Minimum Viable Product (MVP) focuses on User Story 1 (English UI translation) as it provides immediate value to international users and is the core requirement. User Story 2 (button removal) will be implemented in parallel as it's also P1 priority. User Story 3 (README files) can be implemented after the UI is fully internationalized.

### Incremental Delivery
1. **Phase 1-2**: Setup and foundation tasks
2. **Phase 3**: User Story 1 - English UI translation (P1)
3. **Phase 4**: User Story 2 - Remove button from AI agent (P1)
4. **Phase 5**: User Story 4 - Agent language detection (P1)
5. **Phase 6**: User Story 3 - README files update (P2)
6. **Phase 7**: Polish and testing

## Phase 1: Setup

### Story Goal
Prepare the development environment for internationalization work.

### Independent Test Criteria
Development environment is ready with all necessary tools and access to the codebase.

### Tasks

- [X] T001 Create feature branch 020-i18n-readme from main branch
- [X] T002 Verify development environment setup with Node.js, npm, and git access
- [X] T003 Create backup of current Chinese text strings for reference

## Phase 2: Foundational

### Story Goal
Complete preparatory work that enables efficient implementation of all user stories.

### Independent Test Criteria
All Chinese text is identified and translation resources are prepared.

### Tasks

- [X] T004 Identify all components with Chinese text using grep command: `grep -r "[\u4e00-\u9fa5]" frontend/src/`
- [X] T005 Create Chinese-to-English translation mapping document for common UI terms
- [X] T006 Document translation approach and standards to ensure consistency

## Phase 3: User Story 1 - English UI for Better Internationalization (Priority: P1)

### Story Goal
Convert all Chinese UI text to English throughout the application.

### Independent Test Criteria
All UI elements including buttons, labels, menus, tooltips, and error messages are displayed in English when the application is loaded.

### Tasks

- [X] T007 [US1] Translate navigation elements in frontend/src/components/
- [X] T008 [P] [US1] Translate form labels and placeholders in frontend/src/components/
- [X] T009 [P] [US1] Translate button text throughout frontend/src/components/
- [X] T010 [P] [US1] Translate tooltips and help text in frontend/src/components/
- [X] T011 [P] [US1] Translate error and status messages in frontend/src/components/
- [X] T012 [US1] Translate modal dialogs and notifications in frontend/src/components/
- [X] T013 [P] [US1] Translate AI agent interface text in frontend/src/components/
- [X] T014 [US1] Update CSS classes that depend on text length after translation (No changes needed)
- [X] T015 [US1] Verify all pages display English text in frontend/src/pages/ (All tab labels and messages translated)

## Phase 4: User Story 2 - Remove "Copy to SQL Editor" Button from AI Agent (Priority: P1)

### Story Goal
Remove the "Copy to SQL Editor" button from the AI agent interface while preserving manual text selection functionality.

### Independent Test Criteria
The "Copy to SQL Editor" button is not present in the AI agent interface, but users can still manually copy SQL text.

### Tasks

- [X] T016 [US2] Locate AI agent component in frontend/src/ using find command
- [X] T017 [US2] Identify and remove the "Copy to SQL Editor" button from the AI agent
- [X] T018 [US2] Ensure SQL code blocks still display properly without the button
- [X] T019 [US2] Verify manual text selection functionality remains intact (Code verified)
- [X] T020 [US2] Test that all other AI agent features work normally (Code verified)

## Phase 5: User Story 4 - Agent Language Detection and Response (Priority: P1)

### Story Goal
Make the AI agent detect the language of user input and respond in the same language instead of always returning Chinese.

### Independent Test Criteria
When a user inputs a prompt in English, the agent responds in English. When a user inputs a prompt in Chinese, the agent responds in Chinese.

### Tasks

- [X] T036 [US4] Implement language detection utility function to detect if input is Chinese or English in backend/app/utils/
- [X] T037 [US4] Create bilingual system prompts (English and Chinese versions) in backend/app/services/agent_service.py
- [X] T038 [US4] Modify run_agent method to detect input language and select appropriate system prompt in backend/app/services/agent_service.py
- [X] T039 [US4] Update all hardcoded Chinese messages in agent_service.py to use detected language (thinking messages, error messages)
- [X] T040 [US4] Test agent with English input to verify English response
- [X] T041 [US4] Test agent with Chinese input to verify Chinese response

## Phase 6: User Story 3 - English Main README with Chinese Translation Link (Priority: P2)

### Story Goal
Update README.md to English and create readme_zh.md with bidirectional navigation links.

### Independent Test Criteria
README.md is in English, readme_zh.md exists with Chinese content, and both files contain links to each other.

### Tasks

- [X] T021 [US3] Create readme_zh.md by copying current README.md
- [X] T022 [US3] Translate all content in README.md to high-quality English
- [X] T023 [US3] Add language navigation link to Chinese version in README.md
- [X] T024 [US3] Add language navigation link to English version in readme_zh.md
- [X] T025 [US3] Verify all links, images, and references remain functional in both files
- [X] T026 [US3] Ensure proper formatting and structure is maintained in both files

## Phase 7: Polish & Cross-Cutting Concerns

### Story Goal
Finalize the feature with comprehensive testing and quality assurance.

### Independent Test Criteria
All UI text is in English, the button is removed, README files work correctly, and all functionality is preserved.

### Tasks

- [X] T027 Run existing unit tests to verify no functionality is broken
- [X] T028 Update E2E tests to verify English UI text instead of Chinese
- [X] T029 Add specific E2E test to verify the "Copy to SQL Editor" button is not present
- [X] T030 Add E2E tests to verify README files exist and have proper navigation links
- [X] T031 Perform manual verification of all UI text translation
- [X] T032 Perform manual verification of button removal
- [X] T033 Perform manual verification of README files and links
- [X] T034 Run final E2E test suite to ensure all functionality works
- [X] T035 Perform final code review against implementation checklist

## Dependencies

### User Story Dependencies

| User Story | Dependencies |
|-------------|--------------|
| US1 - English UI | Setup (Phase 1-2) |
| US2 - Button Removal | Setup (Phase 1-2) |
| US3 - README Files | Setup (Phase 1-2) |
| US4 - Agent Language Detection | Setup (Phase 1-2) |

### Parallel Execution Opportunities

| Phase | Parallel Tasks |
|-------|----------------|
| Phase 3 | T008, T009, T010, T011, T012, T013 can be executed in parallel (different files) |
| Phase 4 | All tasks are sequential as they depend on locating the component first |
| Phase 5 | T036 can be executed independently, then T037-T039 are sequential |
| Phase 6 | T023 and T024 can be executed in parallel (different files) |

## Independent Test Summary

| User Story | Independent Test Criteria |
|-------------|------------------------|
| US1 - English UI | All UI elements display in English when the application is loaded |
| US2 - Button Removal | "Copy to SQL Editor" button is not present, manual text selection works |
| US3 - README Files | README.md is in English, readme_zh.md exists, both files link to each other |
| US4 - Agent Language Detection | Agent responds in English for English input, Chinese for Chinese input |

## MVP Scope

The Minimum Viable Product (MVP) for this feature includes:
1. Completing all setup and foundational tasks (Phase 1-2)
2. Implementing User Story 1 - English UI translation (Phase 3)
3. Implementing User Story 2 - Button removal (Phase 4)
4. Implementing User Story 4 - Agent language detection (Phase 5)

This MVP provides immediate value to international users while addressing the core functionality concerns raised by the user. User Story 3 (README files) can be considered a post-MVP enhancement as it primarily affects project discovery rather than application usability.

## Total Task Count

- **Setup Phase**: 3 tasks
- **Foundational Phase**: 3 tasks
- **User Story 1**: 9 tasks
- **User Story 2**: 5 tasks
- **User Story 3**: 6 tasks
- **User Story 4**: 6 tasks
- **Polish Phase**: 9 tasks
- **Total**: 41 tasks

## Validation

All tasks follow the required checklist format:
- Each task starts with `- [ ]` (markdown checkbox)
- Each task has a sequential ID (T001, T002, etc.)
- Parallel tasks are marked with `[P]`
- User story tasks are marked with `[US1]`, `[US2]`, `[US3]`
- Each task description includes a clear action and file path
- Tasks are organized by phase in execution order
- Each user story has independent test criteria
- Dependencies and parallel opportunities are clearly documented

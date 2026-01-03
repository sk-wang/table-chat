# Feature Specification: Internationalize UI to English and Update README Files

**Feature Branch**: `020-i18n-readme`
**Created**: 2025-01-02
**Status**: Draft
**Input**: User description: "把页面所有的中文UI都改成英文（国际化一点），然后把ai agent里面的\"复制到SQL编辑器\"按钮去掉，因为会生成很多SQL，然后把主readme.md换成英文，原本的readme.md复制一份readme_zh.md，能链接过去，readme.zh.md也能链接回主readme.md"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - English UI for Better Internationalization (Priority: P1)

As an international user or developer, I want all user interface elements to be displayed in English instead of Chinese, so that I can understand and use the application more effectively without language barriers.

**Why this priority**: This is the core requirement that affects all users of the application. International users cannot effectively use the application if they cannot understand the UI text.

**Independent Test**: Can be fully tested by navigating through all pages and verifying all UI text is in English, and delivers immediate value to non-Chinese speaking users.

**Acceptance Scenarios**:

1. **Given** the application is loaded, **When** I view any page, **Then** all UI elements including buttons, labels, menus, tooltips, and error messages are displayed in English
2. **Given** I am using the AI agent feature, **When** I look at the interface, **Then** I see English text instead of Chinese for all UI components including chat interface, buttons, and status messages
3. **Given** I navigate to different sections of the application, **When** I check the navigation and page titles, **Then** all are consistently in English

---

### User Story 2 - Remove "Copy to SQL Editor" Button from AI Agent (Priority: P1)

As a user interacting with the AI agent, I want the "Copy to SQL Editor" button to be removed from the AI agent interface, so that I don't accidentally generate and execute excessive SQL queries that could impact system performance or cause unnecessary database load.

**Why this priority**: This directly addresses the user's concern about generating too many SQL queries, which could have performance and security implications. It's a safety and user experience improvement.

**Independent Test**: Can be fully tested by interacting with the AI agent and verifying the specific button is not present, preventing accidental SQL generation.

**Acceptance Scenarios**:

1. **Given** I am in the AI agent chat interface, **When** I receive SQL code suggestions from the AI, **Then** I do not see a "Copy to SQL Editor" button (or its Chinese equivalent) next to or near the SQL code blocks
2. **Given** the AI agent generates SQL code, **When** I look at the response, **Then** I can still see and manually copy the SQL text, but without a dedicated button that automatically copies it to the editor
3. **Given** I interact with other code generation features, **When** the AI provides code snippets, **Then** only the SQL-specific automatic copy functionality is removed, not other helpful copy features

---

### User Story 3 - English Main README with Chinese Translation Link (Priority: P2)

As a developer or user discovering this project, I want the main README.md file to be in English with a clear link to a Chinese version (readme_zh.md), so that English-speaking users can understand the project while Chinese-speaking users can easily access documentation in their native language.

**Why this priority**: This improves the project's accessibility for international developers while maintaining accessibility for Chinese users. It helps with project adoption and contribution.

**Independent Test**: Can be fully tested by viewing the README files and verifying language and navigation, and delivers value to all project visitors regardless of their language preference.

**Acceptance Scenarios**:

1. **Given** I visit the project repository, **When** I open the main README.md file, **Then** all content is written in English with proper formatting and structure
2. **Given** I am viewing the English README.md, **When** I look for language options, **Then** I see a clear link or badge that says "中文" or "Chinese" that navigates to readme_zh.md
3. **Given** I click the link to the Chinese version, **When** the readme_zh.md opens, **Then** I see the original Chinese content with a link back to the English README.md (e.g., "English" or "英文" link)
4. **Given** I am viewing readme_zh.md, **When** I want to switch back, **Then** I can click an English link that returns me to the main README.md

---

### Edge Cases

- What happens when a UI element contains dynamic text that was in Chinese? Should it be internationalized or removed?
- How should the system handle mixed-language content that might exist in tooltips or help text?
- What if some UI elements are hardcoded in Chinese in third-party libraries or components?
- Should dates, numbers, and other locale-specific formats also be adjusted for international users?
- What if the user has browser language preferences set to Chinese? Should the app respect that setting?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display all user interface text in English instead of Chinese across all pages and components
- **FR-002**: System MUST remove the "Copy to SQL Editor" button (or its Chinese equivalent text "复制到SQL编辑器") from the AI agent interface
- **FR-003**: System MUST preserve manual text selection and copy functionality for SQL code blocks in the AI agent
- **FR-004**: The main README.md file MUST be converted to English while maintaining all existing structure and formatting
- **FR-005**: The original Chinese README.md content MUST be preserved in a new file named readme_zh.md
- **FR-006**: Both README files MUST contain bidirectional navigation links allowing users to switch between English and Chinese versions
- **FR-007**: System MUST ensure that no machine-translated gibberish appears in the UI - all English text should be natural and contextually appropriate
- **FR-008**: System MUST maintain the same functionality and user experience after translation - only the language should change

### Key Entities

**No data entities are affected by this feature as it focuses on UI text and documentation.**

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of visible UI elements are displayed in English with no remaining Chinese text in navigation, buttons, labels, or error messages
- **SC-002**: The "Copy to SQL Editor" button is completely removed from the AI agent interface, preventing automatic SQL generation
- **SC-003**: README.md is fully in English with proper grammar and technical terminology appropriate for an international developer audience
- **SC-004**: readme_zh.md contains the original Chinese content and is accessible via a clear link from the English README
- **SC-005**: Users can switch between English and Chinese README versions with a single click in either direction
- **SC-006**: All links, images, and references in both README files remain functional and properly formatted

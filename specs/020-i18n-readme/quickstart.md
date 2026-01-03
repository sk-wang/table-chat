# Quickstart Guide: Internationalize UI to English and Update README Files

**Date**: 2025-01-02  
**Feature**: 020-i18n-readme  
**Branch**: 020-i18n-readme

## Overview

This guide provides step-by-step instructions for implementing the UI internationalization feature, which includes:
1. Converting all Chinese UI text to English
2. Removing the "Copy to SQL Editor" button from the AI agent
3. Updating README.md to English with a Chinese version

## Prerequisites

- Git access to the tableChat repository
- Node.js and npm for frontend development
- Python and uv for backend (if needed)
- Familiarity with React/TypeScript components

## Implementation Steps

### Phase 1: UI Text Translation

1. **Identify Components with Chinese Text**
   ```bash
   # Search for Chinese characters in frontend files
   grep -r "[\u4e00-\u9fa5]" frontend/src/
   ```

2. **Translate UI Components**
   - Review each file containing Chinese text
   - Translate to natural, contextually appropriate English
   - Maintain component functionality and styling
   - Update text in buttons, labels, tooltips, error messages, etc.

3. **Common UI Text Translation Examples**
   - "数据库连接" → "Database Connection"
   - "查询历史" → "Query History"
   - "SQL编辑器" → "SQL Editor"
   - "表结构" → "Table Schema"
   - "AI助手" → "AI Assistant"

### Phase 2: Remove "Copy to SQL Editor" Button

1. **Locate AI Agent Component**
   ```bash
   # Find the AI agent component
   find frontend/src -name "*agent*" -o -name "*ai*"
   ```

2. **Remove the Button**
   - Identify the button component (likely labeled "复制到SQL编辑器")
   - Remove the button element while preserving SQL code display
   - Ensure manual text selection still works
   - Test that the AI agent still functions normally

### Phase 3: README Files Update

1. **Backup Current README**
   ```bash
   # Copy current README.md to readme_zh.md
   cp README.md readme_zh.md
   ```

2. **Update README.md to English**
   - Translate all content to high-quality English
   - Maintain proper formatting and structure
   - Add language navigation links

3. **Update readme_zh.md**
   - Add link to the English version
   - Preserve all original Chinese content

4. **Language Navigation Examples**
   - In README.md: `[中文](./readme_zh.md)` 
   - In readme_zh.md: `[English](./README.md)`

### Phase 4: Testing

1. **Frontend Unit Tests**
   ```bash
   # Run existing tests
   npm test
   ```

2. **E2E Tests with Playwright**
   ```bash
   # Run E2E tests
   npx playwright test
   ```

3. **Manual Verification**
   - Verify all UI text is in English
   - Confirm the "Copy to SQL Editor" button is removed
   - Check README files and navigation links
   - Ensure all functionality still works

## Code Review Checklist

- [ ] All Chinese text has been translated to English
- [ ] No new dependencies were added
- [ ] The "Copy to SQL Editor" button is removed
- [ ] Manual text selection in AI agent still works
- [ ] README.md is in English with proper formatting
- [ ] readme_zh.md exists with Chinese content
- [ ] Both README files have bidirectional navigation links
- [ ] All existing functionality is preserved
- [ ] All tests pass

## Common Issues and Solutions

### Styling Issues After Translation
- English text may be shorter or longer than Chinese
- Adjust CSS if text length affects layout
- Test responsive design after text changes

### Missing Translations
- Some dynamic text might be generated from APIs
- Check backend responses for Chinese text
- Update backend if necessary (unlikely for this feature)

### Broken Links in README
- Verify all links still work after translation
- Check internal links to documentation
- Ensure images and resources are properly referenced

## Rollback Plan

If issues arise during implementation:

1. **UI Text Rollback**
   ```bash
   # Use git to revert frontend changes
   git checkout -- frontend/src/
   ```

2. **README Rollback**
   ```bash
   # Restore original README.md
   git checkout HEAD -- README.md
   # Remove readme_zh.md if created
   rm readme_zh.md
   ```

## Conclusion

This internationalization feature significantly improves accessibility for international users while maintaining all existing functionality. The changes are primarily text translations and documentation updates with no architectural changes required.

For more detailed information, refer to:
- [research.md](./research.md) - Technical research and decisions
- [data-model.md](./data-model.md) - Data model considerations
- [contracts/README.md](./contracts/README.md) - API contracts information

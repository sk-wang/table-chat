# Research: Internationalize UI to English and Update README Files

**Date**: 2025-01-02  
**Feature**: 020-i18n-readme  
**Status**: Complete

## UI Text Internationalization

### Decision
All Chinese UI text will be converted to English across the entire frontend application.

### Rationale
International users cannot effectively use the application if they cannot understand the UI text. English is the most common language for international technical applications and documentation.

### Implementation Approach
1. Identify all Chinese text strings in frontend components
2. Translate to natural, contextually appropriate English
3. Replace in code while preserving functionality and formatting
4. Update any CSS classes or styling that depends on text length

### Alternatives Considered
- Using an internationalization library (e.g., react-i18next): Rejected due to complexity and the fact that we're only supporting English long-term
- Machine translation: Rejected due to potential for poor quality translations that don't match technical context

## "Copy to SQL Editor" Button Removal

### Decision
Remove the "Copy to SQL Editor" button (or its Chinese equivalent "复制到SQL编辑器") from the AI agent interface.

### Rationale
The user specifically requested this removal to prevent excessive SQL generation that could impact system performance. Manual copying remains available for users who need it.

### Implementation Approach
1. Identify the AI agent component that renders this button
2. Remove the button while preserving the SQL code display
3. Ensure manual text selection still works
4. Verify no other functionality is affected

### Alternatives Considered
- Making the button optional via settings: Rejected as the user specifically requested complete removal
- Adding a confirmation dialog: Rejected as this adds friction without addressing the core concern

## README.md English Conversion

### Decision
Convert the main README.md to English and create readme_zh.md with the original Chinese content, with bidirectional navigation links.

### Rationale
English README files improve accessibility for international developers and contributors, while maintaining accessibility for Chinese-speaking users through the Chinese version.

### Implementation Approach
1. Create a copy of the current README.md as readme_zh.md
2. Translate README.md to high-quality English
3. Add clear language navigation links in both files
4. Update all links, images, and references to remain functional
5. Ensure proper formatting and structure is maintained

### Alternatives Considered
- Using a bilingual README with both languages: Rejected as this makes the file very long and harder to navigate
- Using an automated translation tool: Rejected due to potential for poor quality translations for technical documentation

## Testing Strategy

### Decision
Update existing E2E tests to verify English UI text and button removal.

### Rationale
Testing is essential to ensure all UI changes work correctly and that no functionality is lost during the internationalization process.

### Implementation Approach
1. Update E2E tests to check for English text instead of Chinese
2. Add specific test to verify the "Copy to SQL Editor" button is not present
3. Add tests to verify README files exist and have proper navigation links
4. Ensure all existing functionality still works after changes

### Alternatives Considered
- Manual testing only: Rejected as E2E tests provide more comprehensive and repeatable verification
- Creating entirely new test suites: Rejected as updating existing tests is more efficient

## Technical Considerations

### No New Dependencies
No new libraries or dependencies are needed for this feature. All changes will be made using the existing technology stack.

### Performance Impact
Minimal to no performance impact is expected. Text changes do not affect application performance significantly.

### Risk Mitigation
1. Code review to ensure no functionality is lost during text changes
2. Comprehensive testing to verify UI works correctly
3. Backup of original Chinese text strings in case rollback is needed
4. Gradual rollout by component to catch issues early

## Conclusion

This research confirms that the internationalization feature can be implemented efficiently with the existing technology stack. The main work involves careful text translation and UI modifications, with no new architectural changes required. The feature will significantly improve accessibility for international users while maintaining existing functionality.

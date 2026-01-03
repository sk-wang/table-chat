# Translation Standards and Approach

**Date**: 2025-01-02  
**Feature**: 020-i18n-readme  
**Purpose**: Ensure consistency and quality in UI translation process

## Translation Principles

1. **Contextual Appropriateness**
   - Consider the specific context of each UI element
   - Use technical terminology appropriate for database tools
   - Maintain user-friendly language for all user interactions

2. **Consistency**
   - Use the same English term for the same Chinese term throughout the application
   - Refer to the translation mapping document for standard terms
   - Keep similar UI elements using similar phrasing

3. **Conciseness**
   - Prefer shorter, clearer text over lengthy explanations
   - Avoid unnecessary words or filler text
   - Use standard UI terminology (e.g., "Connect" instead of "Connect to database")

4. **Technical Accuracy**
   - Preserve the precise technical meaning of database terms
   - Use industry-standard terminology for SQL concepts
   - Ensure all technical terms are correctly translated

## Translation Process

1. **Identify Chinese Text**
   - Use the grep command to find all Chinese characters: `grep -r "[\u4e00-\u9fa5]" frontend/src/`
   - Document each occurrence with file location and context
   - Group similar terms for consistent translation

2. **Apply Translation**
   - Update each file with appropriate English translation
   - Preserve all functionality and styling
   - Test that UI elements still work correctly

3. **Review and Validate**
   - Check that translations make sense in context
   - Verify consistency across the application
   - Test UI responsiveness with potentially longer/shorter text

## Common Translation Patterns

| Pattern | Chinese | English | Notes |
|---------|---------|-------|
| Navigation elements | 数据库, 查询, 表, 设置 | Database, Query, Table, Settings |
| Action buttons | 连接, 断开, 查询, 清空, 保存 | Connect, Disconnect, Query, Clear, Save |
| Status messages | 成功, 错误, 警告, 加载中 | Success, Error, Warning, Loading |
| Form labels | 主机, 端口, 用户名, 密码 | Host, Port, Username, Password |

## Quality Checklist

- [ ] All Chinese text is replaced with appropriate English
- [ ] Technical terms are correctly translated
- [ ] Consistent terminology is used throughout
- [ ] UI layout is not broken by text length changes
- [ ] All buttons and controls remain functional
- [ ] Error and status messages are clear and helpful

## Testing Requirements

- [ ] Manual verification of all translated UI elements
- [ ] Automated E2E tests verify English text is displayed
- [ ] Responsive design tested with translated text
- [ ] User interactions work as expected with new text

## References

- [Translation Mapping Document](./translation_mapping.md) - Detailed term translations
- [Research Document](./research.md) - Implementation decisions and approach

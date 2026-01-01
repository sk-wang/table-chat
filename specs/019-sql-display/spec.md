# Feature Specification: SQL Code Display Optimization

**Feature Branch**: `019-sql-display`
**Created**: 2026-01-01
**Status**: Draft
**Input**: User description: "优化一下SQL代码的显示，宽度要小于现在ai agent的可见范围，并支持复制"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Copy SQL Code Block (Priority: P1)

用户在 AI Agent 对话中看到生成的 SQL 代码后，希望能够快速复制 SQL 代码以便粘贴到其他地方使用（如数据库客户端、文档等）。

**Why this priority**: 复制功能是用户明确请求的核心功能，直接提升使用效率。当前 Markdown 渲染的 SQL 代码块没有复制按钮，用户只能手动选择文本，体验不佳。

**Independent Test**: 可以通过发送任意生成 SQL 的请求，验证代码块右上角出现复制按钮，点击后 SQL 被复制到剪贴板且有成功反馈。

**Acceptance Scenarios**:

1. **Given** AI Agent 显示了一个包含 SQL 代码块的消息, **When** 用户将鼠标悬停在代码块上, **Then** 代码块右上角显示复制按钮
2. **Given** 复制按钮可见, **When** 用户点击复制按钮, **Then** SQL 代码被复制到系统剪贴板，按钮显示"已复制"反馈，2秒后恢复原状
3. **Given** 用户已复制 SQL 代码, **When** 用户在其他应用中粘贴, **Then** 粘贴的内容与代码块中的 SQL 完全一致（纯文本，无格式标记）

---

### User Story 2 - Constrained Width Display (Priority: P1)

用户希望 SQL 代码块的宽度不超过 AI Agent 消息区域的可见范围，避免水平滚动或内容溢出。

**Why this priority**: 这是用户明确请求的核心功能，与复制功能同等重要。当前实现已有宽度约束，但需要确保长 SQL 语句正确处理。

**Independent Test**: 可以通过生成超长 SQL 语句（如多表 JOIN、长字段列表），验证代码块不会超出消息气泡边界，超长内容可水平滚动查看。

**Acceptance Scenarios**:

1. **Given** AI Agent 生成了一条普通长度的 SQL, **When** 消息渲染完成, **Then** SQL 代码块宽度不超过消息气泡宽度
2. **Given** AI Agent 生成了一条超长的 SQL（单行超过容器宽度）, **When** 消息渲染完成, **Then** 代码块保持在容器内，超长行可通过水平滚动查看
3. **Given** 代码块内有多行 SQL, **When** 消息渲染完成, **Then** 每行独立显示，行宽受容器约束，整体不溢出

---

### User Story 3 - Visual Feedback for Copy Action (Priority: P2)

用户点击复制按钮后，需要明确的视觉反馈确认操作成功。

**Why this priority**: 良好的反馈机制提升用户信心，避免重复点击。这是复制功能的完整性补充。

**Independent Test**: 点击复制按钮后观察按钮状态变化和文字提示。

**Acceptance Scenarios**:

1. **Given** 用户点击复制按钮, **When** 复制成功, **Then** 按钮图标变为勾选图标，文字显示"已复制"，持续2秒后恢复原状
2. **Given** 用户点击复制按钮, **When** 复制失败（如浏览器不支持）, **Then** 显示错误提示，用户知道需要手动复制

---

### Edge Cases

- 代码块内容为空时，复制按钮是否仍显示？（应显示，复制结果为空字符串）
- 非 SQL 代码块（如 JSON、JavaScript）是否也有复制功能？（是，所有代码块都应支持复制）
- 用户快速连续点击复制按钮时如何处理？（应防抖，避免重复触发反馈动画）
- 在移动端或触屏设备上如何触发复制？（点击/触摸代码块区域应显示复制按钮）

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 系统必须在所有 Markdown 代码块的右上角提供复制按钮
- **FR-002**: 复制按钮默认隐藏，用户悬停在代码块上时显示
- **FR-003**: 点击复制按钮后，系统必须将代码块的纯文本内容复制到系统剪贴板
- **FR-004**: 复制成功后，按钮必须显示成功状态（图标变化 + "已复制"文字），持续2秒后恢复
- **FR-005**: 复制失败时，系统必须向用户显示错误提示
- **FR-006**: SQL 代码块宽度必须受容器宽度约束，不超过消息气泡的可见区域
- **FR-007**: 超出容器宽度的代码行必须通过水平滚动条查看，不产生溢出
- **FR-008**: 代码块必须保持等宽字体显示，保留缩进和空格
- **FR-009**: 复制功能必须适用于所有类型的代码块（SQL、JSON、JavaScript 等）
- **FR-010**: 复制按钮的样式必须与现有暗色主题保持一致

### Key Entities

- **CodeBlock**: 表示一个代码块区域，包含语言标识、代码内容、复制状态
- **CopyState**: 表示复制操作的状态（idle、copying、copied、error）

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% 的 Markdown 代码块都显示复制按钮（悬停时）
- **SC-002**: 复制操作响应迅速，用户感知无延迟
- **SC-003**: 所有代码块宽度不超过其父容器的 100%
- **SC-004**: 用户无需水平滚动即可看到代码块的完整起始部分
- **SC-005**: 复制功能在主流浏览器（Chrome、Firefox、Safari、Edge）中正常工作
- **SC-006**: 用户点击复制后能清晰看到成功反馈

## Assumptions

- 浏览器支持现代 Clipboard API
- 如果 Clipboard API 不可用，可降级到传统复制方式
- 消息气泡有既定的最大宽度限制
- 保持现有的暗色主题样式

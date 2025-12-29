# Feature Specification: 可调节的查询面板分隔器

**Feature Branch**: `008-resizable-query-panel`  
**Created**: 2025-12-29  
**Status**: Draft  
**Input**: User description: "查询结果和SQL编辑器中间做一个可调节这两个部分比例的滑块，并且把上次调整的位置记录到localstorage里面去"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 调整编辑器与结果区域比例 (Priority: P1)

作为一名数据库开发者，我希望能够通过拖动分隔条来调整 SQL 编辑器和查询结果区域的高度比例，以便根据当前任务需求灵活分配屏幕空间。

**Why this priority**: 这是核心功能，直接解决用户在编写复杂 SQL 时需要更多编辑空间，或在分析结果时需要更多结果展示空间的痛点。

**Independent Test**: 可以通过在查询页面拖动分隔条来验证，用户应能实时看到两个区域大小的变化。

**Acceptance Scenarios**:

1. **Given** 用户处于查询页面，**When** 用户将鼠标悬停在编辑器和结果区域之间的分隔条上，**Then** 光标变为上下调整形状（ns-resize），视觉上提示可拖动
2. **Given** 用户正在拖动分隔条，**When** 用户上下移动鼠标，**Then** 编辑器和结果区域实时调整高度，保持总高度不变
3. **Given** 用户完成拖动，**When** 用户释放鼠标，**Then** 两个区域保持在新的比例位置

---

### User Story 2 - 记住用户的布局偏好 (Priority: P2)

作为一名数据库开发者，我希望系统能记住我上次调整的面板比例，以便下次访问时无需重新调整。

**Why this priority**: 提升用户体验的重要功能，避免每次打开页面都需要重新调整布局。

**Independent Test**: 可以通过调整比例、刷新页面后验证比例是否保持不变来测试。

**Acceptance Scenarios**:

1. **Given** 用户已调整面板比例，**When** 用户刷新页面或关闭后重新打开，**Then** 面板比例恢复到上次调整的位置
2. **Given** 用户从未调整过面板比例，**When** 用户首次访问页面，**Then** 显示默认的比例分配（编辑器占上部 40%，结果区域占下部 60%）

---

### Edge Cases

- 当用户将分隔条拖到极端位置时，应限制最小高度（编辑器最小 100px，结果区域最小 100px），防止任一区域完全消失
- 当窗口大小改变时，应保持比例而非固定像素值
- 当 localStorage 不可用或数据损坏时，应优雅降级到默认比例
- 双击分隔条时，可快速恢复到默认比例（可选增强功能）

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 系统 MUST 在 SQL 编辑器区域和查询结果区域之间显示一个可拖动的分隔条
- **FR-002**: 用户 MUST 能够通过拖动分隔条来调整两个区域的高度比例
- **FR-003**: 系统 MUST 在拖动过程中实时更新两个区域的大小
- **FR-004**: 系统 MUST 将用户调整后的比例位置保存到 localStorage
- **FR-005**: 系统 MUST 在页面加载时从 localStorage 读取并应用保存的比例
- **FR-006**: 系统 MUST 限制拖动范围，确保编辑器和结果区域各自保持最小可用高度
- **FR-007**: 分隔条 MUST 在鼠标悬停时提供视觉反馈，指示可拖动状态

### Key Entities

- **Panel Ratio**: 表示编辑器与结果区域的高度比例，存储为 0-1 之间的小数（编辑器占比）
- **Divider**: 可拖动的分隔条 UI 元素，位于编辑器和结果区域之间

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 用户可以在 0.5 秒内完成拖动调整操作（从开始拖动到释放）
- **SC-002**: 页面刷新后，面板比例恢复准确度达到 100%（与保存时完全一致）
- **SC-003**: 拖动过程中界面保持流畅，无明显卡顿或跳动（60fps 的流畅体验）
- **SC-004**: 分隔条悬停状态变化在 100ms 内响应，提供即时视觉反馈

## Assumptions

- 用户的浏览器支持 localStorage API（现代浏览器均支持）
- 分隔条宽度设置为 8px，足够用户精确点击
- 默认比例为 40:60（编辑器:结果），这是参考主流 IDE 的常见配置
- 最小高度限制为 100px，确保内容仍可见可用
- localStorage key 使用 `tableChat.queryPanel.splitRatio` 作为存储键名，与项目现有缓存命名风格一致

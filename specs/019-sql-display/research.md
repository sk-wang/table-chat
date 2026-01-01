# Research: SQL Code Display Optimization

**Feature**: 019-sql-display
**Date**: 2026-01-01

## Research Questions

### 1. 当前代码块实现分析

**问题**: 当前 MarkdownRenderer 和相关样式是如何实现代码块渲染的？

**发现**:
- `MarkdownRenderer.tsx` 使用 `marked` 库解析 Markdown，`highlight.js` 进行语法高亮
- 代码块渲染通过自定义 `renderer.code` 函数实现
- SQL 代码块有特殊的绿色左边框样式（`.sql-code-block`）
- 当前没有复制按钮功能

**关键代码位置**:
- `frontend/src/components/agent/MarkdownRenderer.tsx:72-83` - 代码块渲染逻辑
- `frontend/src/components/agent/styles.css:624-700` - 代码块样式

### 2. 宽度溢出问题分析

**问题**: 为什么代码块会超出 AI Agent 面板的可见范围？

**发现**:
- `AgentMessage.tsx` 中消息气泡没有设置 `overflow` 属性
- CSS 中 `.markdown-code-block` 设置了 `overflow: hidden`，但外层容器没有约束
- `max-width: calc(100% - 1px)` 约束不够强

**解决方案**:
1. 在消息气泡添加 `overflow: hidden` 和 `minWidth: 0`（确保 flex 子元素可收缩）
2. 确保 `.markdown-code-block pre` 有 `overflow-x: auto` 支持水平滚动

### 3. Clipboard API 兼容性

**问题**: 如何实现跨浏览器的复制功能？

**研究结果**:

| 方法 | 支持情况 | 优缺点 |
|------|---------|--------|
| `navigator.clipboard.writeText()` | Chrome 66+, Firefox 63+, Safari 13.1+, Edge 79+ | 现代 API，需要 HTTPS 或 localhost |
| `document.execCommand('copy')` | 所有浏览器 | 已废弃但仍可用，需要创建隐藏元素 |

**决策**: 优先使用 Clipboard API，失败时降级到 `execCommand`

### 4. 复制按钮交互设计

**问题**: 复制按钮的交互和视觉设计如何与现有主题一致？

**研究结果**:
- 现有 `ToolCallBlock.tsx` 已有复制功能实现，可参考
- JetBrains Darcula 主题色彩：
  - 背景：`#3c3f41`
  - 边框：`#515151`
  - 成功色：`#629755`
  - 文字：`#a9b7c6`

**决策**:
- 复制按钮默认隐藏，悬停时显示（opacity 过渡）
- 成功后显示绿色 + "已复制"，2秒后恢复
- 使用 SVG 图标（复制图标）

## Alternatives Considered

### 复制功能实现方式

| 方案 | 优点 | 缺点 | 选择 |
|------|------|------|------|
| A: 在 marked renderer 中注入按钮 HTML | 简单，无需额外组件 | 需要 useEffect 绑定事件 | ✅ 选择 |
| B: 创建独立 CodeBlock 组件 | 更好的封装 | 需要重构 MarkdownRenderer | ❌ 过度工程 |
| C: 使用 React Portal | 灵活的定位 | 复杂度高 | ❌ 不必要 |

### 宽度约束方式

| 方案 | 优点 | 缺点 | 选择 |
|------|------|------|------|
| A: 在消息气泡添加 overflow | 简单有效 | 无 | ✅ 选择 |
| B: 使用 CSS contain | 性能优化 | 兼容性问题 | ❌ |
| C: JavaScript 动态计算宽度 | 精确控制 | 复杂，性能开销 | ❌ |

## Implementation Strategy

基于研究结果，确定以下实现策略：

1. **宽度约束**
   - 修改 `AgentMessage.tsx`：添加 `overflow: hidden` 和 `minWidth: 0`
   - 修改 `styles.css`：确保 `pre` 元素有水平滚动条

2. **复制功能**
   - 修改 `MarkdownRenderer.tsx`：
     - 在 `renderer.code` 中注入复制按钮 HTML
     - 使用 `data-code` 属性存储原始代码
     - 添加 `useEffect` 绑定点击事件
   - 添加 CSS 样式：`.code-copy-btn` 及相关状态

3. **测试覆盖**
   - 创建 Playwright E2E 测试
   - 覆盖：复制功能、宽度约束、视觉反馈

## Unknowns Resolved

| 原始问题 | 解决方案 |
|---------|---------|
| 代码块为何溢出 | 消息气泡缺少 overflow 约束 |
| 如何添加复制按钮 | 在 marked renderer 中注入 HTML，useEffect 绑定事件 |
| Clipboard API 兼容性 | 优先使用现代 API，降级到 execCommand |
| 样式如何与主题一致 | 参考 ToolCallBlock 和 Darcula 主题色 |

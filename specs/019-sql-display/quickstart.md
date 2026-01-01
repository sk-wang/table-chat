# Quickstart: SQL Code Display Optimization

**Feature**: 019-sql-display
**Date**: 2026-01-01

## Prerequisites

- Node.js 22+
- pnpm 或 npm
- 前端项目已安装依赖

## Quick Setup

```bash
# 进入前端目录
cd frontend

# 安装依赖（如果尚未安装）
npm install

# 启动开发服务器
npm run dev
```

## Files to Modify

### 1. AgentMessage.tsx

**路径**: `frontend/src/components/agent/AgentMessage.tsx`

**修改内容**: 在消息气泡 div 添加 overflow 约束

```typescript
// 找到消息气泡的 style 对象，添加以下属性：
{
  // ...existing styles
  overflow: 'hidden',
  minWidth: 0, // 确保 flex 子元素可以收缩
}
```

### 2. MarkdownRenderer.tsx

**路径**: `frontend/src/components/agent/MarkdownRenderer.tsx`

**修改内容**:

1. 导入 `useEffect` 和 `useRef`
2. 在 `renderer.code` 中添加复制按钮 HTML
3. 添加 `useEffect` 处理复制点击事件

**关键代码片段**:

```typescript
// 复制按钮 HTML
const copyBtn = `<button class="code-copy-btn" data-code="${escapeHtml(text)}">
  <svg><!-- copy icon --></svg>
  <span class="copy-text">复制</span>
</button>`;

// 在 return 中包含 copyBtn
return `<div class="markdown-code-block ${extraClass}">${langLabel}${copyBtn}<pre>...</pre></div>`;
```

### 3. styles.css

**路径**: `frontend/src/components/agent/styles.css`

**添加内容**:

```css
/* 代码块宽度约束 */
.markdown-code-block {
  max-width: 100%;
  width: 100%;
}

/* 水平滚动条 */
.markdown-code-block pre {
  overflow-x: auto;
  scrollbar-width: thin;
}

/* 复制按钮样式 */
.code-copy-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.markdown-code-block:hover .code-copy-btn {
  opacity: 1;
}

.code-copy-btn.copied {
  color: #629755;
  border-color: #629755;
}
```

## Testing

### 手动测试

1. 启动开发服务器
2. 打开 AI Agent 面板
3. 发送请求生成 SQL
4. 验证：
   - 代码块不超出面板边界
   - 悬停时显示复制按钮
   - 点击复制后显示"已复制"
   - 在其他应用粘贴验��内容

### E2E 测试

```bash
# 运行 Playwright 测试
npx playwright test sql-display
```

## Build & Verify

```bash
# 类型检查
npm run build

# 应该无错误
```

## Troubleshooting

| 问题 | 可能原因 | 解决方案 |
|------|---------|---------|
| 复制按钮不显示 | CSS 未加载 | 确认 styles.css 被导入 |
| 复制功能不工作 | Clipboard API 不可用 | 检查是否在 HTTPS/localhost |
| 代码块仍然溢出 | overflow 未生效 | 检查 flex 父元素的 minWidth |

# Data Model: SQL Code Display Optimization

**Feature**: 019-sql-display
**Date**: 2026-01-01

## Overview

此功能是纯前端 UI 优化，不涉及后端数据存储或 API 交互。数据模型主要描述前端组件的状态和类型定义。

## Component State Models

### CopyState (复制状态)

```typescript
type CopyState = 'idle' | 'copying' | 'copied' | 'error';
```

| 状态 | 说明 | 触发条件 |
|------|------|---------|
| `idle` | 初始状态 | 默认 / 2秒后恢复 |
| `copying` | 复制中 | 点击复制按钮 |
| `copied` | 复制成功 | Clipboard API 成功 |
| `error` | 复制失败 | Clipboard API 失败且降级失败 |

### CodeBlockInfo (代码块信息)

```typescript
interface CodeBlockInfo {
  /** 代码块的唯一标识 (DOM data 属性) */
  code: string;
  /** 代码语言标识 */
  language: string;
  /** 是否为 SQL 代码块 */
  isSql: boolean;
}
```

## DOM Structure

### Code Block HTML 结构

```html
<div class="markdown-code-block sql-code-block">
  <span class="code-lang-label">SQL</span>
  <button class="code-copy-btn" data-code="SELECT * FROM users">
    <svg><!-- copy icon --></svg>
    <span class="copy-text">复制</span>
  </button>
  <pre>
    <code class="hljs">
      <!-- highlighted code -->
    </code>
  </pre>
</div>
```

### CSS Class 状态

| Class | 应用条件 | 效果 |
|-------|---------|------|
| `.code-copy-btn` | 默认 | 隐藏 (opacity: 0) |
| `.markdown-code-block:hover .code-copy-btn` | 悬停时 | 显示 (opacity: 1) |
| `.code-copy-btn.copied` | 复制成功 | 绿色边框和文字 |

## Event Flow

```
用户悬停代码块
    ↓
复制按钮显示 (CSS transition)
    ↓
用户点击复制按钮
    ↓
从 data-code 获取代码内容
    ↓
尝试 navigator.clipboard.writeText()
    ↓
┌─成功─→ 添加 .copied class, 显示 "已复制"
│        ↓
│        2秒后移除 .copied, 恢复 "复制"
│
└─失败─→ 降级到 execCommand('copy')
         ↓
    ┌─成功─→ 同上
    │
    └─失败─→ 显示 "失败"
             ↓
             2秒后恢复 "复制"
```

## Validation Rules

| 规则 | 描述 |
|------|------|
| 代码内容 | 允许为空字符串 |
| 语言标识 | 可选，无语言标识时不显示语言标签 |
| 复制按钮 | 所有代码块都必须有复制按钮 |

## Entity Relationships

```
AgentMessage (1) ──contains── (0..*) CodeBlock
     │
     └── MarkdownRenderer ──renders── CodeBlock HTML
                                          │
                                          └── CopyButton (state: CopyState)
```

## Notes

- 此功能不涉及数据持久化
- 不涉及后端 API 调用
- 所有状态都是瞬时的 UI 状态

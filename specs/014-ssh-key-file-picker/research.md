# Research: SSH 私钥文件选择器

**Feature**: 014-ssh-key-file-picker  
**Date**: 2025-12-31

## 研究概述

本功能是纯前端实现，使用浏览器原生 File API，技术成熟且标准化，无需深入研究。

## 技术决策

### 1. 文件选择方式

**Decision**: 使用隐藏的 `<input type="file">` 元素 + 按钮触发

**Rationale**:
- 浏览器标准方式，兼容性最好
- 可以自定义按钮样式，与 Ant Design 保持一致
- 安全性由浏览器保证，只能选择用户明确选择的文件

**Alternatives Considered**:
1. ~~拖拽上传~~ - 用户场景较少，增加复杂度，列为未来增强
2. ~~剪贴板读取~~ - 部分浏览器不支持，权限要求高

### 2. 文件读取方式

**Decision**: 使用 `FileReader.readAsText(file)`

**Rationale**:
- 私钥是文本格式，使用 `readAsText` 最直接
- 异步读取，不阻塞 UI
- 所有现代浏览器支持

**Alternatives Considered**:
1. ~~ArrayBuffer + TextDecoder~~ - 更复杂，对于文本文件无必要
2. ~~fetch + blob URL~~ - 绕远路，不必要

### 3. 文件大小限制

**Decision**: 100KB 上限

**Rationale**:
- 典型私钥文件大小：
  - RSA 2048: ~1.6KB
  - RSA 4096: ~3.2KB  
  - Ed25519: ~0.4KB
  - ECDSA: ~0.6KB
- 100KB 提供 30-60 倍余量，足够应对各种格式
- 防止用户误选大文件

**Alternatives Considered**:
1. ~~无限制~~ - 可能导致误选大文件后浏览器卡顿
2. ~~10KB~~ - 某些特殊格式可能超出，余量不足

### 4. 文件类型过滤

**Decision**: 不限制文件类型（accept="*"）

**Rationale**:
- 私钥文件扩展名多样：无扩展名、.pem、.key、id_rsa、id_ed25519 等
- 限制扩展名会导致用户无法选择合法的私钥文件
- 后端会验证私钥格式有效性

**Alternatives Considered**:
1. ~~限制 .pem, .key~~ - 无扩展名的私钥文件（如 `id_rsa`）无法选择

### 5. UI 布局

**Decision**: 按钮放在 TextArea 上方，与 label 同行

**Rationale**:
- 符合用户习惯：先看到操作按钮，再看到输入区域
- 按钮与 "Private Key" label 对齐，视觉清晰
- 保持表单紧凑

**Alternatives Considered**:
1. ~~按钮放在 TextArea 下方~~ - 容易被忽略
2. ~~按钮放在 TextArea 右侧~~ - 布局复杂，响应式困难

## 浏览器兼容性

| 浏览器 | File API | FileReader | 备注 |
|--------|----------|------------|------|
| Chrome | ✅ | ✅ | Chrome 6+ |
| Firefox | ✅ | ✅ | Firefox 3.6+ |
| Safari | ✅ | ✅ | Safari 5.1+ |
| Edge | ✅ | ✅ | 所有版本 |

**结论**: 所有目标浏览器均完全支持，无需 polyfill 或降级方案。

## 安全考虑

1. **文件只读**: 浏览器 File API 只能读取用户明确选择的文件
2. **无路径泄露**: `File` 对象不包含完整路径（浏览器安全限制）
3. **内存管理**: 读取后无需保留 File 对象，文本内容存入 form state
4. **私钥保护**: 与现有实现一致，私钥在内存中处理，提交时发送到后端

## 无需进一步研究

本功能技术栈成熟、方案明确，无 NEEDS CLARIFICATION 项。


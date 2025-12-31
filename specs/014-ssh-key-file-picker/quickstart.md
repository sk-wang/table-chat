# Quickstart: SSH 私钥文件选择器

**Feature**: 014-ssh-key-file-picker  
**Date**: 2025-12-31

## 功能概述

在 SSH 隧道配置的私钥输入区域添加"选择文件"按钮，让用户可以直接选择本地私钥文件。

## 快速实现指南

### 1. 修改目标文件

```
frontend/src/components/database/AddDatabaseModal.tsx
```

### 2. 核心实现步骤

#### Step 1: 添加文件输入 ref

```tsx
// 在组件顶部添加
const fileInputRef = useRef<HTMLInputElement>(null);
```

#### Step 2: 添加文件读取处理函数

```tsx
const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file) return;
  
  // 文件大小检查 (100KB)
  if (file.size > 100 * 1024) {
    message.error('文件过大，私钥文件通常小于 100KB');
    return;
  }
  
  const reader = new FileReader();
  reader.onload = (e) => {
    const content = e.target?.result as string;
    form.setFieldValue('sshPrivateKey', content);
  };
  reader.onerror = () => {
    message.error('无法读取文件，请确认文件权限或格式');
  };
  reader.readAsText(file);
  
  // 重置 input 以允许再次选择同一文件
  event.target.value = '';
};
```

#### Step 3: 修改私钥输入区域 UI

在现有的 `<Form.Item name="sshPrivateKey">` 之前添加文件选择按钮：

```tsx
{sshAuthType === 'key' && (
  <>
    {/* 隐藏的文件输入 */}
    <input
      ref={fileInputRef}
      type="file"
      style={{ display: 'none' }}
      onChange={handleFileSelect}
    />
    
    <Form.Item
      name="sshPrivateKey"
      label={
        <Space>
          <span>Private Key</span>
          <Button
            size="small"
            icon={<UploadOutlined />}
            onClick={() => fileInputRef.current?.click()}
          >
            选择文件
          </Button>
        </Space>
      }
      // ... 其他属性保持不变
    >
      <Input.TextArea ... />
    </Form.Item>
  </>
)}
```

### 3. 需要的 imports

```tsx
import { useRef } from 'react';
import { UploadOutlined } from '@ant-design/icons';
```

## 测试要点

### 手动测试

1. 打开添加数据库对话框
2. 启用 SSH 隧道
3. 选择"密钥认证"
4. 点击"选择文件"按钮
5. 选择一个私钥文件（如 `~/.ssh/id_rsa`）
6. 验证文件内容已填入文本框

### E2E 测试场景

1. 文件选择后内容正确填入
2. 选择大文件显示错误提示
3. 手动粘贴仍然可用
4. 多次选择文件，新内容覆盖旧内容

## 完成标准

- [x] "选择文件"按钮正常显示 ✅
- [x] 点击按钮打开系统文件选择器 ✅
- [x] 选择文件后内容自动填入 ✅
- [x] 大文件 (>100KB) 显示错误提示 ✅
- [x] 手动粘贴功能保持可用 ✅
- [x] E2E 测试创建完成 ✅

## 实现状态

**完成时间**: 2025-12-31  
**实现文件**:
- `frontend/src/utils/fileReader.ts` - 文件读取工具函数
- `frontend/src/components/database/AddDatabaseModal.tsx` - UI 改动
- `frontend/e2e/ssh-key-file-picker.spec.ts` - E2E 测试

**样式调整**: 采用 JetBrains IDE 风格
- 紧凑表单布局
- 等宽字体 (JetBrains Mono)
- Browse... 按钮
- 移除折叠面板，直接展示 SSH 配置


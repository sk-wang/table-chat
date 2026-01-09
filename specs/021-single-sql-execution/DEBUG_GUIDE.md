# SQL执行问题调试指南

## 现状

- ✅ UI显示正常（高亮、装订线按钮可见）
- ❌ SQL无法执行（点击按钮或按F8没有反应）

---

## 调试步骤

### 第1步：打开浏览器开发者工具

1. 按 **F12** 打开开发者工具
2. 切换到 **Console** 标签
3. 确保没有过滤任何日志级别（显示 Info, Warnings, Errors）

### 第2步：清空Console并测试

1. 点击Console左上角的 🚫 清空按钮
2. 在SQL编辑器中输入测试SQL：
   ```sql
   SELECT * FROM users LIMIT 10;
   ```
3. 将光标放在这行SQL中
4. 按 **F8** 键（或点击装订线的 ▶️ 按钮）

### 第3步：查看Console输出

你应该看到以下日志序列（按顺序）：

```
[SqlEditor] Execute triggered
[SqlEditor] Current statement from ref: {text: "SELECT * FROM users LIMIT 10;", ...}
[SqlEditor] Selection: Selection {...}
[statementExtractor] getStatementToExecute called
[statementExtractor] model: {...}
[statementExtractor] selection: {...}
[statementExtractor] currentStatement: {text: "SELECT * FROM users LIMIT 10;", ...}
[statementExtractor] Using current statement at cursor
[statementExtractor] Statement text: SELECT * FROM users LIMIT 10;
[SqlEditor] Statement to execute: SELECT * FROM users LIMIT 10;
[SqlEditor] Calling execution callback with SQL: SELECT * FROM users LIMIT 10;
[QueryPage] handleExecute called with: SELECT * FROM users LIMIT 10;
[QueryPage] Actual SQL to execute: SELECT * FROM users LIMIT 10;
[QueryPage] Executing query on database: your-database-name
[QueryPage] Query executed successfully: {...}
```

---

## 根据Console输出诊断问题

### 场景A：完全没有日志输出

**问题**: F8快捷键或点击事件未触发

**可能原因**:
1. 编辑器未获得焦点
2. 浏览器拦截了F8键
3. JavaScript代码未正确加载

**解决方法**:
```javascript
// 在Console中手动测试：
document.activeElement // 应该显示 Monaco Editor 的 textarea

// 检查快捷键是否注册：
// 刷新页面，在页面加载完成后立即在Console输入：
// 应该能看到 Monaco Editor 实例
```

### 场景B：看到 `[SqlEditor] Execute triggered` 但之后没有其他日志

**问题**: Editor ref 为 null

**输出示例**:
```
[SqlEditor] Execute triggered
[SqlEditor] Editor ref is null
```

**解决方法**:
- 等待几秒让编辑器完全加载
- 刷新页面重试

### 场景C：看到 `[SqlEditor] Current statement from ref: null`

**问题**: 当前语句未解析或解析失败

**输出示例**:
```
[SqlEditor] Execute triggered
[SqlEditor] Current statement from ref: null
[SqlEditor] Selection: {...}
[statementExtractor] currentStatement: null
[statementExtractor] No statement found
[SqlEditor] No statement to execute (empty or null)
```

**解决方法**:
1. 检查光标是否在SQL语句内（不是空行）
2. 检查SQL是否有分号结尾
3. 检查是否有高亮显示（如果有高亮但currentStatement为null，说明状态同步有问题）

### 场景D：看到 `[SqlEditor] Statement to execute: ...` 但没有 `[QueryPage]` 日志

**问题**: onExecuteStatement 回调未正确传递

**输出示例**:
```
[SqlEditor] Statement to execute: SELECT * FROM users LIMIT 10;
[SqlEditor] Calling execution callback with SQL: SELECT * FROM users LIMIT 10;
(没有后续日志)
```

**解决方法**:
在Console中检查：
```javascript
// 检查SqlEditor组件的props
// 找到SqlEditor的React Fiber节点并查看props
```

### 场景E：看到 `[QueryPage] Cannot execute: no database or empty SQL`

**问题**: 没有选择数据库

**输出示例**:
```
[QueryPage] handleExecute called with: SELECT * FROM users LIMIT 10;
[QueryPage] Actual SQL to execute: SELECT * FROM users LIMIT 10;
[QueryPage] Cannot execute: no database or empty SQL
[QueryPage] selectedDatabase: null
```

**解决方法**:
1. 在页面顶部或侧边栏选择一个数据库
2. 确认数据库列表已加载

### 场景F：看到 `[QueryPage] Executing query...` 但没有 `executed successfully`

**问题**: API调用失败

**输出示例**:
```
[QueryPage] Executing query on database: my-database
(然后看到错误)
```

**解决方法**:
1. 切换到 **Network** 标签
2. 查找 `/api/v1/databases/{name}/query` 请求
3. 检查状态码和响应内容
4. 检查后端服务是否运行

---

## 快速测试清单

### ✅ 功能测试

在Console清空后依次测试：

1. **光标测试**:
   ```
   输入: SELECT 1;
   操作: 光标放在 SELECT 上，按F8
   期望: 看到完整日志链 + 查询结果
   ```

2. **多语句测试**:
   ```
   输入: SELECT 1;
         SELECT 2;
   操作: 光标在第1行，按F8
   期望: 只执行第1条SQL
   ```

3. **选择测试**:
   ```
   输入: SELECT 1;
   操作: 全选文本（Ctrl/Cmd+A），按F8
   期望: 日志显示 "Using manual selection"
   ```

4. **装订线按钮测试**:
   ```
   操作: 点击行号左侧的 ▶️ 图标
   期望: 与按F8相同的效果
   ```

---

## 常见问题和解决方案

### Q1: Console显示 "Cannot read property 'text' of null"

**原因**: currentStatement 为 null 但代码尝试访问 .text

**解决**:
- 已在代码中添加 null 检查
- 刷新页面，重新测试

### Q2: Console显示 "Selection is not defined"

**原因**: selection 对象格式不对

**解决**:
在Console输入查看selection对象结构：
```javascript
// 点击编辑器获得焦点后：
editor.getSelection()
```

### Q3: 点击装订线按钮没反应，但F8有反应

**原因**: 鼠标事件未正确绑定或点击位置不对

**解决**:
1. 确保点击的是行号左侧（有 ▶️ 图标的区域）
2. 不要点击行号本身

### Q4: F8有反应但装订线按钮没有

**原因**: 装订线点击事件未绑定

**解决**:
在Console检查：
```javascript
// 查看是否有 sql-execution-glyph 类
document.querySelector('.sql-execution-glyph')
```

---

## 报告问题时请提供

如果以上步骤都无法解决，请提供以下信息：

1. **完整的Console输出** (从 `[SqlEditor] Execute triggered` 开始)
2. **测试的SQL语句**
3. **是否选择了数据库** (数据库名称)
4. **使用的浏览器和版本** (Chrome 123, Firefox 120, 等)
5. **任何红色的错误信息**

### 导出Console日志的方法:

1. 右键点击Console中的日志
2. 选择 "Save as..."
3. 保存为文本文件并分享

---

## 高级调试

### 检查React组件Props

在Console中：
```javascript
// 找到SqlEditor元素
const editorElement = document.querySelector('.monaco-editor-container').parentElement;

// 查看React Fiber（需要React DevTools）
// 或者直接在React DevTools的Components标签中查看SqlEditor组件的props
```

### 手动触发执行

在Console中：
```javascript
// 模拟执行（替换为你的SQL）
// 这会绕过所有中间层直接调用QueryPage的handleExecute
// 注意：这需要你先在页面中找到React实例
```

---

## 成功的标志

当一切正常工作时，你应该看到：

1. ✅ Console有完整的日志链（从 SqlEditor → statementExtractor → QueryPage）
2. ✅ Network标签显示成功的API请求（状态码 200）
3. ✅ 页面下方的"Query Results"标签显示查询结果
4. ✅ 没有任何红色的错误信息

---

## 下一步

1. **按照第1-3步操作**，获取Console输出
2. **根据输出判断**是哪个场景（A-F）
3. **应用对应的解决方法**
4. **如果还是不行**，收集完整信息并报告

祝调试顺利！🔍

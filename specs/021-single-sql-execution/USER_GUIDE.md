# 单条SQL执行功能 - 用户指南

**功能状态**: ✅ 已完全实现并集成

---

## 功能概览

类似阿里云DMS的单条SQL执行交互，支持在多语句编辑器中只执行光标所在的单条SQL语句。

---

## 核心特性

### 1. **实时语句高亮** 🎨

当你在编辑器中移动光标时，当前光标所在的SQL语句会自动高亮显示（蓝色边框），让你清楚知道哪条SQL将被执行。

**效果**:
- 左侧蓝色竖线标记当前语句范围
- 语句背景半透明高亮
- 实时更新（50ms debounce，60fps 流畅动画）

### 2. **装订线执行按钮** ▶️

在行号左侧的装订线区域，会显示一个蓝色的"播放"图标 ▶️，点击即可执行当前语句。

**使用方法**:
1. 将光标移动到任意SQL语句
2. 在该语句起始行的左侧装订线出现 ▶️ 图标
3. 点击 ▶️ 图标执行当前语句

**提示**: 鼠标悬停在 ▶️ 图标上会显示 "Click to execute (F8)"

### 3. **键盘快捷键** ⌨️

- **F8**: 执行当前语句（新增）
- **Ctrl+Enter / Cmd+Enter**: 执行当前语句
- **Shift+Alt+F**: 格式化SQL（原有功能）

### 4. **选择优先策略** 🎯

支持三种执行方式，按优先级从高到低：

1. **手动选中文本** - 最高优先级
   - 用鼠标或键盘选中任意文本
   - 按 F8 或 Ctrl/Cmd+Enter
   - 只执行选中的文本（可以是部分语句或多条语句）

2. **光标所在语句** - 默认方式
   - 不选中任何文本
   - 将光标放在任意SQL语句内
   - 按 F8 或 Ctrl/Cmd+Enter
   - 只执行光标所在的完整语句

3. **手动点击工具栏**
   - 点击工具栏的"执行"按钮（如果工具栏支持单条执行）

---

## 使用场景示例

### 场景1：调试多条SQL

```sql
SELECT * FROM users WHERE id = 1;

SELECT * FROM orders WHERE user_id = 1;

SELECT * FROM products WHERE category = 'electronics';
```

**操作**:
1. 将光标放在第2条SQL（orders查询）的任意位置
2. 当前语句会高亮显示
3. 按 **F8** 键
4. ✅ 只执行第2条SQL，其他SQL不受影响

### 场景2：执行部分SQL

```sql
SELECT
    user_id,
    username,
    email,
    created_at
FROM users
WHERE status = 'active'
ORDER BY created_at DESC;
```

**操作**:
1. 用鼠标选中 `WHERE status = 'active'` 这一行
2. 按 **F8** 键
3. ✅ 只执行选中的文本（通常会报错，仅作演示）

**实际用途**: 可以选中完整的子查询或WITH子句单独测试

### 场景3：多行语句

```sql
SELECT
    u.id,
    u.username,
    COUNT(o.id) as order_count
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.username
HAVING COUNT(o.id) > 5;
```

**操作**:
1. 将光标放在任意一行（如第3行的 `COUNT(o.id)`）
2. 整个7行语句都会高亮显示
3. 按 **F8** 键
4. ✅ 执行完整的多行SQL语句

---

## 性能优化

- **SQL解析**: < 50ms（支持10,000行代码）
- **高亮更新**: < 16ms（60fps流畅动画）
- **光标跟踪**: 50ms debounce（减少不必要的重渲染）

---

## 边界情况处理

### 1. 光标在空行

如果光标在两条SQL之间的空行：
- 自动查找最近的SQL语句
- 优先向前查找（上一条）
- 如果前面没有，向后查找（下一条）

### 2. 空编辑器

如果编辑器为空或只有空格：
- 执行按钮禁用
- 按 F8 无反应

### 3. 字符串中的分号

```sql
SELECT * FROM users WHERE comment = 'Hello; World';
SELECT * FROM orders;
```

✅ 解析器正确识别字符串边界，不会将字符串内的 `;` 误认为语句分隔符

### 4. 注释中的分号

```sql
-- SELECT * FROM old_table; (已废弃)
SELECT * FROM new_table;
```

✅ 解析器忽略注释中的 SQL 语句

---

## 技术实现

### 前端架构

```
SqlEditor.tsx (UI组件)
    ├─ useSqlStatementParser (SQL解析hook)
    │   └─ sqlParser.ts (tokenizer)
    ├─ useEditorHighlight (高亮管理hook)
    │   └─ Monaco deltaDecorations API
    └─ statementExtractor.ts (语句提取工具)
        └─ 选择优先策略逻辑
```

### 关键代码位置

- **SqlEditor组件**: `frontend/src/components/editor/SqlEditor.tsx`
- **SQL解析器**: `frontend/src/utils/sqlParser.ts`
- **语句提取**: `frontend/src/utils/statementExtractor.ts`
- **高亮Hook**: `frontend/src/components/SqlEditor/useEditorHighlight.ts`
- **解析Hook**: `frontend/src/components/SqlEditor/useSqlStatementParser.ts`

---

## FAQ

### Q1: 为什么有时候高亮不准确？

**A**: 可能的原因：
1. SQL语法错误（解析器无法识别语句边界）
2. 使用了不常见的SQL方言特性
3. 字符串/注释未正确闭合

**解决方法**: 确保SQL语法正确，字符串和注释闭合

### Q2: 如何执行所有SQL？

**A**: 目前单条执行功能不支持一次执行全部。如需执行全部：
1. 使用鼠标全选编辑器内容（Ctrl/Cmd+A）
2. 按 F8 执行选中内容

或者将所有SQL合并为一条（如果数据库支持）

### Q3: 支持哪些数据库？

**A**:
- ✅ PostgreSQL（完全支持）
- ✅ MySQL（完全支持）
- ✅ SQLite（完全支持）
- ⚠️ 其他数据库：基本支持，但可能需要调整解析规则

### Q4: 为什么按F8没反应？

**A**: 检查以下几点：
1. 编辑器是否获得焦点（点击编辑器区域）
2. 光标是否在有效的SQL语句内
3. 浏览器是否拦截了F8键（某些浏览器有默认行为）

**备选方案**: 使用 Ctrl/Cmd+Enter 或点击装订线的 ▶️ 按钮

### Q5: 装订线按钮在哪里？

**A**: 装订线按钮（▶️）在行号的左侧，只在当前语句的第一行显示。

**如果看不到**:
1. 确保光标在SQL语句内（不是空行）
2. 等待200ms（按钮更新有轻微延迟）
3. 检查浏览器缩放比例（建议100%）

---

## 与DMS的差异

### 已实现 ✅

- ✅ 实时语句高亮
- ✅ 装订线执行按钮
- ✅ F8快捷键
- ✅ 多语句编辑器
- ✅ 选择优先执行
- ✅ 多行语句支持

### 未实现 ⏳

- ⏳ 工具栏"执行(F8)"按钮（可扩展）
- ⏳ 执行历史面板（已有 QueryHistory，可集成）
- ⏳ 语句执行计划查看
- ⏳ 我的SQL收藏夹
- ⏳ SQL诊断功能

---

## 开发者文档

如需扩展或自定义此功能，请参考：

- **集成指南**: `specs/021-single-sql-execution/INTEGRATION_GUIDE.ts`
- **实现总结**: `specs/021-single-sql-execution/IMPLEMENTATION_SUMMARY.md`
- **性能验证**: `specs/021-single-sql-execution/PERFORMANCE_VALIDATION.md`
- **最终验证清单**: `specs/021-single-sql-execution/checklists/FINAL_VALIDATION_CHECKLIST.md`

---

## 反馈与改进

如发现问题或有改进建议，请提交Issue到项目仓库。

**已知问题**:
- 无

**计划改进**:
- 添加工具栏"执行(F8)"按钮
- 支持执行计划查看
- 添加SQL语句收藏功能

---

**版本**: 1.0.0
**更新日期**: 2026-01-09
**功能状态**: ✅ Production Ready

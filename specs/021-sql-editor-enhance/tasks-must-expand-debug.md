# Tasks: 完全修复"必须展开表结构才能自动补全"问题

**用户报告**："还是不展开表结构，就联想不出来"
**严重性**：CRITICAL - 核心功能无法使用
**日期**：2026-01-05

---

## 问题描述

**现象**：
- 手动在左侧边栏展开表结构 → 自动补全正常工作 ✅
- 不展开表结构 → 自动补全显示 0 个建议 ❌

**已实施的修复未生效**：
1. ✅ Context detection 修复（移除 prefix 后查找关键词）
2. ✅ 添加自动预加载机制
3. ✅ 添加加载完成后重新触发 autocomplete
4. ❌ **但问题依然存在**

**可能的根本原因**：
1. 浏览器缓存未刷新（用户未使用强制刷新）
2. `triggerSuggest()` 方法调用失败
3. 100ms 延迟不够（数据还未完全加载到状态）
4. ref 没有正确传递或连接
5. `loadTableDetails` 的调用时机不对
6. React 状态更新的批处理导致延迟
7. 预加载机制没有真正触发

---

## Format: `[ID] Description`

---

## Phase 1: 紧急验证 - 确认用户环境

**目标**：确认修复代码是否真正运行在用户的浏览器中

- [ ] T001 验证用户是否执行了强制刷新
  - 询问用户是否使用 Ctrl+Shift+R (Win) 或 Cmd+Shift+R (Mac)
  - 如果没有，指导用户执行强制刷新
  - 或者建议用户使用无痕/隐私模式重新打开

- [ ] T002 检查前端服务器是否重启
  - 如果用户运行的是 `npm run dev`，确认是否重启过
  - 如果运行的是构建版本，确认是否重新 build

- [ ] T003 验证修改的代码是否在浏览器中运行
  - 打开浏览器 DevTools → Sources 标签
  - 搜索 `triggerSuggest` 函数
  - 检查是否存在（如果不存在，说明代码未加载）

- [ ] T004 检查控制台是否有新的调试日志
  - 寻找 `[SqlContextDetector] Debug:` 日志
  - 寻找 `triggerSuggest` 相关日志
  - 如果没有这些日志，说明新代码未运行

---

## Phase 2: 深度调试 - 找出真正的失败点

**目标**：通过详细日志找出具体哪一步失败了

- [ ] T005 在 triggerSuggest 中添加详细日志
  - File: `frontend/src/components/editor/SqlEditor.tsx:115-121`
  - 添加 `console.log('[SqlEditor] triggerSuggest called')`
  - 验证该方法是否被调用

- [ ] T006 在 loadTableDetails 中添加详细日志
  - File: `frontend/src/pages/query/index.tsx:147-173`
  - 添加日志：何时触发加载、何时完成、何时调用 triggerSuggest
  - 格式：`console.log('[LoadDetails] Step X:', data)`

- [ ] T007 验证 ref 是否正确连接
  - File: `frontend/src/pages/query/index.tsx:36`
  - 添加日志：`console.log('[QueryPage] sqlEditorRef.current:', sqlEditorRef.current)`
  - 在调用 `triggerSuggest` 前检查 ref 是否为 null

- [ ] T008 检查 setTimeout 是否真正执行
  - 在 setTimeout 内部第一行添加日志
  - 确认延迟后的代码确实运行

- [ ] T009 测试手动调用 triggerSuggest
  - 在浏览器控制台手动执行测试
  - 打开 DevTools Console
  - 输入测试代码验证功能

---

## Phase 3: 根本原因分析

**基于 Phase 2 的调试结果，确定具体失败原因**

### 可能原因 1：ref 未正确初始化

- [ ] T010 验证 SqlEditor 的 forwardRef 实现
  - File: `frontend/src/components/editor/SqlEditor.tsx:48`
  - 确认 `forwardRef` 使用正确
  - 确认 `useImperativeHandle` 正确暴露方法

- [ ] T011 检查 ref 的类型定义
  - 确认 `SqlEditorRef` 接口包含 `triggerSuggest`
  - 确认 TypeScript 没有类型错误

### 可能原因 2：状态更新时机问题

- [ ] T012 分析 React 状态批处理
  - `setTableDetails` 后状态可能未立即更新
  - React 18 的自动批处理可能导致延迟
  - 100ms 可能不够等待状态传播

- [ ] T013 增加延迟时间
  - 将 100ms 改为 300ms 或 500ms
  - 测试是否解决问题

- [ ] T014 使用 useEffect 监听 tableDetails 变化
  - 当 tableDetails 真正更新后再触发 autocomplete
  - 更可靠的方式

### 可能原因 3：getTableColumns 返回时机问题

- [ ] T015 检查 getTableColumns 的实现
  - File: `frontend/src/pages/query/index.tsx:511-530`
  - 确认状态更新后 getTableColumns 能立即返回新数据
  - 可能需要使用 callback ref 或其他机制

- [ ] T016 验证 schemaData 的传递
  - schemaData 是否随 tableDetails 变化而更新
  - SqlEditor 是否能感知到 schemaData 的变化

### 可能原因 4：Monaco 编辑器状态问题

- [ ] T017 检查 Monaco 编辑器是否准备就绪
  - editor.trigger 可能在编辑器未就绪时失败
  - 添加编辑器就绪检查

- [ ] T018 验证 autocomplete provider 是否正确注册
  - 检查 provider 的 schemaDataProvider 是否更新
  - 可能需要强制刷新 provider

---

## Phase 4: 替代解决方案

**如果 triggerSuggest 方案无法工作，尝试其他方法**

### 方案 A：同步阻塞式加载

- [ ] T019 实现同步等待机制
  - File: `frontend/src/components/editor/SqlCompletionProvider.ts`
  - 在 provideCompletionItems 中检查数据是否存在
  - 如果不存在，返回特殊标记提示"正在加载..."
  - 然后触发加载并等待

- [ ] T020 添加加载中的 placeholder 建议
  - 显示 "Loading table columns..." 作为临时建议
  - 用户体验更好

### 方案 B：预加载所有表的列数据

- [ ] T021 在数据库连接时预加载所有表的列
  - File: `frontend/src/pages/query/index.tsx`
  - 加载表列表后，立即开始加载前 10 个表的列
  - 后台继续加载其他表

- [ ] T022 实现智能预加载策略
  - 优先加载最近使用的表
  - 优先加载小表（列数少的）
  - 使用 localStorage 记录使用频率

### 方案 C：debounce + 批量加载

- [ ] T023 实现 debounced 预加载
  - 用户输入停止 300ms 后才触发预加载
  - 避免频繁加载

- [ ] T024 批量加载多个表的列
  - 解析 SQL 中的所有表引用
  - 一次性加载所有相关表的列

---

## Phase 5: 强制立即修复方案（临时）

**如果以上都不行，使用这个简单但可能低效的方案**

- [ ] T025 修改 getTableColumns 为同步阻塞
  - File: `frontend/src/pages/query/index.tsx:511-530`
  - 检测到数据不存在时，**立即同步加载**（阻塞）
  - 使用 React Suspense 或 SWR 库

- [ ] T026 在左侧栏点击时自动预加载
  - 监听数据库连接变化
  - 自动展开第一个表并加载其列
  - 模拟用户手动展开的行为

- [ ] T027 添加"预加载全部表结构"按钮
  - 在侧边栏添加按钮
  - 点击后加载所有表的列数据
  - 用户明确触发，避免意外流量

---

## Phase 6: 根本架构改进

**长期解决方案：改变数据加载架构**

- [ ] T028 实现持久化缓存
  - 使用 IndexedDB 而不是 localStorage
  - 缓存所有表的列数据
  - 首次加载后永久可用

- [ ] T029 实现后台服务 worker
  - 使用 Web Worker 后台加载数据
  - 不阻塞 UI 线程
  - 更流畅的用户体验

- [ ] T030 实现增量加载
  - 首次只加载表名
  - 用户查看时才加载列
  - 但加载后立即缓存

---

## Phase 7: 最终测试

- [ ] T031 创建完整的测试场景
  - 清除所有缓存
  - 连接新数据库
  - 测试每个场景

- [ ] T032 测试场景 1：首次使用
  - 新用户、新数据库
  - 输入 SQL 不展开表
  - 验证是否能自动补全

- [ ] T033 测试场景 2：缓存存在
  - 之前使用过的数据库
  - 缓存中有数据
  - 验证是否立即补全

- [ ] T034 测试场景 3：大型数据库
  - 100+ 个表的数据库
  - 验证性能
  - 验证是否影响 autocomplete 速度

- [ ] T035 更新文档
  - 更新 quickstart.md
  - 添加故障排除步骤
  - 记录已知限制

---

## 紧急行动计划（优先级顺序）

### 立即执行（解决当前用户问题）

1. **T001-T004**：验证环境（5 分钟）
   - 99% 的可能性是用户没有刷新浏览器
   - 这是最快的解决方案

2. **T005-T009**：添加调试日志（10 分钟）
   - 如果刷新不解决，添加日志找出问题
   - 必须了解代码是否运行

3. **T026**：临时方案（5 分钟）
   - 在侧边栏自动展开第一个表
   - 立即模拟用户手动操作

### 短期修复（彻底解决）

4. **T012-T016**：修复状态更新时机（30 分钟）
   - 可能是最有可能的根本原因
   - React 状态更新的异步性

5. **T019-T020**：加载中提示（20 分钟）
   - 改善用户体验
   - 让用户知道系统在做什么

### 长期改进（架构优化）

6. **T021-T024**：智能预加载（1-2 小时）
   - 根本性能改进
   - 避免手动触发

7. **T028-T030**：架构重构（2-3 小时）
   - IndexedDB 缓存
   - 后台加载
   - 最佳用户体验

---

## 调试检查清单

**在继续任何修复前，请确认：**

- [ ] 用户已执行 **Ctrl+Shift+R** 强制刷新
- [ ] 用户正在查看正确的页面（SQL Editor 标签）
- [ ] 浏览器控制台没有 JavaScript 错误
- [ ] 控制台有新的调试日志（`[SqlContextDetector] Debug:`）
- [ ] 前端服务已重新启动（如果使用 dev 模式）
- [ ] 构建已重新执行（如果使用 build 模式）

**如果以上任一项为否，先解决这些问题！**

---

## 预期结果

**修复成功后的表现：**

1. **不展开表结构** → 直接输入 SQL
2. 输入：`SELECT * FROM table_name WHERE col`
3. **立即或 100-500ms 后** → autocomplete 自动弹出
4. 显示：该表的列名建议
5. **不需要任何手动操作**

**控制台日志应该显示：**
```
[Cache] Table details miss for schema.table
[LoadDetails] Starting load...
[LoadDetails] Load complete
[LoadDetails] Calling triggerSuggest
[SqlEditor] triggerSuggest called
[SqlCompletionProvider] COLUMN_NAME suggestions: N (N > 0)
```

---

## Summary

**Total Tasks**: 35
- 环境验证: 4
- 深度调试: 5
- 根本原因分析: 9
- 替代方案: 6
- 临时修复: 3
- 架构改进: 3
- 最终测试: 5

**优先级**：
- **P0 (立即)**：T001-T004 (环境验证)
- **P1 (紧急)**：T005-T009, T026 (调试 + 临时方案)
- **P2 (重要)**：T012-T020 (根本修复)
- **P3 (改进)**：T021-T030 (长期优化)

**预计修复时间**：
- 最快：5 分钟（如果只是刷新问题）
- 一般：1-2 小时（如果需要调试和修复）
- 完整：3-4 小时（包括架构改进）

---

## 立即行动步骤（给用户）

**请立即执行以下步骤：**

1. **按 Ctrl+Shift+R（Windows）或 Cmd+Shift+R（Mac）** 强制刷新页面
2. **按 F12** 打开浏览器开发者工具
3. **切换到 Console 标签**
4. **在 SQL 编辑器输入**: `SELECT * FROM sci_buffet_quotation WHERE b`
5. **截图发送**：
   - 控制台的所有日志
   - Autocomplete 下拉框（如果有）
   - Network 标签的请求列表

**这些信息将帮助我快速定位问题！**

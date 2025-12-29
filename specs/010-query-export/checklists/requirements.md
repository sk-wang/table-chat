# Requirements Checklist: 查询结果导出

**Feature**: 010-query-export  
**Date**: 2025-12-29

## Functional Requirements

| ID | Requirement | Status | Notes |
|----|-------------|--------|-------|
| FR-001 | 系统 MUST 在查询结果表格上方提供「导出」下拉按钮 | ⏳ | |
| FR-002 | 系统 MUST 在没有查询结果时禁用导出按钮 | ⏳ | |
| FR-003 | 系统 MUST 将查询结果正确转换为 CSV 格式 | ⏳ | UTF-8 + BOM |
| FR-004 | 系统 MUST 将查询结果正确转换为 JSON 格式 | ⏳ | 数组格式 |
| FR-005 | 系统 MUST 将查询结果正确转换为 XLSX 格式 | ⏳ | Excel 兼容 |
| FR-006 | 系统 MUST 使用规范的文件命名格式 | ⏳ | {db}_{timestamp}.{ext} |
| FR-007 | 系统 SHOULD 在自然语言查询中识别导出意图 | ⏳ | P2 优先级 |
| FR-008 | 系统 MUST 正确处理 NULL 值和特殊字符 | ⏳ | |
| FR-009 | 系统 MUST 在前端完成所有格式转换 | ⏳ | 无后端依赖 |

## Non-Functional Requirements

| ID | Requirement | Status | Notes |
|----|-------------|--------|-------|
| NFR-001 | 导出 1000 行数据应在 2 秒内完成 | ⏳ | |
| NFR-002 | 导出过程不应阻塞 UI 主线程超过 100ms | ⏳ | |

## User Stories Acceptance Criteria

### User Story 1: 工具栏导出查询结果

| Scenario | Status | Notes |
|----------|--------|-------|
| 点击导出按钮显示 CSV/JSON/XLSX 三个选项 | ⏳ | |
| 点击导出 CSV 触发下载 | ⏳ | |
| 点击导出 JSON 触发下载 | ⏳ | |
| 点击导出 XLSX 触发下载 | ⏳ | |
| 无结果时导出按钮禁用 | ⏳ | |

### User Story 2: 自然语言触发导出

| Scenario | Status | Notes |
|----------|--------|-------|
| 识别 "导出为 CSV" 意图并自动导出 | ⏳ | P2 |
| 识别 "导出为 Excel" 意图并自动导出 | ⏳ | P2 |
| 无导出意图时正常执行查询 | ⏳ | P2 |

## Edge Cases

| Case | Status | Notes |
|------|--------|-------|
| 空结果导出（只有表头） | ⏳ | |
| 大数据集导出（10000+ 行） | ⏳ | 进度提示 |
| 特殊字符转义（逗号、引号、换行） | ⏳ | |
| NULL 值处理 | ⏳ | |
| 日期类型格式化 | ⏳ | ISO8601 |
| 二进制数据处理 | ⏳ | [binary] |
| 文件名特殊字符清理 | ⏳ | 替换为 _ |

## Testing Checklist

### Unit Tests

| Test | Status | File |
|------|--------|------|
| exportToCSV 基本数据 | ⏳ | export.test.ts |
| exportToCSV 特殊字符 | ⏳ | export.test.ts |
| exportToCSV NULL 值 | ⏳ | export.test.ts |
| exportToJSON 基本数据 | ⏳ | export.test.ts |
| exportToJSON NULL 值 | ⏳ | export.test.ts |
| exportToXLSX 基本数据 | ⏳ | export.test.ts |
| generateFilename 格式 | ⏳ | export.test.ts |

### E2E Tests

| Test | Status | File |
|------|--------|------|
| 执行 SQL 后导出按钮可用 | ⏳ | export.spec.ts |
| 无结果时导出按钮禁用 | ⏳ | export.spec.ts |
| CSV 导出触发下载 | ⏳ | export.spec.ts |
| JSON 导出触发下载 | ⏳ | export.spec.ts |
| XLSX 导出触发下载 | ⏳ | export.spec.ts |

## Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Developer | | | |
| Reviewer | | | |
| Tester | | | |


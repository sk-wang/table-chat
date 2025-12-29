# Feature Specification: 查询结果导出

**Feature Branch**: `010-query-export`  
**Created**: 2025-12-29  
**Status**: 📋 待开发  
**Input**: User description: "添加查询结果导出功能，支持将 SQL 查询结果导出为 CSV、JSON 和 XLSX 格式文件。支持工具栏按钮触发和自然语言触发两种方式。"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 工具栏导出查询结果 (Priority: P1)

用户执行 SQL 查询后，希望能够通过工具栏按钮将查询结果导出为不同格式的文件（CSV/JSON/XLSX），以便在其他工具中进行分析或分享给同事。

**Why this priority**: 这是导出功能的核心价值，工具栏按钮是最直观的触发方式。

**Independent Test**: 执行一条返回数据的 SQL 查询，点击导出按钮选择格式，验证文件是否正确下载。

**Acceptance Scenarios**:

1. **Given** 用户已执行 SQL 查询并获得结果, **When** 用户点击「导出」下拉按钮, **Then** 应显示三个选项：导出 CSV / 导出 JSON / 导出 XLSX
2. **Given** 用户点击「导出 CSV」选项, **When** 点击后, **Then** 浏览器应自动下载一个 CSV 文件，文件名格式为 `{数据库名}_{时间戳}.csv`
3. **Given** 用户点击「导出 JSON」选项, **When** 点击后, **Then** 浏览器应自动下载一个 JSON 文件，包含数组格式的数据
4. **Given** 用户点击「导出 XLSX」选项, **When** 点击后, **Then** 浏览器应自动下载一个 Excel 文件
5. **Given** 没有查询结果（未执行查询或结果为空）, **When** 用户查看导出按钮, **Then** 导出按钮应处于禁用状态

---

### User Story 2 - 自然语言触发导出 (Priority: P2)

用户希望在使用自然语言查询时，能够直接指定导出格式，系统自动生成 SQL、执行查询并导出结果。

**Why this priority**: 这是增强型功能，需要 LLM 识别用户意图并自动触发导出流程。

**Independent Test**: 输入包含导出意图的自然语言（如"查询所有用户并导出为 CSV"），验证是否自动完成查询和导出。

**Acceptance Scenarios**:

1. **Given** 用户输入自然语言 "查询所有用户并导出为 CSV", **When** LLM 生成 SQL 后, **Then** 系统应自动执行 SQL 并触发 CSV 导出
2. **Given** 用户输入自然语言 "导出订单数据为 Excel", **When** LLM 生成 SQL 后, **Then** 系统应自动执行 SQL 并触发 XLSX 导出
3. **Given** 用户输入不含导出意图的自然语言, **When** LLM 生成 SQL 后, **Then** 系统应只执行 SQL，不触发导出

---

### Edge Cases

- 查询结果为空时导出应生成只有表头的文件（CSV/XLSX）或空数组（JSON）
- 超大数据集（如 10000 行以上）导出时应有进度提示或避免界面卡顿
- 列值包含特殊字符（逗号、引号、换行）时 CSV 应正确转义
- 列值为 NULL 时应正确处理（CSV 显示为空，JSON 显示为 null）
- 日期/时间类型应格式化为 ISO8601 字符串
- 二进制数据应转换为 Base64 或显示为 [binary]
- 文件名中的数据库名包含特殊字符时应进行清理

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 系统 MUST 在查询结果表格上方提供「导出」下拉按钮，包含 CSV、JSON、XLSX 三个选项
- **FR-002**: 系统 MUST 在没有查询结果时禁用导出按钮
- **FR-003**: 系统 MUST 将查询结果正确转换为 CSV 格式，UTF-8 编码，首行为列名
- **FR-004**: 系统 MUST 将查询结果正确转换为 JSON 格式，数组格式，每行一个对象
- **FR-005**: 系统 MUST 将查询结果正确转换为 XLSX 格式，支持 Excel 打开
- **FR-006**: 系统 MUST 使用 `{数据库名}_{时间戳}.{格式}` 作为导出文件名
- **FR-007**: 系统 SHOULD 在自然语言查询中识别导出意图，并在生成 SQL 后自动执行和导出
- **FR-008**: 系统 MUST 正确处理 NULL 值、特殊字符和各种数据类型
- **FR-009**: 系统 MUST 在前端完成所有格式转换，无需后端参与

### Non-Functional Requirements

- **NFR-001**: 导出 1000 行数据应在 2 秒内完成
- **NFR-002**: 导出过程不应阻塞 UI 主线程超过 100ms

### Key Entities

- **QueryResult（查询结果）**: 包含 columns（列名数组）和 rows（数据行数组）的查询结果对象
- **ExportFormat（导出格式）**: 'csv' | 'json' | 'xlsx' 三种支持的导出格式
- **ExportConfig（导出配置）**: 包含文件名、格式、数据等导出参数

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 用户能够在 3 次点击内完成导出操作（点击导出按钮 → 选择格式 → 完成下载）
- **SC-002**: CSV 文件能够被 Excel 和其他电子表格软件正确打开
- **SC-003**: JSON 文件能够被 JSON 解析器正确解析
- **SC-004**: XLSX 文件能够被 Excel 2007+ 正确打开
- **SC-005**: 自然语言触发导出的识别准确率达到 90% 以上

## Assumptions

- 导出功能完全在前端实现，利用浏览器原生能力下载文件
- 使用 SheetJS (xlsx) 库生成 XLSX 文件
- CSV 使用标准 RFC 4180 格式
- JSON 使用 2 空格缩进的格式化输出
- 时间戳格式为 yyyyMMdd_HHmmss
- 自然语言导出功能依赖 LLM 返回的额外字段标识导出意图

## Technical Approach

### 前端实现方案

```
优点：
- 无需后端改动，实现简单
- 即时响应，用户体验好
- 利用浏览器原生能力

流程：
查询结果 → 格式转换 → Blob 创建 → 触发下载
```

### 依赖库

| 库名 | 用途 | 大小 |
|------|------|------|
| xlsx (SheetJS) | 生成 XLSX 文件 | ~300KB gzip |

### 文件命名规则

```
{数据库名}_{时间戳}.{扩展名}

示例：
- mydb_20251229_153000.csv
- mydb_20251229_153000.json
- mydb_20251229_153000.xlsx
```


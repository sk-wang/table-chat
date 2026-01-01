# Feature Specification: LLM 思考标签输出支持

**Feature Branch**: `017-llm-think-tag-support`  
**Created**: 2026-01-01  
**Status**: Draft  
**Input**: User description: "自然语言LLM_API支持这种开源模型有`<think></think>`标签的输出，现在会报错"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 使用开源推理模型生成SQL (Priority: P1)

用户通过自然语言输入查询需求，系统调用配置的 LLM API（可能是 DeepSeek、Qwen 等开源推理模型）。这些模型会在输出前加上 `<think>...</think>` 标签包裹其推理过程，然后输出实际的 JSON 结果。当前系统无法正确解析这种格式，导致报错。

**Why this priority**: 这是核心功能修复。当前系统使用某些开源 LLM 模型时完全无法正常工作，直接影响用户使用自然语言生成 SQL 的核心功能。

**Independent Test**: 可以通过配置一个会输出 `<think>` 标签的 LLM 模型，发送自然语言查询请求来独立测试。成功时应返回正确的 SQL 查询而非错误。

**Acceptance Scenarios**:

1. **Given** 用户配置了一个会输出 `<think>` 标签的 LLM 模型（如 DeepSeek），**When** 用户输入自然语言查询请求，**Then** 系统应正确提取 `<think>` 标签后的 JSON 内容并返回生成的 SQL

2. **Given** LLM 返回格式为 `<think>推理过程...</think>\n```json\n{...}\n````, **When** 系统解析响应，**Then** 系统应忽略 `<think>` 块并正确解析后续的 JSON

3. **Given** LLM 返回格式为 `<think>推理过程...</think>{...}` (JSON 不带代码块), **When** 系统解析响应，**Then** 系统应同样能正确解析

---

### User Story 2 - 兼容无思考标签的模型输出 (Priority: P2)

用户可能同时使用多种 LLM 模型，有些模型（如 OpenAI GPT）不输出 `<think>` 标签。系统应保持对原有格式的兼容性。

**Why this priority**: 确保现有功能不受影响，向后兼容性是必要的。

**Independent Test**: 使用不输出 `<think>` 标签的模型测试，确认原有解析逻辑仍正常工作。

**Acceptance Scenarios**:

1. **Given** LLM 返回标准 JSON 格式（无 `<think>` 标签），**When** 系统解析响应，**Then** 系统应正常解析并返回 SQL

2. **Given** LLM 返回 markdown 代码块包裹的 JSON（无 `<think>` 标签），**When** 系统解析响应，**Then** 系统应正常解析并返回 SQL

---

### Edge Cases

- 当 `<think>` 标签嵌套或格式异常（如未闭合）时，系统应尝试容错处理或返回清晰的错误信息
- 当 `<think>` 标签内容包含类似 JSON 结构的文本时，系统应正确识别真正的 JSON 输出位置
- 当 LLM 输出中存在多个 `<think>` 块时，系统应能正确处理
- 当 `<think>` 内容非常长（超过实际 JSON 的十倍以上）时，系统仍应正确解析

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 系统 MUST 能够识别并移除 LLM 输出开头的 `<think>...</think>` 标签块
- **FR-002**: 系统 MUST 在移除思考标签后，继续执行现有的 JSON 解析逻辑
- **FR-003**: 系统 MUST 保持对原有输出格式（无思考标签）的完全兼容
- **FR-004**: 系统 MUST 能够处理思考标签后紧跟 markdown 代码块的格式
- **FR-005**: 系统 MUST 能够处理思考标签后直接跟 JSON 的格式
- **FR-006**: 当解析失败时，系统 MUST 返回包含原始错误信息的友好错误提示

### Key Entities

- **LLM Response**: LLM 模型返回的原始文本响应，可能包含 `<think>` 标签和 JSON 内容
- **Parsed Result**: 解析后的结构化结果，包含 SQL、explanation 和可选的 export_format

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 使用带有 `<think>` 标签输出的 LLM 模型时，自然语言查询成功率达到与标准模型相同的水平
- **SC-002**: 解析带有思考标签的响应额外耗时不超过 10 毫秒
- **SC-003**: 现有测试用例（使用标准格式输出）保持 100% 通过
- **SC-004**: 用户在使用不同类型的 LLM 模型时，无需手动干预即可正常使用自然语言功能

## Assumptions

- `<think>` 标签总是成对出现且在响应开头
- 有效的 JSON 内容总是在 `<think>` 标签之后
- 支持的 JSON 输出格式包括：裸 JSON、markdown json 代码块
- 不需要保存或展示模型的思考过程内容

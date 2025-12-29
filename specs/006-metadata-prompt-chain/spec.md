# Feature Specification: 元数据提示链（Metadata Prompt Chain）

**Feature Branch**: `006-metadata-prompt-chain`  
**Created**: 2025-12-29  
**Status**: Draft  
**Input**: User description: "一次性把所有metadata给过去好像不可用啊，得搞个提示链，先选表，再把字段给过去"

## 背景

当前系统在生成 SQL 时，会将整个数据库的所有表和字段元数据一次性传递给 LLM。对于表数量较多或字段复杂的数据库，这种方式存在以下问题：

1. **Token 消耗过大**：大量无关表的 schema 信息占用 LLM 上下文窗口
2. **噪声干扰**：LLM 可能被不相关的表信息干扰，降低 SQL 生成准确性
3. **成本问题**：更多 token 意味着更高的 API 调用成本

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 用户通过自然语言生成 SQL 时选择相关表 (Priority: P1)

用户在输入自然语言查询描述时，系统先让 LLM 从表列表中识别出可能相关的表，然后只将选中表的详细字段信息传递给 LLM 生成最终 SQL。

**Why this priority**: 这是核心功能，直接解决 token 消耗过大和准确性问题。

**Independent Test**: 用户输入查询描述后，系统能够自动识别相关表并生成准确的 SQL，整个过程对用户透明。

**Acceptance Scenarios**:

1. **Given** 用户已连接一个包含 50+ 表的数据库，**When** 用户输入"查询所有订单的总金额"，**Then** 系统自动识别出与订单相关的表（如 orders, order_items），并只使用这些表的 schema 信息生成 SQL

2. **Given** 用户已连接数据库，**When** 用户输入涉及多表关联的查询描述，**Then** 系统能正确识别所有相关表并生成包含 JOIN 的 SQL

3. **Given** 用户输入的查询描述较模糊，**When** 系统无法确定具体表，**Then** 系统选择最可能相关的表进行 SQL 生成

---

### User Story 2 - 减少 LLM Token 消耗 (Priority: P1)

通过提示链优化，减少每次 SQL 生成时传递给 LLM 的 schema 信息量，降低 token 消耗。

**Why this priority**: 直接影响系统运营成本和响应速度。

**Independent Test**: 对比优化前后同一查询的 token 消耗量。

**Acceptance Scenarios**:

1. **Given** 数据库有 50 张表，每张表平均 10 个字段，**When** 用户查询涉及 2 张表，**Then** 第二阶段 LLM 调用只包含这 2 张表的 schema 信息（约 20 个字段），而非全部 500 个字段

2. **Given** 使用提示链方式，**When** 执行 SQL 生成，**Then** 第一阶段（表选择）只需传递表名和表注释，不需要字段详情

---

### User Story 3 - 保持用户体验不变 (Priority: P2)

提示链过程对用户透明，用户仍然只需输入自然语言描述，一次点击即可获得生成的 SQL。

**Why this priority**: 确保优化不影响现有用户体验。

**Independent Test**: 用户操作流程与优化前完全一致。

**Acceptance Scenarios**:

1. **Given** 用户使用自然语言输入框，**When** 点击"生成 SQL"按钮，**Then** 用户只需等待一次，系统内部的多步处理对用户透明

2. **Given** 系统内部进行两步 LLM 调用，**When** 生成完成，**Then** 用户看到的响应格式与之前一致（SQL + 解释说明）

---

### Edge Cases

- 当数据库只有 1-3 张表时，系统可以跳过表选择阶段，直接使用全部 schema 信息生成 SQL（优化小数据库场景）
- 当 LLM 在第一阶段无法识别任何相关表时，系统应使用所有表的 schema 信息作为 fallback
- 当用户查询涉及数据库中不存在的表名时，系统应返回清晰的错误提示

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 系统 MUST 支持两阶段 LLM 调用：第一阶段从表列表选择相关表，第二阶段使用选中表的 schema 生成 SQL
- **FR-002**: 第一阶段 MUST 只传递表名、表类型和表注释给 LLM，不传递字段详情
- **FR-003**: 第一阶段 LLM MUST 返回可能相关的表名列表（JSON 格式）
- **FR-004**: 第二阶段 MUST 只获取第一阶段选中表的字段信息
- **FR-005**: 当数据库表数量 ≤3 时，系统 MAY 跳过第一阶段，直接使用全部 schema 生成 SQL
- **FR-006**: 当第一阶段未能识别任何相关表时，系统 MUST fallback 到使用全部 schema 信息
- **FR-007**: 整个提示链过程 MUST 对用户透明，API 接口保持不变
- **FR-008**: 系统 MUST 保持现有的 SQL 生成结果格式（sql + explanation）

### Key Entities

- **表选择请求（Table Selection Request）**: 包含用户自然语言描述和表概要列表（表名、类型、注释）
- **表选择结果（Table Selection Result）**: LLM 返回的相关表名列表
- **SQL 生成请求（SQL Generation Request）**: 包含用户描述和选中表的完整 schema 信息

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 对于包含 50+ 表的数据库，SQL 生成的 token 消耗量减少 60% 以上（相比一次性传递全部 schema）
- **SC-002**: SQL 生成的准确性保持不变或提升（相关表识别准确率 ≥ 90%）
- **SC-003**: 用户完成自然语言查询的操作步骤数保持不变（1 次输入 + 1 次点击）
- **SC-004**: 系统响应时间增加不超过 50%（考虑到增加了一次 LLM 调用）

## Assumptions

- LLM 能够根据表名和表注释正确识别与用户查询相关的表
- 表注释（table comment）对于表选择有显著帮助，但不是必须的
- 大多数用户查询只涉及数据库中的少数表（通常 ≤5 张）
- 当前 LLM API 的调用延迟可接受（增加一次调用不会显著影响用户体验）

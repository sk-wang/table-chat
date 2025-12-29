# Feature Specification: 浏览器本地缓存

**Feature Branch**: `007-localstorage-cache`  
**Created**: 2025-01-29  
**Status**: Draft  
**Input**: User description: "在浏览器里记录一些数据：上次选中的database连接，这次默认选中；还有就是获取tables的接口结果存起来，不用重复获取了，只有强制刷新才会击穿缓存，这些都记录在localstorage里面吧"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 自动恢复上次选中的数据库 (Priority: P1)

用户打开应用时，系统自动选中上次使用的数据库连接，无需每次手动选择。这对于经常使用同一个数据库的用户来说可以节省时间。

**Why this priority**: 这是最基础的用户体验改进，直接减少每次打开应用的操作步骤，提升日常使用效率。

**Independent Test**: 可以通过选择一个数据库、刷新页面后验证是否自动选中来独立测试。

**Acceptance Scenarios**:

1. **Given** 用户之前选中过数据库 "mydb", **When** 用户刷新页面或重新打开应用, **Then** 系统自动选中 "mydb" 作为当前数据库
2. **Given** 用户从未选择过任何数据库, **When** 用户首次打开应用, **Then** 不自动选中任何数据库，等待用户手动选择
3. **Given** 用户上次选中的数据库已被删除, **When** 用户打开应用, **Then** 系统清除该记录，不选中任何数据库

---

### User Story 2 - 缓存表列表加速加载 (Priority: P1)

系统缓存已获取的表列表数据，切换数据库时优先使用缓存，减少 API 调用和加载时间。

**Why this priority**: 与 P1 优先级相同，因为这直接影响应用响应速度，特别是对于表数量较多的数据库。

**Independent Test**: 可以通过加载表列表、切换到其他数据库再切换回来，验证是否使用缓存（无加载提示）。

**Acceptance Scenarios**:

1. **Given** 用户已加载过数据库 "mydb" 的表列表, **When** 用户切换到其他数据库再切回 "mydb", **Then** 系统立即显示缓存的表列表，无需等待 API 响应
2. **Given** 用户从未加载过数据库 "proddb" 的表列表, **When** 用户首次选中 "proddb", **Then** 系统从服务器获取表列表并缓存
3. **Given** 缓存中存在表列表数据, **When** 用户点击强制刷新按钮, **Then** 系统忽略缓存，从服务器重新获取最新数据

---

### User Story 3 - 缓存表字段详情 (Priority: P2)

系统缓存已加载的表字段详情，避免重复请求相同表的列信息。

**Why this priority**: 这是对 P1 缓存策略的扩展，进一步减少网络请求。

**Independent Test**: 可以通过展开表查看字段、折叠后再展开，验证是否使用缓存。

**Acceptance Scenarios**:

1. **Given** 用户已展开过 "users" 表查看字段, **When** 用户折叠后再次展开该表, **Then** 系统立即显示缓存的字段信息
2. **Given** 用户点击强制刷新, **When** 刷新完成后, **Then** 所有表字段缓存被清除，需要重新加载

---

### Edge Cases

- 当 localStorage 被浏览器禁用时？系统应优雅降级，功能正常但不缓存
- 当缓存数据格式与当前版本不兼容时？系统应清除无效缓存并重新获取
- 当缓存数据过大超出 localStorage 限制时？系统应清除最旧的缓存数据
- 当用户清除浏览器数据后？系统应正常运行，仅缺失缓存数据

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 系统 MUST 在用户选择数据库时，将选中的数据库名称保存到 localStorage
- **FR-002**: 系统 MUST 在应用启动时，读取 localStorage 中保存的数据库名称并自动选中
- **FR-003**: 系统 MUST 在成功获取表列表后，将数据缓存到 localStorage
- **FR-004**: 系统 MUST 在加载表列表时，优先检查 localStorage 是否有缓存数据
- **FR-005**: 系统 MUST 在用户点击强制刷新时，忽略缓存并从服务器获取最新数据
- **FR-006**: 系统 MUST 在强制刷新后，用新数据更新缓存
- **FR-007**: 系统 MUST 能处理 localStorage 不可用的情况（禁用或存储满）
- **FR-008**: 系统 MUST 缓存已加载的表字段详情数据
- **FR-009**: 系统 SHOULD 在缓存数据中包含版本标识，用于兼容性检查

### Key Entities

- **SelectedDatabase**: 用户上次选中的数据库连接名称
- **TableListCache**: 每个数据库的表列表缓存，包含数据库名称和表摘要信息
- **TableDetailsCache**: 每个表的字段详情缓存，包含 schema、表名和列信息
- **CacheMetadata**: 缓存版本号，用于处理数据格式升级

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 用户再次访问应用时，之前选中的数据库自动恢复选中，无需手动操作
- **SC-002**: 切换回已加载过的数据库时，表列表在 100ms 内显示（使用缓存）
- **SC-003**: 强制刷新功能正常工作，能获取服务器最新数据
- **SC-004**: 缓存功能不影响新用户首次使用体验
- **SC-005**: localStorage 不可用时，应用所有功能正常运行（仅缺失缓存能力）

## Assumptions

- 使用 localStorage 作为缓存存储，每个源的存储限制通常为 5-10MB
- 缓存不设置过期时间，仅通过强制刷新手动失效
- 缓存数据按数据库连接名称作为 key 进行组织
- 当前应用只在单个浏览器标签页中使用，无需考虑多标签页同步

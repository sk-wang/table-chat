# Tasks: MySQL 数据库支持

**Input**: Design documents from `/specs/004-mysql-support/`  
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: 根据 Constitution VI 要求，包含后端单元测试、接口测试和 E2E 测试。

**Organization**: 任务按用户故事分组，支持独立实现和测试。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可并行执行（不同文件，无依赖）
- **[Story]**: 所属用户故事（US1, US2, US3, US4）

## Path Conventions

- **Backend**: `backend/app/`, `backend/tests/`
- **Frontend**: `frontend/src/`, `frontend/e2e/`

---

## Phase 1: Setup (项目初始化)

**Purpose**: 安装依赖，创建模块结构

- [ ] T001 添加 mysql-connector-python 依赖到 backend/pyproject.toml
- [ ] T002 [P] 创建 backend/app/connectors/__init__.py 模块初始化文件
- [ ] T003 [P] 更新 backend/app/config.py 添加 mysql_connect_timeout 配置（默认 10 秒）

---

## Phase 2: Foundational (基础重构 - 阻塞前置)

**Purpose**: 将现有 PostgreSQL 代码重构为抽象层，遵循 SOLID 原则

**⚠️ CRITICAL**: 所有用户故事必须等待此阶段完成

- [ ] T004 创建 backend/app/connectors/base.py 定义 DatabaseConnector 抽象基类
- [ ] T005 创建 backend/app/connectors/postgres.py 迁移现有 PostgreSQL 连接逻辑
- [ ] T006 创建 backend/app/connectors/factory.py 实现 ConnectorFactory 工厂类
- [ ] T007 更新 backend/app/services/db_manager.py 使用 ConnectorFactory.get_connector()
- [ ] T008 更新 backend/app/services/metadata_service.py 使用连接器的 fetch_metadata()
- [ ] T009 更新 backend/app/services/query_service.py 使用连接器的 execute_query() 和 get_dialect()
- [ ] T010 更新 backend/app/db/sqlite.py 添加 db_type 列迁移逻辑
- [ ] T011 更新 backend/app/models/database.py 添加 db_type 字段到 DatabaseResponse
- [ ] T012 更新 backend/app/api/v1/dbs.py 在响应中包含 db_type
- [ ] T013 运行现有测试 `uv run pytest tests/` 确保 PostgreSQL 功能无回归

**Checkpoint**: 抽象层就绪，PostgreSQL 功能正常 - 用户故事实现可以开始

---

## Phase 3: User Story 1 - 连接 MySQL 数据库 (Priority: P1) 🎯 MVP

**Goal**: 用户可以添加 MySQL 数据库连接，系统验证连接并保存配置

**Independent Test**: 使用 `mysql://root:123456@localhost:3306/scinew` 添加连接，验证保存成功

### Implementation for User Story 1

- [ ] T014 [US1] 创建 backend/app/connectors/mysql.py 实现 MySQLConnector 类
- [ ] T015 [US1] 实现 MySQLConnector.test_connection() 方法（10 秒超时）
- [ ] T016 [US1] 实现 MySQLConnector._parse_url() 解析 mysql:// 连接字符串
- [ ] T017 [US1] 实现 MySQLConnector.get_dialect() 返回 "mysql"
- [ ] T018 [US1] 更新 backend/app/connectors/factory.py 注册 MySQLConnector
- [ ] T019 [US1] 创建 backend/tests/test_services/test_mysql_connector.py 测试连接功能

**Checkpoint**: 可以成功添加和验证 MySQL 数据库连接

---

## Phase 4: User Story 2 - 浏览 MySQL 数据库元数据 (Priority: P1)

**Goal**: 用户可以查看 MySQL 数据库的表结构、列信息和注释

**Independent Test**: 连接 MySQL 后刷新元数据，验证能看到所有表和列信息

### Implementation for User Story 2

- [ ] T020 [US2] 实现 MySQLConnector.fetch_metadata() 使用 INFORMATION_SCHEMA 提取元数据
- [ ] T021 [US2] 实现 MySQL 表/视图查询（过滤系统 schema）
- [ ] T022 [US2] 实现 MySQL 列信息查询（包含 COLUMN_COMMENT）
- [ ] T023 [US2] 实现 MySQL 主键识别（COLUMN_KEY = 'PRI'）
- [ ] T024 [US2] 添加 MySQL 元数据提取单元测试到 backend/tests/test_services/test_mysql_connector.py

**Checkpoint**: 可以浏览 MySQL 数据库的完整元数据

---

## Phase 5: User Story 3 - 执行 MySQL 查询 (Priority: P1)

**Goal**: 用户可以对 MySQL 数据库执行 SELECT 查询并查看结果

**Independent Test**: 对 MySQL 数据库执行 `SELECT * FROM table LIMIT 10`，验证返回正确结果

### Implementation for User Story 3

- [ ] T025 [US3] 实现 MySQLConnector.execute_query() 方法
- [ ] T026 [US3] 实现 MySQL 结果集序列化（处理日期、bytes 等类型）
- [ ] T027 [US3] 更新 backend/app/services/query_service.py 使用 connector.get_dialect() 进行 SQL 解析
- [ ] T028 [US3] 验证 sqlglot MySQL 方言的 LIMIT 注入逻辑
- [ ] T029 [US3] 添加 MySQL 查询执行单元测试到 backend/tests/test_services/test_mysql_connector.py

**Checkpoint**: 可以对 MySQL 执行 SELECT 查询并查看结果

---

## Phase 6: User Story 4 - MySQL 自然语言查询生成 (Priority: P2)

**Goal**: 用户可以用自然语言描述查询需求，系统生成 MySQL 查询语句

**Independent Test**: 输入"查询所有用户"，验证生成的 SQL 使用 MySQL 语法

### Implementation for User Story 4

- [ ] T030 [US4] 更新 backend/app/services/llm_service.py 添加数据库类型参数
- [ ] T031 [US4] 更新 LLM 系统提示支持 MySQL 语法（根据 db_type 动态选择）
- [ ] T032 [US4] 更新 backend/app/api/v1/query.py 传递 db_type 给 llm_service
- [ ] T033 [US4] 添加 MySQL 自然语言生成测试

**Checkpoint**: 自然语言查询可以生成正确的 MySQL SELECT 语句

---

## Phase 7: Frontend 更新 (Priority: P1)

**Goal**: 前端显示数据库类型标识

**Independent Test**: 数据库列表中 MySQL 和 PostgreSQL 显示不同图标

### Implementation for Frontend

- [ ] T034 [P] 更新 frontend/src/types/index.ts 添加 dbType 字段到 Database 接口
- [ ] T035 [P] 更新 frontend/src/components/sidebar/DatabaseSidebar.tsx 显示数据库类型图标
- [ ] T036 添加 MySQL/PostgreSQL 图标资源或使用 Ant Design 图标

**Checkpoint**: 前端正确显示数据库类型

---

## Phase 8: Testing & Polish (测试与完善)

**Purpose**: 完整测试覆盖和文档更新

### 后端测试

- [ ] T037 [P] 创建 backend/tests/test_services/test_connector_factory.py 测试工厂类
- [ ] T038 [P] 创建 backend/tests/test_api/test_mysql_integration.py 测试 MySQL API 集成
- [ ] T039 更新 backend/api-tests.rest 添加 MySQL 相关接口测试用例

### E2E 测试

- [ ] T040 创建 frontend/e2e/mysql-support.spec.ts 测试完整 MySQL 用户流程
- [ ] T041 E2E 测试场景：添加 MySQL 连接 → 刷新元数据 → 执行查询

### 文档

- [ ] T042 [P] 更新 backend/README.md 添加 MySQL 支持说明
- [ ] T043 运行 quickstart.md 验证开发流程

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup) ──────► Phase 2 (Foundational) ──────┬──► Phase 3 (US1: 连接)
                                                     │
                                                     ├──► Phase 4 (US2: 元数据) [需要 US1]
                                                     │
                                                     ├──► Phase 5 (US3: 查询) [需要 US1]
                                                     │
                                                     └──► Phase 6 (US4: NL查询) [需要 US2, US3]
                                                     
                                                     └──► Phase 7 (Frontend) [可与 US1-4 并行]
                                                     
All Phases ──────────────────────────────────────────────► Phase 8 (Testing)
```

### User Story Dependencies

| 用户故事 | 依赖 | 说明 |
|---------|------|------|
| US1 (连接) | Phase 2 | 基础功能，其他故事前置 |
| US2 (元数据) | US1 | 需要先建立连接 |
| US3 (查询) | US1 | 需要先建立连接 |
| US4 (NL查询) | US2, US3 | 需要元数据和查询能力 |
| Frontend | Phase 2 | 可与后端 US 并行开发 |

### Within Each User Story

1. 核心实现 → 集成 → 测试
2. 每个故事完成后验证可独立工作

### Parallel Opportunities

**Phase 1**:
- T002, T003 可并行

**Phase 2**:
- T004, T005, T006 顺序执行（依赖关系）
- T007, T008, T009 依赖 T006

**Phase 7 (Frontend)**:
- T034, T035 可并行

**Phase 8 (Testing)**:
- T037, T038, T039 可并行
- T040, T041 依赖后端完成

---

## Parallel Example: Phase 2 Foundational

```bash
# 顺序执行（有依赖）:
T004 → T005 → T006 → T007 → T008 → T009 → T010 → T011 → T012 → T013

# 原因：每个任务依赖前一个的输出
```

## Parallel Example: Phase 8 Testing

```bash
# 可并行执行:
Task: "backend/tests/test_services/test_connector_factory.py"
Task: "backend/tests/test_api/test_mysql_integration.py"
Task: "backend/api-tests.rest MySQL 测试用例"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. ✅ Complete Phase 1: Setup（安装依赖）
2. ✅ Complete Phase 2: Foundational（PostgreSQL 重构）
3. ✅ Complete Phase 3: US1 连接 MySQL
4. **STOP and VALIDATE**: 验证 MySQL 连接功能
5. 可部署/演示 MVP

### Incremental Delivery

1. Setup + Foundational → 抽象层就绪
2. Add US1 (连接) → 测试 → **MVP 完成**
3. Add US2 (元数据) → 测试 → 增量发布
4. Add US3 (查询) → 测试 → 增量发布
5. Add US4 (NL查询) → 测试 → 完整功能
6. Add Frontend → 测试 → 用户可见
7. Complete Testing → 生产就绪

---

## Task Summary

| Phase | 任务数 | 说明 |
|-------|--------|------|
| Phase 1: Setup | 3 | 项目初始化 |
| Phase 2: Foundational | 10 | PostgreSQL 重构 |
| Phase 3: US1 连接 | 6 | MySQL 连接功能 |
| Phase 4: US2 元数据 | 5 | 元数据提取 |
| Phase 5: US3 查询 | 5 | 查询执行 |
| Phase 6: US4 NL查询 | 4 | 自然语言生成 |
| Phase 7: Frontend | 3 | 前端更新 |
| Phase 8: Testing | 7 | 测试与文档 |
| **Total** | **43** | |

---

## Notes

- [P] 任务 = 不同文件，无依赖，可并行
- [Story] 标签 = 关联到具体用户故事
- 每个用户故事应独立可测试
- Phase 2 完成后运行全部现有测试确保无回归
- 提交频率：每个任务或逻辑组完成后提交
- 避免：模糊任务描述、同文件冲突、破坏独立性的跨故事依赖

